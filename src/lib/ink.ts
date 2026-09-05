/**
 * How a stroke is drawn.
 *
 * A fineliner is an even line. A highlighter is wide, translucent and
 * multiplies with what's underneath, so overlaps darken the way real ink does.
 * A brush tapers — thin where the nib lands, thick through the middle, thin
 * again as it lifts — which is the difference between "a line" and "someone
 * drew this".
 *
 * The taper is why brush strokes are built as filled outlines rather than
 * stroked paths: SVG has no variable stroke width.
 */
import type { PenTexture, Stroke } from './types';

export interface InkStyle {
  /** draw as a filled outline rather than a stroked path */
  filled: boolean;
  width: number;
  opacity: number;
  blend?: 'multiply';
  cap: 'round' | 'butt';
}

export function inkStyle(stroke: Stroke, texture: PenTexture): InkStyle {
  // whatever the setting, a marker is always a highlighter
  if (stroke.tool === 'marker' || texture === 'highlighter') {
    return { filled: false, width: stroke.width * 2.6, opacity: 0.34, blend: 'multiply', cap: 'butt' };
  }
  if (texture === 'brush') {
    return { filled: true, width: stroke.width * 1.5, opacity: 0.92, cap: 'round' };
  }
  return { filled: false, width: stroke.width, opacity: 1, cap: 'round' };
}

/** Turn a flat point list into a smooth path with quadratic midpoints. */
export function strokePath(points: number[]): string {
  if (points.length < 4) {
    const [x = 0, y = 0] = points;
    return `M${x} ${y} l0.1 0.1`;
  }
  let d = `M${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    const mx = (points[i] + points[i + 2]) / 2;
    const my = (points[i + 1] + points[i + 3]) / 2;
    d += ` Q${points[i]} ${points[i + 1]} ${mx} ${my}`;
  }
  d += ` L${points[points.length - 2]} ${points[points.length - 1]}`;
  return d;
}

/**
 * A closed outline whose half-width tapers along the stroke. Walk up one side
 * offsetting by the normal, then back down the other.
 */
export function brushOutline(points: number[], maxWidth: number): string {
  const n = points.length / 2;
  if (n < 2) {
    const r = maxWidth / 2;
    const [x, y] = points;
    return `M${x - r} ${y} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
  }

  const at = (i: number) => [points[i * 2], points[i * 2 + 1]] as const;

  /** Thin at both ends, full through the middle. */
  const halfWidth = (i: number) => {
    const t = i / (n - 1);
    const ramp = 0.22;
    const ease = t < ramp ? t / ramp : t > 1 - ramp ? (1 - t) / ramp : 1;
    return (maxWidth / 2) * (0.3 + 0.7 * Math.sin((Math.PI / 2) * Math.min(1, ease)));
  };

  const left: string[] = [];
  const right: string[] = [];

  for (let i = 0; i < n; i++) {
    const [x, y] = at(i);
    const [px, py] = at(Math.max(0, i - 1));
    const [nx, ny] = at(Math.min(n - 1, i + 1));
    let dx = nx - px;
    let dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // normal is the tangent rotated a quarter turn
    const w = halfWidth(i);
    const ox = -dy * w;
    const oy = dx * w;
    left.push(`${(x + ox).toFixed(1)} ${(y + oy).toFixed(1)}`);
    right.push(`${(x - ox).toFixed(1)} ${(y - oy).toFixed(1)}`);
  }

  return `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
}

/**
 * A wobbly rounded rectangle, drawn as if by hand.
 *
 * The wobble is deterministic — derived from the seed — so a widget's edge
 * doesn't shimmer on every render. Perfect straight lines read as software; a
 * line that drifts a pixel or two reads as a person.
 */
export function wobblyRect(w: number, h: number, radius: number, seed: number, amp = 1.6): string {
  // a tiny deterministic PRNG; the exact constants don't matter, repeatability does
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const jitter = () => (rnd() - 0.5) * 2 * amp;

  const r = Math.min(radius, Math.min(w, h) / 2);
  const pts: string[] = [];
  const edge = (
    from: [number, number],
    to: [number, number],
    steps: number,
  ) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = from[0] + (to[0] - from[0]) * t + jitter();
      const y = from[1] + (to[1] - from[1]) * t + jitter();
      pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
    }
  };

  const start: [number, number] = [r, 0];
  pts.push(`M${start[0].toFixed(1)} ${(start[1] + jitter()).toFixed(1)}`);
  edge([r, 0], [w - r, 0], Math.max(2, Math.round(w / 60)));
  pts.push(`Q${(w + jitter()).toFixed(1)} ${jitter().toFixed(1)} ${w.toFixed(1)} ${r.toFixed(1)}`);
  edge([w, r], [w, h - r], Math.max(2, Math.round(h / 60)));
  pts.push(`Q${(w + jitter()).toFixed(1)} ${(h + jitter()).toFixed(1)} ${(w - r).toFixed(1)} ${h.toFixed(1)}`);
  edge([w - r, h], [r, h], Math.max(2, Math.round(w / 60)));
  pts.push(`Q${jitter().toFixed(1)} ${(h + jitter()).toFixed(1)} 0 ${(h - r).toFixed(1)}`);
  edge([0, h - r], [0, r], Math.max(2, Math.round(h / 60)));
  pts.push(`Q${jitter().toFixed(1)} ${jitter().toFixed(1)} ${r.toFixed(1)} 0`);
  pts.push('Z');
  return pts.join(' ');
}

/** A stable small number from a widget id, so its wobble never changes. */
export function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h;
}
