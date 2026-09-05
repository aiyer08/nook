/** Editors for one cell, chosen by field type. Shared by all four views. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { CellValue, FieldDef } from '../../../lib/types';
import { Icon } from '../../Icons';
import { optionColor } from '../../../lib/collections';
import { readableOn } from '../../../lib/themes';
import { Popover } from '../../ui';

interface Props {
  field: FieldDef;
  value: CellValue;
  onChange: (v: CellValue) => void;
  /** compact styling for table rows */
  dense?: boolean;
  autoFocus?: boolean;
}

const base: React.CSSProperties = {
  width: '100%', borderWidth: 2, padding: '5px 8px', fontSize: 12.5, borderRadius: 10,
};

export function Cell({ field, value, onChange, dense, autoFocus }: Props) {
  switch (field.type) {
    case 'checkbox':
      return (
        <motion.button
          whileTap={{ scale: 0.85 }}
          animate={value ? { scale: [1, 0.85, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
          onClick={() => onChange(!value)}
          aria-label={field.name}
          aria-pressed={Boolean(value)}
          style={{
            width: 22, height: 22, borderRadius: 8, padding: 0, flexShrink: 0,
            border: '2.5px solid var(--line)',
            background: value ? 'var(--accent)' : 'var(--surface)',
            display: 'grid', placeItems: 'center',
          }}
        >
          {Boolean(value) && <Icon name="check" size={13} stroke={3.2} />}
        </motion.button>
      );

    case 'stars':
      return <Stars value={Number(value) || 0} max={field.max ?? 5} onChange={onChange} />;

    case 'select':
      return <SelectCell field={field} value={value} onChange={onChange} dense={dense} />;

    case 'multiselect':
      return <MultiCell field={field} value={value} onChange={onChange} />;

    case 'longtext':
      return (
        <Debounced
          value={String(value ?? '')}
          onChange={(v) => onChange(v === '' ? undefined : v)}
          render={(v, set) => (
            <textarea
              value={v}
              onChange={(e) => set(e.target.value)}
              rows={dense ? 1 : 3}
              placeholder={field.name}
              aria-label={field.name}
              style={{ ...base, resize: 'vertical', lineHeight: 1.5 }}
            />
          )}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || undefined)}
          aria-label={field.name}
          style={base}
        />
      );

    case 'number':
    case 'money':
    case 'progress':
      return (
        <Debounced
          value={value === undefined ? '' : String(value)}
          onChange={(v) => onChange(v === '' ? undefined : Number(v))}
          render={(v, set) => (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {field.type === 'money' && (
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{field.suffix ?? '$'}</span>
              )}
              <input
                type="number"
                value={v}
                onChange={(e) => set(e.target.value)}
                placeholder={field.name}
                aria-label={field.name}
                style={{ ...base, textAlign: 'right' }}
              />
              {field.type !== 'money' && field.suffix && (
                <span style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{field.suffix}</span>
              )}
            </span>
          )}
        />
      );

    case 'url':
      return <UrlCell field={field} value={value} onChange={onChange} />;

    default:
      return (
        <Debounced
          value={String(value ?? '')}
          onChange={(v) => onChange(v === '' ? undefined : v)}
          render={(v, set) => (
            <input
              value={v}
              onChange={(e) => set(e.target.value)}
              placeholder={field.name}
              aria-label={field.name}
              autoFocus={autoFocus}
              style={base}
            />
          )}
        />
      );
  }
}

/**
 * Keeps the caret where it belongs. Typing writes straight through to the
 * store, but the input holds its own copy so a re-render triggered elsewhere
 * cannot yank the cursor mid-word.
 */
function Debounced({
  value, onChange, render,
}: {
  value: string;
  onChange: (v: string) => void;
  render: (v: string, set: (v: string) => void) => ReactNode;
}) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value); }, [value]);
  return (
    <span
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; }}
      style={{ display: 'block' }}
    >
      {render(draft, (v) => { setDraft(v); onChange(v); })}
    </span>
  );
}

function Stars({ value, max, onChange }: { value: number; max: number; onChange: (v: CellValue) => void }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }} role="radiogroup" aria-label="Rating">
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        const on = value >= n;
        return (
          <motion.button
            key={n}
            whileTap={{ scale: 0.8 }}
            whileHover={{ y: -1 }}
            // tapping the star you are already on clears the rating
            onClick={() => onChange(value === n ? undefined : n)}
            aria-label={`${n} of ${max}`}
            aria-checked={on}
            role="radio"
            style={{ background: 'none', border: 'none', padding: 1, lineHeight: 0 }}
          >
            <Icon
              name="star"
              size={15}
              color={on ? '#D9A93F' : 'var(--line)'}
              style={{ fill: on ? '#EFCE7B' : 'none' }}
            />
          </motion.button>
        );
      })}
    </span>
  );
}

function SelectCell({ field, value, onChange, dense }: Props) {
  const [open, setOpen] = useState(false);
  // the menu is portalled out of the widget, so the trigger is the anchor
  const trigger = useRef<HTMLButtonElement>(null);

  const current = field.options?.find((o) => o.id === value);
  const color = current?.color;

  return (
    <span style={{ display: 'inline-block' }}>
      <button
        ref={trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label={field.name}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: dense ? '3px 9px' : '5px 11px',
          borderRadius: 999, fontSize: 12, fontWeight: 700,
          border: `2px solid ${color ?? 'var(--line)'}`,
          background: color ?? 'var(--surface)',
          color: color ? readableOn(color) : 'var(--ink-faint)',
          maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {current?.label ?? field.name}
        <Icon name="chevronDown" size={11} />
      </button>
      <Popover open={open} anchor={trigger} onClose={() => setOpen(false)}>
        {field.options?.map((o) => (
          <button
            key={o.id}
            onClick={() => { onChange(o.id === value ? undefined : o.id); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left',
              padding: '5px 7px', borderRadius: 9, border: 'none',
              background: o.id === value ? 'var(--accent-tint)' : 'transparent',
              fontSize: 12.5, fontWeight: 600,
            }}
          >
            <span style={{ width: 11, height: 11, borderRadius: 4, background: o.color, border: '1.5px solid var(--line)' }} />
            {o.label}
          </button>
        ))}
        <button
          onClick={() => { onChange(undefined); setOpen(false); }}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '5px 7px',
            borderRadius: 9, border: 'none', background: 'transparent',
            fontSize: 12, color: 'var(--ink-faint)',
          }}
        >
          Clear
        </button>
      </Popover>
    </span>
  );
}

function MultiCell({ field, value, onChange }: Props) {
  const chosen = Array.isArray(value) ? value : [];
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {field.options?.map((o) => {
        const on = chosen.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onChange(on ? chosen.filter((c) => c !== o.id) : [...chosen, o.id])}
            aria-pressed={on}
            style={{
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              border: `2px solid ${on ? o.color : 'var(--line)'}`,
              background: on ? o.color : 'transparent',
              color: on ? readableOn(o.color) : 'var(--ink-faint)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </span>
  );
}

function UrlCell({ field, value, onChange }: Props) {
  const raw = String(value ?? '');
  const href = raw && !/^https?:\/\//i.test(raw) ? `https://${raw}` : raw;
  return (
    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <Debounced
        value={raw}
        onChange={(v) => onChange(v === '' ? undefined : v)}
        render={(v, set) => (
          <input
            value={v}
            onChange={(e) => set(e.target.value)}
            placeholder={field.name}
            aria-label={field.name}
            style={base}
          />
        )}
      />
      {raw && (
        <a
          className="btn ghost tiny"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${field.name}`}
          style={{ padding: 3, flexShrink: 0 }}
        >
          <Icon name="link" size={12} />
        </a>
      )}
    </span>
  );
}

/** Read-only rendering, for cells that are not being edited. */
export function CellRead({ field, value }: { field: FieldDef; value: CellValue }) {
  if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) {
    return <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>—</span>;
  }
  if (field.type === 'select') {
    const color = optionColor(field, value);
    return (
      <span
        className="chip"
        style={{
          padding: '2px 9px', fontSize: 11.5,
          background: color ?? 'var(--surface)',
          borderColor: color ?? 'var(--line)',
          color: color ? readableOn(color) : 'var(--ink)',
        }}
      >
        {field.options?.find((o) => o.id === value)?.label ?? String(value)}
      </span>
    );
  }
  if (field.type === 'stars') {
    return (
      <span style={{ display: 'inline-flex', gap: 1 }}>
        {Array.from({ length: field.max ?? 5 }).map((_, i) => (
          <Icon
            key={i}
            name="star"
            size={13}
            color={Number(value) > i ? '#D9A93F' : 'var(--line)'}
            style={{ fill: Number(value) > i ? '#EFCE7B' : 'none' }}
          />
        ))}
      </span>
    );
  }
  if (field.type === 'checkbox') {
    return <Icon name={value ? 'check' : 'close'} size={14} color="var(--ink-soft)" />;
  }
  if (field.type === 'money') {
    return <span style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{field.suffix ?? '$'}{value}</span>;
  }
  return <span style={{ fontSize: 12.5 }}>{String(value)}</span>;
}
