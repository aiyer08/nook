/**
 * The garden: the widget picker as eleven flowers.
 *
 * Closed, each is a bud on a stem with the category written on a leaf and a
 * dewdrop holding the count. Click and the petals swing open on their hinges,
 * staggered so it ripples rather than snapping, and a tray of seed packets
 * slides out beneath. Close it and one petal drifts down and fades.
 *
 * Typing doesn't filter the list — it shakes the garden. Non-matching flowers
 * droop and desaturate; matches stand up and sway. Same amount of code, much
 * more charming.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CATALOGUE, type Entry } from '../lib/catalogue';
import type { Flower } from '../lib/garden';
import { FAVOURITES, GARDEN, entriesOf, flowerMatches, homeFlowerOf, looseEntries } from '../lib/garden';
import { Bee, FallingPetal, FlowerSvg } from './Flower';
import { Icon } from './Icons';
import { Panel } from './ui';
import { useDoc, useUI } from '../lib/store';
import { play } from '../lib/sound';
import { seasonOf } from '../lib/dates';
import { readableOn } from '../lib/themes';

export function GardenPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const activeId = useDoc((s) => s.doc.activeSectorId);
  const sector = useDoc((s) => s.doc.sectors.find((x) => x.id === s.doc.activeSectorId));
  const widgets = useDoc((s) => s.doc.widgets);
  const addWidget = useDoc((s) => s.addWidget);
  const patchWidgetData = useDoc((s) => s.patchWidgetData);
  const updateWidget = useDoc((s) => s.updateWidget);
  const addItem = useDoc((s) => s.addItem);
  const addItemStep = useDoc((s) => s.addItemStep);
  const sound = useDoc((s) => s.doc.settings.sound);
  const motionOn = useDoc((s) => s.doc.settings.motion);
  const toast = useUI((s) => s.toast);

  const [q, setQ] = useState('');
  const [bloomed, setBloomed] = useState<string | null>(null);
  const [falling, setFalling] = useState<{ id: string; color: string } | null>(null);

  const season = seasonOf();

  /** Which flower has been planted from most — the bee's favourite. */
  const favourite = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of GARDEN) {
      const keys = new Set(f.contents);
      const n = widgets.filter((w) =>
        entriesOf(f).some((e) => e.type === w.type && keys.has(e.key)),
      ).length;
      if (n) counts.set(f.id, n);
    }
    let best: string | null = null;
    let bestN = 0;
    for (const [id, n] of counts) if (n > bestN) { best = id; bestN = n; }
    return bestN >= 2 ? best : null;
  }, [widgets]);

  /** A category with nothing planted stays a tight bud: potential, not emptiness. */
  const planted = useMemo(() => {
    const set = new Set<string>();
    for (const f of GARDEN) {
      if (entriesOf(f).some((e) => widgets.some((w) => w.type === e.type))) set.add(f.id);
    }
    return set;
  }, [widgets]);

  useEffect(() => { if (!open) { setBloomed(null); setQ(''); } }, [open]);

  const add = (entry: Entry) => {
    if (!activeId) return;
    const id = addWidget(activeId, entry.type);
    if (entry.data) patchWidgetData(id, entry.data);
    if (entry.rename) updateWidget(id, { title: entry.label });

    if (entry.type === 'collection' && entry.data?.fields?.length) {
      const group = entry.data.fields.find((f) => f.id === entry.data?.groupBy);
      const first = group?.options?.[0]?.id;
      const rowId = addItem(id, activeId, group && first ? { [group.id]: first } : {});
      for (const step of entry.checklist ?? []) addItemStep(rowId, step);
    }
    play('pop', sound);
    toast(`Planted ${entry.label} in ${sector?.name ?? 'this page'}.`);
    onClose();
  };

  const toggle = (f: Flower) => {
    if (bloomed === f.id) {
      setBloomed(null);
      setFalling({ id: f.id, color: f.palette.petal });
      window.setTimeout(() => setFalling(null), 1200);
    } else {
      setBloomed(f.id);
      play('page', sound);
    }
  };

  const matching = useMemo(
    () => new Set(GARDEN.filter((f) => flowerMatches(f, q, entriesOf(f))).map((f) => f.id)),
    [q],
  );

  /** The tray. Hidden while searching, since the garden itself is the answer then. */
  const favourites = useMemo(() => {
    if (q.trim()) return [];
    const byKey = new Map(CATALOGUE.map((e) => [e.key, e]));
    return FAVOURITES
      .map((k) => ({ entry: byKey.get(k), flower: homeFlowerOf(k) }))
      .filter((x): x is { entry: Entry; flower: ReturnType<typeof homeFlowerOf> } => Boolean(x.entry));
  }, [q]);

  const loose = useMemo(() => {
    const extra = looseEntries();
    if (!q.trim()) return extra;
    const needle = q.trim().toLowerCase();
    return extra.filter((e) => `${e.label} ${e.blurb} ${e.keywords ?? ''}`.toLowerCase().includes(needle));
  }, [q]);

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="The garden"
      subtitle={sector ? `Pick a flower, plant a widget in ${sector.name}` : undefined}
      width={520}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search — habit grid, applications, sleep, recipes…"
        aria-label="Search the garden"
        autoFocus
        style={{ width: '100%', marginBottom: 4 }}
      />
      <p style={{ margin: '0 0 14px', fontSize: 11.5, color: 'var(--ink-faint)' }}>
        {q.trim()
          ? `${matching.size} of ${GARDEN.length} flowers are standing up.`
          : `Eleven flowers. ${season.charAt(0).toUpperCase()}${season.slice(1)} colours.`}
      </p>

      {/* the ones you reach for constantly, kept in a tray by the door */}
      {favourites.length > 0 && (
        <div
          style={{
            marginBottom: 16, padding: '9px 10px 10px', borderRadius: 'var(--r-lg)',
            border: '3px solid #C8A97E',
            // a shallow wooden seed tray
            background:
              'repeating-linear-gradient(90deg, color-mix(in srgb, #D9B489 60%, var(--surface)) 0 22px, color-mix(in srgb, #C8A97E 42%, var(--surface)) 22px 24px)',
          }}
        >
          <p
            className="hand"
            style={{ margin: '0 0 7px', fontSize: 16, color: 'var(--ink-soft)' }}
          >
            Always to hand
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {favourites.map(({ entry, flower }) => (
              <button
                key={entry.key}
                onClick={() => add(entry)}
                title={`${entry.blurb} · lives in ${flower?.name ?? 'the garden'}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 11px 5px 6px', borderRadius: 999,
                  // wears its flower's colour, so you learn where it lives
                  border: `2.5px solid ${flower?.palette.deep ?? 'var(--line)'}`,
                  background: 'var(--surface)',
                  boxShadow: 'var(--shadow-sm)',
                  fontSize: 12, fontWeight: 700,
                }}
              >
                <span
                  style={{
                    width: 20, height: 20, borderRadius: 999, display: 'grid',
                    placeItems: 'center', flexShrink: 0,
                    background: flower?.palette.petal ?? 'var(--accent)',
                    border: `1.8px solid ${flower?.palette.deep ?? 'var(--line)'}`,
                    color: readableOn(flower?.palette.petal ?? '#E8A598'),
                  }}
                >
                  <Icon name={entry.icon} size={12} />
                </span>
                {entry.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
          gap: 4,
          alignItems: 'end',
        }}
      >
        {GARDEN.map((f) => {
          const isOpen = bloomed === f.id;
          const entries = entriesOf(f);
          const wilted = Boolean(q.trim()) && !matching.has(f.id);
          const bud = !planted.has(f.id);
          return (
            <div key={f.id} style={{ position: 'relative', gridColumn: isOpen ? '1 / -1' : undefined }}>
              <motion.button
                onClick={() => toggle(f)}
                aria-expanded={isOpen}
                aria-label={`${f.name}, ${entries.length} widgets`}
                // hover: a 2° sway, like there's a breeze
                whileHover={motionOn && !wilted ? { rotate: [0, -2, 2, 0] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  width: isOpen ? 'auto' : '100%', padding: '4px 2px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <span style={{ position: 'relative', display: 'block' }}>
                  <FlowerSvg
                    flower={f}
                    open={isOpen}
                    unbloomed={bud && !isOpen}
                    wilted={wilted}
                    count={entries.length}
                    size={isOpen ? 132 : 104}
                    animate={motionOn}
                  />
                  {favourite === f.id && !wilted && (
                    <span style={{ position: 'absolute', top: 4, right: -4 }}>
                      <Bee size={24} />
                    </span>
                  )}
                  {falling?.id === f.id && <FallingPetal color={falling.color} />}
                </span>

                {/* the category name, written on the leaf */}
                <span
                  className="hand"
                  style={{
                    fontSize: 15, lineHeight: 1.15, marginTop: -6, textAlign: 'center',
                    color: wilted ? 'var(--ink-faint)' : 'var(--ink)',
                    maxWidth: 128,
                  }}
                >
                  {f.name}
                </span>
                {bud && !isOpen && (
                  <span style={{ fontSize: 9.5, color: 'var(--ink-faint)' }}>not planted yet</span>
                )}
              </motion.button>

              {/* the tray of seed packets */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        marginTop: 6, padding: 10, borderRadius: 'var(--r-lg)',
                        border: `3px solid ${f.palette.deep}`,
                        background: `color-mix(in srgb, ${f.palette.petal} 20%, var(--surface))`,
                      }}
                    >
                      <p style={{ margin: '0 0 8px', fontSize: 11.5, color: 'var(--ink-soft)' }}>
                        {f.blurb}
                      </p>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: 6,
                        }}
                      >
                        {entries.map((e, i) => (
                          <SeedPacket key={e.key} entry={e} flower={f} index={i} onAdd={() => add(e)} />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/*
        Everything is filed in a flower, and a test enforces that. This only
        appears if a preset is ever added without being filed — better that it
        shows up here than becomes unreachable.
      */}
      {loose.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p
            style={{
              margin: '0 0 7px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase', color: 'var(--ink-faint)',
            }}
          >
            Not yet filed
          </p>
          <div style={{ display: 'grid', gap: 6 }}>
            {loose.map((e) => (
              <button
                key={e.key}
                onClick={() => add(e)}
                style={{
                  display: 'flex', gap: 9, alignItems: 'center', textAlign: 'left',
                  padding: 9, borderRadius: 'var(--r)', border: '2.5px solid var(--line)',
                  background: 'var(--surface)',
                }}
              >
                <Icon name={e.icon} size={16} color="var(--ink-soft)" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>{e.label}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)' }}>{e.blurb}</span>
                </span>
                <Icon name="plus" size={15} color="var(--ink-faint)" />
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

/** A widget, as a seed packet in the flower's colour. */
function SeedPacket({
  entry, flower, index, onAdd,
}: { entry: Entry; flower: Flower; index: number; onAdd: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.028, type: 'spring', stiffness: 380, damping: 28 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onAdd}
      title={entry.blurb}
      style={{
        display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left',
        padding: '7px 8px 8px',
        // a seed packet: square-ish, with a scalloped top edge
        borderRadius: '4px 4px 12px 12px',
        border: `2.5px solid ${flower.palette.deep}`,
        background: 'var(--surface)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 5,
          background: `repeating-linear-gradient(90deg, ${flower.palette.petal} 0 6px, ${flower.palette.deep} 6px 12px)`,
        }}
      />
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <span
          style={{
            width: 20, height: 20, borderRadius: 7, flexShrink: 0, display: 'grid',
            placeItems: 'center', background: flower.palette.petal,
            border: `1.8px solid ${flower.palette.deep}`,
            color: readableOn(flower.palette.petal),
          }}
        >
          <Icon name={entry.icon} size={12} />
        </span>
        <span style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2 }}>{entry.label}</span>
      </span>
      <span
        style={{
          fontSize: 10.5, color: 'var(--ink-soft)', lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}
      >
        {entry.blurb}
      </span>
    </motion.button>
  );
}
