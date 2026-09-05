import { useMemo, useRef, useState } from 'react';
import { useDoc, useUI } from '../lib/store';
import { uid } from '../lib/id';
import type { Stroke } from '../lib/types';

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

function near(stroke: Stroke, x: number, y: number, r: number) {
  const p = stroke.points;
  for (let i = 0; i < p.length; i += 2) {
    if (Math.hypot(p[i] - x, p[i + 1] - y) <= r + stroke.width / 2) return true;
  }
  return false;
}

interface Props {
  sectorId: string;
  width: number;
  height: number;
}

export function DoodleLayer({ sectorId, width, height }: Props) {
  const allStrokes = useDoc((s) => s.doc.strokes);
  const strokes = useMemo(() => allStrokes.filter((x) => x.sectorId === sectorId), [allStrokes, sectorId]);
  const addStroke = useDoc((s) => s.addStroke);
  const eraseStrokes = useDoc((s) => s.eraseStrokes);
  const tool = useUI((s) => s.tool);
  const penColor = useUI((s) => s.penColor);
  const penWidth = useUI((s) => s.penWidth);

  const [live, setLive] = useState<number[] | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = tool === 'pen' || tool === 'marker';
  const active = drawing || tool === 'eraser';

  const point = (e: React.PointerEvent | PointerEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onDown = (e: React.PointerEvent) => {
    if (!active || e.button !== 0) return;
    const [x, y] = point(e);

    if (tool === 'eraser') {
      const hit = strokes.filter((s) => near(s, x, y, 12)).map((s) => s.id);
      if (hit.length) eraseStrokes(hit);
      const move = (ev: PointerEvent) => {
        const [mx, my] = point(ev);
        const ids = useDoc
          .getState()
          .doc.strokes.filter((s) => s.sectorId === sectorId && near(s, mx, my, 12))
          .map((s) => s.id);
        if (ids.length) eraseStrokes(ids);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      return;
    }

    let pts = [x, y];
    setLive(pts);
    const move = (ev: PointerEvent) => {
      const [mx, my] = point(ev);
      const lx = pts[pts.length - 2];
      const ly = pts[pts.length - 1];
      // skip micro-jitter so saved strokes stay small
      if (Math.hypot(mx - lx, my - ly) < 1.6) return;
      pts = [...pts, mx, my];
      setLive(pts);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setLive(null);
      if (pts.length >= 2) {
        addStroke({
          id: uid(),
          sectorId,
          color: penColor,
          width: penWidth,
          tool: tool === 'marker' ? 'marker' : 'pen',
          points: pts.map((n) => Math.round(n * 10) / 10),
        });
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onPointerDown={onDown}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        // the layer only swallows clicks while a drawing tool is chosen
        pointerEvents: active ? 'auto' : 'none',
        cursor: tool === 'eraser' ? 'cell' : drawing ? 'crosshair' : 'default',
        touchAction: 'none',
        zIndex: 8000,
        overflow: 'visible',
      }}
      aria-hidden={!active}
    >
      {strokes.map((s) => (
        <path
          key={s.id}
          d={strokePath(s.points)}
          stroke={s.color}
          strokeWidth={s.tool === 'marker' ? s.width * 2.6 : s.width}
          strokeOpacity={s.tool === 'marker' ? 0.34 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {live && (
        <path
          d={strokePath(live)}
          stroke={penColor}
          strokeWidth={tool === 'marker' ? penWidth * 2.6 : penWidth}
          strokeOpacity={tool === 'marker' ? 0.34 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    </svg>
  );
}
