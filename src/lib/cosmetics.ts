import type { Season } from './dates';

export type CosmeticSlot = 'hat' | 'accessory' | 'decor';

export interface Cosmetic {
  id: string;
  name: string;
  slot: CosmeticSlot;
  /** completed tasks needed to earn it */
  unlockAt: number;
  /** seasonal pieces show up for free while their season is on */
  season?: Season;
  blurb: string;
}

export const COSMETICS: Cosmetic[] = [
  { id: 'none', name: 'Nothing', slot: 'hat', unlockAt: 0, blurb: 'Bare head, full heart.' },
  { id: 'bow', name: 'Little Bow', slot: 'hat', unlockAt: 3, blurb: 'For three things done.' },
  { id: 'party', name: 'Party Hat', slot: 'hat', unlockAt: 15, blurb: 'Fifteen! Worth a hat.' },
  { id: 'beanie', name: 'Cozy Beanie', slot: 'hat', unlockAt: 30, blurb: 'Knitted at task thirty.' },
  { id: 'flower', name: 'Flower Crown', slot: 'hat', unlockAt: 50, blurb: 'Grown over fifty tasks.' },
  { id: 'headphones', name: 'Headphones', slot: 'hat', unlockAt: 75, blurb: 'Deep work uniform.' },
  { id: 'crown', name: 'Tiny Crown', slot: 'hat', unlockAt: 100, blurb: 'One hundred. Royalty.' },
  { id: 'pumpkin', name: 'Pumpkin Hat', slot: 'hat', unlockAt: 0, season: 'autumn', blurb: 'Autumn only.' },
  { id: 'santa', name: 'Winter Hat', slot: 'hat', unlockAt: 0, season: 'winter', blurb: 'Winter only.' },
  { id: 'sunhat', name: 'Sun Hat', slot: 'hat', unlockAt: 0, season: 'summer', blurb: 'Summer only.' },
  { id: 'sprout', name: 'Spring Sprout', slot: 'hat', unlockAt: 0, season: 'spring', blurb: 'Spring only.' },

  { id: 'none', name: 'Nothing', slot: 'accessory', unlockAt: 0, blurb: 'Simple is nice too.' },
  { id: 'blush', name: 'Blush', slot: 'accessory', unlockAt: 1, blurb: 'Your first tick.' },
  { id: 'glasses', name: 'Round Glasses', slot: 'accessory', unlockAt: 8, blurb: 'Studious.' },
  { id: 'scarf', name: 'Stripy Scarf', slot: 'accessory', unlockAt: 25, blurb: 'Warm at twenty-five.' },
  { id: 'bandana', name: 'Bandana', slot: 'accessory', unlockAt: 40, blurb: 'Ready for anything.' },
  { id: 'cape', name: 'Tiny Cape', slot: 'accessory', unlockAt: 65, blurb: 'Earned, not bought.' },

  { id: 'plant', name: 'Little Plant', slot: 'decor', unlockAt: 5, blurb: 'Something to water.' },
  { id: 'lamp', name: 'Warm Lamp', slot: 'decor', unlockAt: 20, blurb: 'Lights the corner.' },
  { id: 'rug', name: 'Round Rug', slot: 'decor', unlockAt: 35, blurb: 'Soft underfoot.' },
  { id: 'books', name: 'Book Stack', slot: 'decor', unlockAt: 55, blurb: 'Read, half-read.' },
  { id: 'poster', name: 'Wall Poster', slot: 'decor', unlockAt: 80, blurb: 'A view of somewhere.' },
  { id: 'garland', name: 'Star Garland', slot: 'decor', unlockAt: 120, blurb: 'Strung up for you.' },
];

export function cosmeticsFor(slot: CosmeticSlot) {
  return COSMETICS.filter((c) => c.slot === slot);
}

export function isUnlocked(c: Cosmetic, completed: number, season: Season): boolean {
  if (c.season) return c.season === season;
  return completed >= c.unlockAt;
}

/** Everything the avatar has earned right now, seasonal pieces included. */
export function unlockedIds(completed: number, season: Season): string[] {
  return COSMETICS.filter((c) => isUnlocked(c, completed, season)).map(
    (c) => `${c.slot}:${c.id}`,
  );
}
