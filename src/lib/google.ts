/**
 * Google Calendar, straight from the browser.
 *
 * Two facts make this possible with no server of our own:
 *  1. Google Identity Services hands an access token to a web page directly
 *     (the "token model"), so there's no code exchange to do on a backend.
 *  2. The Calendar API v3 sends CORS headers, including for writes, so the
 *     page can call it itself.
 *
 * The cost of having no backend is that there's no refresh token: the access
 * token lasts about an hour and then has to be asked for again. Google will
 * usually grant it silently while you're still signed in, which is why
 * `ensureToken` tries quietly first and only shows a popup as a last resort.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const API = 'https://www.googleapis.com/calendar/v3';

/**
 * `calendar.events` covers reading and writing events; `calendar.readonly` is
 * what listing your calendars requires. Nothing here can delete a calendar.
 */
export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

/* ------------------------------------------------------------------ */
/* the bits of Google Identity Services we use                         */
/* ------------------------------------------------------------------ */

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (opts?: { prompt?: '' | 'none' | 'consent' | 'select_account' }) => void;
}

interface GsiOAuth2 {
  initTokenClient: (opts: {
    client_id: string;
    scope: string;
    prompt?: string;
    callback: (r: TokenResponse) => void;
    error_callback?: (e: { type?: string; message?: string }) => void;
  }) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
  hasGrantedAllScopes?: (r: TokenResponse, ...scopes: string[]) => boolean;
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GsiOAuth2 } };
  }
}

let scriptPromise: Promise<GsiOAuth2> | null = null;

function loadGis(): Promise<GsiOAuth2> {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google.accounts.oauth2);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<GsiOAuth2>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const el = existing ?? document.createElement('script');
    const onLoad = () => {
      const api = window.google?.accounts?.oauth2;
      if (api) resolve(api);
      else reject(new Error("Google's sign-in script loaded but looks wrong."));
    };
    el.addEventListener('load', onLoad, { once: true });
    el.addEventListener(
      'error',
      () => {
        scriptPromise = null;
        reject(new Error("Couldn't reach Google's sign-in script. Offline, or blocked by an extension?"));
      },
      { once: true },
    );
    if (!existing) {
      el.src = GIS_SRC;
      el.async = true;
      el.defer = true;
      document.head.appendChild(el);
    } else if (window.google?.accounts?.oauth2) {
      onLoad();
    }
  });
  return scriptPromise;
}

/* ------------------------------------------------------------------ */
/* token handling — deliberately memory-only                           */
/* ------------------------------------------------------------------ */

/**
 * The access token is never written to localStorage. It lives for an hour and
 * a stored copy would be a standing liability for no real benefit — Google
 * re-issues it silently anyway.
 */
let token: { value: string; expiresAt: number } | null = null;
let client: TokenClient | null = null;
let clientIdInUse = '';
let inflight: Promise<string> | null = null;

export function tokenState() {
  if (!token) return { signedIn: false as const, expiresIn: 0 };
  const expiresIn = Math.max(0, token.expiresAt - Date.now());
  return { signedIn: expiresIn > 0, expiresIn };
}

export function forgetToken() {
  token = null;
}

export class GoogleAuthError extends Error {
  needsConsent: boolean;
  constructor(message: string, needsConsent = false) {
    super(message);
    this.name = 'GoogleAuthError';
    this.needsConsent = needsConsent;
  }
}

function friendlyAuthError(code: string | undefined, detail?: string): GoogleAuthError {
  switch (code) {
    case 'popup_closed':
    case 'popup_closed_by_user':
      return new GoogleAuthError('Sign-in window closed before finishing.', true);
    case 'popup_failed_to_open':
      return new GoogleAuthError(
        'The browser blocked the sign-in popup. Allow popups for this site and try again.',
        true,
      );
    case 'access_denied':
      /**
       * Overwhelmingly this is not the person refusing — it's Google blocking a
       * consent screen still in Testing whose test-user list doesn't include
       * the account signing in. Say so, because "access denied" sends people
       * hunting in the wrong place.
       */
      return new GoogleAuthError(
        'Google blocked the sign-in. If it said “has not completed the Google verification process”, ' +
          'add this exact Google address to Test users under OAuth consent screen › Audience, then retry.',
        true,
      );
    case 'idpiframe_initialization_failed':
      return new GoogleAuthError('Google refused to start. Check the client ID and its allowed origins.', true);
    default:
      return new GoogleAuthError(detail || 'Google sign-in failed.', true);
  }
}

/** Whoever is currently waiting on the GIS callback. */
let waiting: { ok: (t: string) => void; no: (e: Error) => void } | null = null;

function resolveWaiting(t: string) {
  const w = waiting;
  waiting = null;
  w?.ok(t);
}

function rejectWaiting(e: Error) {
  const w = waiting;
  waiting = null;
  w?.no(e);
}

function getClient(oauth2: GsiOAuth2, clientId: string): TokenClient {
  if (client && clientIdInUse === clientId) return client;
  clientIdInUse = clientId;
  client = oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (r) => {
      if (r.error || !r.access_token) {
        rejectWaiting(friendlyAuthError(r.error, r.error_description));
        return;
      }
      token = {
        value: r.access_token,
        // shave a minute off so a request never starts on a dying token
        expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000 - 60_000,
      };
      resolveWaiting(r.access_token);
    },
    error_callback: (e) => rejectWaiting(friendlyAuthError(e.type, e.message)),
  });
  return client;
}

async function requestToken(clientId: string, interactive: boolean): Promise<string> {
  const oauth2 = await loadGis();
  const tokenClient = getClient(oauth2, clientId);

  return new Promise<string>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (!waiting) return;
      waiting = null;
      reject(
        new GoogleAuthError(
          interactive
            ? 'Google never answered. Try again.'
            : 'Google needs you to approve calendar access again.',
          true,
        ),
      );
    }, interactive ? 120_000 : 8_000);

    waiting = {
      ok: (t) => { window.clearTimeout(timer); resolve(t); },
      no: (e) => { window.clearTimeout(timer); reject(e); },
    };

    // '' shows a screen only if consent is actually missing; 'none' never does
    tokenClient.requestAccessToken({ prompt: interactive ? '' : 'none' });
  });
}

/**
 * Get a usable token. Tries the cache, then a silent grant, then — only if
 * `interactive` — a popup. Concurrent callers share one request.
 */
export async function ensureToken(clientId: string, interactive = false): Promise<string> {
  if (!clientId) throw new GoogleAuthError('No Google client ID set yet.', true);
  const state = tokenState();
  if (state.signedIn && token) return token.value;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      return await requestToken(clientId, false);
    } catch (silentError) {
      if (!interactive) throw silentError;
      return requestToken(clientId, true);
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export async function signIn(clientId: string): Promise<string> {
  forgetToken();
  return requestToken(clientId, true);
}

export async function signOut() {
  const current = token?.value;
  forgetToken();
  client = null;
  clientIdInUse = '';
  if (!current) return;
  try {
    const oauth2 = await loadGis();
    await new Promise<void>((resolve) => oauth2.revoke(current, resolve));
  } catch {
    // Revoking is a courtesy; the token expires within the hour regardless.
  }
}

/* ------------------------------------------------------------------ */
/* Calendar API                                                        */
/* ------------------------------------------------------------------ */

export class GoogleApiError extends Error {
  status: number;
  reason?: string;
  constructor(message: string, status: number, reason?: string) {
    super(message);
    this.name = 'GoogleApiError';
    this.status = status;
    this.reason = reason;
  }
}

interface CallOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  etag?: string;
}

async function call<T>(clientId: string, path: string, opts: CallOpts = {}): Promise<T> {
  const access = await ensureToken(clientId);
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${access}` };
  if (opts.body) headers['Content-Type'] = 'application/json';
  // refuse to overwrite a version we haven't seen
  if (opts.etag) headers['If-Match'] = opts.etag;

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  if (!res.ok) {
    let reason: string | undefined;
    let message = `Google returned ${res.status}`;
    try {
      const err = (await res.json()) as {
        error?: { message?: string; errors?: { reason?: string }[] };
      };
      reason = err.error?.errors?.[0]?.reason;
      if (err.error?.message) message = err.error.message;
    } catch {
      /* a non-JSON error body tells us nothing useful */
    }
    if (res.status === 401) {
      forgetToken();
      throw new GoogleApiError('Google access expired — reconnecting.', 401, reason);
    }
    throw new GoogleApiError(message, res.status, reason);
  }

  return (await res.json()) as T;
}

export interface GCalListEntry {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  backgroundColor?: string;
  selected?: boolean;
}

export interface GEvent {
  id: string;
  etag?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  recurringEventId?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  attendees?: { email?: string; displayName?: string; self?: boolean }[];
  conferenceData?: { entryPoints?: { uri?: string; entryPointType?: string }[] };
}

export async function listCalendars(clientId: string): Promise<GCalListEntry[]> {
  const res = await call<{ items?: GCalListEntry[] }>(clientId, '/users/me/calendarList', {
    query: { minAccessRole: 'reader', maxResults: 250 },
  });
  return (res.items ?? []).sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1;
    return (a.summary ?? '').localeCompare(b.summary ?? '');
  });
}

export async function whoAmI(clientId: string): Promise<string | undefined> {
  // The primary calendar's id is the account's email address.
  try {
    const cal = await call<{ id?: string }>(clientId, '/calendars/primary');
    return cal.id;
  } catch {
    return undefined;
  }
}

export interface EventPage {
  events: GEvent[];
  nextSyncToken?: string;
  /** true when Google threw our cursor away and everything must be re-read */
  expired?: boolean;
}

/**
 * Read a calendar. With a syncToken this returns only what changed since last
 * time, deletions included (`status: 'cancelled'`), which is the whole reason
 * to bother with tokens. Google requires every other parameter to stay
 * identical between syncs, so `timeMin` is stored per link and never moved.
 */
export async function listEvents(
  clientId: string,
  calendarId: string,
  opts: { syncToken?: string; timeMin?: string },
): Promise<EventPage> {
  const events: GEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;

  for (let page = 0; page < 40; page++) {
    let res: { items?: GEvent[]; nextPageToken?: string; nextSyncToken?: string };
    try {
      res = await call(clientId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
        query: {
          singleEvents: true,
          showDeleted: Boolean(opts.syncToken),
          maxResults: 250,
          pageToken,
          ...(opts.syncToken
            ? { syncToken: opts.syncToken }
            : { timeMin: opts.timeMin, orderBy: 'startTime' }),
        },
      });
    } catch (e) {
      // 410 GONE means the cursor is too old to be useful any more.
      if (e instanceof GoogleApiError && e.status === 410) return { events: [], expired: true };
      throw e;
    }
    events.push(...(res.items ?? []));
    nextSyncToken = res.nextSyncToken ?? nextSyncToken;
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }

  return { events, nextSyncToken };
}

export function insertEvent(clientId: string, calendarId: string, body: Partial<GEvent>) {
  return call<GEvent>(clientId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body,
  });
}

export function patchEvent(
  clientId: string,
  calendarId: string,
  eventId: string,
  body: Partial<GEvent>,
  etag?: string,
) {
  return call<GEvent>(
    clientId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', body, etag },
  );
}

export async function deleteEvent(clientId: string, calendarId: string, eventId: string) {
  try {
    await call<void>(
      clientId,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: 'DELETE' },
    );
  } catch (e) {
    // Already gone from Google is a success as far as we're concerned.
    if (e instanceof GoogleApiError && (e.status === 404 || e.status === 410)) return;
    throw e;
  }
}
