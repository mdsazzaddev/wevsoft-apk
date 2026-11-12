import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CREATOR_HUB_NAME } from '../lib/creatorHub';
import { useCreatorHubMode, useCreatorSpace } from '../lib/creatorSpaceContext';
import { creatorTabsForMode, isCreatorTabAllowed, resolveCreatorTab } from '../lib/creatorHubTools';
import { motion, AnimatePresence } from 'motion/react';

import { CreatorDashboardOverview } from '../components/creator/CreatorDashboardOverview';
import { CreatorSidebar, type CreatorTab } from '../components/creator/studio/CreatorSidebar';
import { CreatorTopBar } from '../components/creator/studio/CreatorTopBar';
import { useCreatorDashboard } from '../components/creator/studio/useCreatorDashboard';
import { useCreatorProEnabled, useSystemSettingsLoaded } from '../components/creator/studio/useCreatorProEnabled';

const ContentStudioView = lazy(() => import('../components/creator/ContentStudioView').then((m) => ({ default: m.ContentStudioView })));
const AiCreatorAssistant = lazy(() => import('../components/creator/AiCreatorAssistant').then((m) => ({ default: m.AiCreatorAssistant })));
const InsightsDashboard = lazy(() => import('../components/insights/InsightsDashboard'));
const CommunityManager = lazy(() => import('../components/creator/CommunityManager').then((m) => ({ default: m.CommunityManager })));
const MonetizationHub = lazy(() => import('../components/creator/MonetizationHub').then((m) => ({ default: m.MonetizationHub })));
const BrandCollabView = lazy(() => import('../components/creator/BrandCollabView').then((m) => ({ default: m.BrandCollabView })));

const LiveStudioView = lazy(() => import('../components/creator/LiveStudioView').then((m) => ({ default: m.LiveStudioView })));

const ContentLibraryView = lazy(() => import('../components/creator/ContentLibraryView').then((m) => ({ default: m.ContentLibraryView })));
const CreatorCalendarView = lazy(() => import('../components/creator/CreatorCalendarView').then((m) => ({ default: m.CreatorCalendarView })));
const SecurityCopyrightView = lazy(() => import('../components/creator/SecurityCopyrightView').then((m) => ({ default: m.SecurityCopyrightView })));

const AiGrowthCoach = lazy(() => import('../components/creator/AiGrowthCoach').then((m) => ({ default: m.AiGrowthCoach })));
const CreatorUpgradeView = lazy(() => import('../components/creator/upgrade/CreatorUpgradeView').then((m) => ({ default: m.CreatorUpgradeView })));
const CreatorToolsView = lazy(() => import('../components/creator/CreatorToolsView').then((m) => ({ default: m.CreatorToolsView })));
const AbTestingView = lazy(() => import('../components/creator/AbTestingView').then((m) => ({ default: m.AbTestingView })));
const InspirationHubView = lazy(() => import('../components/creator/InspirationHubView').then((m) => ({ default: m.InspirationHubView })));
const PlaylistsView = lazy(() => import('../components/creator/PlaylistsView').then((m) => ({ default: m.PlaylistsView })));
const MentionsView = lazy(() => import('../components/creator/CreatorParityViews').then((m) => ({ default: m.MentionsView })));
const ActivityLogView = lazy(() => import('../components/creator/CreatorParityViews').then((m) => ({ default: m.ActivityLogView })));
const InvitePeopleView = lazy(() => import('../components/creator/CreatorParityViews').then((m) => ({ default: m.InvitePeopleView })));
const CoAuthorView = lazy(() => import('../components/creator/CreatorParityViews').then((m) => ({ default: m.CoAuthorView })));
const BoostPromoteView = lazy(() => import('../components/creator/CreatorParityViews').then((m) => ({ default: m.BoostPromoteView })));
const LinkedAndLearnView = lazy(() => import('../components/creator/CreatorParityViews').then((m) => ({ default: m.LinkedAndLearnView })));
const CreatorBatchHub = lazy(() => import('../components/creator/batch/CreatorBatchHub'));

// Which tabs exist in which hub (personal vs Space): see lib/creatorHubTools.ts.
const COLLAPSE_KEY = 'wev_creator_sidebar_collapsed';

const tabLabel = (t: CreatorTab) => t.split('_').map((w) => (w === 'ai' ? 'AI' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

/**
 * `embedded` renders the workspace without the creator sidebar/top bar (WevDesk
 * shows it inside its own shell); a tab strip replaces the sidebar navigation.
 */
export default function CreatorDashboardPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  // Aliases: ?tab=live → live_studio (common shortcut / old links)
  const tabParam = rawTab === 'live' ? 'live_studio' : rawTab;
  const proEnabled = useCreatorProEnabled();
  const settingsLoaded = useSystemSettingsLoaded();
  // Personal hub (main app) vs Space hub (Business Suite): each has its own tool set.
  const mode = useCreatorHubMode();
  const creatorSpace = useCreatorSpace();
  const tabs = useMemo(() => creatorTabsForMode(mode).filter((t) => t !== 'upgrade' || proEnabled), [mode, proEnabled]);
  // Tabs from the other hub fall back to the overview; Upgrade only exists while Creator Pro is ON.
  const activeTab: CreatorTab = resolveCreatorTab(tabParam, mode, { proEnabled });
  const activeChild = params.get('sub');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [days, setDays] = useState(7);
  // Browser tab title (not when embedded inside WevDesk, which owns the title).
  useEffect(() => {
    if (embedded) return;
    const prev = document.title;
    document.title = `${CREATOR_HUB_NAME} · Wevsoft`;
    return () => {
      document.title = prev;
    };
  }, [embedded]);
  const dashboard = useCreatorDashboard(days);

  const selectTab = useCallback(
    (requested: CreatorTab, childId?: string | null) => {
      // A link to a tab of the other hub (or an unknown tab) lands on the overview.
      const tab: CreatorTab = isCreatorTabAllowed(requested, mode) ? requested : 'overview';
      if (tab !== requested) childId = null;
      const next = new URLSearchParams(params);
      if (tab === 'overview') next.delete('tab');
      else next.set('tab', tab);
      if (childId) next.set('sub', childId);
      else next.delete('sub');
      setParams(next, { replace: true });
      document.getElementById('creator-main-scroll')?.scrollTo({ top: 0 });
    },
    [params, setParams, mode],
  );

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !c;
    });

  // Deep link to a tab this hub does not have (other hub's tool, unknown, or Upgrade while
  // Creator Pro is OFF): drop it from the URL so the overview shows.
  useEffect(() => {
    if (!tabParam || tabParam === 'overview' || tabParam === activeTab) return;
    if (tabParam === 'upgrade' && isCreatorTabAllowed('upgrade', mode) && !settingsLoaded) return;
    const next = new URLSearchParams(params);
    next.delete('tab');
    next.delete('sub');
    setParams(next, { replace: true });
  }, [tabParam, activeTab, mode, settingsLoaded, params, setParams]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const commentCount = dashboard.data?.recentComments ?? 0;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <CreatorDashboardOverview
            data={dashboard.data}
            loading={dashboard.loading}
            error={dashboard.error}
            days={days}
            onDaysChange={setDays}
            onSelectTab={(t) => selectTab(t)}
          />
        );
      case 'content_studio': return <ContentStudioView />;
      case 'ai_assistant': return <AiCreatorAssistant />;
      case 'ai_coach': return <AiGrowthCoach />;
      case 'analytics':
        return (
          <InsightsDashboard
            embedded
            spaceId={creatorSpace.spaceId || undefined}
            spaceName={creatorSpace.spaceName || undefined}
            section={activeChild === 'demographics' ? 'audience' : activeChild}
            onSectionChange={(s) => selectTab('analytics', !s || s === 'overview' ? null : s)}
          />
        );
      case 'community': return <CommunityManager />;
      case 'monetization': return <MonetizationHub />;
      case 'brand_collab': return <BrandCollabView />;

      case 'live_studio': return <LiveStudioView />;
      case 'content_library': return <ContentLibraryView />;
      case 'calendar': return <CreatorCalendarView />;

      case 'security': return <SecurityCopyrightView />;

      case 'ab_testing': return <AbTestingView />;
      case 'inspiration': return <InspirationHubView />;
      case 'playlists': return <PlaylistsView />;
      case 'mentions': return <MentionsView />;
      case 'activity': return <ActivityLogView />;
      case 'invite': return <InvitePeopleView />;
      case 'coauthor': return <CoAuthorView />;
      case 'boost': return <BoostPromoteView />;
      case 'learn': return <LinkedAndLearnView />;
      case 'tools': return <CreatorToolsView onSelectTab={(t, sub) => selectTab(t, sub)} />;
      case 'batch':
        return (
          <CreatorBatchHub
            pane={activeChild}
            onPaneChange={(pane) => selectTab('batch', pane === 'upload' ? null : pane)}
          />
        );
      case 'upgrade': return proEnabled ? <CreatorUpgradeView onBack={() => selectTab('overview')} /> : null;
      default: return null;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar (dark navy in both themes) */}
      <div className={embedded ? 'hidden' : 'hidden h-full shrink-0 lg:flex'}>
        <CreatorSidebar
          activeTab={activeTab}
          activeChild={activeChild}
          onSelect={selectTab}
          commentCount={commentCount}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      </div>

      {/* Mobile / tablet drawer */}
      <AnimatePresence>
        {drawerOpen && !embedded && (
          <motion.div className="fixed inset-0 z-[60] flex lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-slate-950/55" onClick={() => setDrawerOpen(false)} />
            <motion.div
              className="relative h-full shadow-2xl"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              <CreatorSidebar
                activeTab={activeTab}
                activeChild={activeChild}
                onSelect={selectTab}
                commentCount={commentCount}
                onClose={() => setDrawerOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Workspace */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {embedded ? (
          <div className="shrink-0 flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-border bg-card">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => selectTab(t)}
                className={`shrink-0 h-[30px] px-3 rounded-full text-[12px] font-medium ${activeTab === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
              >
                {tabLabel(t)}
              </button>
            ))}
          </div>
        ) : (
          <CreatorTopBar onOpenMenu={() => setDrawerOpen(true)} />
        )}
        <div id="creator-main-scroll" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1360px] px-3 py-4 pb-28 sm:px-5 sm:pb-28 md:pb-8 lg:px-8 lg:py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <Suspense
                  fallback={
                    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  }
                >
                  {renderContent()}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}