import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Checkbox } from './ui';
import { Icon } from './Icons';
import { EFFORTS, effortOf } from '../lib/effort';
import { useDoc, useUI } from '../lib/store';
import type { DateStr, Task } from '../lib/types';
import {
  WEEKDAYS, describeRecurrence, finishedOn, isTaskDoneOn, prettyTime, relativeDay, rolloverDays,
} from '../lib/dates';
import { play } from '../lib/sound';

/** Warm about failure — never a red "3 DAYS OVERDUE". */
function waitingLabel(days: number) {
  if (days === 1) return 'From yesterday — let’s try again today';
  if (days < 5) return `Waiting ${days} days — still here for you`;
  if (days < 14) return 'Been a while — worth keeping?';
  return 'Old friend. Do it or let it go, both fine';
}

interface Props {
  task: Task;
  date: DateStr;
  accent: string;
  /** show which tab this came from (used by the Today view) */
  sectorName?: string;
  dense?: boolean;
}

export function TaskRow({ task, date, accent, sectorName, dense }: Props) {
  const toggleTask = useDoc((s) => s.toggleTask);
  const updateTask = useDoc((s) => s.updateTask);
  const removeTask = useDoc((s) => s.removeTask);
  const addSubtask = useDoc((s) => s.addSubtask);
  const updateSubtask = useDoc((s) => s.updateSubtask);
  const removeSubtask = useDoc((s) => s.removeSubtask);
  const moveTask = useDoc((s) => s.moveTask);
  const settings = useDoc((s) => s.doc.settings);
  const cheer = useUI((s) => s.cheer);
  const setMood = useUI((s) => s.setMood);

  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState('');

  const done = isTaskDoneOn(task, date);
  const waiting = rolloverDays(task, date);
  const eff = effortOf(task.effort);
  const steps = task.subtasks.length;
  const stepsDone = task.subtasks.filter((s) => s.done).length;

  const tick = () => {
    const willBeDone = !done;
    toggleTask(task.id, date);
    if (willBeDone) {
      play('pop', settings.sound);
      if (settings.confetti) cheer();
      setMood('happy');
    }
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      style={{
        listStyle: 'none',
        background: open ? 'var(--surface-2)' : 'transparent',
        border: open ? '2px solid var(--line)' : '2px solid transparent',
        borderRadius: 'var(--r)',
        padding: open ? '8px 10px' : '2px 0',
        marginBottom: 4,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ paddingTop: 1 }}>
          <Checkbox checked={done} onChange={tick} accent={accent} size={dense ? 23 : 26} label={task.title} />
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left',
            minWidth: 0, display: 'block',
          }}
          aria-expanded={open}
        >
          <span
            style={{
              display: 'block', fontSize: dense ? 14 : 14.5, fontWeight: 600, lineHeight: 1.35,
              color: done ? 'var(--ink-faint)' : 'var(--ink)',
              textDecoration: done ? 'line-through' : 'none',
              textDecorationThickness: '2px',
              wordBreak: 'break-word',
            }}
          >
            {task.title}
          </span>

          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: done ? 0 : 4, alignItems: 'center' }}>
            {sectorName && (
              <span
                className="chip"
                style={{
                  borderColor: accent,
                  background: `color-mix(in srgb, ${accent} 30%, var(--surface))`,
                  color: 'var(--ink)',
                  padding: '2px 8px',
                  fontSize: 11,
                }}
              >
                {sectorName}
              </span>
            )}
            {eff && !done && (
              <span className="chip" style={{ padding: '2px 8px', fontSize: 11, background: `color-mix(in srgb, ${eff.tint} 34%, var(--surface))`, borderColor: eff.tint }}>
                <Icon name={eff.icon} size={11} /> {eff.label}
              </span>
            )}
            {task.kind === 'dated' && task.dueDate && !done && (
              <span className="chip" style={{ padding: '2px 8px', fontSize: 11 }}>
                <Icon name="calendar" size={11} /> {relativeDay(task.dueDate, date)}
                {task.dueTime ? ` · ${prettyTime(task.dueTime)}` : ''}
              </span>
            )}
            {task.recurrence && (
              <span className="chip" style={{ padding: '2px 8px', fontSize: 11 }}>
                <Icon name="repeat" size={11} /> {describeRecurrence(task.recurrence)}
              </span>
            )}
            {steps > 0 && (
              <span className="chip" style={{ padding: '2px 8px', fontSize: 11 }}>
                <Icon name="list" size={11} /> {stepsDone}/{steps}
              </span>
            )}
            {task.notes.trim() && !open && (
              <span className="chip" style={{ padding: '2px 8px', fontSize: 11 }}>
                <Icon name="note" size={11} /> note
              </span>
            )}
            {done && !finishedOn(task, date) && task.completedOn && (
              <span className="chip" style={{ padding: '2px 8px', fontSize: 11 }}>
                finished {relativeDay(task.completedOn, date)}
              </span>
            )}
          </span>

          {waiting > 0 && !done && (
            <span
              className="hand"
              style={{ display: 'block', fontSize: 15, color: 'var(--ink-soft)', marginTop: 2 }}
            >
              {waitingLabel(waiting)}
            </span>
          )}
        </button>

        <button
          className="btn ghost tiny"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Hide details' : 'Show details'}
          style={{ padding: 4 }}
        >
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ paddingTop: 10, display: 'grid', gap: 9 }}>
              <input
                value={task.title}
                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                aria-label="Task title"
                style={{ fontWeight: 700, fontSize: 14 }}
              />

              <textarea
                value={task.notes}
                onChange={(e) => updateTask(task.id, { notes: e.target.value })}
                placeholder="Notes — anything that helps future you…"
                rows={3}
                aria-label="Task notes"
                style={{ fontSize: 13.5 }}
              />

              {/* steps */}
              <div>
                {task.subtasks.map((s) => (
                  <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
                    <Checkbox
                      checked={s.done}
                      onChange={() => {
                        updateSubtask(task.id, s.id, { done: !s.done });
                        if (!s.done) play('tick', settings.sound);
                      }}
                      accent={accent}
                      size={19}
                      label={s.title}
                    />
                    <input
                      value={s.title}
                      onChange={(e) => updateSubtask(task.id, s.id, { title: e.target.value })}
                      aria-label="Step"
                      style={{
                        flex: 1, padding: '4px 9px', fontSize: 13, borderWidth: 2,
                        textDecoration: s.done ? 'line-through' : 'none',
                        color: s.done ? 'var(--ink-faint)' : 'var(--ink)',
                      }}
                    />
                    <button className="btn ghost tiny" onClick={() => removeSubtask(task.id, s.id)} aria-label="Remove step" style={{ padding: 3 }}>
                      <Icon name="close" size={13} />
                    </button>
                  </div>
                ))}
                <input
                  value={sub}
                  onChange={(e) => setSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sub.trim()) {
                      addSubtask(task.id, sub.trim());
                      setSub('');
                    }
                  }}
                  placeholder="+ break it into steps"
                  aria-label="Add a step"
                  style={{ width: '100%', padding: '5px 10px', fontSize: 13, borderWidth: 2, borderStyle: 'dashed' }}
                />
              </div>

              <TaskControls task={task} />

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="btn ghost tiny"
                  onClick={() => moveTask(task.id, -1)}
                  aria-label="Move up the list"
                  title="Move up"
                  style={{ padding: 4 }}
                >
                  <Icon name="chevronUp" size={13} />
                </button>
                <button
                  className="btn ghost tiny"
                  onClick={() => moveTask(task.id, 1)}
                  aria-label="Move down the list"
                  title="Move down"
                  style={{ padding: 4 }}
                >
                  <Icon name="chevronDown" size={13} />
                </button>
                <span style={{ flex: 1 }} />
                <button
                  className="btn ghost tiny"
                  style={{ color: '#B4544A' }}
                  onClick={() => removeTask(task.id)}
                >
                  <Icon name="trash" size={13} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/** Kind, date, effort and repeat — shared by the task row and the quick-add bar. */
export function TaskControls({ task }: { task: Task }) {
  const updateTask = useDoc((s) => s.updateTask);
  const r = task.recurrence;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>Type</span>
        <button
          className={`btn tiny ${task.kind === 'floating' ? 'primary' : ''}`}
          onClick={() => updateTask(task.id, { kind: 'floating', dueDate: undefined, dueTime: undefined })}
          title="Rolls over until it’s done"
        >
          Floating
        </button>
        <button
          className={`btn tiny ${task.kind === 'dated' ? 'primary' : ''}`}
          onClick={() => updateTask(task.id, { kind: 'dated' })}
          title="Stays on its day"
        >
          Dated
        </button>
        {task.kind === 'dated' && (
          <>
            <input
              type="date"
              value={task.dueDate ?? ''}
              onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
              aria-label="Due date"
              style={{ padding: '4px 8px', fontSize: 12.5, borderWidth: 2 }}
            />
            <input
              type="time"
              value={task.dueTime ?? ''}
              onChange={(e) => updateTask(task.id, { dueTime: e.target.value || undefined })}
              aria-label="Time"
              style={{ padding: '4px 8px', fontSize: 12.5, borderWidth: 2 }}
            />
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>Effort</span>
        {EFFORTS.map((e) => (
          <button
            key={e.id}
            className={`btn tiny ${task.effort === e.id ? 'primary' : ''}`}
            onClick={() => updateTask(task.id, { effort: task.effort === e.id ? undefined : e.id })}
          >
            <Icon name={e.icon} size={12} /> {e.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>Repeat</span>
        <button
          className={`btn tiny ${!r ? 'primary' : ''}`}
          onClick={() => updateTask(task.id, { recurrence: undefined })}
        >
          Never
        </button>
        {(['daily', 'weekly', 'monthly'] as const).map((f) => (
          <button
            key={f}
            className={`btn tiny ${r?.freq === f ? 'primary' : ''}`}
            onClick={() =>
              updateTask(task.id, {
                recurrence: {
                  freq: f,
                  weekdays: f === 'weekly' ? (r?.weekdays ?? [new Date().getDay()]) : undefined,
                  monthDay: f === 'monthly' ? (r?.monthDay ?? new Date().getDate()) : undefined,
                },
                completions: task.completions ?? [],
              })
            }
          >
            {f}
          </button>
        ))}
      </div>

      {r?.freq === 'weekly' && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {WEEKDAYS.map((d, i) => {
            const on = (r.weekdays ?? []).includes(i);
            return (
              <button
                key={d}
                className={`btn tiny ${on ? 'primary' : ''}`}
                style={{ padding: '4px 8px', minWidth: 38, justifyContent: 'center' }}
                onClick={() => {
                  const cur = r.weekdays ?? [];
                  updateTask(task.id, {
                    recurrence: {
                      ...r,
                      weekdays: on ? cur.filter((x) => x !== i) : [...cur, i].sort(),
                    },
                  });
                }}
                aria-pressed={on}
              >
                {d[0]}
              </button>
            );
          })}
        </div>
      )}

      {r?.freq === 'monthly' && (
        <input
          type="number"
          min={1}
          max={31}
          value={r.monthDay ?? 1}
          onChange={(e) => updateTask(task.id, { recurrence: { ...r, monthDay: Number(e.target.value) } })}
          aria-label="Day of month"
          style={{ width: 90, padding: '4px 8px', fontSize: 12.5, borderWidth: 2 }}
        />
      )}
    </div>
  );
}
