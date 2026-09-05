/**
 * The bullet-journal spreads: future log, monthly, weekly, daily, hourly.
 *
 * All five are the same question — "what is happening across this range of
 * days?" — so they share one widget with a `range`. A spread reads whatever is
 * already in the tab (dated tasks and events) rather than keeping a private
 * copy, which is the only way a weekly and a monthly can agree with each other.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { EventItem, Sector, SpreadRange, Task, Widget } from '../../lib/types';
import { useDoc } from '../../lib/store';
import { Icon } from '../Icons';
import { Checkbox, Empty } from '../ui';
import {
  MONTHS, WEEKDAYS, addDays, isTaskDoneOn, parseDateStr, prettyTime, shiftMonth, today,
} from '../../lib/dates';
import { eventOnDay } from './CalendarWidget';
import { readableOn } from '../../lib/themes';

const RANGES: { id: SpreadRange; label: string }[] = [
  { id: 'future', label: 'Future' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'hourly', label: 'Hours' },
];

export function SpreadWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const events = useDoc((s) => s.doc.events);
  const tasks = useDoc((s) => s.doc.tasks);
  const addEvent = useDoc((s) => s.addEvent);
  const toggleTask = useDoc((s) => s.toggleTask);
  const patch = useDoc((s) => s.patchWidgetData);

  const accent = widget.accent ?? sector.accent;
  const range = widget.data.range ?? 'week';
  const t = today();
  const cursor = widget.data.cursor ?? t;

  /** Everything in this tab that lands on a given day. */
  const onDay = useMemo(() => {
    const mine = events.filter((e) => e.sectorId === sector.id);
    const dated = tasks.filter((x) => x.sectorId === sector.id && x.kind === 'dated' && x.dueDate);
    return (d: string) => ({
      events: mine.filter((e) => eventOnDay(e, d)),
      tasks: dated.filter((x) => x.dueDate === d),
    });
  }, [events, tasks, sector.id]);

  const quickAdd = (date: string, title: string, time?: string) => {
    if (!title.trim()) return;
    addEvent({
      widgetId: widget.id, sectorId: sector.id, kind: 'event',
      title: title.trim(), date, time,
    });
  };

  const shared = { widget, accent, cursor, t, onDay, quickAdd, toggleTask, setCursor: (c: string) => patch(widget.id, { cursor: c }) };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <div
          style={{
            display: 'flex', gap: 2, padding: 2, borderRadius: 999,
            border: '2px solid var(--line)', background: 'var(--surface-2)',
          }}
        >
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => patch(widget.id, { range: r.id, cursor: t })}
              aria-pressed={range === r.id}
              style={{
                padding: '3px 9px', borderRadius: 999, border: 'none', fontSize: 11.5, fontWeight: 700,
                background: range === r.id ? accent : 'transparent',
                color: range === r.id ? readableOn(accent) : 'var(--ink-faint)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {range === 'future' && <FutureLog {...shared} />}
      {range === 'month' && <MonthSpread {...shared} />}
      {range === 'week' && <WeekSpread {...shared} />}
      {range === 'day' && <DaySpread {...shared} />}
      {range === 'hourly' && <HourSpread {...shared} />}
    </div>
  );
}

interface SP {
  widget: Widget;
  accent: string;
  cursor: string;
  t: string;
  onDay: (d: string) => { events: EventItem[]; tasks: Task[] };
  quickAdd: (date: string, title: string, time?: string) => void;
  toggleTask: (id: string, date: string) => void;
  setCursor: (c: string) => void;
}

function Nav({ label, onPrev, onNext, onToday, showToday }: {
  label: string; onPrev: () => void; onNext: () => void; onToday: () => void; showToday: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <button className="btn ghost tiny" onClick={onPrev} aria-label="Previous"><Icon name="chevronLeft" size={13} /></button>
      <b style={{ flex: 1, textAlign: 'center', fontSize: 13 }}>{label}</b>
      {showToday && <button className="btn tiny" onClick={onToday}>Today</button>}
      <button className="btn ghost tiny" onClick={onNext} aria-label="Next"><Icon name="chevronRight" size={13} /></button>
    </div>
  );
}

/* ---------------- future log ---------------- */

function FutureLog({ widget, accent, cursor, t, onDay, quickAdd, setCursor }: SP) {
  const patch = useDoc((s) => s.patchWidgetData);
  const count = widget.data.months ?? 6;
  const start = cursor.slice(0, 7);
  const months = Array.from({ length: count }, (_, i) => shiftMonth(start, i));
  const [draft, setDraft] = useState<Record<string, string>>({});

  const inMonth = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    const days = new Date(y, mo, 0).getDate();
    const out: { date: string; title: string; done?: boolean }[] = [];
    for (let d = 1; d <= days; d++) {
      const date = `${m}-${String(d).padStart(2, '0')}`;
      const { events, tasks } = onDay(date);
      for (const e of events) out.push({ date, title: e.title });
      for (const x of tasks) out.push({ date, title: x.title, done: x.done });
    }
    return out;
  };

  return (
    <>
      <Nav
        label={`${MONTHS[Number(start.slice(5)) - 1]} ${start.slice(0, 4)} → +${count}`}
        onPrev={() => setCursor(`${shiftMonth(start, -count)}-01`)}
        onNext={() => setCursor(`${shiftMonth(start, count)}-01`)}
        onToday={() => setCursor(t)}
        showToday={start !== t.slice(0, 7)}
      />
      <div style={{ display: 'flex', gap: 4 }}>
        {[6, 12].map((n) => (
          <button key={n} className={`btn tiny ${count === n ? 'primary' : ''}`} onClick={() => patch(widget.id, { months: n })}>
            {n} months
          </button>
        ))}
      </div>
      <div
        className="scroll"
        style={{
          flex: 1, minHeight: 0,
          display: 'grid', gridTemplateColumns: count > 6 ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 7, alignContent: 'start',
        }}
      >
        {months.map((m) => {
          const [y, mo] = m.split('-').map(Number);
          const list = inMonth(m);
          const isNow = m === t.slice(0, 7);
          return (
            <div
              key={m}
              style={{
                border: isNow ? `2.5px solid ${accent}` : '2px solid var(--line)',
                borderRadius: 13, padding: 8, background: 'var(--surface-2)',
                minHeight: 96, display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, color: isNow ? 'var(--ink)' : 'var(--ink-soft)' }}>
                {MONTHS[mo - 1]} <span style={{ color: 'var(--ink-faint)' }}>{String(y).slice(2)}</span>
              </span>
              {list.slice(0, 6).map((x, i) => (
                <span key={i} style={{ fontSize: 11, lineHeight: 1.35, display: 'flex', gap: 4 }}>
                  <b style={{ color: 'var(--ink-faint)', minWidth: 14 }}>{Number(x.date.slice(8))}</b>
                  <span style={{ textDecoration: x.done ? 'line-through' : 'none' }}>{x.title}</span>
                </span>
              ))}
              {list.length > 6 && (
                <span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>+{list.length - 6} more</span>
              )}
              <input
                value={draft[m] ?? ''}
                onChange={(e) => setDraft({ ...draft, [m]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (draft[m] ?? '').trim()) {
                    quickAdd(`${m}-01`, draft[m]);
                    setDraft({ ...draft, [m]: '' });
                  }
                }}
                placeholder="+ something"
                aria-label={`Add to ${MONTHS[mo - 1]}`}
                style={{
                  marginTop: 'auto', padding: '3px 6px', fontSize: 10.5,
                  borderWidth: 2, borderStyle: 'dashed', borderRadius: 8,
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- monthly: one line per day ---------------- */

function MonthSpread({ accent, cursor, t, onDay, quickAdd, toggleTask, setCursor }: SP) {
  const month = cursor.slice(0, 7);
  const [y, mo] = month.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <>
      <Nav
        label={`${MONTHS[mo - 1]} ${y}`}
        onPrev={() => setCursor(`${shiftMonth(month, -1)}-01`)}
        onNext={() => setCursor(`${shiftMonth(month, 1)}-01`)}
        onToday={() => setCursor(t)}
        showToday={month !== t.slice(0, 7)}
      />
      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`;
          const dow = parseDateStr(date).getDay();
          const { events, tasks } = onDay(date);
          const isToday = date === t;
          const weekend = dow === 0 || dow === 6;
          return (
            <div
              key={date}
              style={{
                display: 'flex', gap: 6, alignItems: 'flex-start',
                padding: '3px 4px', borderRadius: 7,
                borderBottom: '1.5px dashed var(--line)',
                background: isToday ? `color-mix(in srgb, ${accent} 20%, transparent)` : 'transparent',
                opacity: weekend && !isToday ? 0.75 : 1,
              }}
            >
              <span style={{ minWidth: 34, fontSize: 11, color: 'var(--ink-faint)', paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                <b style={{ color: isToday ? 'var(--ink)' : undefined }}>{i + 1}</b> {WEEKDAYS[dow][0]}
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 2 }}>
                {tasks.map((x) => (
                  <span key={x.id} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 12 }}>
                    <Checkbox
                      checked={isTaskDoneOn(x, date)}
                      onChange={() => toggleTask(x.id, date)}
                      accent={accent}
                      size={15}
                      label={x.title}
                    />
                    <span style={{ textDecoration: x.done ? 'line-through' : 'none' }}>{x.title}</span>
                  </span>
                ))}
                {events.map((e) => (
                  <span key={e.id} style={{ fontSize: 12, display: 'flex', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: 999, background: accent, marginTop: 6, flexShrink: 0 }} />
                    {e.time && <b style={{ color: 'var(--ink-soft)', fontSize: 11 }}>{prettyTime(e.time)}</b>}
                    {e.title}
                  </span>
                ))}
                <input
                  value={draft[date] ?? ''}
                  onChange={(ev) => setDraft({ ...draft, [date]: ev.target.value })}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && (draft[date] ?? '').trim()) {
                      quickAdd(date, draft[date]);
                      setDraft({ ...draft, [date]: '' });
                    }
                  }}
                  placeholder=""
                  aria-label={`Add to ${date}`}
                  style={{
                    border: 'none', background: 'transparent', padding: '1px 2px',
                    fontSize: 12, width: '100%',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- weekly: seven columns ---------------- */

function WeekSpread({ accent, cursor, t, onDay, quickAdd, toggleTask, setCursor }: SP) {
  const start = useMemo(() => {
    const d = parseDateStr(cursor);
    return addDays(cursor, -d.getDay());
  }, [cursor]);
  const week = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const thisWeek = week.includes(t);

  return (
    <>
      <Nav
        label={`${MONTHS[parseDateStr(start).getMonth()].slice(0, 3)} ${parseDateStr(start).getDate()} – ${MONTHS[parseDateStr(week[6]).getMonth()].slice(0, 3)} ${parseDateStr(week[6]).getDate()}`}
        onPrev={() => setCursor(addDays(start, -7))}
        onNext={() => setCursor(addDays(start, 7))}
        onToday={() => setCursor(t)}
        showToday={!thisWeek}
      />
      <div
        className="scroll"
        style={{ flex: 1, minHeight: 0, display: 'flex', gap: 4, overflowX: 'auto', alignItems: 'stretch' }}
      >
        {week.map((date) => {
          const { events, tasks } = onDay(date);
          const isToday = date === t;
          const d = parseDateStr(date);
          return (
            <div
              key={date}
              style={{
                flex: '1 0 92px', minWidth: 88,
                border: isToday ? `2.5px solid ${accent}` : '2px solid var(--line)',
                borderRadius: 11, padding: 6, background: 'var(--surface-2)',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}
            >
              <span style={{ fontSize: 10.5, fontWeight: 700, color: isToday ? 'var(--ink)' : 'var(--ink-soft)' }}>
                {WEEKDAYS[d.getDay()]} <span style={{ color: 'var(--ink-faint)' }}>{d.getDate()}</span>
              </span>
              {tasks.map((x) => (
                <span key={x.id} style={{ display: 'flex', gap: 4, alignItems: 'flex-start', fontSize: 10.5, lineHeight: 1.3 }}>
                  <Checkbox checked={isTaskDoneOn(x, date)} onChange={() => toggleTask(x.id, date)} accent={accent} size={13} label={x.title} />
                  <span style={{ textDecoration: x.done ? 'line-through' : 'none', wordBreak: 'break-word' }}>{x.title}</span>
                </span>
              ))}
              {events.map((e) => (
                <span key={e.id} style={{ fontSize: 10.5, lineHeight: 1.3, wordBreak: 'break-word' }}>
                  {e.time && <b style={{ color: 'var(--ink-soft)' }}>{prettyTime(e.time)} </b>}
                  {e.title}
                </span>
              ))}
              <input
                value={draft[date] ?? ''}
                onChange={(ev) => setDraft({ ...draft, [date]: ev.target.value })}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' && (draft[date] ?? '').trim()) {
                    quickAdd(date, draft[date]);
                    setDraft({ ...draft, [date]: '' });
                  }
                }}
                placeholder="+"
                aria-label={`Add to ${date}`}
                style={{
                  marginTop: 'auto', border: 'none', background: 'transparent',
                  padding: '2px 3px', fontSize: 10.5, width: '100%',
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- daily: freeform, date at top ---------------- */

function DaySpread({ widget, accent, cursor, t, onDay, quickAdd, toggleTask, setCursor }: SP) {
  const patch = useDoc((s) => s.patchWidgetData);
  const { events, tasks } = onDay(cursor);
  const [draft, setDraft] = useState('');
  const d = parseDateStr(cursor);
  const notes = widget.data.entries?.[cursor]?.log ?? '';

  return (
    <>
      <Nav
        label={cursor === t ? 'Today' : `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`}
        onPrev={() => setCursor(addDays(cursor, -1))}
        onNext={() => setCursor(addDays(cursor, 1))}
        onToday={() => setCursor(t)}
        showToday={cursor !== t}
      />
      <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 6, alignContent: 'start' }}>
        {tasks.map((x) => (
          <span key={x.id} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 13 }}>
            <Checkbox checked={isTaskDoneOn(x, cursor)} onChange={() => toggleTask(x.id, cursor)} accent={accent} size={19} label={x.title} />
            <span style={{ textDecoration: x.done ? 'line-through' : 'none' }}>{x.title}</span>
          </span>
        ))}
        {events.map((e) => (
          <span key={e.id} style={{ display: 'flex', gap: 6, fontSize: 13, alignItems: 'baseline' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: accent, flexShrink: 0 }} />
            {e.time && <b style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{prettyTime(e.time)}</b>}
            {e.title}
          </span>
        ))}
        {!tasks.length && !events.length && <Empty icon="note">Nothing down for this day yet.</Empty>}

        <textarea
          value={notes}
          onChange={(e) =>
            patch(widget.id, {
              entries: { ...(widget.data.entries ?? {}), [cursor]: { log: e.target.value } },
            })
          }
          placeholder="Freeform. Anything."
          rows={5}
          aria-label="Day notes"
          style={{
            fontSize: 13, lineHeight: '24px', marginTop: 6,
            backgroundImage:
              'repeating-linear-gradient(transparent, transparent 23px, color-mix(in srgb, var(--ink) 10%, transparent) 23px, color-mix(in srgb, var(--ink) 10%, transparent) 24px)',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { quickAdd(cursor, draft); setDraft(''); } }}
          placeholder="Add to this day…"
          aria-label="Add to this day"
          style={{ flex: 1, padding: '5px 10px', fontSize: 12.5, borderWidth: 2 }}
        />
      </div>
    </>
  );
}

/* ---------------- hourly: a column of hours ---------------- */

function HourSpread({ widget, accent, cursor, t, onDay, quickAdd, setCursor }: SP) {
  const patch = useDoc((s) => s.patchWidgetData);
  const from = widget.data.dayStart ?? 7;
  const to = widget.data.dayEnd ?? 22;
  const { events } = onDay(cursor);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const d = parseDateStr(cursor);

  const hours = Array.from({ length: Math.max(1, to - from + 1) }, (_, i) => from + i);
  const atHour = (h: number) =>
    events.filter((e) => e.time && Number(e.time.slice(0, 2)) === h);
  const untimed = events.filter((e) => !e.time);

  return (
    <>
      <Nav
        label={cursor === t ? 'Today' : `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`}
        onPrev={() => setCursor(addDays(cursor, -1))}
        onNext={() => setCursor(addDays(cursor, 1))}
        onToday={() => setCursor(t)}
        showToday={cursor !== t}
      />
      {untimed.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {untimed.map((e) => (
            <span key={e.id} className="chip" style={{ padding: '1px 8px', fontSize: 10.5 }}>{e.title}</span>
          ))}
        </div>
      )}
      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {hours.map((h) => {
          const now = new Date();
          const isNow = cursor === t && now.getHours() === h;
          return (
            <div
              key={h}
              style={{
                display: 'flex', gap: 7, alignItems: 'stretch', minHeight: 30,
                borderTop: '1.5px solid var(--line)',
                background: isNow ? `color-mix(in srgb, ${accent} 18%, transparent)` : 'transparent',
              }}
            >
              <span
                style={{
                  minWidth: 34, fontSize: 10.5, color: 'var(--ink-faint)', paddingTop: 5,
                  fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                }}
              >
                {h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'a' : 'p'}
              </span>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 3, paddingBottom: 3, display: 'grid', gap: 2 }}>
                {atHour(h).map((e) => (
                  <motion.span
                    key={e.id}
                    layout
                    style={{
                      display: 'block', fontSize: 11.5, fontWeight: 600,
                      padding: '2px 7px', borderRadius: 7,
                      background: `color-mix(in srgb, ${accent} 40%, var(--surface))`,
                      border: '1.5px solid var(--line)',
                    }}
                  >
                    {prettyTime(e.time)} {e.title}
                  </motion.span>
                ))}
                <input
                  value={draft[h] ?? ''}
                  onChange={(ev) => setDraft({ ...draft, [h]: ev.target.value })}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' && (draft[h] ?? '').trim()) {
                      quickAdd(cursor, draft[h], `${String(h).padStart(2, '0')}:00`);
                      setDraft({ ...draft, [h]: '' });
                    }
                  }}
                  placeholder=""
                  aria-label={`Add at ${h}:00`}
                  style={{ border: 'none', background: 'transparent', padding: '1px 3px', fontSize: 11.5, width: '100%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11 }}>
        <span style={{ color: 'var(--ink-faint)' }}>hours</span>
        <input
          type="number" min={0} max={23} value={from}
          onChange={(e) => patch(widget.id, { dayStart: Math.min(23, Math.max(0, Number(e.target.value))) })}
          aria-label="Day starts at"
          style={{ width: 48, padding: '2px 6px', fontSize: 11, borderWidth: 2 }}
        />
        <span style={{ color: 'var(--ink-faint)' }}>to</span>
        <input
          type="number" min={0} max={23} value={to}
          onChange={(e) => patch(widget.id, { dayEnd: Math.min(23, Math.max(0, Number(e.target.value))) })}
          aria-label="Day ends at"
          style={{ width: 48, padding: '2px 6px', fontSize: 11, borderWidth: 2 }}
        />
      </div>
    </>
  );
}
