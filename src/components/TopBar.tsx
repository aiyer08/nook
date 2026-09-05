import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useDoc, useUI, sortedSectors } from '../lib/store';
import { Icon, type IconName } from './Icons';
import { Avatar } from './Avatar';
import { readableOn } from '../lib/themes';
import { play } from '../lib/sound';
import { SyncBadge } from './CalendarSync';
import { DecorDrawer } from './Decorations';

const PEN_COLORS = ['#4A3B35', '#E8697F', '#EFA3B0', '#EFCE7B', '#9FCFB8', '#A3C4E0', '#C0A9DB', '#F2B58F'];

export function TopBar() {
  const doc = useDoc((s) => s.doc);
  const undo = useDoc((s) => s.undo);
  const redo = useDoc((s) => s.redo);
  const past = useDoc((s) => s.past.length);
  const future = useDoc((s) => s.future.length);
  const setActiveSector = useDoc((s) => s.setActiveSector);
  const seeds = useDoc((s) => s.doc.garden.seeds);

  const setPanel = useUI((s) => s.setPanel);
  const setTodayOpen = useUI((s) => s.setTodayOpen);
  const tool = useUI((s) => s.tool);
  const setTool = useUI((s) => s.setTool);
  const penColor = useUI((s) => s.penColor);
  const penWidth = useUI((s) => s.penWidth);
  const setPen = useUI((s) => s.setPen);
  const mood = useUI((s) => s.avatarMood);
  const decorating = useUI((s) => s.decorating);
  // a widget is being dragged: the tabs become somewhere to drop it
  const dragging = useUI((s) => s.dragging);
  const setDecorating = useUI((s) => s.setDecorating);

  const [penOpen, setPenOpen] = useState(false);
  const [decorOpen, setDecorOpen] = useState(false);
  const penRef = useRef<HTMLDivElement>(null);
  const decorRef = useRef<HTMLDivElement>(null);
  const sectors = sortedSectors(doc.sectors);
  const active = doc.activeSectorId;

  useEffect(() => {
    if (!penOpen) return;
    const close = (e: MouseEvent) => {
      if (!penRef.current?.contains(e.target as Node)) setPenOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [penOpen]);

  useEffect(() => {
    if (!decorOpen) return;
    const close = (e: MouseEvent) => {
      // clicking on the board is how you drag tape, so only the toolbar and
      // the panels close the drawer
      const el = e.target as Node;
      if (decorRef.current?.contains(el)) return;
      if ((el as HTMLElement).closest?.('header')) {
        setDecorOpen(false);
        setDecorating(false);
      }
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [decorOpen, setDecorating]);

  const switchTab = (id: string) => {
    if (id === active) return;
    setActiveSector(id);
    play('page', doc.settings.sound);
  };

  return (
    <header
      style={{
        position: 'relative', zIndex: 30, flexShrink: 0,
        borderBottom: '3px solid var(--line)',
        background: 'color-mix(in srgb, var(--surface) 82%, var(--bg))',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* row 1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 8px' }}>
        <button
          className="btn ghost"
          onClick={() => setPanel('avatar')}
          style={{ padding: '2px 10px 2px 2px', gap: 6 }}
          title={`${doc.avatar.name} — dress them up`}
        >
          <span style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            <Avatar
              species={doc.avatar.species}
              color={doc.avatar.color}
              hat={doc.avatar.hat}
              accessory={doc.avatar.accessory}
              mood={mood}
              size={54}
              animate={doc.settings.motion}
            />
          </span>
          <span className="hand" style={{ fontSize: 26, lineHeight: 1 }}>nook</span>
        </button>

        <span style={{ flex: 1 }} />

        <SyncBadge onClick={() => setPanel('calendars')} />

        <button className="btn" onClick={() => setTodayOpen(true)} title="Everything due today, across every tab (T)">
          <Icon name="today" size={17} /> Today
        </button>

        {/* the garden you're growing, and the seeds waiting to go in */}
        <button
          className="btn"
          onClick={() => setPanel('garden')}
          title="The garden you've grown (G)"
          style={{ position: 'relative' }}
        >
          <Icon name="sprout" size={17} /> Garden
          {seeds > 0 && (
            <span
              style={{
                position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18,
                padding: '0 4px', borderRadius: 999, border: '2.5px solid var(--line)',
                background: '#EFCE7B', color: '#4A3B35', fontSize: 10.5, fontWeight: 700,
                display: 'grid', placeItems: 'center',
              }}
              title={`${seeds} seed${seeds === 1 ? '' : 's'} to plant`}
            >
              {seeds}
            </span>
          )}
        </button>

        <div style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 'var(--r)', border: '3px solid var(--line)', background: 'var(--surface)' }}>
          <ToolBtn icon="grip" label="Move things (V)" on={tool === 'select'} onClick={() => setTool('select')} />
          <ToolBtn icon="pen" label="Pen (P)" on={tool === 'pen'} onClick={() => { setTool('pen'); setPenOpen(true); }} />
          <ToolBtn icon="marker" label="Highlighter (M)" on={tool === 'marker'} onClick={() => { setTool('marker'); setPenOpen(true); }} />
          <ToolBtn icon="eraser" label="Eraser (E)" on={tool === 'eraser'} onClick={() => setTool('eraser')} />
        </div>

        <div style={{ position: 'relative' }} ref={penRef}>
          <button
            className="btn icon"
            onClick={() => setPenOpen((v) => !v)}
            aria-label="Pen colour and thickness"
            aria-expanded={penOpen}
            style={{ padding: 7 }}
          >
            <span
              style={{
                width: 18, height: 18, borderRadius: 999, background: penColor,
                border: '2px solid var(--line)', display: 'block',
              }}
            />
          </button>
          {penOpen && (
            <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', padding: 12, width: 214, background: 'var(--bg)', zIndex: 50 }}>
              <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>INK</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                {PEN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setPen(c, penWidth)}
                    aria-label={`Ink ${c}`}
                    style={{
                      width: 24, height: 24, borderRadius: 999, background: c, padding: 0,
                      border: penColor === c ? '3px solid var(--ink)' : '2px solid var(--line)',
                    }}
                  />
                ))}
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)' }}>
                THICKNESS · {penWidth}
              </p>
              <input
                type="range"
                min={2}
                max={14}
                value={penWidth}
                onChange={(e) => setPen(penColor, Number(e.target.value))}
                style={{ width: '100%', border: 'none', background: 'transparent', padding: 0 }}
                aria-label="Pen thickness"
              />
            </div>
          )}
        </div>

        {/* the decoration drawer */}
        <div style={{ position: 'relative' }} ref={decorRef}>
          <button
            className={`btn icon ${decorOpen || decorating ? 'primary' : ''}`}
            onClick={() => {
              const next = !decorOpen;
              setDecorOpen(next);
              // opening the drawer puts you in arranging mode, so anything you
              // lay down is immediately grabbable
              setDecorating(next);
            }}
            aria-label="Tape and stickers"
            aria-expanded={decorOpen}
            title="Washi tape and stickers"
            style={{ padding: 7 }}
          >
            <Icon name="sparkle" size={17} />
          </button>
          {decorOpen && active && (
            <div
              className="card"
              style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)', padding: 12,
                background: 'var(--bg)', zIndex: 50,
              }}
            >
              <DecorDrawer sectorId={active} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 3 }}>
          <button className="btn icon" onClick={undo} disabled={past === 0} aria-label="Undo" title="Undo (⌘Z)">
            <Icon name="undo" size={17} />
          </button>
          <button className="btn icon" onClick={redo} disabled={future === 0} aria-label="Redo" title="Redo (⌘⇧Z)">
            <Icon name="redo" size={17} />
          </button>
        </div>

        <button className="btn primary" onClick={() => setPanel('widgets')} title="Add a widget (N)">
          <Icon name="plus" size={17} /> Widget
        </button>

        <button className="btn icon" onClick={() => setPanel('settings')} aria-label="Settings">
          <Icon name="gear" size={17} />
        </button>
      </div>

      {/* a way out of arranging mode that doesn't require finding the button again */}
      {decorating && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', background: 'var(--accent-tint)',
            borderTop: '2px dashed var(--line)', fontSize: 12,
          }}
        >
          <Icon name="sparkle" size={14} color="var(--ink-soft)" />
          <span style={{ flex: 1 }}>
            Arranging tape and stickers — drag them about. Widgets are held still meanwhile.
          </span>
          <button
            className="btn tiny primary"
            onClick={() => { setDecorating(false); setDecorOpen(false); }}
          >
            Done
          </button>
        </div>
      )}

      {/* row 2 — tabs */}
      <div
        className="scroll"
        style={{ display: 'flex', gap: 6, padding: '0 14px 10px', overflowX: 'auto', alignItems: 'flex-end' }}
      >
        {sectors.map((s) => {
          const on = s.id === active;
          return (
            <button
              key={s.id}
              onClick={() => switchTab(s.id)}
              aria-current={on ? 'page' : undefined}
              /* the drop target for "drag a widget onto a tab to move it" */
              data-sector-id={s.id}
              title={dragging && !on ? `Drop a widget here to move it to ${s.name}` : s.name}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 7,
                padding: on ? '9px 16px 11px' : '7px 14px 9px',
                borderRadius: '16px 16px 0 0',
                border: dragging && !on ? '3px dashed var(--ink-soft)' : '3px solid var(--line)',
                borderBottom: 'none',
                background: on ? s.accent : `color-mix(in srgb, ${s.accent} 34%, var(--surface))`,
                color: on ? readableOn(s.accent, '#4A3B35') : 'var(--ink-soft)',
                fontWeight: 700, fontSize: 14,
                marginBottom: on ? -3 : dragging ? 4 : 0,
                boxShadow: on ? 'var(--shadow-sm)' : 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.16s var(--spring)',
              }}
            >
              <Icon name={s.icon as IconName} size={16} />
              {s.name}
              {on && (
                <motion.span
                  layoutId="tab-underline"
                  style={{
                    position: 'absolute', left: 6, right: 6, bottom: -3, height: 3,
                    background: s.accent, borderRadius: 2,
                  }}
                />
              )}
            </button>
          );
        })}
        <button
          className="btn ghost tiny"
          onClick={() => setPanel('sectors')}
          style={{ marginBottom: 4 }}
          title="Add or edit tabs"
        >
          <Icon name="plus" size={14} /> Tab
        </button>
      </div>
    </header>
  );
}

function ToolBtn({
  icon, label, on, onClick,
}: { icon: IconName; label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={on}
      style={{
        padding: 7, borderRadius: 12, border: 'none',
        background: on ? 'var(--accent)' : 'transparent',
        color: on ? 'var(--on-accent, var(--ink))' : 'var(--ink-soft)',
        display: 'grid', placeItems: 'center',
      }}
    >
      <Icon name={icon} size={17} />
    </button>
  );
}
