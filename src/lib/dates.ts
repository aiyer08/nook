import type { DateStr, Recurrence, Task } from './types';

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Local-time YYYY-MM-DD (never UTC — a planner should agree with your wall clock). */
export function toDateStr(d: Date): DateStr {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): DateStr {
  return toDateStr(new Date());
}

export function parseDateStr(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function daysBetween(a: DateStr, b: DateStr): number {
  const ms = parseDateStr(b).getTime() - parseDateStr(a).getTime();
  return Math.round(ms / 86400000);
}

export function isSameMonth(a: DateStr, monthCursor: string) {
  return a.slice(0, 7) === monthCursor;
}

export function monthCursorOf(d: DateStr) {
  return d.slice(0, 7);
}

export function shiftMonth(cursor: string, delta: number) {
  const [y, m] = cursor.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Grid of 42 days (6 weeks) covering the month, Sunday-first. */
export function monthGrid(cursor: string): DateStr[] {
  const [y, m] = cursor.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const out: DateStr[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(toDateStr(d));
  }
  return out;
}

export function prettyDate(s: DateStr): string {
  const d = parseDateStr(s);
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function prettyTime(t?: string): string {
  if (!t) return '';
  const [hRaw, m] = t.split(':').map(Number);
  const suffix = hRaw >= 12 ? 'pm' : 'am';
  const h = hRaw % 12 === 0 ? 12 : hRaw % 12;
  return m ? `${h}:${String(m).padStart(2, '0')}${suffix}` : `${h}${suffix}`;
}

/** Warm, never scolding. */
export function relativeDay(s: DateStr, now = today()): string {
  const diff = daysBetween(now, s);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 1 && diff < 7) return `in ${diff} days`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`;
  return prettyDate(s);
}

export function recurrenceHitsOn(r: Recurrence, date: DateStr): boolean {
  const d = parseDateStr(date);
  if (r.freq === 'daily') return true;
  if (r.freq === 'weekly') return (r.weekdays ?? []).includes(d.getDay());
  if (r.freq === 'monthly') return d.getDate() === (r.monthDay ?? 1);
  return false;
}

export function describeRecurrence(r: Recurrence): string {
  if (r.freq === 'daily') return 'every day';
  if (r.freq === 'weekly') {
    const days = (r.weekdays ?? []).map((d) => WEEKDAYS[d]).join(', ');
    return days ? `every ${days}` : 'weekly';
  }
  return `monthly on the ${r.monthDay ?? 1}`;
}

/** Is the box ticked, as of `date`? Recurring tasks track each day separately. */
export function isTaskDoneOn(task: Task, date: DateStr): boolean {
  if (task.recurrence) return (task.completions ?? []).includes(date);
  return task.done;
}

/** Was it actually finished *on* that day? Yesterday's wins aren't today's. */
export function finishedOn(task: Task, date: DateStr): boolean {
  if (task.recurrence) return (task.completions ?? []).includes(date);
  return task.done && (task.completedOn ?? task.createdOn) === date;
}

/**
 * Should this task appear on `date`?
 * - recurring: whenever the pattern hits
 * - dated: on its due date (and it stays there — dated things do not roll)
 * - floating: from the day it was made until it is done; unfinished ones roll forward
 */
export function taskAppearsOn(task: Task, date: DateStr): boolean {
  if (task.recurrence) {
    return recurrenceHitsOn(task.recurrence, date) && task.createdOn <= date;
  }
  if (task.kind === 'dated') return task.dueDate === date;
  if (task.done) return task.completedOn === date || task.createdOn === date;
  return task.createdOn <= date;
}

/** How many days a floating task has been quietly waiting. 0 = made today. */
export function rolloverDays(task: Task, date = today()): number {
  if (task.kind !== 'floating' || task.recurrence || task.done) return 0;
  return Math.max(0, daysBetween(task.createdOn, date));
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Still up?';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Winding down';
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function seasonOf(d = new Date()): Season {
  const m = d.getMonth();
  if (m <= 1 || m === 11) return 'winter';
  if (m <= 4) return 'spring';
  if (m <= 7) return 'summer';
  return 'autumn';
}
