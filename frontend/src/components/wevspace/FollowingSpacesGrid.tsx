import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { fetchFollowedSpaces } from '../../lib/wevspaceApi';
import SpaceCard from './SpaceCard';

/** /spaces?view=following: the Spaces this account follows (real follow rows). */
export default function FollowingSpacesGrid({ className = '' }: { className?: string }) {
  const q = useQuery({ queryKey: ['spaces', 'following', 'page'], queryFn: () => fetchFollowedSpaces(48, 0) });
  if (q.isLoading) {
    return (
      <div className={`${className} grid place-items-center py-16 text-muted-foreground`}>
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className={`${className} bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground`}>
        Could not load the Space you follow.{' '}
        <button type="button" onClick={() => void q.refetch()} className="font-semibold text-primary">
          Try again
        </button>
      </div>
    );
  }
  const spaces = q.data?.spaces || [];
  if (!spaces.length) {
    return (
      <div className={`${className} border-2 border-dashed border-border rounded-2xl p-10 text-center`}>
        <span className="inline-grid place-items-center w-11 h-11 rounded-xl bg-muted text-muted-foreground">
          <Heart size={18} />
        </span>
        <p className="mt-3 font-semibold text-sm">You don't follow any Space yet</p>
        <Link to="/spaces" className="mt-3 inline-flex px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
          Explore Space
        </Link>
      </div>
    );
  }
  return (
    <div className={className}>
      <p className="text-[13px] font-semibold text-muted-foreground mb-3">
        Following {q.data?.total ?? spaces.length} {'Space'}
      </p>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={{ ...space, isFollowing: true }} />
        ))}
      </div>
    </div>
  );
}
