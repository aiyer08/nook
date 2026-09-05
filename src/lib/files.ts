/**
 * Where the big things live.
 *
 * The document is JSON in localStorage: quick, synchronous, and capped at
 * about 5 MB per site. That's a hard browser limit rather than a setting, and
 * it's *characters*, so a base64'd file costs a third more than the file
 * itself. One phone photo is a megabyte or three of that budget, which is why
 * a few pictures used to fill the whole app up.
 *
 * So files go in IndexedDB instead — as Blobs, with no base64 inflation — and
 * the document keeps only an id. IndexedDB is given a share of free disk
 * (browsers here report quotas in the gigabytes), which is the difference
 * between "a handful of pictures" and "every PDF you'll ever apply with".
 *
 * Everything here is async because IndexedDB is. The document stays
 * synchronous, so nothing in the app has to wait on a file to render a page.
 */
import type { Doc } from './types';

const DB_NAME = 'nook.files';
const DB_VERSION = 1;
const STORE = 'files';

export interface StoredFile {
  id: string;
  /** the name it had on disk, for downloads */
  name: string;
  mime: string;
  size: number;
  addedAt: number;
}

interface Record extends StoredFile {
  blob: Blob;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser has no file store.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open the file store.'));
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('The file store said no.'));
  }));
}

function newId(): string {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Save a file. Returns what the document should remember about it. */
export async function putFile(blob: Blob, name: string): Promise<StoredFile> {
  const meta: StoredFile = {
    id: newId(),
    name: name || 'file',
    mime: blob.type || 'application/octet-stream',
    size: blob.size,
    addedAt: Date.now(),
  };
  await run('readwrite', (s) => s.put({ ...meta, blob } as Record));
  return meta;
}

export async function getFile(id: string): Promise<Record | null> {
  const hit = await run<Record | undefined>('readonly', (s) => s.get(id));
  return hit ?? null;
}

export async function deleteFile(id: string): Promise<void> {
  releaseUrl(id);
  await run('readwrite', (s) => s.delete(id));
}

/** Metadata for everything stored. Blob references are lazy, so this is cheap. */
export async function listFiles(): Promise<StoredFile[]> {
  const all = await run<Record[]>('readonly', (s) => s.getAll());
  return all
    .map(({ id, name, mime, size, addedAt }) => ({ id, name, mime, size, addedAt }))
    .sort((a, b) => b.addedAt - a.addedAt);
}

/* ---------------- object URLs ---------------- */

const urls = new Map<string, string>();

/**
 * A URL you can point an <img> or a link at. Cached, because minting a new
 * object URL on every render leaks one per render.
 */
export async function urlFor(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  const hit = await getFile(id);
  if (!hit) return null;
  const url = URL.createObjectURL(hit.blob);
  urls.set(id, url);
  return url;
}

export function releaseUrl(id: string) {
  const url = urls.get(id);
  if (!url) return;
  URL.revokeObjectURL(url);
  urls.delete(id);
}

/* ---------------- housekeeping ---------------- */

/**
 * Every file id the document points at. Anything in the store that isn't in
 * here is an orphan — a picture whose widget was deleted, say.
 *
 * This is the function that must not miss a place, so it's pure and tested.
 */
export function fileIdsIn(doc: Doc): string[] {
  const ids = new Set<string>();
  for (const w of doc.widgets ?? []) {
    if (w.data?.fileId) ids.add(w.data.fileId);
  }
  for (const m of doc.materials ?? []) {
    if (m.fileId) ids.add(m.fileId);
  }
  return [...ids];
}

export function orphans(stored: string[], used: string[]): string[] {
  const keep = new Set(used);
  return stored.filter((id) => !keep.has(id));
}

/** Delete anything the document no longer points at. */
export async function sweep(doc: Doc): Promise<{ removed: number; bytes: number }> {
  const stored = await listFiles();
  const dead = orphans(stored.map((f) => f.id), fileIdsIn(doc));
  let bytes = 0;
  for (const id of dead) {
    bytes += stored.find((f) => f.id === id)?.size ?? 0;
    await deleteFile(id);
  }
  return { removed: dead.length, bytes };
}

export async function totalBytes(): Promise<number> {
  const all = await listFiles();
  return all.reduce((n, f) => n + f.size, 0);
}

/** What the browser says we may use. Absent on browsers that won't say. */
export async function estimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  if (typeof e.usage !== 'number' || typeof e.quota !== 'number') return null;
  return { usage: e.usage, quota: e.quota };
}

/* ---------------- kinds, for icons and wording ---------------- */

export type FileKind = 'pdf' | 'image' | 'doc' | 'other';

export function kindOfMime(mime: string, name = ''): FileKind {
  const m = mime.toLowerCase();
  const n = name.toLowerCase();
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.startsWith('image/')) return 'image';
  if (/word|opendocument|rtf|text\//.test(m) || /\.(docx?|odt|rtf|txt|md|pages)$/.test(n)) return 'doc';
  return 'other';
}

/* ---------------- backups ---------------- */

/**
 * How much file data a backup will carry inline.
 *
 * A backup is a single JSON file you download, so embedding files means
 * base64 in a string — fine for a few PDFs, not fine for a gigabyte of
 * photos. Over the limit we export the document alone and say so plainly,
 * rather than freezing the tab building a file nobody can open.
 */
export const EMBED_LIMIT = 20 * 1024 * 1024;

export function shouldEmbed(totalBytes: number): boolean {
  return totalBytes > 0 && totalBytes <= EMBED_LIMIT;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  // chunked, because apply() on a megabyte-long array blows the stack
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

export interface FileBundle extends StoredFile {
  base64: string;
}

/** Files, packed for a backup. */
export async function packFiles(): Promise<FileBundle[]> {
  const metas = await listFiles();
  const out: FileBundle[] = [];
  for (const meta of metas) {
    const hit = await getFile(meta.id);
    if (!hit) continue;
    out.push({ ...meta, base64: await blobToBase64(hit.blob) });
  }
  return out;
}

/** Put backed-up files back, keeping their ids so the document still matches. */
export async function unpackFiles(bundles: FileBundle[]): Promise<number> {
  let restored = 0;
  for (const b of bundles) {
    if (!b?.id || typeof b.base64 !== 'string') continue;
    const blob = base64ToBlob(b.base64, b.mime || 'application/octet-stream');
    await run('readwrite', (s) => s.put({
      id: b.id, name: b.name, mime: b.mime, size: blob.size, addedAt: b.addedAt || Date.now(), blob,
    } as Record));
    restored += 1;
  }
  return restored;
}

/* ---------------- moving old boards over ---------------- */

/**
 * Pictures used to be base64 data URLs inside the document. That's where the
 * old "your board is too full" wall came from: a couple of photos and the 5 MB
 * localStorage budget was gone.
 *
 * This walks a board once, moves any baked-in picture into the file store, and
 * reports the swaps for the caller to apply. Nothing is changed here — the
 * store does that in one commit — and a failure on one picture leaves that one
 * exactly as it was rather than losing it.
 */
export interface Migration {
  widgetId: string;
  file: StoredFile;
  freedChars: number;
}

export async function migrateInlineImages(doc: Doc): Promise<Migration[]> {
  const out: Migration[] = [];
  for (const w of doc.widgets ?? []) {
    const src = w.data?.src;
    if (!src || !src.startsWith('data:') || w.data?.fileId) continue;
    try {
      const blob = await (await fetch(src)).blob();
      const file = await putFile(blob, w.data.caption?.trim() || `${w.title || 'picture'}`);
      out.push({ widgetId: w.id, file, freedChars: src.length });
    } catch {
      /* leave this one inline rather than lose it */
    }
  }
  return out;
}
