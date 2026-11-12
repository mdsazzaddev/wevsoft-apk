import { describe, expect, it } from 'vitest';
import {
  PERSONAL_CREATOR_HUB_PATH,
  SPACE_CREATOR_HUB_PATH,
  creatorHubPath,
  creatorHubPathForMode,
  isCreatorHubEntryPath,
  isCreatorHubPath,
  isPersonalCreatorHubPath,
  isSpaceCreatorHubPath,
  personalCreatorHubPath,
  spaceCreatorHubPath,
} from './creatorHub';

describe('creatorHub paths (personal vs Space hub)', () => {
  it('has separate personal (main app) and Space (Business Suite) hubs', () => {
    expect(PERSONAL_CREATOR_HUB_PATH).toBe('/creator-hub');
    expect(SPACE_CREATOR_HUB_PATH).toBe('/business/creator-hub');
    expect(isPersonalCreatorHubPath('/creator-hub?tab=mentions')).toBe(true);
    expect(isPersonalCreatorHubPath('/business/creator-hub')).toBe(false);
    expect(isSpaceCreatorHubPath('/business/creator-hub')).toBe(true);
    expect(isSpaceCreatorHubPath('/creator-hub')).toBe(false);
    expect(isCreatorHubPath('/creator-hub')).toBe(true);
    expect(isCreatorHubPath('/business/creator-hub/')).toBe(true);
    expect(isCreatorHubPath('/creator-hubs')).toBe(false);
  });

  it('builds personal hub deep links', () => {
    expect(personalCreatorHubPath()).toBe('/creator-hub');
    expect(personalCreatorHubPath('overview')).toBe('/creator-hub');
    expect(personalCreatorHubPath('analytics')).toBe('/creator-hub?tab=analytics');
    expect(personalCreatorHubPath('monetization', 'stars')).toBe('/creator-hub?tab=monetization&sub=stars');
  });

  it('builds Space hub deep links with an optional Space preselect', () => {
    expect(spaceCreatorHubPath()).toBe('/business/creator-hub');
    expect(spaceCreatorHubPath('analytics', null, 'sp_1')).toBe('/business/creator-hub?tab=analytics&spaceId=sp_1');
    expect(creatorHubPathForMode('space', 'calendar')).toBe('/business/creator-hub?tab=calendar');
    expect(creatorHubPathForMode('personal', 'calendar')).toBe('/creator-hub?tab=calendar');
  });

  it('in-hub links stay on the personal hub outside Business Suite', () => {
    expect(creatorHubPath('batch')).toBe('/creator-hub?tab=batch');
    expect(creatorHubPath()).toBe('/creator-hub');
  });

  it('recognises current and legacy entry URLs', () => {
    expect(isCreatorHubEntryPath('/creator-hub')).toBe(true);
    expect(isCreatorHubEntryPath('/creator')).toBe(true);
    expect(isCreatorHubEntryPath('/pro-studio')).toBe(true);
    expect(isCreatorHubEntryPath('/professional-dashboard')).toBe(true);
    expect(isCreatorHubEntryPath('/business/dashboard')).toBe(true);
    expect(isCreatorHubEntryPath('/business/creator-hub?tab=batch')).toBe(true);
    expect(isCreatorHubEntryPath('/home')).toBe(false);
  });
});