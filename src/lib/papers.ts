/**
 * Looking up a paper from a DOI or an arXiv link. No key, no backend.
 *
 * Two registries, because of a wrinkle worth recording:
 *
 *  - **Crossref** (`api.crossref.org`) sends `Access-Control-Allow-Origin: *`,
 *    so the browser can query it directly. It covers journal DOIs.
 *  - **arXiv's own API** (`export.arxiv.org`) sends *no* CORS header at all, so
 *    a page cannot call it however open it otherwise is. But every arXiv paper
 *    also has a DOI registered with **DataCite** (`10.48550/arXiv.<id>`), and
 *    DataCite does send CORS headers. So arXiv ids are resolved through there.
 *
 * Crossref asks that callers identify themselves; `mailto` in the query is
 * their documented way of doing it.
 *
 * Everything degrades to "we couldn't find it, type it in yourself" rather
 * than inventing metadata.
 */
import type { Paper } from './types';
import { today } from './dates';
import { uid } from './id';

const CROSSREF = 'https://api.crossref.org/works';
const DATACITE = 'https://api.datacite.org/dois';
/** arXiv's DOI prefix at DataCite. */
export const ARXIV_DOI = '10.48550/arXiv.';

export interface Lookup {
  kind: 'doi' | 'arxiv' | 'url' | 'none';
  doi?: string;
  arxivId?: string;
  url?: string;
}

/** Work out what someone just pasted. */
export function identify(raw: string): Lookup {
  const s = raw.trim();
  if (!s) return { kind: 'none' };

  // a DOI, bare or inside any URL
  const doi = s.match(/\b(10\.\d{4,9}\/[-._;()/:a-z0-9]+)\b/i);
  if (doi) return { kind: 'doi', doi: doi[1].replace(/[.,;)]+$/, '') };

  // arXiv: modern 2401.12345 or the old cs/0501001 form
  const arxivNew = s.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})(v\d+)?/i)
    ?? s.match(/\barxiv:\s*(\d{4}\.\d{4,5})(v\d+)?/i)
    ?? s.match(/^(\d{4}\.\d{4,5})(v\d+)?$/);
  if (arxivNew) return { kind: 'arxiv', arxivId: arxivNew[1] };

  const arxivOld = s.match(/arxiv\.org\/(?:abs|pdf)\/([a-z-]+(?:\.[A-Z]{2})?\/\d{7})/i)
    ?? s.match(/\barxiv:\s*([a-z-]+(?:\.[A-Z]{2})?\/\d{7})/i);
  if (arxivOld) return { kind: 'arxiv', arxivId: arxivOld[1] };

  if (/^https?:\/\//i.test(s)) return { kind: 'url', url: s };
  return { kind: 'none' };
}

function tidy(s: string | undefined): string {
  return (s ?? '')
    .replace(/<[^>]+>/g, '')      // Crossref abstracts arrive as JATS markup
    .replace(/\s+/g, ' ')
    .trim();
}

function authorList(names: string[]): string {
  if (!names.length) return '';
  if (names.length <= 3) return names.join(', ');
  return `${names[0]} et al.`;
}

/* ---------------- Crossref ---------------- */

interface CrossrefWork {
  title?: string[];
  author?: { given?: string; family?: string; name?: string }[];
  issued?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  abstract?: string;
  DOI?: string;
  URL?: string;
}

async function fromCrossref(doi: string, mailto?: string): Promise<Partial<Paper> | null> {
  const url = new URL(`${CROSSREF}/${encodeURIComponent(doi)}`);
  if (mailto) url.searchParams.set('mailto', mailto);
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const body = (await res.json()) as { message?: CrossrefWork };
  const w = body.message;
  if (!w) return null;

  const names = (w.author ?? []).map((a) =>
    a.name ?? [a.given, a.family].filter(Boolean).join(' '),
  ).filter(Boolean);

  return {
    title: tidy(w.title?.[0]) || doi,
    authors: authorList(names),
    year: String(w.issued?.['date-parts']?.[0]?.[0] ?? ''),
    venue: tidy(w['container-title']?.[0]) || undefined,
    abstract: tidy(w.abstract) || undefined,
    doi: w.DOI ?? doi,
    url: w.URL ?? `https://doi.org/${doi}`,
  };
}

/* ---------------- arXiv, via DataCite ---------------- */

interface DataCiteAttrs {
  titles?: { title?: string }[];
  creators?: { name?: string; givenName?: string; familyName?: string }[];
  publicationYear?: number;
  publisher?: string | { name?: string };
  descriptions?: { description?: string; descriptionType?: string }[];
  doi?: string;
  url?: string;
  container?: { title?: string };
}

export function fromDataCiteAttrs(a: DataCiteAttrs, arxivId: string): Partial<Paper> | null {
  const title = tidy(a.titles?.[0]?.title);
  if (!title) return null;

  const names = (a.creators ?? [])
    .map((c) => c.name ?? [c.givenName, c.familyName].filter(Boolean).join(' '))
    .map((n) => tidy(n))
    .filter(Boolean)
    // DataCite gives "Family, Given"; humans read "Given Family"
    .map((n) => (n.includes(',') ? n.split(',').map((x) => x.trim()).reverse().join(' ') : n));

  const abstract = (a.descriptions ?? [])
    .find((d) => !d.descriptionType || d.descriptionType === 'Abstract')?.description;

  const publisher = typeof a.publisher === 'string' ? a.publisher : a.publisher?.name;

  return {
    title,
    authors: authorList(names),
    year: a.publicationYear ? String(a.publicationYear) : '',
    venue: tidy(a.container?.title) || publisher || 'arXiv',
    abstract: tidy(abstract) || undefined,
    arxivId,
    doi: a.doi ?? `${ARXIV_DOI}${arxivId}`,
    url: `https://arxiv.org/abs/${arxivId}`,
  };
}

async function fromArxiv(id: string): Promise<Partial<Paper> | null> {
  const res = await fetch(`${DATACITE}/${encodeURIComponent(`${ARXIV_DOI}${id}`)}`, {
    headers: { Accept: 'application/vnd.api+json' },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: { attributes?: DataCiteAttrs } };
  const attrs = body.data?.attributes;
  return attrs ? fromDataCiteAttrs(attrs, id) : null;
}

/* ---------------- the one function the widget calls ---------------- */

export class LookupError extends Error {}

export async function lookupPaper(raw: string, mailto?: string): Promise<Paper> {
  const what = identify(raw);
  const blank: Paper = {
    id: uid(), title: '', authors: '', year: '', takeaway: '',
    read: false, addedOn: today(),
  };

  if (what.kind === 'none') {
    throw new LookupError('That isn’t a DOI, an arXiv link, or a URL.');
  }

  if (what.kind === 'url') {
    // nothing to query, but the link itself is worth keeping
    return { ...blank, title: '', url: what.url };
  }

  let found: Partial<Paper> | null = null;
  try {
    found = what.kind === 'doi'
      ? await fromCrossref(what.doi!, mailto)
      : await fromArxiv(what.arxivId!);
  } catch {
    throw new LookupError(
      'Couldn’t reach the lookup service. Check your connection, or type the details in.',
    );
  }

  if (!found) {
    throw new LookupError(
      what.kind === 'doi'
        ? 'Crossref has no record of that DOI.'
        : 'No record of that arXiv id. Very new or very old ids sometimes aren’t registered yet — type the details in.',
    );
  }

  return { ...blank, ...found };
}
