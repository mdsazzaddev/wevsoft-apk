import { describe, expect, it } from 'vitest';
import {
  groupProfileManagerRows,
  resolveViewAs,
  settingsOptPath,
  viewAsQueryPath,
  visibleProfileManagerRows,
  PROFILE_MANAGER_ROWS,
} from './profileManager.logic';

describe('visibleProfileManagerRows', () => {
  it('phase 0 includes edit, hub, archive, settings and excludes later phases', () => {
    const rows = visibleProfileManagerRows({ maxPhase: 0, hasFrame: true });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('edit_profile');
    expect(ids).toContain('creator_hub');
    expect(ids).toContain('archive');
    expect(ids).toContain('settings');
    expect(ids).toContain('avatar_frame');
    expect(ids).not.toContain('view_as');
    expect(ids).not.toContain('action_buttons');
    expect(ids).not.toContain('advertising');
    expect(ids).not.toContain('verification');
  });

  it('hides avatar frame when host has no frame handler', () => {
    const rows = visibleProfileManagerRows({ maxPhase: 0, hasFrame: false });
    expect(rows.some((r) => r.id === 'avatar_frame')).toBe(false);
  });

  it('phase 8 unlocks the full catalog', () => {
    const rows = visibleProfileManagerRows({ maxPhase: 8, hasFrame: true });
    expect(rows.length).toBe(PROFILE_MANAGER_ROWS.length);
  });
});

describe('groupProfileManagerRows', () => {
  it('keeps section order and drops empty sections', () => {
    const rows = visibleProfileManagerRows({ maxPhase: 0 });
    const groups = groupProfileManagerRows(rows);
    expect(groups[0]?.section.id).toBe('profile');
    expect(groups.every((g) => g.rows.length > 0)).toBe(true);
  });
});

describe('resolveViewAs', () => {
  it('accepts public follower friend', () => {
    expect(resolveViewAs('public')).toBe('public');
    expect(resolveViewAs('FOLLOWER')).toBe('follower');
    expect(resolveViewAs('friend')).toBe('friend');
    expect(resolveViewAs('admin')).toBeNull();
    expect(resolveViewAs(null)).toBeNull();
  });
});

describe('paths', () => {
  it('builds settings and view-as paths', () => {
    expect(settingsOptPath('acc_standing')).toBe('/settings?opt=acc_standing');
    expect(viewAsQueryPath('public')).toBe('/profile?viewAs=public');
  });
});
