/**
 * Creator Hub paths: personal (main app / :3000) vs Space (Business Suite / :3004).
 */
import { getBusinessAppUrl } from './businessAppUrl';
import { consumerAppUrl, isBusinessAppHost } from './consumerAppUrl';

export const CREATOR_HUB_NAME = 'Creator Hub';

/** Personal Creator Hub on the consumer app. */
export const PERSONAL_CREATOR_HUB_PATH = '/creator-hub';
/** Space Creator Hub on Business Suite. */
export const SPACE_CREATOR_HUB_PATH = '/business/creator-hub';

/**
 * Default in-app hub path for the current host.
 * On Business Suite → Space hub; on the consumer app → personal hub.
 */
export const CREATOR_HUB_PATH = typeof window !== 'undefined' && isBusinessAppHost()
  ? SPACE_CREATOR_HUB_PATH
  : PERSONAL_CREATOR_HUB_PATH;

/** Old personal-hub URLs that still redirect into the personal hub entry. */
export const CREATOR_HUB_LEGACY_PATHS = [
  '/creator',
  '/pro-studio',
  '/professional-dashboard',
  '/business/dashboard',
] as const;

export type CreatorHubMode = 'personal' | 'space';

function hubQuery(tab?: string | null, sub?: string | null, spaceId?: string | null): string {
  const q = new URLSearchParams();
  if (tab && tab !== 'overview') q.set('tab', tab);
  if (sub) q.set('sub', sub);
  if (spaceId) q.set('spaceId', spaceId);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

export function personalCreatorHubPath(tab?: string | null, sub?: string | null): string {
  return `${PERSONAL_CREATOR_HUB_PATH}${hubQuery(tab, sub)}`;
}

export function spaceCreatorHubPath(tab?: string | null, sub?: string | null, spaceId?: string | null): string {
  return `${SPACE_CREATOR_HUB_PATH}${hubQuery(tab, sub, spaceId)}`;
}

/** In-hub link for the current host (personal on :3000, Space on Business). */
export function creatorHubPath(tab?: string | null, sub?: string | null): string {
  if (typeof window !== 'undefined' && isBusinessAppHost()) {
    return spaceCreatorHubPath(tab, sub);
  }
  return personalCreatorHubPath(tab, sub);
}

export function creatorHubPathForMode(mode: CreatorHubMode, tab?: string | null, sub?: string | null, spaceId?: string | null): string {
  return mode === 'space' ? spaceCreatorHubPath(tab, sub, spaceId) : personalCreatorHubPath(tab, sub);
}

export function isPersonalCreatorHubPath(path: string): boolean {
  const p = path.split('?')[0];
  return p === PERSONAL_CREATOR_HUB_PATH || p.startsWith(`${PERSONAL_CREATOR_HUB_PATH}/`);
}

export function isSpaceCreatorHubPath(path: string): boolean {
  const p = path.split('?')[0];
  return p === SPACE_CREATOR_HUB_PATH || p.startsWith(`${SPACE_CREATOR_HUB_PATH}/`);
}

export function isCreatorHubPath(path: string): boolean {
  return isPersonalCreatorHubPath(path) || isSpaceCreatorHubPath(path);
}

export function isCreatorHubEntryPath(path: string): boolean {
  const p = path.split('?')[0].replace(/\/$/, '') || '/';
  if (isCreatorHubPath(p)) return true;
  return (CREATOR_HUB_LEGACY_PATHS as readonly string[]).some((x) => p === x || p.startsWith(`${x}/`));
}

export function personalCreatorHubUrl(tab?: string | null, sub?: string | null): string {
  return consumerAppUrl(personalCreatorHubPath(tab, sub));
}

export function spaceCreatorHubUrl(tab?: string | null, sub?: string | null, spaceId?: string | null): string {
  return getBusinessAppUrl(spaceCreatorHubPath(tab, sub, spaceId));
}

/** Absolute URL into the Space hub on Business Suite (from main app / profile). */
export function creatorHubAppUrl(tab?: string | null, sub?: string | null): string {
  return spaceCreatorHubUrl(tab, sub);
}

/** Runtime mode for the current host (used by Content Studio etc.). */
export function currentCreatorHubMode(): CreatorHubMode {
  return typeof window !== 'undefined' && isBusinessAppHost() ? 'space' : 'personal';
}
