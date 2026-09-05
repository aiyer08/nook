import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc, useUI } from '../../lib/store';
import type { Sector, Widget } from '../../lib/types';
import { Icon } from '../Icons';
import { Checkbox, Empty } from '../ui';
import { play } from '../../lib/sound';
import { relativeDay } from '../../lib/dates';

export function GoalsWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const allGoals = useDoc((s) => s.doc.goals);
  const goals = useMemo(() => allGoals.filter((g) => g.widgetId === widget.id), [allGoals, widget.id]);
  const addGoal = useDoc((s) => s.addGoal);
  const updateGoal = useDoc((s) => s.updateGoal);
  const removeGoal = useDoc((s) => s.removeGoal);
  const settings = useDoc((s) => s.doc.settings);
  const cheer = useUI((s) => s.cheer);
  const setMood = useUI((s) => s.setMood);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const accent = widget.accent ?? sector.accent;

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    addGoal({
      widgetId: widget.id, sectorId: widget.sectorId, title,
      target: 10, current: 0, unit: 'steps', notes: '', done: false,
    });
    setDraft('');
  };

  const bump = (id: string, current: number, target: number, delta: number) => {
    const next = Math.max(0, Math.min(target, current + delta));
    updateGoal(id, { current: next });
    if (delta > 0) {
      play(next >= target ? 'chime' : 'tick', settings.sound);
      if (next >= target) {
        if (settings.confetti) cheer();
        setMood('cheer', 2800);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Something you're working toward…"
          aria-label="New goal"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button className="btn icon primary" onClick={add} aria-label="Add goal" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {goals.length === 0 && <Empty icon="target">No goals yet — that’s allowed too.</Empty>}
        <AnimatePresence initial={false}>
          {goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
            const isOpen = open === g.id;
            return (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  border: '2px solid var(--line)', borderRadius: 'var(--r)',
                  padding: 10, marginBottom: 8, background: 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <Checkbox
                    checked={g.done}
                    accent={accent}
                    size={22}
                    label={g.title}
                    onChange={() => {
                      const next = !g.done;
                      updateGoal(g.id, { done: next, current: next ? g.target : g.current });
                      if (next) {
                        play('chime', settings.sound);
                        if (settings.confetti) cheer();
                        setMood('cheer', 2800);
                      }
                    }}
                  />
                  <button
                    onClick={() => setOpen(isOpen ? null : g.id)}
                    style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
                    aria-expanded={isOpen}
                  >
                    <span
                      style={{
                        display: 'block', fontWeight: 700, fontSize: 14,
                        textDecoration: g.done ? 'line-through' : 'none',
                        color: g.done ? 'var(--ink-faint)' : 'var(--ink)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {g.title}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {g.current} / {g.target} {g.unit}
                      {g.dueDate ? ` · by ${relativeDay(g.dueDate)}` : ''}
                    </span>
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink-soft)' }}>{pct}%</span>
                </div>

                {/* progress */}
                <div
                  style={{
                    height: 14, borderRadius: 999, border: '2px solid var(--line)',
                    background: 'var(--surface)', marginTop: 8, overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${g.title} progress`}
                >
                  <motion.div
                    animate={{ width: `${pct}%` }}
                    transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                    style={{ height: '100%', background: accent, borderRadius: 999 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <button className="btn tiny" onClick={() => bump(g.id, g.current, g.target, -1)} aria-label="Less progress">
                    −
                  </button>
                  <button className="btn tiny primary" onClick={() => bump(g.id, g.current, g.target, 1)} aria-label="More progress">
                    +1
                  </button>
                  <span style={{ flex: 1 }} />
                  <button className="btn ghost tiny" onClick={() => setOpen(isOpen ? null : g.id)}>
                    <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={13} /> Edit
                  </button>
                </div>

                {isOpen && (
                  <div style={{ display: 'grid', gap: 7, marginTop: 9 }}>
                    <input
                      value={g.title}
                      onChange={(e) => updateGoal(g.id, { title: e.target.value })}
                      aria-label="Goal title"
                      style={{ fontSize: 13.5, borderWidth: 2 }}
                    />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        Target
                        <input
                          type="number"
                          min={1}
                          value={g.target}
                          onChange={(e) => updateGoal(g.id, { target: Math.max(1, Number(e.target.value)) })}
                          style={{ width: 74, padding: '4px 8px', borderWidth: 2, fontSize: 12.5 }}
                        />
                      </label>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        Unit
                        <input
                          value={g.unit}
                          onChange={(e) => updateGoal(g.id, { unit: e.target.value })}
                          style={{ width: 96, padding: '4px 8px', borderWidth: 2, fontSize: 12.5 }}
                        />
                      </label>
                      <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        By
                        <input
                          type="date"
                          value={g.dueDate ?? ''}
                          onChange={(e) => updateGoal(g.id, { dueDate: e.target.value || undefined })}
                          style={{ padding: '4px 8px', borderWidth: 2, fontSize: 12.5 }}
                        />
                      </label>
                    </div>
                    <textarea
                      value={g.notes}
                      onChange={(e) => updateGoal(g.id, { notes: e.target.value })}
                      placeholder="Why this matters…"
                      rows={2}
                      style={{ fontSize: 13 }}
                    />
                    <button className="btn ghost tiny" style={{ color: '#B4544A', justifySelf: 'start' }} onClick={() => removeGoal(g.id)}>
                      <Icon name="trash" size={13} /> Delete goal
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
