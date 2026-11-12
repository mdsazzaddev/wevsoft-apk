import { useState } from 'react';
import { Check, Repeat, Link as LinkIcon, Users, PlusSquare, Newspaper } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ShareQuickActions({
  url,
  canRepost,
  isReposted,
  onRepost,
  onSendToFriend,
  canAddToStory,
  onAddToStory,
  canShareToFeed,
  onShareToFeed,
  compact = false,
}: {
  url: string;
  canRepost?: boolean;
  isReposted?: boolean;
  onRepost?: () => void;
  onSendToFriend?: () => void;
  canAddToStory?: boolean;
  onAddToStory?: () => void;
  canShareToFeed?: boolean;
  onShareToFeed?: () => void;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const chip = compact ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl';
  const label = compact ? 'text-[10px]' : 'text-[11px]';
  const gap = compact ? 'gap-1.5' : 'gap-2';
  const width = compact ? 'w-[64px]' : 'w-[72px]';

  return (
    <div
      className={`flex gap-1 justify-around px-0.5 ${compact ? 'py-1' : 'py-2'} border-t border-border/40`}
      role="group"
      aria-label="Quick share actions"
    >
      <button
        type="button"
        onClick={handleCopy}
        className={`flex flex-col items-center ${gap} shrink-0 group ${width} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl`}
        aria-label="Copy link"
      >
        <div className={`${chip} flex items-center justify-center transition-colors bg-muted/60 text-foreground group-hover:bg-muted`}>
          {copied ? <Check size={compact ? 18 : 20} className="text-primary" /> : <LinkIcon size={compact ? 18 : 20} />}
        </div>
        <span className={`${label} font-semibold text-center leading-tight`}>Copy Link</span>
      </button>

      {canShareToFeed && onShareToFeed && (
        <button
          type="button"
          onClick={onShareToFeed}
          className={`flex flex-col items-center ${gap} shrink-0 group ${width} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl`}
          aria-label="Share to feed"
        >
          <div className={`${chip} flex items-center justify-center transition-colors bg-muted/60 text-foreground group-hover:bg-muted`}>
            <Newspaper size={compact ? 18 : 20} />
          </div>
          <span className={`${label} font-semibold text-center leading-tight`}>
            Send to
            <br />
            Feed
          </span>
        </button>
      )}

      {canRepost && (
        <button
          type="button"
          onClick={onRepost}
          className={`flex flex-col items-center ${gap} shrink-0 group ${width} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl`}
          aria-label={isReposted ? 'Remove repost' : 'Repost'}
        >
          <div
            className={`${chip} flex items-center justify-center transition-colors ${
              isReposted ? 'bg-primary/20 text-primary' : 'bg-muted/60 text-foreground'
            } group-hover:brightness-95`}
          >
            <Repeat size={compact ? 18 : 20} />
          </div>
          <span className={`${label} font-semibold text-center leading-tight`}>
            {isReposted ? 'Reposted' : 'Repost'}
          </span>
        </button>
      )}

      {onSendToFriend && (
        <button
          type="button"
          onClick={onSendToFriend}
          className={`flex flex-col items-center ${gap} shrink-0 group ${width} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl`}
          aria-label="Send to friend"
        >
          <div className={`${chip} flex items-center justify-center transition-colors bg-muted/60 text-foreground group-hover:bg-muted`}>
            <Users size={compact ? 18 : 20} />
          </div>
          <span className={`${label} font-semibold text-center leading-tight`}>
            Send to
            <br />
            Friend
          </span>
        </button>
      )}

      {canAddToStory && onAddToStory && (
        <button
          type="button"
          onClick={onAddToStory}
          className={`flex flex-col items-center ${gap} shrink-0 group ${width} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl`}
          aria-label="Add to story"
        >
          <div className={`${chip} flex items-center justify-center transition-colors bg-muted/60 text-foreground group-hover:bg-muted`}>
            <PlusSquare size={compact ? 18 : 20} />
          </div>
          <span className={`${label} font-semibold text-center leading-tight`}>
            Add to
            <br />
            Story
          </span>
        </button>
      )}
    </div>
  );
}
