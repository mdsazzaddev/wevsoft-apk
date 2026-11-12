import { BadgeCheck, BellRing, Bug, FileJson, Fingerprint, GitBranch, Link2, Megaphone, PackageSearch, Server, Share2, ShieldCheck, Smartphone, Users } from 'lucide-react';
import type { NavGroup, NavItem } from './DeveloperConsoleShell';

/** Sidebar entries for developer-platform pages. Merged into the console nav by mergeNav(). */
export interface PlatformNavEntry {
  group: string;
  groupId: string;
  /** Insert after the item with this label (appended when missing). */
  after?: string;
  item: NavItem;
}

const AUTH = { group: 'Authentication & Security', groupId: 'auth' };
const TOOLS = { group: 'Developer Tools', groupId: 'tools' };
const GROWTH = { group: 'Growth & Commerce', groupId: 'growth' };
const PLATFORM = { group: 'Platform & Account', groupId: 'platform' };

export const PLATFORM_NAV: PlatformNavEntry[] = [
  // Authentication & Security
  { ...AUTH, after: 'OAuth 2.0', item: { label: 'OpenID Connect', icon: Fingerprint, target: { kind: 'route', to: '/developer/oidc' }, keywords: 'oidc openid id_token jwks discovery nonce sign in' } },
  { ...AUTH, after: 'API Keys & Secrets', item: { label: 'Service Accounts & Staging', icon: Server, target: { kind: 'route', to: '/developer/service-accounts' }, keywords: 'service account system user staging key jwt bearer public key rotate' } },
  { ...AUTH, after: 'Scopes & Permissions', item: { label: 'Permissions & Review', icon: ShieldCheck, target: { kind: 'route', to: '/developer/permissions' }, keywords: 'scope review sensitive permission approval justification' } },
  { ...AUTH, after: 'Permissions & Review', item: { label: 'Token Debugger', icon: Bug, target: { kind: 'route', to: '/developer/token-debugger' }, keywords: 'token debug inspect introspect id_token expired scopes' } },

  // Developer Tools
  { ...TOOLS, after: 'API Explorer', item: { label: 'Sharing Debugger', icon: Share2, target: { kind: 'route', to: '/developer/sharing-debugger' }, keywords: 'sharing debugger open graph og linter preview url card scrape' } },
  { ...TOOLS, after: 'Usage & Quotas', item: { label: 'Limits & Alerts', icon: BellRing, target: { kind: 'route', to: '/developer/limits' }, keywords: 'quota tier plan increase alert threshold abuse usage' } },
  { ...TOOLS, after: 'API Reference', item: { label: 'API Versions & Changelog', icon: GitBranch, target: { kind: 'route', to: '/developer/changelog' }, keywords: 'version deprecation sunset changelog release discovery openapi' } },
  { ...TOOLS, after: 'Webhooks', item: { label: 'Webhook Verification & Callbacks', icon: Link2, target: { kind: 'route', to: '/developer/callbacks' }, keywords: 'webhook challenge verify deauthorize data deletion callback signed_request' } },
  { ...TOOLS, after: 'Webhook Verification & Callbacks', item: { label: 'Webhook Payloads & Batching', icon: FileJson, target: { kind: 'route', to: '/developer/webhook-schemas' }, keywords: 'webhook schema json payload batch batching events example' } },

  // Growth & Commerce (new group)
  { ...GROWTH, item: { label: 'Ads & Marketing API', icon: Megaphone, target: { kind: 'route', to: '/developer/ads' }, keywords: 'ads advertising campaigns marketing conversions capi pixel wevspace promotion' } },
  { ...GROWTH, after: 'Ads & Marketing API', item: { label: 'Product Catalog Feeds', icon: PackageSearch, target: { kind: 'route', to: '/developer/catalog-feeds' }, keywords: 'catalog feed product csv json merchant sync shop marketplace import' } },
  { ...GROWTH, after: 'Product Catalog Feeds', item: { label: 'Custom Audiences', icon: Users, target: { kind: 'route', to: '/developer/audiences' }, keywords: 'custom audience hashed email phone customer list targeting ads' } },
  { ...GROWTH, after: 'Custom Audiences', item: { label: 'Push Notifications', icon: Smartphone, target: { kind: 'route', to: '/developer/push' }, keywords: 'push fcm apns mobile device token notification ios android' } },

  // Platform & Account ("Support" already exists in the base nav; no duplicate entry)
  { ...PLATFORM, after: 'Team & Access', item: { label: 'Trust & Compliance', icon: BadgeCheck, target: { kind: 'route', to: '/developer/compliance' }, keywords: 'business verification data use checkup security attestation policy strike suspension appeal compliance' } },
];

export function mergeNav(base: NavGroup[]): NavGroup[] {
  const groups = base.map((g) => ({ ...g, items: [...g.items] }));
  for (const entry of PLATFORM_NAV) {
    let g = groups.find((x) => x.label === entry.group);
    if (!g) {
      g = { id: entry.groupId, label: entry.group, items: [] };
      groups.push(g);
    }
    if (g.items.some((i) => i.label === entry.item.label)) continue;
    const at = entry.after ? g.items.findIndex((i) => i.label === entry.after) : -1;
    if (at >= 0) g.items.splice(at + 1, 0, entry.item);
    else g.items.push(entry.item);
  }
  return groups;
}
