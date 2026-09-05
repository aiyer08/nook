/**
 * The mouse's burrow.
 *
 * "Nook" means a small cozy hiding place, so the mascot gets one: a hole in
 * the corner of the page they live in, come out of, tidy around, and nap in.
 * Three jobs, all of them cheap:
 *
 *  1. It's alive. A slow loop of peeking, pottering and sleeping, so the page
 *     is never completely still.
 *  2. It's a courier. Drag a task onto the mouse, switch tabs, and they carry
 *     it over — moving something between sectors becomes an errand rather than
 *     a menu.
 *  3. It hides. Once a day the burrow is empty because the mouse has tucked
 *     themselves behind one of your widgets. Find them, get a seed.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar } from './Avatar';
import { Icon } from './Icons';
import { useDoc, useUI, widgetsOf } from '../lib/store';
import { TASK_DRAG } from '../lib/dnd';
import { usePhone } from './ui';
import { today } from '../lib/dates';
import { play } from '../lib/sound';
import type { Widget } from '../lib/types';

type Phase = 'in' | 'peek' | 'out' | 'tidy' | 'nap';

/** How long each phase lasts, in seconds: [shortest, longest]. */
const DWELL: Record<Phase, [number, number]> = {
  in: [14, 40],
  peek: [4, 9],
  out: [8, 16],
  tidy: [7, 14],
  nap: [20, 50],
};

/** Where the loop can go next. Weighted by repetition, which is plenty random. */
const NEXT: Record<Phase, Phase[]> = {
  in: ['peek', 'peek', 'out'],
  peek: ['out', 'tidy', 'in'],
  out: ['tidy', 'nap', 'in', 'peek'],
  tidy: ['out', 'in', 'nap'],
  nap: ['peek', 'in'],
};

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function secondsIn([lo, hi]: [number, number]) {
  return (lo + Math.random() * (hi - lo)) * 1000;
}

export function Burrow() {
  const avatar = useDoc((s) => s.doc.avatar);
  const settings = useDoc((s) => s.doc.settings);
  const activeSectorId = useDoc((s) => s.doc.activeSectorId);
  const allWidgets = useDoc((s) => s.doc.widgets);
  const tasks = useDoc((s) => s.doc.tasks);
  const hide = useDoc((s) => s.doc.garden.hide);
  const foundOn = useDoc((s) => s.doc.garden.foundOn);
  const carryTask = useDoc((s) => s.carryTask);
  const hideMouse = useDoc((s) => s.hideMouse);

  const carrying = useUI((s) => s.carrying);
  const setCarrying = useUI((s) => s.setCarrying);
  const toast = useUI((s) => s.toast);
  const setMood = useUI((s) => s.setMood);
  const setPanel = useUI((s) => s.setPanel);

  const phone = usePhone();
  const [phase, setPhase] = useState<Phase>('peek');
  const [hovered, setHovered] = useState(false);
  const [droppable, setDroppable] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const t = today();
  const hiding = Boolean(hide && hide.date === t && !hide.found);
  const carried = useMemo(() => tasks.find((x) => x.id === carrying) ?? null, [tasks, carrying]);

  /* ---- the idle loop ---- */
  useEffect(() => {
    if (!settings.burrow || hiding) return;
    const step = () => {
      setPhase((p) => pick(NEXT[p]));
    };
    timer.current = window.setTimeout(step, secondsIn(DWELL[phase]));
    return () => window.clearTimeout(timer.current);
  }, [phase, settings.burrow, hiding]);

  /* Holding something keeps them out and awake — you can see they've got it. */
  useEffect(() => {
    if (carrying) setPhase('out');
  }, [carrying]);

  /* ---- one hiding place a day ---- */
  const widgets = useMemo(() => widgetsOf(allWidgets, activeSectorId), [allWidgets, activeSectorId]);
  useEffect(() => {
    if (!settings.burrow) return;
    if (hide && hide.date === t) return;           // already hidden (or found) today
    if (widgets.length < 2) return;                // nowhere convincing to hide
    hideMouse(pick(widgets).id);
  }, [settings.burrow, hide, t, widgets, hideMouse]);

  /* ---- the delivery round ---- */
  const lastSector = useRef(activeSectorId);
  useEffect(() => {
    const from = lastSector.current;
    lastSector.current = activeSectorId;
    if (!carrying || !activeSectorId || activeSectorId === from) return;
    const task = tasks.find((x) => x.id === carrying);
    if (!task) { setCarrying(null); return; }
    if (task.sectorId === activeSectorId) return;
    if (carryTask(carrying, activeSectorId)) {
      setCarrying(null);
      setPhase('out');
      setMood('cheer', 2200);
      play('pop', settings.sound);
      toast(`${avatar.name} carried “${task.title}” over.`, 'win');
    }
  }, [activeSectorId, carrying, tasks, carryTask, setCarrying, setMood, toast, avatar.name, settings.sound]);

  const say = useCallback((line: string) => {
    setSaid(line);
    window.setTimeout(() => setSaid((cur) => (cur === line ? null : cur)), 3400);
  }, []);

  /*
    Not on a phone. It's a fixed 90px mound in the bottom-left corner, which
    on a laptop is charming and on a 390px screen sits on top of whatever card
    is down there. The mouse is still in the top bar, and a task's own detail
    still has "give it to them" for the courier trick.
  */
  if (!settings.burrow || phone) return null;

  const mood = phase === 'nap' ? 'sleepy' : hovered || carrying ? 'happy' : 'idle';
  // how far down the hole they are
  const dip = hiding ? 46 : phase === 'in' ? 40 : phase === 'peek' ? 22 : phase === 'nap' ? 16 : 0;
  const foundToday = hide?.date === t && hide.found;

  const line = hiding
    ? `The burrow is empty. ${avatar.name} is hiding behind something…`
    : carried
      ? `Holding “${carried.title}” — open another tab and they'll take it there.`
      : phase === 'nap'
        ? `${avatar.name} is asleep. Shh.`
        : phase === 'tidy'
          ? `${avatar.name} is tidying up.`
          : phase === 'in'
            ? `${avatar.name} is inside, pottering about.`
            : `${avatar.name} is out. Drag a task here to have it carried.`;

  return (
    <div
      style={{
        position: 'fixed',
        left: 14,
        // clear of the home indicator on a laptop with a touch bar, and on iPads
        bottom: 'calc(8px + var(--safe-bottom))',
        zIndex: 26,
        width: 118, height: 96, pointerEvents: 'none',
      }}
    >
      {/* what they're up to, on hover or after a poke */}
      <AnimatePresence>
        {(hovered || said || droppable) && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            style={{
              position: 'absolute', left: 8, bottom: 88, width: 208,
              padding: '8px 11px', borderRadius: 'var(--r)',
              border: '3px solid var(--line)', background: 'var(--surface)',
              boxShadow: 'var(--shadow-md)', fontSize: 12, lineHeight: 1.35,
              pointerEvents: 'none',
            }}
          >
            {droppable ? `Drop it — ${avatar.name} will carry it.` : said ?? line}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        role="button"
        tabIndex={0}
        aria-label={hiding ? 'The burrow is empty' : `${avatar.name}'s burrow`}
        title={line}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={() => {
          if (hiding) { say('Have a look behind your widgets.'); return; }
          if (carried) { say('Switch tabs and it goes with them.'); return; }
          setPhase((p) => (p === 'nap' ? 'peek' : p === 'out' ? 'tidy' : 'out'));
          play('tick', settings.sound);
          setPanel('garden');
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') (e.target as HTMLElement).click(); }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(TASK_DRAG)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setDroppable(true);
        }}
        onDragLeave={() => setDroppable(false)}
        onDrop={(e) => {
          const id = e.dataTransfer.getData(TASK_DRAG);
          setDroppable(false);
          if (!id) return;
          e.preventDefault();
          setCarrying(id);
          setPhase('out');
          play('pop', settings.sound);
          const task = tasks.find((x) => x.id === id);
          say(task ? `Got “${task.title}”. Where to?` : 'Got it. Where to?');
        }}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'auto',
          cursor: hiding ? 'help' : 'pointer',
        }}
      >
        {/* the mouse, clipped by the hole */}
        <div
          style={{
            position: 'absolute', left: 27, bottom: 16, width: 64, height: 62,
            overflow: 'hidden', pointerEvents: 'none',
          }}
        >
          <motion.div
            animate={{ y: dip, x: phase === 'tidy' ? [0, -5, 4, 0] : 0 }}
            transition={{
              y: { type: 'spring', stiffness: 220, damping: 24 },
              x: { duration: 5, repeat: phase === 'tidy' ? Infinity : 0, ease: 'easeInOut' },
            }}
            style={{ position: 'absolute', left: -2, bottom: -34 }}
          >
            <Avatar
              species={avatar.species}
              color={avatar.color}
              hat={avatar.hat}
              accessory={avatar.accessory}
              mood={mood}
              size={68}
              animate={settings.motion}
            />
          </motion.div>
        </div>

        {/* the parcel in their paws */}
        <AnimatePresence>
          {carried && (
            <motion.div
              initial={{ opacity: 0, y: 8, rotate: -12 }}
              animate={{ opacity: 1, y: 0, rotate: [-4, 4, -4] }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ rotate: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } }}
              style={{ position: 'absolute', left: 58, bottom: 36, pointerEvents: 'none' }}
            >
              <span
                style={{
                  display: 'block', width: 26, height: 20, borderRadius: 4,
                  border: '2.5px solid var(--line)', background: 'var(--surface)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* the hole itself, in front of them */}
        <svg
          width={118}
          height={96}
          viewBox="0 0 118 96"
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          {/* the mound of earth */}
          <path
            d="M6 80 C14 52 36 40 59 40 C82 40 104 52 112 80 Z"
            fill="color-mix(in srgb, var(--line) 34%, var(--surface))"
            stroke="var(--line)"
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {/* the opening */}
          <path
            d="M36 80 C36 58 44 50 59 50 C74 50 82 58 82 80 Z"
            fill={droppable ? 'var(--accent)' : 'color-mix(in srgb, var(--ink) 62%, var(--surface))'}
            stroke="var(--line)"
            strokeWidth={3}
            strokeLinejoin="round"
          />
          {/* grass, so it reads as ground rather than a stain */}
          <path
            d="M14 79 l3-9 M20 79 l1-7 M98 79 l-3-9 M104 79 l-1-7"
            stroke="#8FA97C"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
          />
          {foundToday && (
            <g transform="translate(96 34)">
              <circle r={11} fill="var(--surface)" stroke="var(--line)" strokeWidth={2.5} />
              <text
                y={4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--ink)"
                fontFamily="Quicksand, system-ui, sans-serif"
              >
                ★
              </text>
            </g>
          )}
        </svg>

        {/* found-me sticker count, so the habit has something to show */}
        {foundOn.length > 0 && (
          <span
            style={{
              position: 'absolute', right: -2, top: 2, fontSize: 10.5, fontWeight: 700,
              padding: '1px 6px', borderRadius: 999, border: '2px solid var(--line)',
              background: 'var(--surface)', color: 'var(--ink-soft)', pointerEvents: 'none',
            }}
            title={`Found ${foundOn.length} time${foundOn.length === 1 ? '' : 's'}`}
          >
            ★ {foundOn.length}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The tail sticking out from behind a widget. Rendered by the board so it can
 * sit in board coordinates, just behind the card it's hiding behind.
 */
export function HiddenMouse({ widget }: { widget: Widget }) {
  const avatar = useDoc((s) => s.doc.avatar);
  const settings = useDoc((s) => s.doc.settings);
  const findMouse = useDoc((s) => s.findMouse);
  const toast = useUI((s) => s.toast);
  const cheer = useUI((s) => s.cheer);
  const setMood = useUI((s) => s.setMood);

  const [caught, setCaught] = useState(false);

  const grab = () => {
    if (caught) return;
    setCaught(true);
    findMouse();
    play('chime', settings.sound);
    if (settings.confetti) cheer();
    setMood('cheer', 2600);
    toast(`Found ${avatar.name}! A sticker and a seed for you.`, 'win');
  };

  return (
    <motion.button
      onClick={grab}
      aria-label={`Something is hiding behind ${widget.title}`}
      title="Something is hiding here…"
      initial={{ opacity: 0 }}
      animate={caught
        ? { opacity: 1, x: 22, y: -8, rotate: 8 }
        : { opacity: 1, x: [0, 4, 0], rotate: [0, -3, 0] }}
      transition={caught
        ? { type: 'spring', stiffness: 260, damping: 20 }
        : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        // just off the widget's right edge, a little above the bottom
        left: widget.x + widget.w - 10,
        top: widget.y + Math.max(30, widget.h - 54),
        // behind the card, so only what pokes out is visible
        zIndex: Math.max(0, widget.z - 1),
        padding: 0, border: 'none', background: 'none', cursor: 'pointer',
      }}
    >
      {caught ? (
        <Avatar
          species={avatar.species}
          color={avatar.color}
          hat={avatar.hat}
          accessory={avatar.accessory}
          mood="cheer"
          size={54}
          animate={settings.motion}
        />
      ) : (
        <svg width={44} height={30} viewBox="0 0 44 30" aria-hidden="true" style={{ display: 'block' }}>
          {/* a tail and one paw: enough to notice, not enough to give it away */}
          <path
            d="M4 20 C16 20 24 14 30 6"
            stroke="var(--line)"
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M4 20 C16 20 24 14 30 6"
            stroke={avatar.color}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx={9} cy={25} rx={7} ry={4.5} fill={avatar.color} stroke="var(--line)" strokeWidth={2.5} />
        </svg>
      )}
    </motion.button>
  );
}

/** A tiny "look behind things" nudge, used by the garden page. */
export function HideHint() {
  const hide = useDoc((s) => s.doc.garden.hide);
  const avatar = useDoc((s) => s.doc.avatar);
  const t = today();
  if (!hide || hide.date !== t) return null;
  return (
    <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--ink-soft)', display: 'flex', gap: 7 }}>
      <Icon name={hide.found ? 'star' : 'search'} size={14} color="var(--ink-faint)" />
      {hide.found
        ? `You found ${avatar.name} today. Come back tomorrow.`
        : `${avatar.name} is hiding behind one of your widgets today.`}
    </p>
  );
}
