/**
 * How a garden grows.
 *
 * The rule that matters: a plant's size is *derived* from the day it went in
 * and the days you watered it. Nothing stores "stage 3". That means the garden
 * keeps growing while the app is shut, a bad week can't shrink it, and there's
 * no counter to reset to zero — which is the whole difference between a streak
 * and a photo album.
 */
import type { DateStr, Plant } from './types';
import { daysBetween } from './dates';

/** How many finished things buy one seed. */
export const SEED_EVERY = 5;

export type Stage = 0 | 1 | 2 | 3 | 4;

export const STAGE_NAME: Record<Stage, string> = {
  0: 'just sown',
  1: 'a sprout',
  2: 'leafing out',
  3: 'in bud',
  4: 'in bloom',
};

/** Days of growth needed to reach each stage. */
const THRESHOLD = [0, 2, 6, 13, 21];

/**
 * Watering is worth a day of growth, and only once a day — so tending your
 * garden helps, but you can't click a flower into existence in an afternoon.
 */
export function growthDays(plant: Plant, today: DateStr): number {
  const elapsed = Math.max(0, daysBetween(plant.plantedOn, today));
  const tended = new Set(plant.watered).size;
  return elapsed + tended;
}

export function stageOf(plant: Plant, today: DateStr): Stage {
  // A session you left early stays a sprout. It doesn't die, it just doesn't
  // finish — that's the whole penalty.
  if (plant.stunted) return 1;
  const d = growthDays(plant, today);
  let stage: Stage = 0;
  for (let i = 4; i >= 0; i--) {
    if (d >= THRESHOLD[i]) { stage = i as Stage; break; }
  }
  return stage;
}

/** Days until the next stage, or null once it's fully grown. */
export function daysToNextStage(plant: Plant, today: DateStr): number | null {
  const stage = stageOf(plant, today);
  if (stage >= 4 || plant.stunted) return null;
  return Math.max(1, THRESHOLD[stage + 1] - growthDays(plant, today));
}

export function canWater(plant: Plant, today: DateStr): boolean {
  return !plant.watered.includes(today) && stageOf(plant, today) < 4;
}

/**
 * Seeds owed for a lifetime completion count, minus what's already been paid
 * out. Kept as a pure sum so a lost save or a fiddled counter can't mint seeds.
 */
export function seedsDue(completed: number, alreadyCounted: number): number {
  const earned = Math.floor(completed / SEED_EVERY);
  const paid = Math.floor(alreadyCounted / SEED_EVERY);
  return Math.max(0, earned - paid);
}

/** How far off the next seed is, for the "3 more to go" line. */
export function towardNextSeed(completed: number): { done: number; need: number } {
  return { done: completed % SEED_EVERY, need: SEED_EVERY };
}

/** A garden bed fills left to right, front row first. */
export function nextPlot(plants: Plant[]): number {
  const taken = new Set(plants.map((p) => p.slot));
  let i = 0;
  while (taken.has(i)) i++;
  return i;
}

export function bloomsIn(plants: Plant[], today: DateStr): number {
  return plants.filter((p) => stageOf(p, today) === 4).length;
}
