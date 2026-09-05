/**
 * Hand-drawn line icons. Stroke-based with round caps so they sit next to
 * rounded type — and never emoji, which render differently on every device.
 */
import type { CSSProperties } from 'react';

export type IconName =
  | 'briefcase' | 'book' | 'heart' | 'people' | 'house' | 'coin' | 'palette' | 'moon'
  | 'star' | 'leaf' | 'cup' | 'paw' | 'music' | 'plane' | 'camera' | 'sparkle'
  | 'plus' | 'close' | 'check' | 'undo' | 'redo' | 'gear' | 'pen' | 'marker'
  | 'eraser' | 'trash' | 'copy' | 'grip' | 'calendar' | 'note' | 'link' | 'image'
  | 'play' | 'clock' | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'chevronUp'
  | 'download' | 'upload' | 'sound' | 'mute' | 'sun' | 'target' | 'cake' | 'repeat'
  | 'grid' | 'today' | 'list' | 'lock' | 'pencil' | 'dots' | 'flag' | 'bolt' | 'brain'
  | 'search' | 'sprout' | 'drop' | 'flame' | 'snow' | 'timer' | 'lamp';

const P: Record<IconName, string> = {
  briefcase: 'M3 8.5h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10Z M9 8.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2.5 M3 13h18',
  book: 'M4 4.5h7.5a2.5 2.5 0 0 1 2.5 2.5v13a2 2 0 0 0-2-2H4v-13Z M20 4.5h-4a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4v-13Z',
  heart: 'M12 20s-7-4.3-7-9.2A4 4 0 0 1 12 8.4 4 4 0 0 1 19 10.8C19 15.7 12 20 12 20Z',
  people: 'M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5 M16 6.2a3 3 0 0 1 0 5.6 M17 15.4c2.3.6 4 2.3 4 4.6',
  house: 'M4 11 12 4.5l8 6.5 M6 10v9.5h12V10 M10 19.5V14h4v5.5',
  coin: 'M12 20c4.4 0 8-1.6 8-3.6V7.6C20 5.6 16.4 4 12 4S4 5.6 4 7.6v8.8C4 18.4 7.6 20 12 20Z M4 7.6c0 2 3.6 3.6 8 3.6s8-1.6 8-3.6 M4 12.2c0 2 3.6 3.6 8 3.6s8-1.6 8-3.6',
  palette: 'M12 20.5c-4.7 0-8.5-3.7-8.5-8.3S7.3 3.5 12 3.5s8.5 3.3 8.5 7.4c0 2.4-2 3.6-4 3.6h-1.3c-1.2 0-2.2 1-2.2 2.2 0 .5.2 1 .5 1.4.3.5 0 1.4-1.5 1.4Z M8 9.5h.01 M12 7.5h.01 M16 10h.01',
  moon: 'M20 14.5A8.4 8.4 0 0 1 9.4 4 8.5 8.5 0 1 0 20 14.5Z',
  star: 'm12 4 2.4 5 5.6.7-4 3.9 1 5.4-5-2.7-5 2.7 1-5.4-4-3.9 5.6-.7L12 4Z',
  leaf: 'M5 19c0-8 5-13 15-13 0 8-4.4 12.6-11 12.6 M5 19c2-3.5 4.4-6 8-7.6',
  cup: 'M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z M16 10h2a2.5 2.5 0 0 1 0 5h-2 M8 5V3.5 M12 5V3.5',
  paw: 'M8 15.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5c0 2.2-1.6 3.5-4 3.5s-4-1.3-4-3.5Z M7 9.5a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4Z M17 9.5a1.6 2 0 1 0 0-4 1.6 2 0 0 0 0 4Z M3.8 13.6a1.4 1.8 0 1 0 0-3.6 1.4 1.8 0 0 0 0 3.6Z M20.2 13.6a1.4 1.8 0 1 0 0-3.6 1.4 1.8 0 0 0 0 3.6Z',
  music: 'M9 18V6.5l10-2V16 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z M19 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  plane: 'M3 13.5 21 5l-4.5 15-4-6-6-1.5Z M8.5 12.5 12.5 14',
  camera: 'M4 8h3.5l1.5-2.5h6L16.5 8H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8Z M12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
  sparkle: 'M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.6 10.4 12.2 5 10.6 10.4 9 12 3.5Z M18.5 16.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6.5 6.5l11 11 M17.5 6.5l-11 11',
  check: 'M5 12.5 10 17.5 19.5 6.5',
  undo: 'M9 8.5H5.5V5 M5.8 8.8A7.5 7.5 0 1 1 4.6 14',
  redo: 'M15 8.5h3.5V5 M18.2 8.8A7.5 7.5 0 1 0 19.4 14',
  gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1Z',
  pen: 'M4 20l1.2-4.2L15.6 5.4a2 2 0 0 1 2.8 0l.2.2a2 2 0 0 1 0 2.8L8.2 18.8 4 20Z M14.5 6.5l3 3',
  marker: 'M6 19h12 M8 15.5l7.5-9.6a2 2 0 0 1 3 -.2l.6.6a2 2 0 0 1-.2 3L9.3 16.8 6 17.5l2-2Z',
  eraser: 'M8.5 19.5 4 15a1.8 1.8 0 0 1 0-2.6l8-8a1.8 1.8 0 0 1 2.6 0l5 5a1.8 1.8 0 0 1 0 2.6l-7.5 7.5H8.5Z M9.5 9.5 15 15 M4 20h16',
  trash: 'M4.5 7h15 M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2 M6.5 7l.8 11.5A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9L17.5 7 M10 11v6 M14 11v6',
  copy: 'M9 9.5A2.5 2.5 0 0 1 11.5 7h7A2.5 2.5 0 0 1 21 9.5v7a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 9 16.5v-7Z M15 7V5.5A2.5 2.5 0 0 0 12.5 3h-7A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15H7',
  grip: 'M9 6h.01 M15 6h.01 M9 12h.01 M15 12h.01 M9 18h.01 M15 18h.01',
  calendar: 'M4 7.5A2 2 0 0 1 6 5.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11Z M8 3.5V7 M16 3.5V7 M4 11h16',
  note: 'M6 3.5h8.5L19 8v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1-1.5Z M14 3.5V8h4.5 M8.5 12.5h7 M8.5 16.5h4',
  link: 'M10 13.5a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.2 1.2 M14 10.5a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.2-1.2',
  image: 'M4 6.5A2 2 0 0 1 6 4.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11Z M8.5 11a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6Z M4.5 16.5 9 12.5l4 3.4 3-2.4 3.5 3',
  play: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z M10 8.8l6 3.2-6 3.2V8.8Z',
  clock: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z M12 7.5V12l3 2',
  chevronLeft: 'M14.5 6 8.5 12l6 6',
  chevronRight: 'M9.5 6l6 6-6 6',
  chevronDown: 'M6 9.5 12 15.5l6-6',
  chevronUp: 'M6 14.5 12 8.5l6 6',
  download: 'M12 4v10 M8 10.5l4 4 4-4 M4.5 18.5h15',
  upload: 'M12 15V5 M8 8.5l4-4 4 4 M4.5 18.5h15',
  sound: 'M4 9.5h3.5L12 5.5v13L7.5 14.5H4v-5Z M15.5 9.5a3.5 3.5 0 0 1 0 5 M18 7a7 7 0 0 1 0 10',
  mute: 'M4 9.5h3.5L12 5.5v13L7.5 14.5H4v-5Z M16 9.5l4.5 5 M20.5 9.5l-4.5 5',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z M12 2.5V4 M12 20v1.5 M4.2 4.2l1.1 1.1 M18.7 18.7l1.1 1.1 M2.5 12H4 M20 12h1.5 M4.2 19.8l1.1-1.1 M18.7 5.3l1.1-1.1',
  target: 'M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z M12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z M12 13.4a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z',
  cake: 'M4.5 20.5h15 M5.5 20.5v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6 M5.5 16.5c1.4 0 1.4 1.4 2.8 1.4s1.4-1.4 2.8-1.4 1.4 1.4 2.8 1.4 1.4-1.4 2.8-1.4 1.4 1.4 2.3 1.4 M12 12.5V9 M12 6.8a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8Z',
  repeat: 'M4 9.5A3.5 3.5 0 0 1 7.5 6h11l-2.5-2.5 M18.5 6 16 8.5 M20 14.5a3.5 3.5 0 0 1-3.5 3.5h-11L8 20.5 M5.5 18 8 15.5',
  grid: 'M4.5 4.5h6v6h-6v-6Z M13.5 4.5h6v6h-6v-6Z M4.5 13.5h6v6h-6v-6Z M13.5 13.5h6v6h-6v-6Z',
  today: 'M4 7.5A2 2 0 0 1 6 5.5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11Z M8 3.5V7 M16 3.5V7 M4 11h16 M8.5 15.5h4',
  list: 'M9 6.5h11 M9 12h11 M9 17.5h11 M4.5 6.5h.01 M4.5 12h.01 M4.5 17.5h.01',
  lock: 'M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-6A1.5 1.5 0 0 1 6.5 11Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  pencil: 'M4 20l1-3.6L16.2 5.2a1.7 1.7 0 0 1 2.4 0l.2.2a1.7 1.7 0 0 1 0 2.4L7.6 19l-3.6 1Z',
  dots: 'M6 12h.01 M12 12h.01 M18 12h.01',
  flag: 'M6 21V4 M6 5.2c4-2 8 2 12 0v8c-4 2-8-2-12 0',
  bolt: 'M13.5 3 5.5 13.5h5L10 21l8-10.5h-5L13.5 3Z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z M15.4 15.4 20 20',
  sprout: 'M12 20.5V11 M12 11C12 8 9.6 6 6.5 6c0 3 2.4 5 5.5 5Z M12 11c0-3 2.4-5 5.5-5 0 3-2.4 5-5.5 5Z M8 20.5h8',
  drop: 'M12 3.5s6 6.4 6 10.3A6 6 0 0 1 6 13.8C6 9.9 12 3.5 12 3.5Z',
  flame: 'M12 21c3.3 0 6-2.4 6-5.5 0-4.4-6-12-6-12s-6 7.6-6 12C6 18.6 8.7 21 12 21Z M12 21c1.7 0 3-1.2 3-2.8 0-2.2-3-5.7-3-5.7s-3 3.5-3 5.7c0 1.6 1.3 2.8 3 2.8Z',
  snow: 'M12 3v18 M4.2 7.5 19.8 16.5 M19.8 7.5 4.2 16.5 M12 7l2.5-2 M12 7 9.5 5 M12 17l2.5 2 M12 17l-2.5 2',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M12 9v4l2.5 1.5 M9 3h6',
  lamp: 'M7 10.5 12 3.5l5 7H7Z M12 10.5V20 M8.5 20h7',
  brain: 'M9.5 4.5A2.6 2.6 0 0 0 7 7a2.4 2.4 0 0 0-1.5 4.3A2.6 2.6 0 0 0 6.5 16a2.5 2.5 0 0 0 3 3.4V4.5Z M14.5 4.5A2.6 2.6 0 0 1 17 7a2.4 2.4 0 0 1 1.5 4.3 2.6 2.6 0 0 1-1 4.7 2.5 2.5 0 0 1-3 3.4V4.5Z M12 4.5v15',
};

export const ICON_NAMES = Object.keys(P) as IconName[];

/** Icons picked as sector symbols during setup. */
export const SECTOR_ICONS: IconName[] = [
  'briefcase', 'book', 'heart', 'people', 'house', 'coin', 'palette', 'moon',
  'star', 'leaf', 'cup', 'paw', 'music', 'plane', 'camera', 'sparkle', 'brain', 'bolt',
];

interface Props {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 20, stroke = 2, color = 'currentColor', style, className }: Props) {
  const d = P[name] ?? P.sparkle;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}
