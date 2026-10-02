"use client";
import { useEffect, useState } from "react";
import { api, configured } from "@/lib/api";
import { dayStart } from "@/lib/time";
import { shiftDay } from "@/lib/calendar";
import { Button } from "./ui/button";
type Entry = {
  id: number;
  actor: string | null;
  entity: string;
  record_id: string;
  operation: string;
  created_at: string;
  before_data: unknown;
  after_data: unknown;
};
export function AuditView() {
  const [entity, setEntity] = useState("");
  const [operation, setOperation] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    rows: Entry[];
    count: number;
    error: string;
    loading: boolean;
  }>({ rows: [], count: 0, error: "", loading: true });
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!configured) {
        if (active)
          setResult({ rows: [], count: 0, error: "", loading: false });
        return;
      }
      try {
        if (
          actor &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            actor,
          )
        )
          throw new Error("Ingresa un UUID de actor completo.");
        if (from && to && from > to)
          throw new Error("El término debe ser posterior al inicio.");
        const params = new URLSearchParams({
          entity,
          operation,
          actor,
          from: from ? dayStart(from) : "",
          to: to ? dayStart(shiftDay(to, 1)) : "",
          page: String(page),
        });
        const { rows: data, count } = await api<{
          rows: Entry[];
          count: number;
        }>(`audit?${params}`);
        if (active)
          setResult({
            rows: data || [],
            count: count || 0,
            error: "",
            loading: false,
          });
      } catch (e) {
        if (active)
          setResult({
            rows: [],
            count: 0,
            error:
              e instanceof Error
                ? e.message
                : "No se pudo cargar la auditoría.",
            loading: false,
          });
      }
    };
    const timer = setTimeout(() => {
      setResult({ rows: [], count: 0, error: "", loading: true });
      void load();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [entity, operation, actor, from, to, page, revision]);
  const filter = (setter: (s: string) => void, value: string) => {
    setter(value);
    setPage(0);
  };
  return (
    <section className="panel audit">
      <h2>Auditoría administrativa</h2>
      <p>
        Actor identificado por UUID de cuenta. Sin actor: operación del sistema
        o migración. No existe un directorio público de cuentas.
      </p>
      {!configured ? (
        <p>
          Demostración: no se registra auditoría persistente ni se simulan
          identidades. El historial real estará disponible al conectar
          PostgreSQL.
        </p>
      ) : (
        <>
          <div className="filters">
            <label>
              Entidad
              <select
                value={entity}
                onChange={(e) => filter(setEntity, e.target.value)}
              >
                <option value="">Todas</option>
                {["vehicles", "occupations", "settings"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Operación
              <select
                value={operation}
                onChange={(e) => filter(setOperation, e.target.value)}
              >
                <option value="">Todas</option>
                {["INSERT", "UPDATE", "DELETE"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Actor (UUID)
              <input
                value={actor}
                onChange={(e) => filter(setActor, e.target.value)}
              />
            </label>
            <label>
              Desde (Chile)
              <input
                type="date"
                value={from}
                onChange={(e) => filter(setFrom, e.target.value)}
              />
            </label>
            <label>
              Hasta (Chile)
              <input
                type="date"
                value={to}
                onChange={(e) => filter(setTo, e.target.value)}
              />
            </label>
            <Button variant="outline" onClick={() => setRevision((x) => x + 1)}>
              Actualizar
            </Button>
          </div>
          {result.error && <p role="alert">{result.error}</p>}
          {result.loading ? (
            <p>Cargando auditoría…</p>
          ) : (
            <>
              {result.rows.map((row) => (
                <details key={row.id}>
                  <summary>
                    {new Date(row.created_at).toLocaleString("es-CL", {
                      timeZone: "America/Santiago",
                    })}{" "}
                    · {row.entity} · {row.operation}
                  </summary>
                  <p>
                    Actor: {row.actor || "Sistema / migración"} · Registro:{" "}
                    {row.record_id}
                  </p>
                  <div className="audit-values">
                    <div>
                      <h3>Valores anteriores</h3>
                      <pre>{JSON.stringify(row.before_data, null, 2)}</pre>
                    </div>
                    <div>
                      <h3>Valores nuevos</h3>
                      <pre>{JSON.stringify(row.after_data, null, 2)}</pre>
                    </div>
                  </div>
                </details>
              ))}
              {!result.rows.length && <p>Sin registros para estos filtros.</p>}
              <div className="export-controls">
                <Button
                  disabled={page === 0}
                  onClick={() => setPage((x) => x - 1)}
                >
                  Anterior
                </Button>
                <span>
                  Página {page + 1} · {result.count} registros
                </span>
                <Button
                  disabled={(page + 1) * 20 >= result.count}
                  onClick={() => setPage((x) => x + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
