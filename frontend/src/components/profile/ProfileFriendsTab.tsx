import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Clock, ShieldCheck, Search } from 'lucide-react';
import { formatCompactCount } from './personalProfileFormat';
import SafeImage from '../ui/SafeImage';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export function profileHref(person: any) {
  if (!person) return '/';
  if (person.isSpace) return `/space/@${person.username}`;
  if (person.username) return `/u/${person.username}`;
  return `/profile/${person.id}`;
}

/**
 * FriendCard is defined at module level (not inside ProfilePage) so React
 * does not see a different component type on every render, which would cause
 * full unmount/remount of all friend cards on any state update.
 */
const FriendCard = React.memo(function FriendCard({
  person,
  actionLabel,
  onAction,
  meta,
}: {
  person: any;
  actionLabel: string;
  onAction: () => void;
  meta?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
      <Link to={profileHref(person)} className="h-20 bg-muted relative block">
        {person.cover ? (
          <SafeImage src={person.cover} alt="" className="w-full h-full object-cover" fallback={<div className="w-full h-full bg-gradient-to-r from-blue-500/20 to-purple-500/20" />} />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500/20 to-purple-500/20" />
        )}
      </Link>
      <div className="px-4 pb-4 relative flex flex-col flex-1">
        <Link
          to={profileHref(person)}
          className="w-16 h-16 bg-background rounded-full p-1 -mt-8 relative z-10 border-2 border-background"
        >
          <SafeImage
            src={person.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${person.id}`}
            alt=""
            className="w-full h-full object-cover rounded-full bg-muted"
          />
        </Link>
        <div className="mt-2 flex-1">
          <Link to={profileHref(person)}>
            <h3 className="font-bold flex items-center gap-1 hover:underline">
              {person.name}
              {person.verified && <ShieldCheck size={14} className="text-blue-500" />}
            </h3>
          </Link>
          {person.username && <p className="text-xs text-muted-foreground">@{person.username}</p>}
          {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
        </div>
        <button
          onClick={onAction}
          className="mt-3 w-full py-2 rounded-xl text-sm font-semibold bg-muted text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
});


interface ProfileFriendsTabProps {
  friendsLoading: boolean;
  theme: any;
  friends: any[];
  outgoingRequests: any[];
  handleFriendAction: (id: string, action: string) => void;
}

export default function ProfileFriendsTab({
  friendsLoading,
  theme,
  friends,
  outgoingRequests,
  handleFriendAction
}: ProfileFriendsTabProps) {
  const PAGE = 24;
  const [query, setQuery] = React.useState('');
  const [limit, setLimit] = React.useState(PAGE);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? friends.filter((f) => `${f.name || ''} ${f.username || ''}`.toLowerCase().includes(q))
    : friends;
  const shownFriends = filtered.slice(0, limit);
  return (
<motion.div
              key="friends"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="space-y-8"
            >
              {friendsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={18} style={{ color: theme.accent }} />
                      <h3 className="text-lg font-bold">Your Friends</h3>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {formatCompactCount(friends.length)}
                      </span>
                    </div>
                    {friends.length > 6 && (
                      <label className="relative block mb-4 max-w-sm">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="search"
                          value={query}
                          onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
                          placeholder="Search friends"
                          aria-label="Search friends"
                          className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-border focus:outline-none"
                        />
                      </label>
                    )}
                    {friends.length > 0 && filtered.length === 0 && (
                      <p className="text-sm text-muted-foreground py-6 text-center">No friends match "{query}".</p>
                    )}
                    {friends.length === 0 ? (
                      <div
                        className="text-center py-12 rounded-3xl"
                        style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}` }}
                      >
                        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No friends yet. Find people on the Friends page.</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {shownFriends.map((f) => (
                          <FriendCard
                            key={f.id}
                            person={f}
                            meta={f.friendSince ? `Friends since ${format(new Date(f.friendSince), 'MMM yyyy')}` : undefined}
                            actionLabel="Unfriend"
                            onAction={() => {
                              if (confirm(`Remove ${f.name} from your friends?`)) {
                                handleFriendAction(f.id, 'remove');
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {filtered.length > limit && (
                      <button
                        type="button"
                        onClick={() => setLimit((n) => n + PAGE)}
                        className="mt-4 w-full sm:w-auto px-4 h-9 rounded-lg bg-muted text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
                      >
                        Show more ({filtered.length - limit})
                      </button>
                    )}
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={18} style={{ color: theme.accent }} />
                      <h3 className="text-lg font-bold">Sent Requests</h3>
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {outgoingRequests.length}
                      </span>
                    </div>
                    {outgoingRequests.length === 0 ? (
                      <div
                        className="text-center py-10 rounded-3xl"
                        style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}` }}
                      >
                        <Clock className="w-9 h-9 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">You have no pending friend requests.</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {outgoingRequests.map((r) => (
                          <FriendCard
                            key={r.requestId || r.id}
                            person={r}
                            meta={r.createdAt ? `Sent ${format(new Date(r.createdAt), 'MMM d, yyyy')}` : 'Pending'}
                            actionLabel="Cancel Request"
                            onAction={() => handleFriendAction(r.id, 'cancel')}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </motion.div>
  );
}
