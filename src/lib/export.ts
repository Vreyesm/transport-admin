import { Occupation, Vehicle } from "./types";
import { dayStart, localInput } from "./time";
import { calendarDays, shiftDay } from "./calendar";

export function scheduleRows(
  occupations: Occupation[],
  vehicles: Vehicle[],
  date: string,
  weekly: boolean,
  admin: boolean,
  cancelled = false,
) {
  const start = weekly ? calendarDays(date, true)[0] : date;
  const end = shiftDay(start, weekly ? 7 : 1);
  const headers = [
    "Vehículo",
    "Patente",
    "Inicio (Chile)",
    "Término (Chile)",
    "Tipo",
    "Estado",
    ...(admin ? ["Responsable", "Destino", "Contacto"] : []),
  ];
  const rows = occupations
    .filter(
      (o) =>
        (!o.cancelled || (admin && cancelled)) &&
        vehicles.some((v) => v.id === o.vehicle_id) &&
        Date.parse(o.starts_at) < Date.parse(dayStart(end)) &&
        Date.parse(o.ends_at) > Date.parse(dayStart(start)),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((o) => {
      const v = vehicles.find((v) => v.id === o.vehicle_id)!;
      return [
        v.name,
        v.plate,
        localInput(o.starts_at).replace("T", " "),
        localInput(o.ends_at).replace("T", " "),
        o.kind === "maintenance" ? "Mantenimiento" : "Reserva",
        o.cancelled ? "Cancelada" : "Activa",
        ...(admin
          ? [o.responsible || "", o.destination || "", o.contact || ""]
          : []),
      ];
    });
  return { start, end: shiftDay(end, -1), headers, rows };
}
export function csvCell(value: string) {
  // Neutralize formulas even when preceded by whitespace/control characters.
  const safe =
    /^[\s\u0000-\u001f]*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value)
      ? "'" + value
      : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function scheduleCSV(headers: string[], rows: string[][]) {
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")
  );
}
