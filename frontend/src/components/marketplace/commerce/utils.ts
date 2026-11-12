import React from 'react';
import {
  canonicalCategorySlug,
  categoryMatches,
  dedupeStorefrontCategories,
} from '../../../lib/marketplaceCategoryCanon';

export { canonicalCategorySlug, categoryMatches, dedupeStorefrontCategories };

export const MARKET_ORANGE = 'var(--primary)';

export const MARKET_CATEGORIES = [
  { name: 'All', slug: 'all', icon: 'LayoutGrid' },
  { name: 'Books', slug: 'books', icon: 'BookOpen' },
  { name: 'Electronics', slug: 'electronics', icon: 'Monitor' },
  { name: 'Clothing', slug: 'clothing', icon: 'Shirt' },
  { name: 'Fashion', slug: 'fashion', icon: 'Shirt' },
  { name: 'Accessories', slug: 'accessories', icon: 'Watch' },
  { name: 'Services', slug: 'services', icon: 'Briefcase' },
  { name: 'Digital', slug: 'digital', icon: 'Download' },
  { name: 'Vehicles', slug: 'vehicles', icon: 'Car' },
  { name: 'Property', slug: 'property', icon: 'Home' },
  { name: 'Gaming', slug: 'gaming', icon: 'Gamepad2' },
  { name: 'Education', slug: 'education', icon: 'GraduationCap' },
  { name: 'Jobs', slug: 'jobs', icon: 'Briefcase' },
  { name: 'Home & Living', slug: 'home-living', icon: 'Sofa' },
  { name: 'Sports', slug: 'sports', icon: 'Trophy' },
  { name: 'Agriculture', slug: 'agriculture', icon: 'Tractor' },
  { name: 'Animals', slug: 'animals', icon: 'PawPrint' },
  { name: 'Others', slug: 'others', icon: 'MoreHorizontal' },
] as const;

/** Animals covers livestock and pets so cow, bird, dog, cat listings share one shelf. */
export const ANIMAL_CATEGORY_NAMES = ['animals', 'pets', 'livestock', 'cattle'];

export function parseProductImages(images: unknown): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images.filter(Boolean).map(String);
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      if (images.startsWith('http') || images.startsWith('/')) return [images];
    }
  }
  return [];
}

export function formatPrice(n?: number | null): string {
  const v = Number(n || 0);
  return `৳${v.toLocaleString('en-BD')}`;
}

export function productThumb(product: any): string {
  const imgs = parseProductImages(product?.images);
  return imgs[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=60';
}

/**
 * Real per-section totals, fetched once per page load and shared by every
 * section header so seven sections don't each hit the API.
 */
let sectionCountsPromise: Promise<Record<string, number>> | null = null;

export function fetchSectionCounts(): Promise<Record<string, number>> {
  if (!sectionCountsPromise) {
    sectionCountsPromise = fetch('/api/marketplace/feed/counts')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return sectionCountsPromise;
}

export function formatCompact(n?: number | null): string {
  const v = Number(n || 0);
  return v.toLocaleString('en-US');
}

export type StorefrontCategory = {
  id?: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
};

const FALLBACK_CATEGORIES: StorefrontCategory[] = dedupeStorefrontCategories(
  MARKET_CATEGORIES.map((c) => ({
    name: c.name,
    slug: c.slug,
    icon: c.icon,
  })),
);

let categoriesCache: StorefrontCategory[] | null = null;
let categoriesPromise: Promise<StorefrontCategory[]> | null = null;

export function fetchStorefrontCategories(): Promise<StorefrontCategory[]> {
  if (categoriesCache) return Promise.resolve(categoriesCache);
  if (!categoriesPromise) {
    categoriesPromise = fetch('/api/marketplace/categories')
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => {
        const rows = Array.isArray(d.categories) ? d.categories : [];
        const mapped: StorefrontCategory[] = rows
          .map((c: any) => ({
            id: c.id,
            name: String(c.name || '').trim(),
            slug: String(c.slug || '').trim(),
            icon: c.icon || 'Tag',
            description: c.description || null,
          }))
          .filter((c: StorefrontCategory) => c.name);
        const unique = dedupeStorefrontCategories(mapped);
        if (!unique.some((c) => c.slug === 'all' || c.name === 'All')) {
          unique.unshift({ name: 'All', slug: 'all', icon: 'LayoutGrid' });
        }
        categoriesCache = unique.length ? unique : FALLBACK_CATEGORIES;
        return categoriesCache;
      })
      .catch(() => FALLBACK_CATEGORIES);
  }
  return categoriesPromise;
}

export function invalidateStorefrontCategories() {
  categoriesCache = null;
  categoriesPromise = null;
}

export function useMarketplaceCategories() {
  const [categories, setCategories] = React.useState<StorefrontCategory[]>(FALLBACK_CATEGORIES);
  React.useEffect(() => {
    let mounted = true;
    fetchStorefrontCategories().then((rows) => {
      if (mounted) setCategories(rows);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return categories;
}

export function listingCategoryNames(categories: StorefrontCategory[], extra?: string) {
  const names = categories
    .filter((c) => c.slug !== 'all' && c.name !== 'All')
    .map((c) => c.name);
  if (extra && extra !== 'All' && !names.includes(extra)) names.unshift(extra);
  return names.length
    ? names
    : ['Electronics', 'Books', 'Clothing', 'Accessories', 'Animals', 'Vehicles', 'Services', 'Digital', 'Others'];
}

export function parseProductGallery(product: any): string[] {
  let urls: string[] = [];
  if (product?.galleryJson) {
    try {
      const g = typeof product.galleryJson === 'string' ? JSON.parse(product.galleryJson) : product.galleryJson;
      if (Array.isArray(g)) urls = g.filter(Boolean).map(String);
    } catch {
      /* ignore */
    }
  }
  if (!urls.length) urls = parseProductImages(product?.images);
  if (product?.coverImage) {
    urls = [product.coverImage, ...urls.filter((u) => u !== product.coverImage)];
  }
  return Array.from(new Set(urls)).slice(0, 10);
}

export function parseProductVideos(product: any): string[] {
  const out: string[] = [];
  if (product?.video) out.push(String(product.video));
  if (product?.videosJson) {
    try {
      const v = typeof product.videosJson === 'string' ? JSON.parse(product.videosJson) : product.videosJson;
      if (Array.isArray(v)) out.push(...v.map(String));
    } catch {
      /* ignore */
    }
  }
  return Array.from(new Set(out.filter(Boolean))).slice(0, 6);
}

export function parseProductSpecs(product: any): { group: string; items: { key: string; label: string; value: string; type?: string }[] }[] {
  if (!product?.specsJson) return [];
  try {
    const raw = typeof product.specsJson === 'string' ? JSON.parse(product.specsJson) : product.specsJson;
    if (Array.isArray(raw) && raw[0]?.group) {
      return raw
        .map((g: any) => ({
          group: String(g.group || 'Details'),
          items: (g.items || g.fields || [])
            .map((it: any) => ({
              key: String(it.key || it.label || ''),
              label: String(it.label || it.key || ''),
              value: Array.isArray(it.value) ? it.value.join(', ') : String(it.value ?? ''),
              type: it.type,
            }))
            .filter((it: any) => it.value && it.value !== 'false'),
        }))
        .filter((g: any) => g.items.length);
    }
    if (Array.isArray(raw)) {
      return [{
        group: 'Specifications',
        items: raw.map((it: any) => ({
          key: String(it.key || it.label || ''),
          label: String(it.label || it.key || ''),
          value: Array.isArray(it.value) ? it.value.join(', ') : String(it.value ?? ''),
          type: it.type,
        })).filter((it: any) => it.value),
      }];
    }
  } catch {
    /* ignore */
  }
  return [];
}

export async function uploadMarketplaceMedia(file: File, token: string | null) {
  const form = new FormData();
  form.append('file', file);
  const isAudio = (file.type || '').startsWith('audio/');
  const res = await fetch(isAudio ? '/api/wevchat/voice/upload' : '/api/media/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return String(data.path || data.url || '');
}

export async function marketFetch(path: string, token: string | null, init?: RequestInit) {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init?.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
