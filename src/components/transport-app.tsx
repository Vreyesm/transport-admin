"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  ArrowUpRight,
  X,
  Users,
  Clock3,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Data, Occupation, Vehicle } from "@/lib/types";
import { configured, supabase } from "@/lib/supabase";
import {
  loadData,
  saveOccupation,
  saveSettings,
  saveVehicle,
} from "@/lib/repository";
import { dayStart, localDate, pretty, toUTC } from "@/lib/time";

import {
  calendarDate,
  calendarDays,
  shiftDay,
  shiftMonth,
} from "@/lib/calendar";
import { RequestScope } from "@/lib/requests";
import { validatePhoto } from "@/modules/fleet/photos";
import { saveVehicleDraft } from "@/modules/fleet/repository";
import { OccupationDates } from "./occupation-dates";
import { SettingsForm } from "./settings-form";

import { AuditView } from "./audit-view";
import { ScheduleExport } from "./schedule-export";
import { useUnsaved } from "./use-unsaved";
import { AccessRevokedError } from "@/lib/access";

type Section = "calendar" | "fleet" | "settings" | "audit";
const empty: Data = {
  vehicles: [],
  occupations: [],
  settings: { name: "Gestión municipal", color: "#2563eb", logo: "" },
};
export default function TransportApp({
  section,
  admin = false,
}: {
  section: Section;
  admin?: boolean;
}) {
  const [data, setData] = useState<Data>(empty),
    [authorized, setAuthorized] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [date, setDate] = useState(() => localDate(new Date())),
    [view, setView] = useState("month"),
    [vehicleFilter, setVehicleFilter] = useState(""),
    [type, setType] = useState(""),
    [search, setSearch] = useState(""),
    [archived, setArchived] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null),
    [occupation, setOccupation] = useState<Occupation | null>(null),
    [busy, setBusy] = useState(false),
    [allDay, setAllDay] = useState(false);
  const canEdit = admin && authorized;
  const unsaved = useUnsaved(canEdit);
  const router = useRouter();
  const clearUnsaved = unsaved.clear;
  const access = useRef(false);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const requests = useRef(new RequestScope());
  const checks = useRef(new RequestScope());
  const pendingPhotos = useRef(new Map<string, File>());
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [settingsEditor, setSettingsEditor] = useState(0);
  const clearPhotos = useCallback(() => {
    for (const url of pendingPhotos.current.keys()) URL.revokeObjectURL(url);
    pendingPhotos.current.clear();
  }, []);
  const resetAccess = useCallback(() => {
    clearUnsaved();
    access.current = false;
    requests.current.invalidate();
    checks.current.invalidate();
    setAuthorized(false);
    setBusy(false);
    setData(empty);
    setReady(false);
    setLastUpdated(null);
    setStale(false);
    setNotice("");
    setVehicle(null);
    setOccupation(null);
    setSessionEpoch((epoch) => epoch + 1);
    clearPhotos();
  }, [clearPhotos, clearUnsaved]);
  const refresh = useCallback(async () => {
    const ticket = requests.current.begin();
    try {
      const loaded = await loadData(canEdit && access.current);
      if (!ticket.current()) return;
      setData(loaded);
      setLastUpdated(new Date().toISOString());
      setStale(false);
      setError("");
    } catch (e) {
      if (!ticket.current()) return;
      if (e instanceof AccessRevokedError) {
        resetAccess();
        setError(message(e));
        return;
      }
      setError(message(e));
      setStale(true);
    } finally {
      if (ticket.current()) setReady(true);
    }
  }, [canEdit, resetAccess]);
  useEffect(() => {
    const scope = requests.current;
    const authChecks = checks.current;
    if (!supabase) {
      const timer = setTimeout(() => {
        access.current =
          sessionStorage.getItem("transport-demo-admin") === "true";
        if (access.current) {
          scope.invalidate();
          setReady(false);
          setSessionEpoch((epoch) => epoch + 1);
        }
        setAuthorized(access.current);
      }, 0);
      return () => clearTimeout(timer);
    }
    let active = true;
    let authEvents = 0;
    let currentId: string | undefined;
    let initialized = false;
    const verify = async (
      id: string | undefined,
      ticket: ReturnType<RequestScope["begin"]>,
    ) => {
      if (!active || !ticket.current()) return;
      if (!id) return;
      const { data, error } = await supabase!
        .from("admin_profiles")
        .select("id")
        .eq("id", id)
        .maybeSingle();
      if (active && ticket.current()) {
        access.current = Boolean(data && !error);
        if (access.current) {
          scope.invalidate();
          setReady(false);
          setData(empty);
          setSessionEpoch((epoch) => epoch + 1);
        }
        setAuthorized(Boolean(data && !error));
        if (!data)
          setError(
            "Esta cuenta no tiene acceso administrativo. Solicita su habilitación.",
          );
      }
    };
    const applySession = (id?: string) => {
      if (
        !active ||
        (initialized && id === currentId && (!id || access.current))
      )
        return;
      initialized = true;
      currentId = id;
      resetAccess();
      const ticket = checks.current.begin();
      setTimeout(() => void verify(id, ticket), 0);
    };
    supabase.auth.getSession().then(({ data }) => {
      if (!authEvents) applySession(data.session?.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        authEvents++;
        applySession(session?.user.id);
      },
    );
    return () => {
      active = false;
      scope.invalidate();
      authChecks.invalidate();
      clearPhotos();
      listener.subscription.unsubscribe();
    };
  }, [resetAccess, clearPhotos]);
  useEffect(() => {
    const scope = requests.current;
    const timer = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 60000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    window.addEventListener("storage", focus);
    return () => {
      scope.invalidate();
      clearPhotos();
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", focus);
      window.removeEventListener("storage", focus);
    };
  }, [refresh, clearPhotos, sessionEpoch]);
  const vehicles = data.vehicles.filter(
    (v) =>
      ((canEdit && archived) || !v.archived) &&
      (!type || v.type === type) &&
      (!vehicleFilter || v.id === vehicleFilter) &&
      `${v.name} ${v.plate}`.toLowerCase().includes(search.toLowerCase()),
  );
  const events = data.occupations.filter(
    (o) => !o.cancelled && vehicles.some((v) => v.id === o.vehicle_id),
  );
  const today = localDate(new Date());
  const dateKey = date;
  const current = (id: string) =>
    data.occupations.find(
      (o) =>
        !o.cancelled &&
        o.vehicle_id === id &&
        Date.parse(o.starts_at) <= Date.now() &&
        Date.parse(o.ends_at) > Date.now(),
    );
  function status(v: Vehicle) {
    const o = current(v.id);
    return v.archived
      ? "Archivado"
      : o?.kind === "maintenance"
        ? "Bloqueado"
        : o
          ? "En uso"
          : "Libre";
  }
  async function mutate(action: () => Promise<void | string>) {
    const ticket = requests.current.begin();
    setBusy(true);
    setError("");
    try {
      const warning = await action();
      if (!ticket.sameScope()) return;
      await refresh();
      if (!ticket.sameScope()) return;
      unsaved.clear();
      setNotice(warning || "Cambios guardados");
      clearPhotos();
      setVehicle(null);
      setOccupation(null);
      if (section === "settings") setSettingsEditor((key) => key + 1);
    } catch (e) {
      if (ticket.sameScope()) setError(message(e));
    } finally {
      if (ticket.sameScope()) setBusy(false);
    }
  }
  function newOccupation(day = dateKey) {
    setAllDay(false);
    setOccupation({
      id: crypto.randomUUID(),
      vehicle_id: vehicles[0]?.id || "",
      kind: "reservation",
      starts_at: toUTC(day + "T09:00"),
      ends_at: toUTC(day + "T18:00"),
      cancelled: false,
    });
  }
  function move(amount: number) {
    setDate(
      view === "month"
        ? shiftMonth(date, amount)
        : shiftDay(date, amount * (view === "week" ? 7 : 1)),
    );
  }
  const days = calendarDays(date, view === "week");
  function forDay(day: string) {
    return events.filter(
      (o) =>
        Date.parse(o.starts_at) < Date.parse(dayStart(nextDay(day))) &&
        Date.parse(o.ends_at) > Date.parse(dayStart(day)),
    );
  }
  return (
    <div
      className="app"
      onClickCapture={(e) => {
        const link = (e.target as HTMLElement).closest(
          "a[href]",
        ) as HTMLAnchorElement | null;
        if (
          !link ||
          e.ctrlKey ||
          e.metaKey ||
          e.shiftKey ||
          e.altKey ||
          link.target === "_blank" ||
          !unsaved.isDirty()
        )
          return;
        e.preventDefault();
        e.stopPropagation();
        unsaved.request(() => {
          unsaved.clear();
          router.push(link.href);
        });
      }}
      style={{ "--accent": data.settings.color } as React.CSSProperties}
    >
      <aside className="sidebar">
        <Link href="/calendario" className="brand">
          <span className="brand-icon">
            <Bus size={24} />
          </span>
          <span>
            Transporte
            <span className="brand-sub">ADMINISTRACIÓN MUNICIPAL</span>
          </span>
        </Link>
        <div className="workspace">
          {data.settings.logo && (
            <img src={data.settings.logo} alt="Logo municipal" />
          )}
          <span className="workspace-mark">M</span>
          <div>
            {data.settings.name}
            <small>Gestión de transportes</small>
          </div>
        </div>
        <div className="nav-label">PRINCIPAL</div>
        <nav>
          {canEdit && (
            <Link
              href="/admin/auditoria"
              className={section === "audit" ? "active" : ""}
            >
              Auditoría
            </Link>
          )}
          <Link
            className={section === "calendar" ? "active" : ""}
            href={admin ? "/admin" : "/calendario"}
          >
            <CalendarDays size={19} />
            Calendario
          </Link>
          <Link
            className={section === "fleet" ? "active" : ""}
            href={admin ? "/admin/flota" : "/flota"}
          >
            <Bus size={19} />
            Flota de vehículos
          </Link>
          {canEdit && (
            <Link
              className={section === "settings" ? "active" : ""}
              href="/admin/configuracion"
            >
              <SettingsIcon size={19} />
              Configuración
            </Link>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="help">
            <ShieldCheck size={20} />
            <strong>{canEdit ? "Administración" : "Consulta pública"}</strong>
            <p>
              {canEdit
                ? "Gestiona la flota y sus asignaciones."
                : "Consulta la disponibilidad de los vehículos municipales."}
            </p>
          </div>
          <Link className="access" href={admin ? "/calendario" : "/admin"}>
            {admin ? "Ver consulta pública" : "Acceso administrativo"}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>
            Transportes <span className="slash">/</span>{" "}
            {section === "calendar"
              ? "Calendario"
              : section === "fleet"
                ? "Flota"
                : section === "audit"
                  ? "Auditoría"
                  : "Configuración"}
          </span>
          <div className="top-actions">
            <span className={stale ? "live-dot stale" : "live-dot"} />
            {stale
              ? "Sin actualizar"
              : lastUpdated
                ? `Actualizado ${new Date(lastUpdated).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" })}`
                : "Cargando información…"}
            {canEdit && (
              <button
                title="Cerrar sesión"
                onClick={async () => {
                  resetAccess();
                  if (supabase) {
                    const { error } = await supabase.auth.signOut();
                    if (error)
                      setError(
                        "No se pudo cerrar la sesión remota. Reintenta cerrar sesión desde este dispositivo.",
                      );
                  } else sessionStorage.removeItem("transport-demo-admin");
                }}
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </header>
        <main>
          <div className="heading">
            <div>
              <div className="eyebrow">GESTIÓN DE TRANSPORTES</div>
              <h1>
                {section === "calendar"
                  ? "Calendario de disponibilidad"
                  : section === "fleet"
                    ? "Flota de vehículos"
                    : section === "audit"
                      ? "Auditoría administrativa"
                      : "Configuración municipal"}
              </h1>
              <p>
                {section === "calendar"
                  ? "Consulta y organiza el uso de buses y minibuses municipales."
                  : section === "fleet"
                    ? "Toda la información de tus vehículos, en un solo lugar."
                    : section === "audit"
                      ? "Revisa quién modificó los registros y sus valores anteriores y nuevos."
                      : "Personaliza la identidad de esta instalación."}
              </p>
            </div>
            {canEdit && (section === "fleet" || section === "calendar") && (
              <Button
                onClick={() =>
                  section === "fleet"
                    ? setVehicle({
                        id: crypto.randomUUID(),
                        name: "",
                        plate: "",
                        type: "bus",
                        brand: "",
                        model: "",
                        year: new Date().getFullYear(),
                        capacity: 1,
                        features: "",
                        notes: "",
                        archived: false,
                        photos: [],
                      })
                    : newOccupation()
                }
                disabled={section === "calendar" && !vehicles.length}
              >
                <Plus size={18} />
                {section === "fleet" ? "Agregar vehículo" : "Nueva asignación"}
              </Button>
            )}
          </div>
          {!configured && (
            <div className="demo-banner">
              Modo demostración · Datos ficticios guardados en este navegador.
              Conecta Supabase para uso real.
            </div>
          )}
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice("")} aria-label="Cerrar aviso">
                <X size={15} />
              </button>
            </div>
          )}
          {admin && !authorized ? (
            <section className="login panel">
              <ShieldCheck size={28} />
              <h2>Acceso administrativo</h2>
              <p>
                Ingresa con tu cuenta autorizada para gestionar transportes.
              </p>
              {configured && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    resetAccess();
                    const result = await supabase!.auth.signOut();
                    if (result.error)
                      setError(
                        "No se pudo cerrar la sesión remota. Reintenta cuando recuperes la conexión.",
                      );
                  }}
                >
                  Cerrar sesión de este dispositivo
                </Button>
              )}
              {configured ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    const f = new FormData(e.currentTarget);
                    const result = await supabase!.auth.signInWithPassword({
                      email: String(f.get("email")),
                      password: String(f.get("password")),
                    });
                    if (result.error)
                      setError(
                        "No se pudo iniciar sesión. Revisa tus credenciales.",
                      );
                    setBusy(false);
                  }}
                >
                  <Field label="Correo" name="email" type="email" required />
                  <Field
                    label="Contraseña"
                    name="password"
                    type="password"
                    required
                  />
                  <Button disabled={busy}>Ingresar</Button>
                </form>
              ) : (
                <Button
                  onClick={() => {
                    sessionStorage.setItem("transport-demo-admin", "true");
                    access.current = true;
                    requests.current.invalidate();
                    setReady(false);
                    setAuthorized(true);
                  }}
                >
                  Explorar administración de demostración
                </Button>
              )}
            </section>
          ) : !ready ? (
            <div className="panel loading">Cargando transportes…</div>
          ) : (
            <>
              {(section === "fleet" || section === "calendar") && (
                <>
                  <div className="stats">
                    <Stat
                      icon={<Bus />}
                      label="Vehículos activos"
                      value={data.vehicles.filter((v) => !v.archived).length}
                      detail="Buses y minibuses"
                    />
                    <Stat
                      icon={<CheckCircle2 />}
                      label="Disponibles ahora"
                      value={
                        data.vehicles.filter(
                          (v) => !v.archived && !current(v.id),
                        ).length
                      }
                      detail="Listos para asignar"
                    />
                    <Stat
                      icon={<Clock3 />}
                      label="En uso ahora"
                      value={
                        data.vehicles.filter(
                          (v) =>
                            !v.archived &&
                            current(v.id)?.kind === "reservation",
                        ).length
                      }
                      detail="Según horario de reserva"
                    />
                    <Stat
                      icon={<Wrench />}
                      label="En mantenimiento"
                      value={
                        data.vehicles.filter(
                          (v) =>
                            !v.archived &&
                            current(v.id)?.kind === "maintenance",
                        ).length
                      }
                      detail="Bloqueos vigentes"
                    />
                  </div>
                  <div className="filters">
                    <div className="search">
                      <Search size={17} />
                      <input
                        aria-label="Buscar vehículo"
                        placeholder="Buscar nombre o patente…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Tipo de vehículo"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="">Todos los tipos</option>
                      <option value="bus">Buses</option>
                      <option value="minibus">Minibuses</option>
                    </select>
                    <select
                      aria-label="Vehículo"
                      value={vehicleFilter}
                      onChange={(e) => setVehicleFilter(e.target.value)}
                    >
                      <option value="">Todos los vehículos</option>
                      {data.vehicles
                        .filter((v) => !v.archived)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </select>
                    {canEdit && section === "fleet" && (
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={archived}
                          onChange={(e) => setArchived(e.target.checked)}
                        />
                        Incluir archivados
                      </label>
                    )}
                  </div>
                </>
              )}
              {section === "audit" && canEdit && (
                <AuditView key={sessionEpoch} />
              )}
              {section === "calendar" && (
                <ScheduleExport
                  key={view + sessionEpoch}
                  occupations={data.occupations}
                  vehicles={vehicles}
                  date={date}
                  changeDate={setDate}
                  weekly={view === "week"}
                  admin={canEdit}
                />
              )}
              {section === "calendar" && (
                <section className="panel calendar">
                  <div className="calendar-toolbar">
                    <div className="date-nav">
                      <h2>
                        {calendarDate(date).toLocaleDateString("es-CL", {
                          timeZone: "UTC",
                          month: "long",
                          year: "numeric",
                        })}
                      </h2>
                      <button aria-label="Anterior" onClick={() => move(-1)}>
                        <ChevronLeft size={18} />
                      </button>
                      <button aria-label="Siguiente" onClick={() => move(1)}>
                        <ChevronRight size={18} />
                      </button>
                      <Button
                        variant="outline"
                        onClick={() => setDate(localDate(new Date()))}
                      >
                        Hoy
                      </Button>
                    </div>
                    <div className="segmented">
                      {[
                        ["month", "Mes"],
                        ["week", "Semana"],
                        ["agenda", "Agenda"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={view === key ? "selected" : ""}
                          onClick={() => setView(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="legend">
                    <span>
                      <i className="blue" />
                      Reservado
                    </span>
                    <span>
                      <i className="green" />
                      En uso
                    </span>
                    <span>
                      <i className="amber" />
                      Mantenimiento
                    </span>
                    <small>Hora de Chile · America/Santiago</small>
                  </div>
                  {view === "agenda" ? (
                    <div className="agenda">
                      {events
                        .filter(
                          (o) =>
                            Date.parse(o.ends_at) >
                            Date.parse(dayStart(dateKey)),
                        )
                        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                        .map((o) => (
                          <button
                            className="agenda-row"
                            key={o.id}
                            onClick={() => {
                              setAllDay(false);
                              setOccupation(o);
                            }}
                          >
                            <span className={"event-dot " + eventColor(o)} />
                            <div>
                              <strong>
                                {
                                  data.vehicles.find(
                                    (v) => v.id === o.vehicle_id,
                                  )?.name
                                }
                              </strong>
                              <p>
                                {canEdit
                                  ? o.activity || "Mantenimiento"
                                  : o.kind === "maintenance"
                                    ? "Bloqueado"
                                    : "Ocupado"}
                              </p>
                            </div>
                            <span>
                              {pretty(o.starts_at)} → {pretty(o.ends_at)}
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        ))}
                      {!events.some(
                        (o) =>
                          Date.parse(o.ends_at) > Date.parse(dayStart(dateKey)),
                      ) && (
                        <div className="empty">
                          No hay asignaciones próximas para estos filtros.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="calendar-scroll">
                      <div
                        className={
                          "calendar-grid " + (view === "week" ? "weekly" : "")
                        }
                      >
                        <div className="weekdays">
                          {[
                            "Lun",
                            "Mar",
                            "Mié",
                            "Jue",
                            "Vie",
                            "Sáb",
                            "Dom",
                          ].map((d) => (
                            <div key={d}>{d}</div>
                          ))}
                        </div>
                        <div className="day-grid">
                          {days.map((d) => {
                            const key = d;
                            return (
                              <div
                                key={key}
                                className={
                                  "day " +
                                  (d.slice(0, 7) !== date.slice(0, 7) &&
                                  view === "month"
                                    ? "outside "
                                    : "") +
                                  (key === today ? "today" : "")
                                }
                              >
                                <div className="day-top">
                                  <span>{Number(d.slice(8, 10))}</span>
                                  {canEdit && (
                                    <button
                                      aria-label={"Asignar el " + key}
                                      onClick={() => newOccupation(key)}
                                    >
                                      <Plus size={13} />
                                    </button>
                                  )}
                                </div>
                                {forDay(key).map((o) => (
                                  <button
                                    key={o.id}
                                    className={"event " + eventColor(o)}
                                    onClick={() => {
                                      setAllDay(false);
                                      setOccupation(o);
                                    }}
                                  >
                                    <span>
                                      {
                                        data.vehicles.find(
                                          (v) => v.id === o.vehicle_id,
                                        )?.name
                                      }
                                    </span>
                                    <small>
                                      {o.kind === "maintenance"
                                        ? "Mantenimiento"
                                        : pretty(o.starts_at).split(",").pop()}
                                    </small>
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="calendar-footer">
                    <span>{events.length} asignaciones activas</span>
                    <span>Consulta actualizada cada 60 segundos</span>
                  </div>
                </section>
              )}
              {section === "fleet" && (
                <div className="fleet-grid">
                  {vehicles.map((v) => (
                    <article key={v.id} className="vehicle-card panel">
                      <div className="vehicle-image">
                        {v.photos[0] ? (
                          <img src={v.photos[0]} alt={v.name} />
                        ) : (
                          <Bus size={72} strokeWidth={1} />
                        )}
                        <span
                          className={
                            "badge " +
                            (status(v) === "Libre"
                              ? "green"
                              : status(v) === "Bloqueado"
                                ? "amber"
                                : "blue")
                          }
                        >
                          {status(v)}
                        </span>
                      </div>
                      <div className="vehicle-body">
                        <span className="eyebrow">
                          {v.type === "bus" ? "BUS" : "MINIBÚS"} · {v.plate}
                        </span>
                        <h2>{v.name}</h2>
                        <p>
                          {v.brand} {v.model} · {v.year}
                        </p>
                        <div className="capacity">
                          <Users size={16} />
                          {v.capacity} pasajeros
                        </div>
                        <p className="features">
                          {v.features || "Sin características registradas"}
                        </p>
                        <Button variant="outline" onClick={() => setVehicle(v)}>
                          {canEdit ? "Ver y editar ficha" : "Ver ficha"}
                          <ArrowUpRight size={16} />
                        </Button>
                      </div>
                    </article>
                  ))}
                  {!vehicles.length && (
                    <div className="empty panel">
                      No hay vehículos para estos filtros.
                    </div>
                  )}
                </div>
              )}
              {section === "settings" && canEdit && (
                <section className="panel settings">
                  <h2>Identidad municipal</h2>
                  <p>
                    Estos datos se mostrarán en la administración y la consulta
                    pública.
                  </p>
                  <SettingsForm
                    key={settingsEditor}
                    initial={data.settings}
                    changed={unsaved.mark}
                    busy={busy}
                    save={(settings) =>
                      void mutate(() => saveSettings(settings))
                    }
                  />
                </section>
              )}
              {section === "calendar" && canEdit && (
                <details className="panel history">
                  <summary>
                    Historial de asignaciones · incluye canceladas y vehículos
                    archivados
                  </summary>
                  <div className="agenda">
                    {data.occupations
                      .slice()
                      .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
                      .map((o) => (
                        <button
                          className="agenda-row"
                          key={o.id}
                          onClick={() => {
                            setAllDay(false);
                            setOccupation(o);
                          }}
                        >
                          <div>
                            <strong>
                              {
                                data.vehicles.find((v) => v.id === o.vehicle_id)
                                  ?.name
                              }
                            </strong>
                            <p>
                              {o.activity || "Mantenimiento"} ·{" "}
                              {o.cancelled ? "Cancelada" : "Activa"}
                            </p>
                          </div>
                          <span>
                            {pretty(o.starts_at)} → {pretty(o.ends_at)}
                          </span>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                    {!data.occupations.length && (
                      <div className="empty">Sin asignaciones registradas.</div>
                    )}
                  </div>
                </details>
              )}
            </>
          )}
          <footer className="page-footer">
            Transporte municipal{" "}
            <span>Flota y disponibilidad · {new Date().getFullYear()}</span>
          </footer>
        </main>
      </div>
      {vehicle && (
        <Modal
          title={canEdit ? "Ficha del vehículo" : vehicle.name}
          close={() => {
            if (!busy)
              unsaved.request(() => {
                unsaved.clear();
                clearPhotos();
                setVehicle(null);
              });
          }}
        >
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          <form
            onInput={unsaved.mark}
            onChange={unsaved.mark}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void mutate(() =>
                saveVehicleDraft(
                  {
                    ...vehicle,
                    name: String(f.get("name")),
                    plate: String(f.get("plate")).trim().toUpperCase(),
                    type: f.get("type") as Vehicle["type"],
                    brand: String(f.get("brand")),
                    model: String(f.get("model")),
                    year: Number(f.get("year")),
                    capacity: Number(f.get("capacity")),
                    features: String(f.get("features")),
                    notes: String(f.get("notes")),
                  },
                  pendingPhotos.current,
                  data.vehicles.find((v) => v.id === vehicle.id)?.photos || [],
                  requests.current.capture(),
                ),
              );
            }}
          >
            <fieldset disabled={!canEdit || busy}>
              <div className="form-grid">
                <Field
                  label="Nombre"
                  name="name"
                  defaultValue={vehicle.name}
                  required
                />
                <Field
                  label="Patente"
                  name="plate"
                  defaultValue={vehicle.plate}
                  required
                />
                <label>
                  Tipo
                  <select name="type" defaultValue={vehicle.type}>
                    <option value="bus">Bus</option>
                    <option value="minibus">Minibús</option>
                  </select>
                </label>
                <Field
                  label="Capacidad"
                  name="capacity"
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={vehicle.capacity}
                  required
                />
                <Field
                  label="Marca"
                  name="brand"
                  defaultValue={vehicle.brand}
                />
                <Field
                  label="Modelo"
                  name="model"
                  defaultValue={vehicle.model}
                />
                <Field
                  label="Año"
                  name="year"
                  type="number"
                  min={1950}
                  max={2100}
                  defaultValue={vehicle.year}
                  required
                />
              </div>
              <label>
                Características
                <textarea name="features" defaultValue={vehicle.features} />
              </label>
              {canEdit && (
                <label>
                  Observaciones internas
                  <textarea name="notes" defaultValue={vehicle.notes} />
                </label>
              )}
            </fieldset>
            <div className="photos">
              {vehicle.photos.map((url, i) => (
                <div key={url}>
                  <img alt={"Fotografía " + (i + 1)} src={url} />
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          unsaved.mark();
                          setVehicle({
                            ...vehicle,
                            photos: [
                              url,
                              ...vehicle.photos.filter((x) => x !== url),
                            ],
                          });
                        }}
                      >
                        {i === 0 ? "Principal" : "Usar principal"}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label="Eliminar foto"
                        onClick={() => {
                          unsaved.mark();
                          setVehicle({
                            ...vehicle,
                            photos: vehicle.photos.filter((x) => x !== url),
                          });
                        }}
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {canEdit && (
              <>
                <label className="upload">
                  Añadir fotografías
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        validatePhoto(file);
                        const url = URL.createObjectURL(file);
                        pendingPhotos.current.set(url, file);
                        unsaved.mark();
                        setVehicle({
                          ...vehicle,
                          photos: [...vehicle.photos, url],
                        });
                      } catch (e) {
                        setError(message(e));
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="modal-actions">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      busy || !data.vehicles.some((v) => v.id === vehicle.id)
                    }
                    onClick={() => {
                      const saved = data.vehicles.find(
                        (v) => v.id === vehicle.id,
                      );
                      if (!saved) return;
                      unsaved.request(
                        () =>
                          void mutate(() =>
                            saveVehicle({
                              ...saved,
                              version: vehicle.version,
                              archived: !vehicle.archived,
                            }),
                          ),
                        unsaved.isDirty()
                          ? "¿Descartar los cambios sin guardar y cambiar el estado del vehículo?"
                          : undefined,
                      );
                    }}
                  >
                    {vehicle.archived ? "Reactivar" : "Archivar vehículo"}
                  </Button>
                  <Button disabled={busy}>Guardar vehículo</Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
      {occupation && (
        <Modal
          title={
            canEdit ? "Asignación de vehículo" : "Disponibilidad del vehículo"
          }
          close={() => {
            if (!busy)
              unsaved.request(() => {
                unsaved.clear();
                setOccupation(null);
              });
          }}
        >
          {error && (
            <div className="alert" role="alert">
              {error}
            </div>
          )}
          {canEdit ? (
            <form
              onInput={unsaved.mark}
              onChange={unsaved.mark}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                try {
                  const start = allDay
                    ? dayStart(String(f.get("start")))
                    : toUTC(String(f.get("start")));
                  const end = allDay
                    ? dayStart(nextDay(String(f.get("end"))))
                    : toUTC(String(f.get("end")));
                  if (start >= end)
                    throw new Error("El término debe ser posterior al inicio.");
                  void mutate(() =>
                    saveOccupation({
                      ...occupation,
                      vehicle_id: String(f.get("vehicle_id")),
                      kind: f.get("kind") as Occupation["kind"],
                      starts_at: start,
                      ends_at: end,
                      activity: String(f.get("activity")),
                      destination: String(f.get("destination")),
                      organization: String(f.get("organization")),
                      responsible: String(f.get("responsible")),
                      contact: String(f.get("contact")),
                      notes: String(f.get("notes")),
                    }),
                  );
                } catch (e) {
                  setError(message(e));
                }
              }}
            >
              <fieldset disabled={busy || occupation.cancelled}>
                <div className="form-grid">
                  <label>
                    Vehículo
                    <select
                      name="vehicle_id"
                      defaultValue={occupation.vehicle_id}
                      required
                    >
                      {data.vehicles
                        .filter(
                          (v) => !v.archived || v.id === occupation.vehicle_id,
                        )
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} · {v.plate}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Tipo
                    <select name="kind" defaultValue={occupation.kind}>
                      <option value="reservation">Reserva</option>
                      <option value="maintenance">Mantenimiento</option>
                    </select>
                  </label>
                </div>
                <OccupationDates
                  key={occupation.id}
                  occupation={occupation}
                  allDay={allDay}
                  setAllDay={setAllDay}
                />
                <div className="form-grid">
                  <Field
                    label="Actividad / motivo"
                    name="activity"
                    defaultValue={occupation.activity}
                  />
                  <Field
                    label="Destino"
                    name="destination"
                    defaultValue={occupation.destination}
                  />
                  <Field
                    label="Organización solicitante"
                    name="organization"
                    defaultValue={occupation.organization}
                  />
                  <Field
                    label="Responsable"
                    name="responsible"
                    defaultValue={occupation.responsible}
                  />
                  <Field
                    label="Contacto"
                    name="contact"
                    defaultValue={occupation.contact}
                  />
                </div>
                <label>
                  Notas internas
                  <textarea name="notes" defaultValue={occupation.notes} />
                </label>
              </fieldset>
              <p className="form-hint">
                Horarios en America/Santiago. No se permiten cruces con reservas
                o mantenimiento.
              </p>
              <div className="modal-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    busy ||
                    occupation.cancelled ||
                    !data.occupations.some((o) => o.id === occupation.id)
                  }
                  onClick={() => {
                    unsaved.request(
                      () =>
                        void mutate(() =>
                          saveOccupation({ ...occupation, cancelled: true }),
                        ),
                      "¿Cancelar esta asignación? Dejará de ocupar el vehículo. Los cambios sin guardar se descartarán.",
                    );
                  }}
                >
                  Cancelar asignación
                </Button>
                <Button disabled={busy || occupation.cancelled}>
                  Guardar asignación
                </Button>
              </div>
            </form>
          ) : (
            <div className="public-detail">
              <h3>
                {
                  data.vehicles.find((v) => v.id === occupation.vehicle_id)
                    ?.name
                }
              </h3>
              <span className={"badge " + eventColor(occupation)}>
                {occupation.kind === "maintenance" ? "Bloqueado" : "Ocupado"}
              </span>
              <p>Desde {pretty(occupation.starts_at)}</p>
              <p>Hasta {pretty(occupation.ends_at)}</p>
              <p className="form-hint">
                Los datos de la actividad son de acceso administrativo.
              </p>
            </div>
          )}
        </Modal>
      )}
      {unsaved.pending && (
        <Modal title="Confirmar acción" close={unsaved.reject}>
          <p>{unsaved.pending.message}</p>
          <div className="modal-actions">
            <Button variant="outline" onClick={unsaved.reject}>
              Seguir editando
            </Button>
            <Button onClick={unsaved.accept}>Confirmar y descartar</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function message(e: unknown) {
  return e instanceof Error
    ? e.message
    : typeof e === "object" && e && "message" in e
      ? String(e.message)
      : "No se pudo completar la operación.";
}
function nextDay(day: string) {
  return shiftDay(day, 1);
}
function eventColor(o: Occupation) {
  return o.kind === "maintenance"
    ? "amber"
    : Date.parse(o.starts_at) <= Date.now() &&
        Date.parse(o.ends_at) > Date.now()
      ? "green"
      : "blue";
}
function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<"input">) {
  return (
    <label>
      {label}
      <input {...props} />
    </label>
  );
}
function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="stat panel">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      <div className="stat-icon">{icon}</div>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef(close);
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    modal?.querySelector<HTMLElement>("button,input,select,textarea")?.focus();
    const fn = (e: KeyboardEvent) => {
      if (Array.from(document.querySelectorAll(".modal")).at(-1) !== modal)
        return;
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const elements = Array.from(
          modal?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
          ) || [],
        );
        const first = elements[0],
          last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={close} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
