import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Panel, Field, Row, Toggle, Empty } from './ui';
import { Icon } from './Icons';
import { useDoc, useUI, sortedSectors, WIDGET_DEFAULTS } from '../lib/store';
import type { CalendarLink } from '../lib/types';
import {
  listCalendars, signIn, signOut, whoAmI, tokenState,
  type GCalListEntry,
} from '../lib/google';
import { describeReport, isSyncing, syncNow } from '../lib/sync';
import { addDays, today } from '../lib/dates';

/** How far back the first sync reaches. Fixed per link once chosen. */
const LOOKBACK_DAYS = 60;

function relativeTime(iso?: string): string {
  if (!iso) return 'never';
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 45) return 'just now';
  if (secs < 5400) return `${Math.round(secs / 60)} min ago`;
  if (secs < 86400 * 2) return `${Math.round(secs / 3600)} h ago`;
  return `${Math.round(secs / 86400)} days ago`;
}

export function CalendarSyncPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const google = useDoc((s) => s.doc.google);
  const allSectors = useDoc((s) => s.doc.sectors);
  const widgets = useDoc((s) => s.doc.widgets);
  const setClientId = useDoc((s) => s.setGoogleClientId);
  const setAccount = useDoc((s) => s.setGoogleAccount);
  const linkCalendar = useDoc((s) => s.linkCalendar);
  const updateLink = useDoc((s) => s.updateLink);
  const unlinkCalendar = useDoc((s) => s.unlinkCalendar);
  const disconnectGoogle = useDoc((s) => s.disconnectGoogle);
  const setAutoSync = useDoc((s) => s.setAutoSync);
  const addWidget = useDoc((s) => s.addWidget);
  const toast = useUI((s) => s.toast);

  const [draftId, setDraftId] = useState(google.clientId);
  const [calendars, setCalendars] = useState<GCalListEntry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(isSyncing());
  const [showSteps, setShowSteps] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const sectors = useMemo(() => sortedSectors(allSectors), [allSectors]);
  const connected = Boolean(google.email);

  useEffect(() => { setDraftId(google.clientId); }, [google.clientId]);

  const connect = async () => {
    const id = draftId.trim();
    if (!id) { toast('Paste your Google client ID first.', 'warn'); return; }
    setBusy('connect');
    try {
      if (id !== google.clientId) setClientId(id);
      await signIn(id);
      const [email, list] = await Promise.all([whoAmI(id), listCalendars(id)]);
      setAccount(email);
      setCalendars(list);
      toast(email ? `Connected as ${email}.` : 'Connected to Google.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Google sign-in failed.', 'warn');
    } finally {
      setBusy(null);
    }
  };

  const loadCalendars = async () => {
    setBusy('list');
    try {
      setCalendars(await listCalendars(google.clientId));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't read your calendar list.", 'warn');
    } finally {
      setBusy(null);
    }
  };

  const doSync = async (interactive = true) => {
    setSyncing(true);
    try {
      const report = await syncNow({ interactive });
      if (report.errors.length) toast(report.errors[0], 'warn');
      else toast(describeReport(report));
    } finally {
      setSyncing(false);
    }
  };

  const attach = (cal: GCalListEntry) => {
    const sector = sectors[0];
    if (!sector) { toast('Make a tab first — calendars need somewhere to live.', 'warn'); return; }
    // reuse an empty calendar widget on that tab, or make one
    const existing = widgets.find(
      (w) => w.sectorId === sector.id && w.type === 'calendar' &&
        !google.links.some((l) => l.widgetId === w.id),
    );
    const widgetId = existing?.id ?? addWidget(sector.id, 'calendar');
    const link: CalendarLink = {
      calendarId: cal.id,
      summary: cal.summary || cal.id,
      color: cal.backgroundColor,
      sectorId: sector.id,
      widgetId,
      timeMin: new Date(`${addDays(today(), -LOOKBACK_DAYS)}T00:00:00`).toISOString(),
      writeBack: cal.accessRole === 'owner' || cal.accessRole === 'writer',
      readOnly: !(cal.accessRole === 'owner' || cal.accessRole === 'writer'),
    };
    linkCalendar(link);
    toast(`“${link.summary}” will land in ${sector.name}. Syncing…`);
    void doSync(false);
  };

  const unlinked = (calendars ?? []).filter(
    (c) => !google.links.some((l) => l.calendarId === c.id),
  );

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Calendar sync"
      subtitle="Two-way, with Google."
      width={520}
    >
      {/* ---------- step 1: the client id ---------- */}
      {!connected && (
        <>
          <div
            style={{
              padding: 14, borderRadius: 'var(--r)', border: '3px solid var(--line)',
              background: 'var(--surface)', marginBottom: 16,
            }}
          >
            <p className="hand" style={{ margin: '0 0 6px', fontSize: 21 }}>
              One-time setup, about ten minutes.
            </p>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
              Nook talks to Google straight from your browser — there's no server in the middle
              and nobody else sees your calendar. For that to work Google needs to know this app
              exists, which means making a free <b>OAuth client ID</b> in your own Google account.
            </p>
            <button
              className="btn tiny"
              style={{ marginTop: 10 }}
              onClick={() => setShowSteps((v) => !v)}
              aria-expanded={showSteps}
            >
              <Icon name={showSteps ? 'chevronUp' : 'chevronDown'} size={13} />
              {showSteps ? 'Hide the steps' : 'Show me the steps'}
            </button>

            {showSteps && <Steps />}
          </div>

          <Field
            label="Your OAuth client ID"
            hint="Ends in .apps.googleusercontent.com. It's a public identifier, not a password."
          >
            <input
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              placeholder="1234567890-abc123.apps.googleusercontent.com"
              spellCheck={false}
              autoComplete="off"
              style={{ width: '100%', fontSize: 12.5 }}
            />
          </Field>

          <button
            className="btn primary"
            onClick={() => void connect()}
            disabled={busy === 'connect' || !draftId.trim()}
          >
            <Icon name="calendar" size={16} />
            {busy === 'connect' ? 'Waiting for Google…' : 'Connect Google Calendar'}
          </button>

          {google.lastError && (
            <p style={{ marginTop: 12, fontSize: 12.5, color: '#B4544A' }}>{google.lastError}</p>
          )}
        </>
      )}

      {/* ---------- connected ---------- */}
      {connected && (
        <>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12,
              borderRadius: 'var(--r)', border: '3px solid var(--line)',
              background: 'var(--accent-tint)', marginBottom: 14,
            }}
          >
            <span
              style={{
                width: 38, height: 38, borderRadius: 13, flexShrink: 0, display: 'grid',
                placeItems: 'center', background: 'var(--accent)', border: '2px solid var(--line)',
                color: 'var(--on-accent, var(--ink))',
              }}
            >
              <Icon name="calendar" size={19} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {google.email}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                Last sync {relativeTime(google.lastSyncedAt)}
                {google.pendingDeletes.length > 0 && ` · ${google.pendingDeletes.length} waiting to remove`}
              </div>
            </div>
            <button className="btn tiny primary" onClick={() => void doSync(true)} disabled={syncing}>
              <motion.span
                animate={syncing ? { rotate: 360 } : { rotate: 0 }}
                transition={syncing ? { duration: 1.1, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}
                style={{ display: 'grid' }}
              >
                <Icon name="repeat" size={14} />
              </motion.span>
              {syncing ? 'Syncing' : 'Sync now'}
            </button>
          </div>

          {google.lastError && (
            <p
              style={{
                margin: '0 0 12px', fontSize: 12.5, color: '#B4544A', padding: '8px 10px',
                border: '2px solid #B4544A44', borderRadius: 12, background: '#B4544A11',
              }}
            >
              {google.lastError}
            </p>
          )}

          <Toggle
            on={google.autoSync}
            onChange={setAutoSync}
            label="Keep in sync while Nook is open"
            hint="Checks Google when you open the app and every few minutes after."
          />

          {/* linked calendars */}
          <Field label={`Synced calendars · ${google.links.length}`}>
            {google.links.length === 0 && (
              <Empty icon="calendar">Nothing linked yet — pick one below.</Empty>
            )}
            {google.links.map((link) => {
              const widget = widgets.find((w) => w.id === link.widgetId);
              const sector = sectors.find((s) => s.id === widget?.sectorId);
              const options = widgets.filter((w) =>
                ['calendar', 'meetings', 'dates'].includes(w.type),
              );
              return (
                <div
                  key={link.calendarId}
                  style={{
                    border: '3px solid var(--line)', borderRadius: 'var(--r)', padding: 11,
                    marginBottom: 10, background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
                    <span
                      style={{
                        width: 14, height: 14, borderRadius: 5, flexShrink: 0,
                        background: link.color ?? 'var(--accent)', border: '2px solid var(--line)',
                      }}
                    />
                    <span
                      style={{
                        flex: 1, fontWeight: 700, fontSize: 13.5, minWidth: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                      title={link.calendarId}
                    >
                      {link.summary}
                    </span>
                    {link.readOnly && (
                      <span className="chip" style={{ padding: '2px 8px', fontSize: 11 }}>
                        <Icon name="lock" size={11} /> read-only
                      </span>
                    )}
                  </div>

                  <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: 'var(--ink-soft)', fontWeight: 700 }}>Lands in</span>
                    <select
                      value={link.widgetId}
                      onChange={(e) => {
                        const w = widgets.find((x) => x.id === e.target.value);
                        if (w) updateLink(link.calendarId, { widgetId: w.id, sectorId: w.sectorId });
                      }}
                      style={{ width: '100%', marginTop: 4, fontSize: 12.5, padding: '6px 9px' }}
                    >
                      {options.map((w) => {
                        const s = sectors.find((x) => x.id === w.sectorId);
                        return (
                          <option key={w.id} value={w.id}>
                            {s?.name ?? '—'} › {w.title} ({WIDGET_DEFAULTS[w.type].label})
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  <Row gap={6}>
                    <button
                      className={`btn tiny ${link.writeBack && !link.readOnly ? 'primary' : ''}`}
                      disabled={link.readOnly}
                      onClick={() => updateLink(link.calendarId, { writeBack: !link.writeBack })}
                      title={
                        link.readOnly
                          ? "Google says you can't write to this calendar"
                          : 'Send events you make here up to Google'
                      }
                    >
                      <Icon name="upload" size={12} />
                      {link.writeBack && !link.readOnly ? 'Two-way' : 'Read only'}
                    </button>
                    <button
                      className="btn tiny"
                      onClick={() => {
                        updateLink(link.calendarId, { syncToken: undefined });
                        toast('Next sync will re-read this calendar from scratch.');
                      }}
                      title="Forget the cursor and read everything again"
                    >
                      <Icon name="undo" size={12} /> Re-read
                    </button>
                    <span style={{ flex: 1 }} />
                    <button
                      className="btn ghost tiny"
                      style={{ color: '#B4544A' }}
                      onClick={() => {
                        unlinkCalendar(link.calendarId, { keepEvents: true });
                        toast(`Unlinked “${link.summary}”. Its events stayed put.`);
                      }}
                    >
                      Unlink
                    </button>
                  </Row>
                  <p style={{ margin: '7px 0 0', fontSize: 11, color: 'var(--ink-faint)' }}>
                    {sector?.name ?? 'no tab'} · synced {relativeTime(link.lastSyncedAt)}
                    {link.syncToken ? '' : ' · full read next time'}
                  </p>
                </div>
              );
            })}
          </Field>

          {/* available calendars */}
          <Field label="Add a calendar">
            <Row>
              <button className="btn tiny" onClick={() => void loadCalendars()} disabled={busy === 'list'}>
                <Icon name="repeat" size={13} />
                {busy === 'list' ? 'Fetching…' : calendars ? 'Refresh list' : 'Show my calendars'}
              </button>
            </Row>
            {calendars && unlinked.length === 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 8 }}>
                Every calendar on this account is already linked.
              </p>
            )}
            {unlinked.map((cal) => (
              <button
                key={cal.id}
                onClick={() => attach(cal)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                  padding: '9px 11px', marginTop: 8, borderRadius: 'var(--r)',
                  border: '3px solid var(--line)', background: 'var(--surface)',
                }}
              >
                <span
                  style={{
                    width: 14, height: 14, borderRadius: 5, flexShrink: 0,
                    background: cal.backgroundColor ?? 'var(--accent)', border: '2px solid var(--line)',
                  }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cal.summary}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-faint)' }}>
                    {cal.primary ? 'your main calendar · ' : ''}
                    {cal.accessRole === 'owner' || cal.accessRole === 'writer' ? 'can write' : 'read only'}
                  </span>
                </span>
                <Icon name="plus" size={16} color="var(--ink-faint)" />
              </button>
            ))}
          </Field>

          <Field label="Connection">
            {confirmOff ? (
              <div style={{ display: 'grid', gap: 7 }}>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                  Disconnect and keep the events that came down, or clear them out of Nook too?
                  Either way <b>nothing is deleted from Google.</b>
                </p>
                <Row>
                  <button
                    className="btn tiny"
                    onClick={() => {
                      void signOut();
                      disconnectGoogle({ keepEvents: true });
                      setAccount(undefined);
                      setCalendars(null);
                      setConfirmOff(false);
                      toast('Disconnected. The events stayed.');
                    }}
                  >
                    Keep events
                  </button>
                  <button
                    className="btn tiny"
                    style={{ background: '#E8A598' }}
                    onClick={() => {
                      void signOut();
                      disconnectGoogle({ keepEvents: false });
                      setAccount(undefined);
                      setCalendars(null);
                      setConfirmOff(false);
                      toast('Disconnected and cleared from Nook. Google is untouched.');
                    }}
                  >
                    Clear them here
                  </button>
                  <button className="btn ghost tiny" onClick={() => setConfirmOff(false)}>
                    Never mind
                  </button>
                </Row>
              </div>
            ) : (
              <Row>
                <button className="btn ghost" style={{ color: '#B4544A' }} onClick={() => setConfirmOff(true)}>
                  <Icon name="close" size={15} /> Disconnect Google
                </button>
              </Row>
            )}
          </Field>

          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.6 }}>
            When the same event has changed in both places, <b>Google's version wins</b> and Nook
            tells you. Access lasts about an hour before Google is asked again — usually silently.
            {tokenState().signedIn ? '' : ' Right now the token has lapsed; the next sync will re-ask.'}
          </p>
        </>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* the setup walkthrough                                               */
/* ------------------------------------------------------------------ */

function Steps() {
  /**
   * Google matches origins exactly, so every address Nook is ever opened from
   * has to be listed — the dev server and the deployed copy both.
   */
  const origins = useMemo(() => {
    const deployed = import.meta.env?.VITE_PUBLIC_ORIGIN as string | undefined;
    return Array.from(
      new Set([window.location.origin, 'http://localhost:5173', deployed].filter(Boolean) as string[]),
    );
  }, []);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <ol style={{ margin: '12px 0 0', paddingLeft: 20, fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-soft)' }}>
      <li>
        Open{' '}
        <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">
          console.cloud.google.com
        </a>{' '}
        and make a new project. Call it anything — <i>Nook</i> is fine.
      </li>
      <li>
        In the search bar, find <b>Google Calendar API</b> and press <b>Enable</b>.
      </li>
      <li>
        Go to <b>APIs &amp; Services › OAuth consent screen</b>. Choose <b>External</b>, fill in an
        app name and your own email, and save.
      </li>
      <li>
        On the <b>Audience</b> tab, under <b>Test users</b>, press <b>Add users</b> and enter the
        exact Google address you'll <i>sign in with</i> — not necessarily the one that owns the
        project. <b>Don't skip this:</b> without it Google answers every sign-in with{' '}
        <i>“has not completed the Google verification process”</i> (error 403).
      </li>
      <li>
        Go to <b>Credentials › Create credentials › OAuth client ID</b>, and pick{' '}
        <b>Web application</b>.
      </li>
      <li>
        Under <b>Authorised JavaScript origins</b>, add these exactly (no trailing slash):
        <div style={{ display: 'grid', gap: 5, margin: '6px 0' }}>
          {origins.map((o) => (
            <div key={o} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <code
                style={{
                  flex: 1, fontSize: 11.5, padding: '4px 8px', borderRadius: 8,
                  border: '2px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {o}
              </code>
              <button className="btn tiny" onClick={() => void copy(o)}>
                {copied === o ? 'copied' : 'copy'}
              </button>
            </div>
          ))}
        </div>
        If you open Nook from anywhere else — a deployed copy on Vercel, another port — add
        those addresses here too, or sign-in will be refused there. Leave{' '}
        <b>Authorised redirect URIs</b> empty; this app never uses one.
      </li>
      <li>
        Press <b>Create</b> and copy the <b>Client ID</b> it shows you into the box below.
      </li>
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* background syncing                                                  */
/* ------------------------------------------------------------------ */

const EVERY = 5 * 60 * 1000;

/**
 * Keeps Google and Nook in step while the app is open: once shortly after
 * load, then every five minutes, and again whenever the tab is brought back
 * into focus. All silent — it never pops a sign-in window on its own.
 */
export function useAutoSync() {
  const enabled = useDoc((s) => s.doc.google.autoSync);
  const hasLinks = useDoc((s) => s.doc.google.links.length > 0);
  const clientId = useDoc((s) => s.doc.google.clientId);

  useEffect(() => {
    if (!enabled || !hasLinks || !clientId) return;
    let stopped = false;

    const tick = () => {
      if (stopped || document.hidden || isSyncing()) return;
      void syncNow({ interactive: false });
    };

    const first = window.setTimeout(tick, 2500);
    const timer = window.setInterval(tick, EVERY);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, hasLinks, clientId]);
}

/** A small status pill for the top bar. */
export function SyncBadge({ onClick }: { onClick: () => void }) {
  const google = useDoc((s) => s.doc.google);
  const [, tickState] = useState(0);

  // re-render every 30s so "3 min ago" stays honest
  useEffect(() => {
    const t = window.setInterval(() => tickState((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);

  if (!google.email || google.links.length === 0) return null;
  const bad = Boolean(google.lastError);

  return (
    <button
      className="btn"
      onClick={onClick}
      title={bad ? google.lastError : `Calendar synced ${relativeTime(google.lastSyncedAt)}`}
      style={{
        gap: 6,
        borderColor: bad ? '#B4544A' : 'var(--line)',
        color: bad ? '#B4544A' : 'var(--ink)',
      }}
    >
      <motion.span
        animate={isSyncing() ? { rotate: 360 } : { rotate: 0 }}
        transition={isSyncing() ? { duration: 1.1, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}
        style={{ display: 'grid' }}
      >
        <Icon name={bad ? 'close' : 'repeat'} size={15} />
      </motion.span>
      <span style={{ fontSize: 12.5 }}>{bad ? 'Sync issue' : relativeTime(google.lastSyncedAt)}</span>
    </button>
  );
}

