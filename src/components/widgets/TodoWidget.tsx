import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useDoc } from '../../lib/store';
import type { EffortTag, Recurrence, Sector, Widget } from '../../lib/types';
import { finishedOn, isTaskDoneOn, taskAppearsOn, today as todayStr } from '../../lib/dates';
import { EFFORTS } from '../../lib/effort';
import { Icon } from '../Icons';
import { Empty } from '../ui';
import { TaskRow } from '../TaskRow';

export function TodoWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const tasks = useDoc((s) => s.doc.tasks);
  const addTask = useDoc((s) => s.addTask);
  const patchData = useDoc((s) => s.patchWidgetData);

  const [draft, setDraft] = useState('');
  const [showOpts, setShowOpts] = useState(false);
  const [kind, setKind] = useState<'floating' | 'dated'>('floating');
  const [dueDate, setDueDate] = useState(todayStr());
  const [effort, setEffort] = useState<EffortTag | undefined>();
  const [repeat, setRepeat] = useState<Recurrence | undefined>();

  const accent = widget.accent ?? sector.accent;
  const today = todayStr();
  const filter = widget.data.effortFilter ?? 'all';
  const hideDone = widget.data.hideCompleted ?? false;

  const mine = useMemo(
    () => tasks.filter((t) => t.widgetId === widget.id).sort((a, b) => a.order - b.order),
    [tasks, widget.id],
  );

  const groups = useMemo(() => {
    const now: typeof mine = [];
    const earlier: typeof mine = [];
    const later: typeof mine = [];
    const done: typeof mine = [];
    for (const t of mine) {
      if (isTaskDoneOn(t, today)) { done.push(t); continue; }
      if (taskAppearsOn(t, today)) { now.push(t); continue; }
      if (t.kind === 'dated' && t.dueDate && t.dueDate < today) { earlier.push(t); continue; }
      if (t.kind === 'dated' && t.dueDate && t.dueDate > today) { later.push(t); continue; }
      if (!t.recurrence) now.push(t);
    }
    // most recent finishes at the top of the done pile
    done.sort((a, b) => (b.completedOn ?? b.createdOn).localeCompare(a.completedOn ?? a.createdOn));
    // longest-waiting first, so the thing you keep skipping is at eye level
    now.sort((a, b) => a.createdOn.localeCompare(b.createdOn));
    later.sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    return { now, earlier, later, done };
  }, [mine, today]);

  const pass = (e?: EffortTag) => filter === 'all' || e === filter;
  const visibleNow = groups.now.filter((t) => pass(t.effort));

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    addTask({
      widgetId: widget.id,
      sectorId: widget.sectorId,
      title,
      kind,
      dueDate: kind === 'dated' ? dueDate : undefined,
      effort,
      recurrence: repeat,
    });
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, flex: 1 }}>
      {/* energy filter — "what have I got in me right now" */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          className={`chip ${filter === 'all' ? 'on' : ''}`}
          onClick={() => patchData(widget.id, { effortFilter: 'all' })}
        >
          All
        </button>
        {EFFORTS.map((e) => (
          <button
            key={e.id}
            className={`chip ${filter === e.id ? 'on' : ''}`}
            onClick={() => patchData(widget.id, { effortFilter: filter === e.id ? 'all' : e.id })}
            style={filter === e.id ? { background: `color-mix(in srgb, ${e.tint} 40%, var(--surface))`, borderColor: e.tint } : undefined}
          >
            <Icon name={e.icon} size={12} /> {e.short}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button
          className="btn ghost tiny"
          onClick={() => patchData(widget.id, { hideCompleted: !hideDone })}
          title={hideDone ? 'Show finished' : 'Hide finished'}
        >
          <Icon name={hideDone ? 'chevronDown' : 'check'} size={13} />
          {groups.done.length > 0 ? ` ${groups.done.length}` : ''}
        </button>
      </div>

      {/* quick add */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="What needs doing?"
          aria-label="New task"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button
          className={`btn icon ${showOpts ? 'primary' : ''}`}
          onClick={() => setShowOpts((v) => !v)}
          aria-label="Task options"
          aria-expanded={showOpts}
          style={{ padding: 8 }}
        >
          <Icon name="gear" size={15} />
        </button>
        <button className="btn icon primary" onClick={submit} aria-label="Add task" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      {showOpts && (
        <div
          style={{
            display: 'grid', gap: 7, padding: 9, borderRadius: 'var(--r)',
            border: '2px dashed var(--line)', background: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className={`btn tiny ${kind === 'floating' ? 'primary' : ''}`} onClick={() => setKind('floating')}>
              Floating
            </button>
            <button className={`btn tiny ${kind === 'dated' ? 'primary' : ''}`} onClick={() => setKind('dated')}>
              Dated
            </button>
            {kind === 'dated' && (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date for new task"
                style={{ padding: '4px 8px', fontSize: 12.5, borderWidth: 2 }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {EFFORTS.map((e) => (
              <button
                key={e.id}
                className={`btn tiny ${effort === e.id ? 'primary' : ''}`}
                onClick={() => setEffort(effort === e.id ? undefined : e.id)}
              >
                <Icon name={e.icon} size={12} /> {e.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>Repeat</span>
            <button className={`btn tiny ${!repeat ? 'primary' : ''}`} onClick={() => setRepeat(undefined)}>Never</button>
            {(['daily', 'weekly', 'monthly'] as const).map((f) => (
              <button
                key={f}
                className={`btn tiny ${repeat?.freq === f ? 'primary' : ''}`}
                onClick={() =>
                  setRepeat({
                    freq: f,
                    weekdays: f === 'weekly' ? [new Date().getDay()] : undefined,
                    monthDay: f === 'monthly' ? new Date().getDate() : undefined,
                  })
                }
              >
                {f}
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.4 }}>
            Floating tasks quietly roll over until they’re done. Dated ones stay on their day.
          </p>
        </div>
      )}

      {/* lists */}
      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {mine.length === 0 && (
          <Empty icon="sparkle">Nothing here yet! Your list is having a nap. 🌙</Empty>
        )}

        <ul style={{ margin: 0, padding: 0 }}>
          <AnimatePresence initial={false}>
            {visibleNow.map((t) => (
              <TaskRow key={t.id} task={t} date={today} accent={accent} />
            ))}
          </AnimatePresence>
        </ul>

        {visibleNow.length === 0 && mine.length > 0 && groups.now.length > 0 && (
          <Empty>Nothing matching that energy right now.</Empty>
        )}

        {groups.now.length === 0 && mine.length > 0 && (
          <Empty icon="check">All clear for today. Go be a person.</Empty>
        )}

        {groups.earlier.length > 0 && (
          <Section label="From earlier" hint="dated things that slipped by">
            <ul style={{ margin: 0, padding: 0 }}>
              <AnimatePresence initial={false}>
                {groups.earlier.filter((t) => pass(t.effort)).map((t) => (
                  <TaskRow key={t.id} task={t} date={today} accent={accent} />
                ))}
              </AnimatePresence>
            </ul>
          </Section>
        )}

        {groups.later.length > 0 && (
          <Section label="Coming up">
            <ul style={{ margin: 0, padding: 0 }}>
              <AnimatePresence initial={false}>
                {groups.later.filter((t) => pass(t.effort)).map((t) => (
                  <TaskRow key={t.id} task={t} date={today} accent={accent} />
                ))}
              </AnimatePresence>
            </ul>
          </Section>
        )}

        {!hideDone && groups.done.length > 0 && (
          <Section
            label={`Done · ${groups.done.length}`}
            hint={groups.done.some((t) => !finishedOn(t, today)) ? 'includes things you finished on other days' : undefined}
          >
            <ul style={{ margin: 0, padding: 0 }}>
              <AnimatePresence initial={false}>
                {groups.done.map((t) => (
                  <TaskRow key={t.id} task={t} date={today} accent={accent} />
                ))}
              </AnimatePresence>
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}

export function Section({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
          fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}
      >
        <span>{label}</span>
        <span style={{ flex: 1, height: 2, background: 'var(--line)', borderRadius: 2, opacity: 0.5 }} />
      </div>
      {hint && (
        <p style={{ margin: '-2px 0 6px', fontSize: 11.5, color: 'var(--ink-faint)' }}>{hint}</p>
      )}
      {children}
    </div>
  );
}
