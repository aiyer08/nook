/**
 * One record per day, drawn eight ways.
 *
 * Habit grids, year-in-pixels, sleep bars, the weather log, gratitude lines,
 * tap-counters and the cycle tracker are all the same store — a map of
 * YYYY-MM-DD to a small record — so they share one widget with a `mode`
 * rather than being eight near-identical components.
 *
 * Nothing derived is ever stored. Streaks, totals and correlations are
 * computed from the day map on every render, which is why back-filling a day
 * you forgot repairs everything at once.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { DateStr, DayEntry, ID, Sector, Widget } from '../../lib/types';
import { useDoc, useUI } from '../../lib/store';
import { Icon, type IconName } from '../Icons';
import { Empty } from '../ui';
import { play } from '../../lib/sound';
import { addDays, MONTHS, parseDateStr, prettyDate, shiftMonth, today, WEEKDAYS } from '../../lib/dates';
import { correlation, describeCorrelation, gridDays, streaks, yearDays } from '../../lib/streaks';
import { ENERGY_WORDS, MOOD_FACES, TRACKER_PRESETS } from '../../lib/trackers';
import { readableOn } from '../../lib/themes';
import { uid } from '../../lib/id';

export function TrackerWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const updateWidget = useDoc((s) => s.updateWidget);
  const tasks = useDoc((s) => s.doc.tasks);
  const sound = useDoc((s) => s.doc.settings.sound);
  const setMood = useUI((s) => s.setMood);

  const accent = widget.accent ?? sector.accent;
  const mode = widget.data.mode ?? 'grid';
  const days = widget.data.days ?? {};
  const t = today();

  /** Write one day's record. Merges, so modes can share a day. */
  const setDay = (date: DateStr, entry: Partial<DayEntry> | null) => {
    const next = { ...days };
    if (entry === null) delete next[date];
    else next[date] = { ...next[date], ...entry };
    patch(widget.id, { days: next });
  };

  const shared = { widget, accent, days, setDay, sound, setMood, t };

  /* first run: which kind of tracker is this? */
  if (!widget.data.mode) {
    return (
      <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 6 }}>
        <p className="hand" style={{ margin: 0, fontSize: 19, color: 'var(--ink-soft)' }}>
          What are you keeping track of?
        </p>
        {TRACKER_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              patch(widget.id, p.build());
              if (widget.title === 'Tracker') updateWidget(widget.id, { title: p.label });
            }}
            style={{
              display: 'flex', gap: 9, alignItems: 'flex-start', textAlign: 'left', padding: 9,
              borderRadius: 'var(--r)', border: '2.5px solid var(--line)', background: 'var(--surface)',
            }}
          >
            <Icon name={p.icon} size={16} color="var(--ink-soft)" style={{ marginTop: 1 }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{p.label}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                {p.blurb}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      {mode === 'grid' && <GridMode {...shared} />}
      {mode === 'pixels' && <PixelMode {...shared} />}
      {mode === 'bars' && <BarMode {...shared} />}
      {mode === 'mood' && <MoodMode {...shared} tasks={tasks} />}
      {mode === 'icons' && <IconMode {...shared} />}
      {mode === 'line' && <LineMode {...shared} />}
      {mode === 'taps' && <TapMode {...shared} />}
      {mode === 'cycle' && <CycleMode {...shared} />}
    </div>
  );
}

interface ModeProps {
  widget: Widget;
  accent: string;
  days: Record<DateStr, DayEntry>;
  setDay: (d: DateStr, e: Partial<DayEntry> | null) => void;
  sound: boolean;
  setMood: (m: 'idle' | 'happy' | 'cheer' | 'sleepy' | 'stretch', ms?: number) => void;
  t: DateStr;
}

/* ------------------------------------------------------------------ */
/* grid — the contribution graph, with both streaks                    */
/* ------------------------------------------------------------------ */

function GridMode({ widget, accent, days, setDay, sound, setMood, t }: ModeProps) {
  const patch = useDoc((s) => s.patchWidgetData);
  const weeks = widget.data.weeks ?? 26;
  const cells = useMemo(() => gridDays(weeks, t), [weeks, t]);
  const doneDates = useMemo(
    () => Object.entries(days).filter(([, e]) => e.done).map(([d]) => d),
    [days],
  );
  const s = useMemo(() => streaks(doneDates, t), [doneDates, t]);

  const toggle = (d: DateStr) => {
    if (d > t) return; // the future isn't yours to tick yet
    const on = days[d]?.done;
    setDay(d, on ? { done: false } : { done: true });
    if (!on) { play('pop', sound); setMood('happy'); }
  };

  // columns of 7, oldest first
  const columns: DateStr[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));

  return (
    <>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
        <Stat value={s.current} label="current" accent={accent} big />
        <Stat value={s.longest} label="longest" />
        <Stat value={s.total} label="days" />
        <span style={{ flex: 1 }} />
        <button
          className={`btn tiny ${s.todayDone ? '' : 'primary'}`}
          onClick={() => toggle(t)}
        >
          <Icon name={s.todayDone ? 'undo' : 'check'} size={13} />
          {s.todayDone ? 'Undo today' : 'Did it today'}
        </button>
      </div>

      <div className="scroll" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 3, minWidth: 'min-content' }}>
          <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 13px)', gap: 3, marginRight: 2 }}>
            {WEEKDAYS.map((d, i) => (
              <span key={d} style={{ fontSize: 8.5, color: 'var(--ink-faint)', lineHeight: '13px' }}>
                {i % 2 === 1 ? d[0] : ''}
              </span>
            ))}
          </div>
          {columns.map((col, ci) => (
            <div key={ci} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 13px)', gap: 3 }}>
              {col.map((d) => {
                const on = Boolean(days[d]?.done);
                const future = d > t;
                const isToday = d === t;
                return (
                  <motion.button
                    key={d}
                    whileTap={future ? undefined : { scale: 0.8 }}
                    animate={on ? { scale: [1, 0.82, 1.14, 1] } : { scale: 1 }}
                    transition={{ duration: 0.26, ease: [0.34, 1.56, 0.64, 1] }}
                    onClick={() => toggle(d)}
                    disabled={future}
                    title={`${prettyDate(d)}${on ? ' · done' : ''}`}
                    aria-label={`${d}${on ? ', done' : ''}`}
                    aria-pressed={on}
                    style={{
                      width: 13, height: 13, padding: 0, borderRadius: 4,
                      border: isToday ? `1.8px solid ${accent}` : '1px solid var(--line)',
                      background: on ? accent : future ? 'transparent' : 'var(--surface-2)',
                      opacity: future ? 0.3 : 1,
                      cursor: future ? 'default' : 'pointer',
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="hand" style={{ margin: 0, fontSize: 16, color: 'var(--ink-soft)' }}>
        {s.total === 0
          ? 'Tap a square. Any square.'
          : s.current === 0 && s.longest > 1
            ? `Broken run, but you once did ${s.longest} in a row. That still counts.`
            : s.current >= s.longest && s.current > 2
              ? `Your best run yet — ${s.current} days.`
              : s.current > 0
                ? `${s.current} day${s.current === 1 ? '' : 's'} going.`
                : 'Today is a fine place to start again.'}
      </p>

      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Show</span>
        {[13, 26, 52].map((w) => (
          <button
            key={w}
            className={`btn tiny ${weeks === w ? 'primary' : ''}`}
            onClick={() => patch(widget.id, { weeks: w })}
          >
            {w}w
          </button>
        ))}
      </div>
    </>
  );
}

function Stat({ value, label, accent, big }: { value: number; label: string; accent?: string; big?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 4,
        padding: big ? '4px 11px' : '3px 9px', borderRadius: 999,
        border: `2px solid ${accent ?? 'var(--line)'}`,
        background: accent ? `color-mix(in srgb, ${accent} 26%, var(--surface))` : 'var(--surface)',
      }}
    >
      <b style={{ fontSize: big ? 17 : 14, fontVariantNumeric: 'tabular-nums' }}>{value}</b>
      <span style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>{label}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* pixels — a whole year on one page                                   */
/* ------------------------------------------------------------------ */

function PixelMode({ widget, days, setDay, t }: ModeProps) {
  const palette = widget.data.palette ?? [];
  const [year, setYear] = useState(Number(t.slice(0, 4)));
  const [pen, setPen] = useState(palette[0]?.key ?? '');
  const all = useMemo(() => yearDays(year), [year]);

  const byMonth: DateStr[][] = Array.from({ length: 12 }, () => []);
  for (const d of all) byMonth[Number(d.slice(5, 7)) - 1].push(d);

  const counts = palette.map((p) => ({
    ...p,
    n: all.filter((d) => days[d]?.key === p.key).length,
  }));

  return (
    <>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn ghost tiny" onClick={() => setYear(year - 1)} aria-label="Previous year">
          <Icon name="chevronLeft" size={13} />
        </button>
        <b style={{ fontSize: 13.5 }}>{year}</b>
        <button className="btn ghost tiny" onClick={() => setYear(year + 1)} aria-label="Next year">
          <Icon name="chevronRight" size={13} />
        </button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>painting with</span>
        {palette.map((p) => (
          <button
            key={p.key}
            onClick={() => setPen(p.key)}
            title={p.label}
            aria-label={p.label}
            aria-pressed={pen === p.key}
            style={{
              width: 19, height: 19, borderRadius: 6, padding: 0, background: p.color,
              border: pen === p.key ? '2.5px solid var(--ink)' : '1.5px solid var(--line)',
            }}
          />
        ))}
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 3, alignItems: 'start' }}>
          {byMonth.map((month, mi) => (
            <div key={mi} style={{ display: 'contents' }}>
              <span style={{ fontSize: 9, color: 'var(--ink-faint)', paddingTop: 2, textAlign: 'right', paddingRight: 3 }}>
                {MONTHS[mi].slice(0, 3)}
              </span>
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {month.map((d) => {
                  const key = days[d]?.key;
                  const color = palette.find((p) => p.key === key)?.color;
                  return (
                    <button
                      key={d}
                      onClick={() => setDay(d, key === pen ? { key: undefined } : { key: pen })}
                      disabled={d > t}
                      title={`${prettyDate(d)}${key ? ` · ${palette.find((p) => p.key === key)?.label}` : ''}`}
                      aria-label={d}
                      style={{
                        width: 9, height: 9, padding: 0, borderRadius: 2.5,
                        background: color ?? 'var(--surface-2)',
                        border: d === t ? '1.5px solid var(--ink)' : '1px solid var(--line)',
                        opacity: d > t ? 0.25 : 1,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {counts.filter((c) => c.n > 0).map((c) => (
          <span key={c.key} className="chip" style={{ padding: '1px 8px', fontSize: 10.5, borderColor: c.color }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color, display: 'inline-block' }} />
            {c.label} {c.n}
          </span>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* bars — sleep, steps, spend, study hours, a daily rating             */
/* ------------------------------------------------------------------ */

function BarMode({ widget, accent, days, setDay, t }: ModeProps) {
  const patch = useDoc((s) => s.patchWidgetData);
  const weeks = widget.data.weeks ?? 6;
  const series = widget.data.series ?? [];
  const unit = widget.data.unit ?? '';
  const goal = widget.data.goalAmount;
  const span = useMemo(
    () => Array.from({ length: weeks * 7 }, (_, i) => addDays(t, -(weeks * 7 - 1 - i))),
    [weeks, t],
  );

  const totalFor = (d: DateStr) => {
    const e = days[d];
    if (!e) return 0;
    if (series.length) return Object.values(e.amounts ?? {}).reduce((a, b) => a + (b || 0), 0);
    return e.value ?? 0;
  };

  const peak = Math.max(goal ?? 0, ...span.map(totalFor), 1);
  const shown = span.filter((d) => totalFor(d) > 0);
  const average = shown.length ? shown.reduce((a, d) => a + totalFor(d), 0) / shown.length : 0;

  const [pick, setPick] = useState<DateStr>(t);
  const entry = days[pick];

  return (
    <>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        <Stat value={Math.round(average * 10) / 10} label={`avg ${unit}`} accent={accent} big />
        <Stat value={shown.length} label="days logged" />
        <span style={{ flex: 1 }} />
        {[2, 4, 6, 12].map((w) => (
          <button key={w} className={`btn tiny ${weeks === w ? 'primary' : ''}`} onClick={() => patch(widget.id, { weeks: w })}>
            {w}w
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', height: 92, display: 'flex', alignItems: 'flex-end', gap: 1.5, overflowX: 'auto' }}>
        {goal !== undefined && goal > 0 && (
          <span
            style={{
              position: 'absolute', left: 0, right: 0, bottom: `${(goal / peak) * 100}%`,
              borderTop: '2px dashed color-mix(in srgb, var(--ink) 30%, transparent)',
              pointerEvents: 'none', zIndex: 1,
            }}
          >
            <span style={{ position: 'absolute', right: 0, top: -13, fontSize: 9, color: 'var(--ink-faint)' }}>
              {goal}{unit}
            </span>
          </span>
        )}
        {span.map((d) => {
          const total = totalFor(d);
          const h = (total / peak) * 100;
          return (
            <button
              key={d}
              onClick={() => setPick(d)}
              title={`${prettyDate(d)} · ${total || '—'}${unit}`}
              aria-label={`${d}, ${total}${unit}`}
              style={{
                flex: '1 0 6px', minWidth: 5, height: '100%', padding: 0, border: 'none',
                background: 'transparent', display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', gap: 0,
                outline: pick === d ? `2px solid ${accent}` : 'none', outlineOffset: 1,
                borderRadius: 3,
              }}
            >
              {series.length ? (
                series.map((sr) => {
                  const v = days[d]?.amounts?.[sr.id] ?? 0;
                  return v > 0 ? (
                    <span key={sr.id} style={{ height: `${(v / peak) * 100}%`, background: sr.color, display: 'block' }} />
                  ) : null;
                })
              ) : (
                <span
                  style={{
                    height: `${Math.max(h, total > 0 ? 3 : 0)}%`,
                    background: goal && total >= goal ? accent : `color-mix(in srgb, ${accent} 55%, var(--surface-2))`,
                    borderRadius: '3px 3px 0 0', display: 'block',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* the editor for whichever bar is selected */}
      <div style={{ borderTop: '2px dashed var(--line)', paddingTop: 7, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={pick}
            max={t}
            onChange={(e) => setPick(e.target.value || t)}
            aria-label="Which day"
            style={{ padding: '4px 8px', fontSize: 12, borderWidth: 2 }}
          />
          {!series.length && (
            <>
              <input
                type="number"
                step="any"
                value={entry?.value ?? ''}
                onChange={(e) => setDay(pick, { value: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="0"
                aria-label={`Amount for ${pick}`}
                style={{ width: 84, padding: '4px 8px', fontSize: 12, borderWidth: 2, textAlign: 'right' }}
              />
              <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{unit}</span>
            </>
          )}
        </div>

        {series.map((sr) => (
          <div key={sr.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: sr.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 12 }}>{sr.label}</span>
            <input
              type="number"
              step="any"
              value={entry?.amounts?.[sr.id] ?? ''}
              onChange={(e) =>
                setDay(pick, {
                  amounts: {
                    ...(entry?.amounts ?? {}),
                    [sr.id]: e.target.value === '' ? 0 : Number(e.target.value),
                  },
                })
              }
              placeholder="0"
              aria-label={`${sr.label} on ${pick}`}
              style={{ width: 72, padding: '3px 7px', fontSize: 12, borderWidth: 2, textAlign: 'right' }}
            />
          </div>
        ))}
        {series.length > 0 && <SeriesEditor widget={widget} />}
      </div>
    </>
  );
}

function SeriesEditor({ widget }: { widget: Widget }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const series = widget.data.series ?? [];
  const [name, setName] = useState('');
  const colors = ['#A3C4E0', '#C0A9DB', '#9FCFB8', '#EFA3B0', '#EFCE7B', '#F2B58F', '#95CBC8'];
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && name.trim()) {
            patch(widget.id, {
              series: [...series, { id: uid().slice(0, 6), label: name.trim(), color: colors[series.length % colors.length] }],
            });
            setName('');
          }
        }}
        placeholder="+ another subject"
        aria-label="Add a series"
        style={{ flex: 1, padding: '3px 8px', fontSize: 11.5, borderWidth: 2, borderStyle: 'dashed' }}
      />
      {series.length > 1 && (
        <button
          className="btn ghost tiny"
          onClick={() => patch(widget.id, { series: series.slice(0, -1) })}
          aria-label="Remove last series"
          style={{ padding: 3 }}
        >
          <Icon name="close" size={12} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* mood — one tap a day, plotted against what you finished             */
/* ------------------------------------------------------------------ */

function MoodMode({
  accent, days, setDay, t, tasks,
}: ModeProps & { tasks: { completedOn?: DateStr; completions?: DateStr[] }[] }) {
  const [pick, setPick] = useState<DateStr>(t);
  const entry = days[pick];

  /** How many things were actually finished on a given day. */
  const doneOn = useMemo(() => {
    const counts: Record<DateStr, number> = {};
    for (const task of tasks) {
      const dates = task.completions?.length ? task.completions : task.completedOn ? [task.completedOn] : [];
      for (const d of dates) counts[d] = (counts[d] ?? 0) + 1;
    }
    return counts;
  }, [tasks]);

  const pairs = useMemo(
    () =>
      Object.entries(days)
        .filter(([, e]) => e.mood !== undefined)
        .map(([d, e]) => [e.mood as number, doneOn[d] ?? 0] as [number, number]),
    [days, doneOn],
  );
  const r = correlation(pairs);
  const maxDone = Math.max(1, ...pairs.map((p) => p[1]));

  const scale = (label: string, key: 'mood' | 'energy', words: string[]) => (
    <div style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {words.map((w, i) => {
          const n = i + 1;
          const on = entry?.[key] === n;
          return (
            <motion.button
              key={w}
              whileTap={{ scale: 0.9 }}
              onClick={() => setDay(pick, { [key]: on ? undefined : n })}
              aria-pressed={on}
              style={{
                flex: 1, padding: '6px 2px', borderRadius: 11, fontSize: 10.5, fontWeight: 700,
                border: `2px solid ${on ? accent : 'var(--line)'}`,
                background: on ? accent : 'var(--surface)',
                color: on ? readableOn(accent) : 'var(--ink-soft)',
              }}
            >
              {w}
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="date"
          value={pick}
          max={t}
          onChange={(e) => setPick(e.target.value || t)}
          aria-label="Which day"
          style={{ padding: '4px 8px', fontSize: 12, borderWidth: 2 }}
        />
        {pick !== t && (
          <button className="btn ghost tiny" onClick={() => setPick(t)}>Today</button>
        )}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
          {doneOn[pick] ?? 0} finished
        </span>
      </div>

      {scale('Mood', 'mood', MOOD_FACES)}
      {scale('Energy', 'energy', ENERGY_WORDS)}

      {/* mood against things finished */}
      <div style={{ borderTop: '2px dashed var(--line)', paddingTop: 8 }}>
        <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
          Mood against what you got done
        </p>
        {pairs.length < 2 ? (
          <Empty icon="sparkle">A few days of tapping and a shape appears here.</Empty>
        ) : (
          <div
            style={{
              position: 'relative', height: 96, borderLeft: '2px solid var(--line)',
              borderBottom: '2px solid var(--line)', margin: '0 4px 4px 18px',
            }}
          >
            {pairs.map(([m, d], i) => (
              <span
                key={i}
                title={`mood ${m}, ${d} finished`}
                style={{
                  position: 'absolute',
                  left: `${((m - 1) / 4) * 100}%`,
                  bottom: `${(d / maxDone) * 100}%`,
                  width: 9, height: 9, marginLeft: -4, marginBottom: -4,
                  borderRadius: 999, background: accent, opacity: 0.65,
                  border: '1.5px solid color-mix(in srgb, var(--ink) 30%, transparent)',
                }}
              />
            ))}
            <span style={{ position: 'absolute', left: -16, top: -4, fontSize: 9, color: 'var(--ink-faint)' }}>
              {maxDone}
            </span>
            <span style={{ position: 'absolute', left: 0, bottom: -14, fontSize: 9, color: 'var(--ink-faint)' }}>
              rough
            </span>
            <span style={{ position: 'absolute', right: 0, bottom: -14, fontSize: 9, color: 'var(--ink-faint)' }}>
              great
            </span>
          </div>
        )}
        <p className="hand" style={{ margin: '10px 0 0', fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.35 }}>
          {describeCorrelation(r, pairs.length)}
        </p>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* icons — the weather log                                             */
/* ------------------------------------------------------------------ */

const WEATHER_ICON: Record<string, IconName> = {
  sun: 'sun', part: 'sun', cloud: 'moon', rain: 'moon',
  storm: 'bolt', snow: 'sparkle', fog: 'moon', hot: 'sun',
};

function IconMode({ widget, days, setDay, t }: ModeProps) {
  const palette = widget.data.palette ?? [];
  const [cursor, setCursor] = useState(t.slice(0, 7));
  const [y, m] = cursor.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  const list = Array.from({ length: count }, (_, i) => `${cursor}-${String(i + 1).padStart(2, '0')}`);
  const [pen, setPen] = useState(palette[0]?.key ?? '');

  return (
    <>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <button className="btn ghost tiny" onClick={() => setCursor(shiftMonth(cursor, -1))} aria-label="Previous month">
          <Icon name="chevronLeft" size={13} />
        </button>
        <b style={{ flex: 1, textAlign: 'center', fontSize: 13 }}>{MONTHS[m - 1]} {y}</b>
        <button className="btn ghost tiny" onClick={() => setCursor(shiftMonth(cursor, 1))} aria-label="Next month">
          <Icon name="chevronRight" size={13} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {palette.map((p) => (
          <button
            key={p.key}
            className={`btn tiny ${pen === p.key ? 'primary' : ''}`}
            onClick={() => setPen(p.key)}
            style={{ padding: '3px 8px' }}
          >
            <Icon name={WEATHER_ICON[p.key] ?? 'sun'} size={12} /> {p.label}
          </button>
        ))}
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))', gap: 4 }}>
          {list.map((d) => {
            const key = days[d]?.key;
            const p = palette.find((x) => x.key === key);
            return (
              <button
                key={d}
                onClick={() => setDay(d, key === pen ? { key: undefined } : { key: pen })}
                disabled={d > t}
                title={`${prettyDate(d)}${p ? ` · ${p.label}` : ''}`}
                style={{
                  aspectRatio: '1', borderRadius: 9, padding: 0,
                  border: d === t ? '2.5px solid var(--ink)' : '2px solid var(--line)',
                  background: p?.color ?? 'var(--surface-2)',
                  opacity: d > t ? 0.3 : 1,
                  display: 'grid', placeItems: 'center', position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', top: 1, left: 3, fontSize: 8, color: 'var(--ink-faint)' }}>
                  {Number(d.slice(8))}
                </span>
                {p && <Icon name={WEATHER_ICON[p.key] ?? 'sun'} size={14} color="var(--ink)" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* line — one line a day                                               */
/* ------------------------------------------------------------------ */

function LineMode({ days, setDay, t }: ModeProps) {
  const written = useMemo(
    () => Object.entries(days).filter(([, e]) => e.note?.trim()).sort((a, b) => b[0].localeCompare(a[0])),
    [days],
  );
  return (
    <>
      <label style={{ display: 'grid', gap: 4 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
          {prettyDate(t)}
        </span>
        <textarea
          value={days[t]?.note ?? ''}
          onChange={(e) => setDay(t, { note: e.target.value })}
          placeholder="One line is enough."
          rows={2}
          className="hand"
          aria-label="Today's line"
          style={{ fontSize: 19, lineHeight: 1.35, resize: 'none' }}
        />
      </label>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {written.length <= 1 ? (
          <Empty icon="note">The lines you write pile up here.</Empty>
        ) : (
          written.filter(([d]) => d !== t).map(([d, e]) => (
            <div key={d} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1.5px dashed var(--line)' }}>
              <span style={{ fontSize: 10.5, color: 'var(--ink-faint)', minWidth: 62, paddingTop: 3 }}>
                {prettyDate(d)}
              </span>
              <span className="hand" style={{ flex: 1, fontSize: 17, lineHeight: 1.3 }}>{e.note}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* taps — meds, water, a routine                                       */
/* ------------------------------------------------------------------ */

function TapMode({ widget, accent, days, setDay, sound, t }: ModeProps) {
  const patch = useDoc((s) => s.patchWidgetData);
  const rows = widget.data.rows ?? [];
  const [pick, setPick] = useState<DateStr>(t);
  const taps = days[pick]?.taps ?? {};
  const [name, setName] = useState('');

  const bump = (id: ID, delta: number, target: number) => {
    const next = Math.max(0, Math.min(target, (taps[id] ?? 0) + delta));
    setDay(pick, { taps: { ...taps, [id]: next } });
    if (delta > 0) play('tick', sound);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="date"
          value={pick}
          max={t}
          onChange={(e) => setPick(e.target.value || t)}
          aria-label="Which day"
          style={{ padding: '4px 8px', fontSize: 12, borderWidth: 2 }}
        />
        {pick !== t && <button className="btn ghost tiny" onClick={() => setPick(t)}>Today</button>}
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 7, alignContent: 'start' }}>
        {rows.map((row) => {
          const n = taps[row.id] ?? 0;
          return (
            <div key={row.id} style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{n}/{row.target}</span>
                <button className="btn ghost tiny" onClick={() => bump(row.id, -1, row.target)} aria-label={`One fewer ${row.label}`} style={{ padding: 3 }}>
                  −
                </button>
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {Array.from({ length: row.target }).map((_, i) => {
                  const on = n > i;
                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.85 }}
                      animate={on ? { scale: [1, 0.86, 1.1, 1] } : { scale: 1 }}
                      transition={{ duration: 0.24 }}
                      onClick={() => setDay(pick, { taps: { ...taps, [row.id]: on ? i : i + 1 } })}
                      aria-label={`${row.label} ${i + 1}`}
                      aria-pressed={on}
                      style={{
                        width: 26, height: 26, borderRadius: 9, padding: 0,
                        border: '2.5px solid var(--line)',
                        background: on ? accent : 'var(--surface)',
                        display: 'grid', placeItems: 'center',
                      }}
                    >
                      {on && <Icon name="check" size={13} stroke={3} />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 5 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                patch(widget.id, { rows: [...rows, { id: uid().slice(0, 6), label: name.trim(), target: 1 }] });
                setName('');
              }
            }}
            placeholder="+ another row"
            aria-label="Add a row"
            style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderWidth: 2, borderStyle: 'dashed' }}
          />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* cycle                                                               */
/* ------------------------------------------------------------------ */

const FLOW = ['none', 'light', 'medium', 'heavy'];
const SYMPTOMS = ['Cramps', 'Headache', 'Tired', 'Tender', 'Nausea', 'Low mood', 'Bloated', 'Acne'];

function CycleMode({ accent, days, setDay, t }: ModeProps) {
  const [cursor, setCursor] = useState(t.slice(0, 7));
  const [y, m] = cursor.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  const list = Array.from({ length: count }, (_, i) => `${cursor}-${String(i + 1).padStart(2, '0')}`);
  const [pick, setPick] = useState<DateStr>(t);
  const entry = days[pick];

  /** Cycle starts are the first bleeding day after a gap. */
  const starts = useMemo(() => {
    const flowDays = Object.entries(days).filter(([, e]) => (e.flow ?? 0) > 0).map(([d]) => d).sort();
    return flowDays.filter((d, i) => i === 0 || parseDateStr(d).getTime() - parseDateStr(flowDays[i - 1]).getTime() > 3 * 86400000);
  }, [days]);

  const gaps = starts.slice(1).map((d, i) => Math.round((parseDateStr(d).getTime() - parseDateStr(starts[i]).getTime()) / 86400000));
  const avgLen = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : undefined;
  const nextGuess = avgLen && starts.length ? addDays(starts[starts.length - 1], avgLen) : undefined;

  return (
    <>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        <button className="btn ghost tiny" onClick={() => setCursor(shiftMonth(cursor, -1))} aria-label="Previous month">
          <Icon name="chevronLeft" size={13} />
        </button>
        <b style={{ flex: 1, textAlign: 'center', fontSize: 13 }}>{MONTHS[m - 1]} {y}</b>
        <button className="btn ghost tiny" onClick={() => setCursor(shiftMonth(cursor, 1))} aria-label="Next month">
          <Icon name="chevronRight" size={13} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(30px, 1fr))', gap: 3 }}>
        {list.map((d) => {
          const flow = days[d]?.flow ?? 0;
          const predicted = nextGuess && d >= nextGuess && d < addDays(nextGuess, 5);
          return (
            <button
              key={d}
              onClick={() => setPick(d)}
              title={`${prettyDate(d)} · ${FLOW[flow]}`}
              style={{
                aspectRatio: '1', borderRadius: 8, padding: 0, fontSize: 9.5, fontWeight: 700,
                border: pick === d ? '2.5px solid var(--ink)' : predicted ? `2px dashed ${accent}` : '2px solid var(--line)',
                background: flow ? `color-mix(in srgb, #D9788C ${flow * 30}%, var(--surface))` : 'var(--surface-2)',
                color: 'var(--ink)',
              }}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>

      <div style={{ borderTop: '2px dashed var(--line)', paddingTop: 7, display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>{prettyDate(pick)}</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {FLOW.map((label, i) => (
            <button
              key={label}
              className={`btn tiny ${(entry?.flow ?? 0) === i ? 'primary' : ''}`}
              onClick={() => setDay(pick, { flow: i })}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {SYMPTOMS.map((s) => {
            const on = entry?.symptoms?.includes(s);
            return (
              <button
                key={s}
                onClick={() =>
                  setDay(pick, {
                    symptoms: on
                      ? (entry?.symptoms ?? []).filter((x) => x !== s)
                      : [...(entry?.symptoms ?? []), s],
                  })
                }
                aria-pressed={on}
                style={{
                  padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  border: `2px solid ${on ? accent : 'var(--line)'}`,
                  background: on ? accent : 'transparent',
                  color: on ? readableOn(accent) : 'var(--ink-faint)',
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
        <p className="hand" style={{ margin: 0, fontSize: 16, color: 'var(--ink-soft)' }}>
          {avgLen
            ? `Roughly every ${avgLen} days. Next one around ${nextGuess ? prettyDate(nextGuess) : '—'}.`
            : 'Log a couple of cycles and an estimate appears here.'}
        </p>
      </div>
    </>
  );
}
