import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Icons';
import { GRID, useDoc, useUI } from '../lib/store';
import type { Sector, Widget } from '../lib/types';
import { PASTELS, readableOn } from '../lib/themes';
import { seedFrom, wobblyRect } from '../lib/ink';
import { play } from '../lib/sound';

const MIN_W = 220;
const MIN_H = 140;

interface Props {
  widget: Widget;
  sector: Sector;
  children: ReactNode;
  locked: boolean;
}

export function WidgetFrame({ widget, sector, children, locked }: Props) {
  const placeWidget = useDoc((s) => s.placeWidget);
  const updateWidget = useDoc((s) => s.updateWidget);
  const removeWidget = useDoc((s) => s.removeWidget);
  const duplicateWidget = useDoc((s) => s.duplicateWidget);
  const raiseWidget = useDoc((s) => s.raiseWidget);
  const sound = useDoc((s) => s.doc.settings.sound);
  const wobble = useDoc((s) => s.doc.settings.wobble);
  const selected = useUI((s) => s.selectedWidget === widget.id);
  const select = useUI((s) => s.select);
  const setDragging = useUI((s) => s.setDragging);

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const accent = widget.accent ?? sector.accent;
  const x = drag?.x ?? widget.x;
  const y = drag?.y ?? widget.y;
  const w = size?.w ?? widget.w;
  const h = size?.h ?? widget.h;
  const active = drag !== null || size !== null;

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [menu]);

  const snap = (v: number) => (sector.snap ? Math.round(v / GRID) * GRID : Math.round(v));

  const startDrag = (e: React.PointerEvent) => {
    if (locked || e.button !== 0) return;
    raiseWidget(widget.id);
    select(widget.id);
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = widget.x;
    const originY = widget.y;
    let last = { x: originX, y: originY };

    // window-level listeners so the drag survives the pointer leaving the header
    const move = (ev: PointerEvent) => {
      const nx = Math.max(0, snap(originX + (ev.clientX - startX)));
      const ny = Math.max(0, snap(originY + (ev.clientY - startY)));
      last = { x: nx, y: ny };
      setDrag(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setDrag(null);
      setDragging(false);
      if (last.x !== originX || last.y !== originY) placeWidget(widget.id, last.x, last.y);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const startResize = (e: React.PointerEvent) => {
    if (locked || e.button !== 0) return;
    e.stopPropagation();
    raiseWidget(widget.id);
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const originW = widget.w;
    const originH = widget.h;
    let last = { w: originW, h: originH };

    const move = (ev: PointerEvent) => {
      const nw = Math.max(MIN_W, snap(originW + (ev.clientX - startX)));
      const nh = Math.max(MIN_H, snap(originH + (ev.clientY - startY)));
      last = { w: nw, h: nh };
      setSize(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setSize(null);
      setDragging(false);
      if (last.w !== originW || last.h !== originH) {
        placeWidget(widget.id, widget.x, widget.y, last.w, last.h);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const nudge = (dx: number, dy: number) =>
    placeWidget(widget.id, Math.max(0, widget.x + dx), Math.max(0, widget.y + dy));

  return (
    <motion.section
      layout={false}
      onPointerDownCapture={() => { if (!locked) raiseWidget(widget.id); }}
      animate={{
        // pick-up: a small lift so it feels like you actually grabbed it
        scale: active ? 1.03 : 1,
        rotate: active ? 0 : widget.rotation,
      }}
      transition={{ type: 'spring', stiffness: 520, damping: 34 }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: widget.collapsed ? undefined : h,
        zIndex: active ? 999 : widget.z,
        background: 'var(--surface)',
        // with wobble on, the real edge is the SVG below; this keeps the box
        // the same size so nothing shifts when you toggle it
        border: `3px solid ${wobble ? 'transparent' : 'var(--line)'}`,
        borderRadius: 'var(--r-lg)',
        boxShadow: active ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        outline: selected && !active ? `3px solid ${accent}` : 'none',
        outlineOffset: 3,
      }}
      aria-label={widget.title}
    >
      {/* a hand-drawn edge: the same rectangle, drawn by a slightly unsteady hand */}
      {wobble && !widget.collapsed && (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6, overflow: 'visible' }}
        >
          <path
            d={wobblyRect(w - 3, h - 3, 22, seedFrom(widget.id))}
            transform="translate(1.5 1.5)"
            fill="none"
            stroke="var(--line)"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      )}

      {/* washi tape */}
      {widget.tape !== 'none' && (
        <>
          {(widget.tape === 'left' || widget.tape === 'both') && (
            <span className="washi tl" style={{ ['--tape' as string]: accent }} />
          )}
          {(widget.tape === 'right' || widget.tape === 'both') && (
            <span className="washi tr" style={{ ['--tape' as string]: accent }} />
          )}
          {widget.tape === 'corner' && (
            <span className="washi corner" style={{ ['--tape' as string]: accent }} />
          )}
        </>
      )}

      {/* header */}
      <header
        onPointerDown={startDrag}
        onDoubleClick={() => setEditingTitle(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 10px 9px 12px',
          background: `color-mix(in srgb, ${accent} 34%, var(--surface))`,
          borderBottom: widget.collapsed ? 'none' : '3px dashed var(--line)',
          borderRadius: widget.collapsed ? 'calc(var(--r-lg) - 3px)' : 'calc(var(--r-lg) - 3px) calc(var(--r-lg) - 3px) 0 0',
          cursor: locked ? 'default' : 'grab',
          touchAction: 'none',
          position: 'relative',
          zIndex: 4,
        }}
      >
        {!locked && <Icon name="grip" size={16} color="var(--ink-faint)" />}
        {editingTitle ? (
          <input
            autoFocus
            value={widget.title}
            onChange={(e) => updateWidget(widget.id, { title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false); }}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ flex: 1, padding: '3px 8px', fontWeight: 700, fontSize: 14.5, borderWidth: 2 }}
            aria-label="Widget title"
          />
        ) : (
          <h3
            style={{
              flex: 1, fontSize: 14.5, fontWeight: 700, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: 'none',
            }}
            title={widget.title}
          >
            {widget.title}
          </h3>
        )}

        <button
          className="btn ghost tiny"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => updateWidget(widget.id, { collapsed: !widget.collapsed })}
          aria-label={widget.collapsed ? 'Expand widget' : 'Collapse widget'}
          style={{ padding: 4 }}
        >
          <Icon name={widget.collapsed ? 'chevronDown' : 'chevronUp'} size={15} />
        </button>

        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="btn ghost tiny"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setMenu((m) => !m)}
            aria-label="Widget options"
            aria-expanded={menu}
            style={{ padding: 4 }}
          >
            <Icon name="dots" size={15} />
          </button>
          {menu && (
            <div
              className="card"
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 214,
                padding: 10, zIndex: 200, background: 'var(--bg)',
              }}
            >
              <MenuLabel>Colour</MenuLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                <button
                  onClick={() => updateWidget(widget.id, { accent: undefined })}
                  title="Match the tab"
                  aria-label="Match the tab colour"
                  style={{
                    ...swatch, background: sector.accent,
                    borderStyle: widget.accent ? 'solid' : 'double',
                    borderWidth: widget.accent ? 2 : 4,
                  }}
                />
                {PASTELS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => updateWidget(widget.id, { accent: p.value })}
                    title={p.name}
                    aria-label={p.name}
                    style={{
                      ...swatch, background: p.value,
                      borderWidth: widget.accent === p.value ? 3 : 2,
                      borderColor: widget.accent === p.value ? 'var(--ink)' : 'var(--line)',
                    }}
                  />
                ))}
              </div>

              <MenuLabel>Tape</MenuLabel>
              <div style={{ display: 'flex', gap: 5, marginBottom: 8, flexWrap: 'wrap' }}>
                {(['none', 'left', 'right', 'both', 'corner'] as const).map((t) => (
                  <button
                    key={t}
                    className={`btn tiny ${widget.tape === t ? 'primary' : ''}`}
                    onClick={() => updateWidget(widget.id, { tape: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <MenuLabel>Tilt</MenuLabel>
              <input
                type="range"
                min={-4}
                max={4}
                step={0.5}
                value={widget.rotation}
                onChange={(e) => updateWidget(widget.id, { rotation: Number(e.target.value) })}
                style={{ width: '100%', padding: 0, border: 'none', background: 'transparent' }}
                aria-label="Widget tilt"
              />

              <div style={{ height: 1, background: 'var(--line)', margin: '8px 0' }} />
              <button
                className="btn ghost tiny"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => { duplicateWidget(widget.id); setMenu(false); }}
              >
                <Icon name="copy" size={14} /> Duplicate
              </button>
              <button
                className="btn ghost tiny"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                onClick={() => { setEditingTitle(true); setMenu(false); }}
              >
                <Icon name="pencil" size={14} /> Rename
              </button>
              <button
                className="btn ghost tiny"
                style={{ width: '100%', justifyContent: 'flex-start', color: '#B4544A' }}
                onClick={() => { removeWidget(widget.id); play('tick', sound); setMenu(false); }}
              >
                <Icon name="trash" size={14} /> Remove widget
              </button>
              <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '6px 2px 0' }}>
                Removing is undoable — ⌘Z brings it right back.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* body */}
      {!widget.collapsed && (
        <div
          className="scroll"
          style={{
            flex: 1, minHeight: 0, padding: '12px 12px 14px',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {children}
        </div>
      )}

      {/* keyboard nudge target + resize handle */}
      {!locked && !widget.collapsed && (
        <button
          onPointerDown={startResize}
          onKeyDown={(e) => {
            const step = e.shiftKey ? GRID : 4;
            if (e.key === 'ArrowRight') { e.preventDefault(); nudge(step, 0); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-step, 0); }
            if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, step); }
            if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -step); }
          }}
          aria-label="Resize widget. Arrow keys move it."
          style={{
            position: 'absolute', right: -4, bottom: -4, width: 26, height: 26,
            borderRadius: 10, border: '3px solid var(--line)',
            background: accent, cursor: 'nwse-resize', touchAction: 'none',
            display: 'grid', placeItems: 'center', zIndex: 5,
            color: readableOn(accent, '#4A3B35'),
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M11 4 4 11 M11 8 8 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </motion.section>
  );
}

const swatch: React.CSSProperties = {
  width: 22, height: 22, borderRadius: 8, border: '2px solid var(--line)', padding: 0,
};

function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </p>
  );
}
