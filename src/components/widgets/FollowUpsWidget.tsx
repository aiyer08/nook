/**
 * Emails to follow up on.
 *
 * Two things make this useful rather than another list:
 *
 *  1. **Waiting on them versus waiting on me.** Those are different feelings
 *     and need opposite actions — one is a nudge, the other is a task — so
 *     they're split rather than mixed into one queue.
 *  2. **The card ages.** Neutral inside the window you chose, amber once it
 *     passes, red when it's well past. You see the temperature, not a date you
 *     have to do arithmetic on.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FollowUp, Sector, Widget } from '../../lib/types';
import { useDoc, useUI } from '../../lib/store';
import { Icon } from '../Icons';
import { Checkbox, Empty } from '../ui';
import { daysBetween, prettyDate, today } from '../../lib/dates';
import { play } from '../../lib/sound';
import { Section } from './TodoWidget';
import { uid } from '../../lib/id';

type Heat = 'fresh' | 'due' | 'late';

/** Neutral until the nudge window passes, then amber, then red at double. */
export function heatOf(f: FollowUp, now = today()): { heat: Heat; overdueBy: number } {
  const waited = daysBetween(f.sentOn, now);
  const overdueBy = waited - f.nudgeAfter;
  if (overdueBy < 0) return { heat: 'fresh', overdueBy };
  if (overdueBy < f.nudgeAfter) return { heat: 'due', overdueBy };
  return { heat: 'late', overdueBy };
}

const HEAT_COLOR: Record<Heat, string> = {
  fresh: 'var(--line)',
  due: '#E0A75C',
  late: '#C4685C',
};

export function FollowUpsWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const sound = useDoc((s) => s.doc.settings.sound);
  const toast = useUI((s) => s.toast);

  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'them' | 'me'>('all');

  // `?? []` would be a new array every render, defeating the memo below
  const list = useMemo(() => widget.data.followups ?? [], [widget.data.followups]);
  const accent = widget.accent ?? sector.accent;
  const now = today();

  const write = (next: FollowUp[]) => patch(widget.id, { followups: next });
  const edit = (id: string, p: Partial<FollowUp>) =>
    write(list.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const add = () => {
    const person = draft.trim();
    if (!person) return;
    const item: FollowUp = {
      id: uid(), person, subject: '', sentOn: now,
      nudgeAfter: 5, waitingOn: 'them', done: false,
    };
    write([item, ...list]);
    setDraft('');
    setOpen(item.id);
  };

  const { open: waiting, done } = useMemo(() => {
    const sorted = [...list].sort(
      (a, b) => heatOf(b, now).overdueBy - heatOf(a, now).overdueBy,
    );
    return {
      open: sorted.filter((f) => !f.done),
      done: sorted.filter((f) => f.done),
    };
  }, [list, now]);

  const shown = waiting.filter((f) => filter === 'all' || f.waitingOn === filter);
  const nudgeCount = waiting.filter((f) => heatOf(f, now).heat !== 'fresh').length;
  const mineCount = waiting.filter((f) => f.waitingOn === 'me').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
          All {waiting.length}
        </button>
        <button className={`chip ${filter === 'them' ? 'on' : ''}`} onClick={() => setFilter('them')}>
          Waiting on them
        </button>
        <button className={`chip ${filter === 'me' ? 'on' : ''}`} onClick={() => setFilter('me')}>
          On me {mineCount > 0 ? mineCount : ''}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Who did you email?"
          aria-label="Person"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
        />
        <button className="btn icon primary" onClick={add} aria-label="Add follow-up" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      {nudgeCount > 0 && (
        <p className="hand" style={{ margin: 0, fontSize: 17, color: 'var(--ink-soft)' }}>
          {nudgeCount === 1 ? 'One thing has gone quiet.' : `${nudgeCount} things have gone quiet.`}
        </p>
      )}

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {list.length === 0 && (
          <Empty icon="clock">
            Nothing outstanding. Add someone and pick how long to wait before a nudge.
          </Empty>
        )}
        {list.length > 0 && shown.length === 0 && (
          <Empty icon="check">Nothing in that pile.</Empty>
        )}

        <AnimatePresence initial={false}>
          {shown.map((f) => (
            <Card
              key={f.id} f={f} accent={accent} now={now} open={open === f.id}
              onOpen={() => setOpen(open === f.id ? null : f.id)}
              onEdit={(p) => edit(f.id, p)}
              onRemove={() => write(list.filter((x) => x.id !== f.id))}
              sound={sound}
              onNudged={() => { edit(f.id, { sentOn: now }); toast('Clock reset from today.'); }}
            />
          ))}
        </AnimatePresence>

        {done.length > 0 && (
          <Section label={`Closed · ${done.length}`}>
            <div style={{ opacity: 0.62 }}>
              <AnimatePresence initial={false}>
                {done.map((f) => (
                  <Card
                    key={f.id} f={f} accent={accent} now={now} open={open === f.id}
                    onOpen={() => setOpen(open === f.id ? null : f.id)}
                    onEdit={(p) => edit(f.id, p)}
                    onRemove={() => write(list.filter((x) => x.id !== f.id))}
                    sound={sound}
                    onNudged={() => edit(f.id, { sentOn: now })}
                  />
                ))}
              </AnimatePresence>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Card({
  f, accent, now, open, onOpen, onEdit, onRemove, onNudged, sound,
}: {
  f: FollowUp;
  accent: string;
  now: string;
  open: boolean;
  onOpen: () => void;
  onEdit: (p: Partial<FollowUp>) => void;
  onRemove: () => void;
  onNudged: () => void;
  sound: boolean;
}) {
  const { heat, overdueBy } = heatOf(f, now);
  const waited = daysBetween(f.sentOn, now);
  const border = f.done ? 'var(--line)' : HEAT_COLOR[heat];

  const when = f.done
    ? `closed${f.closedOn ? ` ${prettyDate(f.closedOn)}` : ''}`
    : heat === 'fresh'
      ? overdueBy === 0
        ? 'nudge today'
        : `${-overdueBy} day${overdueBy === -1 ? '' : 's'} to go`
      : overdueBy === 0
        ? 'nudge today'
        : `${overdueBy} day${overdueBy === 1 ? '' : 's'} past the nudge`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        border: `2.5px solid ${border}`,
        borderRadius: 'var(--r)', padding: 9, marginBottom: 7,
        background: f.done
          ? 'var(--surface-2)'
          : heat === 'late'
            ? 'color-mix(in srgb, #C4685C 12%, var(--surface))'
            : heat === 'due'
              ? 'color-mix(in srgb, #E0A75C 14%, var(--surface))'
              : 'var(--surface-2)',
      }}
    >
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <div style={{ paddingTop: 1 }}>
          <Checkbox
            checked={f.done}
            onChange={() => {
              onEdit({ done: !f.done, closedOn: f.done ? undefined : now });
              if (!f.done) play('pop', sound);
            }}
            accent={accent}
            size={21}
            label={`Close ${f.person}`}
          />
        </div>
        <button
          onClick={onOpen}
          style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
          aria-expanded={open}
        >
          <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, wordBreak: 'break-word' }}>
            {f.person}
          </span>
          {f.subject && (
            <span
              style={{
                display: 'block', fontSize: 12, color: 'var(--ink-soft)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {f.subject}
            </span>
          )}
          <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 3, alignItems: 'center' }}>
            <span
              className="chip"
              style={{
                padding: '1px 8px', fontSize: 10.5,
                borderColor: f.waitingOn === 'me' ? accent : 'var(--line)',
                background: f.waitingOn === 'me' ? `color-mix(in srgb, ${accent} 30%, var(--surface))` : 'var(--surface)',
                color: 'var(--ink)',
              }}
            >
              {f.waitingOn === 'me' ? 'your move' : 'their move'}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              sent {waited === 0 ? 'today' : `${waited}d ago`} · {when}
            </span>
          </span>
        </button>
        {!f.done && heat !== 'fresh' && (
          <button className="btn tiny" onClick={onNudged} title="You nudged them — restart the clock">
            <Icon name="repeat" size={12} /> Nudged
          </button>
        )}
        <button className="btn ghost tiny" onClick={onOpen} aria-label="Details" style={{ padding: 4 }}>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={13} />
        </button>
      </div>

      {open && (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          <input value={f.person} onChange={(e) => onEdit({ person: e.target.value })}
            placeholder="Person" aria-label="Person" style={{ ...sm, fontWeight: 700 }} />
          <input value={f.subject} onChange={(e) => onEdit({ subject: e.target.value })}
            placeholder="Subject line" aria-label="Subject" style={sm} />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11.5 }}>
              sent
              <input type="date" value={f.sentOn} onChange={(e) => onEdit({ sentOn: e.target.value })}
                aria-label="Date sent" style={sm} />
            </label>
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 11.5 }}>
              nudge after
              <input
                type="number" min={1} max={120} value={f.nudgeAfter}
                onChange={(e) => onEdit({ nudgeAfter: Math.max(1, Number(e.target.value) || 1) })}
                aria-label="Nudge after days"
                style={{ ...sm, width: 58, textAlign: 'right' }}
              />
              days
            </label>
          </div>

          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>Waiting on</span>
            <button
              className={`btn tiny ${f.waitingOn === 'them' ? 'primary' : ''}`}
              onClick={() => onEdit({ waitingOn: 'them' })}
              title="They owe you a reply — this needs a nudge"
            >
              them
            </button>
            <button
              className={`btn tiny ${f.waitingOn === 'me' ? 'primary' : ''}`}
              onClick={() => onEdit({ waitingOn: 'me' })}
              title="You owe them something — this is a task"
            >
              me
            </button>
          </div>

          <textarea value={f.notes ?? ''} onChange={(e) => onEdit({ notes: e.target.value })}
            placeholder="What you asked for, what you'll say next…" rows={2}
            aria-label="Notes" style={{ fontSize: 12.5 }} />

          <button className="btn ghost tiny" style={{ color: '#B4544A', justifySelf: 'start' }} onClick={onRemove}>
            <Icon name="trash" size={12} /> Delete
          </button>
        </div>
      )}
    </motion.div>
  );
}

const sm: React.CSSProperties = { padding: '4px 8px', fontSize: 12, borderWidth: 2 };
