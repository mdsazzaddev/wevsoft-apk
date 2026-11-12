import type { NavGroup, NavItem } from './DeveloperConsoleShell';
import { MERGED_NAV_LABELS } from './navTabs';

/**
 * Sidebar layout: regroups the console nav (NAV_GROUPS, used by search/legacy redirects too)
 * into a few task-based sections. Only "Home" is expanded by default; the rest start collapsed.
 * Items are matched by label; anything not listed lands in "More" so nothing disappears.
 */
export interface SidebarSection {
  id: string;
  label: string;
  defaultOpen: boolean;
  items: NavItem[];
}

const LAYOUT: { id: string; label: string; defaultOpen?: boolean; labels: string[] }[] = [
  { id: 'home', label: 'Home', defaultOpen: true, labels: ['Dashboard', 'My Apps', 'Create App', 'Analytics', 'API Explorer', 'Documentation'] },
  { id: 'apps', label: 'Apps & Publishing', labels: ['App Environments', 'App Reviews & Publishing', 'App Directory', 'Test Users', 'Domain Verification', 'Embed Widgets'] },
  { id: 'auth', label: 'Auth & Keys', labels: ['OAuth 2.0', 'OAuth Clients', 'OpenID Connect', 'API Keys & Secrets', 'Service Accounts & Staging', 'Scopes & Permissions', 'Permissions & Review', 'Token Debugger'] },
  { id: 'build', label: 'APIs & Webhooks', labels: ['API Reference', 'API Versions & Changelog', 'Webhooks', 'Webhook Verification & Callbacks', 'Webhook Payloads & Batching'] },
  { id: 'integrations', label: 'Integrations', labels: ['Connected Apps', 'Social Platforms', 'WevChat Integrations', 'AI Providers', 'Storage & Files', 'Payments & Commerce', 'Other Integrations'] },
  { id: 'growth', label: 'Growth', labels: ['Ads & Marketing API', 'Product Catalog Feeds', 'Custom Audiences', 'Push Notifications'] },
  { id: 'monitor', label: 'Monitor', labels: ['Recent Activity', 'Logs & Monitoring', 'Usage & Quotas', 'Limits & Alerts', 'System Status'] },
  { id: 'security', label: 'Security', labels: ['Security & Access', 'Authorized Applications', 'Trust & Compliance'] },
  { id: 'account', label: 'Account & Help', labels: ['Monetization & Payouts', 'Team & Access', 'Developer Settings', 'Support'] },
];

export function buildSidebarSections(groups: NavGroup[]): SidebarSection[] {
  // P2-4: merged pages are reached from their group's tab strip, not their own sidebar row.
  const all = groups.flatMap((g) => g.items).filter((i) => !MERGED_NAV_LABELS.includes(i.label));
  const byLabel = new Map(all.map((i) => [i.label, i] as const));
  const used = new Set<string>();
  const sections: SidebarSection[] = LAYOUT.map((s) => ({
    id: s.id,
    label: s.label,
    defaultOpen: Boolean(s.defaultOpen),
    items: s.labels.flatMap((l) => {
      const it = byLabel.get(l);
      if (!it || used.has(l)) return [];
      used.add(l);
      return [it];
    }),
  })).filter((s) => s.items.length > 0);
  const rest = all.filter((i) => !used.has(i.label));
  if (rest.length) sections.push({ id: 'more', label: 'More', defaultOpen: false, items: rest });
  return sections;
}