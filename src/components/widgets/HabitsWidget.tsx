import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc, useUI } from '../../lib/store';
import type { Sector, Task, Widget } from '../../lib/types';
import { addDays, describeRecurrence, recurrenceHitsOn, today as todayStr, WEEKDAYS, parseDateStr } from '../../lib/dates';
import { Icon } from '../Icons';
import { Empty } from '../ui';
import { play } from '../../lib/sound';
import { readableOn } from '../../lib/themes';
import { TaskControls } from '../TaskRow';

/** Consecutive scheduled days ticked off, counting back from today. */
function streakOf(task: Task, from: string): number {
  if (!task.recurrence) return 0;
  const done = new Set(task.completions ?? []);
  let streak = 0;
  let cursor = from;
  for (let i = 0; i < 400; i++) {
    if (recurrenceHitsOn(task.recurrence, cursor)) {
      if (done.has(cursor)) streak += 1;
      // today not being ticked yet shouldn't break a run
      else if (cursor !== from) break;
    }
    cursor = addDays(cursor, -1);
    if (cursor < task.createdOn) break;
  }
  return streak;
}

export function HabitsWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const tasks = useDoc((s) => s.doc.tasks);
  const addTask = useDoc((s) => s.addTask);
  const toggleTask = useDoc((s) => s.toggleTask);
  const updateTask = useDoc((s) => s.updateTask);
  const removeTask = useDoc((s) => s.removeTask);
  const settings = useDoc((s) => s.doc.settings);
  const setMood = useUI((s) => s.setMood);

  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const accent = widget.accent ?? sector.accent;
  const today = todayStr();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)),
    [today],
  );

  const habits = useMemo(
    () => tasks.filter((t) => t.widgetId === widget.id).sort((a, b) => a.order - b.order),
    [tasks, widget.id],
  );

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    addTask({
      widgetId: widget.id,
      sectorId: widget.sectorId,
      title,
      kind: 'floating',
      recurrence: { freq: 'daily' },
    });
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Something you'd like to do often…"
          aria-label="New habit"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button className="btn icon primary" onClick={add} aria-label="Add habit" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 26px)', gap: 4, alignItems: 'center' }}>
        <span />
        {days.map((d) => (
          <span key={d} style={{ fontSize: 10, textAlign: 'center', color: 'var(--ink-faint)', fontWeight: 700 }}>
            {WEEKDAYS[parseDateStr(d).getDay()][0]}
          </span>
        ))}
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {habits.length === 0 && <Empty icon="repeat">No habits yet. Start with one small thing.</Empty>}
        <AnimatePresence initial={false}>
          {habits.map((h) => {
            const completions = new Set(h.completions ?? []);
            const streak = streakOf(h, today);
            const isOpen = open === h.id;
            return (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: 8 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(7, 26px)', gap: 4, alignItems: 'center' }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : h.id)}
                    style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
                    aria-expanded={isOpen}
                  >
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, wordBreak: 'break-word' }}>
                      {h.title}
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-faint)' }}>
                      {h.recurrence ? describeRecurrence(h.recurrence) : 'no repeat'}
                      {streak > 1 ? ` · ${streak} in a row` : ''}
                    </span>
                  </button>
                  {days.map((d) => {
                    const scheduled = h.recurrence ? recurrenceHitsOn(h.recurrence, d) : false;
                    const on = completions.has(d);
                    return (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.82 }}
                        animate={on ? { scale: [1, 0.84, 1.12, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                        onClick={() => {
                          toggleTask(h.id, d);
                          if (!on) { play('pop', settings.sound); setMood('happy'); }
                        }}
                        aria-label={`${h.title} on ${d}`}
                        aria-pressed={on}
                        style={{
                          width: 26, height: 26, borderRadius: 9, padding: 0,
                          border: `2px ${scheduled ? 'solid' : 'dashed'} var(--line)`,
                          background: on ? accent : 'var(--surface)',
                          opacity: scheduled || on ? 1 : 0.4,
                          display: 'grid', placeItems: 'center',
                          color: readableOn(accent, '#4A3B35'),
                        }}
                      >
                        {on && <Icon name="check" size={13} stroke={3} />}
                      </motion.button>
                    );
                  })}
                </div>

                {isOpen && (
                  <div style={{ display: 'grid', gap: 7, marginTop: 8, padding: 9, border: '2px solid var(--line)', borderRadius: 'var(--r)', background: 'var(--surface-2)' }}>
                    <input value={h.title} onChange={(e) => updateTask(h.id, { title: e.target.value })} aria-label="Habit name" style={{ fontSize: 13.5, borderWidth: 2 }} />
                    <TaskControls task={h} />
                    <textarea value={h.notes} onChange={(e) => updateTask(h.id, { notes: e.target.value })} placeholder="Why, or how it goes…" rows={2} style={{ fontSize: 13 }} />
                    <button className="btn ghost tiny" style={{ color: '#B4544A', justifySelf: 'start' }} onClick={() => removeTask(h.id)}>
                      <Icon name="trash" size={13} /> Delete habit
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
