import { describe, expect, it } from 'vitest';
import {
  aboutItemVisibleToVisitor,
  normalizeAudience,
  parseAboutAudience,
  serializeAboutAudience,
} from './aboutAudience.logic';

describe('parseAboutAudience', () => {
  it('keeps legacy string values', () => {
    expect(parseAboutAudience('friends').flags.friends).toBe(true);
    expect(parseAboutAudience('only_me').flags.public).toBe(false);
    expect(normalizeAudience('public')).toBe('public');
  });

  it('reads multi-select flags + people lists', () => {
    const parsed = parseAboutAudience({
      friends: true,
      followers: true,
      hideFrom: true,
      hideFromUsers: [{ id: 'u1', name: 'A' }],
    });
    expect(parsed.flags.friends).toBe(true);
    expect(parsed.flags.followers).toBe(true);
    expect(parsed.hideFromUsers).toHaveLength(1);
  });

  it('defaults missing values to public', () => {
    expect(parseAboutAudience(undefined).flags.public).toBe(true);
  });
});

describe('serializeAboutAudience', () => {
  it('round-trips flags', () => {
    const payload = parseAboutAudience({ public: true, hideFrom: true, hideFromUsers: [{ id: 'x', name: 'X' }] });
    const stored = serializeAboutAudience(payload);
    expect(stored.public).toBe(true);
    expect(stored.hideFrom).toBe(true);
    expect(Array.isArray(stored.hideFromUsers)).toBe(true);
  });
});

describe('aboutItemVisibleToVisitor', () => {
  it('owners always see; visitors need public', () => {
    expect(aboutItemVisibleToVisitor({ friends: true }, true)).toBe(true);
    expect(aboutItemVisibleToVisitor({ friends: true }, false)).toBe(false);
    expect(aboutItemVisibleToVisitor({ public: true }, false)).toBe(true);
  });
});
