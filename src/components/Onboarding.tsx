import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AVATAR_COLORS, SPECIES_LIST } from './Avatar';
import { Icon, SECTOR_ICONS, type IconName } from './Icons';
import { PASTELS, SECTOR_PRESETS, THEMES, readableOn } from '../lib/themes';
import { useDoc } from '../lib/store';
import type { Species } from '../lib/types';
import { Field, Row } from './ui';

interface Pick { name: string; accent: string; icon: string }

export function Onboarding() {
  const finish = useDoc((s) => s.finishOnboarding);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const [species, setSpecies] = useState<Species>('bunny');
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [name, setName] = useState('Mochi');

  const [picks, setPicks] = useState<Pick[]>(
    SECTOR_PRESETS.slice(0, 3).map((p) => ({ ...p })),
  );
  const [customName, setCustomName] = useState('');
  const [themeId, setThemeId] = useState('paper');

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  const go = (d: number) => { setDir(d); setStep((s) => Math.max(0, Math.min(3, s + d))); };

  const togglePreset = (p: Pick) => {
    setPicks((cur) =>
      cur.some((x) => x.name === p.name)
        ? cur.filter((x) => x.name !== p.name)
        : [...cur, { ...p }],
    );
  };

  const addCustom = () => {
    const n = customName.trim();
    if (!n || picks.some((p) => p.name.toLowerCase() === n.toLowerCase())) return;
    setPicks([
      ...picks,
      {
        name: n,
        accent: PASTELS[picks.length % PASTELS.length].value,
        icon: SECTOR_ICONS[(picks.length + 4) % SECTOR_ICONS.length],
      },
    ]);
    setCustomName('');
  };

  const done = () =>
    finish(
      { species, color, name: name.trim() || 'Friend', hat: 'none', accessory: 'blush', decor: [] },
      picks.length ? picks : [SECTOR_PRESETS[0]],
      themeId,
    );

  const steps = ['Say hello', 'Your life, in parts', 'Pick a mood', 'All set'];

  return (
    <div
      style={{
        minHeight: '100dvh', display: 'grid', placeItems: 'center',
        // 24px of margin either side is a lot of a 390px screen
        padding: 'max(clamp(10px, 3vw, 24px), var(--safe-left)) clamp(10px, 3vw, 24px)'
          + ' calc(clamp(10px, 3vw, 24px) + var(--safe-bottom))',
        paddingTop: 'calc(clamp(10px, 3vw, 24px) + var(--safe-top))',
        position: 'relative', zIndex: 1,
      }}
    >
      <div
        className="card"
        style={{ width: 'min(760px, 100%)', padding: 'clamp(16px, 5vw, 30px) clamp(14px, 5vw, 30px) 24px' }}
      >
        {/* progress ribbon */}
        <Row gap={6}>
          {steps.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, height: 10, borderRadius: 999,
                border: '2px solid var(--line)',
                background: i <= step ? 'var(--accent)' : 'var(--surface-2)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </Row>
        <p className="hand" style={{ margin: '10px 0 0', fontSize: 22, color: 'var(--ink-soft)' }}>
          {steps[step]}
        </p>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            style={{ minHeight: 330, paddingTop: 8 }}
          >
            {step === 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 210px', gap: 24, alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 6 }}>
                    Welcome to your nook.
                  </h1>
                  <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginTop: 0, lineHeight: 1.6 }}>
                    A cozy little place to keep the parts of your life. First — who's keeping
                    you company?
                  </p>

                  <Field label="Choose a friend">
                    <Row>
                      {SPECIES_LIST.map((s) => (
                        <button
                          key={s.id}
                          className={`btn ${species === s.id ? 'primary' : ''}`}
                          onClick={() => setSpecies(s.id)}
                          aria-pressed={species === s.id}
                        >
                          {s.name}
                        </button>
                      ))}
                    </Row>
                  </Field>

                  <Field label="Their colour">
                    <Row gap={7}>
                      {AVATAR_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          aria-label={`Colour ${c}`}
                          aria-pressed={color === c}
                          style={{
                            width: 34, height: 34, borderRadius: 12, background: c,
                            border: color === c ? '3px solid var(--ink)' : '3px solid var(--line)',
                            boxShadow: color === c ? 'var(--shadow-sm)' : 'none',
                          }}
                        />
                      ))}
                    </Row>
                  </Field>

                  <Field label="Their name">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={18}
                      style={{ width: 200 }}
                      placeholder="Mochi"
                    />
                  </Field>
                </div>
                <div style={{ display: 'grid', placeItems: 'center' }}>
                  <motion.div
                    key={species + color}
                    initial={{ scale: 0.86, rotate: -4 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  >
                    <Avatar species={species} color={color} accessory="blush" size={190} />
                  </motion.div>
                  <p className="hand" style={{ fontSize: 24, margin: '6px 0 0' }}>{name || 'Mochi'}</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h1 style={{ fontSize: 28, marginBottom: 6 }}>What parts of life are we sorting?</h1>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, marginTop: 0 }}>
                  Each one becomes its own tab with its own colour. Pick as many as you like —
                  you can add or remove them later.
                </p>
                <Row gap={9}>
                  {SECTOR_PRESETS.map((p) => {
                    const on = picks.some((x) => x.name === p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => togglePreset(p)}
                        aria-pressed={on}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9,
                          padding: '11px 16px', borderRadius: 'var(--r)',
                          border: `3px solid ${on ? p.accent : 'var(--line)'}`,
                          background: on ? p.accent : 'var(--surface)',
                          color: on ? readableOn(p.accent, '#4A3B35') : 'var(--ink)',
                          fontWeight: 700, fontSize: 14.5,
                          boxShadow: on ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                          transform: on ? 'translateY(-2px)' : 'none',
                          transition: 'all 0.16s var(--spring)',
                        }}
                      >
                        <Icon name={p.icon as IconName} size={19} />
                        {p.name}
                      </button>
                    );
                  })}
                </Row>

                <div style={{ marginTop: 18 }}>
                  <Field label="Something else?">
                    <Row gap={8} wrap={false}>
                      <input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
                        placeholder="Band practice, dog stuff, side project…"
                        style={{ flex: 1 }}
                      />
                      <button className="btn" onClick={addCustom} disabled={!customName.trim()}>
                        <Icon name="plus" size={16} /> Add
                      </button>
                    </Row>
                  </Field>
                  {picks.filter((p) => !SECTOR_PRESETS.some((s) => s.name === p.name)).length > 0 && (
                    <Row gap={7}>
                      {picks
                        .filter((p) => !SECTOR_PRESETS.some((s) => s.name === p.name))
                        .map((p) => (
                          <span key={p.name} className="chip on" style={{ background: p.accent }}>
                            {p.name}
                            <button
                              onClick={() => setPicks(picks.filter((x) => x.name !== p.name))}
                              aria-label={`Remove ${p.name}`}
                              style={{ background: 'none', border: 'none', padding: 0, display: 'flex' }}
                            >
                              <Icon name="close" size={13} />
                            </button>
                          </span>
                        ))}
                    </Row>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h1 style={{ fontSize: 28, marginBottom: 6 }}>Pick a mood</h1>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14.5, marginTop: 0 }}>
                  Five colours, chosen to go together. Switch any time in settings.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      aria-pressed={themeId === t.id}
                      style={{
                        padding: 12, borderRadius: 'var(--r)', textAlign: 'left',
                        border: `3px solid ${themeId === t.id ? t.accent : 'var(--line)'}`,
                        background: t.bg, color: t.text,
                        boxShadow: themeId === t.id ? 'var(--shadow-md)' : 'none',
                        transform: themeId === t.id ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.16s var(--spring)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {[t.bg, t.surface, t.text, t.accent, t.muted].map((c, i) => (
                          <span
                            key={i}
                            style={{
                              width: 22, height: 22, borderRadius: 7, background: c,
                              border: `2px solid ${t.text}33`,
                            }}
                          />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center', gap: 4, paddingTop: 10 }}>
                <Avatar species={species} color={color} mood="cheer" accessory="blush" size={170} />
                <h1 style={{ fontSize: 30, marginTop: 4 }}>{name || 'Mochi'} is ready.</h1>
                <p className="hand" style={{ fontSize: 22, color: 'var(--ink-soft)', margin: 0, maxWidth: 460 }}>
                  {picks.length} {picks.length === 1 ? 'tab' : 'tabs'}, a few starter widgets, and a
                  blank page. Move things around — nothing here is fixed.
                </p>
                <Row gap={7}>
                  {picks.map((p) => (
                    <span
                      key={p.name}
                      className="chip"
                      style={{ background: p.accent, borderColor: p.accent, color: readableOn(p.accent, '#4A3B35') }}
                    >
                      <Icon name={p.icon as IconName} size={14} /> {p.name}
                    </span>
                  ))}
                </Row>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
          <button className="btn ghost" onClick={() => go(-1)} disabled={step === 0}>
            <Icon name="chevronLeft" size={16} /> Back
          </button>
          <span style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              className="btn primary"
              onClick={() => go(1)}
              disabled={step === 1 && picks.length === 0}
              style={{ '--on-accent': readableOn(theme.accent) } as React.CSSProperties}
            >
              Next <Icon name="chevronRight" size={16} />
            </button>
          ) : (
            <button className="btn primary" onClick={done}>
              Open my nook <Icon name="sparkle" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
