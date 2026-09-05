/**
 * One parametric character. Species swaps the ears and muzzle; everything
 * else — body, moods, cosmetics — is shared, so adding a creature is cheap.
 */
import { motion } from 'framer-motion';
import type { Species } from '../lib/types';
import { mix } from '../lib/themes';

export type Mood = 'idle' | 'happy' | 'cheer' | 'sleepy' | 'stretch';

interface Props {
  species: Species;
  color: string;
  hat?: string;
  accessory?: string;
  mood?: Mood;
  size?: number;
  ink?: string;
  animate?: boolean;
}

const STROKE = 3.2;

export function Avatar({
  species,
  color,
  hat = 'none',
  accessory = 'none',
  mood = 'idle',
  size = 120,
  ink = '#4A3B35',
  animate = true,
}: Props) {
  const shade = mix(color, ink, 0.16);
  const blush = mix(color, '#E8697F', 0.42);
  const inner = mix(color, '#F0A7B5', 0.5);

  const eyesClosed = mood === 'sleepy';
  const eyesHappy = mood === 'happy' || mood === 'cheer';

  // A slow idle breath so the character is never fully still.
  const bodyAnim =
    !animate
      ? {}
      : mood === 'cheer'
        ? { y: [0, -7, 0], rotate: [0, -3, 3, 0] }
        : mood === 'stretch'
          ? { scaleY: [1, 1.08, 1], scaleX: [1, 0.95, 1] }
          : mood === 'sleepy'
            ? { scaleY: [1, 1.025, 1], y: [0, 1.5, 0] }
            : { scaleY: [1, 1.035, 1], scaleX: [1, 0.985, 1] };

  const bodyTransition =
    mood === 'cheer'
      ? { duration: 0.75, repeat: Infinity, repeatDelay: 0.35, ease: 'easeInOut' as const }
      : { duration: mood === 'sleepy' ? 4.2 : 3.1, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${species} avatar`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <clipPath id={`body-clip-${species}`}>
          <ellipse cx="60" cy="72" rx="31" ry="29" />
        </clipPath>
      </defs>

      <motion.g
        animate={bodyAnim}
        transition={bodyTransition}
        style={{ originX: '60px', originY: '100px' }}
      >
        {/* ---- ears / head extras behind the head ---- */}
        <Ears species={species} color={color} inner={inner} ink={ink} mood={mood} />

        {/* ---- arms ---- */}
        {mood === 'cheer' ? (
          <>
            <path d="M33 66 Q22 52 24 44" stroke={ink} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
            <path d="M87 66 Q98 52 96 44" stroke={ink} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="31" cy="76" rx="7" ry="9.5" fill={color} stroke={ink} strokeWidth={STROKE} transform="rotate(-14 31 76)" />
            <ellipse cx="89" cy="76" rx="7" ry="9.5" fill={color} stroke={ink} strokeWidth={STROKE} transform="rotate(14 89 76)" />
          </>
        )}

        {/* ---- feet ---- */}
        <ellipse cx="48" cy="99" rx="10" ry="6.5" fill={shade} stroke={ink} strokeWidth={STROKE} />
        <ellipse cx="72" cy="99" rx="10" ry="6.5" fill={shade} stroke={ink} strokeWidth={STROKE} />

        {/* ---- body / head (one round blob, easier to read at small sizes) ---- */}
        <ellipse cx="60" cy="72" rx="31" ry="29" fill={color} stroke={ink} strokeWidth={STROKE} />

        {/* tummy patch */}
        <ellipse cx="60" cy="82" rx="16" ry="13" fill={mix(color, '#FFFFFF', 0.45)} opacity="0.75" />

        {/* ---- face ---- */}
        <Face
          species={species}
          ink={ink}
          color={color}
          inner={inner}
          eyesClosed={eyesClosed}
          eyesHappy={eyesHappy}
          mood={mood}
        />

        {accessory === 'blush' && (
          <>
            <ellipse cx="42" cy="76" rx="6" ry="3.6" fill={blush} opacity="0.55" />
            <ellipse cx="78" cy="76" rx="6" ry="3.6" fill={blush} opacity="0.55" />
          </>
        )}

        <Accessory id={accessory} ink={ink} />
        <Hat id={hat} ink={ink} species={species} />
      </motion.g>

      {mood === 'sleepy' && animate && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0], y: [0, -12, -20], x: [0, 4, 8] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeOut' }}
        >
          <text x="92" y="38" fontFamily="Caveat, cursive" fontSize="20" fill={ink}>z</text>
          <text x="102" y="26" fontFamily="Caveat, cursive" fontSize="14" fill={ink}>z</text>
        </motion.g>
      )}

      {mood === 'cheer' && animate && (
        <motion.g
          animate={{ opacity: [0, 1, 0], scale: [0.6, 1.1, 0.7] }}
          transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.2 }}
          style={{ originX: '60px', originY: '30px' }}
        >
          <Sparkle x={24} y={30} r={5} c={ink} />
          <Sparkle x={96} y={26} r={6} c={ink} />
          <Sparkle x={60} y={12} r={4} c={ink} />
        </motion.g>
      )}
    </svg>
  );
}

function Sparkle({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  return (
    <path
      d={`M${x} ${y - r} Q${x + r * 0.2} ${y - r * 0.2} ${x + r} ${y} Q${x + r * 0.2} ${y + r * 0.2} ${x} ${y + r} Q${x - r * 0.2} ${y + r * 0.2} ${x - r} ${y} Q${x - r * 0.2} ${y - r * 0.2} ${x} ${y - r}Z`}
      fill={c}
      opacity="0.7"
    />
  );
}

function Ears({
  species, color, inner, ink, mood,
}: { species: Species; color: string; inner: string; ink: string; mood: Mood }) {
  const droop = mood === 'sleepy' ? 8 : 0;
  switch (species) {
    case 'bunny':
      return (
        <g>
          <g transform={`rotate(${-8 - droop} 48 30)`}>
            <ellipse cx="48" cy="28" rx="8" ry="21" fill={color} stroke={ink} strokeWidth={STROKE} />
            <ellipse cx="48" cy="29" rx="3.6" ry="14" fill={inner} />
          </g>
          <g transform={`rotate(${8 + droop} 72 30)`}>
            <ellipse cx="72" cy="28" rx="8" ry="21" fill={color} stroke={ink} strokeWidth={STROKE} />
            <ellipse cx="72" cy="29" rx="3.6" ry="14" fill={inner} />
          </g>
        </g>
      );
    case 'mouse':
      return (
        <g>
          <circle cx="38" cy="50" r="15" fill={color} stroke={ink} strokeWidth={STROKE} />
          <circle cx="38" cy="50" r="8" fill={inner} />
          <circle cx="82" cy="50" r="15" fill={color} stroke={ink} strokeWidth={STROKE} />
          <circle cx="82" cy="50" r="8" fill={inner} />
        </g>
      );
    case 'cat':
      return (
        <g>
          <path d="M36 56 L34 32 L54 44 Z" fill={color} stroke={ink} strokeWidth={STROKE} strokeLinejoin="round" />
          <path d="M39 51 L38 39 L48 45 Z" fill={inner} />
          <path d="M84 56 L86 32 L66 44 Z" fill={color} stroke={ink} strokeWidth={STROKE} strokeLinejoin="round" />
          <path d="M81 51 L82 39 L72 45 Z" fill={inner} />
        </g>
      );
    case 'bear':
      return (
        <g>
          <circle cx="39" cy="49" r="11" fill={color} stroke={ink} strokeWidth={STROKE} />
          <circle cx="39" cy="49" r="5" fill={inner} />
          <circle cx="81" cy="49" r="11" fill={color} stroke={ink} strokeWidth={STROKE} />
          <circle cx="81" cy="49" r="5" fill={inner} />
        </g>
      );
    case 'frog':
      return (
        <g>
          <circle cx="44" cy="47" r="12" fill={color} stroke={ink} strokeWidth={STROKE} />
          <circle cx="76" cy="47" r="12" fill={color} stroke={ink} strokeWidth={STROKE} />
          <circle cx="44" cy="47" r="7" fill="#FFFDF6" />
          <circle cx="76" cy="47" r="7" fill="#FFFDF6" />
          {mood === 'sleepy' ? (
            <>
              <path d="M39 48h10" stroke={ink} strokeWidth={STROKE} strokeLinecap="round" />
              <path d="M71 48h10" stroke={ink} strokeWidth={STROKE} strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="45" cy="48" r="3.4" fill={ink} />
              <circle cx="77" cy="48" r="3.4" fill={ink} />
            </>
          )}
        </g>
      );
  }
}

function Face({
  species, ink, color, inner, eyesClosed, eyesHappy, mood,
}: {
  species: Species; ink: string; color: string; inner: string;
  eyesClosed: boolean; eyesHappy: boolean; mood: Mood;
}) {
  const eyeY = 69;
  const lx = 49;
  const rx = 71;
  const frog = species === 'frog';

  return (
    <g>
      {/* frogs keep their eyes up top, so the face is just a mouth */}
      {!frog && (
        eyesClosed ? (
          <>
            <path d={`M${lx - 5} ${eyeY} q5 4 10 0`} stroke={ink} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
            <path d={`M${rx - 5} ${eyeY} q5 4 10 0`} stroke={ink} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
          </>
        ) : eyesHappy ? (
          <>
            <path d={`M${lx - 5} ${eyeY + 2} q5 -6 10 0`} stroke={ink} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
            <path d={`M${rx - 5} ${eyeY + 2} q5 -6 10 0`} stroke={ink} strokeWidth={STROKE} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx={lx} cy={eyeY} rx="3.6" ry="4.2" fill={ink} />
            <ellipse cx={rx} cy={eyeY} rx="3.6" ry="4.2" fill={ink} />
            <circle cx={lx + 1.3} cy={eyeY - 1.5} r="1.3" fill="#FFFDF6" />
            <circle cx={rx + 1.3} cy={eyeY - 1.5} r="1.3" fill="#FFFDF6" />
          </>
        )
      )}

      {/* muzzle */}
      {(species === 'bear' || species === 'mouse') && (
        <ellipse cx="60" cy="80" rx="11" ry="8" fill={mix(color, '#FFFFFF', 0.55)} />
      )}

      {species !== 'frog' && (
        <path d="M57 76.5 h6 l-3 3.2 Z" fill={inner} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
      )}

      {/* mouth */}
      {frog ? (
        <path
          d={mood === 'happy' || mood === 'cheer' ? 'M42 72 q18 16 36 0' : 'M44 73 q16 9 32 0'}
          stroke={ink}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
        />
      ) : mood === 'cheer' ? (
        <path d="M53 82 q7 9 14 0 q-7 3 -14 0Z" fill={ink} />
      ) : (
        <path
          d={mood === 'sleepy' ? 'M56 83 q4 3 8 0' : 'M53 82 q3.5 4.5 7 0 q3.5 4.5 7 0'}
          stroke={ink}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {species === 'cat' && (
        <g stroke={ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.7">
          <path d="M30 76 h10" /><path d="M30 81 h10" />
          <path d="M80 76 h10" /><path d="M80 81 h10" />
        </g>
      )}
    </g>
  );
}

function Accessory({ id, ink }: { id: string; ink: string }) {
  switch (id) {
    case 'glasses':
      return (
        <g stroke={ink} strokeWidth="2.6" fill="none">
          <circle cx="49" cy="69" r="8.5" fill="#FFFDF6" fillOpacity="0.35" />
          <circle cx="71" cy="69" r="8.5" fill="#FFFDF6" fillOpacity="0.35" />
          <path d="M57.5 69h5" strokeLinecap="round" />
        </g>
      );
    case 'scarf':
      return (
        <g stroke={ink} strokeWidth="2.6" strokeLinejoin="round">
          <path d="M40 90 q20 10 40 0 v7 q-20 10 -40 0Z" fill="#EFA3B0" />
          <path d="M72 96 l5 14 h-9 l1 -12" fill="#A3C4E0" />
          <path d="M42 92 q19 9 37 0" stroke="#FFFDF6" strokeWidth="2" fill="none" opacity="0.7" />
        </g>
      );
    case 'bandana':
      return (
        <g stroke={ink} strokeWidth="2.6" strokeLinejoin="round">
          <path d="M42 89 q18 9 36 0 l-6 9 q-12 5 -24 0Z" fill="#EFCE7B" />
          <circle cx="52" cy="92" r="1.6" fill={ink} stroke="none" />
          <circle cx="60" cy="94" r="1.6" fill={ink} stroke="none" />
          <circle cx="68" cy="92" r="1.6" fill={ink} stroke="none" />
        </g>
      );
    case 'cape':
      return (
        <path
          d="M34 60 q26 -8 52 0 l6 44 q-32 10 -64 0Z"
          fill="#C0A9DB"
          stroke={ink}
          strokeWidth="2.8"
          strokeLinejoin="round"
          opacity="0.95"
        />
      );
    default:
      return null;
  }
}

function Hat({ id, ink, species }: { id: string; ink: string; species: Species }) {
  // frogs and mice wear hats a touch lower — their heads read wider
  const dy = species === 'frog' ? 6 : species === 'mouse' ? 4 : 0;
  const g = (children: React.ReactNode) => <g transform={`translate(0 ${dy})`}>{children}</g>;

  switch (id) {
    case 'bow':
      return g(
        <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
          <path d="M60 44 l-13 -7 v14Z" fill="#EFA3B0" />
          <path d="M60 44 l13 -7 v14Z" fill="#EFA3B0" />
          <circle cx="60" cy="44" r="4" fill="#E8697F" />
        </g>,
      );
    case 'party':
      return g(
        <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
          <path d="M60 14 L72 48 H48Z" fill="#A3C4E0" />
          <path d="M52 40 h16" stroke="#EFCE7B" strokeWidth="3" />
          <path d="M50 32 h20" stroke="#EFA3B0" strokeWidth="3" />
          <circle cx="60" cy="13" r="4.5" fill="#EFCE7B" />
        </g>,
      );
    case 'beanie':
      return g(
        <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
          <path d="M38 48 q22 -30 44 0Z" fill="#9FCFB8" />
          <rect x="35" y="44" width="50" height="10" rx="5" fill="#7FB9A0" />
          <circle cx="60" cy="19" r="6" fill="#FFFDF6" />
        </g>,
      );
    case 'flower':
      return g(
        <g stroke={ink} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M34 48 q26 -16 52 0" fill="none" stroke="#B4C69A" strokeWidth="4" />
          {[38, 50, 60, 70, 82].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy={44 - (i === 2 ? 5 : i % 2 === 0 ? 0 : 3)} r="5.5" fill={['#EFA3B0', '#EFCE7B', '#C0A9DB', '#95CBC8', '#F2B58F'][i]} />
              <circle cx={x} cy={44 - (i === 2 ? 5 : i % 2 === 0 ? 0 : 3)} r="1.8" fill="#FFFDF6" stroke="none" />
            </g>
          ))}
        </g>,
      );
    case 'headphones':
      return g(
        <g stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M34 52 a26 26 0 0 1 52 0" />
          <rect x="27" y="48" width="13" height="20" rx="6" fill="#A3AEE0" />
          <rect x="80" y="48" width="13" height="20" rx="6" fill="#A3AEE0" />
        </g>,
      );
    case 'crown':
      return g(
        <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
          <path d="M40 48 l-3 -22 11 9 12 -14 12 14 11 -9 -3 22Z" fill="#EFCE7B" />
          <circle cx="60" cy="38" r="3" fill="#EFA3B0" />
        </g>,
      );
    case 'pumpkin':
      return g(
        <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
          <ellipse cx="60" cy="38" rx="19" ry="14" fill="#F2A15C" />
          <path d="M52 26 q8 10 0 24 M68 26 q-8 10 0 24" stroke={ink} strokeWidth="2" fill="none" />
          <path d="M60 24 v-7 q6 -1 7 4" fill="none" stroke="#B4C69A" strokeWidth="3.4" />
        </g>,
      );
    case 'santa':
      return g(
        <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
          <path d="M38 48 q18 -32 44 -22 l-10 22Z" fill="#E8697F" />
          <rect x="34" y="43" width="52" height="11" rx="5.5" fill="#FFFDF6" />
          <circle cx="86" cy="26" r="7" fill="#FFFDF6" />
        </g>,
      );
    case 'sunhat':
      return g(
        <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
          <ellipse cx="60" cy="49" rx="34" ry="10" fill="#EFCE7B" />
          <path d="M45 48 q15 -26 30 0Z" fill="#EFCE7B" />
          <path d="M44 44 q16 7 32 0" stroke="#EFA3B0" strokeWidth="4" fill="none" />
        </g>,
      );
    case 'sprout':
      return g(
        <g stroke={ink} strokeWidth="2.6" strokeLinejoin="round">
          <path d="M60 46 v-16" stroke="#7FB9A0" strokeWidth="3.4" />
          <path d="M60 34 q-14 -3 -12 -13 q12 -1 12 13Z" fill="#9FCFB8" />
          <path d="M60 38 q14 -3 12 -12 q-12 -1 -12 12Z" fill="#B4C69A" />
        </g>,
      );
    default:
      return null;
  }
}

/** The avatar's little room, decorated with whatever has been earned. */
export function AvatarRoom({
  decor, ink, size = 220, children,
}: { decor: string[]; ink: string; size?: number; children: React.ReactNode }) {
  const has = (id: string) => decor.includes(id);
  return (
    <div style={{ position: 'relative', width: size, height: size * 0.86 }}>
      <svg
        viewBox="0 0 240 206"
        width={size}
        height={size * 0.86}
        style={{ position: 'absolute', inset: 0 }}
        aria-hidden="true"
      >
        {has('garland') && (
          <g stroke={ink} strokeWidth="2" fill="none">
            <path d="M6 20 q60 26 114 4 q54 -22 114 8" />
            {[30, 66, 104, 142, 180, 214].map((x, i) => (
              <path
                key={x}
                d={`M${x} ${26 + (i % 2) * 6} l3 6 6.5 .8 -4.8 4.6 1.2 6.6 -5.9 -3.2 -5.9 3.2 1.2 -6.6 -4.8 -4.6 6.5 -.8Z`}
                fill={['#EFA3B0', '#EFCE7B', '#9FCFB8', '#A3C4E0', '#C0A9DB', '#F2B58F'][i]}
                strokeWidth="1.6"
              />
            ))}
          </g>
        )}
        {has('poster') && (
          <g stroke={ink} strokeWidth="2.6" strokeLinejoin="round">
            <rect x="18" y="42" width="46" height="54" rx="6" fill="#FFF6EA" />
            <path d="M22 84 l12 -16 9 11 7 -8 10 13Z" fill="#A3C4E0" />
            <circle cx="52" cy="56" r="5" fill="#EFCE7B" />
          </g>
        )}
        {has('rug') && <ellipse cx="120" cy="176" rx="86" ry="21" fill="#EFA3B0" opacity="0.35" stroke={ink} strokeWidth="2.4" />}
        {has('lamp') && (
          <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
            <path d="M198 92 l-14 26 h28Z" fill="#EFCE7B" />
            <path d="M198 118 v46" />
            <path d="M186 166 h24" strokeLinecap="round" />
            <circle cx="198" cy="126" r="26" fill="#EFCE7B" opacity="0.14" stroke="none" />
          </g>
        )}
        {has('plant') && (
          <g stroke={ink} strokeWidth="2.8" strokeLinejoin="round">
            <path d="M30 168 h30 l-4 -26 h-22Z" fill="#D89A86" />
            <path d="M45 142 q-16 -8 -13 -28 q16 3 13 28Z" fill="#9FCFB8" />
            <path d="M45 142 q16 -12 14 -30 q-16 6 -14 30Z" fill="#B4C69A" />
          </g>
        )}
        {has('books') && (
          <g stroke={ink} strokeWidth="2.6" strokeLinejoin="round">
            <rect x="176" y="150" width="46" height="12" rx="3" fill="#A3AEE0" />
            <rect x="180" y="138" width="40" height="12" rx="3" fill="#EFA3B0" />
            <rect x="184" y="126" width="32" height="12" rx="3" fill="#9FCFB8" />
          </g>
        )}
        <path d="M8 176 h224" stroke={ink} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      </svg>
      <div style={{ position: 'absolute', left: '50%', bottom: 12, transform: 'translateX(-50%)' }}>
        {children}
      </div>
    </div>
  );
}

export const SPECIES_LIST: { id: Species; name: string }[] = [
  { id: 'bunny', name: 'Bunny' },
  { id: 'mouse', name: 'Mouse' },
  { id: 'frog', name: 'Frog' },
  { id: 'cat', name: 'Cat' },
  { id: 'bear', name: 'Bear' },
];

export const AVATAR_COLORS = [
  '#F6E3E8', '#E7F0E4', '#E2ECF7', '#F7EEDC', '#EFE6F7',
  '#DDEFEA', '#F7E2D6', '#E8E6F5', '#F3F0DC', '#E6E2DC',
];
