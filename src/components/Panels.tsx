import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Panel, Toggle, Field, Row, Empty } from './ui';
import { Icon, SECTOR_ICONS, type IconName } from './Icons';
import { useDoc, useUI, storageUsed, sortedSectors } from '../lib/store';
import { CATALOGUE, GROUPS, searchCatalogue, type Entry } from '../lib/catalogue';
import type { Doc } from '../lib/types';
import { PASTELS, THEMES, readableOn } from '../lib/themes';
import { formatBytes } from '../lib/media';
import { Avatar, AvatarRoom, AVATAR_COLORS, SPECIES_LIST } from './Avatar';
import { COSMETICS, cosmeticsFor, isUnlocked, type Cosmetic } from '../lib/cosmetics';
import { seasonOf } from '../lib/dates';

/* ------------------------------------------------------------------ */
/* widget picker                                                       */
/* ------------------------------------------------------------------ */

export function WidgetPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeId = useDoc((s) => s.doc.activeSectorId);
  const sector = useDoc((s) => s.doc.sectors.find((x) => x.id === s.doc.activeSectorId));
  const addWidget = useDoc((s) => s.addWidget);
  const patchWidgetData = useDoc((s) => s.patchWidgetData);
  const updateWidget = useDoc((s) => s.updateWidget);
  const addItem = useDoc((s) => s.addItem);
  const addItemStep = useDoc((s) => s.addItemStep);
  const toast = useUI((s) => s.toast);
  const [q, setQ] = useState('');

  const results = useMemo(() => searchCatalogue(q, sector?.name ?? ''), [q, sector?.name]);

  const add = (entry: Entry) => {
    if (!activeId) return;
    const id = addWidget(activeId, entry.type);
    if (entry.data) patchWidgetData(id, entry.data);
    if (entry.rename) updateWidget(id, { title: entry.label });

    // a collection with a pipeline should open with a row in its first column
    if (entry.type === 'collection' && entry.data?.fields?.length) {
      const group = entry.data.fields.find((f) => f.id === entry.data?.groupBy);
      const first = group?.options?.[0]?.id;
      const rowId = addItem(id, activeId, group && first ? { [group.id]: first } : {});
      for (const step of entry.checklist ?? []) addItemStep(rowId, step);
    }

    toast(`Added ${entry.label} to ${sector?.name ?? 'this page'}.`);
    onClose();
  };

  /* group the results, but only when nothing is being searched for */
  const grouped = useMemo(() => {
    if (q.trim()) return null;
    return GROUPS.map((g) => ({ group: g, entries: results.filter((e) => e.group === g) }))
      .filter((x) => x.entries.length);
  }, [q, results]);

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="Add to this page"
      subtitle={sector ? `Onto ${sector.name} · ${CATALOGUE.length} things` : undefined}
      width={470}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search — applications, habit grid, books, sleep, weekly…"
        aria-label="Search what to add"
        autoFocus
        style={{ width: '100%', marginBottom: 12 }}
      />

      {grouped
        ? grouped.map(({ group, entries }) => (
            <div key={group} style={{ marginBottom: 16 }}>
              <p
                style={{
                  margin: '0 0 7px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                  textTransform: 'uppercase', color: 'var(--ink-faint)',
                }}
              >
                {group}
              </p>
              <div style={{ display: 'grid', gap: 7 }}>
                {entries.map((e) => (
                  <CatalogueRow key={e.key} entry={e} sector={sector} onAdd={() => add(e)} />
                ))}
              </div>
            </div>
          ))
        : (
          <div style={{ display: 'grid', gap: 7 }}>
            {results.length === 0 && (
              <Empty icon="sparkle">Nothing matches that. Try “list”, “grid” or “log”.</Empty>
            )}
            {results.map((e) => (
              <CatalogueRow key={e.key} entry={e} sector={sector} onAdd={() => add(e)} />
            ))}
          </div>
        )}
    </Panel>
  );
}

function CatalogueRow({
  entry, sector, onAdd,
}: {
  entry: Entry;
  sector?: { name: string; accent: string };
  onAdd: () => void;
}) {
  const suits = Boolean(sector && entry.sectors?.includes(sector.name));
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      onClick={onAdd}
      style={{
        display: 'flex', gap: 11, alignItems: 'flex-start', textAlign: 'left',
        padding: 11, borderRadius: 'var(--r)',
        border: `3px solid ${suits ? (sector?.accent ?? 'var(--line)') : 'var(--line)'}`,
        background: suits ? 'var(--accent-tint)' : 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <span
        style={{
          width: 38, height: 38, borderRadius: 13, flexShrink: 0, display: 'grid',
          placeItems: 'center', background: sector?.accent ?? 'var(--accent)',
          border: '3px solid var(--line)',
          color: readableOn(sector?.accent ?? '#E8A598'),
        }}
      >
        <Icon name={entry.icon} size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{entry.label}</span>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
          {entry.blurb}
        </span>
      </span>
      <Icon name="plus" size={16} color="var(--ink-faint)" style={{ marginTop: 3 }} />
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* sectors                                                             */
/* ------------------------------------------------------------------ */

export function SectorsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const allSectors = useDoc((s) => s.doc.sectors);
  const sectors = useMemo(() => sortedSectors(allSectors), [allSectors]);
  const updateSector = useDoc((s) => s.updateSector);
  const removeSector = useDoc((s) => s.removeSector);
  const moveSector = useDoc((s) => s.moveSector);
  const addSector = useDoc((s) => s.addSector);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    addSector(
      name,
      PASTELS[sectors.length % PASTELS.length].value,
      SECTOR_ICONS[(sectors.length + 2) % SECTOR_ICONS.length],
    );
    setDraft('');
  };

  return (
    <Panel open={open} onClose={onClose} title="Your tabs" subtitle="Each part of life gets its own page and colour.">
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder="New tab name…"
          aria-label="New tab name"
          style={{ flex: 1 }}
        />
        <button className="btn primary" onClick={add}><Icon name="plus" size={16} /> Add</button>
      </div>

      {sectors.map((s, i) => (
        <div
          key={s.id}
          style={{
            border: '3px solid var(--line)', borderRadius: 'var(--r)', padding: 12,
            marginBottom: 12, background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span
              style={{
                width: 34, height: 34, borderRadius: 12, display: 'grid', placeItems: 'center',
                background: s.accent, border: '2px solid var(--line)', flexShrink: 0,
                color: readableOn(s.accent, '#4A3B35'),
              }}
            >
              <Icon name={s.icon as IconName} size={17} />
            </span>
            <input
              value={s.name}
              onChange={(e) => updateSector(s.id, { name: e.target.value })}
              aria-label="Tab name"
              style={{ flex: 1, fontWeight: 700 }}
            />
            <button className="btn ghost tiny" onClick={() => moveSector(s.id, -1)} disabled={i === 0} aria-label="Move up">
              <Icon name="chevronUp" size={14} />
            </button>
            <button className="btn ghost tiny" onClick={() => moveSector(s.id, 1)} disabled={i === sectors.length - 1} aria-label="Move down">
              <Icon name="chevronDown" size={14} />
            </button>
          </div>

          <Row gap={5}>
            {PASTELS.map((p) => (
              <button
                key={p.id}
                onClick={() => updateSector(s.id, { accent: p.value })}
                aria-label={p.name}
                style={{
                  width: 24, height: 24, borderRadius: 8, background: p.value, padding: 0,
                  border: s.accent === p.value ? '3px solid var(--ink)' : '2px solid var(--line)',
                }}
              />
            ))}
          </Row>

          <Row gap={4}>
            {SECTOR_ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => updateSector(s.id, { icon: ic })}
                aria-label={ic}
                className={`btn tiny ${s.icon === ic ? 'primary' : 'ghost'}`}
                style={{ padding: 5, marginTop: 8 }}
              >
                <Icon name={ic} size={15} />
              </button>
            ))}
          </Row>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <button
              className={`btn tiny ${s.snap ? 'primary' : ''}`}
              onClick={() => updateSector(s.id, { snap: !s.snap })}
              title="Line widgets up to an invisible grid"
            >
              <Icon name="grid" size={13} /> Snap {s.snap ? 'on' : 'off'}
            </button>
            <span style={{ flex: 1 }} />
            {confirm === s.id ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Sure? (undoable)</span>
                <button className="btn tiny" style={{ background: '#E8A598' }} onClick={() => { removeSector(s.id); setConfirm(null); }}>
                  Delete
                </button>
                <button className="btn ghost tiny" onClick={() => setConfirm(null)}>No</button>
              </>
            ) : (
              <button className="btn ghost tiny" style={{ color: '#B4544A' }} onClick={() => setConfirm(s.id)}>
                <Icon name="trash" size={13} /> Delete tab
              </button>
            )}
          </div>
        </div>
      ))}
      {sectors.length === 0 && <Empty icon="sparkle">No tabs yet — add your first above.</Empty>}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* avatar + cosmetics                                                  */
/* ------------------------------------------------------------------ */

export function AvatarPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const avatar = useDoc((s) => s.doc.avatar);
  const stats = useDoc((s) => s.doc.stats);
  const motionOn = useDoc((s) => s.doc.settings.motion);
  const updateAvatar = useDoc((s) => s.updateAvatar);
  const season = seasonOf();

  const nextUp = COSMETICS
    .filter((c) => !c.season && c.unlockAt > stats.completed)
    .sort((a, b) => a.unlockAt - b.unlockAt)[0];

  const slotButton = (c: Cosmetic, current: string, onPick: () => void) => {
    const unlocked = isUnlocked(c, stats.completed, season);
    return (
      <button
        key={c.slot + c.id}
        onClick={unlocked ? onPick : undefined}
        disabled={!unlocked}
        title={unlocked ? c.blurb : `Unlocks at ${c.unlockAt} finished things`}
        className={`btn tiny ${current === c.id ? 'primary' : ''}`}
        style={{ opacity: unlocked ? 1 : 0.45 }}
      >
        {!unlocked && <Icon name="lock" size={11} />}
        {c.name}
      </button>
    );
  };

  return (
    <Panel open={open} onClose={onClose} title={avatar.name} subtitle="Your desk buddy.">
      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 14 }}>
        <AvatarRoom decor={avatar.decor} ink="var(--ink)" size={250}>
          <Avatar
            species={avatar.species}
            color={avatar.color}
            hat={avatar.hat}
            accessory={avatar.accessory}
            mood="idle"
            size={130}
            animate={motionOn}
          />
        </AvatarRoom>
      </div>

      <div
        style={{
          display: 'flex', gap: 10, padding: 12, borderRadius: 'var(--r)',
          border: '3px solid var(--line)', background: 'var(--surface)', marginBottom: 16,
        }}
      >
        <Stat label="finished" value={stats.completed} />
        <Stat label="day streak" value={stats.streak} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)', fontWeight: 700 }}>Next unlock</p>
          {nextUp ? (
            <p style={{ margin: 0, fontSize: 13 }}>
              {nextUp.name} at {nextUp.unlockAt} —{' '}
              <b>{nextUp.unlockAt - stats.completed} to go</b>
            </p>
          ) : (
            <p className="hand" style={{ margin: 0, fontSize: 17 }}>Everything’s unlocked. Show-off.</p>
          )}
        </div>
      </div>

      <Field label="Who">
        <Row>
          {SPECIES_LIST.map((s) => (
            <button
              key={s.id}
              className={`btn tiny ${avatar.species === s.id ? 'primary' : ''}`}
              onClick={() => updateAvatar({ species: s.id })}
            >
              {s.name}
            </button>
          ))}
        </Row>
      </Field>

      <Field label="Name">
        <input
          value={avatar.name}
          onChange={(e) => updateAvatar({ name: e.target.value })}
          maxLength={18}
          style={{ width: 200 }}
          aria-label="Avatar name"
        />
      </Field>

      <Field label="Colour">
        <Row gap={6}>
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateAvatar({ color: c })}
              aria-label={`Colour ${c}`}
              style={{
                width: 30, height: 30, borderRadius: 10, background: c, padding: 0,
                border: avatar.color === c ? '3px solid var(--ink)' : '2px solid var(--line)',
              }}
            />
          ))}
        </Row>
      </Field>

      <Field label="Hat" hint={`Seasonal pieces appear on their own — it's ${season} right now.`}>
        <Row gap={6}>
          {cosmeticsFor('hat').map((c) => slotButton(c, avatar.hat, () => updateAvatar({ hat: c.id })))}
        </Row>
      </Field>

      <Field label="Extras">
        <Row gap={6}>
          {cosmeticsFor('accessory').map((c) =>
            slotButton(c, avatar.accessory, () => updateAvatar({ accessory: c.id })),
          )}
        </Row>
      </Field>

      <Field label="Room" hint="Tap to put things in or take them out.">
        <Row gap={6}>
          {cosmeticsFor('decor').map((c) => {
            const on = avatar.decor.includes(c.id);
            const unlocked = isUnlocked(c, stats.completed, season);
            return (
              <button
                key={c.id}
                disabled={!unlocked}
                title={unlocked ? c.blurb : `Unlocks at ${c.unlockAt} finished things`}
                className={`btn tiny ${on ? 'primary' : ''}`}
                style={{ opacity: unlocked ? 1 : 0.45 }}
                onClick={() =>
                  updateAvatar({
                    decor: on ? avatar.decor.filter((d) => d !== c.id) : [...avatar.decor, c.id],
                  })
                }
              >
                {!unlocked && <Icon name="lock" size={11} />}
                {c.name}
              </button>
            );
          })}
        </Row>
      </Field>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 58 }}>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* settings                                                            */
/* ------------------------------------------------------------------ */

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useDoc((s) => s.doc.settings);
  const googleEmail = useDoc((s) => s.doc.google.email);
  const setPanel = useUI((s) => s.setPanel);
  const doc = useDoc((s) => s.doc);
  const update = useDoc((s) => s.updateSettings);
  const importDoc = useDoc((s) => s.importDoc);
  const resetAll = useDoc((s) => s.resetAll);
  const clearStrokes = useDoc((s) => s.clearStrokes);
  const toast = useUI((s) => s.toast);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const used = storageUsed();

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Saved a copy to your downloads.');
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Doc;
      if (!parsed || !Array.isArray(parsed.sectors)) throw new Error('bad file');
      importDoc(parsed);
      toast('Brought your nook back. ⌘Z undoes this.');
    } catch {
      toast('That file didn’t look like a Nook backup.', 'warn');
    }
  };

  return (
    <Panel open={open} onClose={onClose} title="Settings" subtitle="Make it yours.">
      <Field label="Mood">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 9 }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => update({ themeId: t.id })}
              aria-pressed={settings.themeId === t.id}
              style={{
                padding: 10, borderRadius: 'var(--r)', textAlign: 'left',
                border: `3px solid ${settings.themeId === t.id ? t.accent : 'var(--line)'}`,
                background: t.bg, color: t.text,
                boxShadow: settings.themeId === t.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{t.name}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[t.bg, t.surface, t.text, t.accent, t.muted].map((c, i) => (
                  <span key={i} style={{ width: 18, height: 18, borderRadius: 6, background: c, border: `2px solid ${t.text}33` }} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </Field>

      <div style={{ marginTop: 8 }}>
        <Toggle
          on={settings.timeTint}
          onChange={(v) => update({ timeTint: v })}
          label="Warm up after dark"
          hint="A gentle amber wash in the evening, like a lamp coming on."
        />
        <Toggle
          on={settings.paperTexture}
          onChange={(v) => update({ paperTexture: v })}
          label="Paper grain"
          hint="A little tooth under everything."
        />
        <Toggle
          on={settings.sound}
          onChange={(v) => update({ sound: v })}
          label="Sound"
          hint="A soft pop when you tick something, a page turn between tabs."
        />
        <Toggle
          on={settings.confetti}
          onChange={(v) => update({ confetti: v })}
          label="Confetti"
          hint="Five little bits of paper. Not two hundred."
        />
        <Toggle
          on={settings.wobble}
          onChange={(v) => update({ wobble: v })}
          label="Hand-drawn edges"
          hint="Slightly unsteady borders. Perfect rectangles read as software."
        />
        <Toggle
          on={settings.pageTurn}
          onChange={(v) => update({ pageTurn: v })}
          label="Page turn between tabs"
          hint="The page swings in on the side you came from."
        />
        <Toggle
          on={settings.motion}
          onChange={(v) => update({ motion: v })}
          label="Avatar movement"
          hint="Turn off if the idle breathing is distracting."
        />
      </div>

      <Field label="Pen" hint="One setting, changing how every stroke you've drawn looks.">
        <Row>
          {([
            ['fineliner', 'Fineliner', 'An even line.'],
            ['brush', 'Brush pen', 'Tapers at both ends.'],
            ['highlighter', 'Highlighter', 'Wide and translucent.'],
          ] as const).map(([id, label, why]) => (
            <button
              key={id}
              className={`btn tiny ${settings.penTexture === id ? 'primary' : ''}`}
              onClick={() => update({ penTexture: id })}
              title={why}
            >
              {label}
            </button>
          ))}
        </Row>
      </Field>

      <Field label="This page">
        <Row>
          <button
            className="btn"
            onClick={() => { if (doc.activeSectorId) { clearStrokes(doc.activeSectorId); toast('Cleared the doodles. ⌘Z brings them back.'); } }}
          >
            <Icon name="eraser" size={15} /> Clear doodles
          </button>
        </Row>
      </Field>

      <Field label="Your data" hint={`Everything lives in this browser — about ${formatBytes(used)} so far.`}>
        <Row>
          <button className="btn" onClick={exportJson}><Icon name="download" size={15} /> Export a backup</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} /> Import</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ''; }}
          />
        </Row>
        <div
          style={{
            height: 10, borderRadius: 999, border: '2px solid var(--line)', marginTop: 10,
            background: 'var(--surface)', overflow: 'hidden',
          }}
          role="progressbar"
          aria-label="Storage used"
          aria-valuenow={Math.min(100, Math.round((used / 5_000_000) * 100))}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${Math.min(100, (used / 5_000_000) * 100)}%`, height: '100%', background: 'var(--accent)' }} />
        </div>
      </Field>

      <Field label="Start over">
        {confirmReset ? (
          <Row>
            <span style={{ fontSize: 13 }}>This clears everything. Sure?</span>
            <button className="btn" style={{ background: '#E8A598' }} onClick={() => { resetAll(); setConfirmReset(false); onClose(); }}>
              Yes, reset
            </button>
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>Never mind</button>
          </Row>
        ) : (
          <button className="btn ghost" style={{ color: '#B4544A' }} onClick={() => setConfirmReset(true)}>
            <Icon name="trash" size={15} /> Reset everything
          </button>
        )}
      </Field>

      <Field label="Keys worth knowing">
        <div style={{ display: 'grid', gap: 5, fontSize: 12.5, color: 'var(--ink-soft)' }}>
          {[
            ['⌘Z / ⌘⇧Z', 'undo, redo — everything is undoable'],
            ['T', 'today, across every tab'],
            ['N', 'add a widget'],
            ['V P M E', 'move, pen, highlighter, eraser'],
            ['1…9', 'jump to a tab'],
            ['⌘V', 'paste a screenshot or link onto the page'],
          ].map(([k, what]) => (
            <div key={k} style={{ display: 'flex', gap: 10 }}>
              <kbd
                style={{
                  minWidth: 76, textAlign: 'center', fontFamily: 'inherit', fontWeight: 700,
                  border: '2px solid var(--line)', borderRadius: 8, padding: '1px 6px',
                  background: 'var(--surface)', fontSize: 11.5, color: 'var(--ink)',
                }}
              >
                {k}
              </kbd>
              <span>{what}</span>
            </div>
          ))}
        </div>
      </Field>

      <Field label="Calendars" hint="Two-way sync with Google, straight from your browser.">
        <button className="btn" onClick={() => setPanel('calendars')}>
          <Icon name="calendar" size={15} />
          {googleEmail ? `Synced with ${googleEmail}` : 'Set up calendar sync'}
        </button>
      </Field>
    </Panel>
  );
}
