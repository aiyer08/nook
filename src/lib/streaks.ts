/**
 * Streaks, computed from the list of days you actually did the thing.
 *
 * Nothing is cached. The dates are the only stored truth, and both streaks are
 * derived on every render — which means back-filling a day you forgot to tick
 * repairs the streak instantly, and no migration is ever needed.
 *
 * Longest streak is here for a specific reason: a current streak alone means
 * one missed day erases all evidence you were ever capable of it.
 */
import type { DateStr } from './types';
import { addDays, daysBetween, today as todayStr } from './dates';

export interface StreakInfo {
  current: number;
  longest: number;
  total: number;
  /** true when today is already ticked */
  todayDone: boolean;
  /** the run that is still going, so it can be highlighted */
  currentStart?: DateStr;
  longestStart?: DateStr;
  longestEnd?: DateStr;
}

/**
 * A run is consecutive calendar days. The current run is allowed to end
 * *yesterday* — being mid-morning and not having done it yet shouldn't read as
 * a broken streak.
 */
export function streaks(dates: Iterable<DateStr>, today: DateStr = todayStr()): StreakInfo {
  const unique = Array.from(new Set(Array.from(dates))).filter(Boolean).sort();
  const info: StreakInfo = { current: 0, longest: 0, total: unique.length, todayDone: false };
  if (!unique.length) return info;

  info.todayDone = unique.includes(today);

  let runStart = unique[0];
  let runLength = 1;

  const closeRun = (end: DateStr) => {
    if (runLength > info.longest) {
      info.longest = runLength;
      info.longestStart = runStart;
      info.longestEnd = end;
    }
  };

  for (let i = 1; i < unique.length; i++) {
    const gap = daysBetween(unique[i - 1], unique[i]);
    if (gap === 1) {
      runLength += 1;
    } else {
      closeRun(unique[i - 1]);
      runStart = unique[i];
      runLength = 1;
    }
  }
  closeRun(unique[unique.length - 1]);

  const last = unique[unique.length - 1];
  const sinceLast = daysBetween(last, today);
  if (sinceLast === 0 || sinceLast === 1) {
    info.current = runLength;
    info.currentStart = runStart;
  }

  return info;
}

/** The squares for a contribution-graph grid, oldest first, aligned to weeks. */
export function gridDays(weeks: number, today: DateStr = todayStr()): DateStr[] {
  // walk back to the Sunday that starts the earliest week shown
  const endOfWeekOffset = 6 - new Date(`${today}T00:00:00`).getDay();
  const lastCell = addDays(today, endOfWeekOffset);
  const first = addDays(lastCell, -(weeks * 7 - 1));
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(first, i));
}

/** Every day of a calendar year, for year-in-pixels. */
export function yearDays(year: number): DateStr[] {
  const out: DateStr[] = [];
  let cursor = `${year}-01-01`;
  while (cursor.slice(0, 4) === String(year)) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/**
 * Pearson correlation, used to say something honest about mood versus tasks
 * finished. Returns undefined when there is too little data to mean anything.
 */
export function correlation(pairs: [number, number][]): number | undefined {
  const n = pairs.length;
  if (n < 5) return undefined;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  if (dx === 0 || dy === 0) return undefined;
  return num / Math.sqrt(dx * dy);
}

/** Plain-English reading of a correlation, hedged honestly. */
export function describeCorrelation(r: number | undefined, n: number): string {
  if (r === undefined) {
    return n < 5
      ? `A few more days of tapping and there'll be something to see here.`
      : `No pattern yet — which is itself worth knowing.`;
  }
  const strength = Math.abs(r);
  const word = strength > 0.6 ? 'strongly' : strength > 0.35 ? 'somewhat' : 'loosely';
  if (strength < 0.2) return `Over ${n} days, mood and how much you got done look unrelated.`;
  return r > 0
    ? `Over ${n} days, better days ${word} line up with getting more done.`
    : `Over ${n} days, busier days ${word} line up with feeling worse. Worth sitting with.`;
}
