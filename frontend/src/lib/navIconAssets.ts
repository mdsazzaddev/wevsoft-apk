import type { NavIconStyle } from '@wevsoft/shared/nav-icon-style';

/** Eager map of home-feed colorful glyphs (`a` / `b` sets), keyed by basename. */
const aModules = import.meta.glob('../assets/nav-icons/a/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const bModules = import.meta.glob('../assets/nav-icons/b/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function indexByBasename(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(modules)) {
    const base = path.split('/').pop() || '';
    const key = base.replace(/\.svg$/i, '');
    if (key) out[key] = url;
  }
  return out;
}

const A_ICONS = indexByBasename(aModules);
const B_ICONS = indexByBasename(bModules);

export function getNavIconSrc(style: NavIconStyle, iconKey: string | null | undefined): string | null {
  if (!iconKey || style === 'outline') return null;
  const table = style === 'colorful-b' ? B_ICONS : A_ICONS;
  return table[iconKey] || null;
}

export function hasNavIconAsset(style: NavIconStyle, iconKey: string | null | undefined): boolean {
  return !!getNavIconSrc(style, iconKey);
}
