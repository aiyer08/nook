/**
 * Presets for the per-day tracker.
 *
 * Habit grids, year-in-pixels, sleep bars, the weather log and the gratitude
 * line are all "one record per day" drawn differently, so they share one
 * widget with a `mode` rather than being eight near-identical components.
 */
import type { IconName } from '../components/Icons';
import type { TrackerMode, WidgetData } from './types';
import { CHIP } from './collections';

export interface TrackerPreset {
  id: string;
  label: string;
  blurb: string;
  icon: IconName;
  sectors?: string[];
  build: () => WidgetData & { mode: TrackerMode };
}

const rid = (s: string) => s.toLowerCase().replace(/\W+/g, '-');

/** Colours for year-in-pixels: how the day was, not what you did. */
const DAY_PALETTE = [
  { key: 'great', label: 'Great', color: '#9FCFB8' },
  { key: 'good', label: 'Good', color: '#B4C69A' },
  { key: 'ok', label: 'Fine', color: '#EFCE7B' },
  { key: 'hard', label: 'Hard', color: '#F2B58F' },
  { key: 'rough', label: 'Rough', color: '#D89A86' },
  { key: 'rest', label: 'Rest', color: '#AAB0E8' },
];

const WEATHER_PALETTE = [
  { key: 'sun', label: 'Sunny', color: '#EFCE7B' },
  { key: 'part', label: 'Part cloud', color: '#B4C69A' },
  { key: 'cloud', label: 'Cloudy', color: '#C9C6BE' },
  { key: 'rain', label: 'Rain', color: '#A3C4E0' },
  { key: 'storm', label: 'Storm', color: '#AAB0E8' },
  { key: 'snow', label: 'Snow', color: '#E4EAF2' },
  { key: 'fog', label: 'Fog', color: '#D9D4CC' },
  { key: 'hot', label: 'Hot', color: '#EFA3B0' },
];

export const TRACKER_PRESETS: TrackerPreset[] = [
  {
    id: 'habit', label: 'Habit grid',
    blurb: 'A square per day, filling in as you tick. Shows current and longest streak.',
    icon: 'grid', sectors: ['Health', 'School', 'Work'],
    build: () => ({ mode: 'grid', weeks: 26, days: {} }),
  },
  {
    id: 'pixels', label: 'Year in pixels',
    blurb: '365 tiny squares, one colour per day. A whole year, instantly readable.',
    icon: 'grid', sectors: ['Reflection'],
    build: () => ({ mode: 'pixels', days: {}, palette: DAY_PALETTE }),
  },
  {
    id: 'mood', label: 'Mood & energy',
    blurb: 'One tap a day, plotted against how much you actually finished.',
    icon: 'heart', sectors: ['Health', 'Reflection'],
    build: () => ({ mode: 'mood', days: {} }),
  },
  {
    id: 'sleep', label: 'Sleep hours',
    blurb: 'A bar per night. The shape tells you more than the average does.',
    icon: 'moon', sectors: ['Health'],
    build: () => ({ mode: 'bars', days: {}, unit: 'h', goalAmount: 8, weeks: 6 }),
  },
  {
    id: 'steps', label: 'Steps',
    blurb: 'Daily steps. Typed in for now; ready to be filled from a fitness app later.',
    icon: 'bolt', sectors: ['Health'],
    build: () => ({ mode: 'bars', days: {}, unit: 'steps', goalAmount: 8000, weeks: 6 }),
  },
  {
    id: 'study', label: 'Study hours by subject',
    blurb: 'Stacked bars, one colour per subject.',
    icon: 'book', sectors: ['School'],
    build: () => ({
      mode: 'bars', days: {}, unit: 'h', weeks: 4,
      series: [
        { id: rid('Subject A'), label: 'Subject A', color: CHIP.slate },
        { id: rid('Subject B'), label: 'Subject B', color: CHIP.lavender },
        { id: rid('Subject C'), label: 'Subject C', color: CHIP.sage },
      ],
    }),
  },
  {
    id: 'spending', label: 'Spending per day',
    blurb: 'What went out, day by day, with no-spend days showing as gaps.',
    icon: 'coin', sectors: ['Money'],
    build: () => ({ mode: 'bars', days: {}, unit: '$', weeks: 5 }),
  },
  {
    id: 'weather', label: 'Weather log',
    blurb: 'A tiny icon per day. Pointless and beloved.',
    icon: 'sun', sectors: ['Health', 'Reflection'],
    build: () => ({ mode: 'icons', days: {}, palette: WEATHER_PALETTE }),
  },
  {
    id: 'gratitude', label: 'Gratitude log',
    blurb: 'One line a day. Nothing else required.',
    icon: 'heart', sectors: ['Reflection'],
    build: () => ({ mode: 'line', days: {} }),
  },
  {
    id: 'highlight', label: 'Highlight of the day',
    blurb: 'The memory jar: one good thing, saved.',
    icon: 'star', sectors: ['Reflection', 'Social'],
    build: () => ({ mode: 'line', days: {} }),
  },
  {
    id: 'lineaday', label: 'Line a day',
    blurb: 'The same date, revisited across years.',
    icon: 'note', sectors: ['Reflection'],
    build: () => ({ mode: 'line', days: {} }),
  },
  {
    id: 'meds', label: 'Meds & water',
    blurb: 'Tap-rows you count up through the day.',
    icon: 'heart', sectors: ['Health'],
    build: () => ({
      mode: 'taps', days: {},
      rows: [
        { id: rid('Water'), label: 'Water', target: 8 },
        { id: rid('Morning meds'), label: 'Morning meds', target: 1 },
        { id: rid('Evening meds'), label: 'Evening meds', target: 1 },
      ],
    }),
  },
  {
    id: 'routine', label: 'Routine checklist',
    blurb: 'Skincare, stretches, whatever the sequence is.',
    icon: 'check', sectors: ['Health'],
    build: () => ({
      mode: 'taps', days: {},
      rows: [
        { id: rid('Step one'), label: 'Step one', target: 1 },
        { id: rid('Step two'), label: 'Step two', target: 1 },
        { id: rid('Step three'), label: 'Step three', target: 1 },
      ],
    }),
  },
  {
    id: 'cycle', label: 'Cycle tracker',
    blurb: 'Flow and symptoms across the month, with the next date predicted.',
    icon: 'heart', sectors: ['Health'],
    build: () => ({ mode: 'cycle', days: {} }),
  },
  {
    id: 'nospend', label: 'No-spend days',
    blurb: 'A grid of days you spent nothing, with a streak.',
    icon: 'coin', sectors: ['Money'],
    build: () => ({ mode: 'grid', weeks: 18, days: {} }),
  },
  {
    id: 'rating', label: 'Daily rating',
    blurb: 'One to ten, every day. Blunt and useful.',
    icon: 'star', sectors: ['Reflection'],
    build: () => ({ mode: 'bars', days: {}, unit: '/10', goalAmount: 10, weeks: 6 }),
  },
];

export function trackerPresetById(id: string) {
  return TRACKER_PRESETS.find((p) => p.id === id);
}

export const MOOD_FACES = ['Rough', 'Low', 'Fine', 'Good', 'Great'];
export const ENERGY_WORDS = ['Empty', 'Low', 'Okay', 'Good', 'Buzzing'];
