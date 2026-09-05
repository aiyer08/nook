/** The expanded editor for one row: fields, checklist, materials, threads. */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CollectionItem, FieldDef } from '../../../lib/types';
import { useDoc, useUI } from '../../../lib/store';
import { Icon } from '../../Icons';
import { Cell } from './Cell';
import { Checkbox } from '../../ui';
import { primaryField } from '../../../lib/collections';
import { play } from '../../../lib/sound';
import { Reckoning } from '../../Reckoning';

export function ItemCard({
  item, fields, accent, onClose,
}: {
  item: CollectionItem;
  fields: FieldDef[];
  accent: string;
  onClose: () => void;
}) {
  const setCell = useDoc((s) => s.setCell);
  const removeItem = useDoc((s) => s.removeItem);
  const duplicateItem = useDoc((s) => s.duplicateItem);
  const addStep = useDoc((s) => s.addItemStep);
  const toggleStep = useDoc((s) => s.toggleItemStep);
  const removeStep = useDoc((s) => s.removeItemStep);
  const attach = useDoc((s) => s.attachMaterial);
  const thread = useDoc((s) => s.threadItems);
  const materials = useDoc((s) => s.doc.materials);
  const updateItem = useDoc((s) => s.updateItem);
  const releaseItem = useDoc((s) => s.releaseItem);
  const allItems = useDoc((s) => s.doc.items);
  const sound = useDoc((s) => s.doc.settings.sound);
  const toast = useUI((s) => s.toast);

  const [step, setStep] = useState('');
  const [showAttach, setShowAttach] = useState(false);
  const [showThread, setShowThread] = useState(false);

  const primary = primaryField(fields);
  const dateField = fields.find((f) => f.type === 'date');
  const done = item.checklist.filter((s) => s.done).length;
  const missing = item.checklist.filter((s) => !s.done);
  const siblings = allItems.filter((i) => i.widgetId === item.widgetId && i.id !== item.id);
  const threaded = allItems.filter((i) => item.links.includes(i.id));

  const titleOf = (i: CollectionItem) => String(i.values[primary?.id ?? ''] ?? 'Untitled');

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      style={{
        border: '3px solid var(--line)', borderRadius: 'var(--r)', padding: 12,
        background: 'var(--surface-2)', display: 'grid', gap: 10,
      }}
    >
      {item.migrations >= 3 && !item.releasedOn && (
        <Reckoning
          title={titleOf(item)}
          count={item.migrations}
          noun="this row"
          canSchedule={Boolean(dateField)}
          onDoIt={() => updateItem(item.id, { migrations: 0 })}
          onSchedule={(d) => {
            if (dateField) setCell(item.id, dateField.id, d);
            updateItem(item.id, { migrations: 0 });
          }}
          onRelease={() => releaseItem(item.id)}
        />
      )}

      {item.releasedOn && (
        <p className="hand" style={{ margin: 0, fontSize: 17, color: 'var(--ink-soft)' }}>
          Let go of on {item.releasedOn}. Still here if you want it back.
        </p>
      )}

      {/* fields */}
      <div style={{ display: 'grid', gap: 9 }}>
        {fields.map((field) => (
          <label key={field.id} style={{ display: 'grid', gap: 3 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
              {field.name}
            </span>
            <Cell
              field={field}
              value={item.values[field.id]}
              onChange={(v) => setCell(item.id, field.id, v)}
            />
          </label>
        ))}
      </div>

      {/* what's missing, at a glance */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
            Required
          </span>
          {item.checklist.length > 0 && (
            <span
              className="chip"
              style={{
                padding: '1px 8px', fontSize: 11,
                background: missing.length === 0 ? accent : 'var(--surface)',
                borderColor: missing.length === 0 ? accent : 'var(--line)',
                color: 'var(--ink)',
              }}
            >
              {missing.length === 0
                ? 'all in'
                : `${done}/${item.checklist.length} · ${missing.length} missing`}
            </span>
          )}
        </div>

        {item.checklist.map((s) => (
          <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 5 }}>
            <Checkbox
              checked={s.done}
              onChange={() => { toggleStep(item.id, s.id); if (!s.done) play('tick', sound); }}
              accent={accent}
              size={19}
              label={s.title}
            />
            <span
              style={{
                flex: 1, fontSize: 13,
                textDecoration: s.done ? 'line-through' : 'none',
                color: s.done ? 'var(--ink-faint)' : 'var(--ink)',
              }}
            >
              {s.title}
            </span>
            <button
              className="btn ghost tiny"
              onClick={() => removeStep(item.id, s.id)}
              aria-label={`Remove ${s.title}`}
              style={{ padding: 3 }}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
        <input
          value={step}
          onChange={(e) => setStep(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && step.trim()) { addStep(item.id, step.trim()); setStep(''); }
          }}
          placeholder="+ transcript, 2 letters, 500-word essay…"
          aria-label="Add a required material"
          style={{ width: '100%', padding: '5px 10px', fontSize: 12.5, borderWidth: 2, borderStyle: 'dashed' }}
        />
      </div>

      {/* materials locker */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>Attached</span>
          <button className="btn ghost tiny" onClick={() => setShowAttach((v) => !v)}>
            <Icon name="copy" size={12} /> {showAttach ? 'done' : 'attach'}
          </button>
        </div>
        {item.materials.length === 0 && !showAttach && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-faint)' }}>
            Nothing attached. Keep documents in a Materials locker and reuse them.
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(showAttach ? materials : materials.filter((m) => item.materials.includes(m.id))).map((m) => {
            const on = item.materials.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => attach(item.id, m.id)}
                aria-pressed={on}
                title={m.notes}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
                  border: `2px solid ${on ? accent : 'var(--line)'}`,
                  background: on ? accent : 'var(--surface)',
                  color: 'var(--ink)',
                }}
              >
                {/* a paper clip, because that's what this is */}
                <Icon name="link" size={11} />
                {m.name}
                <span style={{ opacity: 0.7, fontWeight: 600 }}>{m.version}</span>
              </button>
            );
          })}
          {showAttach && materials.length === 0 && (
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              The locker is empty — add a Materials widget first.
            </span>
          )}
        </div>
      </div>

      {/* threading: "see p. 34" */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
            See also
          </span>
          <button className="btn ghost tiny" onClick={() => setShowThread((v) => !v)} disabled={!siblings.length}>
            <Icon name="link" size={12} /> {showThread ? 'done' : 'thread'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(showThread ? siblings : threaded).map((i) => {
            const on = item.links.includes(i.id);
            return (
              <button
                key={i.id}
                onClick={() => thread(item.id, i.id)}
                aria-pressed={on}
                style={{
                  padding: '3px 9px', borderRadius: 10, fontSize: 11.5,
                  border: `2px ${on ? 'solid' : 'dashed'} var(--line)`,
                  background: on ? 'var(--accent-tint)' : 'transparent',
                  maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {titleOf(i) || 'Untitled'}
              </button>
            );
          })}
          {!showThread && !threaded.length && (
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Not threaded to anything.</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        <button className="btn ghost tiny" onClick={() => { duplicateItem(item.id); toast('Copied that row.'); }}>
          <Icon name="copy" size={13} /> Duplicate
        </button>
        <button className="btn ghost tiny" onClick={onClose}>
          <Icon name="chevronUp" size={13} /> Close
        </button>
        <span style={{ flex: 1 }} />
        {item.migrations > 0 && (
          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
            moved {item.migrations}×
          </span>
        )}
        <button
          className="btn ghost tiny"
          style={{ color: '#B4544A' }}
          onClick={() => { removeItem(item.id); onClose(); }}
        >
          <Icon name="trash" size={13} /> Delete
        </button>
      </div>
    </motion.div>
  );
}

/** A compact summary strip used on cards in board and gallery views. */
export function ItemBadges({ item, accent }: { item: CollectionItem; accent: string }) {
  const missing = item.checklist.filter((s) => !s.done).length;
  const materials = item.materials.length;
  return (
    <AnimatePresence initial={false}>
      {(missing > 0 || materials > 0 || item.links.length > 0 || item.migrations >= 3) && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}
        >
          {missing > 0 && (
            <span
              className="chip"
              style={{ padding: '1px 7px', fontSize: 10.5, borderColor: accent, color: 'var(--ink)' }}
              title={`${missing} required item${missing === 1 ? '' : 's'} still missing`}
            >
              {missing} missing
            </span>
          )}
          {materials > 0 && (
            <span className="chip" style={{ padding: '1px 7px', fontSize: 10.5 }}>
              <Icon name="link" size={10} /> {materials}
            </span>
          )}
          {item.links.length > 0 && (
            <span className="chip" style={{ padding: '1px 7px', fontSize: 10.5 }} title="Threaded to other rows">
              see also
            </span>
          )}
          {item.migrations >= 3 && !item.releasedOn && (
            <span className="chip" style={{ padding: '1px 7px', fontSize: 10.5, borderColor: '#D89A86' }}>
              moved {item.migrations}×
            </span>
          )}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
