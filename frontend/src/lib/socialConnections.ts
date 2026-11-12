/** Connected social accounts (backend: modules/social-publishing, /api/social/*). */
import { useCallback, useEffect, useState } from 'react';

export type SocialPlatformId = 'facebook' | 'instagram' | 'youtube' | 'linkedin' | 'x' | 'tiktok';

export interface SocialConnection {
  id: string;
  platform: SocialPlatformId;
  externalId: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  accountType: 'page' | 'channel' | 'profile' | 'business' | 'organization';
  status: 'active' | 'expired' | 'error';
  lastError: string | null;
  isDefault: boolean;
  tokenExpiresAt: string | null;
  category: string | null;
  pageName: string | null;
}

export interface SocialPlatformInfo { platform: SocialPlatformId; label: string; accounts: string; publishes: string }

export interface SocialDelivery {
  id: string;
  connectionId: string;
  platform: SocialPlatformId;
  name: string;
  avatarUrl: string | null;
  status: 'queued' | 'publishing' | 'published' | 'failed' | 'unsupported' | 'canceled';
  error: string | null;
  externalUrl: string | null;
}

export const ACCOUNT_TYPE_LABEL: Record<SocialConnection['accountType'], string> = {
  page: 'Page', channel: 'Channel', profile: 'Profile', business: 'Business account', organization: 'Company page',
};

async function socialFetch<T>(token: string | null, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/social${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any)?.error || `Request failed (${res.status})`);
  return body as T;
}

export function useSocialConnections(token: string | null) {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatformInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const r = await socialFetch<{ connections: SocialConnection[]; platforms: SocialPlatformInfo[] }>(token, '/connections');
      setConnections(r.connections || []);
      setPlatforms(r.platforms || []);
    } catch {
      setConnections([]);
      setPlatforms([]);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    // Initial load; reload() only sets state after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);
  const enabled = new Set(platforms.map((p) => p.platform));
  /** Accounts that can be used as destinations (platform still enabled by the admin). */
  const usable = connections.filter((c) => enabled.has(c.platform));
  return { connections, usable, platforms, loading, reload };
}

/**
 * Opens the provider sign-in in a popup (opened synchronously so it isn't blocked) and resolves when
 * the callback page reports back. Falls back to a full-page redirect when popups are blocked.
 */
export function connectPlatform(token: string | null, platform: SocialPlatformId): Promise<{ ok: boolean; count?: number; error?: string }> {
  const popup = window.open('', 'wev-social-connect', 'width=620,height=760');
  return new Promise((resolve) => {
    let settled = false;
    const done = (r: { ok: boolean; count?: number; error?: string }) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMsg);
      clearInterval(timer);
      resolve(r);
    };
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.type !== 'wev-social-connect' || (popup && e.source !== popup)) return;
      done({ ok: !!d.ok, count: d.count, error: d.error });
    };
    window.addEventListener('message', onMsg);
    const timer = window.setInterval(() => { if (popup && popup.closed) done({ ok: false, error: 'closed' }); }, 800);
    socialFetch<{ url: string }>(token, `/oauth/${platform}/start`, { method: 'POST' })
      .then(({ url }) => {
        if (popup && !popup.closed) popup.location.href = url;
        else window.location.href = url;
      })
      .catch((err) => { popup?.close(); done({ ok: false, error: err instanceof Error ? err.message : 'Could not start sign-in' }); });
  });
}

export const refreshConnection = (token: string | null, id: string) => socialFetch<{ connection: SocialConnection }>(token, `/connections/${id}/refresh`, { method: 'POST' });
export const setDefaultConnection = (token: string | null, id: string, isDefault: boolean) => socialFetch(token, `/connections/${id}`, { method: 'PATCH', body: JSON.stringify({ isDefault }) });
export const disconnectConnection = (token: string | null, id: string) => socialFetch(token, `/connections/${id}`, { method: 'DELETE' });
