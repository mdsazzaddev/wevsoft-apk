import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AVAILABILITY_LABEL,
  PLATFORMS,
  RECENT_KEY,
  canonicalSharePath,
  clearRecentDestinations,
  copyToClipboard,
  getRecentDestinations,
  platformAvailability,
  platformByKey,
  platformShareUrl,
  pushRecentDestination,
  searchPlatforms,
  shareWithDevice,
} from './shareUtils';

const nav = navigator as any;
const originalClipboard = nav.clipboard;

afterEach(() => {
  Object.defineProperty(nav, 'clipboard', { value: originalClipboard, configurable: true });
  delete nav.share;
  delete nav.canShare;
  (document as any).execCommand = undefined;
  localStorage.clear();
});

describe('canonical paths', () => {
  it('matches the app routes', () => {
    expect(canonicalSharePath('post', { id: 'p1' })).toBe('/posts/p1');
    expect(canonicalSharePath('reel', { id: 'r1' })).toBe('/reels/r1');
    expect(canonicalSharePath('marketplace', { id: 'x' })).toBe('/wevmall/product/x');
    expect(canonicalSharePath('profile', { id: 'u', username: 'sazzad' })).toBe('/u/sazzad');
    expect(canonicalSharePath('space', { handle: '@shop' })).toBe('/space/@shop');
    expect(canonicalSharePath('post', {})).toBeNull();
  });
});

describe('copyToClipboard', () => {
  it('uses the Clipboard API when it works', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(nav, 'clipboard', { value: { writeText }, configurable: true });
    await expect(copyToClipboard('https://a/b')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://a/b');
  });

  it('falls back to execCommand when the Clipboard API rejects', async () => {
    Object.defineProperty(nav, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    const exec = vi.fn().mockReturnValue(true);
    (document as any).execCommand = exec;
    await expect(copyToClipboard('x')).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith('copy');
  });

  it('reports failure when both paths fail', async () => {
    Object.defineProperty(nav, 'clipboard', { value: undefined, configurable: true });
    (document as any).execCommand = vi.fn().mockReturnValue(false);
    await expect(copyToClipboard('x')).resolves.toBe(false);
  });
});

describe('shareWithDevice', () => {
  it('is unsupported without navigator.share', async () => {
    await expect(shareWithDevice({ url: 'u' })).resolves.toBe('unsupported');
  });
  it('resolves shared only when the sheet resolves', async () => {
    nav.share = vi.fn().mockResolvedValue(undefined);
    await expect(shareWithDevice({ url: 'u' })).resolves.toBe('shared');
  });
  it('treats AbortError as the user cancelling', async () => {
    nav.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }));
    await expect(shareWithDevice({ url: 'u' })).resolves.toBe('cancelled');
  });
  it('reports other errors as failed', async () => {
    nav.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    await expect(shareWithDevice({ url: 'u' })).resolves.toBe('failed');
  });
  it('drops files when canShare refuses them', async () => {
    nav.share = vi.fn().mockResolvedValue(undefined);
    nav.canShare = vi.fn((d: any) => !d.files);
    const file = new File(['a'], 'a.txt');
    await expect(shareWithDevice({ url: 'u', files: [file] })).resolves.toBe('unsupported');
  });
});

describe('platforms', () => {
  it('only web platforms have share URLs', () => {
    for (const p of PLATFORMS) {
      const href = platformShareUrl(p.key, 'https://w.s/posts/1', 'Hi');
      if (p.mode === 'device') expect(href).toBeNull();
      else expect(href).toBeTruthy();
    }
    expect(platformShareUrl('wa', 'https://w.s/p', 'Hi')).toBe('https://wa.me/?text=Hi%20https%3A%2F%2Fw.s%2Fp');
    expect(platformShareUrl('email', 'u', 't')).toMatch(/^mailto:/);
  });
  it('labels availability honestly', () => {
    const ig = platformByKey('ig')!;
    expect(platformAvailability(ig, true)).toBe('device');
    expect(platformAvailability(ig, false)).toBe('unsupported');
    expect(AVAILABILITY_LABEL[platformAvailability(platformByKey('fb')!, false)]).toBe('Web share');
  });
  it('searches by label and keyword', () => {
    expect(searchPlatforms('twit').map((p) => p.key)).toEqual(['x']);
    expect(searchPlatforms('zzz')).toEqual([]);
  });
});

describe('recent destinations', () => {
  beforeEach(() => localStorage.clear());
  it('stores most recent first, dedupes and clears', () => {
    pushRecentDestination('wa');
    pushRecentDestination('fb');
    pushRecentDestination('wa');
    pushRecentDestination('not-a-platform');
    expect(getRecentDestinations()).toEqual(['wa', 'fb']);
    clearRecentDestinations();
    expect(getRecentDestinations()).toEqual([]);
    expect(localStorage.getItem(RECENT_KEY)).toBeNull();
  });
  it('survives corrupted storage', () => {
    localStorage.setItem(RECENT_KEY, '{bad');
    expect(getRecentDestinations()).toEqual([]);
  });
});
