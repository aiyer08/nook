/**
 * One component, eleven flowers.
 *
 * Everything is SVG because SVG is a recipe rather than a photograph: the same
 * paths recolour for any theme, scale from a 24px chip to a full bloom without
 * blurring, and — the part that matters here — let each petal be animated
 * separately.
 *
 * The bloom is a hinge, not a slide. Each petal's `transform-origin` sits at
 * the point where it meets the flower's middle, so rotating it swings the petal
 * open like a door. Get that origin wrong and petals appear to slide away
 * sideways, which is the whole difference between blooming and glitching.
 */
import { memo } from 'react';
import { motion } from 'framer-motion';
import type { Flower } from '../lib/garden';
import { mix } from '../lib/themes';

const C = 50;      // the flower's middle, in viewBox units
const CY = 40;     // slightly above centre, to leave room for the stem

/* ------------------------------------------------------------------ */
/* petal silhouettes, all drawn pointing straight up from the middle   */
/* ------------------------------------------------------------------ */

function petalPath(shape: Flower['shape'], len: number, wide: number): string {
  const t = CY - len;                 // tip
  const w = wide / 2;
  switch (shape) {
    case 'pointed':
      return `M${C} ${CY} C${C - w} ${CY - len * 0.45} ${C - w * 0.8} ${t + len * 0.1} ${C} ${t}
              C${C + w * 0.8} ${t + len * 0.1} ${C + w} ${CY - len * 0.45} ${C} ${CY} Z`;
    case 'oval':
      return `M${C} ${CY} C${C - w} ${CY - len * 0.3} ${C - w} ${t + len * 0.18} ${C} ${t}
              C${C + w} ${t + len * 0.18} ${C + w} ${CY - len * 0.3} ${C} ${CY} Z`;
    case 'broad':
      return `M${C} ${CY} C${C - w * 1.25} ${CY - len * 0.35} ${C - w * 1.1} ${t + len * 0.25} ${C} ${t}
              C${C + w * 1.1} ${t + len * 0.25} ${C + w * 1.25} ${CY - len * 0.35} ${C} ${CY} Z`;
    case 'ruffled':
      // a wavy edge, so densely-layered flowers don't read as plastic
      return `M${C} ${CY} C${C - w} ${CY - len * 0.3} ${C - w * 1.1} ${t + len * 0.3} ${C - w * 0.45} ${t + len * 0.12}
              Q${C - w * 0.2} ${t - len * 0.05} ${C} ${t + len * 0.06}
              Q${C + w * 0.2} ${t - len * 0.05} ${C + w * 0.45} ${t + len * 0.12}
              C${C + w * 1.1} ${t + len * 0.3} ${C + w} ${CY - len * 0.3} ${C} ${CY} Z`;
    case 'crumpled':
      // the poppy: irregular on purpose
      return `M${C} ${CY} C${C - w * 1.15} ${CY - len * 0.3} ${C - w * 0.9} ${t + len * 0.34} ${C - w * 0.6} ${t + len * 0.08}
              Q${C - w * 0.1} ${t + len * 0.22} ${C + w * 0.1} ${t}
              Q${C + w * 0.55} ${t + len * 0.26} ${C + w * 0.8} ${t + len * 0.1}
              C${C + w * 1.2} ${CY - len * 0.42} ${C + w * 0.95} ${CY - len * 0.2} ${C} ${CY} Z`;
    default: // round
      return `M${C} ${CY} C${C - w * 1.1} ${CY - len * 0.25} ${C - w} ${t} ${C} ${t}
              C${C + w} ${t} ${C + w * 1.1} ${CY - len * 0.25} ${C} ${CY} Z`;
  }
}

/* ------------------------------------------------------------------ */

interface Props {
  flower: Flower;
  /** the bud is closed until this is true */
  open: boolean;
  /** an untouched category stays a tight grey-green bud: potential, not emptiness */
  unbloomed?: boolean;
  /** search miss: droops its head and desaturates */
  wilted?: boolean;
  size?: number;
  /** how many widgets are inside, shown in the dewdrop */
  count?: number;
  animate?: boolean;
  ink?: string;
}

export const FlowerSvg = memo(function FlowerSvg({
  flower, open, unbloomed, wilted, size = 108, count, animate = true, ink = '#4A3B35',
}: Props) {
  const p = flower.palette;
  const petal = unbloomed ? '#C3CDBB' : p.petal;
  const deep = unbloomed ? '#A8B69C' : p.deep;
  const centre = unbloomed ? '#B6C4AA' : p.centre;

  const stroke = 3.1;
  const spring = { type: 'spring' as const, stiffness: 300, damping: 17, mass: 0.7 };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${flower.name}, a ${flower.species.toLowerCase()}`}
      style={{
        display: 'block', overflow: 'visible',
        filter: wilted ? 'saturate(0.35) opacity(0.55)' : undefined,
        transition: 'filter 0.35s ease',
      }}
    >
      {/* stem and leaves, drawn first so the bloom sits over them */}
      <motion.g
        animate={animate ? { rotate: wilted ? 9 : 0 } : undefined}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: '50px 96px' }}
      >
        <path
          d={`M${C} 96 Q${C - 2.5} ${CY + 26} ${C} ${CY + 6}`}
          stroke={p.stem}
          strokeWidth={stroke + 0.4}
          strokeLinecap="round"
          fill="none"
        />
        {/* one leaf carries the label, the other just balances it */}
        <path
          d={`M${C - 1} 80 C${C - 20} 78 ${C - 25} 66 ${C - 12} 64 C${C - 4} 66 ${C - 2} 73 ${C - 1} 80 Z`}
          fill={p.leaf}
          stroke={ink}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <path
          d={`M${C + 1} 88 C${C + 16} 87 ${C + 20} 78 ${C + 10} 76 C${C + 4} 78 ${C + 2} 83 ${C + 1} 88 Z`}
          fill={mix(p.leaf, ink, 0.1)}
          stroke={ink}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        {/* the dewdrop that holds the count */}
        {count !== undefined && count > 0 && (
          <g>
            <path
              d={`M${C + 8} 68 c3.4 0 6-2.4 6-5.4 0-3-4-7.2-6-9-2 1.8-6 6-6 9 0 3 2.6 5.4 6 5.4 Z`}
              fill="#DCEAF6"
              stroke={ink}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <text
              x={C + 8}
              y={65.5}
              textAnchor="middle"
              fontSize={7.5}
              fontWeight={700}
              fill={ink}
              fontFamily="Quicksand, system-ui, sans-serif"
            >
              {count}
            </text>
          </g>
        )}
      </motion.g>

      {/* the bloom */}
      {flower.form === 'cluster' ? (
        <Cluster flower={flower} open={open} petal={petal} deep={deep} centre={centre} ink={ink} spring={spring} />
      ) : flower.form === 'spire' ? (
        <Spire flower={flower} open={open} petal={petal} deep={deep} ink={ink} spring={spring} />
      ) : flower.form === 'dome' ? (
        <Dome flower={flower} open={open} petal={petal} deep={deep} centre={centre} ink={ink} spring={spring} />
      ) : flower.form === 'spiral' ? (
        <Spiral flower={flower} open={open} petal={petal} deep={deep} centre={centre} ink={ink} spring={spring} />
      ) : (
        <Radial flower={flower} open={open} petal={petal} deep={deep} centre={centre} ink={ink} spring={spring} />
      )}
    </svg>
  );
});

/**
 * An explicit bud, for the cluster and dome forms.
 *
 * Radial and spiral flowers make their own bud by stacking every petal at the
 * same angle. A cluster of five separate blooms can't do that — collapsing
 * them just gives a small open flower — so those two get a drawn bud that
 * cross-fades as the cluster scatters.
 */
function BudShape({
  open, petal, leaf, ink,
}: { open: boolean; petal: string; leaf: string; ink: string }) {
  return (
    <motion.g
      initial={false}
      animate={open ? { opacity: 0, scale: 0.55 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{ transformOrigin: `${C}px ${CY}px`, transformBox: 'view-box' }}
    >
      <path
        d={`M${C} ${CY + 12} C${C - 12} ${CY + 6} ${C - 11} ${CY - 14} ${C} ${CY - 20}
            C${C + 11} ${CY - 14} ${C + 12} ${CY + 6} ${C} ${CY + 12} Z`}
        fill={petal}
        stroke={ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* a seam, so it reads as folded petals rather than an egg */}
      <path
        d={`M${C} ${CY + 8} C${C - 4} ${CY - 4} ${C - 3} ${CY - 12} ${C} ${CY - 18}`}
        stroke={ink}
        strokeWidth={1.8}
        fill="none"
        opacity={0.55}
      />
      <path
        d={`M${C} ${CY + 11} C${C - 10} ${CY + 8} ${C - 9} ${CY - 1} ${C - 3} ${CY + 3} Z`}
        fill={leaf}
        stroke={ink}
        strokeWidth={2.1}
        strokeLinejoin="round"
      />
      <path
        d={`M${C} ${CY + 11} C${C + 10} ${CY + 8} ${C + 9} ${CY - 1} ${C + 3} ${CY + 3} Z`}
        fill={leaf}
        stroke={ink}
        strokeWidth={2.1}
        strokeLinejoin="round"
      />
    </motion.g>
  );
}

type SubProps = {
  flower: Flower;
  open: boolean;
  petal: string;
  deep: string;
  centre?: string;
  ink: string;
  spring: { type: 'spring'; stiffness: number; damping: number; mass: number };
};

/* ---------------- petals radiating from a middle ---------------- */

function Radial({ flower, open, petal, deep, centre, ink, spring }: SubProps) {
  const rings = Array.from({ length: flower.layers }, (_, l) => l);
  return (
    <g>
      {/* sepals: the little green cup a bud sits in. Only while closed —
          they're what makes a bud read as a bud rather than a blob. */}
      <motion.g
        initial={false}
        animate={open ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        style={{ transformOrigin: `${C}px ${CY + 6}px`, transformBox: 'view-box' }}
      >
        <path
          d={`M${C} ${CY + 9} C${C - 11} ${CY + 7} ${C - 9} ${CY - 3} ${C - 3} ${CY + 1} Z`}
          fill={flower.palette.leaf}
          stroke={ink}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <path
          d={`M${C} ${CY + 9} C${C + 11} ${CY + 7} ${C + 9} ${CY - 3} ${C + 3} ${CY + 1} Z`}
          fill={flower.palette.leaf}
          stroke={ink}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
      </motion.g>

      {rings.map((layer) => {
        const back = layer > 0;
        const scale = 1 - layer * 0.22;
        const len = 30 * scale;
        const wide = (flower.shape === 'oval' ? 13 : 19) * scale;
        const n = Math.max(3, flower.petals - layer * 2);
        const d = petalPath(flower.shape, len, wide);
        const offset = layer * (180 / n);
        return (
          <g key={layer}>
            {Array.from({ length: n }, (_, i) => {
              const angle = flower.spread >= 85
                ? (360 / n) * i + offset
                : (i - (n - 1) / 2) * (flower.spread / Math.max(1, n - 1)) * 1.9;
              const wonk = flower.wonky ? ((i * 37) % (flower.wonky * 2)) - flower.wonky : 0;
              return (
                <motion.path
                  key={i}
                  d={d}
                  fill={back ? deep : petal}
                  stroke={ink}
                  strokeWidth={back ? 2.4 : 3}
                  strokeLinejoin="round"
                  initial={false}
                  animate={
                    open
                      ? { rotate: angle + wonk, scaleX: 1, scaleY: 1, opacity: 1 }
                      /**
                       * Closed, every petal points straight up at exactly the
                       * same angle so they land on top of one another and read
                       * as one chunky bud. Fanning them even slightly stacks a
                       * dozen outlines into a dark smudge — which is precisely
                       * what went wrong before. Back rings are hidden for the
                       * same reason.
                       */
                      : { rotate: 0, scaleX: 0.66, scaleY: 0.84, opacity: back ? 0 : 1 }
                  }
                  transition={{ ...spring, delay: open ? (i + layer * 2) * 0.04 : (n - i) * 0.014 }}
                  /* the hinge: exactly where the petal meets the middle */
                  style={{ transformOrigin: `${C}px ${CY}px`, transformBox: 'view-box' }}
                />
              );
            })}
          </g>
        );
      })}

      {/* the middle. Hidden while closed, or it eclipses the bud. */}
      <motion.g
        initial={false}
        animate={open ? { scale: 1, opacity: 1 } : { scale: 0.15, opacity: 0 }}
        transition={{ ...spring, delay: open ? 0.14 : 0 }}
        style={{ transformOrigin: `${C}px ${CY}px`, transformBox: 'view-box' }}
      >
        <circle cx={C} cy={CY} r={flower.species === 'Sunflower' ? 12 : 8} fill={centre} stroke={ink} strokeWidth={2.8} />
        {/* seeds, echoing the filled-in squares of a tracker grid */}
        {flower.species === 'Sunflower' &&
          [[-5, -4], [0, -6], [5, -4], [-6, 1], [0, 0], [6, 1], [-4, 5], [1, 6], [5, 5]].map(([dx, dy], i) => (
            <circle key={i} cx={C + dx} cy={CY + dy} r={1.5} fill={mix(centre ?? '#7A5C3E', '#000', 0.25)} />
          ))}
        {flower.species === 'Poppy' &&
          [[-4, -2], [3, -3], [0, 2], [-2, 4], [4, 3]].map(([dx, dy], i) => (
            <circle key={i} cx={C + dx} cy={CY + dy} r={1.2} fill="#2E241F" />
          ))}
      </motion.g>
    </g>
  );
}

/* ---------------- five small blooms that scatter ---------------- */

function Cluster({ flower, open, petal, deep, centre, ink, spring }: SubProps) {
  const spots: [number, number][] = [[0, -8], [-13, 0], [13, 0], [-7, 12], [8, 12]];
  return (
    <g>
      <BudShape open={open} petal={petal} leaf={flower.palette.leaf} ink={ink} />
      {spots.map(([dx, dy], b) => (
        <motion.g
          key={b}
          initial={false}
          animate={open
            ? { x: dx, y: dy, scale: 1, opacity: 1 }
            // closed: the drawn bud stands in for the whole cluster
            : { x: 0, y: 0, scale: 0.5, opacity: 0 }}
          transition={{ ...spring, delay: open ? b * 0.045 : (spots.length - b) * 0.02 }}
          style={{ transformOrigin: `${C}px ${CY}px`, transformBox: 'view-box' }}
        >
          {Array.from({ length: flower.petals }, (_, i) => (
            <path
              key={i}
              d={petalPath('round', 11, 10)}
              fill={b % 2 ? deep : petal}
              stroke={ink}
              strokeWidth={2.2}
              strokeLinejoin="round"
              transform={`rotate(${(360 / flower.petals) * i} ${C} ${CY})`}
            />
          ))}
          <circle cx={C} cy={CY} r={3.2} fill={centre} stroke={ink} strokeWidth={1.8} />
        </motion.g>
      ))}
    </g>
  );
}

/* ---------------- buds up a stalk, opening bottom to top ---------------- */

function Spire({ flower, open, petal, deep, ink, spring }: SubProps) {
  const n = flower.petals;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        // bottom of the stalk first, which is how lavender actually opens
        const fromBottom = n - 1 - i;
        const y = CY + 14 - i * 7.5;
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <motion.g
            key={i}
            initial={false}
            animate={open
              ? { x: side * 5.5, scale: 1, rotate: side * 16 }
              : { x: 0, scale: 0.7, rotate: 0 }}
            transition={{ ...spring, delay: open ? fromBottom * 0.05 : i * 0.02 }}
            style={{ transformOrigin: `${C}px ${y}px`, transformBox: 'view-box' }}
          >
            <ellipse
              cx={C}
              cy={y}
              rx={5.4}
              ry={7}
              fill={i % 2 ? deep : petal}
              stroke={ink}
              strokeWidth={2.3}
            />
          </motion.g>
        );
      })}
    </g>
  );
}

/* ---------------- a mound of small florets ---------------- */

function Dome({ flower, open, petal, deep, centre, ink, spring }: SubProps) {
  const spots: [number, number][] = [
    [0, -10], [-11, -5], [11, -5], [-19, 3], [0, 0], [19, 3], [-10, 8], [10, 8], [0, 12],
  ];
  return (
    <g>
      <BudShape open={open} petal={petal} leaf={flower.palette.leaf} ink={ink} />
      {spots.map(([dx, dy], b) => (
        <motion.g
          key={b}
          initial={false}
          animate={open
            ? { x: dx, y: dy, scale: 1, opacity: 1 }
            : { x: 0, y: 0, scale: 0.5, opacity: 0 }}
          transition={{ ...spring, delay: open ? b * 0.035 : (spots.length - b) * 0.015 }}
          style={{ transformOrigin: `${C}px ${CY}px`, transformBox: 'view-box' }}
        >
          {Array.from({ length: flower.petals }, (_, i) => (
            <path
              key={i}
              d={petalPath('round', 8.5, 8.5)}
              fill={b % 3 === 0 ? deep : petal}
              stroke={ink}
              strokeWidth={2}
              strokeLinejoin="round"
              transform={`rotate(${(360 / flower.petals) * i + b * 12} ${C} ${CY})`}
            />
          ))}
          <circle cx={C} cy={CY} r={2} fill={centre} stroke={ink} strokeWidth={1.4} />
        </motion.g>
      ))}
    </g>
  );
}

/* ---------------- coiled layers, seen from above ---------------- */

function Spiral({ flower, open, petal, deep, centre, ink, spring }: SubProps) {
  const rings = Array.from({ length: flower.layers }, (_, l) => l);
  return (
    <g>
      {rings.reverse().map((layer) => {
        const scale = 1 - layer * 0.19;
        const n = flower.petals;
        return (
          <g key={layer}>
            {Array.from({ length: n }, (_, i) => (
              <motion.path
                key={i}
                d={petalPath('round', 28 * scale, 22 * scale)}
                fill={mix(petal, deep, layer / Math.max(1, flower.layers))}
                stroke={ink}
                strokeWidth={2.6}
                strokeLinejoin="round"
                initial={false}
                animate={open
                  // each ring turned a little from the one behind: a coil
                  ? { rotate: (360 / n) * i + layer * 26, scale: 1, opacity: 1 }
                  // closed: one ring, stacked, so the coil doesn't muddy
                  : { rotate: 0, scale: 0.46, opacity: layer === 0 ? 1 : 0 }}
                transition={{ ...spring, delay: open ? (layer * n + i) * 0.028 : 0.01 * i }}
                style={{ transformOrigin: `${C}px ${CY}px`, transformBox: 'view-box' }}
              />
            ))}
          </g>
        );
      })}
      <motion.circle
        cx={C}
        cy={CY}
        r={4.5}
        fill={centre}
        stroke={ink}
        strokeWidth={2.2}
        initial={false}
        animate={open ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.2 }}
      />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* a petal that drifts down and fades when a flower closes             */
/* ------------------------------------------------------------------ */

export function FallingPetal({ color, ink = '#4A3B35' }: { color: string; ink?: string }) {
  return (
    <motion.svg
      width={20}
      height={20}
      viewBox="0 0 100 100"
      aria-hidden="true"
      initial={{ opacity: 0.95, y: 0, x: 0, rotate: 0 }}
      animate={{ opacity: 0, y: 54, x: 16, rotate: 128 }}
      transition={{ duration: 1.15, ease: [0.3, 0.1, 0.4, 1] }}
      style={{ position: 'absolute', left: '52%', top: '48%', pointerEvents: 'none' }}
    >
      <path
        d={petalPath('round', 26, 20)}
        fill={color}
        stroke={ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
    </motion.svg>
  );
}

/** A bee that lands on whichever flower gets used most. */
export function Bee({ size = 26 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 40 32"
      aria-label="a bee, resting on your most-used flower"
      role="img"
      animate={{ y: [0, -2.5, 0], rotate: [-3, 3, -3] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* wings first, so they sit behind */}
      <motion.g
        animate={{ scaleY: [1, 0.72, 1] }}
        transition={{ duration: 0.22, repeat: Infinity, repeatDelay: 1.4 }}
        style={{ transformOrigin: '20px 10px' }}
      >
        <ellipse cx={15} cy={9} rx={7} ry={4.4} fill="#FFFDF6" fillOpacity={0.82} stroke="#4A3B35" strokeWidth={1.6} transform="rotate(-22 15 9)" />
        <ellipse cx={25} cy={9} rx={7} ry={4.4} fill="#FFFDF6" fillOpacity={0.82} stroke="#4A3B35" strokeWidth={1.6} transform="rotate(22 25 9)" />
      </motion.g>
      <ellipse cx={20} cy={18} rx={10} ry={7.5} fill="#EFCE7B" stroke="#4A3B35" strokeWidth={2.1} />
      <path d="M17 11.4a10 7.5 0 0 0 0 13.2M23 11.4a10 7.5 0 0 0 0 13.2" stroke="#4A3B35" strokeWidth={2} fill="none" />
      <circle cx={11} cy={16} r={1.4} fill="#4A3B35" />
      <path d="M9 12.5 6.5 9M13 11.5 12 7.5" stroke="#4A3B35" strokeWidth={1.5} strokeLinecap="round" />
    </motion.svg>
  );
}
