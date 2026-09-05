import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDoc, useUI } from '../../lib/store';
import { deleteFile, putFile, urlFor } from '../../lib/files';
import type { LinkCard, Sector, Widget } from '../../lib/types';
import { Icon } from '../Icons';
import { Empty } from '../ui';
import {
  imageFromDataTransfer, isUrlLike, normalizeUrl,
  safeUrl, shrinkToBlob, toEmbed, unfurl,
} from '../../lib/media';

/* ------------------------------------------------------------------ */
/* notes                                                               */
/* ------------------------------------------------------------------ */

export function NotesWidget({ widget }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const value = widget.data.content ?? '';
  return (
    <textarea
      value={value}
      onChange={(e) => patch(widget.id, { content: e.target.value })}
      placeholder="Write anything. Nobody's marking this."
      aria-label={widget.title}
      style={{
        flex: 1, width: '100%', border: 'none', background: 'transparent',
        padding: '2px 4px', fontSize: 14, lineHeight: '26px', resize: 'none',
        // ruled paper, so an empty page still looks like something
        backgroundImage:
          'repeating-linear-gradient(transparent, transparent 25px, color-mix(in srgb, var(--ink) 12%, transparent) 25px, color-mix(in srgb, var(--ink) 12%, transparent) 26px)',
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* note to self (handwritten)                                          */
/* ------------------------------------------------------------------ */

export function QuoteWidget({ widget }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
      <textarea
        className="hand"
        value={widget.data.text ?? ''}
        onChange={(e) => patch(widget.id, { text: e.target.value })}
        placeholder="One kind line…"
        aria-label="Note to self"
        style={{
          flex: 1, border: 'none', background: 'transparent', resize: 'none',
          fontSize: 27, lineHeight: 1.25, textAlign: 'center', padding: '10px 4px',
        }}
      />
      <input
        value={widget.data.author ?? ''}
        onChange={(e) => patch(widget.id, { author: e.target.value })}
        placeholder="— who said it"
        aria-label="Attribution"
        style={{
          border: 'none', background: 'transparent', textAlign: 'center',
          fontSize: 12.5, color: 'var(--ink-soft)', padding: 0,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* image                                                               */
/* ------------------------------------------------------------------ */

/**
 * Resolve a picture to something an <img> can point at.
 *
 * A stored file has no URL until one is minted, so this is async and returns
 * '' for the first render. `src` is still honoured for boards made before
 * there was a file store, and for images hot-linked from the web.
 */
function useFileUrl(fileId: string | undefined, src: string | undefined): string {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!fileId) { setUrl(''); return; }
    let alive = true;
    void urlFor(fileId).then((u) => { if (alive) setUrl(u ?? ''); });
    return () => { alive = false; };
  }, [fileId]);
  return fileId ? url : (src ?? '');
}

export function ImageWidget({ widget }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const toast = useUI((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const src = useFileUrl(widget.data.fileId, widget.data.src);
  const fit = widget.data.fit ?? 'cover';

  /** Swap in a new picture, and don't leave the old bytes lying about. */
  const store = async (blob: Blob, name: string) => {
    const previous = widget.data.fileId;
    const stored = await putFile(blob, name);
    patch(widget.id, {
      fileId: stored.id, fileName: stored.name, mime: stored.mime, size: stored.size, src: '',
    });
    if (previous) void deleteFile(previous);
  };

  const take = async (file: File) => {
    setBusy(true);
    try {
      await store(await shrinkToBlob(file), file.name);
    } catch {
      toast('Couldn’t read that image, sorry.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const takeUrl = async () => {
    const url = normalizeUrl(urlDraft);
    if (!safeUrl(url)) { toast('That doesn’t look like a link.', 'warn'); return; }
    setBusy(true);
    try {
      // Keep a copy so it survives the other site deleting it; if the host
      // won't allow that, fall back to hot-linking.
      await store(await shrinkToBlob(url), 'from the web');
    } catch {
      patch(widget.id, { src: url, fileId: undefined });
    } finally {
      setBusy(false);
      setUrlDraft('');
      setShowUrl(false);
    }
  };

  const clear = () => {
    if (widget.data.fileId) void deleteFile(widget.data.fileId);
    patch(widget.id, { src: '', fileId: undefined, fileName: undefined, mime: undefined, size: undefined });
  };

  // Paste a screenshot straight in while this widget is focused.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = imageFromDataTransfer(e.clipboardData);
      if (file) { e.preventDefault(); void take(file); return; }
      const text = e.clipboardData?.getData('text');
      if (text && isUrlLike(text)) { e.preventDefault(); setUrlDraft(text); setShowUrl(true); }
    };
    el.addEventListener('paste', onPaste as EventListener);
    return () => el.removeEventListener('paste', onPaste as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id]);

  return (
    <div
      ref={boxRef}
      tabIndex={0}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = imageFromDataTransfer(e.dataTransfer);
        if (f) void take(f);
      }}
      style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 7,
        outline: over ? '3px dashed var(--accent)' : 'none', outlineOffset: 4, borderRadius: 12,
      }}
      aria-label="Image widget. Paste or drop a picture here."
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void take(f); e.target.value = ''; }}
      />

      {src ? (
        <>
          <div
            style={{
              flex: 1, minHeight: 60, borderRadius: 14, overflow: 'hidden',
              border: '3px solid var(--line)', background: 'var(--surface-2)',
            }}
          >
            <img
              src={src}
              alt={widget.data.caption || 'Saved image'}
              style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
            />
          </div>
          <input
            value={widget.data.caption ?? ''}
            onChange={(e) => patch(widget.id, { caption: e.target.value })}
            placeholder="Caption…"
            aria-label="Caption"
            className="hand"
            style={{ border: 'none', background: 'transparent', fontSize: 18, textAlign: 'center', padding: 0 }}
          />
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <button className="btn tiny" onClick={() => patch(widget.id, { fit: fit === 'cover' ? 'contain' : 'cover' })}>
              {fit === 'cover' ? 'Fill' : 'Fit'}
            </button>
            <button className="btn tiny" onClick={() => fileRef.current?.click()}>Replace</button>
            <button className="btn ghost tiny" onClick={clear}>Clear</button>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', gap: 10 }}>
          <Empty icon="image">
            {busy ? 'One moment…' : 'Drop a picture, paste a screenshot, or pick a file.'}
          </Empty>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn tiny primary" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={13} /> Choose file
            </button>
            <button className="btn tiny" onClick={() => setShowUrl((v) => !v)}>
              <Icon name="link" size={13} /> From a link
            </button>
          </div>
          {showUrl && (
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <input
                autoFocus
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void takeUrl(); }}
                placeholder="https://…"
                aria-label="Image link"
                style={{ flex: 1, padding: '6px 10px', fontSize: 12.5, borderWidth: 2 }}
              />
              <button className="btn tiny primary" onClick={() => void takeUrl()}>Add</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* links                                                               */
/* ------------------------------------------------------------------ */

export function LinkWidget({ widget, sector }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const toast = useUI((s) => s.toast);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const links = widget.data.links ?? [];
  const accent = widget.accent ?? sector.accent;

  const add = (raw: string) => {
    const url = normalizeUrl(raw);
    if (!safeUrl(url)) { toast('That doesn’t look like a link.', 'warn'); return; }
    patch(widget.id, { links: [...links, unfurl(url)] });
    setDraft('');
  };

  const edit = (id: string, p: Partial<LinkCard>) =>
    patch(widget.id, { links: links.map((l) => (l.id === id ? { ...l, ...p } : l)) });

  const drop = (id: string) => patch(widget.id, { links: links.filter((l) => l.id !== id) });

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}
      onPaste={(e) => {
        const text = e.clipboardData.getData('text');
        if (text && isUrlLike(text)) { e.preventDefault(); add(text); }
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
          placeholder="Paste a link…"
          aria-label="New link"
          style={{ flex: 1, padding: '8px 12px', fontSize: 13.5 }}
        />
        <button className="btn icon primary" onClick={() => add(draft)} aria-label="Add link" style={{ padding: 8 }}>
          <Icon name="plus" size={16} />
        </button>
      </div>

      <div className="scroll" style={{ flex: 1, minHeight: 0, marginRight: -6, paddingRight: 6 }}>
        {links.length === 0 && <Empty icon="link">Nothing saved yet. Paste something good.</Empty>}
        <AnimatePresence initial={false}>
          {links.map((l) => (
            <motion.div
              key={l.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                border: '2px solid var(--line)', borderRadius: 'var(--r)',
                marginBottom: 7, background: 'var(--surface-2)', overflow: 'hidden',
              }}
            >
              {l.image && (
                <a href={l.url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={l.image}
                    alt=""
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    style={{ width: '100%', height: 96, objectFit: 'cover', display: 'block', borderBottom: '2px solid var(--line)' }}
                  />
                </a>
              )}
              <div style={{ padding: 9, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                <span
                  style={{
                    width: 28, height: 28, borderRadius: 9, flexShrink: 0, display: 'grid',
                    placeItems: 'center', background: accent, border: '2px solid var(--line)',
                    overflow: 'hidden',
                  }}
                >
                  {l.favicon ? (
                    <img
                      src={l.favicon}
                      alt=""
                      width={16}
                      height={16}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                  ) : (
                    <Icon name="link" size={14} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editing === l.id ? (
                    <div style={{ display: 'grid', gap: 5 }}>
                      <input value={l.title} onChange={(e) => edit(l.id, { title: e.target.value })} aria-label="Link title" style={{ padding: '4px 8px', fontSize: 12.5, borderWidth: 2, fontWeight: 700 }} />
                      <input value={l.description} onChange={(e) => edit(l.id, { description: e.target.value })} placeholder="What is this?" aria-label="Link note" style={{ padding: '4px 8px', fontSize: 12, borderWidth: 2 }} />
                    </div>
                  ) : (
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none', display: 'block', minWidth: 0 }}
                    >
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, wordBreak: 'break-word' }}>
                        {l.title}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-soft)' }}>
                        {l.provider ? `${l.provider} · ` : ''}{l.domain}
                      </span>
                      {l.description && (
                        <span
                          style={{
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            overflow: 'hidden', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2,
                          }}
                        >
                          {l.description}
                        </span>
                      )}
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <button className="btn ghost tiny" onClick={() => setEditing(editing === l.id ? null : l.id)} aria-label="Edit link" style={{ padding: 3 }}>
                    <Icon name="pencil" size={12} />
                  </button>
                  <button className="btn ghost tiny" onClick={() => drop(l.id)} aria-label="Remove link" style={{ padding: 3 }}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {links.length > 0 && (
        <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-faint)', lineHeight: 1.4 }}>
          Titles come from the address itself — tap the pencil to name one properly.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* embeds                                                              */
/* ------------------------------------------------------------------ */

export function EmbedWidget({ widget }: { widget: Widget; sector: Sector }) {
  const patch = useDoc((s) => s.patchWidgetData);
  const [draft, setDraft] = useState('');
  const url = widget.data.url ?? '';
  const embed = toEmbed(url);

  if (!url) {
    return (
      <div
        style={{ flex: 1, display: 'grid', placeItems: 'center', gap: 10 }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text && isUrlLike(text)) { e.preventDefault(); patch(widget.id, { url: normalizeUrl(text) }); }
        }}
      >
        <Empty icon="play">Paste a YouTube, Spotify, Vimeo, Figma or Maps link.</Empty>
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') patch(widget.id, { url: normalizeUrl(draft) }); }}
            placeholder="https://…"
            aria-label="Embed link"
            style={{ flex: 1, padding: '7px 11px', fontSize: 13, borderWidth: 2 }}
          />
          <button className="btn tiny primary" onClick={() => patch(widget.id, { url: normalizeUrl(draft) })}>
            Embed
          </button>
        </div>
      </div>
    );
  }

  if (embed.kind === 'none') {
    const u = safeUrl(url);
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', gap: 8, textAlign: 'center' }}>
        <Empty icon="link">
          That one won’t play inside a page — but the link still works.
        </Empty>
        {u && (
          <a className="btn tiny primary" href={u.href} target="_blank" rel="noopener noreferrer">
            Open {u.hostname.replace(/^www\./, '')}
          </a>
        )}
        <button className="btn ghost tiny" onClick={() => patch(widget.id, { url: '' })}>Try another link</button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0 }}>
      <div
        style={{
          flex: 1, minHeight: 80, borderRadius: 14, overflow: 'hidden',
          border: '3px solid var(--line)', background: '#000',
        }}
      >
        <iframe
          src={embed.src}
          title={`${embed.label} embed`}
          allow={embed.allow}
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span className="chip" style={{ padding: '2px 8px', fontSize: 11 }}>{embed.label}</span>
        <span style={{ flex: 1 }} />
        <button className="btn ghost tiny" onClick={() => patch(widget.id, { url: '' })}>Change</button>
      </div>
    </div>
  );
}
