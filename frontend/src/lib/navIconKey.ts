import { PERSONAL_CREATOR_HUB_PATH } from './creatorHub';

/** Stable keys that match SVG filenames under assets/nav-icons/{a,b}/ */
export type NavIconKey = string;

const PATH_MAP: Record<string, NavIconKey> = {
  '/home': 'home',
  '/feed': 'home',
  '/': 'home',
  '/friends': 'friends',
  '/messages': 'wevchat',
  '/wevchat': 'wevchat',
  '/reels': 'reels',
  '/wevmall': 'wevmall',
  '/marketplace': 'wevmall',
  '/notifications': 'notifications',
  '/groups': 'groups',
  '/phantom': 'phantom',
  '/spaces': 'space',
  '/space': 'space',
  '/live': 'live',
  '/campus': 'campus',
  '/academic': 'academic',
  '/study': 'study',
  '/ai/post': 'aipost',
  '/ai-post': 'aipost',
  '/jobs': 'jobs',
  '/photos': 'photos',
  '/videos': 'videos',
  '/explore': 'explore',
  '/events': 'events',
  '/watch-party': 'watchparty',
  '/watchparty': 'watchparty',
  '/rewards': 'rewards',
  '/wallet': 'wallet',
  '/donate': 'donate',
  '/insights': 'insights',
  '/analytics': 'insights',
  '/content': 'content',
  '/guardian': 'guardian',
  '/bulletins': 'bulletins',
  '/settings': 'settings',
  '/help': 'help',
  '/support': 'support',
  '/search': 'search',
  '/business/whatsapp': 'whatsapp',
  '/whatsapp': 'whatsapp',
};

if (PERSONAL_CREATOR_HUB_PATH) {
  const hub = PERSONAL_CREATOR_HUB_PATH.split('?')[0].replace(/\/+$/, '') || PERSONAL_CREATOR_HUB_PATH;
  PATH_MAP[hub] = 'creatorhub';
  PATH_MAP[hub.toLowerCase()] = 'creatorhub';
}
PATH_MAP['/creator-hub'] = 'creatorhub';
PATH_MAP['/creatorhub'] = 'creatorhub';

const ID_MAP: Record<string, NavIconKey> = {
  home: 'home',
  feed: 'home',
  friends: 'friends',
  wevchat: 'wevchat',
  messages: 'wevchat',
  reels: 'reels',
  wevmall: 'wevmall',
  marketplace: 'wevmall',
  notifications: 'notifications',
  groups: 'groups',
  phantom: 'phantom',
  space: 'space',
  spaces: 'space',
  live: 'live',
  campus: 'campus',
  academic: 'academic',
  study: 'study',
  'ai-study': 'study',
  creatorhub: 'creatorhub',
  'creator-hub': 'creatorhub',
  aipost: 'aipost',
  'ai-post': 'aipost',
  jobs: 'jobs',
  photos: 'photos',
  videos: 'videos',
  explore: 'explore',
  events: 'events',
  watchparty: 'watchparty',
  'watch-party': 'watchparty',
  rewards: 'rewards',
  wallet: 'wallet',
  donate: 'donate',
  insights: 'insights',
  analytics: 'insights',
  content: 'content',
  guardian: 'guardian',
  bulletins: 'bulletins',
  settings: 'settings',
  help: 'help',
  support: 'support',
  search: 'search',
  switch: 'switch',
  'switch-account': 'switch',
  logout: 'logout',
  whatsapp: 'whatsapp',
};

function cleanPath(to: string): string {
  const path = to.split('?')[0].split('#')[0].trim();
  if (!path) return '/';
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;
}

export function navIconKeyFromTo(to?: string | null): NavIconKey | null {
  if (!to) return null;
  const path = cleanPath(to);
  return PATH_MAP[path] ?? PATH_MAP[path.toLowerCase()] ?? null;
}

export function navIconKeyFromId(id?: string | null): NavIconKey | null {
  if (!id) return null;
  const key = String(id).trim();
  return ID_MAP[key] ?? ID_MAP[key.toLowerCase()] ?? null;
}

export function resolveNavIconKey(input: {
  to?: string | null;
  id?: string | null;
  iconKey?: string | null;
}): NavIconKey | null {
  if (input.iconKey) return input.iconKey;
  return navIconKeyFromTo(input.to) ?? navIconKeyFromId(input.id);
}
