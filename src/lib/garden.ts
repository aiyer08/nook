/**
 * The garden: eleven flowers, each a folder of widgets.
 *
 * Every flower is a *recipe* — petal count, petal silhouette, palette, growth
 * form — so one component draws all eleven, recolours them for any theme, and
 * animates individual petals. A PNG per flower per theme per size would be
 * hundreds of exports; this is one file.
 */
import type { Season } from './dates';
import { CATALOGUE, type Entry } from './catalogue';

export type Form =
  /** petals radiating from a centre */
  | 'single'
  /** the plain one: a disc with 5-6 round petals set around it */
  | 'circle'
  /** a closed cup of a few tall petals, tulip-fashion */
  | 'cup'
  /** rungs of paired leaflets up the stem, small star blooms on top */
  | 'ladder'
  /** a dense ball of tiny petals in concentric rings */
  | 'pompom'
  /** several small blooms that scatter apart */
  | 'cluster'
  /** a rounded mound of florets */
  | 'dome'
  /** coiled layers seen from above */
  | 'spiral';

export type PetalShape = 'round' | 'oval' | 'pointed' | 'ruffled' | 'crumpled' | 'broad';

export interface Flower {
  id: string;
  /** the category name, written on the leaf */
  name: string;
  /** the flower it is */
  species: string;
  blurb: string;
  form: Form;
  petals: number;
  /** a second, smaller ring behind the first */
  layers: number;
  shape: PetalShape;
  /** how far the petals lean out when open, in degrees from the stem */
  spread: number;
  palette: {
    petal: string;
    deep: string;
    centre: string;
    stem: string;
    leaf: string;
  };
  /** slight asymmetry, for the flowers that shouldn't look machined */
  wonky?: number;
  /** the catalogue keys that live inside, in the order they should appear */
  contents: string[];
}

export const GARDEN: Flower[] = [
  {
    id: 'tulip',
    name: 'Time & Planning',
    species: 'Tulip',
    blurb: 'Spreads, dates and the things with a when.',
    form: 'cup',
    petals: 3,
    layers: 1,
    shape: 'pointed',
    spread: 26,
    palette: { petal: '#F2A6A0', deep: '#DE8A84', centre: '#F7D9C6', stem: '#8FA97C', leaf: '#A8C09A' },
    contents: [
      's:future', 's:month', 's:week', 's:day', 's:hourly',
      'w:calendar', 'w:countdown', 'w:dates', 'w:meetings',
    ],
  },
  {
    id: 'daisy',
    name: 'Tasks & Doing',
    species: 'Daisy',
    blurb: 'A circle with six round petals — the plainest flower there is.',
    form: 'circle',
    petals: 6,
    layers: 1,
    shape: 'round',
    spread: 90,
    palette: { petal: '#FFF6E4', deep: '#F0E2C6', centre: '#EFCE7B', stem: '#8FA97C', leaf: '#A8C09A' },
    contents: ['w:todo', 'c:inbox', 'c:someday', 'w:habits', 'j:braindump', 'w:notes', 'c:blank'],
  },
  {
    id: 'sunflower',
    name: 'Trackers & Rhythms',
    species: 'Sunflower',
    blurb: 'Many petals round a dense middle — the shape is already a grid.',
    form: 'single',
    petals: 16,
    layers: 2,
    shape: 'pointed',
    spread: 90,
    palette: { petal: '#EFC65B', deep: '#D9A93F', centre: '#7A5C3E', stem: '#7E9A6B', leaf: '#93B37E' },
    contents: [
      't:habit', 't:mood', 't:sleep', 't:steps', 't:weather',
      't:pixels', 't:nospend', 't:rating', 't:meds',
    ],
  },
  {
    id: 'lotus',
    name: 'Health & Care',
    species: 'Lotus',
    blurb: 'The one flower that reads as rest rather than productivity.',
    form: 'single',
    petals: 8,
    layers: 2,
    shape: 'broad',
    spread: 78,
    palette: { petal: '#FBE3E8', deep: '#EFB9C6', centre: '#F7E9C9', stem: '#9BBE9C', leaf: '#B4D2AE' },
    contents: [
      'c:symptoms', 'c:workouts', 'c:selfcare', 'c:coping', 'j:therapy', 'c:therapy',
      't:cycle', 't:routine', 'w:thermometer',
    ],
  },
  {
    id: 'forgetmenot',
    name: 'People & Connection',
    species: 'Forget-me-not',
    blurb: 'Not one bloom but five, because this one is about many people.',
    form: 'cluster',
    petals: 5,
    layers: 1,
    shape: 'round',
    spread: 90,
    palette: { petal: '#AAB6E8', deep: '#8E9BD6', centre: '#EFCE7B', stem: '#8FA97C', leaf: '#A8C09A' },
    contents: [
      'w:contacts', 'c:networking', 'c:birthdays', 'c:metpeople',
      'c:somtime', 'c:letters', 'w:followups',
    ],
  },
  {
    id: 'marigold',
    name: 'Money',
    species: 'Marigold',
    blurb: 'A dense pompom of tiny petals, coin-round.',
    form: 'pompom',
    petals: 14,
    layers: 3,
    shape: 'ruffled',
    spread: 88,
    palette: { petal: '#F2A93F', deep: '#D98A2B', centre: '#B5651D', stem: '#7E9A6B', leaf: '#93B37E' },
    contents: ['c:budget', 'w:thermometer', 'c:subscriptions', 't:spending', 'c:winnings', 't:nospend'],
  },
  {
    id: 'rose',
    name: 'Reflection & Memory',
    species: 'Rose',
    blurb: 'Layers within layers — it accumulates depth rather than getting ticked off.',
    form: 'spiral',
    petals: 5,
    layers: 4,
    shape: 'round',
    spread: 90,
    palette: { petal: '#D9A9BC', deep: '#B98499', centre: '#8E5F72', stem: '#5F7A55', leaf: '#7A9A6B' },
    contents: [
      't:gratitude', 'c:wins', 't:lineaday', 'j:review', 'c:lessons',
      'j:letter', 't:highlight', 'w:quote', 'w:journal', 'j:word', 'c:lettinggo',
    ],
  },
  {
    id: 'peony',
    name: 'Ambitions & Applications',
    species: 'Peony',
    blurb: 'The showiest flower in the garden, for the aspirational one.',
    form: 'single',
    petals: 11,
    layers: 3,
    shape: 'ruffled',
    spread: 92,
    palette: { petal: '#F0A0BE', deep: '#DC7FA3', centre: '#F7DCE4', stem: '#7E9A6B', leaf: '#93B37E' },
    contents: [
      'c:applications', 'w:materials', 'c:recletters', 'c:outcomes',
      'j:pyramid', 'c:vision', 'w:wheel', 'c:bucket', 'w:goals', 'c:portfolio',
    ],
  },
  {
    id: 'jacobsladder',
    name: 'Study & Knowledge',
    species: "Jacob's ladder",
    blurb: 'Leaflets climb the stem like rungs, and the blooms sit at the top.',
    form: 'ladder',
    petals: 5,
    layers: 1,
    shape: 'oval',
    spread: 60,
    palette: { petal: '#B0B9E6', deep: '#8D98D3', centre: '#F2E4B8', stem: '#7E9A6B', leaf: '#8FB07C' },
    contents: [
      'w:papers', 'c:assignments', 'c:classes', 'c:grades', 'c:syllabus',
      'c:reading', 'c:flashcards', 'c:labnotes', 'c:interviewqa', 'c:skills',
      't:study', 'c:conferences',
    ],
  },
  {
    id: 'poppy',
    name: 'Creative & Play',
    species: 'Poppy',
    blurb: 'Deliberately the least tidy flower here.',
    form: 'single',
    petals: 5,
    layers: 1,
    shape: 'crumpled',
    spread: 86,
    palette: { petal: '#EE8264', deep: '#D2624A', centre: '#4A3B35', stem: '#7E9A6B', leaf: '#93B37E' },
    wonky: 7,
    contents: [
      'c:currently', 'c:playlist', 'c:books', 'c:watchlist', 'c:swatches',
      'c:stickerbook', 'c:handwriting', 'c:concerts', 'w:image', 'w:link', 'w:embed',
    ],
  },
  {
    id: 'hydrangea',
    name: 'Home & Places',
    species: 'Hydrangea',
    blurb: 'A mound of small florets. The silhouette reads a bit like a roof.',
    form: 'dome',
    petals: 4,
    layers: 1,
    shape: 'round',
    spread: 90,
    palette: { petal: '#B8C4EC', deep: '#9BA9DC', centre: '#E8EDF9', stem: '#7E9A6B', leaf: '#93B37E' },
    contents: [
      'c:meals', 'c:grocery', 'c:cleaning', 'c:plants', 'c:petcare',
      'c:packing', 'c:itinerary', 'c:places', 'c:restaurants', 'c:gifts', 'c:recipes',
    ],
  },
];

/**
 * The handful you reach for constantly, shown in a tray above the garden as
 * well as inside their own flower.
 *
 * Deliberately capped at eight. The whole point of the garden is that it
 * groups a hundred things into eleven; a quick row that grows past a single
 * glance would just rebuild the flat list it replaced.
 */
export const FAVOURITES: string[] = [
  'w:todo',           // the thing most people open the app to do
  'w:calendar',
  'w:notes',
  'w:goals',
  't:habit',          // the grid, with both streaks
  's:week',           // the most-used bullet-journal layout there is
  'w:journal',
  'c:applications',   // deadlines are external and unforgiving
];

/** Which flower a widget lives in, so a favourite can wear its home colour. */
export function homeFlowerOf(key: string): Flower | undefined {
  return GARDEN.find((f) => f.contents.includes(key));
}

/**
 * Anything with no flower. Should always be empty — there's a test for it —
 * but it's rendered as a fallback so that adding a preset and forgetting to
 * file it makes the widget *visible* rather than unreachable.
 */
export function looseEntries(): Entry[] {
  const claimed = new Set(GARDEN.flatMap((f) => f.contents));
  return CATALOGUE.filter((e) => !claimed.has(e.key));
}

export function entriesOf(flower: Flower): Entry[] {
  const byKey = new Map(CATALOGUE.map((e) => [e.key, e]));
  return flower.contents.map((k) => byKey.get(k)).filter(Boolean) as Entry[];
}

/**
 * Seasonal drift. The same eleven flowers, four moods — spring bright, summer
 * saturated, autumn warm and muted, winter pale and cool. Applied as a nudge
 * to each palette rather than as a second set of colours.
 */
export function seasonalShift(season: Season): { saturate: number; lighten: number; hueTilt: number } {
  switch (season) {
    case 'spring': return { saturate: 1.06, lighten: 0.06, hueTilt: 0 };
    case 'summer': return { saturate: 1.16, lighten: -0.02, hueTilt: 0 };
    case 'autumn': return { saturate: 0.9, lighten: -0.04, hueTilt: 12 };
    case 'winter': return { saturate: 0.74, lighten: 0.1, hueTilt: -8 };
  }
}

/** Does this flower match what's being typed? */
export function flowerById(id: string): Flower | undefined {
  return GARDEN.find((f) => f.id === id);
}

/** Which flower a catalogue key is filed under. */
export function flowerMatches(flower: Flower, query: string, entries: Entry[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (`${flower.name} ${flower.species} ${flower.blurb}`.toLowerCase().includes(q)) return true;
  return entries.some((e) => `${e.label} ${e.blurb} ${e.keywords ?? ''}`.toLowerCase().includes(q));
}
