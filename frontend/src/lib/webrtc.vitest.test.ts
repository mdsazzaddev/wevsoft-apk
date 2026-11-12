import { describe, expect, it } from 'vitest';
import { getIceServers } from './webrtc';

describe('webrtc ice quarantine', () => {
  it('returns STUN-only servers with no TURN credentials', () => {
    const servers = getIceServers();
    expect(servers.length).toBeGreaterThan(0);
    for (const s of servers) {
      const urls = Array.isArray(s.urls) ? s.urls.join(',') : String(s.urls);
      expect(urls.toLowerCase()).not.toContain('turn:');
      expect(s.username).toBeUndefined();
      expect(s.credential).toBeUndefined();
      expect(urls.toLowerCase()).not.toContain('sora');
    }
  });
});
