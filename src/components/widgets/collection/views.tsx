/**
 * Four lenses on the same rows.
 *
 * None of these own any data — they take the item list and the schema and
 * decide only how to draw it. That is the whole reason a new collection costs
 * a schema rather than a component.
 */
import { AnimatePresence, motion } from 'framer-motion';
import type { CollectionItem, FieldDef, ID } from '../../../lib/types';
import { Cell, CellRead } from './Cell';
import { ItemBadges } from './ItemCard';
import { Icon } from '../../Icons';
import { primaryField } from '../../../lib/collections';
import { readableOn } from '../../../lib/themes';
import { MONTHS, monthGrid, parseDateStr, prettyDate, shiftMonth, today } from '../../../lib/dates';
import { Empty } from '../../ui';

export interface ViewProps {
  items: CollectionItem[];
  fields: FieldDef[];
  accent: string;
  openId: ID | null;
  onOpen: (id: ID | null) => void;
  setCell: (itemId: ID, fieldId: ID, v: never) => void;
  onAdd: (values?: Record<ID, never>) => void;
}

/* ------------------------------------------------------------------ */
/* table — for comparing rows against each other                       */
/* ------------------------------------------------------------------ */

export function TableView({ items, fields, accent, openId, onOpen, setCell }: ViewProps) {
  const primary = primaryField(fields);
  const rest = fields.filter((f) => f !== primary && f.type !== 'longtext').slice(0, 5);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5 }}>
        <thead>
          <tr>
            <th style={th}>{primary?.name ?? 'Item'}</th>
            {rest.map((f) => (
              <th key={f.id} style={{ ...th, whiteSpace: 'nowrap' }}>{f.name}</th>
            ))}
            <th style={{ ...th, width: 28 }} aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.tr
                key={item.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: item.releasedOn ? 0.45 : 1 }}
                exit={{ opacity: 0 }}
                style={{ background: openId === item.id ? 'var(--accent-tint)' : 'transparent' }}
              >
                <td style={{ ...td, minWidth: 130 }}>
                  {primary && (
                    <Cell
                      field={primary}
                      value={item.values[primary.id]}
                      onChange={(v) => setCell(item.id, primary.id, v as never)}
                      dense
                    />
                  )}
                  <ItemBadges item={item} accent={accent} />
                </td>
                {rest.map((f) => (
                  <td key={f.id} style={td}>
                    <Cell
                      field={f}
                      value={item.values[f.id]}
                      onChange={(v) => setCell(item.id, f.id, v as never)}
                      dense
                    />
                  </td>
                ))}
                <td style={td}>
                  <button
                    className="btn ghost tiny"
                    onClick={() => onOpen(openId === item.id ? null : item.id)}
                    aria-label="Row details"
                    style={{ padding: 3 }}
                  >
                    <Icon name={openId === item.id ? 'chevronUp' : 'chevronDown'} size={13} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: 'var(--ink-faint)',
  padding: '0 6px 6px', borderBottom: '2px solid var(--line)',
};

const td: React.CSSProperties = { padding: '5px 6px', verticalAlign: 'top' };

/* ------------------------------------------------------------------ */
/* board — for a pipeline                                              */
/* ------------------------------------------------------------------ */

export function BoardView({
  items, fields, accent, openId, onOpen, setCell, onAdd, groupBy,
}: ViewProps & { groupBy?: ID }) {
  const primary = primaryField(fields);
  const group = fields.find((f) => f.id === groupBy && f.type === 'select');

  if (!group) {
    return (
      <Empty icon="grid">
        Board view needs a column of type “choice”. Pick one in the column settings.
      </Empty>
    );
  }

  const columns = [
    ...(group.options ?? []),
    { id: '__none', label: 'Unsorted', color: 'var(--muted)' },
  ];

  return (
    <div style={{ display: 'flex', gap: 9, overflowX: 'auto', alignItems: 'flex-start', paddingBottom: 4 }}>
      {columns.map((col) => {
        const inCol = items.filter((i) =>
          col.id === '__none' ? !i.values[group.id] : i.values[group.id] === col.id,
        );
        if (col.id === '__none' && !inCol.length) return null;
        return (
          <div key={col.id} style={{ minWidth: 168, maxWidth: 200, flexShrink: 0 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7,
                padding: '4px 8px', borderRadius: 999,
                background: col.color, border: '2px solid var(--line)',
                color: readableOn(col.color === 'var(--muted)' ? '#D9C7B8' : col.color),
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 700, flex: 1 }}>{col.label}</span>
              <span style={{ fontSize: 11, opacity: 0.75 }}>{inCol.length}</span>
            </div>

            <AnimatePresence initial={false}>
              {inCol.map((item) => (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: item.releasedOn ? 0.45 : 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  onClick={() => onOpen(openId === item.id ? null : item.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', marginBottom: 6,
                    padding: 8, borderRadius: 13, border: '2px solid var(--line)',
                    background: openId === item.id ? 'var(--accent-tint)' : 'var(--surface)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, wordBreak: 'break-word' }}>
                    {String(item.values[primary?.id ?? ''] ?? 'Untitled')}
                  </span>
                  <SubLine item={item} fields={fields} skip={[primary?.id, group.id]} />
                  <ItemBadges item={item} accent={accent} />
                </motion.button>
              ))}
            </AnimatePresence>

            <button
              className="btn ghost tiny"
              onClick={() => onAdd(col.id === '__none' ? undefined : ({ [group.id]: col.id } as never))}
              style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 2 }}
            >
              <Icon name="plus" size={12} />
            </button>
          </div>
        );
      })}
      {/* keep the cell editor reachable from the board too */}
      <span hidden>{typeof setCell}</span>
    </div>
  );
}

function SubLine({
  item, fields, skip,
}: { item: CollectionItem; fields: FieldDef[]; skip: (ID | undefined)[] }) {
  const shown = fields
    .filter((f) => !skip.includes(f.id) && f.type !== 'longtext')
    .filter((f) => item.values[f.id] !== undefined && item.values[f.id] !== '')
    .slice(0, 2);
  if (!shown.length) return null;
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 3, alignItems: 'center' }}>
      {shown.map((f) => (
        <span key={f.id} style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
          <CellRead field={f} value={item.values[f.id]} />
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* calendar — for deadlines                                            */
/* ------------------------------------------------------------------ */

export function CalendarView({
  items, fields, accent, onOpen, dateField, cursor, onCursor,
}: ViewProps & { dateField?: ID; cursor: string; onCursor: (c: string) => void }) {
  const primary = primaryField(fields);
  const df = fields.find((f) => f.id === dateField && f.type === 'date')
    ?? fields.find((f) => f.type === 'date');

  if (!df) {
    return <Empty icon="calendar">Calendar view needs a date column.</Empty>;
  }

  const grid = monthGrid(cursor);
  const [y, m] = cursor.split('-').map(Number);
  const now = today();

  const byDay = new Map<string, CollectionItem[]>();
  for (const i of items) {
    const v = i.values[df.id];
    if (typeof v === 'string' && v) {
      byDay.set(v, [...(byDay.get(v) ?? []), i]);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
        <button className="btn ghost tiny" onClick={() => onCursor(shiftMonth(cursor, -1))} aria-label="Previous month">
          <Icon name="chevronLeft" size={14} />
        </button>
        <h4 style={{ flex: 1, textAlign: 'center', fontSize: 13.5 }}>{MONTHS[m - 1]} {y}</h4>
        <button className="btn ghost tiny" onClick={() => onCursor(shiftMonth(cursor, 1))} aria-label="Next month">
          <Icon name="chevronRight" size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--ink-faint)' }}>
            {d}
          </div>
        ))}
        {grid.map((d) => {
          const due = byDay.get(d) ?? [];
          const inMonth = d.slice(0, 7) === cursor;
          const isToday = d === now;
          const overdue = d < now;
          return (
            <div
              key={d}
              style={{
                minHeight: 46, borderRadius: 9, padding: 3,
                border: isToday ? `2.5px solid ${accent}` : '2px solid var(--line)',
                background: inMonth ? 'var(--surface)' : 'transparent',
                opacity: inMonth ? 1 : 0.4,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-faint)' }}>
                {parseDateStr(d).getDate()}
              </span>
              {due.slice(0, 3).map((i) => (
                <button
                  key={i.id}
                  onClick={() => onOpen(i.id)}
                  title={String(i.values[primary?.id ?? ''] ?? '')}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    fontSize: 9.5, lineHeight: 1.2, padding: '1px 4px', borderRadius: 5,
                    border: 'none', fontWeight: 700,
                    background: overdue && i.checklist.some((s) => !s.done)
                      ? '#D89A86'
                      : `color-mix(in srgb, ${accent} 55%, var(--surface))`,
                    color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {String(i.values[primary?.id ?? ''] ?? 'Untitled')}
                </button>
              ))}
              {due.length > 3 && (
                <span style={{ fontSize: 9, color: 'var(--ink-faint)' }}>+{due.length - 3}</span>
              )}
            </div>
          );
        })}
      </div>

      {items.some((i) => !i.values[df.id]) && (
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--ink-faint)' }}>
          {items.filter((i) => !i.values[df.id]).length} row(s) have no {df.name.toLowerCase()} and
          aren’t shown here.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* gallery — for things you recognise by their picture                 */
/* ------------------------------------------------------------------ */

export function GalleryView({
  items, fields, accent, openId, onOpen, imageField,
}: ViewProps & { imageField?: ID }) {
  const primary = primaryField(fields);
  const img = fields.find((f) => f.id === imageField)
    ?? fields.find((f) => f.type === 'url' && /pic|image|photo|cover/i.test(f.name));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 9 }}>
      <AnimatePresence initial={false}>
        {items.map((item) => {
          const src = img ? String(item.values[img.id] ?? '') : '';
          return (
            <motion.button
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: item.releasedOn ? 0.45 : 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              whileHover={{ y: -2, rotate: 0 }}
              onClick={() => onOpen(openId === item.id ? null : item.id)}
              style={{
                display: 'block', textAlign: 'left', padding: 7,
                borderRadius: 13, border: '2.5px solid var(--line)',
                background: openId === item.id ? 'var(--accent-tint)' : 'var(--surface)',
                boxShadow: 'var(--shadow-sm)',
                // the taped-in Polaroid: a slight tilt, settled on hover
                rotate: `${((item.id.charCodeAt(0) % 5) - 2) * 0.7}deg`,
              }}
            >
              <span
                style={{
                  display: 'block', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden',
                  background: `color-mix(in srgb, ${accent} 24%, var(--surface-2))`,
                  border: '2px solid var(--line)', marginBottom: 6,
                  position: 'relative',
                }}
              >
                {src ? (
                  <img
                    src={src}
                    alt=""
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    <Icon name="image" size={20} color="var(--ink-faint)" />
                  </span>
                )}
                {/* a strip of tape across the corner */}
                <span
                  style={{
                    position: 'absolute', top: -6, left: '50%', translate: '-50% 0',
                    width: 44, height: 14, rotate: '-3deg',
                    background: `color-mix(in srgb, ${accent} 60%, #fff)`,
                    opacity: 0.85,
                    borderLeft: '1.5px dashed color-mix(in srgb, var(--ink) 14%, transparent)',
                    borderRight: '1.5px dashed color-mix(in srgb, var(--ink) 14%, transparent)',
                  }}
                />
              </span>
              <span
                className="hand"
                style={{ display: 'block', fontSize: 16, lineHeight: 1.2, wordBreak: 'break-word' }}
              >
                {String(item.values[primary?.id ?? ''] ?? 'Untitled')}
              </span>
              <SubLine item={item} fields={fields} skip={[primary?.id, img?.id]} />
              <ItemBadges item={item} accent={accent} />
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export { prettyDate };
