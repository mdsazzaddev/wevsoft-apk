/**
 * On Business Suite, Creator Hub must not bounce to the consumer app (:3000).
 * Map legacy consumer paths onto Creator Hub tabs or Business Suite routes.
 */
import { isBusinessAppHost } from './consumerAppUrl';
import {
  PERSONAL_CREATOR_HUB_PATH,
  SPACE_CREATOR_HUB_PATH,
  creatorHubPath,
  isCreatorHubPath,
} from './creatorHub';
import type { CreatorTab } from '../components/creator/studio/CreatorSidebar';

export type BusinessCreatorNav =
  | { kind: 'tab'; tab: CreatorTab; sub?: string | null }
  | { kind: 'path'; path: string };

/** Parse path+search (e.g. `/create-post?type=image`) into a Business-safe target. */
export function resolveBusinessCreatorNav(raw: string): BusinessCreatorNav | null {
  if (!raw) return null;
  let pathname = raw;
  let search = '';
  try {
    if (raw.startsWith('http')) {
      const u = new URL(raw);
      pathname = u.pathname;
      search = u.search;
    } else {
      const q = raw.indexOf('?');
      if (q >= 0) {
        pathname = raw.slice(0, q);
        search = raw.slice(q);
      }
    }
  } catch {
    return null;
  }
  const path = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  if (path === '/reels' || path.startsWith('/reels/')) {
    return { kind: 'tab', tab: 'content_studio' };
  }
  if (path === '/story-studio' || path === '/create-story' || path.startsWith('/story-studio/')) {
    return { kind: 'tab', tab: 'content_studio' };
  }
  if (path === '/videos' || path.startsWith('/videos/')) {
    return { kind: 'tab', tab: 'content_library', sub: 'media' };
  }
  if (path === '/academic' || path.startsWith('/academic/')) {
    return { kind: 'tab', tab: 'content_library' };
  }
  if (path === '/ai/post' || path === '/create-post' || path.startsWith('/create-post')) {
    return { kind: 'path', path: '/business/batch' };
  }
  if (path === '/studio/content' || path.startsWith('/studio/content')) {
    return { kind: 'tab', tab: 'content_studio' };
  }
  if (path === '/wallet' || path === '/rewards' || path === '/subscriptions') {
    return { kind: 'tab', tab: 'monetization' };
  }
  if (path === '/events') return { kind: 'tab', tab: 'calendar' };
  if (path === '/explore') return { kind: 'tab', tab: 'inspiration' };
  if (path.startsWith('/settings')) return { kind: 'path', path: '/business/settings' };
  if (path === '/spaces' || path.startsWith('/spaces/')) return { kind: 'path', path: '/business' };
  if (path === '/support') return { kind: 'path', path: '/business/support' };
  if (path === '/notifications') return { kind: 'path', path: '/business/notifications' };
  if (path === '/business' || path.startsWith('/business/')) {
    // Space hub deep links stay as in-app paths (tab via query).
    if (isCreatorHubPath(path)) {
      const tab = (params.get('tab') || 'overview') as CreatorTab;
      return { kind: 'tab', tab, sub: params.get('sub') };
    }
    return { kind: 'path', path: path + (params.toString() ? `?${params}` : '') };
  }
  if (
    path === PERSONAL_CREATOR_HUB_PATH
    || path.startsWith(`${PERSONAL_CREATOR_HUB_PATH}/`)
    || path === SPACE_CREATOR_HUB_PATH
    || path.startsWith(`${SPACE_CREATOR_HUB_PATH}/`)
  ) {
    const tab = (params.get('tab') || 'overview') as CreatorTab;
    return { kind: 'tab', tab, sub: params.get('sub') };
  }
  return { kind: 'tab', tab: 'tools' };
}

export function applyBusinessCreatorNav(
  raw: string,
  opts: {
    navigate: (to: string) => void;
    selectTab?: (tab: CreatorTab, sub?: string | null) => void;
  },
): boolean {
  if (!isBusinessAppHost()) return false;
  const target = resolveBusinessCreatorNav(raw);
  if (!target) return false;
  if (target.kind === 'tab') {
    if (opts.selectTab) opts.selectTab(target.tab, target.sub ?? null);
    else opts.navigate(creatorHubPath(target.tab, target.sub));
    return true;
  }
  opts.navigate(target.path);
  return true;
}

/**
 * Open a Creator Hub / content href. On Business Suite, remap consumer deep-links
 * so we never bounce to :3000; elsewhere just navigate.
 */
export function openCreatorHref(
  href: string | null | undefined,
  navigate: (to: string) => void,
  selectTab?: (tab: CreatorTab, sub?: string | null) => void,
): void {
  if (!href) return;
  if (!applyBusinessCreatorNav(href, { navigate, selectTab })) navigate(href);
}

export { isBusinessAppHost };
