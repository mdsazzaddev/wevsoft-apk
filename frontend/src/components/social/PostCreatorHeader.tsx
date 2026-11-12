/**
 * Interactive post creator row — avatar, name, @handle, verified.
 * User profiles open as a Facebook-style overlay (Home stays mounted);
 * WevSpace links still navigate to `/space/@handle`.
 */

import type { ReactNode, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ResolvedContentAuthor } from '@wevsoft/shared/content-author';
import SuspendedBadge from '../SuspendedBadge';
import { AuthorAvatar, AuthorVerifiedBadge } from './ContentAuthor';
import { openProfileOverlay, profileOverlayUsernameFromAuthor } from '../../lib/profileOverlay';
import { useStore } from '../../store';

type Props = {
  author: ResolvedContentAuthor;
  /** Relative age already formatted (e.g. `3h`). */
  timeLabel: string;
  musicTitle?: string | null;
  musicArtist?: string | null;
  /** Optional trailing meta (feeling, location) rendered after time. */
  extraMeta?: ReactNode;
  className?: string;
  avatarClassName?: string;
  showAdminPill?: boolean;
  /** When false, always use normal Link navigation (e.g. already on a profile page). */
  preferOverlay?: boolean;
  /** Show the @username under the name. Off in feed post headers (name + avatar are enough). */
  showHandle?: boolean;
};

function creatorAriaLabel(author: ResolvedContentAuthor): string {
  if (!author.href || author.unavailable) return author.name;
  if (author.kind === 'space') return `Open ${author.name} WevSpace`;
  return author.at ? `Open ${author.name} (${author.at}) profile` : `Open ${author.name} profile`;
}

export default function PostCreatorHeader({
  author,
  timeLabel,
  musicTitle,
  musicArtist,
  extraMeta,
  className = '',
  avatarClassName = 'h-10 w-10',
  showAdminPill = false,
  preferOverlay = true,
  showHandle = false,
}: Props) {
  const handle = showHandle ? author.at : null;
  const selfUsername = useStore((s) => s.user?.username);
  const href = author.href;
  const linkClass =
    'rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  const openAsOverlay = (e: MouseEvent) => {
    if (!preferOverlay || !href || author.kind === 'space' || author.unavailable) return false;
    let username = profileOverlayUsernameFromAuthor(author);
    if (!username && (href === '/profile' || href.startsWith('/profile?'))) {
      username = selfUsername || null;
    }
    if (!username) return false;
    e.preventDefault();
    e.stopPropagation();
    openProfileOverlay(username);
    return true;
  };

  const nameBlock = (
    <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <span
        className={`truncate text-sm font-extrabold ${
          href ? 'group-hover/creator:text-primary' : 'text-muted-foreground'
        }`}
      >
        {author.name}
      </span>
      <AuthorVerifiedBadge author={author} size={15} />
      {author.kind === 'user' ? <SuspendedBadge user={author.user} /> : null}
      {showAdminPill && author.kind === 'user' && author.isAdmin ? (
        <span className="shrink-0 rounded-full border border-purple-500/30 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-purple-400 shadow-sm">
          Admin
        </span>
      ) : null}
    </span>
  );

  const handleLine = handle ? (
    <span
      className={`truncate font-semibold ${
        href ? 'group-hover/creator:text-foreground/75' : ''
      }`}
    >
      {handle}
    </span>
  ) : null;

  return (
    <div className={`flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3 ${className}`}>
      {href ? (
        <Link
          to={href}
          onClick={openAsOverlay}
          className={`group/creator shrink-0 touch-manipulation ${linkClass}`}
          aria-label={creatorAriaLabel(author)}
        >
          <AuthorAvatar
            author={author}
            className={`${avatarClassName} ring-2 ring-transparent transition-[box-shadow,transform] group-hover/creator:ring-primary/25 group-active/creator:scale-[0.98]`}
            decorative
          />
        </Link>
      ) : (
        <AuthorAvatar author={author} className={`${avatarClassName} opacity-80`} decorative />
      )}

      <div className="min-w-0 flex-1 pt-0.5">
        {href ? (
          <Link
            to={href}
            onClick={openAsOverlay}
            className={`group/creator block min-w-0 touch-manipulation ${linkClass}`}
            aria-label={creatorAriaLabel(author)}
          >
            {nameBlock}
          </Link>
        ) : (
          <div className="min-w-0">{nameBlock}</div>
        )}

        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
          {href && handle ? (
            <Link
              to={href}
              onClick={openAsOverlay}
              className={`min-w-0 max-w-full touch-manipulation ${linkClass}`}
              aria-label={creatorAriaLabel(author)}
            >
              {handleLine}
            </Link>
          ) : (
            handleLine
          )}
          {handle && timeLabel ? <span className="shrink-0" aria-hidden>·</span> : null}
          {timeLabel ? <span className="shrink-0 tabular-nums">{timeLabel}</span> : null}
          {musicTitle ? (
            <>
              <span className="shrink-0" aria-hidden>·</span>
              <span className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-1 font-semibold text-violet-500 sm:max-w-[18rem]">
                <span aria-hidden className="shrink-0">♪</span>
                <span className="truncate">
                  {musicTitle}
                  {musicArtist ? ` · ${musicArtist}` : ''}
                </span>
              </span>
            </>
          ) : null}
          {extraMeta}
        </p>
      </div>
    </div>
  );
}
