/** Collapse seed + storefront aliases so each shelf appears once. */

export function slugifyCategoryKey(value: string) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CANON_BY_SLUG: Record<string, string> = {
  electronics: 'electronics',
  'electronics-gadgets': 'electronics',
  'electronics-and-gadgets': 'electronics',
  fashion: 'fashion',
  'fashion-apparel': 'fashion',
  'fashion-and-apparel': 'fashion',
  books: 'books',
  'books-stationery': 'books',
  'books-and-stationery': 'books',
  'home-living': 'home-living',
  'home-and-living': 'home-living',
  'home-kitchen': 'home-living',
  'home-and-kitchen': 'home-living',
  sports: 'sports',
  'sports-fitness': 'sports',
  'sports-and-fitness': 'sports',
  vehicles: 'vehicles',
  'automotive-gadgets': 'vehicles',
  'automotive-and-gadgets': 'vehicles',
  animals: 'animals',
  pets: 'animals',
  livestock: 'animals',
  cattle: 'animals',
  food: 'food',
  'groceries-daily': 'food',
  'groceries-and-daily-needs': 'food',
  'beauty-personal-care': 'beauty-personal-care',
  'health-and-beauty': 'beauty-personal-care',
};

export function canonicalCategorySlug(nameOrSlug: string) {
  const key = slugifyCategoryKey(nameOrSlug);
  return CANON_BY_SLUG[key] || key;
}

export function categoryFilterAliases(selected: string): string[] {
  const key = canonicalCategorySlug(selected);
  const names = new Set<string>([String(selected || '').trim()].filter(Boolean));
  for (const [slug, canon] of Object.entries(CANON_BY_SLUG)) {
    if (canon !== key) continue;
    names.add(slug);
    names.add(slug.replace(/-/g, ' '));
    names.add(slug.replace(/-and-/g, ' & '));
    names.add(slug.replace(/-/g, ' & '));
  }
  const labels: Record<string, string[]> = {
    electronics: ['Electronics', 'Electronics & Gadgets'],
    fashion: ['Fashion', 'Fashion & Apparel'],
    books: ['Books', 'Books & Stationery'],
    'home-living': ['Home & Living', 'Home & Kitchen', 'Home and Living'],
    sports: ['Sports', 'Sports & Fitness'],
    vehicles: ['Vehicles', 'Automotive & Gadgets'],
    animals: ['Animals', 'Pets', 'Livestock'],
    food: ['Food', 'Groceries & Daily Needs'],
    'beauty-personal-care': ['Beauty & Personal Care', 'Health & Beauty'],
  };
  for (const n of labels[key] || []) names.add(n);
  return [...names];
}

export function categoryMatches(selected: string, productCategory?: string | null) {
  const sel = String(selected || '').toLowerCase().trim();
  const cat = String(productCategory || '').toLowerCase().trim();
  if (!sel || sel === 'all') return true;
  if (cat === sel || cat.replace(/-/g, ' ') === sel.replace(/-/g, ' ')) return true;
  const a = canonicalCategorySlug(sel);
  const b = canonicalCategorySlug(cat);
  return Boolean(a) && a === b;
}

type NamedCategory = {
  name: string;
  slug?: string | null;
  [key: string]: unknown;
};

/** Keep the canonical row when seed + default categories overlap. */
export function dedupeStorefrontCategories<T extends NamedCategory>(rows: T[]): T[] {
  const preferred = new Map<string, T>();
  const order: string[] = [];

  for (const row of rows) {
    const name = String(row.name || '').trim();
    if (!name) continue;
    const rawSlug = slugifyCategoryKey(String(row.slug || name));
    if (rawSlug === 'all' || name.toLowerCase() === 'all') {
      if (!preferred.has('all')) {
        preferred.set('all', row);
        order.push('all');
      }
      continue;
    }
    const key = canonicalCategorySlug(rawSlug || name);
    const existing = preferred.get(key);
    if (!existing) {
      preferred.set(key, row);
      order.push(key);
      continue;
    }
    const existingSlug = slugifyCategoryKey(String(existing.slug || existing.name));
    if (existingSlug !== key && rawSlug === key) {
      preferred.set(key, row);
    }
  }

  return order.map((key) => preferred.get(key)!).filter(Boolean);
}
