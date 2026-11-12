import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CREATOR_HUB_NAME } from '../../../lib/creatorHub';
import { filterHubNav } from '../../../lib/creatorHubTools';
import { useCreatorHubMode } from '../../../lib/creatorSpaceContext';
import WevsoftMark from '../../auth/WevsoftMark';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCreatorProEnabled } from './useCreatorProEnabled';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, ChevronDown, Plus, CalendarDays, Layers, BarChart3,
  MessageSquare, DollarSign, Handshake, Sparkles, PlaySquare, Settings, ListVideo,
  AtSign, Activity, UserPlus, Megaphone, GraduationCap,
  Crown, X, ChevronRight, PanelLeft, PanelLeftClose, LayoutGrid,
} from 'lucide-react';

export type CreatorTab =
  | 'overview'
  | 'content_studio'
  | 'ai_assistant'
  | 'ai_coach'
  | 'analytics'
  | 'community'
  | 'monetization'
  | 'brand_collab'
  | 'store'
  | 'live_studio'
  | 'content_library'
  | 'calendar'
  | 'team'
  | 'security'
  | 'admin'
  | 'upgrade'
  | 'batch'
  | 'tools'
  | 'ab_testing'
  | 'inspiration'
  | 'playlists'
  | 'mentions'
  | 'activity'
  | 'invite'
  | 'coauthor'
  | 'boost'
  | 'learn';

export type NavTarget = { tab: CreatorTab } | { to: string };

interface NavChild {
  id: string;
  label: string;
  target: NavTarget;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<any>;
  target?: NavTarget;
  badge?: { text: string; tone: 'new' | 'count' | 'beta' };
  children?: NavChild[];
}

/**
 * Mockup sidebar mapped onto the existing Creator Studio tabs. Entries with no
 * tab of their own open the closest existing page (never an invented route).
 */
export function buildCreatorNav(commentCount: number): NavItem[] {
  return [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, target: { tab: 'overview' } },
    { id: 'tools', label: 'All tools', icon: LayoutGrid, target: { tab: 'tools' } },
    {
      id: 'content',
      label: 'Content',
      icon: FileText,
      children: [
        // Keep Content filters inside Creator Hub — /reels and /videos are consumer
        // discovery pages and look "broken" (empty) from the hub.
        { id: 'posts', label: 'Posts', target: { tab: 'content_library' } },
        { id: 'reels', label: 'Reels', target: { tab: 'content_library' } },
        { id: 'ab_testing', label: 'A/B Testing', target: { tab: 'ab_testing' } },
        { id: 'stories', label: 'Stories', target: { tab: 'content_library' } },
        { id: 'videos', label: 'Videos', target: { tab: 'content_library' } },
        { id: 'academic', label: 'Academic', target: { tab: 'content_library' } },
      ],
    },
    { id: 'playlists', label: 'Playlists', icon: ListVideo, target: { tab: 'playlists' } },
    {
      id: 'create',
      label: 'Create',
      icon: Plus,
      children: [
        { id: 'content_studio', label: 'Content Studio', target: { tab: 'content_studio' } },
        { id: 'inspiration', label: 'Inspiration Hub', target: { tab: 'inspiration' } },
        { id: 'ai_post', label: 'AI Post Creator', target: { to: '/ai/post' } },
        { id: 'live_studio', label: 'Live Studio', target: { tab: 'live_studio' } },
      ],
    },
    { id: 'planner', label: 'Planner', icon: CalendarDays, target: { tab: 'calendar' } },
    { id: 'batch', label: 'Batch', icon: Layers, target: { tab: 'batch' }, badge: { text: 'New', tone: 'new' } },
    {
      id: 'analytics',
      label: 'Insights',
      icon: BarChart3,
      target: { tab: 'analytics' },
      children: [
        { id: 'overview', label: 'Overview', target: { tab: 'analytics' } },
        { id: 'views', label: 'Views', target: { tab: 'analytics' } },
        { id: 'earnings', label: 'Earnings', target: { tab: 'analytics' } },
        { id: 'engagement', label: 'Engagement', target: { tab: 'analytics' } },
        { id: 'audience', label: 'Audience', target: { tab: 'analytics' } },
      ],
    },
    { id: 'mentions', label: 'Mentions', icon: AtSign, target: { tab: 'mentions' } },
    { id: 'activity', label: 'Activity log', icon: Activity, target: { tab: 'activity' } },
    { id: 'invite', label: 'Invite people', icon: UserPlus, target: { tab: 'invite' } },
    {
      id: 'comments',
      label: 'Comments & Messages',
      icon: MessageSquare,
      target: { tab: 'community' },
      badge: commentCount > 0 ? { text: commentCount > 99 ? '99+' : String(commentCount), tone: 'count' } : undefined,
      children: [
        { id: 'community', label: 'All Comments', target: { tab: 'community' } },
        { id: 'moderation_assist', label: 'Moderation Assist', target: { tab: 'community' } },
        { id: 'top_fans', label: 'Top Fans & Badges', target: { tab: 'community' } },
      ],
    },
    {
      id: 'monetization',
      label: 'Monetization',
      icon: DollarSign,
      target: { tab: 'monetization' },
      children: [
        { id: 'payouts', label: 'Earnings & Payouts', target: { tab: 'monetization' } },
        { id: 'stars', label: 'Stars & Gifting', target: { tab: 'monetization' } },
        { id: 'store', label: 'Creator Store', target: { tab: 'store' } },
      ],
    },
    { id: 'boost', label: 'Boost & promote', icon: Megaphone, target: { tab: 'boost' } },
    {
      id: 'collab',
      label: 'Collaboration',
      icon: Handshake,
      target: { tab: 'brand_collab' },
      children: [
        { id: 'brand_collab', label: 'Brand Collabs', target: { tab: 'brand_collab' } },
        { id: 'coauthor', label: 'Co-authors', target: { tab: 'coauthor' } },
      ],
    },
    {
      id: 'ai',
      label: 'AI Tools',
      icon: Sparkles,
      target: { tab: 'ai_assistant' },
      badge: { text: 'Beta', tone: 'beta' },
      children: [
        { id: 'ai_assistant', label: 'AI Assistant', target: { tab: 'ai_assistant' } },
        { id: 'ai_coach', label: 'AI Growth Coach', target: { tab: 'ai_coach' } },
      ],
    },
    { id: 'media', label: 'Media Library', icon: PlaySquare, target: { tab: 'content_library' } },
    { id: 'learn', label: 'Learn & accounts', icon: GraduationCap, target: { tab: 'learn' } },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      target: { tab: 'team' },
      children: [
        { id: 'team', label: 'Team', target: { tab: 'team' } },
        { id: 'recommendation', label: 'Profile Recommendation', target: { tab: 'security' } },
        { id: 'security', label: 'Security & Copyright', target: { tab: 'security' } },
        { id: 'admin', label: 'Admin Control', target: { tab: 'admin' } },
      ],
    },
  ];
}

const badgeClass: Record<'new' | 'count' | 'beta', string> = {
  new: 'bg-violet-500 text-white',
  count: 'bg-rose-500 text-white',
  beta: 'bg-sky-500 text-white',
};

/** Admin-panel style grouping (small uppercase headers). Every nav id appears exactly once. */
const SECTIONS: { title: string; ids: string[] }[] = [
  { title: 'Overview', ids: ['dashboard', 'tools', 'analytics'] },
  { title: 'Content', ids: ['content', 'create', 'planner', 'batch', 'playlists', 'media'] },
  { title: 'Engage', ids: ['mentions', 'activity', 'invite', 'comments', 'collab'] },
  { title: 'Grow', ids: ['monetization', 'boost', 'ai', 'learn'] },
  { title: 'Workspace', ids: ['settings'] },
];

interface Props {
  activeTab: CreatorTab;
  activeChild: string | null;
  onSelect: (tab: CreatorTab, childId?: string | null) => void;
  commentCount: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Drawer mode (mobile): full labels, close button, closes after navigation. */
  onClose?: () => void;
}

const OPEN_DELAY = 70;
const CLOSE_DELAY = 180;

export function CreatorSidebar({ activeTab, activeChild, onSelect, commentCount, collapsed = false, onToggleCollapsed, onClose }: Props) {
  const navigate = useNavigate();
  const mode = useCreatorHubMode();
  const items = useMemo(() => filterHubNav(buildCreatorNav(commentCount), mode), [commentCount, mode]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const sections = useMemo(
    () => SECTIONS.map((s) => ({ ...s, ids: s.ids.filter((id) => byId.has(id)) })).filter((s) => s.ids.length),
    [items],
  );
  const [open, setOpen] = useState<Record<string, boolean>>({ content: true });
  const isDrawer = Boolean(onClose);
  const proEnabled = useCreatorProEnabled();
  const mini = collapsed && !isDrawer;

  // ── Collapsed-rail flyout state ──
  const [fly, setFly] = useState<{ id: string; top: number; left: number } | null>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const railRef = useRef<HTMLElement | null>(null);
  // Flyouts are looked up by data attribute (not a shared ref): during AnimatePresence
  // cross-fades the exiting flyout would null a shared ref on unmount.
  const flyEl = (id: string) => document.querySelector<HTMLElement>(`[data-creator-flyout="${id}"]`);
  const inFlyout = (n: EventTarget | null) => Boolean((n as HTMLElement | null)?.closest?.('[data-creator-flyout]'));
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  /** Set while we hand focus back to a rail icon (Esc) so that focus does not re-open the flyout. */
  const suppressFocusOpen = useRef(false);

  const clearTimers = () => {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = closeTimer.current = null;
  };
  useEffect(() => () => clearTimers(), []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { if (!mini) setFly(null); }, [mini]);

  const place = (id: string) => {
    const el = btnRefs.current[id];
    const rail = railRef.current;
    if (!el || !rail) return null;
    const r = el.getBoundingClientRect();
    return { id, top: r.top, left: rail.getBoundingClientRect().right + 10 };
  };
  const showFly = (id: string, immediate = false) => {
    clearTimers();
    const run = () => { const p = place(id); if (p) setFly(p); };
    if (immediate || fly) run();
    else openTimer.current = window.setTimeout(run, OPEN_DELAY);
  };
  const hideFly = () => {
    clearTimers();
    closeTimer.current = window.setTimeout(() => setFly(null), CLOSE_DELAY);
  };
  const keepFly = () => { if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; } };

  const go = (target: NavTarget, childId: string | null = null) => {
    if ('tab' in target) onSelect(target.tab, childId);
    else navigate(target.to);
    setFly(null);
    onClose?.();
  };

  const itemActive = (item: NavItem) => {
    // Media Library and Content > Posts both open the library tab: disambiguate by child.
    if (item.id === 'media') return activeTab === 'content_library' && activeChild === 'media';
    if (item.target && 'tab' in item.target && item.target.tab === activeTab && !item.children) return true;
    return Boolean(item.children?.some((c) => 'tab' in c.target && c.target.tab === activeTab && (activeChild ? activeChild === c.id : true)));
  };
  const childActive = (child: NavChild) => {
    if (!('tab' in child.target) || child.target.tab !== activeTab) return false;
    // Insights defaults to Overview when ?sub is absent (Facebook Professional Dashboard parity).
    if (activeTab === 'analytics') return (activeChild || 'overview') === child.id;
    return activeChild ? activeChild === child.id : false;
  };

  const activate = (item: NavItem) => {
    if (item.target) {
      const childId = item.id === 'media' ? 'media' : item.id === 'analytics' ? 'overview' : null;
      go(item.target, childId);
    } else if (item.children?.[0]) go(item.children[0].target, item.children[0].id);
  };

  const onFlyKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const id = fly?.id;
      setFly(null);
      if (id) { suppressFocusOpen.current = true; btnRefs.current[id]?.focus(); suppressFocusOpen.current = false; }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const els = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('button[data-fly-item]'));
      const i = els.indexOf(document.activeElement as HTMLButtonElement);
      els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
    }
  };

  const flyItem = fly ? byId.get(fly.id) : undefined;

  return (
    <aside
      ref={railRef}
      className={`relative flex h-full flex-col border-r border-slate-200/80 bg-white text-slate-600 dark:border-border dark:bg-card dark:text-slate-300 ${mini ? 'w-[64px]' : 'w-[240px]'} transition-[width] duration-200 ease-out motion-reduce:transition-none`}
    >
      {/* Header (admin style: brand + panel toggle) */}
      <div className={`flex h-[60px] shrink-0 items-center border-b border-slate-200/80 dark:border-border ${mini ? 'justify-center px-2' : 'gap-2 px-3'}`}>
        <Link to="/home" title="Back to Wevsoft" className={`flex min-w-0 items-center gap-2.5 ${mini ? '' : 'flex-1'}`}>
          <WevsoftMark className={mini ? 'h-4 w-auto' : 'h-5 w-auto'} label="Wevsoft" />
          {!mini && (
            <span className="min-w-0 truncate text-[14px] font-bold tracking-tight text-slate-900 dark:text-foreground">
              {CREATOR_HUB_NAME}
            </span>
          )}
        </Link>
        {isDrawer ? (
          <button type="button" onClick={onClose} aria-label="Close menu" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
            <X size={16} />
          </button>
        ) : (
          !mini && (
            <button type="button" onClick={onToggleCollapsed} title="Hide sidebar" aria-label="Collapse sidebar" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
              <PanelLeftClose size={16} />
            </button>
          )
        )}
      </div>
      {mini && (
        <div className="flex justify-center border-b border-slate-200/80 py-2 dark:border-border">
          <button type="button" onClick={onToggleCollapsed} title="Show sidebar" aria-label="Expand sidebar" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white">
            <PanelLeft size={16} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav
        className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar ${mini ? 'px-2' : 'px-2.5'} py-2`}
        onScroll={() => fly && setFly(null)}
        aria-label={CREATOR_HUB_NAME}
      >
        {sections.map((section, si) => (
          <div key={section.title} className={si ? 'mt-2' : ''}>
            {mini ? (
              si > 0 && <div className="mx-3 mb-2 mt-1 h-px bg-slate-200/80 dark:bg-white/10" aria-hidden />
            ) : (
              <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{section.title}</p>
            )}
            <div className="space-y-0.5">
              {section.ids.map((id) => {
                const item = byId.get(id);
                if (!item) return null;
                const active = itemActive(item);
                const expanded = Boolean(open[item.id]);
                const Icon = item.icon;
                const flyOpen = fly?.id === item.id;
                const onClick = () => {
                  if (mini) { activate(item); return; }
                  if (item.children) {
                    setOpen((o) => ({ ...o, [item.id]: !o[item.id] }));
                    if (!item.target || expanded) return;
                  }
                  activate(item);
                };
                return (
                  <div key={item.id}>
                    <button
                      ref={(el) => { btnRefs.current[item.id] = el; }}
                      type="button"
                      onClick={onClick}
                      onMouseEnter={mini ? () => showFly(item.id) : undefined}
                      onMouseLeave={mini ? hideFly : undefined}
                      onFocus={mini ? (e) => {
                        // Keyboard focus only — a mouse click also focuses, and hover already handles that.
                        if (suppressFocusOpen.current || !e.currentTarget.matches(':focus-visible')) return;
                        showFly(item.id, true);
                      } : undefined}
                      onBlur={mini ? (e) => { if (!inFlyout(e.relatedTarget)) hideFly(); } : undefined}
                      onKeyDown={mini ? (e) => {
                        if (e.key === 'ArrowRight' || (e.key === 'Enter' && item.children)) {
                          if (e.key === 'Enter') e.preventDefault();
                          showFly(item.id, true);
                          requestAnimationFrame(() => flyEl(item.id)?.querySelector<HTMLButtonElement>('button[data-fly-item]')?.focus());
                        } else if (e.key === 'Escape') setFly(null);
                      } : undefined}
                      aria-label={mini ? item.label : undefined}
                      aria-haspopup={mini ? 'menu' : undefined}
                      aria-expanded={mini ? flyOpen : item.children ? expanded : undefined}
                      aria-current={active && !item.children ? 'page' : undefined}
                      className={`group relative flex w-full items-center gap-2.5 rounded-lg ${mini ? 'h-10 justify-center' : 'h-[34px] px-2.5'} text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                        active && (!item.children || mini)
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200'
                          : active
                            ? 'text-indigo-700 dark:text-indigo-200'
                            : flyOpen
                              ? 'bg-slate-100 text-slate-900 dark:bg-white/[0.08] dark:text-white'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white'
                      }`}
                    >
                      {active && (!item.children || mini) && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-indigo-600 dark:bg-indigo-400" aria-hidden />}
                      <Icon size={mini ? 18 : 16} strokeWidth={2} className={`shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
                      {!mini && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
                      {!mini && item.badge && (
                        <span className={`shrink-0 rounded-full px-1.5 py-[1px] text-[10px] font-semibold ${badgeClass[item.badge.tone]}`}>{item.badge.text}</span>
                      )}
                      {mini && item.badge && (
                        <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white dark:ring-card ${item.badge.tone === 'count' ? 'bg-rose-500' : item.badge.tone === 'beta' ? 'bg-sky-500' : 'bg-violet-500'}`} />
                      )}
                      {!mini && item.children && !item.badge && (
                        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    {!mini && item.children && expanded && (
                      <div className="mb-1 ml-[19px] mt-0.5 space-y-0.5 border-l border-slate-200 pl-2.5 dark:border-white/10">
                        {item.children.map((child) => {
                          const ca = childActive(child);
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => go(child.target, child.id)}
                              aria-current={ca ? 'page' : undefined}
                              className={`block h-[30px] w-full rounded-md px-2 text-left text-[12.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                                ca ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
                              }`}
                            >
                              {child.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`shrink-0 space-y-3 border-t border-slate-200/80 dark:border-border ${mini ? 'px-2 py-3' : 'px-3 py-3'}`}>
        {!proEnabled ? null : mini ? (
          <button type="button" onClick={() => go({ tab: 'upgrade' })} title="Upgrade to Pro" aria-label="Upgrade to Pro" className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-r from-[#4f6bff] to-[#7c5cff] text-white">
            <Crown size={16} />
          </button>
        ) : (
          <div className={`rounded-xl border p-3.5 ${activeTab === 'upgrade' ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-400/40 dark:bg-indigo-500/10' : 'border-slate-200 bg-slate-50 dark:border-white/[0.07] dark:bg-white/[0.04]'}`}>
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-white">
              <Crown size={15} className="text-amber-500" fill="currentColor" /> Upgrade to Pro
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-slate-500 dark:text-slate-400">Unlock more features, grow faster.</p>
            <button
              type="button"
              onClick={() => go({ tab: 'upgrade' })}
              className="mt-2.5 flex h-8 w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#4f6bff] to-[#7c5cff] text-[12.5px] font-semibold text-white shadow-sm hover:opacity-95"
            >
              Go Pro
            </button>
          </div>
        )}
      </div>

      {/* Collapsed-rail flyout (portal: escapes the nav's overflow clipping) */}
      {mini && createPortal(
        <AnimatePresence>
          {fly && flyItem && (
            <SidebarFlyout
              key={flyItem.id}
              item={flyItem}
              top={fly.top}
              left={fly.left}
              active={itemActive(flyItem)}
              isChildActive={childActive}
              onEnter={keepFly}
              onLeave={hideFly}
              onKeyDown={onFlyKey}
              onBlurOut={(e) => {
                const next = e.relatedTarget as Node | null;
                if (!inFlyout(next) && !railRef.current?.contains(next)) hideFly();
              }}
              onPick={(target, childId) => go(target, childId)}
              onPickItem={() => activate(flyItem)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </aside>
  );
}

interface FlyoutProps {
  item: NavItem;
  top: number;
  left: number;
  active: boolean;
  isChildActive: (c: NavChild) => boolean;
  onEnter: () => void;
  onLeave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlurOut: (e: React.FocusEvent) => void;
  onPick: (target: NavTarget, childId: string) => void;
  onPickItem: () => void;
}

/**
 * iOS-style glass flyout for the collapsed rail. A transparent 14px "bridge" on
 * its left edge overlaps the gap to the rail so moving the pointer across never
 * closes it; the parent also delays close by CLOSE_DELAY.
 */
function SidebarFlyout({ item, top, left, active, isChildActive, onEnter, onLeave, onKeyDown, onBlurOut, onPick, onPickItem }: FlyoutProps) {
  const reduce = useReducedMotion();
  const hasChildren = Boolean(item.children?.length);
  const estHeight = hasChildren ? 56 + (item.children!.length * 36) : 48;
  const clampedTop = Math.max(8, Math.min(top - (hasChildren ? 6 : 0), window.innerHeight - estHeight - 8));
  const Icon = item.icon;
  return (
    <motion.div
      data-creator-flyout={item.id}
      role="menu"
      aria-label={item.label}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onKeyDown={onKeyDown}
      onBlur={onBlurOut}
      className="fixed z-[90]"
      style={{ top: clampedTop, left, transformOrigin: 'left top' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, x: -10 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, x: -6 , transition: { duration: 0.12, ease: 'easeIn' } }}
      transition={reduce ? { duration: 0.1 } : { type: 'spring', stiffness: 520, damping: 32, mass: 0.7 }}
    >
      {/* hover bridge back to the rail */}
      <span aria-hidden className="absolute -left-[14px] top-0 h-full w-[14px]" />
      <div className="min-w-[200px] max-w-[260px] overflow-hidden rounded-2xl border border-white/70 bg-white/55 p-1.5 shadow-[0_18px_48px_-12px_rgba(15,23,42,0.35),0_2px_8px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-slate-900/5 backdrop-blur-2xl backdrop-saturate-[1.8] dark:border-white/10 dark:bg-slate-900/50 dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-white/5">
        <button
          type="button"
          role="menuitem"
          data-fly-item
          onClick={onPickItem}
          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
            active && !hasChildren ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-200' : 'text-slate-900 hover:bg-slate-900/[0.05] dark:text-white dark:hover:bg-white/[0.08]'
          }`}
        >
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? 'bg-indigo-600 text-white' : 'bg-slate-900/[0.06] text-slate-600 dark:bg-white/10 dark:text-slate-200'}`}>
            <Icon size={15} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{item.label}</span>
          {item.badge && <span className={`shrink-0 rounded-full px-1.5 py-[1px] text-[10px] font-semibold ${badgeClass[item.badge.tone]}`}>{item.badge.text}</span>}
          {!item.badge && !hasChildren && <ChevronRight size={14} className="text-slate-400" />}
        </button>
        {hasChildren && (
          <>
            <div className="mx-2 my-1 h-px bg-slate-900/[0.07] dark:bg-white/10" aria-hidden />
            <div className="space-y-0.5">
              {item.children!.map((child, i) => {
                const ca = isChildActive(child);
                return (
                  <motion.button
                    key={child.id}
                    type="button"
                    role="menuitem"
                    data-fly-item
                    onClick={() => onPick(child.target, child.id)}
                    initial={reduce ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reduce ? { duration: 0 } : { delay: 0.03 + i * 0.025, type: 'spring', stiffness: 600, damping: 34 }}
                    className={`flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                      ca ? 'bg-indigo-500/10 font-semibold text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200' : 'text-slate-600 hover:bg-slate-900/[0.05] hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ca ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden />
                    <span className="truncate">{child.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
