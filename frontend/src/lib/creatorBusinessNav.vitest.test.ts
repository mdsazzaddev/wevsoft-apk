import { describe, expect, it, vi } from 'vitest';
import { openCreatorHref, resolveBusinessCreatorNav } from './creatorBusinessNav';

describe('resolveBusinessCreatorNav', () => {
  it('maps create/reel/story consumer routes into hub tabs or batch', () => {
    expect(resolveBusinessCreatorNav('/reels/create')).toEqual({ kind: 'tab', tab: 'content_studio' });
    expect(resolveBusinessCreatorNav('/story-studio')).toEqual({ kind: 'tab', tab: 'content_studio' });
    expect(resolveBusinessCreatorNav('/ai/post')).toEqual({ kind: 'path', path: '/business/batch' });
    expect(resolveBusinessCreatorNav('/create-post?type=image')).toEqual({ kind: 'path', path: '/business/batch' });
    expect(resolveBusinessCreatorNav('/wallet')).toEqual({ kind: 'tab', tab: 'monetization' });
    expect(resolveBusinessCreatorNav('/notifications')).toEqual({ kind: 'path', path: '/business/notifications' });
  });

  it('maps personal and Space hub paths to tabs', () => {
    expect(resolveBusinessCreatorNav('/creator-hub?tab=calendar')).toEqual({ kind: 'tab', tab: 'calendar', sub: null });
    expect(resolveBusinessCreatorNav('/business/creator-hub?tab=analytics&sub=views')).toEqual({
      kind: 'tab',
      tab: 'analytics',
      sub: 'views',
    });
  });
});

describe('openCreatorHref', () => {
  it('no-ops on empty href and navigates when not on Business host', () => {
    const navigate = vi.fn();
    openCreatorHref(null, navigate);
    openCreatorHref('', navigate);
    expect(navigate).not.toHaveBeenCalled();
    openCreatorHref('/creator-hub?tab=tools', navigate);
    expect(navigate).toHaveBeenCalledWith('/creator-hub?tab=tools');
  });
});
