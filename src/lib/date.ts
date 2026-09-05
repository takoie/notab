/** Date helpers for note due dates. All timestamps are epoch ms at local 00:00. */

export function startOfDay(d: Date | number = new Date()): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function startOfToday(): number {
  return startOfDay(new Date());
}

export function addDays(ts: number, days: number): number {
  const x = new Date(ts);
  x.setDate(x.getDate() + days);
  return startOfDay(x);
}

/** ISO-8601 week number (weeks start Monday; week 1 contains the first Thursday). */
export function isoWeek(d: Date | number = new Date()): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Thursday of the current week decides the year
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

/** Friday of the ISO week that contains `ts` (a natural "end of the work week"). */
export function endOfIsoWeek(ts: number = startOfToday()): number {
  const d = new Date(ts);
  const isoDow = (d.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  return addDays(ts, 4 - isoDow); // Friday
}

const DATE_FMT = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' });

/** Short label for a due date, e.g. "uke 31" plus the date in the tooltip. */
export function dueLabel(ts: number): string {
  return `uke ${isoWeek(ts)}`;
}

export function dueTooltip(ts: number): string {
  return `${DATE_FMT.format(ts)} · uke ${isoWeek(ts)}`;
}

/** yyyy-mm-dd for <input type="date"> value binding. */
export function toDateInput(ts: number | null): string {
  if (ts == null) return '';
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromDateInput(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return startOfDay(new Date(y, m - 1, d));
}
