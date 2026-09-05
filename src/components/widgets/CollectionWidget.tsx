/**
 * One list, four lenses.
 *
 * The widget owns the schema and which view is showing; the renderers in
 * `collection/views.tsx` own nothing. Switching a view never touches a row.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CellValue, CollectionView, FieldDef, ID, Sector, Widget } from '../../lib/types';
import { itemsOf, useDoc, useUI } from '../../lib/store';
import { Icon } from '../Icons';
import { Empty } from '../ui';
import { ItemCard } from './collection/ItemCard';
import { BoardView, CalendarView, GalleryView, TableView } from './collection/views';
import {
  COLLECTION_PRESETS, VIEW_ICON, VIEW_LABEL, compareBy, presetById, primaryField,
} from '../../lib/collections';
import { monthCursorOf, today } from '../../lib/dates';
import { uid } from '../../lib/id';
import { readableOn } from '../../lib/themes';

const VIEWS: CollectionView[] = ['table', 'board', 'calendar', 'gallery'];

export function CollectionWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const allItems = useDoc((s) => s.doc.items);
  const addItem = useDoc((s) => s.addItem);
  const setCell = useDoc((s) => s.setCell);
  const patch = useDoc((s) => s.patchWidgetData);
  const setFields = useDoc((s) => s.setFields);
  const addField = useDoc((s) => s.addField);
  const removeField = useDoc((s) => s.removeField);
  const updateWidget = useDoc((s) => s.updateWidget);
  const addStep = useDoc((s) => s.addItemStep);
  const toast = useUI((s) => s.toast);

  const [openId, setOpenId] = useState<ID | null>(null);
  const [draft, setDraft] = useState('');
  const [showCols, setShowCols] = useState(false);
  const [cursor, setCursor] = useState(monthCursorOf(today()));

  // `?? []` would be a new array every render, defeating the memo below
  const fields = useMemo(() => widget.data.fields ?? [], [widget.data.fields]);
  const view = widget.data.view ?? 'table';
  const accent = widget.accent ?? sector.accent;
  const primary = primaryField(fields);

  const items = useMemo(() => {
    const mine = itemsOf(allItems, widget.id);
    const sortField = fields.find((f) => f.id === widget.data.sortBy);
    if (!sortField) return mine;
    const dir = widget.data.sortDir === 'desc' ? -1 : 1;
    return [...mine].sort((a, b) => compareBy(sortField, a.values, b.values) * dir);
  }, [allItems, widget.id, fields, widget.data.sortBy, widget.data.sortDir]);

  /* ---- not set up yet: offer the catalogue ---- */
  if (!fields.length) {
    return <PresetChooser widget={widget} onPick={(id) => {
      const p = presetById(id);
      if (!p) return;
      const built = p.build();
      patch(widget.id, built);
      if (widget.title === 'Collection') updateWidget(widget.id, { title: p.label });
      // give it one row so it never opens as an empty grid, and put it in the
      // first column rather than stranding it in "Unsorted"
      const group = built.fields.find((f) => f.id === built.groupBy);
      const firstOption = group?.options?.[0]?.id;
      const first = addItem(
        widget.id,
        widget.sectorId,
        group && firstOption ? { [group.id]: firstOption } : {},
      );
      for (const step of p.checklist ?? []) addStep(first, step);
      toast(`${p.label} ready. ${VIEW_LABEL[built.view]} view to start.`);
    }} />;
  }

  const add = (values: Record<ID, CellValue> = {}) => {
    const title = draft.trim();
    const merged = { ...values };
    if (title && primary) merged[primary.id] = title;
    const id = addItem(widget.id, widget.sectorId, merged);
    // an application without its required-materials list is half a card
    const preset = COLLECTION_PRESETS.find((p) => p.label === widget.title);
    for (const step of preset?.checklist ?? []) addStep(id, step);
    setDraft('');
    if (!title) setOpenId(id);
  };

  const shared = {
    items, fields, accent, openId,
    onOpen: setOpenId,
    setCell: setCell as (i: ID, f: ID, v: never) => void,
    onAdd: add as (v?: Record<ID, never>) => void,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      {/* lens switcher */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex', gap: 2, padding: 2, borderRadius: 999,
            border: '2px solid var(--line)', background: 'var(--surface-2)',
          }}
        >
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => patch(widget.id, { view: v })}
              title={`${VIEW_LABEL[v]} view`}
              aria-label={`${VIEW_LABEL[v]} view`}
              aria-pressed={view === v}
              style={{
                display: 'grid', placeItems: 'center', padding: '4px 8px',
                borderRadius: 999, border: 'none',
                background: view === v ? accent : 'transparent',
                color: view === v ? readableOn(accent) : 'var(--ink-faint)',
              }}
            >
              <Icon name={VIEW_ICON[v]} size={14} />
            </button>
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
          {items.length} {items.length === 1 ? 'row' : 'rows'}
        </span>
        <span style={{ flex: 1 }} />
        <button
          className={`btn ghost tiny ${showCols ? 'primary' : ''}`}
          onClick={() => setShowCols((v) => !v)}
          title="Columns and view settings"
        >
          <Icon name="gear" size={13} />
        </button>
      </div>

      {showCols && (
        <ColumnSettings
          widget={widget}
          fields={fields}
          onPatch={(p) => patch(widget.id, p)}
          onAddField={(f) => addField(widget.id, f)}
          onRemoveField={(id) => removeField(widget.id, id)}
          onReorder={(next) => setFields(widget.id, next)}
        />
      )}

      {/* quick add */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={`Add ${(primary?.name ?? 'item').toLowerCase()}…`}
          aria-label="New row"
          style={{ flex: 1, padding: '7px 11px', fontSize: 13 }}
        />
        <button className="btn icon primary" onClick={() => add()} aria-label="Add row" style={{ padding: 7 }}>
          <Icon name="plus" size={15} />
        </button>
      </div>

      {/* the chosen lens */}
      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {items.length === 0 ? (
          <Empty icon="sparkle">Nothing in here yet. Add the first one above.</Empty>
        ) : view === 'table' ? (
          <TableView {...shared} />
        ) : view === 'board' ? (
          <BoardView {...shared} groupBy={widget.data.groupBy} />
        ) : view === 'calendar' ? (
          <CalendarView {...shared} dateField={widget.data.dateField} cursor={cursor} onCursor={setCursor} />
        ) : (
          <GalleryView {...shared} imageField={widget.data.imageField} />
        )}

        <AnimatePresence>
          {openId && items.some((i) => i.id === openId) && (
            <motion.div layout style={{ marginTop: 9 }}>
              <ItemCard
                item={items.find((i) => i.id === openId)!}
                fields={fields}
                accent={accent}
                onClose={() => setOpenId(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* first-run: pick what this list is for                               */
/* ------------------------------------------------------------------ */

function PresetChooser({ widget, onPick }: { widget: Widget; onPick: (id: string) => void }) {
  const sectorName = useDoc((s) => s.doc.sectors.find((x) => x.id === widget.sectorId)?.name ?? '');
  const [q, setQ] = useState('');

  const sorted = useMemo(() => {
    const query = q.trim().toLowerCase();
    const scored = COLLECTION_PRESETS.filter(
      (p) => !query || `${p.label} ${p.blurb}`.toLowerCase().includes(query),
    );
    // float the ones that suit this tab
    return scored.sort((a, b) => {
      const fit = (p: typeof a) => (p.sectors?.includes(sectorName) ? 0 : p.id === 'blank' ? 2 : 1);
      return fit(a) - fit(b);
    });
  }, [q, sectorName]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <p className="hand" style={{ margin: 0, fontSize: 19, color: 'var(--ink-soft)' }}>
        What is this list for?
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search — applications, books, recipes, subscriptions…"
        aria-label="Search collection types"
        style={{ padding: '7px 11px', fontSize: 13 }}
      />
      <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 6, marginRight: -6, paddingRight: 6 }}>
        {sorted.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            style={{
              display: 'flex', gap: 9, alignItems: 'flex-start', textAlign: 'left',
              padding: 9, borderRadius: 'var(--r)', border: '2.5px solid var(--line)',
              background: p.sectors?.includes(sectorName) ? 'var(--accent-tint)' : 'var(--surface)',
            }}
          >
            <Icon name={p.icon} size={17} color="var(--ink-soft)" style={{ marginTop: 1 }} />
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{p.label}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
                {p.blurb}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* columns and which field drives which view                           */
/* ------------------------------------------------------------------ */

const NEW_TYPES: { type: FieldDef['type']; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'longtext', label: 'Long text' },
  { type: 'number', label: 'Number' },
  { type: 'money', label: 'Money' },
  { type: 'date', label: 'Date' },
  { type: 'select', label: 'Choice' },
  { type: 'multiselect', label: 'Tags' },
  { type: 'checkbox', label: 'Tickbox' },
  { type: 'stars', label: 'Stars' },
  { type: 'url', label: 'Link' },
];

function ColumnSettings({
  widget, fields, onPatch, onAddField, onRemoveField, onReorder,
}: {
  widget: Widget;
  fields: FieldDef[];
  onPatch: (p: Partial<Widget['data']>) => void;
  onAddField: (f: FieldDef) => void;
  onRemoveField: (id: ID) => void;
  onReorder: (next: FieldDef[]) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldDef['type']>('text');

  const selects = fields.filter((f) => f.type === 'select');
  const dates = fields.filter((f) => f.type === 'date');
  const urls = fields.filter((f) => f.type === 'url' || f.type === 'text');

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next);
  };

  return (
    <div
      style={{
        border: '2px dashed var(--line)', borderRadius: 'var(--r)', padding: 9,
        background: 'var(--surface-2)', display: 'grid', gap: 8,
      }}
    >
      <Selector label="Board groups by" value={widget.data.groupBy} options={selects}
        onChange={(v) => onPatch({ groupBy: v })} empty="needs a choice column" />
      <Selector label="Calendar uses" value={widget.data.dateField} options={dates}
        onChange={(v) => onPatch({ dateField: v })} empty="needs a date column" />
      <Selector label="Gallery picture" value={widget.data.imageField} options={urls}
        onChange={(v) => onPatch({ imageField: v })} empty="needs a link column" />
      <Selector label="Sort by" value={widget.data.sortBy} options={fields}
        onChange={(v) => onPatch({ sortBy: v })} empty="—"
        extra={
          <button
            className="btn tiny"
            onClick={() => onPatch({ sortDir: widget.data.sortDir === 'desc' ? 'asc' : 'desc' })}
            title="Reverse the order"
          >
            <Icon name={widget.data.sortDir === 'desc' ? 'chevronDown' : 'chevronUp'} size={12} />
          </button>
        }
      />

      <div>
        <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Columns
        </p>
        {fields.map((f, i) => (
          <div key={f.id} style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ flex: 1, fontSize: 12.5 }}>
              {f.name}
              {f.primary && <span style={{ color: 'var(--ink-faint)' }}> · title</span>}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {NEW_TYPES.find((t) => t.type === f.type)?.label ?? f.type}
            </span>
            <button className="btn ghost tiny" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move column up" style={{ padding: 2 }}>
              <Icon name="chevronUp" size={12} />
            </button>
            <button className="btn ghost tiny" onClick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Move column down" style={{ padding: 2 }}>
              <Icon name="chevronDown" size={12} />
            </button>
            <button
              className="btn ghost tiny"
              onClick={() => onRemoveField(f.id)}
              disabled={f.primary}
              title={f.primary ? 'The title column has to stay' : 'Remove column'}
              aria-label="Remove column"
              style={{ padding: 2, color: f.primary ? undefined : '#B4544A' }}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New column"
            aria-label="New column name"
            style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderWidth: 2 }}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FieldDef['type'])}
            aria-label="Column type"
            style={{ padding: '4px 6px', fontSize: 12, borderWidth: 2 }}
          >
            {NEW_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
          <button
            className="btn tiny primary"
            disabled={!name.trim()}
            onClick={() => {
              onAddField({
                id: `u${uid().slice(0, 6)}`,
                name: name.trim(),
                type,
                max: type === 'stars' ? 5 : undefined,
                suffix: type === 'money' ? '$' : undefined,
                options: type === 'select' || type === 'multiselect'
                  ? [
                      { id: 'one', label: 'One', color: '#A3C4E0' },
                      { id: 'two', label: 'Two', color: '#9FCFB8' },
                      { id: 'three', label: 'Three', color: '#EFCE7B' },
                    ]
                  : undefined,
              });
              setName('');
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function Selector({
  label, value, options, onChange, empty, extra,
}: {
  label: string;
  value?: ID;
  options: FieldDef[];
  onChange: (v: ID | undefined) => void;
  empty: string;
  extra?: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 12 }}>
      <span style={{ minWidth: 108, color: 'var(--ink-soft)', fontWeight: 700 }}>{label}</span>
      {options.length === 0 ? (
        <span style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>{empty}</span>
      ) : (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          style={{ flex: 1, padding: '4px 7px', fontSize: 12, borderWidth: 2 }}
        >
          <option value="">—</option>
          {options.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      )}
      {extra}
    </label>
  );
}

