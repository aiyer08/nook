/**
 * Nook Wrapped — the year, read back to you.
 *
 * Every figure is worked out from what's already saved, so this needs no
 * tracking of its own. It's written as a picture rather than a scorecard: no
 * targets, no percentages against a goal, nothing to fail at.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Panel } from './ui';
import { Icon } from './Icons';
import { FlowerSvg } from './Flower';
import { GARDEN, flowerById } from '../lib/garden';
import { useDoc } from '../lib/store';
import { MONTHS, parseDateStr, today } from '../lib/dates';
import { describeWeek, keepingSince, wrapUp } from '../lib/wrapped';
import { MOOD_FACES } from '../lib/trackers';

/** Rough to great, in the same colours the mood tracker uses. */
const MOOD_RAMP = ['#D89A86', '#F2B58F', '#EFCE7B', '#B4C69A', '#9FCFB8'];

function moodColor(mood: number | null): string {
  if (mood === null) return 'color-mix(in srgb, var(--line) 34%, var(--surface))';
  const i = Math.max(0, Math.min(4, Math.round(mood) - 1));
  return MOOD_RAMP[i];
}

export function WrappedPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useDoc((s) => s.doc);
  const motionOn = useDoc((s) => s.doc.settings.motion);
  const t = today();
  const thisYear = Number(t.slice(0, 4));
  const [year, setYear] = useState(thisYear);

  const w = useMemo(() => wrapUp(doc, year, t), [doc, year, t]);
  const days = useMemo(() => keepingSince(doc, t), [doc, t]);
  const flower = w.topFlower ? flowerById(w.topFlower.id) ?? GARDEN[0] : null;
  const maxMonth = Math.max(1, ...w.perMonth);

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Nook Wrapped"
      subtitle={year === thisYear ? `${year}, so far` : String(year)}
      width={600}
    >
      {/* which year */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          className="btn icon"
          onClick={() => setYear((y) => y - 1)}
          aria-label="The year before"
          style={{ padding: 6 }}
        >
          <Icon name="chevronLeft" size={16} />
        </button>
        <span className="hand" style={{ fontSize: 30, lineHeight: 1, flex: 1, textAlign: 'center' }}>
          {year}
        </span>
        <button
          className="btn icon"
          onClick={() => setYear((y) => Math.min(thisYear, y + 1))}
          disabled={year >= thisYear}
          aria-label="The year after"
          style={{ padding: 6 }}
        >
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      {w.thin && (
        <p
          style={{
            margin: '0 0 16px', padding: '9px 12px', fontSize: 12.5, lineHeight: 1.5,
            borderRadius: 'var(--r)', border: '2px dashed var(--line)', color: 'var(--ink-soft)',
          }}
        >
          There isn't much in {year} yet, so these numbers are small on purpose rather than
          wrong. It fills itself in as the year goes.
        </p>
      )}

      {/* the headline */}
      <Slide accent="#EFCE7B">
        <Big value={w.completed} unit={w.completed === 1 ? 'thing finished' : 'things finished'} />
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
          across {w.activeDays} day{w.activeDays === 1 ? '' : 's'}
          {w.topSector ? `, most of it in ${w.topSector.name}` : ''}.
          {days > 0 && ` You've been keeping this ${days} day${days === 1 ? '' : 's'}.`}
        </p>
      </Slide>

      {/* streaks, framed as the best you ever did */}
      <Slide accent="#9FCFB8">
        <Big value={w.bestStreak} unit={`day${w.bestStreak === 1 ? '' : 's'} in a row`} />
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
          {w.bestStreakEver > w.bestStreak
            ? `Your best ever is ${w.bestStreakEver} days — that one's kept for good.`
            : 'That’s your best run yet, and it stays on the record whatever happens next.'}
        </p>
      </Slide>

      {/* busiest week */}
      {w.busiestWeek && (
        <Slide accent="#F2A6A0">
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            Your busiest week
          </p>
          <p className="hand" style={{ margin: '4px 0 0', fontSize: 30, lineHeight: 1.05 }}>
            {describeWeek(w.busiestWeek)}
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
            {w.busiestWeek.count} things finished in seven days.
            {w.busiestDay && ` The single biggest day was ${prettyShort(w.busiestDay.date)}, with ${w.busiestDay.count}.`}
          </p>
        </Slide>
      )}

      {/* the year in months */}
      <Slide accent="#A3C4E0">
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Month by month
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 92 }}>
          {w.perMonth.map((n, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <motion.div
                initial={motionOn ? { height: 0 } : false}
                animate={{ height: `${Math.max(3, (n / maxMonth) * 74)}px` }}
                transition={{ type: 'spring', stiffness: 220, damping: 26, delay: i * 0.03 }}
                title={`${MONTHS[i]}: ${n}`}
                style={{
                  borderRadius: '6px 6px 3px 3px',
                  border: '2px solid var(--line)',
                  background: n ? '#A3C4E0' : 'transparent',
                }}
              />
              <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>{MONTHS[i][0]}</span>
            </div>
          ))}
        </div>
      </Slide>

      {/* mood as a gradient across the year */}
      <Slide accent="#C0A9DB">
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Your year in mood
        </p>
        {w.moodDays === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
            No mood tracked in {year}. Add a Mood &amp; energy widget and this strip fills in a
            day at a time.
          </p>
        ) : (
          <>
            <div
              style={{
                display: 'flex', gap: 1, height: 46, alignItems: 'stretch',
                padding: 4, borderRadius: 'var(--r)', border: '2px solid var(--line)',
                background: 'var(--surface)', overflow: 'hidden',
              }}
            >
              {w.mood.map((d) => (
                <span
                  key={d.date}
                  title={`${prettyShort(d.date)} · ${d.mood === null ? 'not said' : MOOD_FACES[Math.round(d.mood) - 1]}`}
                  style={{ flex: 1, minWidth: 0, background: moodColor(d.mood), borderRadius: 1 }}
                />
              ))}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
              {w.moodDays} day{w.moodDays === 1 ? '' : 's'} tapped in
              {w.moodAverage !== null && `, averaging ${MOOD_FACES[Math.max(0, Math.round(w.moodAverage) - 1)].toLowerCase()}`}.
              Grey is a day you didn't say, which is also allowed.
            </p>
          </>
        )}
      </Slide>

      {/* the flower you lived in */}
      {flower && w.topFlower && (
        <Slide accent={flower.palette.deep}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span style={{ flexShrink: 0 }}>
              <FlowerSvg flower={flower} open size={98} animate={motionOn} />
            </span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
                Your flower this year
              </p>
              <p className="hand" style={{ margin: '2px 0 0', fontSize: 28, lineHeight: 1.1 }}>
                {flower.species}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>
                {w.topFlower.name} — you reached for it {w.topFlower.count} time
                {w.topFlower.count === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
        </Slide>
      )}

      {/* the garden and the quiet stuff */}
      <Slide accent="#A8C09A">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <Stat icon="sprout" value={w.plants} label={w.plants === 1 ? 'seed planted' : 'seeds planted'} />
          <Stat icon="leaf" value={w.blooms} label={w.blooms === 1 ? 'flower in bloom' : 'flowers in bloom'} />
          <Stat icon="timer" value={Math.round(w.focusMinutes / 60)} label="hours in cozy focus" />
          <Stat icon="star" value={w.mouseFound} label="times you found the mouse" />
        </div>
      </Slide>

      <p style={{ margin: '16px 0 0', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        This is a picture of your year, not a score. Nothing here is a target, and nothing
        gets taken away next January.
      </p>
    </Panel>
  );
}

function Slide({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      style={{
        marginBottom: 12, padding: '14px 16px', borderRadius: 'var(--r-lg)',
        border: '3px solid var(--line)',
        background: `color-mix(in srgb, ${accent} 16%, var(--surface))`,
      }}
    >
      {children}
    </motion.section>
  );
}

function Big({ value, unit }: { value: number; unit: string }) {
  return (
    <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
      <span className="hand" style={{ fontSize: 52, lineHeight: 0.9 }}>{value}</span>
      <span style={{ fontSize: 15, fontWeight: 700 }}>{unit}</span>
    </p>
  );
}

function Stat({ icon, value, label }: { icon: 'sprout' | 'leaf' | 'timer' | 'star'; value: number; label: string }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
      <span
        style={{
          width: 32, height: 32, borderRadius: 999, flexShrink: 0, display: 'grid',
          placeItems: 'center', border: '2.5px solid var(--line)', background: 'var(--surface)',
        }}
      >
        <Icon name={icon} size={16} color="var(--ink-soft)" />
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{value}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)' }}>{label}</span>
      </span>
    </div>
  );
}

function prettyShort(date: string): string {
  const d = parseDateStr(date);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}
