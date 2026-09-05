/**
 * Papers to read. Paste a DOI or an arXiv link and it fills itself in.
 *
 * The takeaway field is the point of the widget: a paper you've read but
 * can't summarise in a line hasn't really been read.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Paper, Sector, Widget } from '../../lib/types';
import { useDoc, useUI } from '../../lib/store';
import { Icon } from '../Icons';
import { Checkbox, Empty } from '../ui';
import { LookupError, identify, lookupPaper } from '../../lib/papers';
import { play } from '../../lib/sound';
import { Section } from './TodoWidget';

export function PapersWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const sound = useDoc((s) => s.doc.settings.sound);
  const toast = useUI((s) => s.toast);

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const papers = widget.data.papers ?? [];
  const accent = widget.accent ?? sector.accent;
  const toRead = papers.filter((p) => !p.read);
  const read = papers.filter((p) => p.read);

  const write = (next: Paper[]) => patch(widget.id, { papers: next });
  const edit = (id: string, p: Partial<Paper>) =>
    write(papers.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const add = async () => {
    const raw = draft.trim();
    if (!raw) return;
    setBusy(true);
    try {
      const paper = await lookupPaper(raw);
      write([paper, ...papers]);
      setDraft('');
      if (!paper.title) {
        setOpen(paper.id);
        toast('Saved the link — give it a title yourself.');
      } else {
        toast(`Found “${paper.title.slice(0, 42)}${paper.title.length > 42 ? '…' : ''}”.`);
        play('pop', sound);
      }
    } catch (e) {
      toast(e instanceof LookupError ? e.message : 'Lookup failed.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const what = identify(draft);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }}
          placeholder="Paste a DOI or arXiv link…"
          aria-label="DOI or arXiv link"
          spellCheck={false}
          style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
        />
        <button
          className="btn icon primary"
          onClick={() => void add()}
          disabled={busy || !draft.trim()}
          aria-label="Look it up"
          style={{ padding: 8 }}
        >
          <Icon name={busy ? 'repeat' : 'plus'} size={16} />
        </button>
      </div>

      {draft.trim() && (
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-faint)' }}>
          {busy
            ? 'Asking the registry…'
            : what.kind === 'doi'
              ? `DOI ${what.doi} — Crossref will fill this in.`
              : what.kind === 'arxiv'
                ? `arXiv ${what.arxivId} — looked up via DataCite.`
                : what.kind === 'url'
                  ? 'Not a DOI or arXiv id, so it’s saved as a plain link.'
                  : 'Paste a DOI (10.xxxx/…) or an arXiv link.'}
        </p>
      )}

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {papers.length === 0 && (
          <Empty icon="book">
            Nothing to read yet. Paste a DOI and it fills in title, authors, year and abstract.
          </Empty>
        )}

        <AnimatePresence initial={false}>
          {toRead.map((p) => (
            <Card key={p.id} paper={p} accent={accent} open={open === p.id}
              onOpen={() => setOpen(open === p.id ? null : p.id)}
              onEdit={(x) => edit(p.id, x)}
              onRemove={() => write(papers.filter((y) => y.id !== p.id))}
              sound={sound} />
          ))}
        </AnimatePresence>

        {read.length > 0 && (
          <Section label={`Read · ${read.length}`}>
            <AnimatePresence initial={false}>
              {read.map((p) => (
                <Card key={p.id} paper={p} accent={accent} open={open === p.id}
                  onOpen={() => setOpen(open === p.id ? null : p.id)}
                  onEdit={(x) => edit(p.id, x)}
                  onRemove={() => write(papers.filter((y) => y.id !== p.id))}
                  sound={sound} />
              ))}
            </AnimatePresence>
          </Section>
        )}
      </div>
    </div>
  );
}

function Card({
  paper, accent, open, onOpen, onEdit, onRemove, sound,
}: {
  paper: Paper;
  accent: string;
  open: boolean;
  onOpen: () => void;
  onEdit: (p: Partial<Paper>) => void;
  onRemove: () => void;
  sound: boolean;
}) {
  const [showAbstract, setShowAbstract] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: paper.read ? 0.72 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        border: '2px solid var(--line)', borderRadius: 'var(--r)', padding: 9,
        marginBottom: 7, background: 'var(--surface-2)',
      }}
    >
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <div style={{ paddingTop: 1 }}>
          <Checkbox
            checked={paper.read}
            onChange={() => { onEdit({ read: !paper.read }); if (!paper.read) play('pop', sound); }}
            accent={accent}
            size={21}
            label={paper.title || 'this paper'}
          />
        </div>
        <button
          onClick={onOpen}
          style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
          aria-expanded={open}
        >
          <span
            style={{
              display: 'block', fontWeight: 700, fontSize: 13, lineHeight: 1.35,
              wordBreak: 'break-word',
              textDecoration: paper.read ? 'line-through' : 'none',
            }}
          >
            {paper.title || <span style={{ color: 'var(--ink-faint)' }}>Untitled — add a title</span>}
          </span>
          {(paper.authors || paper.year) && (
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)' }}>
              {[paper.authors, paper.year, paper.venue].filter(Boolean).join(' · ')}
            </span>
          )}
          {paper.takeaway && (
            <span className="hand" style={{ display: 'block', fontSize: 16, marginTop: 3, lineHeight: 1.3 }}>
              “{paper.takeaway}”
            </span>
          )}
        </button>
        {paper.url && (
          <a
            className="btn ghost tiny"
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the paper"
            style={{ padding: 4 }}
          >
            <Icon name="link" size={13} />
          </a>
        )}
        <button className="btn ghost tiny" onClick={onOpen} aria-label="Details" style={{ padding: 4 }}>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={13} />
        </button>
      </div>

      {open && (
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          <input
            value={paper.title}
            onChange={(e) => onEdit({ title: e.target.value })}
            placeholder="Title"
            aria-label="Title"
            style={{ fontSize: 13, borderWidth: 2, fontWeight: 700 }}
          />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <input value={paper.authors} onChange={(e) => onEdit({ authors: e.target.value })}
              placeholder="Authors" aria-label="Authors" style={{ flex: 2, minWidth: 120, ...sm }} />
            <input value={paper.year} onChange={(e) => onEdit({ year: e.target.value })}
              placeholder="Year" aria-label="Year" style={{ width: 68, ...sm }} />
          </div>
          <input value={paper.venue ?? ''} onChange={(e) => onEdit({ venue: e.target.value })}
            placeholder="Journal or venue" aria-label="Venue" style={sm} />

          <label style={{ display: 'grid', gap: 3 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)' }}>
              The one-line takeaway
            </span>
            <textarea
              value={paper.takeaway}
              onChange={(e) => onEdit({ takeaway: e.target.value })}
              placeholder="If you can't say it in a line, you haven't finished reading it."
              rows={2}
              aria-label="Takeaway"
              className="hand"
              style={{ fontSize: 17, lineHeight: 1.3, resize: 'none' }}
            />
          </label>

          {paper.abstract && (
            <div>
              <button className="btn ghost tiny" onClick={() => setShowAbstract((v) => !v)}>
                <Icon name={showAbstract ? 'chevronUp' : 'chevronDown'} size={12} />
                {showAbstract ? 'Hide abstract' : 'Abstract'}
              </button>
              {showAbstract && (
                <p
                  className="scroll"
                  style={{
                    margin: '6px 0 0', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-soft)',
                    maxHeight: 150, paddingRight: 4,
                  }}
                >
                  {paper.abstract}
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 700 }}>Worth it?</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => onEdit({ stars: paper.stars === n ? undefined : n })}
                aria-label={`${n} stars`}
                style={{ background: 'none', border: 'none', padding: 1, lineHeight: 0 }}
              >
                <Icon
                  name="star"
                  size={15}
                  color={(paper.stars ?? 0) >= n ? '#D9A93F' : 'var(--line)'}
                  style={{ fill: (paper.stars ?? 0) >= n ? '#EFCE7B' : 'none' }}
                />
              </button>
            ))}
            <span style={{ flex: 1 }} />
            {paper.doi && (
              <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{paper.doi}</span>
            )}
            <button className="btn ghost tiny" style={{ color: '#B4544A' }} onClick={onRemove}>
              <Icon name="trash" size={12} />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const sm: React.CSSProperties = { padding: '4px 8px', fontSize: 12, borderWidth: 2 };
