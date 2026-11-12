/**
 * Another account's public WevSpaces, shown on their profile.
 *
 * The server decides what (if anything) is visible based on that account's
 * `spacesVisibility` setting, so this component renders nothing at all when the
 * list is hidden or empty — no empty shell on someone else's profile.
 */

import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { WevSpaceIcon } from './WevSpaceIcon';
import { fetchUserSpaces, type SpaceCardPayload } from '../../lib/wevspaceApi';
import SpaceCard from './SpaceCard';

interface Props {
  username: string;
  /** Display name used in the heading; falls back to the handle. */
  displayName?: string;
  className?: string;
}

export default function PublicSpacesSection({ username, displayName, className = '' }: Props) {
  const [spaces, setSpaces] = useState<SpaceCardPayload[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setLoading(true);
    fetchUserSpaces(username)
      .then((res) => {
        if (!cancelled) setSpaces(res.hidden ? [] : res.spaces);
      })
      .catch(() => {
        if (!cancelled) setSpaces([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  // No skeleton here on purpose: most accounts own no Spaces, so a placeholder
  // would flash a phantom section onto every profile before resolving to null.
  if (loading || !spaces || spaces.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="flex items-center gap-2 font-black text-base mb-3">
        <WevSpaceIcon size={17} className="text-muted-foreground" />
        {displayName ? `${displayName}'s WevSpaces` : 'WevSpaces'}
        <span className="px-2 py-0.5 rounded-lg bg-muted text-xs font-black text-muted-foreground">
          {spaces.length}
        </span>
      </h2>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>
    </section>
  );
}
