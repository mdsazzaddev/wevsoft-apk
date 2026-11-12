/** YouTube helpers for Watch Party embeds. */

export function extractYoutubeVideoId(raw: string | null | undefined): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').slice(0, 20);
      return /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (host.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v && /^[\w-]{6,}$/.test(v)) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isYoutubeWatchUrl(raw: string | null | undefined): boolean {
  return !!extractYoutubeVideoId(raw);
}
