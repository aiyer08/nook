/**
 * Everything you can add to a page, in one searchable list.
 *
 * There are only a dozen widget *types*, but around eighty useful things you
 * might want — because most of them are a preset of the collection engine or
 * the day tracker. The picker shouldn't make you know that: you type "books"
 * and get books.
 */
import type { WidgetData, WidgetType } from './types';
import type { IconName } from '../components/Icons';
import { COLLECTION_PRESETS } from './collections';
import { TRACKER_PRESETS } from './trackers';
import { WIDGET_DEFAULTS } from './store';

export type Group = 'Basics' | 'Lists' | 'Trackers' | 'Spreads' | 'Media' | 'Work & study';

export interface Entry {
  key: string;
  label: string;
  blurb: string;
  icon: IconName;
  group: Group;
  type: WidgetType;
  /** applied to the new widget straight after it's made */
  data?: WidgetData;
  /** rename the widget to the entry's label */
  rename?: boolean;
  /** the per-item checklist a preset seeds */
  checklist?: string[];
  /** life sectors this suits, used to float relevant entries up */
  sectors?: string[];
  keywords?: string;
}

const plain = (
  type: WidgetType,
  group: Group,
  icon: IconName,
  keywords = '',
  sectors?: string[],
): Entry => ({
  key: `w:${type}`,
  label: WIDGET_DEFAULTS[type].label,
  blurb: WIDGET_DEFAULTS[type].blurb,
  icon,
  group,
  type,
  keywords,
  sectors,
});

const SPREADS: Entry[] = [
  ['future', 'Future log', 'Six or twelve months in a grid, for far-off things.', 6],
  ['month', 'Monthly spread', 'Every day of the month, one line each.', 0],
  ['week', 'Weekly spread', 'Seven columns. The most-used layout there is.', 0],
  ['day', 'Daily log', 'Freeform, date at the top.', 0],
  ['hourly', 'Time-blocked day', 'A column of hours to drop things into.', 0],
].map(([range, label, blurb, months]) => ({
  key: `s:${range}`,
  label: label as string,
  blurb: blurb as string,
  icon: 'calendar' as IconName,
  group: 'Spreads' as Group,
  type: 'spread' as WidgetType,
  rename: true,
  data: { range, months: (months as number) || undefined } as WidgetData,
  keywords: 'bujo bullet journal spread layout',
}));

export const CATALOGUE: Entry[] = [
  /* the everyday ones */
  plain('todo', 'Basics', 'list', 'tasks checklist rollover floating dated'),
  plain('calendar', 'Basics', 'calendar', 'month dates events'),
  plain('notes', 'Basics', 'note', 'page writing scratch'),
  plain('goals', 'Basics', 'target', 'progress targets'),
  plain('habits', 'Basics', 'repeat', 'recurring streak daily'),
  plain('quote', 'Basics', 'sparkle', 'note to self affirmation quote page'),
  plain('countdown', 'Basics', 'clock', 'days until deadline exam trip birthday'),
  plain('meetings', 'Work & study', 'people', 'calls agenda who when where'),
  plain('contacts', 'Basics', 'heart', 'people addresses phone'),
  plain('dates', 'Basics', 'cake', 'birthdays anniversaries yearly important'),

  /* work and study */
  plain('papers', 'Work & study', 'book', 'doi arxiv research reading list crossref citation', ['School', 'Career', 'Work']),
  plain('followups', 'Work & study', 'clock', 'email nudge waiting reply chase', ['Work', 'Career']),
  plain('materials', 'Work & study', 'copy', 'resume cv personal statement essay locker attachments', ['Career', 'School']),
  plain('journal', 'Basics', 'pencil', 'diary daily reflection prompts proud improve'),

  /* the journal is just a set of questions, so several requested pages are
     the same widget with different prompts */
  ...([
    ['review', 'Monthly review', 'What worked, what didn’t, what’s next.', 'Reflection',
      ['What worked this month?', 'What didn’t?', 'What am I carrying into next month?', 'One number that mattered']],
    ['pyramid', 'Goal pyramid', 'Year down to week, so the big thing has a next step.', 'Reflection',
      ['This year I want…', 'So this quarter…', 'So this month…', 'So this week…']],
    ['word', 'Word of the year', 'One word, and what you’re doing about it.', 'Reflection',
      ['My word this year', 'Why that word', 'What it looks like in practice', 'Where I’m drifting from it']],
    ['letter', 'Letter to future self', 'Written now, read later.', 'Reflection',
      ['Dear future me…', 'What I hope has changed', 'What I hope hasn’t', 'Something to remember about right now']],
    ['therapy', 'Session notes', 'What came up, what to try, what to raise next time.', 'Health',
      ['What came up', 'What I’m taking away', 'To try before next time', 'For next session']],
    ['braindump', 'Brain dump', 'No structure. That’s the point.', 'Reflection',
      ['Everything that’s in my head right now']],
  ] as const).map(([id, label, blurb, sector, prompts]): Entry => ({
    key: `j:${id}`,
    label,
    blurb,
    icon: 'pencil',
    group: 'Basics',
    type: 'journal',
    rename: true,
    data: { prompts: [...prompts], entries: {} },
    sectors: [sector],
    keywords: 'journal prompts questions reflection review',
  })),

  /* the shaped ones */
  plain('thermometer', 'Trackers', 'target', 'savings goal debt payoff jar fills money', ['Money']),
  plain('wheel', 'Trackers', 'palette', 'level 10 life balance areas score radar', ['Reflection']),

  /* media */
  plain('image', 'Media', 'image', 'photo picture polaroid paste screenshot'),
  plain('link', 'Media', 'link', 'bookmarks urls preview unfurl'),
  plain('embed', 'Media', 'play', 'youtube spotify maps figma vimeo'),

  ...SPREADS,

  /* every collection preset */
  ...COLLECTION_PRESETS.filter((p) => p.id !== 'blank').map((p): Entry => ({
    key: `c:${p.id}`,
    label: p.label,
    blurb: p.blurb,
    icon: p.icon,
    group: p.sectors?.some((s) => ['Career', 'Work', 'School'].includes(s)) ? 'Work & study' : 'Lists',
    type: 'collection',
    rename: true,
    data: p.build(),
    checklist: p.checklist,
    sectors: p.sectors,
    keywords: 'list table board calendar gallery collection',
  })),

  /* the blank collection, kept last in its group */
  {
    key: 'c:blank',
    label: 'Blank collection',
    blurb: 'A titled list with nothing in it. Add whatever columns you like.',
    icon: 'list',
    group: 'Lists',
    type: 'collection',
    data: COLLECTION_PRESETS.find((p) => p.id === 'blank')!.build(),
    keywords: 'empty custom list collection',
  },

  /* every tracker preset */
  ...TRACKER_PRESETS.map((p): Entry => ({
    key: `t:${p.id}`,
    label: p.label,
    blurb: p.blurb,
    icon: p.icon,
    group: 'Trackers',
    type: 'tracker',
    rename: true,
    data: p.build(),
    sectors: p.sectors,
    keywords: 'per day grid squares streak log chart',
  })),
];

export const GROUPS: Group[] = ['Basics', 'Lists', 'Trackers', 'Spreads', 'Work & study', 'Media'];

/** Rank entries: text match first, then what suits this tab. */
export function searchCatalogue(query: string, sectorName: string): Entry[] {
  const q = query.trim().toLowerCase();
  const matches = q
    ? CATALOGUE.filter((e) =>
        `${e.label} ${e.blurb} ${e.keywords ?? ''}`.toLowerCase().includes(q),
      )
    : CATALOGUE;

  if (!q) {
    return [...matches].sort((a, b) => {
      const fit = (e: Entry) => (e.sectors?.includes(sectorName) ? 0 : 1);
      return fit(a) - fit(b) || GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group);
    });
  }

  return [...matches].sort((a, b) => {
    const starts = (e: Entry) => (e.label.toLowerCase().startsWith(q) ? 0 : 1);
    const inLabel = (e: Entry) => (e.label.toLowerCase().includes(q) ? 0 : 1);
    return starts(a) - starts(b) || inLabel(a) - inLabel(b) || a.label.localeCompare(b.label);
  });
}
