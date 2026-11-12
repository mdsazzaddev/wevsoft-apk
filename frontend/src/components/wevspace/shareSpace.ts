/**
 * Share/copy helpers for a Space link.
 *
 * Shared by the wizard's success screen and the public page's Share / Copy link
 * actions so the two cannot drift apart (spec §13 — no duplicated behaviour).
 */

import toast from 'react-hot-toast';
import { openShare } from '../../lib/share/openShare';
import { copyToClipboard } from '../../lib/share/shareUtils';
import { spacePublicUrl } from '@wevsoft/shared/wevspace';

/** Absolute URL for the running origin, e.g. https://wevsoft.com/space/@name. */
export function spaceShareUrl(handle: unknown): string {
  return spacePublicUrl(handle, typeof window === 'undefined' ? '' : window.location.origin);
}

export async function copySpaceLink(handle: unknown): Promise<void> {
  const url = spaceShareUrl(handle);
  if (await copyToClipboard(url)) {
    toast.success('Link copied');
  } else {
    // Clipboard is blocked in some browsers without a user gesture or over
    // plain HTTP — show the link so it can still be copied by hand.
    toast(url, { duration: 6000 });
  }
}

/**
 * Opens the Universal Share modal for a Space (WevChat friends, platforms,
 * device share sheet and Copy link all live there now).
 */
export async function shareSpace(space: { name?: string | null; handle?: string | null; avatar?: string | null; tagline?: string | null }): Promise<void> {
  const url = spaceShareUrl(space.handle);
  openShare({
    url,
    title: space.name || 'WevSpace',
    targetType: 'space',
    targetId: space.handle || null,
    preview: { type: 'space', authorName: space.name || 'WevSpace', authorAvatar: space.avatar || undefined, title: space.tagline || url },
  });
}
