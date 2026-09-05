/** Journal, countdown, thermometer, life wheel, materials locker. */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Material, Sector, Widget } from '../../lib/types';
import { useDoc, useUI } from '../../lib/store';
import { Icon } from '../Icons';
import { Empty } from '../ui';
import { addDays, daysBetween, prettyDate, today } from '../../lib/dates';
import { play } from '../../lib/sound';
import { readableOn } from '../../lib/themes';
import { uid } from '../../lib/id';
import { deleteFile, kindOfMime, putFile, urlFor } from '../../lib/files';
import { formatBytes } from '../../lib/media';
import { useRef } from 'react';

/* ================================================================== */
/* journal — the same few questions, every day                         */
/* ================================================================== */

export function JournalWidget({ widget }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const [date, setDate] = useState(today());
  const [editing, setEditing] = useState(false);

  const prompts = widget.data.prompts ?? [];
  const entries = useMemo(() => widget.data.entries ?? {}, [widget.data.entries]);
  const answers = entries[date] ?? {};
  const t = today();

  const write = (prompt: string, value: string) =>
    patch(widget.id, { entries: { ...entries, [date]: { ...answers, [prompt]: value } } });

  const written = useMemo(
    () => Object.keys(entries).filter((d) => Object.values(entries[d] ?? {}).some((v) => v.trim())).sort().reverse(),
    [entries],
  );
  const filled = prompts.filter((p) => answers[p]?.trim()).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn ghost tiny" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <Icon name="chevronLeft" size={13} />
        </button>
        <b className="hand" style={{ flex: 1, textAlign: 'center', fontSize: 19 }}>
          {date === t ? 'Today' : prettyDate(date)}
        </b>
        <button
          className="btn ghost tiny"
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= t}
          aria-label="Next day"
        >
          <Icon name="chevronRight" size={13} />
        </button>
        <button
          className={`btn ghost tiny ${editing ? 'primary' : ''}`}
          onClick={() => setEditing((v) => !v)}
          title="Edit the questions"
        >
          <Icon name="gear" size={13} />
        </button>
      </div>

      {editing ? (
        <PromptEditor widget={widget} prompts={prompts} />
      ) : (
        <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 9, alignContent: 'start', marginRight: -6, paddingRight: 6 }}>
          {prompts.map((p) => (
            <label key={p} style={{ display: 'grid', gap: 3 }}>
              <span className="hand" style={{ fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.2 }}>
                {p}
              </span>
              <textarea
                value={answers[p] ?? ''}
                onChange={(e) => write(p, e.target.value)}
                rows={p.length > 40 ? 3 : 2}
                placeholder="…"
                aria-label={p}
                style={{
                  fontSize: 13, lineHeight: '24px', resize: 'vertical',
                  backgroundImage:
                    'repeating-linear-gradient(transparent, transparent 23px, color-mix(in srgb, var(--ink) 10%, transparent) 23px, color-mix(in srgb, var(--ink) 10%, transparent) 24px)',
                }}
              />
            </label>
          ))}
          {prompts.length === 0 && <Empty icon="pencil">No questions yet — add some with the gear.</Empty>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11.5, color: 'var(--ink-faint)' }}>
        <span>{filled}/{prompts.length} answered</span>
        <span style={{ flex: 1 }} />
        {written.length > 0 && <span>{written.length} day{written.length === 1 ? '' : 's'} written</span>}
      </div>
    </div>
  );
}

function PromptEditor({ widget, prompts }: { widget: Widget; prompts: string[] }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const [draft, setDraft] = useState('');
  const set = (next: string[]) => patch(widget.id, { prompts: next });
  return (
    <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 5, alignContent: 'start' }}>
      {prompts.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            value={p}
            onChange={(e) => set(prompts.map((x, j) => (j === i ? e.target.value : x)))}
            aria-label={`Question ${i + 1}`}
            style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderWidth: 2 }}
          />
          <button className="btn ghost tiny" onClick={() => set(prompts.filter((_, j) => j !== i))} aria-label="Remove question" style={{ padding: 3 }}>
            <Icon name="close" size={12} />
          </button>
        </div>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) { set([...prompts, draft.trim()]); setDraft(''); }
        }}
        placeholder="+ another question"
        aria-label="Add a question"
        style={{ padding: '4px 8px', fontSize: 12, borderWidth: 2, borderStyle: 'dashed' }}
      />
      <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
        The same questions every day is what makes this work. Changing them keeps old answers.
      </p>
    </div>
  );
}

/* ================================================================== */
/* countdown                                                           */
/* ================================================================== */

export function CountdownWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const updateWidget = useDoc((s) => s.updateWidget);
  const accent = widget.accent ?? sector.accent;
  const target = widget.data.targetDate;
  const t = today();

  if (!target) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', gap: 8 }}>
        <Empty icon="clock">What are you counting down to?</Empty>
        <input
          type="date"
          onChange={(e) => e.target.value && patch(widget.id, { targetDate: e.target.value })}
          aria-label="The date"
          style={{ fontSize: 13 }}
        />
      </div>
    );
  }

  const days = daysBetween(t, target);
  const past = days < 0;
  const n = Math.abs(days);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, textAlign: 'center' }}>
      <motion.div
        key={days}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        style={{
          fontSize: 52, fontWeight: 700, lineHeight: 1,
          color: accent, WebkitTextStroke: `2px color-mix(in srgb, ${accent} 55%, var(--ink))`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {days === 0 ? '🎉' : n}
      </motion.div>
      <span className="hand" style={{ fontSize: 21, lineHeight: 1.1 }}>
        {days === 0 ? 'Today!' : past ? `day${n === 1 ? '' : 's'} since` : `day${n === 1 ? '' : 's'} to go`}
      </span>
      <input
        value={widget.title === 'Countdown' ? '' : widget.title}
        onChange={(e) => updateWidget(widget.id, { title: e.target.value || 'Countdown' })}
        placeholder="what for?"
        aria-label="What the countdown is for"
        className="hand"
        style={{
          border: 'none', background: 'transparent', textAlign: 'center',
          fontSize: 19, padding: 0, width: '100%',
        }}
      />
      <input
        type="date"
        value={target}
        onChange={(e) => patch(widget.id, { targetDate: e.target.value || undefined })}
        aria-label="The date"
        style={{ padding: '3px 8px', fontSize: 11.5, borderWidth: 2, marginTop: 4 }}
      />
      <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{prettyDate(target)}</span>
    </div>
  );
}

/* ================================================================== */
/* thermometer — savings, debt, a spending jar                         */
/* ================================================================== */

export function ThermometerWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const sound = useDoc((s) => s.doc.settings.sound);
  const cheer = useUI((s) => s.cheer);
  const setMood = useUI((s) => s.setMood);
  const confetti = useDoc((s) => s.doc.settings.confetti);

  const accent = widget.accent ?? sector.accent;
  const goal = widget.data.goalAmount ?? 1000;
  const current = widget.data.currentAmount ?? 0;
  const unit = widget.data.unit ?? '$';
  const down = widget.data.countDown ?? false;
  const [amount, setAmount] = useState('');

  const pct = goal > 0 ? Math.max(0, Math.min(100, (current / goal) * 100)) : 0;
  const shown = down ? 100 - pct : pct;
  const remaining = Math.max(0, goal - current);

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(goal, current + delta));
    patch(widget.id, { currentAmount: next });
    if (delta > 0) {
      play(next >= goal ? 'chime' : 'tick', sound);
      if (next >= goal) { if (confetti) cheer(); setMood('cheer', 2600); }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', gap: 11, minHeight: 0 }}>
      {/* the jar */}
      <div
        style={{
          width: 62, flexShrink: 0, borderRadius: '14px 14px 20px 20px',
          border: '3px solid var(--line)', background: 'var(--surface-2)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          justifyContent: 'flex-end', position: 'relative',
        }}
        role="progressbar"
        aria-valuenow={Math.round(shown)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={widget.title}
      >
        <motion.div
          animate={{ height: `${shown}%` }}
          transition={{ type: 'spring', stiffness: 160, damping: 22 }}
          style={{ background: accent, width: '100%' }}
        />
        <span
          style={{
            position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
            fontSize: 15, fontWeight: 700, color: 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(shown)}%
        </span>
        {/* fill lines, like a measuring jug */}
        {[25, 50, 75].map((p) => (
          <span
            key={p}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: `${p}%`, height: 0,
              borderTop: '1.5px dashed color-mix(in srgb, var(--ink) 22%, transparent)',
            }}
          />
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.1 }}>
            {unit}{current.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            of {unit}{goal.toLocaleString()}
            {current >= goal ? ' · done' : ` · ${unit}${remaining.toLocaleString()} ${down ? 'left' : 'to go'}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && amount) { move(Number(amount)); setAmount(''); }
            }}
            placeholder="0"
            aria-label="Amount to add"
            style={{ flex: 1, padding: '5px 8px', fontSize: 12.5, borderWidth: 2, textAlign: 'right' }}
          />
          <button
            className="btn tiny primary"
            onClick={() => { if (amount) { move(Number(amount)); setAmount(''); } }}
            disabled={!amount}
          >
            add
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[10, 25, 50, 100].map((n) => (
            <button key={n} className="btn tiny" onClick={() => move(n)}>+{n}</button>
          ))}
          <button className="btn ghost tiny" onClick={() => move(-10)}>−10</button>
        </div>

        <div style={{ marginTop: 'auto', display: 'grid', gap: 5 }}>
          <label style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 11.5 }}>
            goal
            <input
              type="number"
              value={goal}
              onChange={(e) => patch(widget.id, { goalAmount: Math.max(1, Number(e.target.value) || 1) })}
              aria-label="Goal amount"
              style={{ flex: 1, padding: '3px 7px', fontSize: 12, borderWidth: 2, textAlign: 'right' }}
            />
            <input
              value={unit}
              onChange={(e) => patch(widget.id, { unit: e.target.value.slice(0, 3) })}
              aria-label="Unit"
              style={{ width: 34, padding: '3px 5px', fontSize: 12, borderWidth: 2, textAlign: 'center' }}
            />
          </label>
          <button
            className={`btn tiny ${down ? 'primary' : ''}`}
            onClick={() => patch(widget.id, { countDown: !down })}
            title="A debt empties as you pay it; savings fill up"
          >
            {down ? 'emptying (debt)' : 'filling (saving)'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* wheel — level 10 life, scored across your own sectors               */
/* ================================================================== */

export function WheelWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const sectors = useDoc((s) => s.doc.sectors);
  const accent = widget.accent ?? sector.accent;
  const spokes = widget.data.spokes ?? [];

  // seed from the tabs you already made — the wheel should mirror your life,
  // not a stock list of "life areas"
  if (!spokes.length) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', gap: 9, textAlign: 'center' }}>
        <Empty icon="palette">Score each part of your life, one to ten.</Empty>
        <button
          className="btn primary"
          onClick={() =>
            patch(widget.id, {
              spokes: (sectors.length ? sectors.map((s) => s.name) : ['Work', 'Health', 'Social', 'Home', 'Money', 'Growth'])
                .map((label) => ({ id: uid().slice(0, 6), label, score: 5 })),
            })
          }
        >
          <Icon name="sparkle" size={15} />
          {sectors.length ? `Use my ${sectors.length} tabs` : 'Start with six areas'}
        </button>
      </div>
    );
  }

  const n = spokes.length;
  const R = 66;
  const cx = 78;
  const cy = 78;
  const point = (i: number, r: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };
  const path = spokes
    .map((s, i) => {
      const [x, y] = point(i, (s.score / 10) * R);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
  const average = spokes.reduce((a, s) => a + s.score, 0) / n;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <svg viewBox="0 0 156 156" width={132} height={132} style={{ flexShrink: 0 }} aria-hidden="true">
          {[2, 4, 6, 8, 10].map((ring) => (
            <circle key={ring} cx={cx} cy={cy} r={(ring / 10) * R} fill="none"
              stroke="var(--line)" strokeWidth={ring === 10 ? 2 : 1} strokeDasharray={ring === 10 ? undefined : '2 3'} />
          ))}
          {spokes.map((_, i) => {
            const [x, y] = point(i, R);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />;
          })}
          <path d={path} fill={accent} fillOpacity="0.42" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
          {spokes.map((s, i) => {
            const [x, y] = point(i, (s.score / 10) * R);
            return <circle key={s.id} cx={x} cy={y} r="3" fill="var(--surface)" stroke={accent} strokeWidth="2" />;
          })}
        </svg>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 25, fontWeight: 700, lineHeight: 1 }}>
            {(Math.round(average * 10) / 10).toFixed(1)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>average</div>
          <p className="hand" style={{ margin: '6px 0 0', fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.3 }}>
            {(() => {
              const low = [...spokes].sort((a, b) => a.score - b.score)[0];
              return low.score <= 4
                ? `${low.label} is the thin bit right now.`
                : 'Fairly round. Unusual and nice.';
            })()}
          </p>
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, display: 'grid', gap: 5, alignContent: 'start' }}>
        {spokes.map((s) => (
          <div key={s.id} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <input
              value={s.label}
              onChange={(e) =>
                patch(widget.id, { spokes: spokes.map((x) => (x.id === s.id ? { ...x, label: e.target.value } : x)) })
              }
              aria-label="Area name"
              style={{ width: 84, padding: '3px 7px', fontSize: 11.5, borderWidth: 2 }}
            />
            <input
              type="range" min={1} max={10} value={s.score}
              onChange={(e) =>
                patch(widget.id, { spokes: spokes.map((x) => (x.id === s.id ? { ...x, score: Number(e.target.value) } : x)) })
              }
              aria-label={`${s.label} score`}
              style={{ flex: 1, border: 'none', background: 'transparent', padding: 0 }}
            />
            <b style={{ fontSize: 12, width: 18, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{s.score}</b>
            <button
              className="btn ghost tiny"
              onClick={() => patch(widget.id, { spokes: spokes.filter((x) => x.id !== s.id) })}
              aria-label={`Remove ${s.label}`}
              style={{ padding: 2 }}
            >
              <Icon name="close" size={11} />
            </button>
          </div>
        ))}
        <button
          className="btn ghost tiny"
          style={{ justifySelf: 'start' }}
          onClick={() => patch(widget.id, { spokes: [...spokes, { id: uid().slice(0, 6), label: 'New area', score: 5 }] })}
        >
          <Icon name="plus" size={12} /> area
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* materials locker                                                    */
/* ================================================================== */

const KINDS: Material['kind'][] = ['resume', 'statement', 'essay', 'transcript', 'letter', 'portfolio', 'other'];
const KIND_COLOR: Record<Material['kind'], string> = {
  resume: '#A3C4E0', statement: '#C0A9DB', essay: '#EFCE7B', transcript: '#9FCFB8',
  letter: '#EFA3B0', portfolio: '#95CBC8', other: '#D9C7B8',
};

/** A resume called "resume-2026.pdf" should file itself as a resume. */
function guessKind(name: string): Material['kind'] {
  const n = name.toLowerCase();
  if (/resume|cv\b/.test(n)) return 'resume';
  if (/statement|sop\b|purpose/.test(n)) return 'statement';
  if (/essay|writing|sample/.test(n)) return 'essay';
  if (/transcript|grades|marks/.test(n)) return 'transcript';
  if (/letter|rec\b|reference/.test(n)) return 'letter';
  if (/portfolio|work/.test(n)) return 'portfolio';
  return 'other';
}

/** "resume-2026.pdf" → "resume 2026" for the row's title. */
function tidyName(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_-]+/g, ' ').trim() || name;
}

export function MaterialsWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const materials = useDoc((s) => s.doc.materials);
  const items = useDoc((s) => s.doc.items);
  const add = useDoc((s) => s.addMaterial);
  const update = useDoc((s) => s.updateMaterial);
  const remove = useDoc((s) => s.removeMaterial);
  const accent = widget.accent ?? sector.accent;

  const toast = useUI((s) => s.toast);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  /** the material an incoming file should replace, or null for a new one */
  const replacing = useRef<string | null>(null);

  const usedBy = (id: string) => items.filter((i) => i.materials.includes(id)).length;

  /**
   * Take in real documents. The bytes go to the browser's file store, and only
   * the id lands in the board — a 4 MB PDF in the document JSON would eat the
   * whole 5 MB localStorage budget on its own.
   */
  const importFiles = async (files: FileList | null) => {
    const chosen = Array.from(files ?? []);
    const target = replacing.current;
    replacing.current = null;
    if (!chosen.length) return;
    setBusy(true);
    try {
      for (const file of chosen) {
        const stored = await putFile(file, file.name);
        const patch = {
          fileId: stored.id, fileName: stored.name, mime: stored.mime, size: stored.size,
          updatedOn: today(),
        };
        if (target) {
          const old = materials.find((m) => m.id === target);
          update(target, patch);
          // the replaced version's bytes are no use to anyone
          if (old?.fileId) void deleteFile(old.fileId);
          break;   // replacing takes one file, not a pile
        }
        const id = add({
          name: tidyName(file.name),
          kind: guessKind(file.name),
          version: 'v1',
          ...patch,
        });
        setOpen(id);
      }
      toast(chosen.length > 1 ? `${chosen.length} documents filed.` : `“${chosen[0].name}” filed.`);
    } catch {
      toast('That file wouldn’t save. It may be too big for this browser.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              const id = add({ name: draft.trim(), kind: 'resume', version: 'v1', updatedOn: today() });
              setDraft('');
              setOpen(id);
            }
          }}
          placeholder="Resume, personal statement, essay draft…"
          aria-label="New material"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
        />
        <button
          className="btn icon"
          onClick={() => { replacing.current = null; fileRef.current?.click(); }}
          aria-label="Import a document"
          title="Import a PDF, image or document"
          disabled={busy}
          style={{ padding: 8 }}
        >
          <Icon name={busy ? 'clock' : 'upload'} size={16} />
        </button>
        <button
          className="btn icon primary"
          onClick={() => {
            if (!draft.trim()) return;
            const id = add({ name: draft.trim(), kind: 'resume', version: 'v1', updatedOn: today() });
            setDraft('');
            setOpen(id);
          }}
          aria-label="Add material"
          style={{ padding: 8 }}
        >
          <Icon name="plus" size={16} />
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,application/pdf,image/*,.doc,.docx,.odt,.rtf,.txt,.md,.pages"
          onChange={(e) => { void importFiles(e.target.files); e.target.value = ''; }}
          hidden
        />
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {materials.length === 0 && (
          <Empty icon="copy">
            Import your PDFs and keep each document once, with its version. Then attach it to as
            many applications as you like.
          </Empty>
        )}
        <AnimatePresence initial={false}>
          {materials.map((m) => {
            const used = usedBy(m.id);
            return (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  border: '2px solid var(--line)', borderRadius: 'var(--r)', padding: 9,
                  marginBottom: 7, background: 'var(--surface-2)',
                  // a paper clip on the corner, because that's what it is
                  position: 'relative',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute', top: -7, right: 13, width: 11, height: 20,
                    borderRadius: '6px 6px 2px 2px', border: '2.5px solid var(--muted)',
                    borderBottom: 'none', background: 'transparent', rotate: '12deg',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                      background: KIND_COLOR[m.kind], border: '1.5px solid var(--line)',
                    }}
                  />
                  <button
                    onClick={() => setOpen(open === m.id ? null : m.id)}
                    style={{ flex: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left', minWidth: 0 }}
                    aria-expanded={open === m.id}
                  >
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 13, wordBreak: 'break-word' }}>
                      {m.name} <span style={{ color: 'var(--ink-faint)', fontWeight: 600 }}>{m.version}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-soft)' }}>
                      {m.kind} · updated {m.updatedOn}
                      {m.size ? ` · ${kindOfMime(m.mime ?? '', m.fileName).toUpperCase()} ${formatBytes(m.size)}` : ''}
                      {used > 0 && ` · attached to ${used}`}
                    </span>
                  </button>
                  {m.fileId && <FileButtons material={m} />}
                  {m.url && (
                    <a className="btn ghost tiny" href={m.url} target="_blank" rel="noopener noreferrer" aria-label="Open the link" style={{ padding: 4 }}>
                      <Icon name="link" size={12} />
                    </a>
                  )}
                  <button className="btn ghost tiny" onClick={() => setOpen(open === m.id ? null : m.id)} aria-label="Details" style={{ padding: 4 }}>
                    <Icon name={open === m.id ? 'chevronUp' : 'chevronDown'} size={12} />
                  </button>
                </div>

                {open === m.id && (
                  <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                    <input value={m.name} onChange={(e) => update(m.id, { name: e.target.value })}
                      placeholder="Name" aria-label="Name" style={{ ...sm, fontWeight: 700 }} />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {KINDS.map((k) => (
                        <button
                          key={k}
                          onClick={() => update(m.id, { kind: k })}
                          aria-pressed={m.kind === k}
                          style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                            border: `2px solid ${m.kind === k ? KIND_COLOR[k] : 'var(--line)'}`,
                            background: m.kind === k ? KIND_COLOR[k] : 'transparent',
                            color: m.kind === k ? readableOn(KIND_COLOR[k]) : 'var(--ink-faint)',
                          }}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <input value={m.version} onChange={(e) => update(m.id, { version: e.target.value })}
                        placeholder="v1" aria-label="Version" style={{ ...sm, width: 74 }} />
                      <input value={m.url ?? ''} onChange={(e) => update(m.id, { url: e.target.value })}
                        placeholder="Or a link (Drive, Dropbox…)" aria-label="Link" style={{ ...sm, flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn tiny"
                        disabled={busy}
                        onClick={() => { replacing.current = m.id; fileRef.current?.click(); }}
                        title={m.fileId ? 'Swap in a newer draft' : 'Attach the actual document'}
                      >
                        <Icon name="upload" size={12} />
                        {m.fileId ? 'Replace the file' : 'Attach a file'}
                      </button>
                      {m.fileId && (
                        <>
                          <span style={{ fontSize: 11, color: 'var(--ink-faint)', minWidth: 0, wordBreak: 'break-all' }}>
                            {m.fileName} · {formatBytes(m.size ?? 0)}
                          </span>
                          <button
                            className="btn ghost tiny"
                            onClick={() => {
                              void deleteFile(m.fileId!);
                              update(m.id, { fileId: undefined, fileName: undefined, mime: undefined, size: undefined });
                            }}
                            title="Keep the entry, drop the file"
                          >
                            <Icon name="close" size={12} /> file
                          </button>
                        </>
                      )}
                    </div>
                    <textarea value={m.notes ?? ''} onChange={(e) => update(m.id, { notes: e.target.value })}
                      placeholder="What makes this version different" rows={2} aria-label="Notes" style={{ fontSize: 12.5 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        {used === 0 ? 'not attached to anything yet' : `attached to ${used} application${used === 1 ? '' : 's'}`}
                      </span>
                      <span style={{ flex: 1 }} />
                      <button
                        className="btn ghost tiny"
                        style={{ color: '#B4544A' }}
                        onClick={() => { if (m.fileId) void deleteFile(m.fileId); remove(m.id); }}
                      >
                        <Icon name="trash" size={12} /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <span hidden>{accent}</span>
    </div>
  );
}

/**
 * Open or save an imported document.
 *
 * The bytes are in IndexedDB, so there's no URL until we mint one — hence the
 * click-then-open rather than a plain <a href>. Opening a PDF this way hands
 * it to the browser's own viewer.
 */
function FileButtons({ material }: { material: Material }) {
  const toast = useUI((s) => s.toast);

  const withUrl = async (fn: (url: string) => void) => {
    if (!material.fileId) return;
    const url = await urlFor(material.fileId);
    if (!url) { toast('That file isn’t in this browser any more.', 'warn'); return; }
    fn(url);
  };

  return (
    <>
      <button
        className="btn ghost tiny"
        onClick={() => void withUrl((url) => window.open(url, '_blank', 'noopener'))}
        aria-label={`Open ${material.fileName ?? material.name}`}
        title="Open it"
        style={{ padding: 4 }}
      >
        <Icon name="play" size={12} />
      </button>
      <button
        className="btn ghost tiny"
        onClick={() => void withUrl((url) => {
          const a = document.createElement('a');
          a.href = url;
          a.download = material.fileName ?? material.name;
          a.click();
        })}
        aria-label={`Save a copy of ${material.fileName ?? material.name}`}
        title="Save a copy"
        style={{ padding: 4 }}
      >
        <Icon name="download" size={12} />
      </button>
    </>
  );
}

const sm: React.CSSProperties = { padding: '4px 8px', fontSize: 12, borderWidth: 2 };
