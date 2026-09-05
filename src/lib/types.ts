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
  | 'wheel' | 'materials';

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
}

export interface Stats {
  completed: number;
  streak: number;
  lastActiveDate: DateStr | null;
  unlocked: string[];
  seen: string[];
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
  settings: Settings;
  stats: Stats;
  google: GoogleState;
}
