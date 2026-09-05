/**
 * Nook Wrapped — a year read back to you.
 *
 * Every number here is derived from what's already stored; nothing is tallied
 * as you go, so a year you spent away from the app doesn't quietly lose data
 * and there's no counter that can drift out of step with the truth.
 */
import type { DateStr, Doc } from './types';
import { GARDEN, flowerById } from './garden';
import { MONTHS, addDays, daysBetween, parseDateStr, today } from './dates';
import { streaks } from './streaks';
import { stageOf } from './growth';

export interface WrappedWeek {
  start: DateStr;
  count: number;
}

export interface Wrapped {
  year: number;
  /** true when the year has barely any data — the UI says so rather than lying */
  thin: boolean;
  completed: number;
  activeDays: number;
  bestStreak: number;
  bestStreakEver: number;
  perMonth: number[];
  busiestWeek: WrappedWeek | null;
  busiestDay: { date: DateStr; count: number } | null;
  /** one entry per day of the year; mood is 1–5, or null for a day you didn't say */
  mood: { date: DateStr; mood: number | null }[];
  moodAverage: number | null;
  moodDays: number;
  topFlower: { id: string; name: string; species: string; count: number } | null;
  focusMinutes: number;
  plants: number;
  blooms: number;
  mouseFound: number;
  /** the tab you finished the most in */
  topSector: { name: string; count: number } | null;
}

/** Every date something was finished on, one entry per completion. */
export function completionDates(doc: Doc, year?: number): DateStr[] {
  const out: DateStr[] = [];
  const inYear = (d: DateStr) => year === undefined || d.slice(0, 4) === String(year);
  for (const t of doc.tasks) {
    if (t.recurrence) {
      for (const d of t.completions ?? []) if (inYear(d)) out.push(d);
    } else if (t.done && t.completedOn && inYear(t.completedOn)) {
      out.push(t.completedOn);
    }
  }
  return out;
}

/** The Monday that starts the week a date falls in. */
export function weekStart(date: DateStr): DateStr {
  const back = (parseDateStr(date).getDay() + 6) % 7;   // Monday = 0
  return addDays(date, -back);
}

function tally<T extends string>(keys: T[]): Map<T, number> {
  const m = new Map<T, number>();
  for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}

function best<T extends string>(m: Map<T, number>): { key: T; count: number } | null {
  let key: T | null = null;
  let count = 0;
  for (const [k, n] of m) if (n > count) { key = k; count = n; }
  return key === null ? null : { key, count };
}

/** Every day of the year, but stopping at today for the year in progress. */
function daysOfYear(year: number, now: DateStr): DateStr[] {
  const out: DateStr[] = [];
  const last = now.slice(0, 4) === String(year) ? now : `${year}-12-31`;
  let cursor = `${year}-01-01`;
  while (cursor <= last) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Mood per day, averaged when more than one tracker asked. */
function moodByDay(doc: Doc, year: number): Map<DateStr, number> {
  const sums = new Map<DateStr, [number, number]>();
  for (const w of doc.widgets) {
    if (w.type !== 'tracker') continue;
    const days = w.data.days;
    if (!days) continue;
    for (const [date, entry] of Object.entries(days)) {
      if (date.slice(0, 4) !== String(year)) continue;
      const value = entry?.mood;
      if (typeof value !== 'number' || value <= 0) continue;
      const [sum, n] = sums.get(date) ?? [0, 0];
      sums.set(date, [sum + value, n + 1]);
    }
  }
  const out = new Map<DateStr, number>();
  for (const [date, [sum, n]] of sums) out.set(date, sum / n);
  return out;
}

/**
 * Which flower you actually used. Counted from the times you planted something
 * out of it; if the tally is empty (a board built before it was kept) we fall
 * back to counting the widgets on your pages.
 */
function topFlower(doc: Doc): Wrapped['topFlower'] {
  const picks = Object.entries(doc.garden.picks ?? {});
  let winner: { id: string; count: number } | null = null;
  for (const [id, n] of picks) if (!winner || n > winner.count) winner = { id, count: n };

  if (!winner) {
    const counts = new Map<string, number>();
    for (const w of doc.widgets) {
      const flower = GARDEN.find((f) => f.contents.some((k) => k === `w:${w.type}`));
      if (!flower) continue;
      counts.set(flower.id, (counts.get(flower.id) ?? 0) + 1);
    }
    const b = best(counts);
    if (b) winner = { id: b.key, count: b.count };
  }

  const flower = winner ? flowerById(winner.id) : undefined;
  if (!winner || !flower) return null;
  return { id: flower.id, name: flower.name, species: flower.species, count: winner.count };
}

export function wrapUp(doc: Doc, year: number, now: DateStr = today()): Wrapped {
  const dates = completionDates(doc, year);
  const byDay = tally(dates);
  const run = streaks(dates, now);

  const perMonth = Array.from({ length: 12 }, () => 0);
  for (const d of dates) perMonth[Number(d.slice(5, 7)) - 1] += 1;

  const weeks = tally(dates.map(weekStart));
  const bw = best(weeks);
  const bd = best(byDay);

  const moods = moodByDay(doc, year);
  const mood = daysOfYear(year, now).map((date) => ({
    date,
    mood: moods.get(date) ?? null,
  }));
  const moodValues = [...moods.values()];

  const sectorName = new Map(doc.sectors.map((s) => [s.id, s.name]));
  const perSector = new Map<string, number>();
  for (const t of doc.tasks) {
    const n = t.recurrence
      ? (t.completions ?? []).filter((d) => d.slice(0, 4) === String(year)).length
      : (t.done && t.completedOn?.slice(0, 4) === String(year) ? 1 : 0);
    if (!n) continue;
    const name = sectorName.get(t.sectorId);
    if (name) perSector.set(name, (perSector.get(name) ?? 0) + n);
  }
  const ts = best(perSector);

  const plants = doc.garden.plants ?? [];

  return {
    year,
    thin: dates.length < 10,
    completed: dates.length,
    activeDays: byDay.size,
    bestStreak: run.longest,
    bestStreakEver: Math.max(doc.stats.bestStreak ?? 0, run.longest),
    perMonth,
    busiestWeek: bw ? { start: bw.key, count: bw.count } : null,
    busiestDay: bd ? { date: bd.key, count: bd.count } : null,
    mood,
    moodAverage: moodValues.length ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : null,
    moodDays: moodValues.length,
    topFlower: topFlower(doc),
    focusMinutes: doc.stats.focusMinutes ?? 0,
    plants: plants.length,
    blooms: plants.filter((p) => stageOf(p, now) === 4).length,
    mouseFound: (doc.garden.foundOn ?? []).length,
    topSector: ts ? { name: ts.key, count: ts.count } : null,
  };
}

/** "the week of 3 March", for the busiest-week line. */
export function describeWeek(week: WrappedWeek): string {
  const d = parseDateStr(week.start);
  const end = addDays(week.start, 6);
  const e = parseDateStr(end);
  const sameMonth = d.getMonth() === e.getMonth();
  return sameMonth
    ? `${d.getDate()}–${e.getDate()} ${MONTHS[d.getMonth()]}`
    : `${d.getDate()} ${MONTHS[d.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]}`;
}

/** How long you've been keeping this, in plain words. */
export function keepingSince(doc: Doc, now: DateStr = today()): number {
  const firsts = [
    ...doc.tasks.map((t) => t.createdOn),
    ...(doc.garden.plants ?? []).map((p) => p.plantedOn),
  ].filter(Boolean).sort();
  if (!firsts.length) return 0;
  return Math.max(0, daysBetween(firsts[0], now));
}
