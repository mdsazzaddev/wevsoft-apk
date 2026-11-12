import { describe, expect, it } from 'vitest';
import { CONSUMER_SETTINGS_CATEGORIES } from '../pages/consumerSettingsData';
import { SETTINGS_NAV_GROUPS, buildSettingsNavGroups, groupForCategory, matchSettingsCategories } from './settingsNavGroups';

describe('settings nav groups', () => {
  it('keeps every existing category exactly once (no settings lost)', () => {
    const ids = SETTINGS_NAV_GROUPS.flatMap((g) => g.categories.map((c) => c.id));
    expect(ids.sort()).toEqual(CONSUMER_SETTINGS_CATEGORIES.map((c) => c.id).sort());
  });
  it('never renders empty groups', () => {
    expect(SETTINGS_NAV_GROUPS.every((g) => g.categories.length > 0)).toBe(true);
  });
  it('puts unknown categories into More settings', () => {
    const groups = buildSettingsNavGroups([{ id: 'zz_new', name: 'New', description: '', iconName: 'X', options: [] }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('more');
  });
  it('maps account to Account Centre', () => {
    expect(groupForCategory('account')?.id).toBe('account_centre');
    expect(groupForCategory(null)).toBeNull();
  });
  it('search reaches individual settings and group labels', () => {
    expect(matchSettingsCategories('password').length).toBeGreaterThan(0);
    expect(matchSettingsCategories('Messaging and Calls').map((m) => m.category.id)).toContain('messages_chats');
    expect(matchSettingsCategories('   ')).toEqual([]);
    expect(matchSettingsCategories('zzqqxx-nothing')).toEqual([]);
  });
});