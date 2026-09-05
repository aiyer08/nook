/**
 * Moving a widget to another tab.
 *
 * The catch is that a widget is never just a card: a to-do list owns tasks, a
 * meetings widget owns events, an application tracker owns rows — and every
 * one of those records carries its own `sectorId` so the Today view can say
 * which part of your life a deadline belongs to. Move the card and leave those
 * behind and you get tasks filed under a tab they're no longer on.
 *
 * So this is one function, listing everything that travels, rather than a
 * `sectorId = x` at the call site. If a future record type gains a sectorId,
 * the test in test/logic.test.mjs starts failing until it's added here.
 */
import type { Doc, ID } from './types';

/** Where a moved widget should land on its new board. */
export interface Spot {
  x: number;
  y: number;
}

/**
 * Reassign a widget and its contents. Mutates the document it's given — it's
 * written for the store's `commit`, which hands out a draft to change.
 *
 * Returns false when there's nothing to do, so the caller can skip pushing an
 * undo step for a move that didn't happen.
 */
export function moveWidgetTo(d: Doc, widgetId: ID, toSectorId: ID, spot: Spot): boolean {
  const widget = d.widgets.find((w) => w.id === widgetId);
  if (!widget) return false;
  if (widget.sectorId === toSectorId) return false;
  if (!d.sectors.some((s) => s.id === toSectorId)) return false;

  widget.sectorId = toSectorId;
  widget.x = spot.x;
  widget.y = spot.y;
  // on top of whatever is already there, so it isn't hidden under a card
  widget.z = d.widgets
    .filter((w) => w.sectorId === toSectorId && w.id !== widgetId)
    .reduce((top, w) => Math.max(top, w.z), 0) + 1;

  /*
    Everything filed inside it comes along. A widget-level accent is left
    alone deliberately: a card you'd recoloured by hand keeps its colour, and
    one that was matching its tab (accent undefined) picks up the new tab's.
  */
  for (const t of d.tasks) if (t.widgetId === widgetId) t.sectorId = toSectorId;
  for (const e of d.events) if (e.widgetId === widgetId) e.sectorId = toSectorId;
  for (const g of d.goals) if (g.widgetId === widgetId) g.sectorId = toSectorId;
  for (const c of d.contacts) if (c.widgetId === widgetId) c.sectorId = toSectorId;
  for (const i of d.items) if (i.widgetId === widgetId) i.sectorId = toSectorId;
  // classes belong to a notebook widget; their lectures hang off the class,
  // so they need no sector of their own and come along for free
  for (const c of d.classes ?? []) if (c.widgetId === widgetId) c.sectorId = toSectorId;
  // a synced calendar keeps syncing, into the same widget on its new tab
  for (const l of d.google.links) if (l.widgetId === widgetId) l.sectorId = toSectorId;

  return true;
}

/**
 * The records that would travel with a widget, counted. Used for the wording
 * on the confirmation toast, and to prove in a test that nothing is left
 * behind.
 */
export function travellingWith(d: Doc, widgetId: ID): number {
  const mine = (x: { widgetId: ID }) => x.widgetId === widgetId;
  return d.tasks.filter(mine).length
    + d.events.filter(mine).length
    + d.goals.filter(mine).length
    + d.contacts.filter(mine).length
    + d.items.filter(mine).length
    + (d.classes ?? []).filter(mine).length;
}

/**
 * Everything filed inside a set of widgets, removed.
 *
 * Deleting a widget and deleting a tab had their own copies of this list, and
 * a new record type — classes — was added to one and missed by both. One list,
 * used by both, is the only version of this that stays correct.
 *
 * Lectures are keyed to a class rather than a widget, so they go when their
 * class does; an orphaned lecture would be unreachable *and* would keep its
 * handouts alive in the file store.
 */
export function dropWidgetContents(d: Doc, widgetIds: Set<ID>): void {
  const mine = (x: { widgetId: ID }) => widgetIds.has(x.widgetId);

  d.tasks = d.tasks.filter((t) => !mine(t));
  d.events = d.events.filter((e) => !mine(e));
  d.goals = d.goals.filter((g) => !mine(g));
  d.contacts = d.contacts.filter((c) => !mine(c));
  d.items = d.items.filter((i) => !mine(i));
  // local only: Google keeps its own events, we just stop syncing them here
  d.google.links = d.google.links.filter((l) => !widgetIds.has(l.widgetId));

  const goneClasses = new Set((d.classes ?? []).filter(mine).map((c) => c.id));
  d.classes = (d.classes ?? []).filter((c) => !mine(c));
  d.lectures = (d.lectures ?? []).filter((l) => !goneClasses.has(l.classId));
}
