/** Facebook-style profile overlay over the current feed (same idea as comments window). */

export const PROFILE_OVERLAY_EVENT = 'wev:profile-overlay';

export type ProfileOverlayDetail = {
  username: string;
};

export function openProfileOverlay(username: string) {
  const handle = String(username || '')
    .trim()
    .replace(/^@+/, '');
  if (!handle) return;
  window.dispatchEvent(
    new CustomEvent<ProfileOverlayDetail>(PROFILE_OVERLAY_EVENT, {
      detail: { username: handle },
    }),
  );
}

/** Resolve a profile overlay target from a content-author href / handle. */
export function profileOverlayUsernameFromAuthor(author: {
  kind?: string;
  handle?: string | null;
  at?: string | null;
  href?: string | null;
}): string | null {
  if (author.kind === 'space') return null;
  if (author.handle) return String(author.handle).replace(/^@+/, '');
  if (author.at) return String(author.at).replace(/^@+/, '');
  const href = author.href || '';
  const u = href.match(/^\/u\/([^/?#]+)/i) || href.match(/^\/@([^/?#]+)/);
  if (u?.[1]) return decodeURIComponent(u[1]);
  return null;
}
