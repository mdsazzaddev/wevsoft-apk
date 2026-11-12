/**
 * Multi-photo post layout templates (Phase 1+).
 * Stored on Post.templateType — extend POST_LAYOUT_TEMPLATES without removing old ids.
 */

export const POST_LAYOUT_TEMPLATES = [
  'split_2',
  'main_2side',
  'grid_4',
  'carousel',
  'column',
  'row',
  'frame',
  'feature_stick',
  'mosaic',
  // Modern additions (keep ids stable once shipped)
  'triptych',
  'hero_strip',
  'l_shape',
  'magazine',
  'brick',
  'spotlight',
  'banner_duo',
  'quad_hero',
  'waterfall',
  'diagonal',
  'cluster',
  'windowpane',
  'captain',
] as const;
export type PostLayoutTemplate = (typeof POST_LAYOUT_TEMPLATES)[number];

/** Legacy values still present on older posts / composers. */
export const LEGACY_LAYOUT_ALIASES: Record<string, PostLayoutTemplate | 'legacy_grid'> = {
  grid: 'legacy_grid',
  list: 'legacy_grid',
  masonry: 'legacy_grid',
  col: 'column',
  columns: 'column',
  rows: 'row',
  filmstrip: 'row',
};

/** Layouts that still look good with 5+ photos (not fixed-slot grids). */
export const LAYOUTS_FOR_MANY_PHOTOS: readonly PostLayoutTemplate[] = [
  'carousel',
  'column',
  'row',
  'frame',
  'feature_stick',
  'mosaic',
  'hero_strip',
  'brick',
  'waterfall',
  'diagonal',
  'cluster',
  'windowpane',
  'captain',
  'quad_hero',
  'magazine',
  'spotlight',
  'banner_duo',
  'l_shape',
  'triptych',
];

export const LAYOUT_MIN_PHOTOS: Record<PostLayoutTemplate, number> = {
  split_2: 2,
  main_2side: 3,
  grid_4: 4,
  carousel: 2,
  column: 2,
  row: 2,
  frame: 2,
  feature_stick: 2,
  mosaic: 3,
  triptych: 3,
  hero_strip: 4,
  l_shape: 3,
  magazine: 3,
  brick: 4,
  spotlight: 3,
  banner_duo: 3,
  quad_hero: 4,
  waterfall: 3,
  diagonal: 3,
  cluster: 3,
  windowpane: 4,
  captain: 5,
};

export const LAYOUT_TEMPLATE_META: Array<{
  id: PostLayoutTemplate;
  label: string;
  minPhotos: number;
  /** Thumbnail cell pattern for the picker preview (row-major occupancy). */
  preview: number[];
}> = [
  { id: 'split_2', label: 'Split', minPhotos: 2, preview: [1, 1] },
  { id: 'main_2side', label: 'Main + sides', minPhotos: 3, preview: [2, 1, 1] },
  { id: 'grid_4', label: 'Grid', minPhotos: 4, preview: [1, 1, 1, 1] },
  { id: 'carousel', label: 'Carousel', minPhotos: 2, preview: [1, 1, 1] },
  { id: 'column', label: 'Columns', minPhotos: 2, preview: [1, 1, 1] },
  { id: 'row', label: 'Filmstrip', minPhotos: 2, preview: [1, 1, 1] },
  { id: 'frame', label: 'Frame', minPhotos: 2, preview: [1, 1, 1, 1] },
  { id: 'feature_stick', label: 'Feature stick', minPhotos: 2, preview: [2, 1, 1] },
  { id: 'mosaic', label: 'Mosaic', minPhotos: 3, preview: [2, 1, 1, 1] },
  { id: 'triptych', label: 'Triptych', minPhotos: 3, preview: [1, 1, 1] },
  { id: 'hero_strip', label: 'Hero strip', minPhotos: 4, preview: [3, 1, 1, 1] },
  { id: 'l_shape', label: 'L-shape', minPhotos: 3, preview: [2, 1, 1] },
  { id: 'magazine', label: 'Magazine', minPhotos: 3, preview: [2, 1, 1] },
  { id: 'brick', label: 'Brick', minPhotos: 4, preview: [1, 1, 1, 1] },
  { id: 'spotlight', label: 'Spotlight', minPhotos: 3, preview: [1, 2, 1] },
  { id: 'banner_duo', label: 'Banner duo', minPhotos: 3, preview: [2, 1, 1] },
  { id: 'quad_hero', label: 'Quad hero', minPhotos: 4, preview: [2, 1, 1, 1] },
  { id: 'waterfall', label: 'Waterfall', minPhotos: 3, preview: [1, 1, 1, 1] },
  { id: 'diagonal', label: 'Diagonal', minPhotos: 3, preview: [1, 1, 1] },
  { id: 'cluster', label: 'Cluster', minPhotos: 3, preview: [1, 1, 1] },
  { id: 'windowpane', label: 'Windowpane', minPhotos: 4, preview: [1, 1, 1, 1] },
  { id: 'captain', label: 'Captain', minPhotos: 5, preview: [1, 1, 1, 1, 1] },
];

/** Non-destructive crop rectangle relative to the original image (0–1). */
export interface MediaCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function isPostLayoutTemplate(value: unknown): value is PostLayoutTemplate {
  return typeof value === 'string' && (POST_LAYOUT_TEMPLATES as readonly string[]).includes(value);
}

export function parseMediaCropData(raw: unknown): MediaCropRect | null {
  if (raw == null || raw === '') return null;
  let obj: any = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const x = Number(obj.x);
  const y = Number(obj.y);
  const w = Number(obj.w);
  const h = Number(obj.h);
  if (![x, y, w, h].every((n) => Number.isFinite(n))) return null;
  if (w <= 0 || h <= 0) return null;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    w: Math.min(1, Math.max(0.01, w)),
    h: Math.min(1, Math.max(0.01, h)),
  };
}

export function serializeMediaCropData(crop: MediaCropRect | null | undefined): string | null {
  if (!crop) return null;
  const parsed = parseMediaCropData(crop);
  return parsed ? JSON.stringify(parsed) : null;
}

/**
 * CSS object-position from a normalized crop (center of the crop window).
 * Used with object-fit: cover for non-destructive framing.
 */
export function cropToObjectPosition(crop: MediaCropRect | null | undefined): string | undefined {
  const c = crop ? parseMediaCropData(crop) : null;
  if (!c) return undefined;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  return `${(cx * 100).toFixed(2)}% ${(cy * 100).toFixed(2)}%`;
}

/** Templates offered for a given photo count (2+). */
export function layoutsForPhotoCount(photoCount: number): PostLayoutTemplate[] {
  if (photoCount < 2) return [];
  return POST_LAYOUT_TEMPLATES.filter((id) => {
    if (LAYOUT_MIN_PHOTOS[id] > photoCount) return false;
    if (photoCount > 4 && !LAYOUTS_FOR_MANY_PHOTOS.includes(id)) return false;
    return true;
  });
}

/**
 * Resolve a stored templateType + live photo count into what the feed should render.
 * Never invents a layout for 0–1 photos.
 */
export function resolvePostLayout(
  templateType: string | null | undefined,
  photoCount: number,
): PostLayoutTemplate | 'legacy_grid' | null {
  if (photoCount <= 0) return null;
  if (photoCount === 1) return null;

  const raw = typeof templateType === 'string' ? templateType.trim() : '';
  if (!raw) return photoCount > 4 ? 'waterfall' : 'legacy_grid';

  if (isPostLayoutTemplate(raw)) {
    if (photoCount > 4 && !LAYOUTS_FOR_MANY_PHOTOS.includes(raw)) return 'waterfall';
    if (LAYOUT_MIN_PHOTOS[raw] > photoCount) {
      return adjustLayoutForCount(raw, photoCount);
    }
    return raw;
  }

  const alias = LEGACY_LAYOUT_ALIASES[raw];
  if (alias === 'legacy_grid') {
    return photoCount > 4 ? 'waterfall' : 'legacy_grid';
  }
  if (alias && isPostLayoutTemplate(alias)) {
    return resolvePostLayout(alias, photoCount);
  }

  return photoCount > 4 ? 'waterfall' : 'legacy_grid';
}

/** When the user removes photos under a template's minimum, pick the best smaller layout. */
export function adjustLayoutForCount(
  current: string | null | undefined,
  photoCount: number,
): PostLayoutTemplate | null {
  if (photoCount < 2) return null;
  if (photoCount > 4) {
    if (isPostLayoutTemplate(current) && LAYOUTS_FOR_MANY_PHOTOS.includes(current)) {
      return current;
    }
    return 'waterfall';
  }

  if (isPostLayoutTemplate(current) && LAYOUT_MIN_PHOTOS[current] <= photoCount) {
    return current;
  }

  const options = layoutsForPhotoCount(photoCount);
  // Prefer classic densest grids, then stack layouts, then carousel.
  const rank: PostLayoutTemplate[] = [
    'grid_4',
    'main_2side',
    'mosaic',
    'triptych',
    'l_shape',
    'magazine',
    'banner_duo',
    'spotlight',
    'split_2',
    'feature_stick',
    'frame',
    'column',
    'row',
    'carousel',
  ];
  for (const id of rank) {
    if (options.includes(id)) return id;
  }
  return options[0] || null;
}

/** Default template when the user first hits 2+ photos. */
export function defaultLayoutForPhotoCount(photoCount: number): PostLayoutTemplate | null {
  if (photoCount < 2) return null;
  if (photoCount > 4) return 'waterfall';
  if (photoCount >= 4) return 'grid_4';
  if (photoCount === 3) return 'main_2side';
  return 'split_2';
}

/** Parse mediaCropData[] from a multipart form field (JSON array aligned with file order). */
export function parseCropDataList(raw: unknown): Array<MediaCropRect | null> {
  if (raw == null || raw === '') return [];
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => parseMediaCropData(item));
}
