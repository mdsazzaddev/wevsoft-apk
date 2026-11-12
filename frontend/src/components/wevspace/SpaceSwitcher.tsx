/**
 * The Space switcher (Master Prompt 2 §2).
 *
 *   [Personal Account] [Wevsoft Studio] [Sazzad Photography] [Sazzad Gaming]
 *
 * The spec's hard requirement is that the acting identity is never ambiguous:
 * "Never accidentally publish Space content from the personal account." So the
 * trigger always shows who you are acting as, the sheet repeats it as a literal
 * "Posting as:" line built by the shared actingAsLabel() helper, and an identity
 * that cannot post is greyed rather than silently failing at publish time.
 *
 * It is also one of §1's four dashboard entry points, so every row carries a
 * Manage link through spaceDashboardPath().
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BadgeCheck,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Settings2,
  UserRound,
  X,
} from 'lucide-react';
import {
  actingAsLabel,
  formatFollowerCount,
  identityCanPost,
  spaceDashboardPath,
  type SpaceIdentityOption,
} from '@wevsoft/shared/wevspace';
import { fetchMyInvites, respondToTeamInvite } from '../../lib/wevspaceManageApi';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import { resolveAvatarUrl } from '../UserAvatar';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { consumerAppUrl, isBusinessAppHost } from '../../lib/consumerAppUrl';
import toast from 'react-hot-toast';

type SwitcherVariant = 'compact' | 'button' | 'sidebar' | 'avatar';

interface SpaceSwitcherProps {
  /** Highlighted as current. Pass the dashboard's Space so it reads as active. */
  currentSpaceId?: string | null;
  variant?: SwitcherVariant;
  /** 'manage' also navigates to the picked Space's dashboard. */
  navigateTo?: 'none' | 'manage';
  /**
   * Renders nothing when this account has no Spaces. The app shell passes it:
   * someone who can only be themselves has no identity to be unsure about, and
   * a permanent "Personal account" row would be noise on every page (§25).
   */
  hideWhenSolo?: boolean;
  className?: string;
  /**
   * Custom trigger. When given, replaces the variant button; call `open()` to show
   * the switcher sheet (Creator Studio top bar / hero pill).
   */
  renderTrigger?: (props: { open: () => void; current: SpaceIdentityOption | null; label: string }) => ReactNode;
  /**
   * Called after the identity is switched, INSTEAD of the default navigation
   * (Creator Hub uses it to open the matching personal / Space hub).
   */
  onPicked?: (option: SpaceIdentityOption) => void;
  /** Declared so callers may key a list of switchers without a TS complaint. */
  key?: string;
}

function IdentityAvatar({ option, size = 36 }: { option: SpaceIdentityOption; size?: number }) {
  const url = resolveAvatarUrl(option.avatar || null);
  return (
    <span
      className="inline-grid place-items-center shrink-0 rounded-2xl overflow-hidden bg-muted text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : option.kind === 'personal' ? (
        <UserRound size={Math.round(size / 2)} />
      ) : (
        <span className="font-black" style={{ fontSize: Math.round(size / 2.6) }}>
          {option.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export default function SpaceSwitcher({
  currentSpaceId = null,
  variant = 'sidebar',
  navigateTo = 'none',
  hideWhenSolo = false,
  className = '',
  renderTrigger,
  onPicked,
}: SpaceSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { options, active, loading, setActive, reload } = useSpaceIdentities();
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<any[]>([]);
  const [inviteBusy, setInviteBusy] = useState<string | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useOverlayBack(open, close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Invitations addressed to *me* have no other home in the product: the Team
  // panel manages invites a Space has sent, not ones I have received (§4).
  const loadInvites = useCallback(() => {
    fetchMyInvites()
      .then((result) => setInvites(result.invites || []))
      .catch(() => setInvites([]));
  }, []);

  useEffect(() => {
    if (open) loadInvites();
  }, [open, loadInvites]);

  const current = useMemo(() => {
    if (currentSpaceId) return options.find((option) => option.id === currentSpaceId) || active;
    return active;
  }, [currentSpaceId, options, active]);

  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const pick = (option: SpaceIdentityOption) => {
    setSwitchingTo(option.kind === 'space' ? option.id : 'personal');
    // Short delay so the selection animation is visible before the modal closes
    setTimeout(() => {
      setActive(option.kind === 'space' ? option.id : null);
      close();
      setSwitchingTo(null);
      if (onPicked) {
        onPicked(option);
        return;
      }
      if (option.kind === 'space' && option.handle) {
        toast.success(`Switched to ${option.name}`, { icon: '✦', duration: 2000 });
        navigate('/home', { replace: true });
        return;
      }
      toast.success('Switched to personal account', { icon: '👤', duration: 2000 });
      if (navigateTo === 'manage' || /\/space\/[^/]+\/manage/.test(location.pathname)) {
        navigate('/home', { replace: true });
      }
    }, 120);
  };

  const respond = async (memberId: string, accept: boolean) => {
    setInviteBusy(memberId);
    try {
      await respondToTeamInvite(memberId, accept);
      toast.success(accept ? 'You joined the team' : 'Invitation declined');
      setInvites((list) => list.filter((invite) => invite.id !== memberId));
      if (accept) await reload();
    } catch (error: any) {
      toast.error(error?.message || 'Could not respond to the invitation');
    } finally {
      setInviteBusy(null);
    }
  };

  const label = current ? actingAsLabel({ name: current.name, verificationStatus: current.verified ? 'VERIFIED' : null }) : 'Posting as: you';
  const actingAsSpace = current?.kind === 'space';

  // Nothing to switch between: stay out of the shell entirely.
  if (hideWhenSolo && !options.some((option) => option.kind === 'space')) return null;

  const trigger = renderTrigger ? (
    renderTrigger({ open: () => setOpen(true), current: current || null, label })
  ) :
    variant === 'compact' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Switch account"
        title={label}
        className={`p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${className}`}
      >
        <Settings2 size={16} />
      </button>
    ) : variant === 'avatar' ? (
      // The mobile bar's identity anchor (§26). Shows who is acting rather than a
      // gear, because on a phone this is the only place that answers it.
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className={`relative shrink-0 rounded-2xl transition-opacity hover:opacity-80 ${className}`}
      >
        {current ? <IdentityAvatar option={current} size={30} /> : <span className="block w-[30px] h-[30px] rounded-2xl bg-muted" />}
        <span
          className={`absolute -bottom-0.5 -right-0.5 grid place-items-center w-3.5 h-3.5 rounded-full border-2 border-background ${
            actingAsSpace ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          <ChevronDown size={8} />
        </span>
      </button>
    ) : variant === 'button' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-[11px] font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${className}`}
      >
        Switch <ChevronDown size={12} />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2.5 p-2 rounded-2xl bg-muted/60 hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-left ${className}`}
      >
        {current ? <IdentityAvatar option={current} size={32} /> : <span className="w-8 h-8 rounded-2xl bg-muted" />}
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
            {current?.kind === 'space' ? 'Business account' : 'Personal account'}
          </span>
          <span className="block text-xs font-black truncate">{current?.name || 'You'}</span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
      </button>
    );

  const sheet =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
        onMouseDown={(e) => {
          // Outside (dimmed backdrop) closes; ignore presses that start on the sheet.
          if (e.target === e.currentTarget) close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Switch account"
          className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl"
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0">
                <h2 className="font-black">Switch account</h2>
                {/* Soft login: Space = business identity, personal = your user. */}
                <p className="text-[11px] font-extrabold text-muted-foreground truncate">
                  {actingAsSpace ? `Logged in as ${current?.name}` : label}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {loading && !options.length ? (
              <div className="py-8 grid place-items-center text-muted-foreground">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : (
              <div className="mt-3 space-y-1.5">
                {options.map((option) => {
                  const isCurrent = currentSpaceId
                    ? option.id === currentSpaceId
                    : option.kind === (active?.kind || 'personal') && option.id === (active?.id ?? null);
                  const canPost = identityCanPost(option);
                  const canManage = option.kind === 'space' && (option.permissions?.length || 0) > 0;
                  const isSwitching =
                    switchingTo !== null &&
                    (option.kind === 'space' ? switchingTo === option.id : switchingTo === 'personal');
                  return (
                    <div
                      key={option.id || 'personal'}
                      className={`flex items-center gap-3 p-2 rounded-2xl border transition-all duration-150 ${
                        isSwitching
                          ? 'border-primary/40 bg-primary/8 scale-[0.98]'
                          : isCurrent
                          ? 'border-border bg-muted/60'
                          : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => pick(option)}
                        disabled={switchingTo !== null}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left disabled:opacity-70"
                      >
                        <IdentityAvatar option={option} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1">
                            <span className="text-sm font-bold truncate">{option.name}</span>
                            {option.verified && <BadgeCheck size={13} className="shrink-0 text-blue-500" />}
                          </span>
                          <span className="block text-[11px] text-muted-foreground truncate">
                            {option.kind === 'personal'
                              ? 'Your personal account'
                              : [
                                  'Business account',
                                  option.handle ? `@${option.handle}` : null,
                                  option.role ? option.role.charAt(0) + option.role.slice(1).toLowerCase() : 'Team',
                                  typeof option.followersCount === 'number'
                                    ? `${formatFollowerCount(option.followersCount)} followers`
                                    : null,
                                  canPost ? null : 'cannot post',
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </span>
                        </span>
                        {(option.unreadCount || 0) > 0 && (
                          <span className="shrink-0 px-1.5 rounded-md bg-red-500 text-white text-[10px] font-black tabular-nums">
                            {(option.unreadCount as number) > 99 ? '99+' : option.unreadCount}
                          </span>
                        )}
                        {isSwitching ? (
                          <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
                        ) : isCurrent ? (
                          <Check size={16} className="shrink-0 text-emerald-500" />
                        ) : null}
                      </button>
                      {canManage && option.handle && (
                        <Link
                          to={spaceDashboardPath(option.handle)}
                          onClick={close}
                          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-muted text-[10px] font-extrabold hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          Manage
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {invites.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground mb-2">
                  Invitations
                </p>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="p-3 rounded-2xl bg-muted/60">
                      <p className="text-xs font-bold">
                        {invite.space?.name || 'A WevSpace'} invited you as{' '}
                        {String(invite.role || '').toLowerCase() || 'a teammate'}
                      </p>
                      {invite.inviteNote && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">“{invite.inviteNote}”</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={inviteBusy === invite.id}
                          onClick={() => respond(invite.id, true)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold disabled:opacity-60"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={inviteBusy === invite.id}
                          onClick={() => respond(invite.id, false)}
                          className="px-3 py-1.5 rounded-xl bg-muted text-[11px] font-extrabold disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isBusinessAppHost() ? (
              // Business Suite has no /spaces/create route: Spaces are created on the main app.
              <a
                href={consumerAppUrl('/spaces/create')}
                onClick={close}
                className="mt-4 flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-dashed border-border text-xs font-extrabold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={14} /> Create a WevSpace
              </a>
            ) : (
              <Link
                to="/spaces/create"
                onClick={close}
                className="mt-4 flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-dashed border-border text-xs font-extrabold text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={14} /> Create a WevSpace
              </Link>
            )}
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {trigger}
      {sheet}
    </>
  );
}
