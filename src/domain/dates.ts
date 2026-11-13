// The demo is pinned to the Thursday meeting morning so dates read the same whenever it is
// opened. Dates are calendar days ('YYYY-MM-DD') and datetimes are local, minute precision
// ('YYYY-MM-DDTHH:mm'); both are parsed as LOCAL time (never UTC) so nothing shows a day early.

export const TODAY = '2026-11-12'; // Thursday
export const MEETING_SNAPSHOT_AT = '2026-11-12T08:14';
const DEMO_CLOCK_START = '2026-11-12T08:20';
const MAX_ELAPSED_MS = 9 * 60 * 60 * 1000; // the clock stops at 5:20 PM on meeting day

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n: number) => String(n).padStart(2, '0');

export function parseLocal(iso: string): Date {
  const [day, time] = iso.split('T');
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = (time ?? '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

export const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toDateTime = (d: Date) => `${toDay(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const dayOf = (iso: string) => iso.slice(0, 10);

/** Demo "now": the meeting morning plus real time elapsed since the demo was (re)started. */
export function demoNow(clockStartedAt: number): string {
  const elapsed = Math.min(Math.max(Date.now() - clockStartedAt, 0), MAX_ELAPSED_MS);
  return toDateTime(new Date(parseLocal(DEMO_CLOCK_START).getTime() + elapsed));
}

export function addDays(day: string, n: number): string {
  const d = parseLocal(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

/** Whole days from a to b (b later → positive). */
export function daysBetween(a: string, b: string): number {
  const ms = parseLocal(dayOf(b)).getTime() - parseLocal(dayOf(a)).getTime();
  return Math.round(ms / 86_400_000);
}

/** Next weekday (Mon-Fri) on or after the given day. */
export function nextBusinessDay(day: string, offset = 1): string {
  let d = addDays(day, offset);
  while ([0, 6].includes(parseLocal(d).getDay())) d = addDays(d, 1);
  return d;
}

/** "Nov 13" */
export function fmtShort(iso: string): string {
  const d = parseLocal(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Thu Nov 13" */
export function fmtWeekday(iso: string): string {
  const d = parseLocal(iso);
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Nov 13, 2026" */
export function fmtLong(iso: string): string {
  const d = parseLocal(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "11/13/2026" — the app's table format */
export function fmtNumeric(iso: string): string {
  const d = parseLocal(iso);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

/** "8:14 AM" */
export function fmtTime(iso: string): string {
  const d = parseLocal(iso);
  const h = d.getHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "8:14 AM" when today, else "Nov 6, 8:14 AM" */
export function fmtWhen(iso: string): string {
  if (!iso.includes('T')) return fmtShort(iso);
  return dayOf(iso) === TODAY ? fmtTime(iso) : `${fmtShort(iso)}, ${fmtTime(iso)}`;
}

/** "today" | "tomorrow" | "in 12 days" | "yesterday" | "3 days ago" */
export function relDays(iso: string, from: string = TODAY): string {
  const n = daysBetween(from, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export function ageOn(dob: string, on: string = TODAY): number {
  const b = parseLocal(dob);
  const t = parseLocal(on);
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age -= 1;
  return age;
}
