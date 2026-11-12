import { describe, expect, it } from 'vitest';
import {
  CREATOR_TAB_MODES,
  CREATOR_TAB_ORDER,
  creatorTabsForMode,
  filterHubNav,
  isCreatorTabAllowed,
  isHubNavTargetAllowed,
  resolveCreatorTab,
  type HubNavNode,
} from './creatorHubTools';

const NOT_IN_PERSONAL_HUB = ['team', 'store', 'admin', 'batch'] as const;

describe('creatorHubTools registry', () => {
  it('lists every tab exactly once', () => {
    expect(new Set(CREATOR_TAB_ORDER).size).toBe(CREATOR_TAB_ORDER.length);
    expect([...CREATOR_TAB_ORDER].sort()).toEqual(Object.keys(CREATOR_TAB_MODES).sort());
  });

  it('personal hub has personal + shared tools, no Team / Store / Admin / Batch', () => {
    const personal = creatorTabsForMode('personal');
    for (const t of NOT_IN_PERSONAL_HUB) expect(personal).not.toContain(t);
    for (const t of ['overview', 'analytics', 'mentions', 'monetization', 'boost', 'invite', 'security', 'content_studio', 'live_studio', 'tools']) {
      expect(personal).toContain(t);
    }
  });

  it('Space hub only has tabs whose APIs are Space-scoped (plus link-only tabs)', () => {
    expect(creatorTabsForMode('space')).toEqual([
      'overview', 'ai_assistant', 'ai_coach', 'analytics', 'community', 'content_library', 'calendar', 'security',
      'batch', 'tools', 'inspiration', 'mentions', 'activity',
    ]);
  });

  it('Batch is Space-hub only (Upload / History / Cleanup / ADU)', () => {
    expect(isCreatorTabAllowed('batch', 'personal')).toBe(false);
    expect(isCreatorTabAllowed('batch', 'space')).toBe(true);
    expect(resolveCreatorTab('batch', 'personal')).toBe('overview');
    expect(resolveCreatorTab('batch', 'space')).toBe('batch');
  });

  it('personal-only tools (no Space column in their data) stay out of the Space hub', () => {
    for (const t of ['content_studio', 'monetization', 'brand_collab', 'live_studio', 'ab_testing', 'playlists', 'boost', 'coauthor', 'invite', 'upgrade', 'learn']) {
      expect(isCreatorTabAllowed(t, 'space')).toBe(false);
      expect(isCreatorTabAllowed(t, 'personal')).toBe(true);
    }
  });

  it('Admin is in neither hub', () => {
    expect(isCreatorTabAllowed('admin', 'personal')).toBe(false);
    expect(isCreatorTabAllowed('admin', 'space')).toBe(false);
  });

  it('?tab= deep links to the other hub (or unknown tabs) fall back to overview', () => {
    expect(resolveCreatorTab('boost', 'personal')).toBe('boost');
    expect(resolveCreatorTab('boost', 'space')).toBe('overview');
    expect(resolveCreatorTab('mentions', 'space')).toBe('mentions');
    expect(resolveCreatorTab('team', 'personal')).toBe('overview');
    expect(resolveCreatorTab('admin', 'space')).toBe('overview');
    expect(resolveCreatorTab('nope', 'personal')).toBe('overview');
    expect(resolveCreatorTab(null, 'space')).toBe('overview');
    expect(resolveCreatorTab('live', 'personal')).toBe('live_studio');
    expect(resolveCreatorTab('analytics', 'space')).toBe('analytics');
  });

  it('Upgrade needs Creator Pro and is personal-only', () => {
    expect(resolveCreatorTab('upgrade', 'personal', { proEnabled: false })).toBe('overview');
    expect(resolveCreatorTab('upgrade', 'personal', { proEnabled: true })).toBe('upgrade');
    expect(resolveCreatorTab('upgrade', 'space', { proEnabled: true })).toBe('overview');
  });

  it('resolves Space-hub `to` links the way a click would', () => {
    expect(isHubNavTargetAllowed({ to: '/reels' }, 'space')).toBe(false); // -> content_studio (personal)
    expect(isHubNavTargetAllowed({ to: '/videos' }, 'space')).toBe(true); // -> content_library
    expect(isHubNavTargetAllowed({ to: '/business/team' }, 'space')).toBe(true);
    expect(isHubNavTargetAllowed({ to: '/reels' }, 'personal')).toBe(true);
  });

  it('filterHubNav drops other-hub entries and empty parents', () => {
    type N = HubNavNode & { id: string; children?: N[] };
    const tree: N[] = [
      { id: 'dash', target: { tab: 'overview' } },
      { id: 'boost', target: { tab: 'boost' } },
      { id: 'batch_upload', target: { to: '/business/batch' }, modes: ['space'] },
      {
        id: 'settings',
        children: [
          { id: 'team', target: { to: '/business/team' }, modes: ['space'] },
          { id: 'security', target: { tab: 'security' }, modes: ['personal'] },
          { id: 'recommendation', target: { tab: 'security' } },
        ],
      },
      { id: 'monetization', target: { tab: 'monetization' }, children: [{ id: 'stars', target: { tab: 'monetization' } }] },
    ];
    const personal = filterHubNav(tree, 'personal');
    expect(personal.map((n) => n.id)).toEqual(['dash', 'boost', 'settings', 'monetization']);
    expect(personal.find((n) => n.id === 'settings')!.children!.map((c) => (c as N).id)).toEqual(['security', 'recommendation']);

    const space = filterHubNav(tree, 'space');
    expect(space.map((n) => n.id)).toEqual(['dash', 'batch_upload', 'settings']);
    expect(space.find((n) => n.id === 'settings')!.children!.map((c) => (c as N).id)).toEqual(['team', 'recommendation']);
  });
});