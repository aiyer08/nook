/** Shared chunky building blocks: checkbox, panel, modal, empty states. */
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icons';
import { useUI } from '../lib/store';

/* ---------------- checkbox ---------------- */

export function Checkbox({
  checked, onChange, accent, size = 26, label,
}: {
  checked: boolean;
  onChange: () => void;
  accent?: string;
  size?: number;
  label?: string;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? 'Mark as not done' : 'Mark as done')}
      onClick={onChange}
      // squish on the way down, overshoot on the way back — like a rubber ball
      whileTap={{ scale: 0.8 }}
      animate={checked ? { scale: [1, 0.82, 1.14, 1] } : { scale: 1 }}
      transition={{ duration: 0.34, ease: [0.34, 1.56, 0.64, 1] }}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.34),
        border: '3px solid var(--line)',
        background: checked ? (accent ?? 'var(--accent)') : 'var(--surface)',
        borderColor: checked ? 'color-mix(in srgb, var(--ink) 55%, transparent)' : 'var(--line)',
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        boxShadow: checked ? 'none' : 'var(--shadow-sm)',
      }}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            key="tick"
            width={size * 0.66}
            height={size * 0.66}
            viewBox="0 0 24 24"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.path
              d="M5 12.5 10 17.5 19.5 6.5"
              stroke="var(--ink)"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ---------------- slide-over panel ---------------- */

export function Panel({
  open, onClose, title, subtitle, children, width = 420, side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: number;
  side?: 'right' | 'left';
}) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'color-mix(in srgb, var(--ink) 26%, transparent)',
            }}
          />
          <motion.aside
            key="panel"
            initial={{ x: side === 'right' ? width + 40 : -(width + 40) }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? width + 40 : -(width + 40) }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position: 'fixed', top: 0, bottom: 0, [side]: 0,
              width: `min(${width}px, 94vw)`, zIndex: 61,
              background: 'var(--bg)',
              borderLeft: side === 'right' ? '3px solid var(--line)' : undefined,
              borderRight: side === 'left' ? '3px solid var(--line)' : undefined,
              display: 'flex', flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <header
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '18px 20px 14px',
                borderBottom: '3px dashed var(--line)',
              }}
            >
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 22 }}>{title}</h2>
                {subtitle && (
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-soft)' }}>{subtitle}</p>
                )}
              </div>
              <button className="btn icon" onClick={onClose} aria-label="Close panel">
                <Icon name="close" size={18} />
              </button>
            </header>
            <div className="scroll" style={{ flex: 1, padding: 20 }}>{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function useEscape(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); fn(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, fn]);
}

/* ---------------- empty states ---------------- */

export function Empty({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '22px 14px', textAlign: 'center', color: 'var(--ink-soft)',
      }}
    >
      {icon && <Icon name={icon} size={30} stroke={1.8} color="var(--ink-faint)" />}
      <p className="hand" style={{ margin: 0, fontSize: 19, lineHeight: 1.3 }}>{children}</p>
    </div>
  );
}

/* ---------------- labelled field ---------------- */

export function Field({
  label, children, hint,
}: { label: string; children: ReactNode; hint?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} style={{ display: 'block', marginBottom: 14 }}>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 5 }}>
        {label}
      </span>
      <div id={id}>{children}</div>
      {hint && (
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>{hint}</span>
      )}
    </label>
  );
}

export function Row({ children, gap = 8, wrap = true, align = 'center' }: {
  children: ReactNode; gap?: number; wrap?: boolean; align?: string;
}) {
  return (
    <div style={{ display: 'flex', gap, flexWrap: wrap ? 'wrap' : 'nowrap', alignItems: align as never }}>
      {children}
    </div>
  );
}

/* ---------------- toggle ---------------- */

export function Toggle({
  on, onChange, label, hint,
}: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
        padding: '10px 12px', borderRadius: 'var(--r)', border: '3px solid var(--line)',
        background: on ? 'var(--accent-tint)' : 'var(--surface)', marginBottom: 10,
      }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{label}</span>
        {hint && <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)' }}>{hint}</span>}
      </span>
      <span
        style={{
          width: 50, height: 28, borderRadius: 999, flexShrink: 0,
          border: '3px solid var(--line)',
          background: on ? 'var(--accent)' : 'var(--surface-2)',
          display: 'flex', alignItems: 'center', padding: 2,
          justifyContent: on ? 'flex-end' : 'flex-start',
        }}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 620, damping: 32 }}
          style={{
            width: 18, height: 18, borderRadius: 999, background: 'var(--bg)',
            border: '2px solid var(--line)', display: 'block',
          }}
        />
      </span>
    </button>
  );
}

/* ---------------- confetti ---------------- */

/** 3–5 particles. Two hundred is a slot machine, five is a nice moment. */
export function Confetti({ trigger, enabled }: { trigger: number; enabled: boolean }) {
  const [bursts, setBursts] = useState<{ id: number; seed: number }[]>([]);
  useEffect(() => {
    if (trigger === 0 || !enabled) return;
    const id = trigger;
    setBursts((b) => [...b, { id, seed: Math.random() }]);
    const t = window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1400);
    return () => window.clearTimeout(t);
  }, [trigger, enabled]);

  const colors = ['#EFA3B0', '#EFCE7B', '#9FCFB8', '#A3C4E0', '#C0A9DB'];

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      <AnimatePresence>
        {bursts.map((b) => (
          <div key={b.id} style={{ position: 'absolute', left: '50%', top: '38%' }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const angle = (-140 + i * 25 + b.seed * 30) * (Math.PI / 180);
              const dist = 120 + b.seed * 60 + i * 14;
              return (
                <motion.span
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
                  animate={{
                    x: Math.cos(angle) * dist,
                    y: Math.sin(angle) * dist + 170,
                    opacity: [1, 1, 0],
                    rotate: 220 + i * 60,
                    scale: 1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.15, ease: [0.16, 0.8, 0.4, 1] }}
                  style={{
                    position: 'absolute',
                    width: 11, height: 15,
                    borderRadius: 4,
                    background: colors[i % colors.length],
                    border: '2px solid color-mix(in srgb, var(--ink) 45%, transparent)',
                    display: 'block',
                  }}
                />
              );
            })}
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- toasts ---------------- */

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)',
        zIndex: 9000, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ y: 24, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: 'auto',
              padding: '10px 18px',
              borderRadius: 999,
              border: '3px solid var(--line)',
              background: t.kind === 'win' ? 'var(--accent)' : 'var(--surface)',
              color: 'var(--ink)',
              fontWeight: 700, fontSize: 13.5,
              boxShadow: 'var(--shadow-md)',
              maxWidth: 'min(92vw, 460px)',
            }}
          >
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
