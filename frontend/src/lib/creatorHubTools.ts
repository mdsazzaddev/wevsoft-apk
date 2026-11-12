/**
 * Creator Hub tool registry: the ONE place that says which tab belongs to which hub.
 *
 *  - 'personal' = Personal Creator Hub on the main app (/creator-hub).
 *  - 'space'    = Space Creator Hub on Business Suite (/business/creator-hub).
 *
 * A tab may only be 'space' when every API it calls is Space-scoped (accepts
 * `?spaceId=` via `resolveCreatorContentScope`). Tabs whose endpoints still read the
 * signed-in user's own data stay personal-only so a Space never shows (or writes)
 * personal data. CreatorDashboardPage (TABS + ?tab= deep links), CreatorSidebar and
 * CreatorToolsView all filter through here.
 */
import type { CreatorTab } from '../components/creator/studio/CreatorSidebar';
import type { CreatorHubMode } from './creatorHub';
import { resolveBusinessCreatorNav } from './creatorBusinessNav';

const BOTH: readonly CreatorHubMode[] = ['personal', 'space'];
const PERSONAL: readonly CreatorHubMode[] = ['personal'];
const SPACE: readonly CreatorHubMode[] = ['space'];
const NONE: readonly CreatorHubMode[] = [];

export const CREATOR_TAB_MODES: Record<CreatorTab, readonly CreatorHubMode[]> = {
  // Space-scoped backends (?spaceId=): /creator/dashboard, /api/content-insights, /creator/content, /creator/planner.
  overview: BOTH,
  analytics: BOTH,
  content_library: BOTH,
  calendar: BOTH,
  ai_coach: BOTH, // reads /creator/content (scoped)
  // No per-user data.
  tools: BOTH,
  inspiration: BOTH, // global trending audio/topics + static prompts
  ai_assistant: BOTH, // links only; targets are mode-aware
  // Space-scoped since 2026-11-10 (backend `withCreatorScope`, ?spaceId=, non-member 403).
  // Personal-account parts inside them (Top Fans, Moderation Assist rules, tag approval,
  // Security & Copyright sub-tab) are hidden in the Space hub by the views themselves.
  community: BOTH, // /creator/community + /creator/moderation-assist/logs|unhide|delete
  mentions: BOTH, // /creator/mentions + /mentions/read (Space: read-only inbox)
  activity: BOTH, // /creator/activity (Space: the Space's content + moderation)
  security: BOTH, // /creator/recommendation-status + /recommendation/appeal
  // Personal-only: the data has no Space attribution column (per-user tables or the
  // user's AccountSettings JSON). The backend refuses ?spaceId= on these with 400
  // (PERSONAL_ONLY_CREATOR_PATHS in backend/src/server/social/creator-scope.ts).
  content_studio: PERSONAL, // ReelUploadModal publishes as the personal account
  monetization: PERSONAL, // /creator/studio, /creator/payouts, /creator/stars (per-user money)
  brand_collab: PERSONAL, // WevCreatorProfile / CreatorSponsorship (Space: Business Suite Creators)
  live_studio: PERSONAL, // LiveStream.userId only (Space: Business Suite Live)
  upgrade: PERSONAL,
  ab_testing: PERSONAL, // tests stored in the user's AccountSettings JSON
  playlists: PERSONAL, // CreatorPlaylist.userId only
  invite: PERSONAL,
  coauthor: PERSONAL,
  boost: PERSONAL, // a boost is a personal action (PostBoost.boosterId); Space: Business Suite Ads
  learn: PERSONAL,
  // Space hub only: Batch Upload + FB cleanup / ADU (CreatorBatchHub). Personal hub
  // still uses /ai/post and consumer create tools — no personal Batch tab.
  batch: SPACE,
  // Team & roles / Shop are Business Suite pages; Admin lives in the admin app.
  team: NONE,
  store: NONE,
  admin: NONE,
};

/** Display order of hub tabs (embedded tab strip, deep-link validation). */
export const CREATOR_TAB_ORDER: readonly CreatorTab[] = [
  'overview', 'content_studio', 'ai_assistant', 'ai_coach', 'analytics', 'community', 'monetization',
  'brand_collab', 'store', 'live_studio', 'content_library', 'calendar', 'team', 'security', 'admin', 'upgrade', 'batch', 'tools',
  'ab_testing', 'inspiration', 'playlists', 'mentions', 'activity', 'invite', 'coauthor', 'boost', 'learn',
];

export function isCreatorTab(tab: unknown): tab is CreatorTab {
  return typeof tab === 'string' && Object.prototype.hasOwnProperty.call(CREATOR_TAB_MODES, tab);
}

export function isCreatorTabAllowed(tab: unknown, mode: CreatorHubMode): tab is CreatorTab {
  return isCreatorTab(tab) && CREATOR_TAB_MODES[tab].includes(mode);
}

export function creatorTabsForMode(mode: CreatorHubMode): CreatorTab[] {
  return CREATOR_TAB_ORDER.filter((t) => isCreatorTabAllowed(t, mode));
}

/**
 * `?tab=` -> the tab to render. Unknown tabs, tabs from the other hub and Upgrade
 * while Creator Pro is off all fall back to the overview.
 */
export function resolveCreatorTab(
  raw: string | null | undefined,
  mode: CreatorHubMode,
  opts: { proEnabled?: boolean } = {},
): CreatorTab {
  const tab = raw === 'live' ? 'live_studio' : raw;
  if (!isCreatorTabAllowed(tab, mode)) return 'overview';
  if (tab === 'upgrade' && !opts.proEnabled) return 'overview';
  return tab;
}

export type HubNavTarget = { tab: CreatorTab } | { to: string };

/** A `{ tab }` or `{ to }` link is usable in this hub (Space-hub paths are resolved like a click would). */
export function isHubNavTargetAllowed(target: HubNavTarget, mode: CreatorHubMode): boolean {
  if ('tab' in target) return isCreatorTabAllowed(target.tab, mode);
  if (mode === 'space') {
    const resolved = resolveBusinessCreatorNav(target.to);
    if (resolved?.kind === 'tab') return isCreatorTabAllowed(resolved.tab, mode);
  }
  return true;
}

export interface HubNavNode {
  target?: HubNavTarget;
  /** Explicit hubs for this entry; default = derived from the target. */
  modes?: readonly CreatorHubMode[];
  children?: HubNavNode[];
}

function nodeAllowed(node: HubNavNode, mode: CreatorHubMode): boolean {
  if (node.modes && !node.modes.includes(mode)) return false;
  return node.target ? isHubNavTargetAllowed(node.target, mode) : true;
}

/**
 * Filter a sidebar/tool tree for one hub. Children are filtered first; a parent whose
 * own target belongs to the other hub keeps its remaining children (and loses its
 * target), and is dropped when nothing is left.
 */
export function filterHubNav<T extends HubNavNode>(items: readonly T[], mode: CreatorHubMode): T[] {
  const out: T[] = [];
  for (const item of items) {
    if (item.modes && !item.modes.includes(mode)) continue;
    const children = item.children?.filter((c) => nodeAllowed(c, mode));
    const targetOk = item.target ? isHubNavTargetAllowed(item.target, mode) : false;
    if (item.children) {
      if (!children?.length && !targetOk) continue;
      out.push({ ...item, target: targetOk ? item.target : undefined, children: children?.length ? children : undefined });
    } else {
      if (!targetOk) continue;
      out.push({ ...item });
    }
  }
  return out;
}