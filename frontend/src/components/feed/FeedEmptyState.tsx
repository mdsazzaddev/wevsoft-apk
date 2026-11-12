import { Link } from 'react-router-dom';
import { Compass, ShoppingBag, Users, PenSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';

type Variant = 'feed' | 'stories' | 'marketplace' | 'new';

export default function FeedEmptyState({
  variant = 'feed',
  onAction,
}: {
  variant?: Variant;
  /** Optional primary action (e.g. open composer) instead of navigation. */
  onAction?: () => void;
}) {
  const { t } = useTranslation();

  const COPY: Record<
    Variant,
    { title: string; body: string; actionLabel: string; actionTo: string; icon: typeof Compass }
  > = {
    feed: {
      title: trLabel(t, 'FeedQuietTitle', 'Your feed is quiet right now.'),
      body: trLabel(t, 'FeedQuietBody', 'Follow friends and share your first post to fill this space.'),
      actionLabel: trLabel(t, 'FindPeople', 'Find people'),
      actionTo: '/friends',
      icon: Users,
    },
    stories: {
      title: trLabel(t, 'NoStoriesYet', 'No stories yet'),
      body: trLabel(t, 'NoStoriesBody', 'Stories from people you follow will appear here.'),
      actionLabel: trLabel(t, 'Explore', 'Explore'),
      actionTo: '/explore',
      icon: Compass,
    },
    marketplace: {
      title: trLabel(t, 'NoWevMallPicks', 'No WevMall picks yet'),
      body: trLabel(t, 'NoWevMallBody', 'WevMall recommendations will appear here as listings go live.'),
      actionLabel: trLabel(t, 'BrowseWevMall', 'Browse WevMall'),
      actionTo: '/wevmall',
      icon: ShoppingBag,
    },
    new: {
      title: trLabel(t, 'WelcomeToWevsoft', 'Welcome to Wevsoft'),
      body: trLabel(t, 'WelcomeBody', 'Start connecting with people and sharing your first post.'),
      actionLabel: trLabel(t, 'CreateAPost', 'Create a post'),
      actionTo: '/home',
      icon: PenSquare,
    },
  };

  const cfg = COPY[variant];
  const Icon = cfg.icon;

  return (
    <div className="mx-3 rounded-3xl border border-dashed border-border/70 bg-card/40 px-5 py-12 text-center md:mx-0">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={22} aria-hidden />
      </div>
      <h2 className="text-base font-extrabold text-foreground">{cfg.title}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{cfg.body}</p>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          {cfg.actionLabel}
        </button>
      ) : (
        <Link
          to={cfg.actionTo}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          {cfg.actionLabel}
        </Link>
      )}
    </div>
  );
}
