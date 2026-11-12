import React from 'react';
import { MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import ReactionButton from '../social/ReactionButton';
import type { ReactionType } from '../../lib/reactions';
import RepostIcon from '../icons/RepostIcon';

function compactCount(n: number) {
  if (!n) return '';
  if (n > 999_999) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n > 999) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const mediaChip =
  'w-11 h-11 flex items-center justify-center bg-transparent border-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:scale-110 active:scale-95 transition-transform duration-200';
const surfaceChip =
  'w-11 h-11 flex items-center justify-center bg-transparent border-0 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] hover:scale-110 active:scale-95 transition-transform duration-200';

export default function ReelActionRail({
  isLiked,
  reaction,
  likesCount,
  commentsCount,
  boostsCount = 0,
  isSaved,
  isBoosted = false,
  commentsOpen,
  onReact,
  onComment,
  onShare,
  onBoost,
  onSave,
  onMore,
  allowLike = false,
  allowBoost = true,
  onMedia = true,
}: {
  compact?: boolean;
  isLiked: boolean;
  reaction: ReactionType | null;
  likesCount: number;
  commentsCount: number;
  boostsCount?: number;
  isSaved: boolean;
  isBoosted?: boolean;
  commentsOpen?: boolean;
  onReact: (next: ReactionType | null) => void;
  onComment: () => void;
  onShare: (e: React.MouseEvent) => void;
  onBoost?: () => void;
  onSave: () => void;
  onMore: (e: React.MouseEvent) => void;
  allowLike?: boolean;
  allowBoost?: boolean;
  /** White icons on Reels (over video or beside it on black stage). */
  onMedia?: boolean;
}) {
  const chip = onMedia ? mediaChip : surfaceChip;

  const items: Array<{
    label: string;
    count?: string;
    onClick: (e: React.MouseEvent) => void;
    icon: React.ReactNode;
    active?: boolean;
  }> = [
    {
      label: 'Comment',
      count: compactCount(commentsCount),
      onClick: (e) => { e.stopPropagation(); onComment(); },
      icon: <MessageCircle size={24} strokeWidth={2.2} className={commentsOpen ? 'text-sky-400' : ''} />,
    },
    {
      label: 'Share',
      onClick: onShare,
      icon: <Share2 size={24} strokeWidth={2.2} />,
    },
  ];

  if (allowBoost && onBoost) {
    items.push({
      label: isBoosted ? 'Reposted' : 'Repost',
      count: isBoosted ? undefined : compactCount(boostsCount),
      active: isBoosted,
      onClick: (e) => { e.stopPropagation(); onBoost(); },
      icon: (
        <RepostIcon
          size={24}
          strokeWidth={2.2}
          className={isBoosted ? 'text-emerald-300' : ''}
        />
      ),
    });
  }

  items.push(
    {
      label: 'Save',
      onClick: (e) => { e.stopPropagation(); onSave(); },
      icon: <Bookmark size={24} strokeWidth={2.2} className={isSaved ? 'fill-white' : ''} />,
    },
    {
      label: 'More',
      onClick: onMore,
      icon: <MoreHorizontal size={24} strokeWidth={2.2} />,
    },
  );

  return (
    <div
      className="flex flex-col items-center justify-end gap-2.5 text-white"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-center gap-0.5">
        <ReactionButton
          variant="reel"
          onMedia
          value={reaction || (allowLike && isLiked ? 'like' : null)}
          count={likesCount}
          onChange={onReact}
          allowLike={allowLike}
          hideCount
        />
        {likesCount > 0 && (
          <span
            className={`text-[11px] font-bold leading-none tabular-nums ${
              onMedia
                ? 'text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full'
                : 'text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
            }`}
          >
            {compactCount(likesCount)}
          </span>
        )}
      </div>
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            title={item.label}
            data-reel-comment={item.label === 'Comment' ? 'true' : undefined}
            aria-pressed={item.label === 'Comment' ? !!commentsOpen : undefined}
            className={`${chip} flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 ${
              item.active ? 'scale-105' : ''
            }`}
          >
            {item.icon}
          </button>
          {item.active ? (
            <span className="text-[10px] font-bold leading-none text-emerald-300 drop-shadow">
              Reposted
            </span>
          ) : item.count ? (
            <span
              className={`text-[11px] font-bold leading-none tabular-nums ${
                onMedia
                  ? 'text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/30 backdrop-blur-sm px-1.5 py-0.5 rounded-full'
                  : 'text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]'
              }`}
            >
              {item.count}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
