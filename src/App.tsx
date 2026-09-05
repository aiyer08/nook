import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import './styles/global.css';
import { activeSector, sortedSectors, themeById, useDoc, useUI } from './lib/store';
import { readableOn } from './lib/themes';
import { Onboarding } from './components/Onboarding';
import { TopBar } from './components/TopBar';
import { Board } from './components/Board';
import { TodayView } from './components/TodayView';
import { AvatarPanel, SectorsPanel, SettingsPanel } from './components/Panels';
import { GardenPicker } from './components/Garden';
import { CalendarSyncPanel, useAutoSync } from './components/CalendarSync';
import { Confetti, Empty, Toasts } from './components/ui';
import { Icon } from './components/Icons';
import { COSMETICS } from './lib/cosmetics';
import { today } from './lib/dates';
import { play } from './lib/sound';

export default function App() {
  const doc = useDoc((s) => s.doc);
  const undo = useDoc((s) => s.undo);
  const redo = useDoc((s) => s.redo);
  const setActiveSector = useDoc((s) => s.setActiveSector);

  const panel = useUI((s) => s.panel);
  const setPanel = useUI((s) => s.setPanel);
  const todayOpen = useUI((s) => s.todayOpen);
  const setTodayOpen = useUI((s) => s.setTodayOpen);
  const setTool = useUI((s) => s.setTool);
  const celebrate = useUI((s) => s.celebrate);
  const toast = useUI((s) => s.toast);
  const setMood = useUI((s) => s.setMood);

  useAutoSync();

  const theme = themeById(doc.settings.themeId);
  const sectors = sortedSectors(doc.sectors);
  const turn = doc.settings.pageTurn && doc.settings.motion;
  const sector = activeSector(doc);
  const sectorIndex = sectors.findIndex((s) => s.id === sector?.id);
  // which way the page should slide in from
  const [prevIndex, setPrevIndex] = useState(sectorIndex);
  const direction = sectorIndex >= prevIndex ? 1 : -1;
  useEffect(() => { setPrevIndex(sectorIndex); }, [sectorIndex]);

  /* ---- paint the theme onto CSS variables ---- */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg', theme.bg);
    root.style.setProperty('--surface', theme.surface);
    root.style.setProperty('--ink', theme.text);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--muted', theme.muted);
    root.style.setProperty('--on-accent', readableOn(theme.accent));
    root.dataset.dark = theme.dark ? 'true' : 'false';
    document.body.dataset.texture = doc.settings.paperTexture ? 'true' : 'false';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.bg);
  }, [theme, doc.settings.paperTexture]);

  /* ---- warmer after 8pm, cooler again in the morning ---- */
  useEffect(() => {
    const layer = document.getElementById('tint-layer');
    if (!layer) return;
    const apply = () => {
      if (!doc.settings.timeTint) { layer.style.opacity = '0'; return; }
      const h = new Date().getHours() + new Date().getMinutes() / 60;
      // ramps up through the evening, holds overnight, fades by 7am
      let amount = 0;
      if (h >= 20) amount = Math.min(1, (h - 20) / 2.5) * 0.16;
      else if (h < 6) amount = 0.16;
      else if (h < 7.5) amount = (1 - (h - 6) / 1.5) * 0.16;
      layer.style.opacity = String(amount);
    };
    apply();
    const t = window.setInterval(apply, 60_000);
    return () => window.clearInterval(t);
  }, [doc.settings.timeTint]);

  /* ---- cosmetic unlocks ---- */
  const seenCount = useRef<number | null>(null);
  useEffect(() => {
    const before = seenCount.current;
    seenCount.current = doc.stats.completed;
    if (before === null || doc.stats.completed <= before) return;
    const earned = COSMETICS.filter(
      (c) => !c.season && c.id !== 'none' && c.unlockAt > before && c.unlockAt <= doc.stats.completed,
    );
    if (earned.length) {
      toast(`${doc.avatar.name} earned: ${earned.map((c) => c.name).join(', ')}!`, 'win');
      play('chime', doc.settings.sound);
      setMood('cheer', 3000);
    }
  }, [doc.stats.completed, doc.avatar.name, doc.settings.sound, toast, setMood]);

  /* ---- a sleepy friend when the day is done ---- */
  const openToday = useMemo(() => {
    const t = today();
    return doc.tasks.filter((x) => !x.done && !x.recurrence && x.createdOn <= t).length;
  }, [doc.tasks]);
  useEffect(() => {
    const h = new Date().getHours();
    if (openToday === 0 && (h >= 21 || h < 6)) setMood('sleepy', 60_000);
  }, [openToday, setMood]);

  /* ---- keyboard ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (/input|textarea|select/i.test(el.tagName) || el.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (typing || meta || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === 't') { e.preventDefault(); setTodayOpen(!todayOpen); }
      else if (k === 'v') setTool('select');
      else if (k === 'p') setTool('pen');
      else if (k === 'm') setTool('marker');
      else if (k === 'e') setTool('eraser');
      else if (k === 'n') { e.preventDefault(); setPanel('widgets'); }
      else if (k === 'escape') { setPanel(null); setTodayOpen(false); }
      else if (/^[1-9]$/.test(k)) {
        const target = sectors[Number(k) - 1];
        if (target) { setActiveSector(target.id); play('page', doc.settings.sound); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, todayOpen, setTodayOpen, setTool, setPanel, sectors, setActiveSector, doc.settings.sound]);

  if (!doc.onboarded) {
    return (
      <MotionConfig reducedMotion="user">
        <Onboarding />
        <Toasts />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <TopBar />

      <div
        style={{
          flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          perspective: turn ? 1600 : undefined,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {sector ? (
            <motion.div
              key={sector.id}
              /**
               * A page turn rather than a slide: the incoming page swings in
               * on the hinge you came from, so the direction you moved is
               * legible in the motion itself.
               */
              initial={turn
                ? { opacity: 0, rotateY: direction * -32, x: direction * 26 }
                : { opacity: 0, x: direction * 34 }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={turn
                ? { opacity: 0, rotateY: direction * 24, x: direction * -20 }
                : { opacity: 0, x: direction * -34 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
                transformOrigin: direction > 0 ? 'left center' : 'right center',
                transformStyle: turn ? 'preserve-3d' : undefined,
              }}
            >
              <Board sector={sector} />
            </motion.div>
          ) : (
            <div key="none" style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Empty icon="sparkle">No tabs yet. Make one and we’ll get going.</Empty>
                <button className="btn primary" onClick={() => setPanel('sectors')}>
                  <Icon name="plus" size={16} /> Add a tab
                </button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <GardenPicker open={panel === 'widgets'} onClose={() => setPanel(null)} />
      <SettingsPanel open={panel === 'settings'} onClose={() => setPanel(null)} />
      <AvatarPanel open={panel === 'avatar'} onClose={() => setPanel(null)} />
      <SectorsPanel open={panel === 'sectors'} onClose={() => setPanel(null)} />
      <CalendarSyncPanel open={panel === 'calendars'} onClose={() => setPanel(null)} />
      <TodayView open={todayOpen} onClose={() => setTodayOpen(false)} />

      <Confetti trigger={celebrate} enabled={doc.settings.confetti} />
      <Toasts />

    </div>
    </MotionConfig>
  );
}
