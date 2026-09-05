import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc } from '../../lib/store';
import type { Sector, Widget } from '../../lib/types';
import { Icon } from '../Icons';
import { Empty } from '../ui';
import { PASTELS, readableOn } from '../../lib/themes';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function ContactsWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const allContacts = useDoc((s) => s.doc.contacts);
  const contacts = useMemo(() => allContacts.filter((c) => c.widgetId === widget.id), [allContacts, widget.id]);
  const addContact = useDoc((s) => s.addContact);
  const updateContact = useDoc((s) => s.updateContact);
  const removeContact = useDoc((s) => s.removeContact);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    addContact({ widgetId: widget.id, sectorId: widget.sectorId, name });
    setDraft('');
  };

  const shown = query.trim()
    ? contacts.filter((c) =>
        [c.name, c.role, c.email, c.notes].join(' ').toLowerCase().includes(query.toLowerCase()),
      )
    : contacts;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Add someone…"
          aria-label="New person"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button className="btn icon primary" onClick={add} aria-label="Add person" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      {contacts.length > 5 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search people"
          style={{ padding: '6px 10px', fontSize: 12.5, borderWidth: 2 }}
        />
      )}

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {contacts.length === 0 && <Empty icon="people">Nobody here yet. Add the humans.</Empty>}
        <AnimatePresence initial={false}>
          {shown.map((c) => {
            const isOpen = open === c.id;
            const tint = c.tint ?? sector.accent;
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  border: '2px solid var(--line)', borderRadius: 'var(--r)', padding: 8,
                  marginBottom: 7, background: 'var(--surface-2)',
                }}
              >
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 34, height: 34, borderRadius: 12, flexShrink: 0,
                      background: tint, border: '2px solid var(--line)',
                      display: 'grid', placeItems: 'center',
                      fontWeight: 700, fontSize: 13, color: readableOn(tint, '#4A3B35'),
                    }}
                    aria-hidden="true"
                  >
                    {initials(c.name)}
                  </span>
                  <button
                    onClick={() => setOpen(isOpen ? null : c.id)}
                    style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
                    aria-expanded={isOpen}
                  >
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, wordBreak: 'break-word' }}>{c.name}</span>
                    {(c.role || c.email) && (
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[c.role, c.email].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </button>
                  {c.email && (
                    <a className="btn ghost tiny" href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} style={{ padding: 4 }}>
                      <Icon name="note" size={13} />
                    </a>
                  )}
                  <button className="btn ghost tiny" onClick={() => setOpen(isOpen ? null : c.id)} aria-label="Details" style={{ padding: 4 }}>
                    <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={13} />
                  </button>
                </div>

                {isOpen && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    <input value={c.name} onChange={(e) => updateContact(c.id, { name: e.target.value })} aria-label="Name" style={inputSm} />
                    <input value={c.role ?? ''} onChange={(e) => updateContact(c.id, { role: e.target.value })} placeholder="How you know them" aria-label="Role" style={inputSm} />
                    <input value={c.email ?? ''} onChange={(e) => updateContact(c.id, { email: e.target.value })} placeholder="Email" aria-label="Email" style={inputSm} />
                    <input value={c.phone ?? ''} onChange={(e) => updateContact(c.id, { phone: e.target.value })} placeholder="Phone" aria-label="Phone" style={inputSm} />
                    <textarea value={c.notes ?? ''} onChange={(e) => updateContact(c.id, { notes: e.target.value })} placeholder="Their kid's name, coffee order, last thing you talked about…" rows={2} style={{ fontSize: 13 }} />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {PASTELS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => updateContact(c.id, { tint: p.value })}
                          aria-label={p.name}
                          style={{
                            width: 20, height: 20, borderRadius: 7, background: p.value, padding: 0,
                            border: c.tint === p.value ? '3px solid var(--ink)' : '2px solid var(--line)',
                          }}
                        />
                      ))}
                    </div>
                    <button className="btn ghost tiny" style={{ color: '#B4544A', justifySelf: 'start' }} onClick={() => removeContact(c.id)}>
                      <Icon name="trash" size={13} /> Remove
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
