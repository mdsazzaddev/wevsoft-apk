import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import { Link } from 'react-router-dom';
import { Check, UserPlus, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import UserAvatar from '../UserAvatar';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';

export type FeedSuggestion = {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  verified?: boolean;
  mutualCount?: number;
  reason?: string;
};

export default function FeedSuggestionsCard({
  suggestions: initial,
  title,
}: {
  suggestions: FeedSuggestion[];
  title?: string;
}) {
  const { t } = useTranslation();
  const heading = title || trLabel(t, 'PeopleYouMayKnow', 'People you may know');
  const token = useStore((s) => s.token);
  const { isSpaceMode } = useSpaceIdentities();
  const [suggestions, setSuggestions] = useState(initial);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  if (isSpaceMode || !suggestions.length) return null;

  const dismiss = async (userId: string) => {
    setSuggestions((prev) => prev.filter((u) => u.id !== userId));
    try {
      if (token) {
        await fetch('/api/recommendations/friends/dismiss', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });
      }
    } catch {
      /* non-blocking */
    }
  };

  const follow = async (userId: string, name: string) => {
    setFollowingMap((prev) => ({ ...prev, [userId]: true }));
    toast.success(t('StartedFollowing', { name }) === 'StartedFollowing' ? `Started following ${name}` : t('StartedFollowing', { name }));
    try {
      if (token) {
        await fetch(`/api/users/${userId}/follow`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      setFollowingMap((prev) => ({ ...prev, [userId]: false }));
      toast.error(trLabel(t, 'CouldNotFollow', 'Could not follow'));
    }
  };

  return (
    <section className="rounded-none border-y border-border/60 bg-card px-3 py-3 md:rounded-3xl md:border md:border-sky-500/20 md:bg-gradient-to-br md:from-sky-500/5 md:via-card/80 md:to-card/50 md:px-4 md:shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Users size={16} className="text-sky-500" aria-hidden />
        <h2 className="text-sm font-extrabold text-foreground truncate">{heading}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
        {suggestions.map((u) => {
          const following = followingMap[u.id];
          return (
            <div
              key={u.id}
              className="relative flex w-[148px] shrink-0 snap-start flex-col items-center rounded-2xl border border-border/60 bg-background/60 p-3 text-center"
            >
              <button
                type="button"
                onClick={() => void dismiss(u.id)}
                className="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Dismiss ${u.name}`}
              >
                <X size={12} />
              </button>
              <Link to={`/u/${u.username}`} className="flex flex-col items-center min-w-0 w-full">
                <UserAvatar user={u} className="h-14 w-14 text-base" />
                <p className="mt-2 w-full truncate text-xs font-bold text-foreground">{u.name}</p>
                <p className="w-full truncate text-[10px] text-muted-foreground">@{u.username}</p>
                {u.mutualCount ? (
                  <p className="mt-0.5 text-[9px] font-medium text-sky-500">{u.mutualCount} mutual</p>
                ) : u.reason && u.reason !== 'Recommended for you' ? (
                  <p className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground">{u.reason}</p>
                ) : null}
              </Link>
              <button
                type="button"
                disabled={following}
                onClick={() => void follow(u.id, u.name)}
                className={`mt-2 inline-flex w-full items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  following
                    ? 'border border-border bg-muted/40 text-muted-foreground'
                    : 'bg-sky-500 text-white hover:bg-sky-600'
                }`}
              >
                {following ? (
                  <>
                    <Check size={12} /> Following
                  </>
                ) : (
                  <>
                    <UserPlus size={12} /> Follow
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
