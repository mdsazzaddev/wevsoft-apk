/**
 * Settings > Posts & Content > Post defaults. Stored in the account
 * preferences blob (keyed by option id) and used as the composer's initial values.
 */
export interface PostDefaults {
  allowDownloads: boolean;
  allowRemix: boolean;
  hideLikeCount: boolean;
  sensitiveWarning: boolean;
  aiLabel: boolean;
  paidPartnership: boolean;
  /** Attach the link preview card when a post has a URL. */
  linkPreview: boolean;
}

export const POST_DEFAULTS_FALLBACK: PostDefaults = { allowDownloads: true, allowRemix: true, hideLikeCount: false, sensitiveWarning: false, aiLabel: false, paidPartnership: false, linkPreview: true };

const asBool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : d);

let cache: { token: string; at: number; p: Promise<PostDefaults> } | null = null;

/** Drop the short TTL cache after Settings > Post defaults change. */
export function invalidatePostDefaultsCache() {
  cache = null;
}

export function fetchPostDefaults(token: string | null | undefined): Promise<PostDefaults> {
  if (!token) return Promise.resolve(POST_DEFAULTS_FALLBACK);
  if (cache && cache.token === token && Date.now() - cache.at < 30_000) return cache.p;
  const p = fetch('/api/settings/account', { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      let blob: Record<string, unknown> = {};
      try { blob = s?.preferences ? JSON.parse(s.preferences) : {}; } catch { /* ignore */ }
      const f = POST_DEFAULTS_FALLBACK;
      return {
        allowDownloads: asBool(blob.post_default_allow_downloads, f.allowDownloads),
        allowRemix: asBool(blob.post_default_allow_remix, f.allowRemix),
        hideLikeCount: asBool(blob.post_default_hide_like_count, f.hideLikeCount),
        sensitiveWarning: asBool(blob.post_default_sensitive_warning, f.sensitiveWarning),
        aiLabel: asBool(blob.post_default_ai_label, f.aiLabel),
        paidPartnership: asBool(blob.post_default_paid_partnership, f.paidPartnership),
        linkPreview: asBool(blob.post_default_link_preview, f.linkPreview),
      };
    })
    .catch(() => POST_DEFAULTS_FALLBACK);
  cache = { token, at: Date.now(), p };
  return p;
}