import type { EffortTag } from './types';
import type { IconName } from '../components/Icons';

/**
 * Effort tags instead of P1/P2/P3. "What have I got the energy for right now"
 * is a more useful question than "what did I decide was important last week".
 */
export const EFFORTS: {
  id: EffortTag; label: string; short: string; icon: IconName; tint: string;
}[] = [
  { id: 'quick', label: '5 min',     short: '5m',   icon: 'bolt',  tint: '#EFCE7B' },
  { id: 'short', label: '15 min',    short: '15m',  icon: 'clock', tint: '#9FCFB8' },
  { id: 'focus', label: 'Focus',     short: 'focus', icon: 'target', tint: '#A3C4E0' },
  { id: 'deep',  label: 'Deep work', short: 'deep',  icon: 'brain',  tint: '#C0A9DB' },
];

export function effortOf(id?: EffortTag) {
  return EFFORTS.find((e) => e.id === id);
}
