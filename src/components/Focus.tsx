/**
 * Cozy focus.
 *
 * The page dims except the widget you're working in, a seedling goes in the
 * ground for the length of the session, and the mouse curls up next to you and
 * sleeps. If you leave early the seedling stays a sprout — that's the entire
 * penalty. No lost streak, no red text, nothing taken away. Enough to make you
 * want to see it through, not enough to punish a day that went sideways.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from './Avatar';
import { Icon } from './Icons';
import { Seedling } from './GardenPage';
import { WeatherLayer } from './Sky';
import { GARDEN } from '../lib/garden';
import { useDoc, useUI } from '../lib/store';
import { play } from '../lib/sound';
import { startAmbient, stopAmbient } from '../lib/ambient';
import type { ID, WidgetType } from '../lib/types';

/** The lengths on offer, matching the effort tags you already use. */
export const FOCUS_LENGTHS = [15, 25, 50];

export function minutesForEffort(effort?: string): number {
  if (effort === 'quick') return 5;
  if (effort === 'short') return 15;
  if (effort === 'deep') return 50;
  return 25;
}

/** The flower a session grows, picked from the sort of widget you worked in. */
function flowerForWidget(type: WidgetType): string {
  const hit = GARDEN.find((f) => f.contents.includes(`w:${type}`));
  return hit?.id ?? 'daisy';
}

/**
 * Start a session. Returns a callback so a widget menu or a task row can begin
 * one without knowing anything about how the garden works.
 */
export function useStartFocus() {
  const widgets = useDoc((s) => s.doc.widgets);
  const sowSeedling = useDoc((s) => s.sowSeedling);
  const setFocus = useUI((s) => s.setFocus);
  const toast = useUI((s) => s.toast);

  return (widgetId: ID, minutes: number) => {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    const plantId = sowSeedling(
      flowerForWidget(widget.type),
      `${minutes} minutes on ${widget.title}`,
    );
    setFocus({ widgetId, minutes, endsAt: Date.now() + minutes * 60_000, plantId });
    toast(`${minutes} cozy minutes. Everything else can wait.`);
  };
}

function mmss(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FocusOverlay() {
  const focus = useUI((s) => s.focus);
  const setFocus = useUI((s) => s.setFocus);
  const cheer = useUI((s) => s.cheer);
  const setMood = useUI((s) => s.setMood);
  const toast = useUI((s) => s.toast);

  const avatar = useDoc((s) => s.doc.avatar);
  const settings = useDoc((s) => s.doc.settings);
  const widgets = useDoc((s) => s.doc.widgets);
  const finishSeedling = useDoc((s) => s.finishSeedling);

  const [now, setNow] = useState(() => Date.now());
  const [rain, setRain] = useState(false);

  /* tick */
  useEffect(() => {
    if (!focus) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [focus]);

  /* the rain that comes with cozy mode, if you want it out loud */
  useEffect(() => {
    if (!focus || !rain) return;
    startAmbient('rain', settings.ambientVolume);
    return () => {
      // hand the background back to whatever you had chosen
      if (settings.ambient === 'off') stopAmbient();
      else startAmbient(settings.ambient, settings.ambientVolume);
    };
  }, [focus, rain, settings.ambient, settings.ambientVolume]);

  const widget = useMemo(
    () => (focus ? widgets.find((w) => w.id === focus.widgetId) ?? null : null),
    [focus, widgets],
  );

  const left = focus ? focus.endsAt - now : 0;
  const done = Boolean(focus) && left <= 0;

  /* ---- the session ran its course ---- */
  useEffect(() => {
    if (!focus || !done) return;
    finishSeedling(focus.plantId, focus.minutes);
    play('chime', settings.sound);
    if (settings.confetti) cheer();
    setMood('cheer', 3000);
    toast(`${focus.minutes} minutes done. The seedling took root 🌱`, 'win');
    setFocus(null);
  }, [done, focus, finishSeedling, settings.sound, settings.confetti, cheer, setMood, toast, setFocus]);

  /* the widget went away (deleted, or a tab switch) — end quietly */
  useEffect(() => {
    if (focus && !widget) setFocus(null);
  }, [focus, widget, setFocus]);

  const giveUp = () => {
    if (!focus) return;
    setFocus(null);
    toast('Stopped early — it stays a sprout. No harm done.');
  };

  if (!focus || !widget) return null;

  const elapsed = focus.minutes * 60_000 - left;
  const through = Math.max(0, Math.min(1, elapsed / (focus.minutes * 60_000)));
  // the seedling grows through the session: sown, sprout, then leafing out
  const stage = through < 0.34 ? 0 : through < 0.72 ? 1 : 2;

  return (
    <>
      {/* the dim. Widgets handle their own fade so the focused one stays crisp. */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 20, pointerEvents: 'none',
          background:
            'radial-gradient(130% 100% at 50% 45%, transparent 30%,'
            + ' color-mix(in srgb, #2A1E18 34%, transparent) 100%)',
        }}
      />

      {/* rain on the paper, whether or not it's raining outside */}
      <WeatherLayer kind="rain" />

      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 90, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style={{
          position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)',
          zIndex: 62, display: 'flex', alignItems: 'center', gap: 14,
          padding: '12px 16px', borderRadius: 'var(--r-lg)',
          border: '3px solid var(--line)', background: 'var(--surface)',
          boxShadow: 'var(--shadow-lg)', maxWidth: 'min(560px, 94vw)',
        }}
      >
        {/* the seedling for this session */}
        <span style={{ width: 62, height: 62, flexShrink: 0, display: 'block' }}>
          <Seedling stage={stage} leaf="#A8C09A" stem="#8FA97C" size={62} animate={settings.motion} />
        </span>

        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
            {mmss(left)}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--ink-soft)', maxWidth: 260 }}>
            {widget.title} · {avatar.name} is asleep beside you
          </p>
        </div>

        {/* the sleeping mouse */}
        <span style={{ width: 46, height: 46, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
          <Avatar
            species={avatar.species}
            color={avatar.color}
            hat={avatar.hat}
            accessory={avatar.accessory}
            mood="sleepy"
            size={58}
            animate={settings.motion}
          />
        </span>

        <button
          className={`btn icon ${rain ? 'primary' : ''}`}
          onClick={() => setRain((v) => !v)}
          aria-pressed={rain}
          title={rain ? 'Rain sound on' : 'Play rain while you work'}
          style={{ padding: 7 }}
        >
          <Icon name="drop" size={16} />
        </button>

        <button className="btn tiny" onClick={giveUp} title="Stop the timer">
          Stop
        </button>
      </motion.div>
    </>
  );
}

/** The little dialog that picks a length. */
export function FocusStart({
  widgetId, open, onClose,
}: { widgetId: ID; open: boolean; onClose: () => void }) {
  const start = useStartFocus();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 70,
              background: 'color-mix(in srgb, var(--ink) 26%, transparent)',
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 71, width: 'min(340px, 92vw)', padding: 18,
              borderRadius: 'var(--r-lg)', border: '3px solid var(--line)',
              background: 'var(--bg)', boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 className="hand" style={{ margin: '0 0 4px', fontSize: 24 }}>Cozy focus</h3>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
              Everything else dims. A seedling grows while you work — leave early and it
              simply stays a sprout.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {FOCUS_LENGTHS.map((m) => (
                <button
                  key={m}
                  className="btn primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { start(widgetId, m); onClose(); }}
                >
                  {m}m
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
