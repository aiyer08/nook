export type ID = string;

/** YYYY-MM-DD */
export type DateStr = string;

export type EffortTag = 'quick' | 'short' | 'focus' | 'deep';

export interface Recurrence {
  freq: 'daily' | 'weekly' | 'monthly';
  /** 0 = Sunday … 6 = Saturday. Only for weekly. */
  weekdays?: number[];
  /** day of month, only for monthly */
  monthDay?: number;
}

export interface Subtask {
  id: ID;
  title: string;
  done: boolean;
}

export interface Task {
  id: ID;
  widgetId: ID;
  sectorId: ID;
  title: string;
  notes: string;
  /** floating tasks roll over to the next day; dated ones stay put */
  kind: 'floating' | 'dated';
  done: boolean;
  /** the day this task first appeared, used to show gentle roll-over counts */
  createdOn: DateStr;
  completedOn?: DateStr;
  dueDate?: DateStr;
  dueTime?: string; // HH:mm
  effort?: EffortTag;
  recurrence?: Recurrence;
  /** dates a recurring task was ticked off */
  completions?: DateStr[];
  subtasks: Subtask[];
  order: number;
}

export type EventKind = 'event' | 'meeting' | 'milestone';

export interface EventItem {
  id: ID;
  widgetId: ID;
  sectorId: ID;
  kind: EventKind;
  title: string;
  date: DateStr;
  time?: string; // HH:mm
  endTime?: string;
  location?: string;
  /** meeting link, or a link attached to any event */
  link?: string;
  people?: string;
  notes?: string;
  /** milestones (birthdays, anniversaries) can repeat every year */
  yearly?: boolean;
  /** set once this event exists in Google too */
  google?: GoogleRef;
  /** true when the local copy has changed and Google hasn't heard yet */
  pendingPush?: boolean;
  /** part of a repeating series in Google — editing it here only moves this one */
  seriesId?: string;
}

export interface GoogleRef {
  calendarId: string;
  eventId: string;
  /** Google's version marker, used to refuse to overwrite a newer remote edit */
  etag?: string;
  htmlLink?: string;
}

/** One Google calendar, wired to one Nook widget. */
export interface CalendarLink {
  calendarId: string;
  summary: string;
  /** Google's own colour for the calendar, so it looks familiar */
  color?: string;
  sectorId: ID;
  widgetId: ID;
  /** Google's incremental cursor; absent means "next sync is a full one" */
  syncToken?: string;
  /** how far back the first sync reached — must stay fixed for syncToken to work */
  timeMin: string;
  lastSyncedAt?: string;
  /** send Nook's own events in this widget up to Google */
  writeBack: boolean;
  /** Google says we may not write here (a subscribed holiday calendar, say) */
  readOnly?: boolean;
}

export interface Tombstone {
  calendarId: string;
  eventId: string;
}

export interface GoogleState {
  /** OAuth client id — public by design, but yours to create */
  clientId: string;
  email?: string;
  connectedAt?: string;
  links: CalendarLink[];
  /** events deleted here that still need deleting up there */
  pendingDeletes: Tombstone[];
  lastSyncedAt?: string;
  lastError?: string;
  /** re-sync automatically while the app is open */
  autoSync: boolean;
}

export interface Goal {
  id: ID;
  widgetId: ID;
  sectorId: ID;
  title: string;
  target: number;
  current: number;
  unit: string;
  notes: string;
  done: boolean;
  dueDate?: DateStr;
  /**
   * The day this goal was first counted as finished.
   *
   * Set once, and never cleared: it's what stops a goal you tick, untick and
   * tick again from minting seeds each time, and it's the date Wrapped files
   * the achievement under.
   */
  countedOn?: DateStr;
}

export interface Contact {
  id: ID;
  widgetId: ID;
  sectorId: ID;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  notes?: string;
  /** a warm pastel chip colour so contacts are recognisable at a glance */
  tint?: string;
}

/* ------------------------------------------------------------------ */
/* collections: one data shape, four lenses                            */
/* ------------------------------------------------------------------ */

export type FieldType =
  | 'text' | 'longtext' | 'number' | 'money' | 'date' | 'select'
  | 'multiselect' | 'checkbox' | 'stars' | 'url' | 'progress';

export interface FieldOption {
  id: string;
  label: string;
  color: string;
}

export interface FieldDef {
  id: ID;
  name: string;
  type: FieldType;
  /** for select / multiselect */
  options?: FieldOption[];
  /** stars and progress need a ceiling; number and money take a unit */
  max?: number;
  suffix?: string;
  /** the field used as an item's title. Exactly one per collection. */
  primary?: boolean;
}

export type CollectionView = 'table' | 'board' | 'calendar' | 'gallery';

/** A cell. Kept loose on purpose; the field's `type` says how to read it. */
export type CellValue = string | number | boolean | string[] | undefined;

export interface CollectionItem {
  id: ID;
  widgetId: ID;
  sectorId: ID;
  values: Record<ID, CellValue>;
  order: number;
  createdOn: DateStr;
  /** per-item checklist — "transcript, 2 letters, 500-word essay" */
  checklist: Subtask[];
  /** ids from the materials locker */
  materials: ID[];
  /** threading, the BuJo "see p. 34", pointing at other items */
  links: ID[];
  /** times rolled forward. Three is where the card asks you a hard question. */
  migrations: number;
  releasedOn?: DateStr;
}

/** Documents kept once and attached many times. */
export interface Material {
  id: ID;
  name: string;
  kind: 'resume' | 'statement' | 'essay' | 'transcript' | 'letter' | 'portfolio' | 'other';
  /** a version label, since keeping several is the entire point */
  version: string;
  url?: string;
  /**
   * The actual document, kept in the browser's file store rather than in this
   * JSON — see lib/files.ts. Only the id, and enough about it to draw a row,
   * live here.
   */
  fileId?: string;
  fileName?: string;
  mime?: string;
  size?: number;
  notes?: string;
  updatedOn: DateStr;
}

export type WidgetType =
  | 'todo'
  | 'goals'
  | 'calendar'
  | 'meetings'
  | 'contacts'
  | 'dates'
  | 'notes'
  | 'link'
  | 'image'
  | 'embed'
  | 'habits'
  | 'quote'
  /* one engine, four lenses — most list-shaped pages are a preset of this */
  | 'collection'
  /* one record per day, drawn several ways */
  | 'tracker'
  /* the bullet-journal spreads, one widget with a range mode */
  | 'spread'
  /* shapes distinct enough to deserve their own code */
  | 'papers' | 'followups' | 'journal' | 'countdown' | 'thermometer'
  | 'wheel' | 'materials'
  /* classes, each with a timetable, a syllabus and a note per lecture */
  | 'classes';

export type TapeStyle = 'none' | 'left' | 'right' | 'both' | 'corner';

export interface Widget {
  id: ID;
  sectorId: ID;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  /** slight scrapbook tilt, in degrees */
  rotation: number;
  tape: TapeStyle;
  /** optional per-widget accent override; otherwise the sector accent is used */
  accent?: string;
  collapsed?: boolean;
  data: WidgetData;
}

export interface WidgetData {
  /* ---- collection engine ---- */
  fields?: FieldDef[];
  view?: CollectionView;
  /** which select field the board groups by */
  groupBy?: ID;
  /** which date field the calendar keys on */
  dateField?: ID;
  /** which field the gallery shows as a picture */
  imageField?: ID;
  sortBy?: ID;
  sortDir?: 'asc' | 'desc';
  /** narrow the view to one option of the group-by field */
  filterOption?: string;
  /**
   * Suggested checklist for a row — "transcript, two letters, 500-word essay".
   * Offered as one-tap chips on the card and never added on your behalf: a row
   * that arrives with six unticked boxes you didn't ask for reads as a chore
   * list rather than a note.
   */
  steps?: string[];

  /* ---- per-day tracker ---- */
  mode?: TrackerMode;
  days?: Record<DateStr, DayEntry>;
  /** how many weeks of squares the habit grid draws */
  weeks?: number;
  /** named series for the stacked bars */
  series?: { id: ID; label: string; color: string }[];
  /** rows for the tap-counters: meds, water, routine steps */
  rows?: { id: ID; label: string; target: number }[];
  /** palette for year-in-pixels and the weather log */
  palette?: { key: string; label: string; color: string }[];

  /* ---- spreads ---- */
  range?: SpreadRange;
  /** which day/week/month the spread is showing */
  cursor?: string;
  dayStart?: number;
  dayEnd?: number;
  months?: number;

  /* ---- classes & lectures ---- */
  /** which class is open in the notebook, and which lecture within it */
  openClass?: ID;
  openLecture?: ID;

  /* ---- the rest ---- */
  targetDate?: DateStr;
  goalAmount?: number;
  currentAmount?: number;
  unit?: string;
  /** a thermometer that empties (debt) rather than fills (savings) */
  countDown?: boolean;
  prompts?: string[];
  entries?: Record<DateStr, Record<string, string>>;
  papers?: Paper[];
  followups?: FollowUp[];
  spokes?: { id: ID; label: string; score: number }[];
  // notes widget
  content?: string;
  // link widget
  links?: LinkCard[];
  // image widget
  src?: string;
  /**
   * A picture in the browser's file store. `src` is still read for boards made
   * before there was one, and for images pasted in as a data URL.
   */
  fileId?: string;
  fileName?: string;
  mime?: string;
  size?: number;
  caption?: string;
  fit?: 'cover' | 'contain';
  // embed widget
  url?: string;
  // todo widget
  effortFilter?: EffortTag | 'all';
  hideCompleted?: boolean;
  // calendar widget
  monthCursor?: string; // YYYY-MM
  // quote widget
  text?: string;
  author?: string;
}

export type TrackerMode =
  /** GitHub-contribution squares, with current and longest streak */
  | 'grid'
  /** 365 tiny squares, one colour per day */
  | 'pixels'
  /** hours slept, steps walked, money spent — a bar per day */
  | 'bars'
  /** mood and energy, one tap a day, plotted against tasks finished */
  | 'mood'
  /** a tiny icon per day: weather, or how it went */
  | 'icons'
  /** one line a day: gratitude, highlight, a memory for the jar */
  | 'line'
  /** counters you tap up: meds taken, glasses of water */
  | 'taps'
  /** flow and symptoms across a month */
  | 'cycle';

export type SpreadRange = 'future' | 'month' | 'week' | 'day' | 'hourly';

/** One day's record. Only the keys a given mode needs are ever set. */
export interface DayEntry {
  done?: boolean;
  /** 1–5 */
  mood?: number;
  energy?: number;
  value?: number;
  note?: string;
  /** a key into the widget's palette */
  key?: string;
  flow?: number;
  symptoms?: string[];
  /** stacked bars: seriesId -> amount */
  amounts?: Record<ID, number>;
  /** tap rows: rowId -> count */
  taps?: Record<ID, number>;
}

export interface Paper {
  id: ID;
  title: string;
  authors: string;
  year: string;
  venue?: string;
  abstract?: string;
  /** the one-line takeaway, which is the actual point of having read it */
  takeaway: string;
  doi?: string;
  arxivId?: string;
  url?: string;
  read: boolean;
  addedOn: DateStr;
  stars?: number;
}

export interface FollowUp {
  id: ID;
  person: string;
  subject: string;
  sentOn: DateStr;
  /** nudge me after this many days */
  nudgeAfter: number;
  /** waiting on them and waiting on me are entirely different feelings */
  waitingOn: 'them' | 'me';
  notes?: string;
  done: boolean;
  closedOn?: DateStr;
}

export interface LinkCard {
  id: ID;
  url: string;
  title: string;
  description: string;
  domain: string;
  favicon?: string;
  image?: string;
  provider?: string;
}

export type Species = 'bunny' | 'mouse' | 'frog' | 'cat' | 'bear';

export interface AvatarState {
  species: Species;
  name: string;
  /** body colour, pulled from the pastel set */
  color: string;
  hat: string; // cosmetic id or 'none'
  accessory: string; // cosmetic id or 'none'
  /** decor items placed in the avatar's little room */
  decor: string[];
}

export interface Sector {
  id: ID;
  name: string;
  accent: string;
  icon: string;
  order: number;
  /** snap-to-grid is per-board so a scrapbook page can stay loose */
  snap: boolean;
}

export interface Stroke {
  id: ID;
  sectorId: ID;
  color: string;
  width: number;
  /** 'pen' draws opaque, 'marker' is translucent */
  tool: 'pen' | 'marker';
  points: number[]; // flat [x, y, x, y, …]
}

export type PenTexture = 'fineliner' | 'brush' | 'highlighter';

/** A strip of tape or a sticker, placed on the page for no reason at all. */
export interface Decoration {
  id: ID;
  sectorId: ID;
  kind: 'tape' | 'sticker';
  /** which pattern or which sticker */
  variant: string;
  x: number;
  y: number;
  rotation: number;
  /** tape only: how long the strip is */
  length?: number;
  scale?: number;
  color?: string;
}

export type Ambient = 'off' | 'rain' | 'cafe' | 'fire';

/** Where to ask the weather about. Kept coarse on purpose — a town, not a street. */
export interface Place {
  lat: number;
  lon: number;
  label: string;
}

export interface Settings {
  themeId: string;
  /** one setting, changing how every pen stroke is drawn */
  penTexture: PenTexture;
  /** hand-drawn wobbly widget edges instead of perfect rectangles */
  wobble: boolean;
  /** the page-turn between tabs */
  pageTurn: boolean;
  sound: boolean;
  timeTint: boolean;
  paperTexture: boolean;
  motion: boolean;
  confetti: boolean;
  /** real weather from outside, drawn on the paper */
  weather: boolean;
  place: Place | null;
  /** a looping background sound. Off by default, always. */
  ambient: Ambient;
  ambientVolume: number;
  /** a warm pool of lamplight over the page after dark */
  lampGlow: boolean;
  /** the mouse's burrow in the corner of the page */
  burrow: boolean;
}

/* ------------------------------------------------------------------ */
/* classes and lectures                                                */
/* ------------------------------------------------------------------ */

/**
 * When a class meets.
 *
 * Weekdays plus a time, rather than a list of dates: that's how a timetable is
 * actually given to you ("Mon/Wed/Fri 10am, weeks 1–10"), and it means the
 * lecture dates can be *generated* rather than typed in one at a time.
 */
export interface Meets {
  /** 0 = Sunday, to match Date.getDay() */
  days: number[];
  /** HH:mm */
  time?: string;
  endTime?: string;
  where?: string;
  /** the term: first and last day lectures can fall on */
  from?: DateStr;
  to?: DateStr;
  /** every week, or every other week */
  everyOtherWeek?: boolean;
}

export interface ClassRecord {
  id: ID;
  widgetId: ID;
  sectorId: ID;
  /** "Hash tables and graphs" */
  name: string;
  /** "CS 106B" — short, for the chip */
  code?: string;
  colour: string;
  teacher?: string;
  meets?: Meets;
  /**
   * The syllabus, however you have it: a link, a file in the browser's file
   * store (lib/files.ts), or both.
   */
  syllabusUrl?: string;
  syllabusFileId?: string;
  syllabusFileName?: string;
  syllabusSize?: number;
  notes?: string;
  order: number;
  /** finished classes drop to the bottom rather than being deleted */
  done?: boolean;
}

export interface LectureNote {
  id: ID;
  classId: ID;
  date: DateStr;
  time?: string;
  /** "Week 3 — hash tables". Auto-numbered when generated from the timetable. */
  title: string;
  /** the notes themselves */
  body: string;
  /** the margin: things to look up, questions to ask */
  questions?: string;
  /** files dropped on this lecture — slides, a handout */
  files?: { id: string; name: string; size: number }[];
  updatedOn: DateStr;
  /** ticked once you've been and written it up */
  covered?: boolean;
}

export interface Stats {
  completed: number;
  streak: number;
  lastActiveDate: DateStr | null;
  unlocked: string[];
  seen: string[];
  /** minutes spent in cozy focus, all time */
  focusMinutes: number;
  /** the single best streak you ever had, which a reset can never take back */
  bestStreak: number;
}

/**
 * One thing you grew.
 *
 * A streak is a receipt and a garden is a photo album: nothing here is ever
 * removed because a day went badly. A plant's stage is *derived* from the date
 * it went in and the days you watered it, so it keeps growing while the app is
 * closed and can't be faked by fiddling with a counter.
 */
export interface Plant {
  id: ID;
  /** which of the eleven flowers it grew into */
  flowerId: string;
  plantedOn: DateStr;
  /** what earned the seed, in a few words, for the label on the stick */
  from: string;
  /** position in the bed */
  slot: number;
  /** the days you watered it; each one is worth a day of growth */
  watered: DateStr[];
  /** a focus seedling whose session was cut short. Stays a sprout, no scolding. */
  stunted?: boolean;
}

export interface GardenState {
  /** seeds you've earned and not yet planted */
  seeds: number;
  /** completions already paid out as seeds, so seeds can't be double-counted */
  countedCompletions: number;
  plants: Plant[];
  /** how many times you've planted from each flower — your most-used folder */
  picks: Record<string, number>;
  /** where the mouse is hiding today, and whether you found them */
  hide: { date: DateStr; widgetId: ID; found: boolean } | null;
  /** every day you found the mouse — one sticker each */
  foundOn: DateStr[];
}

/** Everything that gets saved + everything undo/redo travels over. */
export interface Doc {
  version: number;
  onboarded: boolean;
  avatar: AvatarState;
  sectors: Sector[];
  activeSectorId: ID | null;
  widgets: Widget[];
  tasks: Task[];
  events: EventItem[];
  goals: Goal[];
  contacts: Contact[];
  strokes: Stroke[];
  decorations: Decoration[];
  /** collection rows live at the top level so deadlines can cut across tabs */
  items: CollectionItem[];
  materials: Material[];
  /** classes, and one note per lecture */
  classes: ClassRecord[];
  lectures: LectureNote[];
  settings: Settings;
  stats: Stats;
  garden: GardenState;
  google: GoogleState;
}
