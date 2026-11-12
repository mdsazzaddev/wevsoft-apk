/**
 * Per-page `<head>` management for the SPA (MP3 §12).
 *
 * The server already rewrites the head for crawlers and link-preview fetchers
 * (see `wevspace.seo.ts`), which covers the clients that do not run JavaScript.
 * This is the other half: Googlebot *does* render JavaScript, and a visitor who
 * navigates in-app and then copies the address bar should get the right preview
 * too. Without it, every route past the first would inherit the shell's generic
 * "Wevsoft" title, description and Open Graph image.
 *
 * Everything is restored on unmount, so leaving a page never leaves its tags
 * behind for the next one to be mistaken for.
 */

import { useEffect } from 'react';

export interface PageSeo {
  title: string;
  description?: string | null;
  /** Absolute URL or an app path; a path is resolved against the current origin. */
  canonical?: string | null;
  image?: string | null;
  /** og:type — `website` unless the page is a profile or an article. */
  type?: string | null;
  /** e.g. `noindex, nofollow`. Absent means "index normally". */
  robots?: string | null;
  jsonLd?: Array<Record<string, unknown> | null | undefined>;
}

type MetaAttr = 'name' | 'property';

/** Tags this module owns. Anything else in the head is left untouched. */
const META_KEYS: Array<[MetaAttr, string]> = [
  ['name', 'description'],
  ['name', 'robots'],
  ['property', 'og:title'],
  ['property', 'og:description'],
  ['property', 'og:image'],
  ['property', 'og:url'],
  ['property', 'og:type'],
  ['name', 'twitter:title'],
  ['name', 'twitter:description'],
  ['name', 'twitter:image'],
];

const OWNED = 'data-page-seo';

function absolute(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (typeof window === 'undefined') return value;
  return `${window.location.origin}${value.startsWith('/') ? value : `/${value}`}`;
}

/**
 * Writes one meta tag and returns the undo. A tag that was already in the shell
 * has its old content put back; one we created is removed outright.
 */
function setMetaTag(attr: MetaAttr, key: string, value: string | null): () => void {
  const head = document.head;
  let el = head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);

  if (value == null) {
    // Nothing to say. An existing tag stays as it is; ours would be noise.
    return () => {};
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(OWNED, '1');
    el.content = value;
    head.appendChild(el);
    const created = el;
    return () => created.remove();
  }
  const previous = el.content;
  const existing = el;
  existing.content = value;
  return () => {
    existing.content = previous;
  };
}

function setCanonical(url: string | null): () => void {
  if (!url) return () => {};
  const head = document.head;
  const href = absolute(url);
  let el = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    el.setAttribute(OWNED, '1');
    el.href = href;
    head.appendChild(el);
    const created = el;
    return () => created.remove();
  }
  const previous = el.href;
  const existing = el;
  existing.href = href;
  return () => {
    existing.href = previous;
  };
}

function setJsonLd(nodes: Array<Record<string, unknown> | null | undefined>): () => void {
  const used = nodes.filter(Boolean) as Array<Record<string, unknown>>;
  if (!used.length) return () => {};
  const scripts = used.map((node) => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute(OWNED, '1');
    // textContent, never innerHTML: the payload is database text, and this way
    // the browser never parses it as markup.
    el.textContent = JSON.stringify(node);
    document.head.appendChild(el);
    return el;
  });
  return () => scripts.forEach((el) => el.remove());
}

/**
 * Applies `meta` to the document head and returns a function that undoes it.
 * Exported for the rare caller that is not a component.
 */
export function applyPageSeo(meta: PageSeo): () => void {
  if (typeof document === 'undefined') return () => {};

  const title = meta.title;
  const description = meta.description ?? null;
  const image = meta.image ? absolute(meta.image) : null;
  const url = meta.canonical ? absolute(meta.canonical) : null;

  const previousTitle = document.title;
  document.title = title;

  const values: Record<string, string | null> = {
    description,
    robots: meta.robots ?? null,
    'og:title': title,
    'og:description': description,
    'og:image': image,
    'og:url': url,
    'og:type': meta.type || 'website',
    'twitter:title': title,
    'twitter:description': description,
    'twitter:image': image,
  };

  const undos = [
    ...META_KEYS.map(([attr, key]) => setMetaTag(attr, key, values[key] ?? null)),
    setCanonical(url),
    setJsonLd(meta.jsonLd || []),
  ];

  return () => {
    document.title = previousTitle;
    // Reverse order so a tag we created is removed before an outer restore runs.
    for (let i = undos.length - 1; i >= 0; i -= 1) undos[i]();
  };
}

/**
 * Declarative form. Pass `null` while the page is still loading — the head is
 * left alone rather than briefly announcing a title that is about to change.
 *
 * `meta` is read on every render, so callers should memoize it (or let the
 * dependency list below settle) rather than rebuilding a new object each time.
 */
export function usePageSeo(meta: PageSeo | null | undefined): void {
  const fingerprint = meta ? JSON.stringify(meta) : '';
  useEffect(() => {
    if (!meta) return;
    return applyPageSeo(meta);
    // Deliberately keyed on the serialized value: a caller that builds the
    // object inline would otherwise re-apply the head on every render.
     
  }, [fingerprint]);
}
