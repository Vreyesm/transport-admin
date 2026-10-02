// Calendar arithmetic uses civil dates, never the browser's local timezone.
export function calendarDate(day: string) {
  return new Date(`${day}T12:00:00Z`);
}
export function shiftDay(day: string, amount: number) {
  const date = calendarDate(day);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function shiftMonth(day: string, amount: number) {
  const date = calendarDate(day);
  date.setUTCMonth(date.getUTCMonth() + amount, 1);
  return date.toISOString().slice(0, 10);
}
export function calendarDays(day: string, weekly: boolean) {
  const first = weekly ? day : `${day.slice(0, 7)}-01`;
  const start = shiftDay(first, -((calendarDate(first).getUTCDay() + 6) % 7));
  return Array.from({ length: weekly ? 7 : 42 }, (_, i) => shiftDay(start, i));
}
