/**
 * Washi tape and stickers. Decorative, useless, load-bearing.
 *
 * These sit in their own layer between the paper and the widgets: draggable,
 * rotatable, deletable, and completely inert otherwise. Stickers unlock as you
 * finish things, which is the same reward pool the avatar's hats come from.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Decoration, ID } from '../lib/types';
import { useDoc, useUI } from '../lib/store';
import { Icon } from './Icons';
import { readableOn } from '../lib/themes';

/* ------------------------------------------------------------------ */
/* the patterns                                                        */
/* ------------------------------------------------------------------ */

export const TAPES: { id: string; label: string; color: string; pattern: string }[] = [
  { id: 'plain', label: 'Plain', color: '#EFA3B0', pattern: 'none' },
  { id: 'stripe', label: 'Stripes', color: '#A3C4E0', pattern: 'stripe' },
  { id: 'dot', label: 'Dots', color: '#EFCE7B', pattern: 'dot' },
  { id: 'check', label: 'Gingham', color: '#9FCFB8', pattern: 'check' },
  { id: 'wave', label: 'Waves', color: '#C0A9DB', pattern: 'wave' },
  { id: 'kraft', label: 'Kraft', color: '#D9B08C', pattern: 'kraft' },
];

/** Stickers, each earned at a number of finished things. */
export const STICKERS: { id: string; label: string; at: number; draw: string; color: string }[] = [
  { id: 'star', label: 'Star', at: 0, color: '#EFCE7B', draw: 'M12 3l2.6 5.6 6.1.8-4.5 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.3 9.4l6.1-.8L12 3Z' },
  { id: 'heart', label: 'Heart', at: 0, color: '#EFA3B0', draw: 'M12 20s-7.5-4.6-7.5-9.8A4.3 4.3 0 0 1 12 8.2a4.3 4.3 0 0 1 7.5 2A9.9 9.9 0 0 1 12 20Z' },
  { id: 'leaf', label: 'Leaf', at: 5, color: '#9FCFB8', draw: 'M5 19c0-8.5 5.4-13.5 15.5-13.5C20.5 14 15.9 18.8 9 18.8M5 19c2-3.7 4.6-6.3 8.3-8' },
  { id: 'cloud', label: 'Cloud', at: 10, color: '#A3C4E0', draw: 'M6.5 17.5h11a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.4-1.6 3.8 3.8 0 0 0-1.9 8.6Z' },
  { id: 'flower', label: 'Flower', at: 18, color: '#C0A9DB', draw: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM12 8.5V3m0 12.5V21M8.5 12H3m12.5 0H21M9.5 9.5 5.6 5.6m8.9 8.9 3.9 3.9M9.5 14.5 5.6 18.4m8.9-8.9 3.9-3.9' },
  { id: 'moon', label: 'Moon', at: 25, color: '#AAB0E8', draw: 'M20 14.6A8.5 8.5 0 0 1 9.4 4 8.6 8.6 0 1 0 20 14.6Z' },
  { id: 'cup', label: 'Cup', at: 35, color: '#D89A86', draw: 'M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm11 2h2a2.5 2.5 0 0 1 0 5h-2' },
  { id: 'bolt', label: 'Bolt', at: 50, color: '#EFCE7B', draw: 'M13.5 3 5.5 13.5h5L10 21l8-10.5h-5L13.5 3Z' },
  { id: 'paw', label: 'Paw', at: 70, color: '#F2B58F', draw: 'M8 15.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5-1.6 3.5-4 3.5-4-1.3-4-3.5Zm-1-6a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4Zm10 0a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4Z' },
  { id: 'sparkle', label: 'Sparkle', at: 90, color: '#95CBC8', draw: 'M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.6 10.4 12.2 5 10.6 10.4 9 12 3.5Z' },
  { id: 'crown', label: 'Crown', at: 120, color: '#EFCE7B', draw: 'M4.5 18.5 3 7l5.5 4.5L12 4l3.5 7.5L21 7l-1.5 11.5h-15Z' },
];

export function tapeBackground(tape: (typeof TAPES)[number], color: string): string {
  switch (tape.pattern) {
    case 'stripe':
      return `repeating-linear-gradient(115deg, ${color} 0 7px, color-mix(in srgb, ${color} 55%, #fff) 7px 14px)`;
    case 'dot':
      return `radial-gradient(circle at 6px 6px, color-mix(in srgb, ${color} 45%, #fff) 2.4px, transparent 2.6px) 0 0/12px 12px, ${color}`;
    case 'check':
      return `repeating-linear-gradient(0deg, color-mix(in srgb, ${color} 62%, #fff) 0 6px, transparent 6px 12px), repeating-linear-gradient(90deg, color-mix(in srgb, ${color} 62%, #fff) 0 6px, transparent 6px 12px), ${color}`;
    case 'wave':
      return `repeating-linear-gradient(90deg, transparent 0 5px, color-mix(in srgb, ${color} 50%, #fff) 5px 7px), ${color}`;
    case 'kraft':
      return `repeating-linear-gradient(45deg, color-mix(in srgb, ${color} 88%, #7a5c3e) 0 3px, ${color} 3px 6px)`;
    default:
      return color;
  }
}

/* ------------------------------------------------------------------ */
/* the layer on the page                                               */
/* ------------------------------------------------------------------ */

export function DecorLayer({ sectorId, editable }: { sectorId: ID; editable: boolean }) {
  const all = useDoc((s) => s.doc.decorations);
  const move = useDoc((s) => s.moveDecoration);
  const update = useDoc((s) => s.updateDecoration);
  const remove = useDoc((s) => s.removeDecoration);
  const [selected, setSelected] = useState<ID | null>(null);
  const [drag, setDrag] = useState<{ id: ID; x: number; y: number } | null>(null);

  const mine = useMemo(() => all.filter((d) => d.sectorId === sectorId), [all, sectorId]);

  const startDrag = (e: React.PointerEvent, dec: Decoration) => {
    if (!editable || e.button !== 0) return;
    e.stopPropagation();
    setSelected(dec.id);
    const sx = e.clientX;
    const sy = e.clientY;
    let last = { x: dec.x, y: dec.y };
    const onMove = (ev: PointerEvent) => {
      last = { x: Math.max(0, dec.x + (ev.clientX - sx)), y: Math.max(0, dec.y + (ev.clientY - sy)) };
      setDrag({ id: dec.id, ...last });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setDrag(null);
      if (last.x !== dec.x || last.y !== dec.y) move(dec.id, last.x, last.y);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        /**
         * Normally tape sits *under* the widgets, like real tape under a card.
         * While you're arranging it, the layer comes to the front — otherwise
         * a strip dropped where a widget already is can never be grabbed.
         */
        zIndex: editable ? 9500 : 0,
        // the container never swallows clicks; each piece opts in below
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {mine.map((dec) => {
          const live = drag?.id === dec.id ? drag : dec;
          const isSel = selected === dec.id && editable;
          return (
            <motion.div
              key={dec.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, rotate: dec.rotation + 12 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              onPointerDown={(e) => startDrag(e, dec)}
              style={{
                position: 'absolute',
                left: live.x,
                top: live.y,
                rotate: `${dec.rotation}deg`,
                pointerEvents: editable ? 'auto' : 'none',
                cursor: editable ? 'grab' : 'default',
                touchAction: 'none',
                outline: isSel ? '2px dashed var(--accent)' : 'none',
                outlineOffset: 4,
                borderRadius: 4,
              }}
            >
              {dec.kind === 'tape' ? <TapeStrip dec={dec} /> : <StickerMark dec={dec} />}

              {isSel && (
                <span
                  style={{
                    position: 'absolute', top: -30, left: 0, display: 'flex', gap: 3,
                    rotate: `${-dec.rotation}deg`,
                  }}
                >
                  <button
                    className="btn tiny"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => update(dec.id, { rotation: dec.rotation + 15 })}
                    aria-label="Rotate"
                    style={{ padding: 3 }}
                  >
                    <Icon name="repeat" size={11} />
                  </button>
                  {dec.kind === 'tape' && (
                    <>
                      <button
                        className="btn tiny"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => update(dec.id, { length: Math.max(50, (dec.length ?? 130) - 30) })}
                        aria-label="Shorter"
                        style={{ padding: 3 }}
                      >
                        −
                      </button>
                      <button
                        className="btn tiny"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => update(dec.id, { length: Math.min(600, (dec.length ?? 130) + 30) })}
                        aria-label="Longer"
                        style={{ padding: 3 }}
                      >
                        +
                      </button>
                    </>
                  )}
                  {dec.kind === 'sticker' && (
                    <button
                      className="btn tiny"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => update(dec.id, { scale: ((dec.scale ?? 1) >= 2 ? 0.7 : (dec.scale ?? 1) + 0.35) })}
                      aria-label="Resize"
                      style={{ padding: 3 }}
                    >
                      <Icon name="sparkle" size={11} />
                    </button>
                  )}
                  <button
                    className="btn tiny"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => { remove(dec.id); setSelected(null); }}
                    aria-label="Remove"
                    style={{ padding: 3, color: '#B4544A' }}
                  >
                    <Icon name="trash" size={11} />
                  </button>
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function TapeStrip({ dec }: { dec: Decoration }) {
  const tape = TAPES.find((t) => t.id === dec.variant) ?? TAPES[0];
  const color = dec.color ?? tape.color;
  return (
    <span
      style={{
        display: 'block',
        width: dec.length ?? 130,
        height: 30,
        background: tapeBackground(tape, color),
        opacity: 0.82,
        // torn edges, and the faint shadow a real strip casts
        borderLeft: '2px dashed color-mix(in srgb, #4A3B35 14%, transparent)',
        borderRight: '2px dashed color-mix(in srgb, #4A3B35 14%, transparent)',
        boxShadow: '0 2px 5px color-mix(in srgb, #4A3B35 22%, transparent)',
      }}
      aria-hidden="true"
    />
  );
}

function StickerMark({ dec }: { dec: Decoration }) {
  const sticker = STICKERS.find((s) => s.id === dec.variant) ?? STICKERS[0];
  const size = 44 * (dec.scale ?? 1);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', filter: 'drop-shadow(0 2px 3px rgba(74,59,53,0.28))' }}>
      {/* the white die-cut border that makes a sticker a sticker */}
      <path d={sticker.draw} fill="#FFFBF5" stroke="#FFFBF5" strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d={sticker.draw} fill={dec.color ?? sticker.color} stroke="#4A3B35" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* the drawer you pick them from                                       */
/* ------------------------------------------------------------------ */

export function DecorDrawer({ sectorId }: { sectorId: ID }) {
  const add = useDoc((s) => s.addDecoration);
  const existing = useDoc((s) => s.doc.decorations);
  const completed = useDoc((s) => s.doc.stats.completed);
  const toast = useUI((s) => s.toast);
  const setDecorating = useUI((s) => s.setDecorating);
  const [tab, setTab] = useState<'tape' | 'sticker'>('tape');
  const [color, setColor] = useState<string | undefined>();

  const place = (kind: 'tape' | 'sticker', variant: string) => {
    // Cascade down-right from a fixed corner rather than dropping at random:
    // random placement kept landing pieces on top of each other, and a random
    // position is impossible to predict or to find again.
    const mine = existing.filter((d) => d.sectorId === sectorId).length;
    add({
      sectorId, kind, variant,
      x: 40 + (mine % 8) * 26,
      y: 40 + (mine % 8) * 22,
      rotation: ((mine * 37) % 25) - 12,
      length: kind === 'tape' ? 130 : undefined,
      scale: kind === 'sticker' ? 1 : undefined,
      color,
    });
    // arranging mode, or the new piece is behind a widget and ungrabbable
    setDecorating(true);
    toast(kind === 'tape' ? 'Tape down — drag it where you want it.' : 'Stuck on — drag it where you want it.');
  };

  const locked = STICKERS.filter((s) => s.at > completed);
  const nextUp = locked.sort((a, b) => a.at - b.at)[0];

  return (
    <div style={{ display: 'grid', gap: 9, minWidth: 236 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className={`btn tiny ${tab === 'tape' ? 'primary' : ''}`} onClick={() => setTab('tape')} style={{ flex: 1, justifyContent: 'center' }}>
          Washi tape
        </button>
        <button className={`btn tiny ${tab === 'sticker' ? 'primary' : ''}`} onClick={() => setTab('sticker')} style={{ flex: 1, justifyContent: 'center' }}>
          Stickers
        </button>
      </div>

      {tab === 'tape' ? (
        <>
          <div style={{ display: 'grid', gap: 5 }}>
            {TAPES.map((t) => (
              <button
                key={t.id}
                onClick={() => place('tape', t.id)}
                title={`Lay down ${t.label} tape`}
                style={{
                  height: 24, borderRadius: 3, border: '2px solid var(--line)', padding: 0,
                  background: tapeBackground(t, color ?? t.color),
                  color: readableOn(color ?? t.color),
                  fontSize: 10.5, fontWeight: 700,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)' }}>
            Drag a strip anywhere. Select it to rotate, stretch or peel it off.
          </p>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {STICKERS.map((s) => {
              const earned = completed >= s.at;
              return (
                <button
                  key={s.id}
                  onClick={earned ? () => place('sticker', s.id) : undefined}
                  disabled={!earned}
                  title={earned ? s.label : `Unlocks at ${s.at} finished things`}
                  aria-label={earned ? s.label : `${s.label}, locked`}
                  style={{
                    width: 38, height: 38, padding: 4, borderRadius: 11,
                    border: '2px solid var(--line)', background: 'var(--surface)',
                    opacity: earned ? 1 : 0.32, display: 'grid', placeItems: 'center',
                    position: 'relative',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={s.draw} fill={earned ? s.color : 'none'} stroke="#4A3B35" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
                  </svg>
                  {!earned && (
                    <span style={{ position: 'absolute', bottom: -2, right: -2 }}>
                      <Icon name="lock" size={10} color="var(--ink-faint)" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            {nextUp
              ? `${nextUp.label} unlocks at ${nextUp.at} finished things — ${nextUp.at - completed} to go.`
              : 'Every sticker earned. The drawer is yours.'}
          </p>
        </>
      )}

      <div>
        <p style={{ margin: '0 0 5px', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-faint)' }}>
          COLOUR
        </p>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            onClick={() => setColor(undefined)}
            title="As designed"
            aria-label="Original colour"
            style={{
              width: 20, height: 20, borderRadius: 7, padding: 0,
              border: color === undefined ? '2.5px solid var(--ink)' : '2px solid var(--line)',
              background: 'linear-gradient(135deg,#EFA3B0,#A3C4E0,#9FCFB8)',
            }}
          />
          {['#EFA3B0', '#A3C4E0', '#9FCFB8', '#EFCE7B', '#C0A9DB', '#F2B58F', '#95CBC8', '#D9C7B8'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Colour ${c}`}
              style={{
                width: 20, height: 20, borderRadius: 7, padding: 0, background: c,
                border: color === c ? '2.5px solid var(--ink)' : '2px solid var(--line)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
