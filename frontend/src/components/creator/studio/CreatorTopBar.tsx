import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus, ChevronDown, Menu, Edit3, Clapperboard, CircleDashed, UploadCloud, GraduationCap, Radio } from 'lucide-react';
import SmartSearchBar from '../../SmartSearchBar';
import SpaceSwitcher from '../../wevspace/SpaceSwitcher';
import { resolveAvatarUrl } from '../../UserAvatar';
import { useStore } from '../../../store';
import { useUnreadNotifications } from '../../../hooks/useUnreadNotifications';
import { personalCreatorHubPath, personalCreatorHubUrl, spaceCreatorHubPath, spaceCreatorHubUrl, type CreatorHubMode } from '../../../lib/creatorHub';
import { isBusinessAppHost } from '../../../lib/consumerAppUrl';
import type { SpaceIdentityOption } from '@wevsoft/shared/wevspace';
import { BATCH_CREATE_PATH } from '../../../lib/batchStudio';
import { applyBusinessCreatorNav } from '../../../lib/creatorBusinessNav';
import { useCreatorHubMode, useCreatorSpace } from '../../../lib/creatorSpaceContext';
import WevsoftMark from '../../auth/WevsoftMark';

export type QuickCreateItem = { id: string; label: string; sub: string; to: string; icon: React.FC<any>; tile: string; dot: string };

/** Personal hub: publish as yourself with the consumer creation tools. */
const PERSONAL_QUICK_CREATE: QuickCreateItem[] = [
  { id: 'live', label: 'Go Live', sub: 'Stream with OBS', to: personalCreatorHubPath('live_studio'), icon: Radio, tile: 'text-muted-foreground', dot: 'bg-muted text-foreground' },
  { id: 'post', label: 'Create Post', sub: 'Write something amazing', to: '/ai/post', icon: Edit3, tile: 'text-muted-foreground', dot: 'bg-muted text-foreground' },
  { id: 'reel', label: 'Create Reel', sub: 'Short video, big impact', to: '/reels/create', icon: Clapperboard, tile: 'text-muted-foreground', dot: 'bg-muted text-foreground' },
  { id: 'story', label: 'Create Story', sub: 'Share your moment', to: '/story-studio', icon: CircleDashed, tile: 'text-muted-foreground', dot: 'bg-muted text-foreground' },
  { id: 'video', label: 'Upload Video', sub: 'From your device', to: '/videos', icon: UploadCloud, tile: 'text-muted-foreground', dot: 'bg-muted text-foreground' },
  { id: 'academic', label: 'Create Academic', sub: 'Educational content', to: '/academic', icon: GraduationCap, tile: 'text-muted-foreground', dot: 'bg-muted text-foreground' },
];

/** Space hub: Space publishing goes through Business Suite Batch Upload (acts as the Space). */
const SPACE_QUICK_CREATE: QuickCreateItem[] = [
  { id: 'post', label: 'Create Post', sub: 'Publish as this Space', to: BATCH_CREATE_PATH, icon: Edit3, tile: 'text-muted-foreground', dot: 'bg-muted text-foreground' },
];

export function quickCreateFor(mode: CreatorHubMode): QuickCreateItem[] {
  return mode === 'space' ? SPACE_QUICK_CREATE : PERSONAL_QUICK_CREATE;
}

export function initialsOf(name?: string | null) {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function WevSpaceMark({ size = 28, avatar }: { size?: number; avatar?: string | null }) {
  const url = resolveAvatarUrl(avatar || null);
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-lg ${url ? 'bg-muted' : 'bg-card ring-1 ring-inset ring-border'}`}
      style={{ width: size, height: size }}
    >
      {/* Space avatar when set; otherwise the WevSoft brand mark (not a letter placeholder). */}
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <WevsoftMark label="WevSoft" className="h-auto w-[78%]" />}
    </span>
  );
}

/** `?as=personal` tells the main-app /creator-hub to leave Space mode instead of bouncing back to the Space hub. */
export const PERSONAL_HUB_FROM_SPACE_PARAM = 'as';

/** Where picking an identity in the Creator Hub switcher should go. */
export function creatorHubTargetFor(option: Pick<SpaceIdentityOption, 'kind' | 'id'>, onBusinessHost: boolean): { href: string; hard: boolean } {
  if (option.kind === 'space' && option.id) {
    return onBusinessHost
      ? { href: spaceCreatorHubPath(null, null, option.id), hard: true } // hard: SpaceContext reads ?spaceId= on load
      : { href: spaceCreatorHubUrl(null, null, option.id), hard: true };
  }
  return onBusinessHost
    ? { href: `${personalCreatorHubUrl()}?${PERSONAL_HUB_FROM_SPACE_PARAM}=personal`, hard: true }
    : { href: personalCreatorHubPath(), hard: false };
}

/**
 * The Creator Hub's single identity display: who you act as (personal photo or Space
 * profile photo). Click to switch between Personal account and your Spaces.
 */
function ActingAvatar({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-[12px] font-bold text-foreground"
      style={{ width: size, height: size }}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initialsOf(name)}
    </span>
  );
}

function CreatorAccountSwitcher() {
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const hubSpace = useCreatorSpace();
  const onBusinessHost = isBusinessAppHost();
  const userAvatarUrl = resolveAvatarUrl((user?.avatar as string) || null);
  const spaceAvatarUrl = resolveAvatarUrl(hubSpace.spaceAvatar);
  const currentSpaceId = hubSpace.spaceId;

  const goTo = (option: SpaceIdentityOption) => {
    const isCurrent = option.kind === 'space' ? option.id === currentSpaceId : !currentSpaceId;
    if (isCurrent) return;
    const target = creatorHubTargetFor(option, onBusinessHost);
    // Deferred: closing the switcher pops its overlay history entry (navigate(-1)), which
    // would cancel a cross-document navigation started in the same tick.
    if (target.hard) window.setTimeout(() => window.location.assign(target.href), 150);
    else navigate(target.href, { replace: true });
  };

  return (
    <SpaceSwitcher
      currentSpaceId={currentSpaceId}
      onPicked={goTo}
      renderTrigger={({ open, current }) => {
        const inSpace = !!currentSpaceId || current?.kind === 'space';
        const name = inSpace
          ? (current?.kind === 'space' ? current.name : null) || hubSpace.spaceName || 'Space'
          : user?.name || 'You';
        // Prefer the matched Space identity photo; fall back to Business SpaceContext avatar
        // (identities list may still be loading while currentSpaceId is already set).
        const avatarUrl = inSpace
          ? resolveAvatarUrl(current?.kind === 'space' ? current.avatar : null) || spaceAvatarUrl
          : userAvatarUrl;
        return (
          <button
            type="button"
            onClick={open}
            title="Switch account"
            aria-label={`Acting as ${name}. Switch account`}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-hover"
          >
            <ActingAvatar url={avatarUrl} name={name} size={36} />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[160px] truncate text-sm font-semibold text-foreground">{name}</span>
              <span className="block text-xs font-medium text-primary">{inSpace ? 'Space' : 'Personal account'}</span>
            </span>
            <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
          </button>
        );
      }}
    />
  );
}

export function CreatorTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const navigate = useNavigate();
  const quickCreate = quickCreateFor(useCreatorHubMode());
  const { unread } = useUnreadNotifications();
  const [createOpen, setCreateOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!createOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCreateOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [createOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-5 lg:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open creator menu"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-foreground hover:bg-surface-hover lg:hidden"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 flex-1">
        <SmartSearchBar
          placeholder="Search anything"
          className="max-w-[420px]"
          inputClassName="w-full h-10 rounded-full border border-border bg-muted pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <Link
          to={typeof window !== 'undefined' && (window.location.port === '3004' || /^business\./i.test(window.location.hostname)) ? '/business/notifications' : '/notifications'}
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-surface-hover"
        >
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-card">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setCreateOpen((v) => !v)}
            aria-label="Create"
            aria-haspopup="menu"
            aria-expanded={createOpen}
            className="flex h-10 items-center gap-1.5 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:px-4"
          >
            <Plus size={16} strokeWidth={2.5} /> <span className="hidden sm:inline">Create</span>
          </button>
          {createOpen && (
            <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-border bg-card p-1.5 shadow-lg">
              {quickCreate.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    if (!applyBusinessCreatorNav(q.to, { navigate })) navigate(q.to);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-foreground hover:bg-surface-hover"
                >
                  <span className={`grid h-7 w-7 place-items-center ${q.tile}`}>
                    <q.icon size={15} />
                  </span>
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* The one identity display on the Creator Hub: also the account / Space switcher. */}
        <CreatorAccountSwitcher />
      </div>
    </header>
  );
}