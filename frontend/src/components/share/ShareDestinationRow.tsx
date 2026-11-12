import { Check, Repeat, Link as LinkIcon, PlusSquare } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import SharePlatformGrid from './SharePlatformGrid';
import { copyToClipboard } from '../../lib/share/shareUtils';

/**
 * Facebook-style "Share to" destination row:
 * Repost + Copy + Story + external platforms + More.
 */
export default function ShareDestinationRow({
  url,
  title,
  onMoreClick,
  canRepost,
  isReposted,
  onRepost,
  canAddToStory,
  onAddToStory,
  onWevChat,
}: {
  url: string;
  title: string;
  onMoreClick?: () => void;
  canRepost?: boolean;
  isReposted?: boolean;
  onRepost?: () => void;
  canAddToStory?: boolean;
  onAddToStory?: () => void;
  /** WevChat platform chip: focus the friend picker instead of leaving. */
  onWevChat?: () => void;
  /** @deprecated Feed lives in the top Share now composer — not in this row. */
  canShareToFeed?: boolean;
  onShareToFeed?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (await copyToClipboard(url)) {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy. Long-press the address bar to copy the link.');
    }
  };

  const chipBtn =
    'flex flex-col items-center gap-1 shrink-0 w-[56px] md:w-[60px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl';
  const chipIcon =
    'w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors bg-muted text-foreground group-hover:bg-muted/80';

  return (
    <div className="space-y-2 pt-1">
      <h3 className="text-[13px] font-bold text-foreground">Share to</h3>
      <div
        className="flex gap-3 overflow-x-auto no-scrollbar pb-0.5 px-0.5"
        role="list"
        aria-label="Share destinations"
      >
        {canRepost && onRepost && (
          <button
            type="button"
            role="listitem"
            onClick={onRepost}
            className={chipBtn}
            aria-label={isReposted ? 'Remove repost' : 'Repost'}
          >
            <div className={`${chipIcon} ${isReposted ? 'bg-primary/20 text-primary' : ''}`}>
              <Repeat size={20} strokeWidth={2.1} />
            </div>
            <span className="text-[10px] md:text-[11px] font-semibold truncate w-full text-center leading-tight">
              {isReposted ? 'Reposted' : 'Repost'}
            </span>
          </button>
        )}

        <button type="button" role="listitem" onClick={handleCopy} className={chipBtn} aria-label="Copy link">
          <div className={chipIcon}>
            {copied ? <Check size={20} className="text-primary" /> : <LinkIcon size={20} strokeWidth={2.1} />}
          </div>
          <span className="text-[10px] md:text-[11px] font-semibold truncate w-full text-center leading-tight">
            Copy link
          </span>
        </button>

        {canAddToStory && onAddToStory && (
          <button
            type="button"
            role="listitem"
            onClick={onAddToStory}
            className={chipBtn}
            aria-label="Add to story"
          >
            <div className={chipIcon}>
              <PlusSquare size={20} strokeWidth={2.1} />
            </div>
            <span className="text-[10px] md:text-[11px] font-semibold truncate w-full text-center leading-tight">
              Your story
            </span>
          </button>
        )}

        <SharePlatformGrid
          url={url}
          title={title}
          isMobile
          showAll={false}
          onMoreClick={onMoreClick}
          onInternal={onWevChat}
          inline
        />
      </div>
    </div>
  );
}
