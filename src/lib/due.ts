/**
 * One idea of "when is this due", shared by everything that has a deadline.
 *
 * Sorting by hand in each widget got us four slightly different answers to the
 * same question, so the comparators live here. Three rules run through all of
 * them:
 *
 *  1. Soonest first. A deadline is only useful if the next one is at the top.
 *  2. Undated things sit *after* dated ones rather than sorting as an empty
 *     string, which would float them to the front.
 *  3. Ties fall back to the order you arranged by hand, so dragging still
 *     means something among things due the same day.
 */
import type { CellValue, FieldDef, Goal, ID, Task } from './types';

/** A sortable "when", or '' for something with no date at all. */
export function taskWhen(t: Task): string {
  if (t.kind !== 'dated' || !t.dueDate) return '';
  // the time is padded so 9:00 sorts before 10:00 rather than after
  return `${t.dueDate}T${(t.dueTime ?? '').padStart(5, '0')}`;
}

/** Dated soonest-first, then undated in the order you put them in. */
export function compareTaskDue(a: Task, b: Task): number {
  const aw = taskWhen(a);
  const bw = taskWhen(b);
  if (aw && bw && aw !== bw) return aw < bw ? -1 : 1;
  if (aw && !bw) return -1;
  if (!aw && bw) return 1;
  // same day, or both floating: longest-waiting first, then your own order
  if (a.createdOn !== b.createdOn) return a.createdOn < b.createdOn ? -1 : 1;
  return a.order - b.order;
}

/**
 * Goals: the ones still going, soonest deadline first. Finished goals drop to
 * the bottom instead of vanishing, because a finished goal is a nice thing to
 * see.
 */
export function compareGoalDue(a: Goal, b: Goal): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const aw = a.dueDate ?? '';
  const bw = b.dueDate ?? '';
  if (aw && bw && aw !== bw) return aw < bw ? -1 : 1;
  if (aw && !bw) return -1;
  if (!aw && bw) return 1;
  return a.title.localeCompare(b.title);
}

/**
 * The date field a collection should sort itself by.
 *
 * A named deadline wins over any other date — an application tracker has both
 * "Deadline" and "Applied on", and only one of those is a thing you're waiting
 * for. Otherwise the first date field is as good a guess as we can make.
 */
export function dueFieldOf(fields: FieldDef[]): FieldDef | undefined {
  const dates = fields.filter((f) => f.type === 'date');
  if (!dates.length) return undefined;
  return dates.find((f) => /deadline|due|expir|closes?\b/i.test(f.name))
    ?? dates.find((f) => /^when$|date/i.test(f.name))
    ?? dates[0];
}

/**
 * Compare two rows by a field, keeping blanks at the bottom whichever way the
 * sort is pointing. Reversing a sort should turn the list over, not dredge up
 * every empty cell.
 */
export function compareRows(
  field: FieldDef,
  a: Record<ID, CellValue>,
  b: Record<ID, CellValue>,
  dir: 1 | -1,
  compare: (f: FieldDef, x: Record<ID, CellValue>, y: Record<ID, CellValue>) => number,
): number {
  const blank = (v: CellValue) => v === undefined || v === '' || v === null;
  const ab = blank(a[field.id]);
  const bb = blank(b[field.id]);
  if (ab !== bb) return ab ? 1 : -1;
  if (ab && bb) return 0;
  return compare(field, a, b) * dir;
}
