import { useState } from 'react';
import { Globe2, Users, Lock, Newspaper, Smile } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import { useStore } from '../../store';

const AUDIENCES = [
  { id: 'public', label: 'Public', hint: 'Anyone on Wevsoft', Icon: Globe2 },
  { id: 'friends', label: 'Friends', hint: 'Your friends only', Icon: Users },
  { id: 'private', label: 'Only me', hint: 'Only you can see it', Icon: Lock },
] as const;

export default function ShareToFeedPanel({
  caption,
  onCaptionChange,
  privacy,
  onPrivacyChange,
  /** Compact Facebook-style block for the main share sheet (includes Share now). */
  compact = false,
  onShareNow,
  sharing = false,
}: {
  caption: string;
  onCaptionChange: (v: string) => void;
  privacy: string;
  onPrivacyChange: (v: string) => void;
  compact?: boolean;
  onShareNow?: () => void;
  sharing?: boolean;
}) {
  const user = useStore((s) => s.user);
  const [showAudience, setShowAudience] = useState(false);
  const active = AUDIENCES.find((a) => a.id === privacy) || AUDIENCES[1];
  const ActiveIcon = active.Icon;

  return (
    <div className={compact ? 'space-y-3 pb-3 border-b border-border/60' : 'space-y-4'}>
      <div className="flex items-start gap-3">
        <UserAvatar user={user || { name: 'You' }} className="w-10 h-10 text-xs shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="font-bold text-sm truncate">{user?.name || 'You'}</div>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-semibold text-foreground">
                <Newspaper size={11} />
                Feed
              </span>
              <button
                type="button"
                onClick={() => setShowAudience((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full bg-muted/80 hover:bg-muted px-2.5 py-1 text-[11px] font-semibold text-foreground"
                aria-expanded={showAudience}
              >
                <ActiveIcon size={11} />
                {active.label}
              </button>
            </div>
          </div>

          {showAudience && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden" role="listbox" aria-label="Audience">
              {AUDIENCES.map(({ id, label, hint, Icon }) => {
                const selected = privacy === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onPrivacyChange(id);
                      setShowAudience(false);
                    }}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected ? 'bg-primary/10' : 'hover:bg-muted/40'
                    }`}
                  >
                    <span className="mt-0.5 w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value.slice(0, 500))}
              placeholder="Say something about this..."
              rows={compact ? 2 : 3}
              className="w-full resize-none rounded-xl border-0 bg-transparent px-0 py-1 text-[15px] focus:outline-none placeholder:text-muted-foreground"
              aria-label="Share caption"
            />
            <span className="absolute bottom-1 right-0 text-muted-foreground/50 pointer-events-none" aria-hidden>
              <Smile size={16} />
            </span>
          </div>
        </div>
      </div>

      {compact && onShareNow && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={sharing}
            onClick={onShareNow}
            className="rounded-lg bg-primary text-primary-foreground px-5 py-2 text-sm font-bold disabled:opacity-60"
          >
            {sharing ? 'Sharing…' : 'Share now'}
          </button>
        </div>
      )}
    </div>
  );
}
