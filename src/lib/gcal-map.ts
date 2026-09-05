/**
 * Turning a Google event into a Nook event and back.
 *
 * Kept apart from the sync engine on purpose: there's no store, no network and
 * no browser in here, which is what makes the fiddly parts — all-day events,
 * exclusive end dates, timezones — cheap to test.
 */
import type { CalendarLink, DateStr, EventItem } from './types';
import type { GEvent } from './google';
import { toDateStr } from './dates';

/** Google gives all-day events a plain `date` and timed ones a `dateTime`. */
export function readWhen(slot?: GEvent['start']): { date?: DateStr; time?: string } {
  if (!slot) return {};
  if (slot.date) return { date: slot.date };
  if (slot.dateTime) {
    const d = new Date(slot.dateTime);
    if (Number.isNaN(d.getTime())) return {};
    return {
      date: toDateStr(d),
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    };
  }
  return {};
}

function meetingLink(g: GEvent): string | undefined {
  if (g.hangoutLink) return g.hangoutLink;
  const entry = g.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  if (entry?.uri) return entry.uri;
  // a bare URL sitting in the description is usually the joining link
  const found = g.description?.match(/https?:\/\/[^\s<>"]+/);
  return found?.[0];
}

function attendeeNames(g: GEvent): string | undefined {
  const others = (g.attendees ?? []).filter((a) => !a.self);
  if (!others.length) return undefined;
  const names = others.map((a) => a.displayName || a.email || '').filter(Boolean);
  return names.length > 4 ? `${names.slice(0, 4).join(', ')} +${names.length - 4}` : names.join(', ');
}

/** Everything Google is allowed to overwrite on a local event. */
export function fieldsFromGoogle(g: GEvent, link: CalendarLink) {
  const start = readWhen(g.start);
  const end = readWhen(g.end);
  return {
    title: g.summary?.trim() || '(no title)',
    date: start.date ?? toDateStr(new Date()),
    time: start.time,
    endTime: end.time,
    location: g.location,
    link: meetingLink(g),
    people: attendeeNames(g),
    notes: g.description?.slice(0, 2000),
    kind: (attendeeNames(g) ? 'meeting' : 'event') as EventItem['kind'],
    yearly: false,
    seriesId: g.recurringEventId,
    google: {
      calendarId: link.calendarId,
      eventId: g.id,
      etag: g.etag,
      htmlLink: g.htmlLink,
    },
    pendingPush: false,
  };
}

/** The other direction: what we send up. */
export function toGoogleBody(e: EventItem): Partial<GEvent> {
  const body: Partial<GEvent> = {
    summary: e.title,
    location: e.location || undefined,
    description: e.notes || undefined,
  };
  if (e.time) {
    const startIso = new Date(`${e.date}T${e.time}:00`);
    const endIso = e.endTime
      ? new Date(`${e.date}T${e.endTime}:00`)
      : new Date(startIso.getTime() + 60 * 60 * 1000);
    // if someone typed an end before the start, give it an hour instead
    const safeEnd = endIso > startIso ? endIso : new Date(startIso.getTime() + 60 * 60 * 1000);
    body.start = { dateTime: startIso.toISOString() };
    body.end = { dateTime: safeEnd.toISOString() };
  } else {
    // all-day: Google treats `end.date` as exclusive, so it's the next day
    const next = new Date(`${e.date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    body.start = { date: e.date };
    body.end = { date: toDateStr(next) };
  }
  return body;
}

