/**
 * Nav consolidation (Phase 2 P2-4, D2): related pages share one sidebar entry and a tab strip.
 * URLs do not move: every existing path keeps working, so bookmarks, docs and deep links need no redirect.
 */
export interface SectionTab {
  label: string;
  to: string;
  /** Slug when the page also lives under /developer/apps/:id/<slug>. */
  scoped?: string;
}

export interface SectionTabGroup {
  id: string;
  /** Sidebar label that represents the whole group. */
  primary: string;
  tabs: SectionTab[];
}

export const SECTION_TAB_GROUPS: SectionTabGroup[] = [
  {
    id: 'access',
    primary: 'Security & Access',
    tabs: [
      { label: 'Security & Access', to: '/developer/security', scoped: 'access' },
      { label: 'Permissions & Review', to: '/developer/permissions' },
      { label: 'Scopes & Permissions', to: '/developer/scopes' },
    ],
  },
  {
    id: 'webhooks',
    primary: 'Webhooks',
    tabs: [
      { label: 'Webhooks', to: '/developer/webhooks' },
      { label: 'Verification & Callbacks', to: '/developer/callbacks' },
      { label: 'Payloads & Batching', to: '/developer/webhook-schemas' },
    ],
  },
];

/** Sidebar labels now reached through a tab strip (still in NAV_GROUPS for search and legacy links). */
export const MERGED_NAV_LABELS = ['Permissions & Review', 'Scopes & Permissions', 'Webhook Verification & Callbacks', 'Webhook Payloads & Batching'];

const clean = (p: string) => p.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

export function tabMatches(tab: SectionTab, pathname: string): boolean {
  const path = clean(pathname);
  if (path === tab.to) return true;
  const m = /^\/developer\/apps\/[^/]+\/([^/]+)$/.exec(path);
  return Boolean(tab.scoped && m && m[1] === tab.scoped);
}

export function tabGroupFor(pathname: string): { group: SectionTabGroup; active: number } | null {
  for (const group of SECTION_TAB_GROUPS) {
    const active = group.tabs.findIndex((t) => tabMatches(t, pathname));
    if (active >= 0) return { group, active };
  }
  return null;
}

/** The group's primary sidebar item stays highlighted on any of its tabs. */
export function primaryActiveFor(itemTo: string, pathname: string): boolean {
  const hit = tabGroupFor(pathname);
  return Boolean(hit && hit.group.tabs[0].to === clean(itemTo));
}
