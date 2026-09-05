import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc } from '../../lib/store';
import type { EventItem, Sector, Widget } from '../../lib/types';
import { daysBetween, parseDateStr, prettyDate, prettyTime, relativeDay, today as todayStr } from '../../lib/dates';
import { Icon } from '../Icons';
import { Empty } from '../ui';
import { safeUrl } from '../../lib/media';
import { Section } from './TodoWidget';

/** Days until the next time this date comes around (yearly ones wrap). */
export function daysUntil(e: EventItem, from = todayStr()): number {
  if (!e.yearly) return daysBetween(from, e.date);
  const now = parseDateStr(from);
  const [, mm, dd] = e.date.split('-').map(Number);
  let next = new Date(now.getFullYear(), mm - 1, dd);
  if (next < now) next = new Date(now.getFullYear() + 1, mm - 1, dd);
  return Math.round((next.getTime() - now.getTime()) / 86400000);
}

function useEvents(widgetId: string) {
  const events = useDoc((s) => s.doc.events);
  return useMemo(() => events.filter((e) => e.widgetId === widgetId), [events, widgetId]);
}

/* ------------------------------------------------------------------ */
/* meetings                                                            */
/* ------------------------------------------------------------------ */

export function MeetingsWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const items = useEvents(widget.id);
  const addEvent = useDoc((s) => s.addEvent);
  const updateEvent = useDoc((s) => s.updateEvent);
  const removeEvent = useDoc((s) => s.removeEvent);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const accent = widget.accent ?? sector.accent;
  const today = todayStr();

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? ''))),
    [items],
  );
  const upcoming = sorted.filter((e) => e.date >= today);
  const past = sorted.filter((e) => e.date < today).reverse();

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    addEvent({
      widgetId: widget.id, sectorId: widget.sectorId, kind: 'meeting',
      title, date: today, time: '09:00',
    });
    setDraft('');
  };

  const row = (e: EventItem) => {
    const isOpen = open === e.id;
    const link = e.link ? safeUrl(e.link) : null;
    return (
      <motion.div
        key={e.id}
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        style={{
          border: '2px solid var(--line)', borderRadius: 'var(--r)', padding: 9,
          marginBottom: 7, background: 'var(--surface-2)',
        }}
      >
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 44, flexShrink: 0, textAlign: 'center', borderRadius: 10,
              border: '2px solid var(--line)', background: accent, padding: '3px 0',
              color: 'var(--ink)',
            }}
          >
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' }}>
              {prettyDate(e.date).split(' ')[1]}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
              {parseDateStr(e.date).getDate()}
            </div>
          </div>
          <button
            onClick={() => setOpen(isOpen ? null : e.id)}
            style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
            aria-expanded={isOpen}
          >
            <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, wordBreak: 'break-word' }}>
              {e.title}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)' }}>
              {e.time ? prettyTime(e.time) : 'no time set'}
              {e.endTime ? `–${prettyTime(e.endTime)}` : ''}
              {e.people ? ` · ${e.people}` : ''}
              {e.location ? ` · ${e.location}` : ''}
            </span>
          </button>
          {link && (
            <a
              className="btn tiny"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Icon name="link" size={12} /> Join
            </a>
          )}
          <button className="btn ghost tiny" onClick={() => setOpen(isOpen ? null : e.id)} aria-label="Details" style={{ padding: 4 }}>
            <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={13} />
          </button>
        </div>

        {isOpen && (
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            <input value={e.title} onChange={(ev) => updateEvent(e.id, { title: ev.target.value })} aria-label="Meeting title" style={{ fontSize: 13.5, borderWidth: 2 }} />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <input type="date" value={e.date} onChange={(ev) => updateEvent(e.id, { date: ev.target.value })} aria-label="Date" style={inputSm} />
              <input type="time" value={e.time ?? ''} onChange={(ev) => updateEvent(e.id, { time: ev.target.value || undefined })} aria-label="Start time" style={inputSm} />
              <input type="time" value={e.endTime ?? ''} onChange={(ev) => updateEvent(e.id, { endTime: ev.target.value || undefined })} aria-label="End time" style={inputSm} />
            </div>
            <input value={e.people ?? ''} onChange={(ev) => updateEvent(e.id, { people: ev.target.value })} placeholder="Who's coming?" aria-label="People" style={inputSm} />
            <input value={e.location ?? ''} onChange={(ev) => updateEvent(e.id, { location: ev.target.value })} placeholder="Where?" aria-label="Location" style={inputSm} />
            <input value={e.link ?? ''} onChange={(ev) => updateEvent(e.id, { link: ev.target.value })} placeholder="Call link" aria-label="Meeting link" style={inputSm} />
            <textarea value={e.notes ?? ''} onChange={(ev) => updateEvent(e.id, { notes: ev.target.value })} placeholder="Notes, agenda, what to bring…" rows={2} style={{ fontSize: 13 }} />
            <button className="btn ghost tiny" style={{ color: '#B4544A', justifySelf: 'start' }} onClick={() => removeEvent(e.id)}>
              <Icon name="trash" size={13} /> Delete
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add a meeting…"
          aria-label="New meeting"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button className="btn icon primary" onClick={add} aria-label="Add meeting" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {items.length === 0 && <Empty icon="people">Nothing on the books. Lovely.</Empty>}
        <AnimatePresence initial={false}>{upcoming.map(row)}</AnimatePresence>
        {past.length > 0 && (
          <Section label={`Already happened · ${past.length}`}>
            <div style={{ opacity: 0.6 }}>
              <AnimatePresence initial={false}>{past.map(row)}</AnimatePresence>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* important dates                                                     */
/* ------------------------------------------------------------------ */

export function DatesWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const items = useEvents(widget.id);
  const addEvent = useDoc((s) => s.addEvent);
  const updateEvent = useDoc((s) => s.updateEvent);
  const removeEvent = useDoc((s) => s.removeEvent);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const accent = widget.accent ?? sector.accent;

  const sorted = useMemo(
    () => [...items].sort((a, b) => daysUntil(a) - daysUntil(b)),
    [items],
  );

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    addEvent({
      widgetId: widget.id, sectorId: widget.sectorId, kind: 'milestone',
      title, date: todayStr(), yearly: true,
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
          placeholder="Birthday, anniversary, deadline…"
          aria-label="New important date"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button className="btn icon primary" onClick={add} aria-label="Add date" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {items.length === 0 && <Empty icon="cake">No dates to remember yet.</Empty>}
        <AnimatePresence initial={false}>
          {sorted.map((e) => {
            const d = daysUntil(e);
            const isOpen = open === e.id;
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  border: '2px solid var(--line)', borderRadius: 'var(--r)', padding: 9,
                  marginBottom: 7, background: d === 0 ? `color-mix(in srgb, ${accent} 26%, var(--surface))` : 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <Icon name={e.yearly ? 'cake' : 'flag'} size={17} color="var(--ink-soft)" />
                  <button
                    onClick={() => setOpen(isOpen ? null : e.id)}
                    style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
                    aria-expanded={isOpen}
                  >
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, wordBreak: 'break-word' }}>{e.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)' }}>
                      {prettyDate(e.date)}{e.yearly ? ' · every year' : ''}
                    </span>
                  </button>
                  <span
                    className="chip"
                    style={{
                      background: d <= 7 ? accent : 'var(--surface)',
                      borderColor: d <= 7 ? accent : 'var(--line)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d === 0 ? 'today!' : d === 1 ? 'tomorrow' : d > 0 ? `${d}d` : relativeDay(e.date)}
                  </span>
                </div>
                {isOpen && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    <input value={e.title} onChange={(ev) => updateEvent(e.id, { title: ev.target.value })} aria-label="Title" style={inputSm} />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input type="date" value={e.date} onChange={(ev) => updateEvent(e.id, { date: ev.target.value })} aria-label="Date" style={inputSm} />
                      <button
                        className={`btn tiny ${e.yearly ? 'primary' : ''}`}
                        onClick={() => updateEvent(e.id, { yearly: !e.yearly })}
                      >
                        <Icon name="repeat" size={12} /> Every year
                      </button>
                    </div>
                    <textarea value={e.notes ?? ''} onChange={(ev) => updateEvent(e.id, { notes: ev.target.value })} placeholder="Gift ideas, plans…" rows={2} style={{ fontSize: 13 }} />
                    <button className="btn ghost tiny" style={{ color: '#B4544A', justifySelf: 'start' }} onClick={() => removeEvent(e.id)}>
                      <Icon name="trash" size={13} /> Delete
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

const inputSm: React.CSSProperties = { padding: '5px 9px', fontSize: 12.5, borderWidth: 2 };
