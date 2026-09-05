/**
 * The garden page — the flowers you actually grew.
 *
 * The picker's eleven flowers are a menu; these are a record. Finishing things
 * earns seeds, a seed goes in the ground, and it grows over weeks whether the
 * app is open or not, because a plant's size is derived from the date it was
 * planted rather than stored.
 *
 * Deliberately nothing here can go backwards. A streak resets to zero and
 * makes the past look like it never happened; a garden keeps the flowers.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Panel } from './ui';
import { Icon } from './Icons';
import { FlowerSvg, hinge } from './Flower';
import { HideHint } from './Burrow';
import { GARDEN, flowerById } from '../lib/garden';
import { STAGE_NAME, canWater, daysToNextStage, growthDays, stageOf, towardNextSeed, type Stage } from '../lib/growth';
import { useDoc, useUI } from '../lib/store';
import { MONTHS, parseDateStr, today } from '../lib/dates';
import { play } from '../lib/sound';
import type { Plant } from '../lib/types';

export function GardenPage({ open, onClose }: { open: boolean; onClose: () => void }) {
  const garden = useDoc((s) => s.doc.garden);
  const completed = useDoc((s) => s.doc.stats.completed);
  const sound = useDoc((s) => s.doc.settings.sound);
  const motionOn = useDoc((s) => s.doc.settings.motion);
  const plantSeed = useDoc((s) => s.plantSeed);
  const waterPlant = useDoc((s) => s.waterPlant);
  const toast = useUI((s) => s.toast);
  const setPanel = useUI((s) => s.setPanel);

  const [choosing, setChoosing] = useState(false);
  const t = today();

  const plants = useMemo(
    () => [...garden.plants].sort((a, b) => a.slot - b.slot),
    [garden.plants],
  );
  const seedProgress = towardNextSeed(completed);
  const blooming = plants.filter((p) => stageOf(p, t) === 4).length;

  const sow = (flowerId: string) => {
    const name = flowerById(flowerId)?.species ?? 'a flower';
    if (!plantSeed(flowerId, `${completed} things finished`)) {
      toast('No seeds yet — finish a few things first.', 'warn');
      return;
    }
    play('pop', sound);
    setChoosing(false);
    toast(`${name} planted. Come back in a few days.`, 'win');
  };

  return (
    <Panel
      open={open}
      onClose={onClose}
      title="The garden"
      subtitle="Grown from what you actually did"
      width={560}
    >
      {/* the seed pouch */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          padding: '11px 13px', borderRadius: 'var(--r-lg)',
          border: '3px solid var(--line)',
          background: 'color-mix(in srgb, var(--accent) 14%, var(--surface))',
        }}
      >
        <span
          style={{
            width: 40, height: 40, borderRadius: 999, display: 'grid', placeItems: 'center',
            border: '3px solid var(--line)', background: 'var(--surface)', flexShrink: 0,
          }}
        >
          <Icon name="sprout" size={20} color="#7E9A6B" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
            {garden.seeds === 0 ? 'No seeds just now' : `${garden.seeds} seed${garden.seeds === 1 ? '' : 's'} to plant`}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
            {seedProgress.need - seedProgress.done === seedProgress.need
              ? `Every ${seedProgress.need} things you finish is a seed.`
              : `${seedProgress.need - seedProgress.done} more finished thing${
                seedProgress.need - seedProgress.done === 1 ? '' : 's'
              } and there'll be another.`}
          </p>
        </div>
        <button
          className="btn primary"
          onClick={() => setChoosing((v) => !v)}
          disabled={garden.seeds === 0}
          title={garden.seeds === 0 ? 'Finish a few things to earn a seed' : 'Plant one'}
        >
          <Icon name="plus" size={16} /> Plant
        </button>
      </div>

      {/* which flower this seed becomes */}
      <AnimatePresence>
        {choosing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                marginBottom: 14, padding: 11, borderRadius: 'var(--r-lg)',
                border: '3px dashed var(--line)',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 12.5, color: 'var(--ink-soft)' }}>
                What should it grow into?
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {GARDEN.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => sow(f.id)}
                    title={`${f.species} — ${f.name}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '5px 11px 5px 6px', borderRadius: 999,
                      border: `2.5px solid ${f.palette.deep}`,
                      background: 'var(--surface)', fontSize: 12, fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 18, height: 18, borderRadius: 999, flexShrink: 0,
                        background: f.palette.petal, border: `1.8px solid ${f.palette.deep}`,
                      }}
                    />
                    {f.species}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HideHint />

      {/* the bed */}
      {plants.length === 0 ? (
        <div
          style={{
            padding: '26px 18px', textAlign: 'center', borderRadius: 'var(--r-lg)',
            border: '3px dashed var(--line)',
            background: 'color-mix(in srgb, #A8C09A 12%, var(--surface))',
          }}
        >
          <p className="hand" style={{ margin: 0, fontSize: 22 }}>Bare soil, for now.</p>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Finish things, earn seeds, plant them here. By December this is a picture of your autumn.
          </p>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            {plants.length} planted · {blooming} in bloom
          </p>
          <div
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
              gap: 4, alignItems: 'end',
              padding: '10px 8px 0', borderRadius: 'var(--r-lg)',
              border: '3px solid var(--line)',
              // soil, with a suggestion of rows
              background:
                'repeating-linear-gradient(90deg, color-mix(in srgb, #A8845F 26%, var(--surface)) 0 26px, color-mix(in srgb, #8E6C4C 22%, var(--surface)) 26px 28px)',
            }}
          >
            {plants.map((p) => (
              <PlantPlot
                key={p.id}
                plant={p}
                onWater={() => { waterPlant(p.id); play('tick', sound); }}
                animate={motionOn}
              />
            ))}
          </div>
        </>
      )}

      <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Nothing here is ever taken away. A missed week slows the garden down; it doesn't
        empty it.
      </p>

      <button
        className="btn"
        onClick={() => setPanel('wrapped')}
        style={{ marginTop: 14, width: '100%' }}
      >
        <Icon name="star" size={16} /> Nook Wrapped — your year so far
      </button>
    </Panel>
  );
}

function PlantPlot({
  plant, onWater, animate,
}: { plant: Plant; onWater: () => void; animate: boolean }) {
  const t = today();
  const flower = flowerById(plant.flowerId) ?? GARDEN[0];
  const stage = stageOf(plant, t);
  const next = daysToNextStage(plant, t);
  const thirsty = canWater(plant, t);
  const d = parseDateStr(plant.plantedOn);

  return (
    <div style={{ position: 'relative', paddingBottom: 8, textAlign: 'center' }}>
      <span
        title={
          `${flower.species} · ${STAGE_NAME[stage]} · planted ${d.getDate()} ${MONTHS[d.getMonth()]}`
          + (plant.stunted ? ' · a focus session that finished early' : '')
          + (next ? ` · ${next} day${next === 1 ? '' : 's'} to the next stage` : '')
        }
        style={{ display: 'block' }}
      >
        {stage >= 3 ? (
          <FlowerSvg
            flower={flower}
            open={stage === 4}
            size={stage === 4 ? 96 : 86}
            animate={animate}
          />
        ) : (
          <Seedling stage={stage} leaf={flower.palette.leaf} stem={flower.palette.stem} size={86} />
        )}
      </span>

      {/* the label stick, which is what makes it a record rather than decoration */}
      <span
        style={{
          display: 'block', margin: '-4px auto 0', maxWidth: 96,
          fontSize: 10, lineHeight: 1.25, color: 'var(--ink-soft)',
          padding: '3px 5px', borderRadius: 4,
          border: '2px solid var(--line)', background: 'var(--surface)',
        }}
      >
        {plant.from}
      </span>

      {thirsty && (
        <button
          onClick={onWater}
          className="btn tiny"
          title="Water it — worth a day of growth, once a day"
          aria-label="Water this plant"
          style={{ position: 'absolute', right: 2, top: 2, padding: 4 }}
        >
          <Icon name="drop" size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * The first three stages. Drawn here rather than in Flower.tsx because a
 * sprout isn't a small flower — it's a different shape, and the flower
 * component's whole job is the bloom.
 */
export function Seedling({
  stage, leaf, stem, size = 86, animate = true,
}: { stage: Stage; leaf: string; stem: string; size?: number; animate?: boolean }) {
  const ink = '#4A3B35';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={STAGE_NAME[stage]}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* the soil it's in */}
      <path d="M22 96 C30 90 70 90 78 96 Z" fill="#8E6C4C" opacity={0.5} />

      {stage === 0 ? (
        <>
          {/* a mound, with the seed just under it */}
          <path
            d="M34 94 C36 84 64 84 66 94 Z"
            fill="#A8845F"
            stroke={ink}
            strokeWidth={2.6}
            strokeLinejoin="round"
          />
          <ellipse cx={50} cy={90} rx={4} ry={5.4} fill="#C8A97E" stroke={ink} strokeWidth={2} />
        </>
      ) : (
        <motion.g
          animate={animate ? { rotate: [0, -1.6, 1.6, 0] } : undefined}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={hinge(50, 94)}
        >
          <path
            d={stage === 1 ? 'M50 94 V76' : 'M50 94 Q47 74 50 60'}
            stroke={stem}
            strokeWidth={3.6}
            strokeLinecap="round"
            fill="none"
          />
          {/* two leaves for a sprout, four once it's leafing out */}
          <path
            d="M50 78 C36 77 31 68 42 65 C48 67 50 72 50 78 Z"
            fill={leaf}
            stroke={ink}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <path
            d="M50 82 C64 81 69 72 58 69 C52 71 50 76 50 82 Z"
            fill={leaf}
            stroke={ink}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          {stage === 2 && (
            <>
              <path
                d="M50 66 C38 65 34 57 44 54 C49 56 50 61 50 66 Z"
                fill={leaf}
                stroke={ink}
                strokeWidth={2.3}
                strokeLinejoin="round"
              />
              <path
                d="M50 62 C62 61 66 53 56 50 C51 52 50 57 50 62 Z"
                fill={leaf}
                stroke={ink}
                strokeWidth={2.3}
                strokeLinejoin="round"
              />
            </>
          )}
        </motion.g>
      )}
    </svg>
  );
}

/** Days of growth, phrased for a tooltip. */
export function describeGrowth(plant: Plant, t = today()): string {
  const d = growthDays(plant, t);
  return d === 0 ? 'planted today' : `${d} day${d === 1 ? '' : 's'} of growth`;
}
