import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveAvatarUrl } from './UserAvatar';

describe('resolveAvatarUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns null for empty values', () => {
    expect(resolveAvatarUrl(null)).toBeNull();
    expect(resolveAvatarUrl('null')).toBeNull();
    expect(resolveAvatarUrl('')).toBeNull();
  });

  it('keeps CDN avatar URLs as-is and only rewrites relative media on wevsoft.com', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('window', {
      location: { hostname: 'wevsoft.com' },
    } as Window & typeof globalThis);
    expect(
      resolveAvatarUrl(
        'https://cdn.wevsoft.com/media/profile/avatars/1794135094758-3b0b588e-d990-4681-8f5e-8706e580ceac.jpg',
      ),
    ).toBe(
      'https://cdn.wevsoft.com/media/profile/avatars/1794135094758-3b0b588e-d990-4681-8f5e-8706e580ceac.jpg',
    );
    expect(resolveAvatarUrl('/media/profile/avatars/x.jpg')).toBe(
      'https://api.wevsoft.com/media/profile/avatars/x.jpg',
    );
  });

  it('keeps data and blob URLs untouched', () => {
    expect(resolveAvatarUrl('data:image/png;base64,aa')).toBe('data:image/png;base64,aa');
    expect(resolveAvatarUrl('blob:http://localhost/1')).toBe('blob:http://localhost/1');
  });
});
