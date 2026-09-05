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
  | 'quote';

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

export interface Settings {
  themeId: string;
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
  settings: Settings;
  stats: Stats;
  google: GoogleState;
}
