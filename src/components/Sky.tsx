/**
 * The weather, on the page.
 *
 * If it's raining where you are, it rains on your paper; if it's snowing, snow
 * settles along the top edge of every widget. It's one keyless API call and it
 * turns the app into a window — the cheapest atmosphere going.
 *
 * All of it is `pointer-events: none` and none of it touches the document, so
 * weather can never get in the way of your work or end up in your undo stack.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc, useUI } from '../lib/store';
import { Icon } from './Icons';
import { SKY_LABEL, fetchWeather, isFresh, readCache } from '../lib/weather';
import type { Sky as SkyKind } from '../lib/weather';

/** Keeps the shared sky in the transient store fresh. One instance, in App. */
export function WeatherWatch() {
  const on = useDoc((s) => s.doc.settings.weather);
  const place = useDoc((s) => s.doc.settings.place);
  const sky = useUI((s) => s.sky);
  const setSky = useUI((s) => s.setSky);

  useEffect(() => {
    if (!on || !place) { setSky(null); return; }

    // a cached reading shows instantly; a stale one is replaced quietly
    const cached = readCache();
    if (cached && cached.place === place.label) setSky(cached);

    let alive = true;
    const ask = async () => {
      if (isFresh(readCache(), place)) return;
      try {
        const w = await fetchWeather(place);
        if (alive) setSky(w);
      } catch {
        /* no weather is fine — the page just stays dry */
      }
    };
    void ask();
    const t = window.setInterval(ask, 20 * 60 * 1000);
    return () => { alive = false; window.clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, place?.label, place?.lat, place?.lon, setSky]);

  return sky ? <WeatherLayer kind={sky.sky} /> : null;
}

/**
 * The weather, in the top bar.
 *
 * Only there when you've asked for it and an answer has come back — no empty
 * chip, no spinner, no "—°". Tapping it opens Settings, which is where the
 * location and the toggle live.
 */
export function WeatherChip({ compact = false }: { compact?: boolean }) {
  const on = useDoc((s) => s.doc.settings.weather);
  const sky = useUI((s) => s.sky);
  const setPanel = useUI((s) => s.setPanel);

  if (!on || !sky) return null;

  return (
    <button
      className="btn"
      onClick={() => setPanel('settings')}
      title={`${SKY_LABEL[sky.sky]}, ${sky.temp}°C in ${sky.place} — tap to change`}
      aria-label={`Weather: ${SKY_LABEL[sky.sky]}, ${sky.temp} degrees in ${sky.place}`}
      style={{ gap: 6, padding: compact ? '6px 9px' : undefined }}
    >
      <SkyGlyph kind={sky.sky} day={sky.day} />
      <span style={{ fontWeight: 700 }}>{sky.temp}°</span>
      {!compact && (
        <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
          {SKY_LABEL[sky.sky]}
        </span>
      )}
    </button>
  );
}

/**
 * A hand-drawn glyph per sky, in the app's own line style rather than an
 * emoji — emoji render differently on every device, which is the one thing
 * this app has been consistent about avoiding.
 */
export function SkyGlyph({ kind, day = true, size = 17 }: { kind: SkyKind; day?: boolean; size?: number }) {
  if (kind === 'clear') {
    return <Icon name={day ? 'sun' : 'moon'} size={size} color={day ? '#D9A93F' : '#8E9BD6'} />;
  }
  if (kind === 'rain') return <Icon name="drop" size={size} color="#7FA9C4" />;
  if (kind === 'snow') return <Icon name="snow" size={size} color="#9BB6CC" />;
  if (kind === 'storm') return <Icon name="bolt" size={size} color="#C9A227" />;
  if (kind === 'fog') return <Icon name="cloud" size={size} color="#B0AAA2" />;
  return <Icon name="cloud" size={size} color="#9E978E" />;
}

/** Deterministic pseudo-random, so drops don't jump about on every render. */
function spread(n: number, seed: number) {
  return Array.from({ length: n }, (_, i) => {
    const r = Math.sin((i + 1) * seed) * 10000;
    return r - Math.floor(r);
  });
}

export function WeatherLayer({ kind }: { kind: SkyKind }) {
  const motionOn = useDoc((s) => s.doc.settings.motion);
  const drops = useMemo(() => spread(40, 12.9898), []);
  const flakes = useMemo(() => spread(34, 78.233), []);

  if (!motionOn || kind === 'clear' || kind === 'cloud') return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 24, pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      {(kind === 'rain' || kind === 'storm') && drops.map((r, i) => {
        const left = r * 100;
        const delay = ((i * 37) % 100) / 100 * 1.6;
        const length = 12 + (r * 12);
        const duration = 0.85 + r * 0.5;
        return (
          <motion.span
            key={i}
            initial={{ y: '-12vh', opacity: 0 }}
            animate={{ y: '112vh', opacity: [0, 0.55, 0.55, 0] }}
            transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', left: `${left}%`, top: 0,
              width: 2, height: length, borderRadius: 2,
              background: 'linear-gradient(to bottom, transparent, #7FA9C4)',
              transform: 'rotate(8deg)',
            }}
          />
        );
      })}

      {kind === 'snow' && flakes.map((r, i) => {
        const left = r * 100;
        const size = 4 + r * 4;
        const duration = 7 + r * 7;
        return (
          <motion.span
            key={i}
            initial={{ y: '-8vh', x: 0, opacity: 0 }}
            animate={{
              y: '108vh',
              x: [0, 18 - r * 36, 0],
              opacity: [0, 0.85, 0.85, 0],
            }}
            transition={{
              duration,
              delay: ((i * 53) % 100) / 100 * 6,
              repeat: Infinity,
              ease: 'linear',
              x: { duration: duration / 2.5, repeat: Infinity, ease: 'easeInOut' },
            }}
            style={{
              position: 'absolute', left: `${left}%`, top: 0,
              width: size, height: size, borderRadius: 999,
              background: '#FFFDF9',
              boxShadow: '0 0 3px rgba(255,255,255,0.8)',
            }}
          />
        );
      })}

      {kind === 'fog' && (
        <motion.div
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', inset: 0,
            background:
              'radial-gradient(140% 90% at 50% 50%, transparent 40%, color-mix(in srgb, var(--bg) 88%, #FFFFFF) 100%)',
          }}
        />
      )}

      {kind === 'storm' && (
        <motion.div
          animate={{ opacity: [0, 0, 0.22, 0, 0.12, 0] }}
          transition={{ duration: 6, repeat: Infinity, repeatDelay: 14, times: [0, 0.82, 0.85, 0.88, 0.91, 1] }}
          style={{ position: 'absolute', inset: 0, background: '#FFF8E7' }}
        />
      )}
    </div>
  );
}

/**
 * Snow settling along the top edge of a widget. A wobbly cap rather than a
 * straight line, because snow doesn't land flat.
 */
export function SnowCap({ width }: { width: number }) {
  const w = Math.max(60, width);
  const path = useMemo(() => {
    const bumps = Math.max(3, Math.round(w / 46));
    let d = `M0 12 L0 8`;
    for (let i = 0; i < bumps; i++) {
      const x0 = (w / bumps) * i;
      const x1 = (w / bumps) * (i + 1);
      const lift = 3 + ((i * 7) % 4);
      d += ` C${x0 + (x1 - x0) * 0.3} ${8 - lift} ${x0 + (x1 - x0) * 0.7} ${8 - lift} ${x1} 8`;
    }
    return `${d} L${w} 12 Z`;
  }, [w]);

  return (
    <svg
      width={w}
      height={13}
      viewBox={`0 0 ${w} 13`}
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: -9, pointerEvents: 'none', zIndex: 5 }}
    >
      <path d={path} fill="#FFFDF9" stroke="color-mix(in srgb, var(--line) 40%, #FFFDF9)" strokeWidth={1.5} />
    </svg>
  );
}

/**
 * A pool of lamplight after dark: warm in the middle, dim at the edges. Uses
 * a plain overlay rather than filtering the page, so text stays crisp.
 */
export function LampGlow() {
  const on = useDoc((s) => s.doc.settings.lampGlow);
  const hour = useClockHour();
  const night = hour >= 19.5 || hour < 6.5;

  return (
    <AnimatePresence>
      {on && night && (
        <motion.div
          key="lamp"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 23, pointerEvents: 'none',
            background:
              'radial-gradient(120% 80% at 50% 22%, color-mix(in srgb, #FFD9A0 22%, transparent) 0%,'
              + ' transparent 46%),'
              + ' radial-gradient(150% 110% at 50% 40%, transparent 42%,'
              + ' color-mix(in srgb, #2A1E18 26%, transparent) 100%)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

/** The hour of day as a decimal, rechecked every minute. */
function useClockHour() {
  const [hour, setHour] = useState(() => new Date().getHours() + new Date().getMinutes() / 60);
  useEffect(() => {
    const t = window.setInterval(
      () => setHour(new Date().getHours() + new Date().getMinutes() / 60),
      60_000,
    );
    return () => window.clearInterval(t);
  }, []);
  return hour;
}
