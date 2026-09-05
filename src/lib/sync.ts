/**
 * Two-way sync between Nook events and Google Calendar.
 *
 * The rules it follows, in order:
 *
 *  1. **Google wins conflicts.** If both sides changed the same event, the
 *     remote version stands and the local edit is dropped with a message. Your
 *     calendar is shared with other people; your planner isn't.
 *  2. **Never invent, never duplicate.** An event carries the Google id it came
 *     from, so a pulled event is updated in place rather than added again.
 *  3. **Deletes need gravestones.** Deleting locally removes the record, so the
 *     id is parked in `pendingDeletes` until Google confirms — and if an undo
 *     brings the event back, the gravestone is quietly dropped.
 *  4. **Pulls are not undoable.** Remote changes go in through `quiet()`, so
 *     ⌘Z never fights the network.
 */
import type { CalendarLink, EventItem, ID, Widget } from './types';
import {
  GoogleApiError, GoogleAuthError, deleteEvent, insertEvent, listEvents, patchEvent,
} from './google';
import { fieldsFromGoogle, toGoogleBody } from './gcal-map';
import { uid } from './id';
import { useDoc, useUI } from './store';

/* ------------------------------------------------------------------ */
/* the sync run                                                        */
/* ------------------------------------------------------------------ */

export interface SyncReport {
  pulled: number;
  updated: number;
  removed: number;
  pushed: number;
  conflicts: number;
  errors: string[];
}

let running: Promise<SyncReport> | null = null;

export function isSyncing() {
  return running !== null;
}

/** One sync pass over every linked calendar. Safe to call repeatedly. */
export function syncNow(opts: { interactive?: boolean } = {}): Promise<SyncReport> {
  if (running) return running;
  running = run(opts).finally(() => { running = null; });
  return running;
}

async function run({ interactive = false }): Promise<SyncReport> {
  const report: SyncReport = { pulled: 0, updated: 0, removed: 0, pushed: 0, conflicts: 0, errors: [] };
  const doc = () => useDoc.getState().doc;
  const { quiet } = useDoc.getState();
  const clientId = doc().google.clientId;

  if (!clientId) {
    report.errors.push('No Google client ID set yet.');
    return report;
  }
  if (!doc().google.links.length) return report;

  // Ask for a token once, up front, so a popup can't appear mid-way.
  try {
    const { ensureToken } = await import('./google');
    await ensureToken(clientId, interactive);
  } catch (e) {
    report.errors.push(e instanceof Error ? e.message : 'Google sign-in failed.');
    quiet((d) => { d.google.lastError = report.errors[0]; });
    return report;
  }

  for (const link of [...doc().google.links]) {
    // the widget may have been deleted since the link was made
    const widget = doc().widgets.find((w) => w.id === link.widgetId);
    if (!widget) {
      report.errors.push(`“${link.summary}” has no widget to live in — relink it.`);
      continue;
    }
    try {
      await pullOne(link, widget, report);
      if (link.writeBack && !link.readOnly) await pushOne(link, report);
    } catch (e) {
      if (e instanceof GoogleAuthError) {
        report.errors.push(e.message);
        break; // no point trying the rest without a token
      }
      report.errors.push(
        `${link.summary}: ${e instanceof Error ? e.message : 'something went wrong'}`,
      );
    }
  }

  await flushDeletes(clientId, report);

  quiet((d) => {
    d.google.lastSyncedAt = new Date().toISOString();
    d.google.lastError = report.errors[0];
  });
  return report;
}

/* ---------------- pull ---------------- */

async function pullOne(link: CalendarLink, widget: Widget, report: SyncReport) {
  const { quiet } = useDoc.getState();
  const clientId = useDoc.getState().doc.google.clientId;

  let page = await listEvents(clientId, link.calendarId, {
    syncToken: link.syncToken,
    timeMin: link.timeMin,
  });

  // Google discarded our cursor — start the calendar over from scratch.
  if (page.expired) {
    quiet((d) => {
      const l = d.google.links.find((x) => x.calendarId === link.calendarId);
      if (l) l.syncToken = undefined;
    });
    page = await listEvents(clientId, link.calendarId, { timeMin: link.timeMin });
  }

  quiet((d) => {
    const byGoogleId = new Map<string, EventItem>();
    for (const e of d.events) {
      if (e.google?.calendarId === link.calendarId) byGoogleId.set(e.google.eventId, e);
    }

    for (const g of page.events) {
      const existing = byGoogleId.get(g.id);

      if (g.status === 'cancelled') {
        if (existing) {
          d.events = d.events.filter((e) => e.id !== existing.id);
          report.removed += 1;
        }
        continue;
      }

      const fields = fieldsFromGoogle(g, link);

      if (!existing) {
        d.events.push({
          id: uid(),
          widgetId: link.widgetId,
          sectorId: widget.sectorId,
          ...fields,
        });
        report.pulled += 1;
        continue;
      }

      if (existing.pendingPush) report.conflicts += 1; // Google wins, see rule 1
      Object.assign(existing, fields, {
        // a local move between widgets is a local decision; keep it
        widgetId: existing.widgetId,
        sectorId: existing.sectorId,
      });
      report.updated += 1;
    }

    const l = d.google.links.find((x) => x.calendarId === link.calendarId);
    if (l) {
      if (page.nextSyncToken) l.syncToken = page.nextSyncToken;
      l.lastSyncedAt = new Date().toISOString();
    }
  });
}

/* ---------------- push ---------------- */

async function pushOne(link: CalendarLink, report: SyncReport) {
  const clientId = useDoc.getState().doc.google.clientId;
  const { quiet } = useDoc.getState();

  const outgoing = useDoc
    .getState()
    .doc.events.filter(
      (e) =>
        e.widgetId === link.widgetId &&
        // brand new here, or edited here since the last sync
        (!e.google ? true : e.pendingPush === true) &&
        // don't push a yearly milestone as a one-off
        !e.yearly,
    );

  for (const e of outgoing) {
    const body = toGoogleBody(e);
    try {
      if (!e.google) {
        const created = await insertEvent(clientId, link.calendarId, body);
        quiet((d) => {
          const local = d.events.find((x) => x.id === e.id);
          if (!local) return;
          local.google = {
            calendarId: link.calendarId,
            eventId: created.id,
            etag: created.etag,
            htmlLink: created.htmlLink,
          };
          local.pendingPush = false;
        });
        report.pushed += 1;
      } else {
        const saved = await patchEvent(
          clientId,
          e.google.calendarId,
          e.google.eventId,
          body,
          e.google.etag,
        );
        quiet((d) => {
          const local = d.events.find((x) => x.id === e.id);
          if (!local?.google) return;
          local.google.etag = saved.etag;
          local.pendingPush = false;
        });
        report.pushed += 1;
      }
    } catch (err) {
      if (err instanceof GoogleApiError) {
        // 412: the remote copy moved under us. Rule 1 — let Google's stand.
        if (err.status === 412) {
          report.conflicts += 1;
          quiet((d) => {
            const local = d.events.find((x) => x.id === e.id);
            if (local?.google) { local.pendingPush = false; local.google.etag = undefined; }
          });
          continue;
        }
        // The event is gone up there; drop our link so it isn't retried forever.
        if (err.status === 404 || err.status === 410) {
          quiet((d) => {
            const local = d.events.find((x) => x.id === e.id);
            if (local) { local.google = undefined; local.pendingPush = false; }
          });
          continue;
        }
        if (err.status === 403) {
          report.errors.push(`No permission to write to “${link.summary}”.`);
          quiet((d) => {
            const l = d.google.links.find((x) => x.calendarId === link.calendarId);
            if (l) l.readOnly = true;
          });
          return;
        }
      }
      throw err;
    }
  }
}

/* ---------------- deletes ---------------- */

async function flushDeletes(clientId: string, report: SyncReport) {
  const { quiet } = useDoc.getState();
  const stones = [...useDoc.getState().doc.google.pendingDeletes];
  if (!stones.length) return;

  for (const stone of stones) {
    // An undo may have brought the event back — then the gravestone is wrong.
    const revived = useDoc
      .getState()
      .doc.events.some(
        (e) => e.google?.eventId === stone.eventId && e.google.calendarId === stone.calendarId,
      );
    if (revived) {
      quiet((d) => {
        d.google.pendingDeletes = d.google.pendingDeletes.filter(
          (s) => !(s.eventId === stone.eventId && s.calendarId === stone.calendarId),
        );
      });
      continue;
    }

    try {
      await deleteEvent(clientId, stone.calendarId, stone.eventId);
      quiet((d) => {
        d.google.pendingDeletes = d.google.pendingDeletes.filter(
          (s) => !(s.eventId === stone.eventId && s.calendarId === stone.calendarId),
        );
      });
      report.removed += 1;
    } catch (e) {
      report.errors.push(
        `Couldn't remove one event from Google: ${e instanceof Error ? e.message : 'unknown'}`,
      );
      break; // leave the rest parked for the next run
    }
  }
}

/* ------------------------------------------------------------------ */
/* wording                                                            */
/* ------------------------------------------------------------------ */

export function describeReport(r: SyncReport): string {
  const bits: string[] = [];
  if (r.pulled) bits.push(`${r.pulled} new`);
  if (r.updated) bits.push(`${r.updated} updated`);
  if (r.pushed) bits.push(`${r.pushed} sent up`);
  if (r.removed) bits.push(`${r.removed} removed`);
  if (!bits.length) return 'Already up to date.';
  let msg = `Synced — ${bits.join(', ')}.`;
  if (r.conflicts) {
    msg += ` ${r.conflicts} ${r.conflicts === 1 ? 'event had' : 'events had'} newer changes in Google, so those won.`;
  }
  return msg;
}

/** Mark a local event as needing to go up. Called from the store on edit. */
export function markForPush(events: EventItem[], id: ID) {
  const e = events.find((x) => x.id === id);
  if (e?.google) e.pendingPush = true;
}

export function toastReport(r: SyncReport) {
  const { toast } = useUI.getState();
  if (r.errors.length) toast(r.errors[0], 'warn');
  else toast(describeReport(r));
}
