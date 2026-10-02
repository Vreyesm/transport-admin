export const ZONE = "America/Santiago";
export function localDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function toUTC(value: string) {
  const [date, time = "00:00"] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, h, min);
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
    const actual = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    const delta = target - actual;
    if (!delta) return new Date(guess).toISOString();
    guess += delta;
  }
  throw new Error(
    "La hora indicada no existe debido al cambio de horario. Selecciona otra hora.",
  );
}
export function localInput(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function overlaps(
  a: { starts_at: string; ends_at: string },
  b: { starts_at: string; ends_at: string },
) {
  return (
    Date.parse(a.starts_at) < Date.parse(b.ends_at) &&
    Date.parse(b.starts_at) < Date.parse(a.ends_at)
  );
}
// Chile advances its clock at midnight; that day's first instant is 01:00.
export function dayStart(day: string) {
  for (let hour = 0; hour < 3; hour++) {
    try {
      return toUTC(`${day}T${String(hour).padStart(2, "0")}:00`);
    } catch {
      /* Try the first existing hour. */
    }
  }
  throw new Error("No se pudo determinar el inicio del día.");
}
export function pretty(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
