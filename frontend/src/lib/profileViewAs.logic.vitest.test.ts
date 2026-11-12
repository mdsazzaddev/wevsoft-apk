import { describe, expect, it } from 'vitest';
import {
  filterPostsForViewAs,
  postVisibleForViewAs,
  profileTabsForViewAs,
  showOwnerChrome,
  shouldHideSensitiveMeta,
  viewAsBannerLabel,
} from './profileViewAs.logic';

describe('profileTabsForViewAs', () => {
  const tabs = ['all', 'posts', 'saved', 'private', 'archived', 'friends'];
  it('keeps all when not previewing', () => {
    expect(profileTabsForViewAs(tabs, null)).toEqual(tabs);
  });
  it('drops owner vaults in any view-as role', () => {
    expect(profileTabsForViewAs(tabs, 'public')).toEqual(['all', 'posts', 'friends']);
    expect(profileTabsForViewAs(tabs, 'friend')).toEqual(['all', 'posts', 'friends']);
  });
});

describe('showOwnerChrome', () => {
  it('true only for owner without viewAs', () => {
    expect(showOwnerChrome(true, null)).toBe(true);
    expect(showOwnerChrome(true, 'public')).toBe(false);
    expect(showOwnerChrome(false, null)).toBe(false);
  });
});

describe('viewAs helpers', () => {
  it('labels and sensitive meta', () => {
    expect(viewAsBannerLabel('friend')).toBe('Friend');
    expect(shouldHideSensitiveMeta('public')).toBe(true);
    expect(shouldHideSensitiveMeta('friend')).toBe(false);
    expect(shouldHideSensitiveMeta(null)).toBe(false);
  });
});

describe('postVisibleForViewAs', () => {
  it('hides only_me from every preview role', () => {
    expect(postVisibleForViewAs('only_me', 'friend')).toBe(false);
    expect(postVisibleForViewAs('private', 'public')).toBe(false);
  });
  it('public sees only public; friends see friends posts', () => {
    expect(postVisibleForViewAs('public', 'public')).toBe(true);
    expect(postVisibleForViewAs('friends', 'public')).toBe(false);
    expect(postVisibleForViewAs('friends', 'friend')).toBe(true);
    expect(postVisibleForViewAs('followers', 'follower')).toBe(true);
  });
  it('filters lists', () => {
    const posts = [{ privacy: 'public' }, { privacy: 'only_me' }, { privacy: 'friends' }];
    expect(filterPostsForViewAs(posts, 'public')).toHaveLength(1);
    expect(filterPostsForViewAs(posts, 'friend')).toHaveLength(2);
    expect(filterPostsForViewAs(posts, null)).toHaveLength(3);
  });
});
