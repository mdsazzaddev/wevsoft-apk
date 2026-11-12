/**
 * The avatar and verified badge for whoever a feed card names as its author.
 *
 * Only these two pieces are shared. The four feed surfaces (home feed, unified feed,
 * reels, explore) have genuinely different card designs — a gradient ring here, white
 * text over video there — and collapsing them into one renderer would change three
 * designs to fix one bug. What they must share is the *decision*
 * (`resolveContentAuthor`) and the two bits of chrome where a Space differs visibly
 * from a person: a squared tile instead of a circle, and its own accent badge.
 */

import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import type { ResolvedContentAuthor } from '@wevsoft/shared/content-author';
import UserAvatar, { resolveAvatarUrl } from '../UserAvatar';

/**
 * A Space wears a rounded square, a person wears a circle.
 *
 * That is the same distinction the rest of the product already makes — `SpaceIdentity`
 * renders the Space header avatar as `rounded-3xl` — and it is the cheapest way for a
 * reader to tell "this was published by a page" from "this was published by someone I
 * know" without reading the name.
 */
export function AuthorAvatar({
  author,
  className = '',
  imageClassName = 'w-full h-full object-cover',
  radius = 'rounded-xl',
  decorative = false,
}: {
  author: ResolvedContentAuthor;
  className?: string;
  imageClassName?: string;
  /** Radius for the Space tile. Circles are the person branch's job. */
  radius?: string;
  /**
   * When the avatar sits inside a labeled profile `Link`, suppress redundant
   * announcements (parent `aria-label` already names the creator).
   */
  decorative?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = author.kind === 'space' ? resolveAvatarUrl(author.avatar) : null;

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setFailed(false), [src]);

  if (author.kind === 'user') {
    return (
      <UserAvatar
        user={author.user}
        className={className}
        imageClassName={imageClassName}
        alt={decorative ? '' : undefined}
        decorative={decorative}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden text-white font-black select-none ${radius} ${className}`}
      style={src && !failed ? undefined : { background: author.accent }}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : author.name}
      title={author.name}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={decorative ? '' : author.name}
          className={imageClassName}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{author.initials}</span>
      )}
    </span>
  );
}

/**
 * The verified tick, in the Space's own accent rather than the platform blue.
 *
 * A verified Space and a verified person are different claims — one says "this page
 * really is that organisation", the other "this really is that human" — so they are
 * not drawn identically. Renders nothing when the author is not verified, which lets
 * call sites drop it in unconditionally.
 */
export function AuthorVerifiedBadge({
  author,
  size = 16,
  className = '',
  userClassName = 'text-sky-500',
}: {
  author: ResolvedContentAuthor;
  size?: number;
  className?: string;
  /** Colour for the person branch, so a dark video overlay can brighten it. */
  userClassName?: string;
}) {
  if (!author.verified) return null;

  if (author.kind === 'space') {
    return (
      <span
        className={`shrink-0 ${className}`}
        style={{ color: author.accent }}
        title={`Verified WevSpace · ${author.typeLabel}`}
        aria-label={`Verified WevSpace · ${author.typeLabel}`}
      >
        <BadgeCheck size={size} aria-hidden />
      </span>
    );
  }

  return (
    <BadgeCheck
      size={size}
      className={`shrink-0 ${userClassName} ${className}`}
      aria-label="Verified"
    />
  );
}
