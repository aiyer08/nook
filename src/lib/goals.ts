/**
 * When a goal counts as finished.
 *
 * This lived inline in two places — the update action and the loader — and
 * "finished" meant something slightly different in each. It's a rule, not
 * plumbing, so it lives here where it can be tested.
 *
 * The rule that matters is `countedOn`: set once, never cleared. A goal you
 * tick, untick and tick again is one finished thing, not three seeds' worth —
 * and the date is what lets Wrapped file the achievement under the right year.
 */
import type { DateStr, Goal } from './types';

/** Ticked off, or filled to its target. */
export function goalFinished(g: Goal): boolean {
  return Boolean(g.done) || (g.target > 0 && g.current >= g.target);
}

/** Finished, and not yet paid for. */
export function needsCounting(g: Goal): boolean {
  return goalFinished(g) && !g.countedOn;
}

/**
 * Bring a set of goals up to date, for boards finished before finishing a
 * goal counted for anything.
 *
 * Their achievement is real but undated, so it's filed under the day we
 * noticed rather than a date we made up. Returns the goals and how many were
 * newly counted, so the caller can move the counter by the same amount.
 */
export function countFinishedGoals(
  goals: Goal[],
  today: DateStr,
): { goals: Goal[]; counted: number } {
  let counted = 0;
  const out = goals.map((g) => {
    if (!needsCounting(g)) return g;
    counted += 1;
    return { ...g, done: true, countedOn: today };
  });
  return { goals: out, counted };
}
