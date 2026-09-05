import type { LinkCard } from './types';
import { uid } from './id';

/* ---------------- images ---------------- */

/**
 * Everything lives in localStorage, so full-resolution photos are a quota
 * accident waiting to happen. Downscale to a sane box and re-encode.
 */
/**
 * Scale a picture down and hand back a Blob.
 *
 * Blobs rather than data URLs: a data URL is base64, which is a third bigger
 * than the bytes it carries and has to live in the document JSON. A Blob goes
 * to the browser's file store (lib/files.ts) and the document keeps an id.
 * That's also why the size cap is generous now — the old 1400px was rationing
 * a 5 MB localStorage budget that pictures no longer come out of.
 */
export function shrinkToBlob(
  source: Blob | string,
  maxSide = 2200,
  quality = 0.86,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const cleanup = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(img.src);
    };
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { cleanup(); reject(new Error('no canvas')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      // keep PNG for anything with transparency, JPEG for photographs
      const type = typeof source !== 'string' && source.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error('could not encode that image'));
        },
        type,
        type === 'image/jpeg' ? quality : undefined,
      );
    };
    img.onerror = () => { cleanup(); reject(new Error('could not load that image')); };
    img.src = typeof source === 'string' ? source : URL.createObjectURL(source);
  });
}

/** Any file from a drop or paste, not just pictures. */
export function fileFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return Array.from(dt.files ?? [])[0] ?? null;
}

export function shrinkImage(
  source: Blob | string,
  maxSide = 1400,
  quality = 0.82,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const cleanup = () => {
      if (typeof source !== 'string') URL.revokeObjectURL(img.src);
    };
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('no canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/webp', quality));
      } catch {
        resolve(canvas.toDataURL('image/jpeg', quality));
      }
      cleanup();
    };
    img.onerror = () => {
      cleanup();
      // A remote image that refuses canvas access can still be shown by URL.
      if (typeof source === 'string') resolve(source);
      else reject(new Error('could not read image'));
    };
    img.src = typeof source === 'string' ? source : URL.createObjectURL(source);
  });
}

/** Pull the first image out of a paste/drop, if there is one. */
export function imageFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null;
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  for (const f of Array.from(dt.files ?? [])) {
    if (f.type.startsWith('image/')) return f;
  }
  return null;
}

/* ---------------- links & embeds ---------------- */

export function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(t)) return `https://${t}`;
  return t;
}

export function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(normalizeUrl(raw));
    return u.protocol === 'http:' || u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

export function isUrlLike(raw: string) {
  return safeUrl(raw) !== null;
}

export type EmbedKind = 'youtube' | 'spotify' | 'maps' | 'vimeo' | 'soundcloud' | 'figma' | 'none';

export interface Embed {
  kind: EmbedKind;
  src: string;
  /** height relative to width, so the frame keeps its shape */
  ratio: number;
  label: string;
  allow?: string;
}

function youtubeId(u: URL): string | null {
  if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
  if (!u.hostname.includes('youtube.com')) return null;
  if (u.pathname === '/watch') return u.searchParams.get('v');
  const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]+)/);
  return m ? m[2] : null;
}

/** Turn a pasted link into a real embed when we recognise the service. */
export function toEmbed(raw: string): Embed {
  const u = safeUrl(raw);
  if (!u) return { kind: 'none', src: '', ratio: 0.5625, label: '' };
  const host = u.hostname.replace(/^www\./, '');

  const yt = youtubeId(u);
  if (yt) {
    const start = u.searchParams.get('t')?.replace(/\D/g, '');
    const q = start ? `?start=${start}` : '';
    return {
      kind: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${yt}${q}`,
      ratio: 0.5625,
      label: 'YouTube',
      allow: 'accelerometer; clipboard-write; encrypted-media; picture-in-picture; web-share',
    };
  }

  if (host.endsWith('spotify.com')) {
    const m = u.pathname.match(/\/(track|album|playlist|episode|show|artist)\/([\w]+)/);
    if (m) {
      const tall = m[1] === 'track' || m[1] === 'episode' ? 0.24 : 0.9;
      return {
        kind: 'spotify',
        src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`,
        ratio: tall,
        label: 'Spotify',
        allow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture',
      };
    }
  }

  if (host.endsWith('vimeo.com')) {
    const id = u.pathname.split('/').filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) {
      return {
        kind: 'vimeo',
        src: `https://player.vimeo.com/video/${id}`,
        ratio: 0.5625,
        label: 'Vimeo',
        allow: 'autoplay; fullscreen; picture-in-picture',
      };
    }
  }

  if (host.endsWith('soundcloud.com')) {
    return {
      kind: 'soundcloud',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.href)}&color=%23e8a598&visual=false`,
      ratio: 0.36,
      label: 'SoundCloud',
    };
  }

  if (host.endsWith('figma.com')) {
    return {
      kind: 'figma',
      src: `https://www.figma.com/embed?embed_host=nook&url=${encodeURIComponent(u.href)}`,
      ratio: 0.62,
      label: 'Figma',
    };
  }

  if (host.includes('google.') && u.pathname.startsWith('/maps')) {
    // Google's public maps embed works from a plain place query.
    const q =
      u.searchParams.get('q') ??
      decodeURIComponent(u.pathname.match(/\/maps\/place\/([^/]+)/)?.[1] ?? '').replace(/\+/g, ' ');
    const coords = u.href.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const query = q || (coords ? `${coords[1]},${coords[2]}` : '');
    if (query) {
      return {
        kind: 'maps',
        src: `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`,
        ratio: 0.72,
        label: 'Google Maps',
      };
    }
  }

  if (host.endsWith('openstreetmap.org')) {
    return { kind: 'maps', src: u.href, ratio: 0.72, label: 'Map' };
  }

  return { kind: 'none', src: '', ratio: 0.5625, label: '' };
}

function titleCaseFromSlug(slug: string) {
  return slug
    .replace(/[-_+]/g, ' ')
    .replace(/\.\w{2,5}$/, '')
    .replace(/%[0-9a-f]{2}/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Unfurl a link into a preview card.
 *
 * A browser can't read another site's <meta> tags (the browser blocks it for
 * privacy — that's CORS), and this app has no server. So instead of guessing
 * badly, we build the card from what the URL itself tells us plus the site's
 * own favicon, and let you rename it. Known services get a real thumbnail.
 */
export function unfurl(raw: string): LinkCard {
  const u = safeUrl(raw);
  const href = u?.href ?? raw.trim();
  const domain = u ? u.hostname.replace(/^www\./, '') : '';
  const segments = u ? u.pathname.split('/').filter(Boolean) : [];
  const last = segments[segments.length - 1] ?? '';

  const card: LinkCard = {
    id: uid(),
    url: href,
    domain,
    title: titleCaseFromSlug(last) || domain || href,
    description: u ? decodeURIComponent(u.pathname + u.search).slice(0, 140) : '',
    favicon: domain ? `https://icons.duckduckgo.com/ip3/${domain}.ico` : undefined,
  };

  if (!u) return card;

  const yt = youtubeId(u);
  if (yt) {
    card.provider = 'YouTube';
    card.image = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
    // the path is just "watch" or the raw id — neither makes a title
    card.title = 'YouTube video';
    card.description = 'Video on YouTube';
    return card;
  }

  if (domain.endsWith('spotify.com')) {
    const kind = u.pathname.match(/\/(track|album|playlist|episode|show|artist)\//)?.[1];
    card.provider = 'Spotify';
    card.title = kind ? `${kind[0].toUpperCase()}${kind.slice(1)} on Spotify` : 'Spotify';
    card.description = 'Listen on Spotify';
    return card;
  }

  if (domain === 'github.com' && segments.length >= 2) {
    card.provider = 'GitHub';
    card.title = `${segments[0]}/${segments[1]}`;
    card.description = 'Repository on GitHub';
    card.image = `https://opengraph.githubassets.com/1/${segments[0]}/${segments[1]}`;
    return card;
  }

  if (domain.includes('google.') && u.pathname.startsWith('/maps')) {
    card.provider = 'Google Maps';
    card.description = 'Location on Google Maps';
    return card;
  }

  if (domain.endsWith('wikipedia.org') && last) {
    card.provider = 'Wikipedia';
    card.description = 'Article on Wikipedia';
    return card;
  }

  if (domain.endsWith('notion.so')) card.provider = 'Notion';
  if (domain.endsWith('figma.com')) card.provider = 'Figma';
  if (domain.endsWith('docs.google.com')) card.provider = 'Google Docs';

  return card;
}

/** Rough byte size of a data URL, for the storage meter. */
export function approxBytes(s: string) {
  return Math.round((s.length * 3) / 4);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  // file quotas run to gigabytes now, and "10240.0 MB" reads like a bug
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
