import { useMemo, useRef, useState } from 'react';
import { useDoc, useUI } from '../lib/store';
import { uid } from '../lib/id';
import type { PenTexture, Stroke } from '../lib/types';
import { brushOutline, inkStyle, strokePath } from '../lib/ink';

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
  const texture = useDoc((s) => s.doc.settings.penTexture);
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
      {strokes.map((s) => <Ink key={s.id} stroke={s} texture={texture} />)}
      {live && (
        <Ink
          stroke={{
            id: 'live', sectorId, color: penColor, width: penWidth,
            tool: tool === 'marker' ? 'marker' : 'pen', points: live,
          }}
          texture={texture}
        />
      )}
    </svg>
  );
}

/** One stroke, drawn according to the chosen texture. */
function Ink({ stroke, texture }: { stroke: Stroke; texture: PenTexture }) {
  const style = inkStyle(stroke, texture);

  if (style.filled) {
    return (
      <path
        d={brushOutline(stroke.points, style.width)}
        fill={stroke.color}
        fillOpacity={style.opacity}
        stroke={stroke.color}
        strokeWidth={0.6}
        strokeOpacity={style.opacity}
        strokeLinejoin="round"
      />
    );
  }

  return (
    <path
      d={strokePath(stroke.points)}
      stroke={stroke.color}
      strokeWidth={style.width}
      strokeOpacity={style.opacity}
      strokeLinecap={style.cap}
      strokeLinejoin="round"
      fill="none"
      style={style.blend ? { mixBlendMode: style.blend } : undefined}
    />
  );
}
