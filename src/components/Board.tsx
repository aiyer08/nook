import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc, useUI, widgetsOf } from '../lib/store';
import type { Sector } from '../lib/types';
import { WidgetFrame } from './WidgetFrame';
import { WidgetBody } from './widgets';
import { DoodleLayer } from './DoodleLayer';
import { Icon } from './Icons';
import { imageFromDataTransfer, isUrlLike, normalizeUrl, shrinkImage, toEmbed, unfurl } from '../lib/media';
import { Empty } from './ui';

const PAD = 220;

export function Board({ sector }: { sector: Sector }) {
  const allWidgets = useDoc((s) => s.doc.widgets);
  const widgets = useMemo(() => widgetsOf(allWidgets, sector.id), [allWidgets, sector.id]);
  const addWidget = useDoc((s) => s.addWidget);
  const patchData = useDoc((s) => s.patchWidgetData);
  const tool = useUI((s) => s.tool);
  const dragging = useUI((s) => s.dragging);
  const setPanel = useUI((s) => s.setPanel);
  const select = useUI((s) => s.select);
  const toast = useUI((s) => s.toast);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dropping, setDropping] = useState(false);

  const size = useMemo(() => {
    const right = widgets.reduce((m, w) => Math.max(m, w.x + w.w), 0);
    const bottom = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    return { w: right + PAD, h: bottom + PAD };
  }, [widgets]);

  const drawing = tool !== 'select';

  /** Paste a screenshot or a link straight onto the page. */
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      const file = imageFromDataTransfer(e.clipboardData);
      if (file) {
        e.preventDefault();
        const id = addWidget(sector.id, 'image');
        try {
          patchData(id, { src: await shrinkImage(file), caption: '' });
          toast('Pasted a picture onto the page.');
        } catch {
          toast('Couldn’t read that image, sorry.', 'warn');
        }
        return;
      }

      const text = e.clipboardData?.getData('text')?.trim();
      if (text && isUrlLike(text)) {
        e.preventDefault();
        const url = normalizeUrl(text);
        const kind = toEmbed(url).kind === 'none' ? 'link' : 'embed';
        const id = addWidget(sector.id, kind);
        if (kind === 'embed') patchData(id, { url });
        else patchData(id, { links: [unfurl(url)] });
        toast(kind === 'embed' ? 'Embedded that link.' : 'Saved that link.');
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [sector.id, addWidget, patchData, toast]);

  return (
    <div
      ref={scrollRef}
      className="scroll"
      onPointerDown={(e) => { if (e.target === e.currentTarget) select(null); }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropping(true); }
      }}
      onDragLeave={(e) => { if (e.target === e.currentTarget) setDropping(false); }}
      onDrop={async (e) => {
        const file = imageFromDataTransfer(e.dataTransfer);
        setDropping(false);
        if (!file) return;
        e.preventDefault();
        const id = addWidget(sector.id, 'image');
        try {
          patchData(id, { src: await shrinkImage(file) });
        } catch {
          toast('Couldn’t read that image, sorry.', 'warn');
        }
      }}
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: 0,
        /**
         * Keeps the board its own stacking context. Without this the doodle
         * layer's high z-index competes with the whole page and paints over
         * open panels.
         */
        isolation: 'isolate',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: Math.max(size.w, 100),
          height: Math.max(size.h, 100),
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        <div className={`grid-hint ${dragging && sector.snap ? 'show' : ''}`} />

        {widgets.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
              <Empty icon="sparkle">
                This page is blank on purpose.<br />Add a widget and make it yours.
              </Empty>
              <button className="btn primary" onClick={() => setPanel('widgets')}>
                <Icon name="plus" size={16} /> Add a widget
              </button>
            </div>
          </div>
        )}

        {widgets.map((w) => (
          <WidgetFrame key={w.id} widget={w} sector={sector} locked={drawing}>
            <WidgetBody widget={w} sector={sector} />
          </WidgetFrame>
        ))}

        <DoodleLayer sectorId={sector.id} width={Math.max(size.w, 2000)} height={Math.max(size.h, 1400)} />
      </div>

      <AnimatePresence>
        {dropping && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 500,
            }}
          >
            <span
              className="hand"
              style={{
                display: 'block', fontSize: 26, padding: '14px 26px', borderRadius: 999,
                border: '3px dashed var(--accent)', background: 'var(--surface)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              Drop it anywhere
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
