/**
 * Settings Center navigation groups (Settings Center upgrade, 2026-10-27).
 *
 * Pure grouping layer over CONSUMER_SETTINGS_CATEGORIES: it never adds, removes
 * or renames a category, so every existing deep link (/settings?category=...)
 * keeps working. Groups that would be empty are not rendered (no fake
 * categories). Any category not listed below falls into "More settings" so a
 * newly added category can never silently disappear from navigation.
 */
import {
  CONSUMER_SETTINGS_CATEGORIES,
  type ConsumerSettingCategory,
} from '../pages/consumerSettingsData';

export interface SettingsNavGroupDef {
  id: string;
  label: string;
  categoryIds: string[];
}

export const SETTINGS_NAV_GROUP_DEFS: SettingsNavGroupDef[] = [
  { id: 'account_centre', label: 'Account Centre', categoryIds: ['account'] },
  { id: 'language_region', label: 'Language', categoryIds: ['language'] },
  { id: 'password_security', label: 'Password and Security', categoryIds: ['privacy_security'] },
  {
    id: 'preferences',
    label: 'Preferences',
    categoryIds: ['notifications', 'display_options', 'appearance_theme', 'media_playback', 'accessibility'],
  },
  { id: 'audience_visibility', label: 'Audience and Visibility', categoryIds: ['friends_connections', 'communities_groups'] },
  { id: 'content_feed', label: 'Content and Feed', categoryIds: ['posts_content', 'stories_media', 'reels'] },
  { id: 'messaging_calls', label: 'Messaging and Calls', categoryIds: ['messages_chats'] },
  { id: 'creator_professional', label: 'Creator and Professional Tools', categoryIds: ['professional_tools'] },
  { id: 'payments_orders', label: 'Payments and Orders', categoryIds: ['wallet_payments', 'marketplace_shopping'] },
  { id: 'apps_integrations', label: 'Apps and Integrations', categoryIds: ['ai_features', 'ai_center'] },
  { id: 'community_legal', label: 'Community and Legal', categoryIds: ['about_legal'] },
  { id: 'status_support', label: 'Account Status and Support', categoryIds: ['support_help'] },
];

export interface SettingsNavGroup {
  id: string;
  label: string;
  categories: ConsumerSettingCategory[];
}

export function buildSettingsNavGroups(
  categories: ConsumerSettingCategory[] = CONSUMER_SETTINGS_CATEGORIES,
): SettingsNavGroup[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const used = new Set<string>();
  const groups: SettingsNavGroup[] = [];
  for (const def of SETTINGS_NAV_GROUP_DEFS) {
    const cats: ConsumerSettingCategory[] = [];
    for (const id of def.categoryIds) {
      const c = byId.get(id);
      if (c && !used.has(c.id)) {
        used.add(c.id);
        cats.push(c);
      }
    }
    if (cats.length) groups.push({ id: def.id, label: def.label, categories: cats });
  }
  const rest = categories.filter((c) => !used.has(c.id));
  if (rest.length) groups.push({ id: 'more', label: 'More settings', categories: rest });
  return groups;
}

export const SETTINGS_NAV_GROUPS = buildSettingsNavGroups();

export function groupForCategory(categoryId: string | null | undefined): SettingsNavGroup | null {
  if (!categoryId) return null;
  return SETTINGS_NAV_GROUPS.find((g) => g.categories.some((c) => c.id === categoryId)) ?? null;
}

/** Matching option count per category, so sidebar search reaches individual settings too. */
export function matchSettingsCategories(
  query: string,
  tr?: (s: string) => string,
): { category: ConsumerSettingCategory; matches: number }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const blob = (english: string) => {
    const localized = tr ? tr(english) : english;
    return `${english} ${localized}`.toLowerCase();
  };
  const out: { category: ConsumerSettingCategory; matches: number }[] = [];
  for (const group of SETTINGS_NAV_GROUPS) {
    const groupHit = blob(group.label).includes(q);
    for (const category of group.categories) {
      const catHit = groupHit || blob(category.name).includes(q) || blob(category.description).includes(q);
      const matches = category.options.filter((o) => {
        const aliasHit = (o.searchAliases || []).some(
          (a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()),
        );
        return blob(o.name).includes(q) || blob(o.description).includes(q) || aliasHit;
      }).length;
      if (catHit || matches > 0) out.push({ category, matches });
    }
  }
  return out;
}