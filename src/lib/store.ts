import { create } from 'zustand';
import type {
  AvatarState, CalendarLink, CellValue, CollectionItem, Contact, Decoration, Doc, EventItem,
  FieldDef, Goal, GoogleState, ID, Material, Sector, Settings, Stroke, Subtask, Task, Widget,
  WidgetType,
} from './types';
import { uid } from './id';
import { PASTELS, THEMES } from './themes';
import { addDays, seasonOf, today, toDateStr } from './dates';
import { unlockedIds } from './cosmetics';
import { nextPlot, seedsDue } from './growth';
import { moveWidgetTo } from './move';
import type { Weather } from './weather';

const STORAGE_KEY = 'nook.doc.v2';
const HISTORY_LIMIT = 80;
export const GRID = 20;

/* ------------------------------------------------------------------ */
/* defaults                                                            */
/* ------------------------------------------------------------------ */

const defaultSettings: Settings = {
  themeId: 'paper',
  penTexture: 'fineliner',
  wobble: true,
  pageTurn: true,
  sound: false, // unexpected sound makes people close apps
  timeTint: true,
  paperTexture: true,
  motion: true,
  confetti: true,
  weather: false,   // needs a location, so it's opt-in
  place: null,
  ambient: 'off',   // unexpected sound makes people close apps
  ambientVolume: 0.5,
  lampGlow: true,
  burrow: true,
};

/**
 * The OAuth client id can be baked in at build time, but it's also editable in
 * the app — it's a public identifier, not a secret, and typing it in beats
 * redeploying to change it.
 */
const defaultGoogle: GoogleState = {
  clientId: (import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '',
  links: [],
  pendingDeletes: [],
  autoSync: true,
};

const defaultAvatar: AvatarState = {
  species: 'bunny',
  name: 'Mochi',
  color: '#F6E3E8',
  hat: 'none',
  accessory: 'blush',
  decor: [],
};

export function emptyDoc(): Doc {
  return {
    version: 2,
    onboarded: false,
    avatar: defaultAvatar,
    sectors: [],
    activeSectorId: null,
    widgets: [],
    tasks: [],
    events: [],
    goals: [],
    contacts: [],
    strokes: [],
    decorations: [],
    items: [],
    materials: [],
    settings: defaultSettings,
    stats: {
      completed: 0, streak: 0, lastActiveDate: null, unlocked: [], seen: [],
      focusMinutes: 0, bestStreak: 0,
    },
    garden: { seeds: 0, countedCompletions: 0, plants: [], picks: {}, hide: null, foundOn: [] },
    google: { ...defaultGoogle },
  };
}

export const WIDGET_DEFAULTS: Record<
  WidgetType,
  { title: string; w: number; h: number; label: string; blurb: string }
> = {
  todo:     { title: 'To-do',          w: 340, h: 360, label: 'To-do',          blurb: 'Floating tasks roll over, dated ones stay put.' },
  goals:    { title: 'Goals',          w: 340, h: 320, label: 'Goals',          blurb: 'Track progress toward something bigger.' },
  calendar: { title: 'Calendar',       w: 400, h: 400, label: 'Calendar',       blurb: 'A month at a glance.' },
  meetings: { title: 'Meetings',       w: 340, h: 320, label: 'Meetings',       blurb: 'Who, when, where, and the link.' },
  contacts: { title: 'People',         w: 320, h: 320, label: 'People',         blurb: 'The humans in this part of life.' },
  dates:    { title: 'Important dates',w: 320, h: 300, label: 'Important dates',blurb: 'Birthdays and anniversaries, yearly if you like.' },
  notes:    { title: 'Notes',          w: 340, h: 300, label: 'Notes',          blurb: 'A plain page to think on.' },
  link:     { title: 'Links',          w: 340, h: 320, label: 'Links',          blurb: 'Paste a URL, get a preview card.' },
  image:    { title: 'Image',          w: 320, h: 300, label: 'Image',          blurb: 'Upload, paste, or drop a picture.' },
  embed:    { title: 'Embed',          w: 380, h: 300, label: 'Embed',          blurb: 'YouTube, Spotify, Maps, Figma.' },
  habits:   { title: 'Habits',         w: 340, h: 300, label: 'Habits',         blurb: 'Recurring things, with a streak.' },
  quote:    { title: 'A note to self', w: 300, h: 200, label: 'Note to self',   blurb: 'One line, in handwriting.' },

  /* one engine, four lenses — most list-shaped pages are a preset of this */
  collection: { title: 'Collection', w: 520, h: 420, label: 'Collection', blurb: 'Any list, seen as a table, board, calendar or gallery.' },

  /* one record per day, drawn several ways */
  tracker:  { title: 'Tracker',        w: 400, h: 300, label: 'Tracker',       blurb: 'Habit grid, year in pixels, mood, sleep, weather.' },

  /* the bullet-journal spreads */
  spread:   { title: 'Spread',         w: 460, h: 420, label: 'Spread',        blurb: 'Future log, monthly, weekly, daily or time-blocked.' },

  /* bespoke shapes */
  papers:   { title: 'Papers to read', w: 400, h: 380, label: 'Papers to read',blurb: 'Paste a DOI or arXiv link; it fills itself in.' },
  followups:{ title: 'Follow up on',   w: 380, h: 340, label: 'Follow-ups',    blurb: 'Emails waiting on them, or waiting on you.' },
  journal:  { title: 'Daily journal',  w: 400, h: 420, label: 'Journal',       blurb: 'The same few questions, every day.' },
  countdown:{ title: 'Countdown',      w: 300, h: 200, label: 'Countdown',     blurb: 'Days until something big.' },
  thermometer:{ title: 'Goal',         w: 280, h: 320, label: 'Thermometer',   blurb: 'A jar that fills up. Savings, debt, anything.' },
  wheel:    { title: 'Level 10 life',  w: 360, h: 380, label: 'Life wheel',    blurb: 'Score each part of life one to ten.' },
  materials:{ title: 'Materials',      w: 340, h: 340, label: 'Materials locker', blurb: 'Resumes, statements and essays, kept once.' },
};

function initialData(type: WidgetType): Widget['data'] {
  switch (type) {
    case 'notes': return { content: '' };
    case 'link': return { links: [] };
    case 'image': return { src: '', caption: '', fit: 'cover' };
    case 'embed': return { url: '' };
    case 'todo': return { effortFilter: 'all', hideCompleted: false };
    case 'calendar': return { monthCursor: today().slice(0, 7) };
    case 'quote': return { text: 'You are allowed to do this slowly.', author: '' };
    case 'collection': return { view: 'table', fields: [], sortDir: 'asc' };
    case 'tracker': return { mode: 'grid', days: {}, weeks: 26 };
    case 'spread': return { range: 'week', cursor: today(), dayStart: 7, dayEnd: 22 };
    case 'papers': return { papers: [] };
    case 'followups': return { followups: [] };
    case 'journal': return {
      prompts: [
        'How was today, in a few lines?',
        'One thing you are proud of',
        'One thing to do differently',
        'What got done',
        'Anything you want to remember',
      ],
      entries: {},
    };
    case 'countdown': return { targetDate: undefined };
    case 'thermometer': return { goalAmount: 1000, currentAmount: 0, unit: '$', countDown: false };
    case 'wheel': return { spokes: [] };
    case 'materials': return {};
    default: return {};
  }
}

const TAPES: Widget['tape'][] = ['left', 'right', 'both', 'corner', 'none'];

function makeWidget(sectorId: ID, type: WidgetType, x: number, y: number, z: number): Widget {
  const d = WIDGET_DEFAULTS[type];
  return {
    id: uid(),
    sectorId,
    type,
    title: d.title,
    x, y, w: d.w, h: d.h, z,
    // a hair of tilt reads as "placed by hand" rather than "laid out by a grid"
    rotation: (Math.random() * 1.6 - 0.8),
    tape: TAPES[Math.floor(Math.random() * TAPES.length)],
    data: initialData(type),
  };
}

/** Find the first free spot, scanning left-to-right then down. */
function nextSlot(widgets: Widget[], w: number, h: number) {
  const pad = 24;
  const step = GRID;
  const gap = 16;
  const maxRight = Math.max(
    w + pad * 2,
    (typeof window !== 'undefined' ? window.innerWidth : 1440) - pad,
  );
  const clashes = (x: number, y: number) =>
    widgets.some(
      (b) => x < b.x + b.w + gap && x + w + gap > b.x && y < b.y + b.h + gap && y + h + gap > b.y,
    );
  for (let y = pad; y < 6000; y += step) {
    for (let x = pad; x + w <= maxRight; x += step) {
      if (!clashes(x, y)) return { x, y };
    }
  }
  return { x: pad, y: pad };
}

function starterWidgets(sectorId: ID, index: number): Widget[] {
  const plan: WidgetType[][] = [
    ['todo', 'calendar', 'notes'],
    ['todo', 'goals', 'quote'],
    ['todo', 'dates', 'notes'],
  ];
  const types = plan[index % plan.length];
  const out: Widget[] = [];
  types.forEach((t, i) => {
    const spot = nextSlot(out, WIDGET_DEFAULTS[t].w, WIDGET_DEFAULTS[t].h);
    out.push(makeWidget(sectorId, t, spot.x, spot.y, i + 1));
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* persistence                                                         */
/* ------------------------------------------------------------------ */

function loadDoc(): Doc | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Doc;
    if (!parsed || typeof parsed !== 'object') return null;
    // fill in anything a newer version added
    return {
      ...emptyDoc(),
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
      avatar: { ...defaultAvatar, ...(parsed.avatar ?? {}) },
      stats: { ...emptyDoc().stats, ...(parsed.stats ?? {}) },
      decorations: parsed.decorations ?? [],
      items: parsed.items ?? [],
      materials: parsed.materials ?? [],
      garden: { ...emptyDoc().garden, ...(parsed.garden ?? {}) },
      google: {
        ...defaultGoogle,
        ...(parsed.google ?? {}),
        // a build-time id wins only when nothing has been typed in
        clientId: parsed.google?.clientId || defaultGoogle.clientId,
      },
    };
  } catch {
    return null;
  }
}

let saveTimer: number | undefined;
let lastSaveFailed = false;

function saveDoc(doc: Doc) {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
      lastSaveFailed = false;
    } catch {
      if (!lastSaveFailed) {
        lastSaveFailed = true;
        useUI.getState().toast(
          "Your board is too full to save — try smaller images.",
          'warn',
        );
      }
    }
  }, 250);
}

export function storageUsed(): number {
  try {
    return (localStorage.getItem(STORAGE_KEY) ?? '').length;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* transient UI store (never persisted, never undone)                  */
/* ------------------------------------------------------------------ */

export type Tool = 'select' | 'pen' | 'marker' | 'eraser';

interface Toast {
  id: string;
  message: string;
  kind: 'info' | 'warn' | 'win';
}

/**
 * A cozy focus session. Transient on purpose: if the tab closes mid-session
 * the seedling it planted simply stays a sprout, which is exactly the rule.
 */
export interface FocusSession {
  /** the widget you're working in; everything else dims */
  widgetId: ID;
  minutes: number;
  /** epoch ms when it ends */
  endsAt: number;
  /** the seedling planted for the duration */
  plantId: ID;
}

interface UIState {
  tool: Tool;
  penColor: string;
  penWidth: number;
  todayOpen: boolean;
  panel: null | 'settings' | 'avatar' | 'widgets' | 'sectors' | 'calendars' | 'garden' | 'wrapped';
  selectedWidget: ID | null;
  dragging: boolean;
  /** arranging tape and stickers: the decor layer comes to the front */
  decorating: boolean;
  toasts: Toast[];
  /** a task in the mouse's paws, waiting to be carried to another tab */
  carrying: ID | null;
  /** the weather outside, fetched once and shared. Never persisted with the doc. */
  sky: Weather | null;
  /** a cozy focus session, if one is running */
  focus: FocusSession | null;
  celebrate: number;      // bumps to fire confetti
  avatarMood: 'idle' | 'happy' | 'cheer' | 'sleepy' | 'stretch';
  moodUntil: number;
  setTool: (t: Tool) => void;
  setPen: (color: string, width: number) => void;
  setTodayOpen: (v: boolean) => void;
  setPanel: (p: UIState['panel']) => void;
  select: (id: ID | null) => void;
  setDragging: (v: boolean) => void;
  setDecorating: (v: boolean) => void;
  setCarrying: (id: ID | null) => void;
  setSky: (w: Weather | null) => void;
  setFocus: (f: FocusSession | null) => void;
  toast: (message: string, kind?: Toast['kind']) => void;
  dismiss: (id: string) => void;
  cheer: () => void;
  setMood: (m: UIState['avatarMood'], ms?: number) => void;
}

export const useUI = create<UIState>((set, get) => ({
  tool: 'select',
  penColor: '#E8A598',
  penWidth: 4,
  todayOpen: false,
  panel: null,
  selectedWidget: null,
  dragging: false,
  decorating: false,
  toasts: [],
  carrying: null,
  sky: null,
  focus: null,
  celebrate: 0,
  avatarMood: 'idle',
  moodUntil: 0,
  setTool: (tool) => set({ tool }),
  setPen: (penColor, penWidth) => set({ penColor, penWidth }),
  setTodayOpen: (todayOpen) => set({ todayOpen }),
  setPanel: (panel) => set({ panel }),
  select: (selectedWidget) => set({ selectedWidget }),
  setDragging: (dragging) => set({ dragging }),
  setDecorating: (decorating) => set({ decorating }),
  setCarrying: (carrying) => set({ carrying }),
  setSky: (sky) => set({ sky }),
  setFocus: (focus) => set({ focus }),
  toast: (message, kind = 'info') => {
    const id = uid();
    set({ toasts: [...get().toasts, { id, message, kind }] });
    window.setTimeout(() => get().dismiss(id), 4200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  cheer: () => set({ celebrate: get().celebrate + 1 }),
  setMood: (avatarMood, ms = 2400) => {
    set({ avatarMood, moodUntil: Date.now() + ms });
    window.setTimeout(() => {
      if (Date.now() >= useUI.getState().moodUntil) set({ avatarMood: 'idle' });
    }, ms + 20);
  },
}));

/* ------------------------------------------------------------------ */
/* main document store                                                 */
/* ------------------------------------------------------------------ */

interface DocState {
  doc: Doc;
  past: { doc: Doc; label: string }[];
  future: { doc: Doc; label: string }[];
  lastLabel: string | null;

  commit: (label: string, fn: (d: Doc) => void, opts?: { merge?: boolean; key?: string }) => void;
  quiet: (fn: (d: Doc) => void) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  /* onboarding */
  finishOnboarding: (avatar: AvatarState, sectors: { name: string; accent: string; icon: string }[], themeId: string) => void;

  /* sectors */
  addSector: (name: string, accent: string, icon: string) => ID;
  updateSector: (id: ID, patch: Partial<Sector>) => void;
  removeSector: (id: ID) => void;
  moveSector: (id: ID, delta: number) => void;
  setActiveSector: (id: ID) => void;

  /* widgets */
  addWidget: (sectorId: ID, type: WidgetType) => ID;
  updateWidget: (id: ID, patch: Partial<Widget>) => void;
  patchWidgetData: (id: ID, patch: Partial<Widget['data']>) => void;
  placeWidget: (id: ID, x: number, y: number, w?: number, h?: number) => void;
  removeWidget: (id: ID) => void;
  /** send a widget, and everything filed in it, to another tab */
  moveWidgetToSector: (id: ID, sectorId: ID) => boolean;
  duplicateWidget: (id: ID) => void;
  raiseWidget: (id: ID) => void;

  /* tasks */
  addTask: (t: Partial<Task> & { widgetId: ID; sectorId: ID; title: string }) => ID;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  toggleTask: (id: ID, date: string) => void;
  removeTask: (id: ID) => void;
  moveTask: (id: ID, delta: number) => void;
  addSubtask: (taskId: ID, title: string) => void;
  /** hand a task to another tab: the mouse's delivery round */
  carryTask: (taskId: ID, toSectorId: ID) => boolean;
  updateSubtask: (taskId: ID, subId: ID, patch: Partial<Subtask>) => void;
  removeSubtask: (taskId: ID, subId: ID) => void;

  /* events */
  addEvent: (e: Omit<EventItem, 'id'>) => ID;
  updateEvent: (id: ID, patch: Partial<EventItem>) => void;
  removeEvent: (id: ID) => void;

  /* goals */
  addGoal: (g: Omit<Goal, 'id'>) => ID;
  updateGoal: (id: ID, patch: Partial<Goal>) => void;
  removeGoal: (id: ID) => void;

  /* contacts */
  addContact: (c: Omit<Contact, 'id'>) => ID;
  updateContact: (id: ID, patch: Partial<Contact>) => void;
  removeContact: (id: ID) => void;

  /* doodles */
  addStroke: (s: Stroke) => void;
  eraseStrokes: (ids: ID[]) => void;
  clearStrokes: (sectorId: ID) => void;

  /* decorations */
  addDecoration: (d: Omit<Decoration, 'id'>) => ID;
  moveDecoration: (id: ID, x: number, y: number) => void;
  updateDecoration: (id: ID, patch: Partial<Decoration>) => void;
  removeDecoration: (id: ID) => void;

  /* collections */
  addItem: (widgetId: ID, sectorId: ID, values?: Record<ID, CellValue>) => ID;
  updateItem: (id: ID, patch: Partial<CollectionItem>) => void;
  setCell: (id: ID, fieldId: ID, value: CellValue) => void;
  removeItem: (id: ID) => void;
  moveItem: (id: ID, delta: number) => void;
  duplicateItem: (id: ID) => void;
  /** the "you've moved this three times" reckoning */
  migrateItem: (id: ID) => void;
  releaseItem: (id: ID) => void;
  addItemStep: (id: ID, title: string) => void;
  toggleItemStep: (id: ID, stepId: ID) => void;
  removeItemStep: (id: ID, stepId: ID) => void;
  attachMaterial: (itemId: ID, materialId: ID) => void;
  threadItems: (fromId: ID, toId: ID) => void;

  /* collection schema */
  setFields: (widgetId: ID, fields: FieldDef[]) => void;
  addField: (widgetId: ID, field: FieldDef) => void;
  removeField: (widgetId: ID, fieldId: ID) => void;

  /* materials locker */
  addMaterial: (m: Omit<Material, 'id'>) => ID;
  updateMaterial: (id: ID, patch: Partial<Material>) => void;
  removeMaterial: (id: ID) => void;

  /* google calendar */
  setGoogleClientId: (id: string) => void;
  setGoogleAccount: (email: string | undefined) => void;
  linkCalendar: (link: CalendarLink) => void;
  updateLink: (calendarId: string, patch: Partial<CalendarLink>) => void;
  unlinkCalendar: (calendarId: string, opts: { keepEvents: boolean }) => void;
  disconnectGoogle: (opts: { keepEvents: boolean }) => void;
  setAutoSync: (v: boolean) => void;

  /* settings + avatar */
  /* the garden that grows from what you did */
  notePick: (flowerId: string) => void;
  plantSeed: (flowerId: string, from?: string) => boolean;
  waterPlant: (id: ID) => void;
  sowSeedling: (flowerId: string, from: string) => ID;
  finishSeedling: (id: ID, minutes: number) => void;
  /* the mouse's daily hiding place */
  hideMouse: (widgetId: ID) => void;
  findMouse: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  updateAvatar: (patch: Partial<AvatarState>) => void;

  /* data */
  importDoc: (doc: Doc) => void;
  resetAll: () => void;
}

function clone<T>(v: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(v)
    : (JSON.parse(JSON.stringify(v)) as T);
}

export const useDoc = create<DocState>((set, get) => ({
  doc: loadDoc() ?? emptyDoc(),
  past: [],
  future: [],
  lastLabel: null,

  /**
   * Every change goes through here. It snapshots the document first so undo is
   * a single step back, and `merge` lets rapid changes (dragging, typing)
   * collapse into one history entry instead of eighty.
   *
   * `key` scopes that merging. Typing into two different tasks shares the label
   * "edit task" but must stay two undo steps, so the key carries the id.
   */
  commit: (label, fn, opts) => {
    const { doc, past, lastLabel } = get();
    const next = clone(doc);
    fn(next);
    const key = opts?.key ?? label;
    const merging = opts?.merge && lastLabel === key && past.length > 0;
    const nextPast = merging ? past : [...past, { doc, label }].slice(-HISTORY_LIMIT);
    set({ doc: next, past: nextPast, future: [], lastLabel: key });
    saveDoc(next);
  },

  quiet: (fn) => {
    const next = clone(get().doc);
    fn(next);
    set({ doc: next });
    saveDoc(next);
  },

  undo: () => {
    const { past, future, doc } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({
      doc: prev.doc,
      past: past.slice(0, -1),
      future: [{ doc, label: prev.label }, ...future].slice(0, HISTORY_LIMIT),
      lastLabel: null,
    });
    saveDoc(prev.doc);
    useUI.getState().toast(`Undid ${prev.label}`);
  },

  redo: () => {
    const { past, future, doc } = get();
    const nextEntry = future[0];
    if (!nextEntry) return;
    set({
      doc: nextEntry.doc,
      past: [...past, { doc, label: nextEntry.label }].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      lastLabel: null,
    });
    saveDoc(nextEntry.doc);
    useUI.getState().toast(`Redid ${nextEntry.label}`);
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  finishOnboarding: (avatar, sectors, themeId) => {
    get().commit('setup', (d) => {
      d.onboarded = true;
      d.avatar = avatar;
      d.settings.themeId = themeId;
      d.sectors = sectors.map((s, i) => ({
        id: uid(), name: s.name, accent: s.accent, icon: s.icon, order: i, snap: true,
      }));
      d.activeSectorId = d.sectors[0]?.id ?? null;
      d.widgets = d.sectors.flatMap((s, i) => starterWidgets(s.id, i));
      d.stats.unlocked = unlockedIds(0, seasonOf());
    });
  },

  addSector: (name, accent, icon) => {
    const id = uid();
    get().commit('add tab', (d) => {
      d.sectors.push({ id, name, accent, icon, order: d.sectors.length, snap: true });
      d.widgets.push(...starterWidgets(id, d.sectors.length - 1));
      d.activeSectorId = id;
    });
    return id;
  },

  updateSector: (id, patch) =>
    get().commit('edit tab', (d) => {
      const s = d.sectors.find((x) => x.id === id);
      if (s) Object.assign(s, patch);
    }, { merge: true, key: `tab:${id}` }),

  removeSector: (id) =>
    get().commit('delete tab', (d) => {
      // same as removing a widget: local only, Google keeps its events
      const dropped = new Set(d.widgets.filter((w) => w.sectorId === id).map((w) => w.id));
      d.google.links = d.google.links.filter((l) => !dropped.has(l.widgetId));
      d.sectors = d.sectors.filter((s) => s.id !== id);
      d.widgets = d.widgets.filter((w) => w.sectorId !== id);
      d.tasks = d.tasks.filter((t) => t.sectorId !== id);
      d.events = d.events.filter((e) => e.sectorId !== id);
      d.goals = d.goals.filter((g) => g.sectorId !== id);
      d.contacts = d.contacts.filter((c) => c.sectorId !== id);
      d.items = d.items.filter((i) => i.sectorId !== id);
      d.decorations = d.decorations.filter((x) => x.sectorId !== id);
      d.strokes = d.strokes.filter((s) => s.sectorId !== id);
      if (d.activeSectorId === id) d.activeSectorId = d.sectors[0]?.id ?? null;
    }),

  moveSector: (id, delta) =>
    get().commit('reorder tabs', (d) => {
      const sorted = [...d.sectors].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((s) => s.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= sorted.length) return;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      sorted.forEach((s, k) => {
        const target = d.sectors.find((x) => x.id === s.id);
        if (target) target.order = k;
      });
    }),

  setActiveSector: (id) => get().quiet((d) => { d.activeSectorId = id; }),

  addWidget: (sectorId, type) => {
    const id = uid();
    get().commit(`add ${WIDGET_DEFAULTS[type].label.toLowerCase()}`, (d) => {
      const mine = d.widgets.filter((w) => w.sectorId === sectorId);
      const def = WIDGET_DEFAULTS[type];
      const spot = nextSlot(mine, def.w, def.h);
      const maxZ = mine.reduce((m, w) => Math.max(m, w.z), 0);
      const w = makeWidget(sectorId, type, spot.x, spot.y, maxZ + 1);
      w.id = id;
      d.widgets.push(w);
    });
    return id;
  },

  updateWidget: (id, patch) =>
    get().commit('edit widget', (d) => {
      const w = d.widgets.find((x) => x.id === id);
      if (w) Object.assign(w, patch);
    }, { merge: true, key: `widget:${id}` }),

  patchWidgetData: (id, patch) =>
    get().commit('edit widget', (d) => {
      const w = d.widgets.find((x) => x.id === id);
      if (w) w.data = { ...w.data, ...patch };
    }, { merge: true, key: `widget-data:${id}` }),

  placeWidget: (id, x, y, w, h) =>
    get().commit('move widget', (d) => {
      const t = d.widgets.find((x2) => x2.id === id);
      if (!t) return;
      t.x = x; t.y = y;
      if (w != null) t.w = w;
      if (h != null) t.h = h;
    }, { merge: true, key: `place:${id}` }),

  /**
   * Note what this does *not* do: throwing away a widget full of synced events
   * removes them from Nook and cuts the calendar link, but leaves Google
   * untouched. Tidying your board should never empty your real calendar.
   */
  moveWidgetToSector: (id, sectorId) => {
    const { doc } = get();
    const widget = doc.widgets.find((w) => w.id === id);
    if (!widget || widget.sectorId === sectorId) return false;
    if (!doc.sectors.some((s) => s.id === sectorId)) return false;

    // find it somewhere free on the destination board rather than dropping it
    // on top of whatever happens to share its coordinates over there
    const spot = nextSlot(
      doc.widgets.filter((w) => w.sectorId === sectorId),
      widget.w,
      widget.h,
    );

    let moved = false;
    get().commit('move to another tab', (d) => {
      moved = moveWidgetTo(d, id, sectorId, spot);
    });
    return moved;
  },

  removeWidget: (id) =>
    get().commit('delete widget', (d) => {
      d.widgets = d.widgets.filter((w) => w.id !== id);
      d.tasks = d.tasks.filter((t) => t.widgetId !== id);
      d.events = d.events.filter((e) => e.widgetId !== id);
      d.goals = d.goals.filter((g) => g.widgetId !== id);
      d.contacts = d.contacts.filter((c) => c.widgetId !== id);
      d.items = d.items.filter((i) => i.widgetId !== id);
      d.google.links = d.google.links.filter((l) => l.widgetId !== id);
    }),

  duplicateWidget: (id) =>
    get().commit('duplicate widget', (d) => {
      const src = d.widgets.find((w) => w.id === id);
      if (!src) return;
      const copy: Widget = clone(src);
      copy.id = uid();
      copy.x = src.x + 24;
      copy.y = src.y + 24;
      copy.z = d.widgets.reduce((m, w) => Math.max(m, w.z), 0) + 1;
      d.widgets.push(copy);
      const remap = <T extends { id: ID; widgetId: ID }>(items: T[]) =>
        items
          .filter((i) => i.widgetId === id)
          .map((i) => ({ ...clone(i), id: uid(), widgetId: copy.id }));
      d.tasks.push(...remap(d.tasks));
      d.events.push(...remap(d.events));
      d.goals.push(...remap(d.goals));
      d.contacts.push(...remap(d.contacts));
      d.items.push(...remap(d.items).map((i) => ({ ...i, links: [] })));
    }),

  raiseWidget: (id) =>
    get().quiet((d) => {
      const w = d.widgets.find((x) => x.id === id);
      if (!w) return;
      const max = d.widgets.reduce((m, x) => Math.max(m, x.z), 0);
      if (w.z === max) return;
      w.z = max + 1;
    }),

  addTask: (t) => {
    const id = uid();
    get().commit('add task', (d) => {
      const siblings = d.tasks.filter((x) => x.widgetId === t.widgetId);
      d.tasks.push({
        id,
        widgetId: t.widgetId,
        sectorId: t.sectorId,
        title: t.title,
        notes: t.notes ?? '',
        kind: t.kind ?? 'floating',
        done: false,
        createdOn: t.createdOn ?? today(),
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        effort: t.effort,
        recurrence: t.recurrence,
        completions: t.recurrence ? [] : undefined,
        subtasks: [],
        order: siblings.length,
      });
    });
    return id;
  },

  updateTask: (id, patch) =>
    get().commit('edit task', (d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      Object.assign(t, patch);
      if (t.kind === 'dated' && !t.dueDate) t.dueDate = today();
      if (t.recurrence && !t.completions) t.completions = [];
    }, { merge: true, key: `task:${id}` }),

  /**
   * Ticking a box. Recurring tasks record the specific day; everything else
   * flips a flag. Streaks and cosmetics are settled here too.
   */
  toggleTask: (id, date) => {
    let becameDone = false;
    let earnedSeeds = 0;
    get().commit('tick task', (d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      if (t.recurrence) {
        const list = t.completions ?? [];
        if (list.includes(date)) {
          t.completions = list.filter((x) => x !== date);
        } else {
          t.completions = [...list, date];
          becameDone = true;
        }
      } else {
        t.done = !t.done;
        t.completedOn = t.done ? date : undefined;
        becameDone = t.done;
      }
      if (!becameDone) return;

      // lifetime counter — unticking never takes a memory away
      d.stats.completed += 1;
      const last = d.stats.lastActiveDate;
      if (last !== date) {
        d.stats.streak = last && addDays(last, 1) === date ? d.stats.streak + 1 : 1;
        d.stats.lastActiveDate = date;
      }
      // the best you ever did, kept separately: a reset to zero shouldn't
      // erase the fact that it happened
      d.stats.bestStreak = Math.max(d.stats.bestStreak ?? 0, d.stats.streak);
      d.stats.unlocked = unlockedIds(d.stats.completed, seasonOf());

      // every few finished things is a seed for the garden
      const due = seedsDue(d.stats.completed, d.garden.countedCompletions);
      if (due > 0) {
        d.garden.seeds += due;
        d.garden.countedCompletions = d.stats.completed;
        earnedSeeds = due;
      }
    });

    if (becameDone) {
      const ui = useUI.getState();
      ui.setMood('happy');
      if (earnedSeeds > 0) {
        ui.toast(
          earnedSeeds === 1 ? 'A seed for the garden 🌱' : `${earnedSeeds} seeds for the garden 🌱`,
          'win',
        );
      }
    }
  },

  removeTask: (id) =>
    get().commit('delete task', (d) => {
      d.tasks = d.tasks.filter((t) => t.id !== id);
    }),

  moveTask: (id, delta) =>
    get().commit('reorder tasks', (d) => {
      const t = d.tasks.find((x) => x.id === id);
      if (!t) return;
      const list = d.tasks
        .filter((x) => x.widgetId === t.widgetId)
        .sort((a, b) => a.order - b.order);
      const i = list.findIndex((x) => x.id === id);
      const j = i + delta;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((x, k) => {
        const target = d.tasks.find((y) => y.id === x.id);
        if (target) target.order = k;
      });
    }),

  addSubtask: (taskId, title) =>
    get().commit('add step', (d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) t.subtasks.push({ id: uid(), title, done: false });
    }),

  /**
   * Move a task to another tab. Tasks belong to a widget, so this finds a
   * to-do list on the far side and makes one if the tab hasn't got one — the
   * delivery shouldn't fail because the destination is empty.
   */
  carryTask: (taskId, toSectorId) => {
    const state = get();
    const task = state.doc.tasks.find((t) => t.id === taskId);
    if (!task || task.sectorId === toSectorId) return false;

    let target = state.doc.widgets
      .filter((w) => w.sectorId === toSectorId && (w.type === 'todo' || w.type === 'habits'))
      .sort((a, b) => a.z - b.z)[0]?.id;
    if (!target) target = state.addWidget(toSectorId, 'todo');

    get().commit('carry a task over', (d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (!t) return;
      t.sectorId = toSectorId;
      t.widgetId = target as ID;
      // to the bottom of its new list, so it doesn't shove anything aside
      const siblings = d.tasks.filter((x) => x.widgetId === target);
      t.order = siblings.reduce((m, x) => Math.max(m, x.order), -1) + 1;
    });
    return true;
  },

  updateSubtask: (taskId, subId, patch) =>
    get().commit('edit step', (d) => {
      const s = d.tasks.find((x) => x.id === taskId)?.subtasks.find((y) => y.id === subId);
      if (s) Object.assign(s, patch);
    }, { merge: true, key: `step:${subId}` }),

  removeSubtask: (taskId, subId) =>
    get().commit('delete step', (d) => {
      const t = d.tasks.find((x) => x.id === taskId);
      if (t) t.subtasks = t.subtasks.filter((s) => s.id !== subId);
    }),

  addEvent: (e) => {
    const id = uid();
    get().commit('add event', (d) => {
      const linked = d.google.links.some((l) => l.widgetId === e.widgetId && l.writeBack);
      d.events.push({ ...e, id, pendingPush: linked ? true : undefined });
    });
    return id;
  },
  updateEvent: (id, patch) =>
    get().commit('edit event', (d) => {
      const e = d.events.find((x) => x.id === id);
      if (!e) return;
      Object.assign(e, patch);
      // remember that Google hasn't seen this yet
      if (e.google) e.pendingPush = true;
    }, { merge: true, key: `event:${id}` }),

  /**
   * Deleting a synced event has to be remembered, because once the local
   * record is gone there's nothing left to tell Google about. The gravestone
   * is dropped again if an undo brings the event back.
   */
  removeEvent: (id) =>
    get().commit('delete event', (d) => {
      const gone = d.events.find((e) => e.id === id);
      if (gone?.google) {
        const { calendarId, eventId } = gone.google;
        const already = d.google.pendingDeletes.some(
          (s) => s.eventId === eventId && s.calendarId === calendarId,
        );
        if (!already) d.google.pendingDeletes.push({ calendarId, eventId });
      }
      d.events = d.events.filter((e) => e.id !== id);
    }),

  addGoal: (g) => {
    const id = uid();
    get().commit('add goal', (d) => { d.goals.push({ ...g, id }); });
    return id;
  },
  updateGoal: (id, patch) =>
    get().commit('edit goal', (d) => {
      const g = d.goals.find((x) => x.id === id);
      if (!g) return;
      Object.assign(g, patch);
      if (g.target > 0 && g.current >= g.target) g.done = true;
      if (g.current < g.target) g.done = patch.done ?? false;
    }, { merge: true, key: `goal:${id}` }),
  removeGoal: (id) =>
    get().commit('delete goal', (d) => { d.goals = d.goals.filter((g) => g.id !== id); }),

  addContact: (c) => {
    const id = uid();
    get().commit('add person', (d) => {
      const tint = c.tint ?? PASTELS[d.contacts.length % PASTELS.length].value;
      d.contacts.push({ ...c, tint, id });
    });
    return id;
  },
  updateContact: (id, patch) =>
    get().commit('edit person', (d) => {
      const c = d.contacts.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
    }, { merge: true, key: `person:${id}` }),
  removeContact: (id) =>
    get().commit('delete person', (d) => { d.contacts = d.contacts.filter((c) => c.id !== id); }),

  addStroke: (s) => get().commit('doodle', (d) => { d.strokes.push(s); }),
  eraseStrokes: (ids) =>
    get().commit('erase', (d) => {
      const set2 = new Set(ids);
      d.strokes = d.strokes.filter((s) => !set2.has(s.id));
    }, { merge: true }),
  clearStrokes: (sectorId) =>
    get().commit('clear doodles', (d) => {
      d.strokes = d.strokes.filter((s) => s.sectorId !== sectorId);
    }),

  addDecoration: (d) => {
    const id = uid();
    get().commit(d.kind === 'tape' ? 'add tape' : 'add sticker', (doc) => {
      doc.decorations.push({ ...d, id });
    });
    return id;
  },

  moveDecoration: (id, x, y) =>
    get().commit('move decoration', (d) => {
      const dec = d.decorations.find((x2) => x2.id === id);
      if (dec) { dec.x = x; dec.y = y; }
    }, { merge: true, key: `decor:${id}` }),

  updateDecoration: (id, patch) =>
    get().commit('edit decoration', (d) => {
      const dec = d.decorations.find((x) => x.id === id);
      if (dec) Object.assign(dec, patch);
    }, { merge: true, key: `decor-edit:${id}` }),

  removeDecoration: (id) =>
    get().commit('remove decoration', (d) => {
      d.decorations = d.decorations.filter((x) => x.id !== id);
    }),

  addItem: (widgetId, sectorId, values = {}) => {
    const id = uid();
    get().commit('add row', (d) => {
      const siblings = d.items.filter((i) => i.widgetId === widgetId);
      d.items.push({
        id, widgetId, sectorId, values,
        order: siblings.length,
        createdOn: today(),
        checklist: [],
        materials: [],
        links: [],
        migrations: 0,
      });
    });
    return id;
  },

  updateItem: (id, patch) =>
    get().commit('edit row', (d) => {
      const i = d.items.find((x) => x.id === id);
      if (i) Object.assign(i, patch);
    }, { merge: true, key: `item:${id}` }),

  setCell: (id, fieldId, value) =>
    get().commit('edit row', (d) => {
      const i = d.items.find((x) => x.id === id);
      if (!i) return;
      if (value === undefined || value === '') delete i.values[fieldId];
      else i.values[fieldId] = value;
    }, { merge: true, key: `cell:${id}:${fieldId}` }),

  removeItem: (id) =>
    get().commit('delete row', (d) => {
      d.items = d.items.filter((i) => i.id !== id);
      // don't leave dangling threads pointing at it
      for (const other of d.items) other.links = other.links.filter((l) => l !== id);
    }),

  moveItem: (id, delta) =>
    get().commit('reorder rows', (d) => {
      const item = d.items.find((x) => x.id === id);
      if (!item) return;
      const list = d.items.filter((x) => x.widgetId === item.widgetId).sort((a, b) => a.order - b.order);
      const i = list.findIndex((x) => x.id === id);
      const j = i + delta;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((x, k) => {
        const target = d.items.find((y) => y.id === x.id);
        if (target) target.order = k;
      });
    }),

  duplicateItem: (id) =>
    get().commit('duplicate row', (d) => {
      const src = d.items.find((x) => x.id === id);
      if (!src) return;
      d.items.push({
        ...clone(src),
        id: uid(),
        order: src.order + 0.5,
        createdOn: today(),
        migrations: 0,
        releasedOn: undefined,
        links: [],
      });
      d.items
        .filter((x) => x.widgetId === src.widgetId)
        .sort((a, b) => a.order - b.order)
        .forEach((x, k) => { x.order = k; });
    }),

  /**
   * Rolling a row forward. The count is the point: at three the card stops
   * being a passive reminder and asks you to decide.
   */
  migrateItem: (id) =>
    get().commit('roll forward', (d) => {
      const i = d.items.find((x) => x.id === id);
      if (i) i.migrations += 1;
    }),

  releaseItem: (id) =>
    get().commit('let it go', (d) => {
      const i = d.items.find((x) => x.id === id);
      if (i) i.releasedOn = today();
    }),

  addItemStep: (id, title) =>
    get().commit('add requirement', (d) => {
      const i = d.items.find((x) => x.id === id);
      if (i) i.checklist.push({ id: uid(), title, done: false });
    }),

  toggleItemStep: (id, stepId) =>
    get().commit('tick requirement', (d) => {
      const step = d.items.find((x) => x.id === id)?.checklist.find((s) => s.id === stepId);
      if (step) step.done = !step.done;
    }),

  removeItemStep: (id, stepId) =>
    get().commit('remove requirement', (d) => {
      const i = d.items.find((x) => x.id === id);
      if (i) i.checklist = i.checklist.filter((s) => s.id !== stepId);
    }),

  attachMaterial: (itemId, materialId) =>
    get().commit('attach', (d) => {
      const i = d.items.find((x) => x.id === itemId);
      if (!i) return;
      i.materials = i.materials.includes(materialId)
        ? i.materials.filter((m) => m !== materialId)
        : [...i.materials, materialId];
    }),

  /** "see p. 34", both ways, because a one-way thread is a dead end. */
  threadItems: (fromId, toId) =>
    get().commit('thread', (d) => {
      const a = d.items.find((x) => x.id === fromId);
      const b = d.items.find((x) => x.id === toId);
      if (!a || !b || a === b) return;
      const joined = a.links.includes(toId);
      a.links = joined ? a.links.filter((l) => l !== toId) : [...a.links, toId];
      b.links = joined ? b.links.filter((l) => l !== fromId) : [...b.links, fromId];
    }),

  setFields: (widgetId, fields) =>
    get().commit('edit columns', (d) => {
      const w = d.widgets.find((x) => x.id === widgetId);
      if (w) w.data = { ...w.data, fields };
    }),

  addField: (widgetId, field) =>
    get().commit('add column', (d) => {
      const w = d.widgets.find((x) => x.id === widgetId);
      if (w) w.data = { ...w.data, fields: [...(w.data.fields ?? []), field] };
    }),

  removeField: (widgetId, fieldId) =>
    get().commit('remove column', (d) => {
      const w = d.widgets.find((x) => x.id === widgetId);
      if (!w) return;
      w.data = { ...w.data, fields: (w.data.fields ?? []).filter((f) => f.id !== fieldId) };
      // and drop the orphaned values so they can't resurface later
      for (const i of d.items) {
        if (i.widgetId === widgetId) delete i.values[fieldId];
      }
    }),

  addMaterial: (m) => {
    const id = uid();
    get().commit('add material', (d) => { d.materials.push({ ...m, id }); });
    return id;
  },

  updateMaterial: (id, patch) =>
    get().commit('edit material', (d) => {
      const m = d.materials.find((x) => x.id === id);
      if (m) Object.assign(m, patch, { updatedOn: today() });
    }, { merge: true, key: `material:${id}` }),

  removeMaterial: (id) =>
    get().commit('delete material', (d) => {
      d.materials = d.materials.filter((m) => m.id !== id);
      for (const i of d.items) i.materials = i.materials.filter((x) => x !== id);
    }),

  setGoogleClientId: (id) =>
    get().commit('set Google client', (d) => { d.google.clientId = id.trim(); }),

  setGoogleAccount: (email) =>
    get().quiet((d) => {
      d.google.email = email;
      d.google.connectedAt = email ? new Date().toISOString() : undefined;
      if (!email) d.google.lastError = undefined;
    }),

  linkCalendar: (link) =>
    get().commit('connect calendar', (d) => {
      d.google.links = d.google.links.filter((l) => l.calendarId !== link.calendarId);
      d.google.links.push(link);
    }),

  updateLink: (calendarId, patch) =>
    get().quiet((d) => {
      const l = d.google.links.find((x) => x.calendarId === calendarId);
      if (l) Object.assign(l, patch);
    }),

  /**
   * Unlinking keeps the events by default and just cuts the cord: they become
   * ordinary Nook events. Deleting them here never touches Google.
   */
  unlinkCalendar: (calendarId, { keepEvents }) =>
    get().commit('disconnect calendar', (d) => {
      d.google.links = d.google.links.filter((l) => l.calendarId !== calendarId);
      if (keepEvents) {
        for (const e of d.events) {
          if (e.google?.calendarId === calendarId) { e.google = undefined; e.pendingPush = false; }
        }
      } else {
        d.events = d.events.filter((e) => e.google?.calendarId !== calendarId);
      }
      d.google.pendingDeletes = d.google.pendingDeletes.filter((s) => s.calendarId !== calendarId);
    }),

  disconnectGoogle: ({ keepEvents }) =>
    get().commit('disconnect Google', (d) => {
      const linked = new Set(d.google.links.map((l) => l.calendarId));
      if (keepEvents) {
        for (const e of d.events) {
          if (e.google && linked.has(e.google.calendarId)) { e.google = undefined; e.pendingPush = false; }
        }
      } else {
        d.events = d.events.filter((e) => !(e.google && linked.has(e.google.calendarId)));
      }
      d.google = { ...defaultGoogle, clientId: d.google.clientId };
    }),

  setAutoSync: (v) => get().quiet((d) => { d.google.autoSync = v; }),

  /* ---- the garden ---- */

  notePick: (flowerId) =>
    get().quiet((d) => {
      d.garden.picks[flowerId] = (d.garden.picks[flowerId] ?? 0) + 1;
    }),

  plantSeed: (flowerId, from = 'a handful of finished things') => {
    if (get().doc.garden.seeds <= 0) return false;
    get().commit('plant a seed', (d) => {
      d.garden.seeds -= 1;
      d.garden.plants.push({
        id: uid(), flowerId, plantedOn: today(), from,
        slot: nextPlot(d.garden.plants), watered: [],
      });
    });
    return true;
  },

  waterPlant: (id) =>
    get().commit('water the garden', (d) => {
      const p = d.garden.plants.find((x) => x.id === id);
      if (!p) return;
      const t = today();
      if (!p.watered.includes(t)) p.watered.push(t);
    }, { merge: true, key: `water:${id}` }),

  /**
   * A focus session plants its seedling at the *start*, so you watch it while
   * you work. It's marked stunted until the timer runs out.
   */
  sowSeedling: (flowerId, from) => {
    const id = uid();
    get().quiet((d) => {
      d.garden.plants.push({
        id, flowerId, plantedOn: today(), from,
        slot: nextPlot(d.garden.plants), watered: [], stunted: true,
      });
    });
    return id;
  },

  finishSeedling: (id, minutes) =>
    get().quiet((d) => {
      const p = d.garden.plants.find((x) => x.id === id);
      if (p) delete p.stunted;
      d.stats.focusMinutes += Math.max(0, Math.round(minutes));
    }),

  /* ---- hide and seek ---- */

  hideMouse: (widgetId) =>
    get().quiet((d) => { d.garden.hide = { date: today(), widgetId, found: false }; }),

  findMouse: () =>
    get().quiet((d) => {
      if (!d.garden.hide || d.garden.hide.found) return;
      d.garden.hide.found = true;
      const t = d.garden.hide.date;
      if (!d.garden.foundOn.includes(t)) d.garden.foundOn.push(t);
      // finding them is worth a seed. Cheap, and it's the reason to look.
      d.garden.seeds += 1;
    }),

  updateSettings: (patch) =>
    get().commit('change settings', (d) => { d.settings = { ...d.settings, ...patch }; }),

  updateAvatar: (patch) =>
    get().commit('dress up', (d) => { d.avatar = { ...d.avatar, ...patch }; }, { merge: true }),

  importDoc: (doc) => {
    get().commit('import', (d) => {
      Object.assign(d, { ...emptyDoc(), ...doc });
    });
  },

  resetAll: () => {
    get().commit('start over', (d) => {
      Object.assign(d, emptyDoc());
    });
  },
}));

/* ------------------------------------------------------------------ */
/* selectors                                                           */
/* ------------------------------------------------------------------ */

/**
 * These take plain arrays rather than the whole document on purpose: a zustand
 * selector must return a stable reference, so components subscribe to the raw
 * array and derive through useMemo.
 */
export const sortedSectors = (sectors: Sector[]) => [...sectors].sort((a, b) => a.order - b.order);
export const activeSector = (d: Doc) => d.sectors.find((s) => s.id === d.activeSectorId) ?? null;
export const widgetsOf = (widgets: Widget[], sectorId: ID | null) =>
  widgets.filter((w) => w.sectorId === sectorId).sort((a, b) => a.z - b.z);
export const itemsOf = (items: CollectionItem[], widgetId: ID) =>
  items.filter((i) => i.widgetId === widgetId).sort((a, b) => a.order - b.order);
export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export function todayStr() {
  return toDateStr(new Date());
}
