/**
 * Community tab: the Space's followers, plus team management for owners.
 *
 * Followers are public by default (anyone who can view the Space can see who
 * follows it) unless the owner has switched `showFollowerList` off, in which case
 * the endpoint refuses non-team viewers and this panel says so. The team list
 * requires authentication and is only fetched when the viewer can actually see
 * it, so a visitor never triggers a 403 on load.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Lock, Shield, Trash2, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ASSIGNABLE_SPACE_ROLES,
  SPACE_MEMBER_ROLES,
  spaceRoleDef,
  type SpaceMemberRole,
} from '@wevsoft/shared/wevspace';
import {
  fetchMembers,
  fetchSpaceFollowers,
  inviteMember,
  type SpaceMember,
} from '../../lib/wevspaceApi';
import { removeTeamMember, updateTeamMember } from '../../lib/wevspaceManageApi';
import {
  ConfirmIdentitySheet,
  isConfirmCancelled,
  useIdentityConfirmation,
} from './manage/ConfirmIdentitySheet';
import UserAvatar from '../UserAvatar';

interface FollowerUser {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
}

interface Props {
  spaceId: string;
  /** True when the viewer can see and change the team (owner or team.manage). */
  canManageTeam?: boolean;
  /** Team members can see the roster without being able to change it. */
  canSeeTeam?: boolean;
  /** Opens the invite form on mount — used by the wizard's "Invite followers". */
  autoOpenInvite?: boolean;
  accent: string;
  className?: string;
}

const PAGE_SIZE = 24;
/** Role definitions for the ids the shared contract allows an owner to hand out. */
const ASSIGNABLE_ROLES = SPACE_MEMBER_ROLES.filter((role) => ASSIGNABLE_SPACE_ROLES.includes(role.id));

export default function SpaceCommunityPanel({
  spaceId,
  canManageTeam = false,
  canSeeTeam = false,
  autoOpenInvite = false,
  accent,
  className = '',
}: Props) {
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [followersTotal, setFollowersTotal] = useState(0);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followersError, setFollowersError] = useState<string | null>(null);
  /** Set when the Space keeps its roster private — a settled answer, not a failure. */
  const [followersHidden, setFollowersHidden] = useState(false);

  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(canSeeTeam);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  // Admin-level role changes and removals are challenged by the server (MP4 §10).
  // This surface and the dashboard's Team panel both hit that gate, so both wire it
  // rather than one of them silently failing with an unexplained 401.
  const confirmation = useIdentityConfirmation();

  const [inviteOpen, setInviteOpen] = useState(autoOpenInvite && canManageTeam);
  const [inviteValue, setInviteValue] = useState('');
  const [inviteRole, setInviteRole] = useState<SpaceMemberRole>('EDITOR');
  const [inviting, setInviting] = useState(false);

  const loadFollowers = useCallback(
    async (offset: number) => {
      if (offset === 0) setLoadingFollowers(true);
      else setLoadingMore(true);
      setFollowersError(null);
      setFollowersHidden(false);
      try {
        const res = await fetchSpaceFollowers(spaceId, PAGE_SIZE, offset);
        setFollowers((current) => (offset === 0 ? res.followers : [...current, ...res.followers]));
        setFollowersTotal(res.total || 0);
      } catch (err: any) {
        if (err?.data?.hidden) {
          setFollowersHidden(true);
        } else {
          setFollowersError(err?.message || 'Could not load followers');
        }
        if (offset === 0) setFollowers([]);
      } finally {
        setLoadingFollowers(false);
        setLoadingMore(false);
      }
    },
    [spaceId],
  );

  const loadMembers = useCallback(async () => {
    if (!canSeeTeam) return;
    setLoadingMembers(true);
    try {
      const res = await fetchMembers(spaceId);
      setMembers(res.members || []);
    } catch {
      // A 403 here just means the viewer lost access; the roster stays hidden.
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [spaceId, canSeeTeam]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void loadFollowers(0);
  }, [loadFollowers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void loadMembers();
  }, [loadMembers]);

  const invite = async () => {
    const value = inviteValue.trim().replace(/^@/, '');
    if (!value) {
      toast.error('Enter a username or email');
      return;
    }
    setInviting(true);
    try {
      await inviteMember(spaceId, value.includes('@') ? { email: value, role: inviteRole } : { username: value, role: inviteRole });
      toast.success('Invitation sent');
      setInviteValue('');
      setInviteOpen(false);
      await loadMembers();
    } catch (err: any) {
      toast.error(err?.message || 'Could not send that invitation');
    } finally {
      setInviting(false);
    }
  };

  const changeRole = async (member: SpaceMember, role: string) => {
    setBusyMemberId(member.id);
    try {
      await confirmation.run((confirm) => updateTeamMember(member.id, { role: role as SpaceMemberRole }, confirm));
      toast.success('Role updated');
      await loadMembers();
    } catch (err: any) {
      if (!isConfirmCancelled(err)) toast.error(err?.message || 'Could not update that role');
    } finally {
      setBusyMemberId(null);
    }
  };

  const kick = async (member: SpaceMember) => {
    if (!window.confirm(`Remove ${member.user.name} from this WevSpace team?`)) return;
    setBusyMemberId(member.id);
    try {
      await confirmation.run((confirm) => removeTeamMember(member.id, confirm));
      setMembers((current) => current.filter((m) => m.id !== member.id));
      toast.success('Member removed');
    } catch (err: any) {
      if (!isConfirmCancelled(err)) toast.error(err?.message || 'Could not remove that member');
    } finally {
      setBusyMemberId(null);
    }
  };

  const hasMore = followers.length > 0 && followers.length < followersTotal;

  return (
    <div className={`space-y-4 ${className}`}>
      <ConfirmIdentitySheet prompt={confirmation.prompt} onClose={confirmation.close} />
      {/* Team */}
      {canSeeTeam && (
        <div className="bg-card border border-border rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-black text-sm">
              <Shield size={16} className="text-muted-foreground" /> Team
            </h3>
            {canManageTeam && (
              <button
                type="button"
                onClick={() => setInviteOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity"
                style={{ background: accent }}
              >
                <UserPlus size={14} /> Invite
              </button>
            )}
          </div>

          {inviteOpen && canManageTeam && (
            <div className="mt-3 p-3 rounded-2xl bg-muted/60 space-y-2">
              <input
                type="text"
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
                placeholder="@username or email address"
                className="w-full px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold outline-none focus:border-primary/60 transition-colors"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as SpaceMemberRole)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-card border border-border text-sm font-semibold outline-none"
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={inviting}
                  onClick={() => void invite()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {inviting && <Loader2 size={15} className="animate-spin" />} Send invite
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {spaceRoleDef(inviteRole)?.blurb || 'Team members act on behalf of the Space; the Space keeps ownership of everything they post.'}
              </p>
            </div>
          )}

          {loadingMembers ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No team members yet — you are running this WevSpace on your own.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {members.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/50">
                  <UserAvatar user={member.user as any} className="w-10 h-10 text-xs" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {member.user.username ? (
                        <Link to={`/@${member.user.username}`} className="font-bold text-sm hover:underline truncate">
                          {member.user.name}
                        </Link>
                      ) : (
                        <span className="font-bold text-sm truncate">{member.user.name}</span>
                      )}
                      {member.status === 'PENDING' && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wide">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      {spaceRoleDef(member.role as SpaceMemberRole)?.label || member.role}
                    </p>
                  </div>

                  {canManageTeam && member.canManage && !member.isOwner && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <select
                        value={member.role}
                        disabled={busyMemberId === member.id}
                        onChange={(e) => void changeRole(member, e.target.value)}
                        aria-label={`Role for ${member.user.name}`}
                        className="px-2 py-1.5 rounded-xl bg-card border border-border text-xs font-bold outline-none disabled:opacity-60"
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busyMemberId === member.id}
                        onClick={() => void kick(member)}
                        aria-label={`Remove ${member.user.name}`}
                        className="p-2 rounded-xl bg-card border border-border text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-60"
                      >
                        {busyMemberId === member.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Followers */}
      <div className="bg-card border border-border rounded-3xl p-5">
        <h3 className="flex items-center gap-2 font-black text-sm">
          <Users size={16} className="text-muted-foreground" /> Followers
          {!followersHidden && (
            <span className="px-2 py-0.5 rounded-lg bg-muted text-xs font-black text-muted-foreground">
              {followersTotal}
            </span>
          )}
        </h3>

        {loadingFollowers ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : followersHidden ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border p-4 text-center">
            <Lock size={16} className="mx-auto text-muted-foreground" />
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              This Space keeps its follower list private.
            </p>
          </div>
        ) : followersError ? (
          <div className="mt-3 text-center">
            <p className="text-sm text-muted-foreground">{followersError}</p>
            <button
              type="button"
              onClick={() => void loadFollowers(0)}
              className="mt-2 px-3 py-1.5 rounded-xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : followers.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">
            No followers yet. Share the Space link to get the first ones.
          </p>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {followers.map((follower) => (
                <Link
                  key={follower.id}
                  to={follower.username ? `/@${follower.username}` : '#'}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <UserAvatar user={follower as any} className="w-9 h-9 text-[11px]" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{follower.name}</p>
                    {follower.username && (
                      <p className="text-[11px] text-muted-foreground truncate">@{follower.username}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadFollowers(followers.length)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-60"
                >
                  {loadingMore && <Loader2 size={13} className="animate-spin" />} Show more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
