import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useDoc } from '../../lib/store';
import type { EventItem, Sector, Task, Widget } from '../../lib/types';
import {
  MONTHS, WEEKDAYS, monthCursorOf, monthGrid, parseDateStr, prettyTime,
  shiftMonth, today as todayStr,
} from '../../lib/dates';
import { Icon } from '../Icons';
import { readableOn } from '../../lib/themes';

/** Yearly milestones repeat on the same month + day, whatever the year. */
export function eventOnDay(e: EventItem, date: string) {
  return e.yearly ? e.date.slice(5) === date.slice(5) : e.date === date;
}

export function CalendarWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const events = useDoc((s) => s.doc.events);
  const tasks = useDoc((s) => s.doc.tasks);
  const sectors = useDoc((s) => s.doc.sectors);
  const addEvent = useDoc((s) => s.addEvent);
  const removeEvent = useDoc((s) => s.removeEvent);
  const patchData = useDoc((s) => s.patchWidgetData);

  const today = todayStr();
  const cursor = widget.data.monthCursor ?? monthCursorOf(today);
  const [selected, setSelected] = useState(today);
  const [draft, setDraft] = useState('');
  const accent = widget.accent ?? sector.accent;

  const grid = useMemo(() => monthGrid(cursor), [cursor]);

  // A calendar is only useful if it shows everything that day holds, so it
  // pulls dated tasks in as well as events.
  const byDay = useMemo(() => {
    const map = new Map<string, { events: EventItem[]; tasks: Task[] }>();
    const touch = (d: string) => {
      if (!map.has(d)) map.set(d, { events: [], tasks: [] });
      return map.get(d)!;
    };
    for (const e of events) {
      if (e.sectorId !== widget.sectorId) continue;
      if (e.yearly) {
        for (const d of grid) if (eventOnDay(e, d)) touch(d).events.push(e);
      } else if (grid.includes(e.date)) {
        touch(e.date).events.push(e);
      }
    }
    for (const t of tasks) {
      if (t.sectorId !== widget.sectorId || t.kind !== 'dated' || !t.dueDate) continue;
      if (grid.includes(t.dueDate)) touch(t.dueDate).tasks.push(t);
    }
    return map;
  }, [events, tasks, grid, widget.sectorId]);

  const [y, m] = cursor.split('-').map(Number);
  const dayItems = byDay.get(selected) ?? { events: [], tasks: [] };

  const addForSelected = () => {
    const title = draft.trim();
    if (!title) return;
    addEvent({
      widgetId: widget.id, sectorId: widget.sectorId, kind: 'event',
      title, date: selected,
    });
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          className="btn ghost tiny"
          onClick={() => patchData(widget.id, { monthCursor: shiftMonth(cursor, -1) })}
          aria-label="Previous month"
        >
          <Icon name="chevronLeft" size={15} />
        </button>
        <h4 style={{ flex: 1, textAlign: 'center', fontSize: 14.5 }}>
          {MONTHS[m - 1]} {y}
        </h4>
        <button
          className="btn ghost tiny"
          onClick={() => patchData(widget.id, { monthCursor: shiftMonth(cursor, 1) })}
          aria-label="Next month"
        >
          <Icon name="chevronRight" size={15} />
        </button>
        {cursor !== monthCursorOf(today) && (
          <button
            className="btn tiny"
            onClick={() => { patchData(widget.id, { monthCursor: monthCursorOf(today) }); setSelected(today); }}
          >
            Today
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-faint)' }}>
            {d[0]}
          </div>
        ))}
        {grid.map((d) => {
          const inMonth = d.slice(0, 7) === cursor;
          const isToday = d === today;
          const isSel = d === selected;
          const items = byDay.get(d);
          const count = (items?.events.length ?? 0) + (items?.tasks.length ?? 0);
          return (
            <motion.button
              key={d}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelected(d)}
              aria-label={`${d}${count ? `, ${count} things` : ''}`}
              aria-pressed={isSel}
              style={{
                aspectRatio: '1 / 1',
                minHeight: 26,
                borderRadius: 10,
                border: isToday ? `3px solid ${accent}` : '2px solid transparent',
                background: isSel ? accent : 'transparent',
                color: isSel ? readableOn(accent, '#4A3B35') : inMonth ? 'var(--ink)' : 'var(--ink-faint)',
                opacity: inMonth ? 1 : 0.45,
                fontWeight: isToday || isSel ? 700 : 600,
                fontSize: 12,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 1,
                padding: 0,
              }}
            >
              {parseDateStr(d).getDate()}
              <span style={{ display: 'flex', gap: 2, height: 4 }}>
                {count > 0 &&
                  Array.from({ length: Math.min(3, count) }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        width: 4, height: 4, borderRadius: 999,
                        background: isSel ? readableOn(accent, '#4A3B35') : accent,
                      }}
                    />
                  ))}
              </span>
            </motion.button>
          );
        })}
      </div>

      <div style={{ height: 2, background: 'var(--line)', borderRadius: 2, opacity: 0.4 }} />

      <div className="scroll" style={{ flex: 1, minHeight: 46 }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)' }}>
          {selected === today ? 'Today' : new Date(parseDateStr(selected)).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        {dayItems.events.length === 0 && dayItems.tasks.length === 0 && (
          <p className="hand" style={{ margin: 0, fontSize: 17, color: 'var(--ink-faint)' }}>
            A clear day.
          </p>
        )}
        {dayItems.events.map((e) => (
          <div key={e.id} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, wordBreak: 'break-word' }}>
              {e.time && <b>{prettyTime(e.time)} </b>}
              {e.title}
              {e.yearly && <span style={{ color: 'var(--ink-faint)' }}> · yearly</span>}
            </span>
            <button className="btn ghost tiny" onClick={() => removeEvent(e.id)} aria-label={`Remove ${e.title}`} style={{ padding: 3 }}>
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
        {dayItems.tasks.map((t) => (
          <div key={t.id} style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 4, opacity: t.done ? 0.55 : 1 }}>
            <Icon name="check" size={12} color="var(--ink-faint)" />
            <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? 'line-through' : 'none' }}>
              {t.dueTime && <b>{prettyTime(t.dueTime)} </b>}{t.title}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {sectors.find((s) => s.id === t.sectorId)?.name}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addForSelected(); } }}
          placeholder="Add to this day…"
          aria-label="Add an event to the selected day"
          style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderWidth: 2 }}
        />
        <button className="btn icon primary" onClick={addForSelected} aria-label="Add event" style={{ padding: 6 }}>
          <Icon name="plus" size={15} />
        </button>
      </div>
    </div>
  );
}
