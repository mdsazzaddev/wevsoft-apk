/**
 * /space/:handle/manage — the WevSpace Management dashboard shell (MP2 §1).
 *
 * The shell owns exactly three things: resolving the Space and the viewer's real
 * permissions, deciding which of the sixteen sections this viewer may open, and
 * rendering the navigation. Every section's behaviour lives in its own panel
 * under components/wevspace/manage/.
 *
 * Two spec points shape the layout:
 *  - §1 requires the dashboard to be reachable from the main profile, the Space
 *    profile, the Space switcher and Settings. All four link through
 *    spaceDashboardPath(), and the switcher is embedded here as well so an owner
 *    can move between Spaces without going back out to /spaces.
 *  - MP1 requires mobile to be its own interface rather than a squeezed desktop.
 *    So there is no collapsed sidebar: phones get a sticky section strip plus a
 *    bottom-sheet section grid, desktops get a left rail. Both are CSS-only, the
 *    same technique <SpaceIdentity> already uses, so there is no JS breakpoint to
 *    disagree with the stylesheet.
 */

import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Grid2x2, Loader2, ShieldAlert, X } from 'lucide-react';
import SpaceLangSwitch from '../components/wevspace/SpaceLangSwitch';
import { useMarketplaceLang } from '../components/marketplace/commerce/useMarketplaceLang';
import {
  DEFAULT_DASHBOARD_SECTION,
  isSpaceDashboardSection,
  isVerifiedSpace,
  resolveSpaceAccent,
  spaceDashboardPath,
  spaceDeskPath,
  spacePublicPath,
  spaceTypeLabel,
  visibleDashboardSections,
  type SpaceDashboardSection,
  type SpaceDashboardSectionDef,
  type SpacePermission,
} from '@wevsoft/shared/wevspace';
import {
  SpaceApiError,
  fetchManageMeta,
  fetchManageOverview,
  type ManageMeta,
  type ManageOverview,
} from '../lib/wevspaceManageApi';
import { ManageProvider, type ManageContextValue } from '../components/wevspace/manage/ManageContext';
import { spaceIcon } from '../components/wevspace/spaceIcons';
import SpaceSwitcher from '../components/wevspace/SpaceSwitcher';
import ManageSectionPanel from '../components/wevspace/manage/ManageSectionPanel';
import StandingBanner from '../components/wevspace/manage/StandingBanner';
import { PersonAvatar, num } from '../components/wevspace/manage/manageUi';

// The Space Inbox (wevchat section) is its own full-viewport app; the classic
// MessagesPanel stays available with ?view=classic.
const SpaceInbox = lazy(() => import('../components/wevspace/inbox/SpaceInbox'));

/** A badge here means "something is waiting for you", never just a total. */
function attentionCount(section: SpaceDashboardSection, counts: Record<string, number>): number {
  switch (section) {
    case 'content':
      return counts.pendingComments || 0;
    case 'wevchat':
      return counts.unreadThreads || 0;
    case 'team':
      return counts.pendingInvites || 0;
    case 'reviews':
      return counts.unansweredReviews || 0;
    case 'monetization':
      return counts.heldTransactions || 0;
    default:
      return 0;
  }
}

export default function SpaceManagePage() {
  const params = useParams();
  const handleParam = params.handle || '';
  const sectionParam = params.section;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useMarketplaceLang();
  const classicInbox = searchParams.get('view') === 'classic';

  const [overview, setOverview] = useState<ManageOverview | null>(null);
  const [meta, setMeta] = useState<ManageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ status: number; message: string } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Desktop right pane (own scroller) and mobile section strip. */
  const contentPaneRef = useRef<HTMLDivElement | null>(null);
  const sectionStripRef = useRef<HTMLDivElement | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const result = await fetchManageOverview(handleParam);
      setOverview(result);
      setFailure(null);
    } catch (error: any) {
      const status = error instanceof SpaceApiError ? error.status : 500;
      setFailure({ status, message: error?.message || 'Could not open this dashboard' });
      setOverview(null);
    }
  }, [handleParam]);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setLoading(true);
    void (async () => {
      await loadOverview();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadOverview]);

  // Vocabularies are static per deploy, so one fetch serves every section and a
  // failure is not fatal — panels fall back to the shared constants they import.
  useEffect(() => {
    let alive = true;
    fetchManageMeta()
      .then((result) => {
        if (alive) setMeta(result);
      })
      .catch(() => {
        /* panels degrade to their imported defaults */
      });
    return () => {
      alive = false;
    };
  }, []);

  const space = overview?.space || null;
  const accent = useMemo(() => resolveSpaceAccent(space || {}), [space]);
  const permissions = overview?.permissions || {};

  const sections: SpaceDashboardSectionDef[] = useMemo(() => {
    if (!overview) return [];
    const held = Object.keys(permissions).filter((key) => (permissions as Record<string, boolean>)[key] === true);
    return visibleDashboardSections({
      permissions: held,
      features: overview.features,
      spaceType: space?.spaceType,
    });
  }, [overview, permissions, space?.spaceType]);

  /**
   * The section actually rendered. An unknown id, or one this viewer cannot open,
   * falls back to their first available section — a SUPPORT member who only holds
   * messages.read lands in Messages instead of an empty Overview (§3, §5).
   */
  const section: SpaceDashboardSection | null = useMemo(() => {
    if (!sections.length) return null;
    const requested = isSpaceDashboardSection(sectionParam) ? sectionParam : DEFAULT_DASHBOARD_SECTION;
    if (sections.some((entry) => entry.id === requested)) return requested;
    return sections[0].id;
  }, [sectionParam, sections]);

  // Keep the URL honest: if we redirected the viewer to another section, the
  // address bar must say so, otherwise a refresh or a share sends them back to a
  // section they cannot open.
  useEffect(() => {
    if (!space || !section) return;
    const expected = spaceDashboardPath(space.handle, section);
    const current = spaceDashboardPath(handleParam, sectionParam);
    if (current !== expected) navigate(expected, { replace: true });
  }, [space, section, handleParam, sectionParam, navigate]);

  // Every section opens at its top. Desktop: the right pane is its own scroller,
  // so reset it (the left rail keeps its offset, so the clicked item stays put).
  // Mobile/page scroll (#main-scroll-area) is reset by AppNavigationManager on any\n  // non-POP navigation (section switches are REPLACE, see goto below).
  // Mobile strip: bring the active chip into view horizontally only - never
  // scrollIntoView, which would also scroll the page vertically.
  useLayoutEffect(() => {
    const pane = contentPaneRef.current;
    if (pane) pane.scrollTop = 0;
    const strip = sectionStripRef.current;
    const chip = strip?.querySelector<HTMLElement>('[aria-current="page"]');
    if (strip && chip) {
      // Strip is `relative`, so offsetLeft is already measured from its padding edge.
      const left = chip.offsetLeft;
      const right = left + chip.offsetWidth;
      if (left < strip.scrollLeft) strip.scrollLeft = Math.max(0, left - 12);
      else if (right > strip.scrollLeft + strip.clientWidth) {
        strip.scrollLeft = right - strip.clientWidth + 12;
      }
    }
  }, [section]);

  // Switching sections is tab switching inside ONE page, not page-to-page
  // navigation: replace the entry so the whole dashboard is a single history
  // entry and Back leaves it to wherever the user came from (e.g. Home) instead
  // of replaying every section they tapped. Tapping the active section is a no-op.
  const goto = useCallback(
    (next: SpaceDashboardSection) => {
      setSheetOpen(false);
      // WevChat (manage sidebar, Overview card, mobile strip) opens WevDesk.
      // The inbox itself stays reachable at /manage/wevchat (and in WevDesk).
      if (next === 'wevchat') {
        navigate(spaceDeskPath(space?.handle || handleParam));
        return;
      }
      if (next === section) return;
      navigate(spaceDashboardPath(space?.handle || handleParam, next), { replace: true });
    },
    [navigate, space?.handle, handleParam, section],
  );

  const contextValue: ManageContextValue | null = useMemo(() => {
    if (!overview || !space || !section) return null;
    return {
      space,
      spaceId: space.id,
      handle: space.handle,
      accent,
      permissions: permissions as Record<string, boolean>,
      features: overview.features || {},
      isOwner: overview.isOwner,
      role: overview.role,
      counts: overview.counts || {},
      recentActivity: overview.recentActivity || [],
      standing: overview.standing || null,
      meta,
      section,
      refresh: loadOverview,
      goto,
      can: (permission: SpacePermission) => (permissions as Record<string, boolean>)[permission] === true,
    };
  }, [overview, space, section, accent, permissions, meta, loadOverview, goto]);

  if (loading) return <DashboardSkeleton />;

  if (failure || !overview || !space || !section) {
    return <DashboardBlocked failure={failure} handle={handleParam} />;
  }

  const counts = overview.counts || {};
  const activeDef = sections.find((entry) => entry.id === section);
  const navSections = sections;

  if (section === 'wevchat' && !classicInbox) {
    return (
      <ManageProvider value={contextValue as ManageContextValue}>
        <Suspense fallback={<DashboardSkeleton />}>
          <SpaceInbox sectionIds={navSections.map((entry) => entry.id)} />
        </Suspense>
      </ManageProvider>
    );
  }

  return (
    <ManageProvider value={contextValue as ManageContextValue}>
      {/* Desktop (lg+): fills the viewport and never scrolls as a whole - the left
          rail and the right content pane are independent scrollers. Mobile keeps
          the normal page scroll with a sticky section strip. */}
      <div className="min-h-screen bg-background lg:min-h-0 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
        {/* ── Mobile: sticky identity bar + section strip ─────────── */}
        <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Link
              to={spacePublicPath(space.handle)}
              aria-label={t('Back to Space', 'স্পেসে ফিরে যান')}
              className="p-2 -ml-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <PersonAvatar person={{ name: space.name, avatar: space.avatar }} size={32} accent={accent} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black truncate leading-tight">{space.name}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                {t('Managing', 'পরিচালনা')} · {activeDef?.label || t('Overview', 'ওভারভিউ')}
              </p>
            </div>
            <SpaceLangSwitch />
            <SpaceSwitcher currentSpaceId={space.id} variant="compact" />
          </div>
          <div ref={sectionStripRef} className="relative flex items-center gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar overscroll-x-contain">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-label={t('All sections', 'সব সেকশন')}
              className="shrink-0 p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Grid2x2 size={16} />
            </button>
            {navSections.map((entry) => {
              const Icon = spaceIcon(entry.icon);
              const active = entry.id === section;
              const badge = attentionCount(entry.id, counts);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => goto(entry.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-extrabold transition-colors ${active ? 'text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  style={active ? { background: accent } : undefined}
                >
                  <Icon size={14} />
                  {entry.label}
                  {badge > 0 && (
                    <span
                      className={`px-1.5 rounded-md text-[10px] tabular-nums ${active ? 'bg-black/20' : 'bg-red-500 text-white'
                        }`}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1400px] flex gap-6 px-3 sm:px-4 lg:px-6 py-4 lg:py-0 lg:flex-1 lg:min-h-0">
          {/* ── Desktop: left rail ──────────────────────────────── */}
          <aside
            aria-label="Dashboard menu"
            className="hidden lg:block w-64 shrink-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
          >
            <div className="space-y-3 lg:py-6">
              <div className="bg-card border border-border rounded-3xl p-4">
                <div className="flex items-center gap-3">
                  <PersonAvatar person={{ name: space.name, avatar: space.avatar }} size={44} accent={accent} />
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate">{space.name}</p>
                    <p className="text-[11px] font-semibold text-muted-foreground truncate">
                      @{space.handle}
                      {isVerifiedSpace(space.verificationStatus) ? ' · ✓' : ''}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                  {spaceTypeLabel(space.spaceType)} · {overview.isOwner ? t('Owner', 'মালিক') : overview.role || t('Team', 'টিম')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    to={spacePublicPath(space.handle)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl bg-muted text-[11px] font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink size={12} /> {t('View', 'দেখুন')}
                  </Link>
                  <SpaceSwitcher currentSpaceId={space.id} variant="button" />
                </div>
                <div className="mt-3 flex justify-center">
                  <SpaceLangSwitch />
                </div>
              </div>

              <nav aria-label="Dashboard sections" className="bg-card border border-border rounded-3xl p-2">
                {navSections.map((entry) => {
                  const Icon = spaceIcon(entry.icon);
                  const active = entry.id === section;
                  const badge = attentionCount(entry.id, counts);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => goto(entry.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-left text-xs font-extrabold transition-colors ${active ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground'
                        }`}
                      style={active ? { background: accent } : undefined}
                    >
                      <Icon size={15} />
                      <span className="flex-1 truncate">{entry.label}</span>
                      {badge > 0 && (
                        <span
                          className={`px-1.5 rounded-md text-[10px] tabular-nums ${active ? 'bg-black/20' : 'bg-red-500 text-white'
                            }`}
                        >
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <p className="px-2 text-[10px] font-semibold text-muted-foreground">
                {num(counts.followers)} followers · {num(counts.published)} published
              </p>
            </div>
          </aside>

          {/* A <div>, not a <main>: DashboardLayout already owns the page's main
              landmark, and nesting a second one is invalid HTML that gives a
              screen reader two "main" regions to choose between (§27). */}
          <div
            ref={contentPaneRef}
            className="flex-1 min-w-0 pb-24 lg:pb-6 lg:pt-6 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
          >
            {/* Above the section, not inside Overview: a sanction is why half the
                other panels will refuse to save, and an owner who deep-linked
                into Settings must be able to read it where they hit the wall. */}
            <StandingBanner />
            <ManageSectionPanel section={section} />
          </div>
        </div>

        {/* ── Mobile: full section grid ───────────────────────────── */}
        {sheetOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50"
            onClick={() => setSheetOpen(false)}
          >
            <div
              role="dialog"
              aria-label="All dashboard sections"
              className="w-full max-h-[85vh] overflow-y-auto bg-card border-t border-border rounded-t-3xl p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-black">Manage {space.name}</h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                  className="p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {navSections.map((entry) => {
                  const Icon = spaceIcon(entry.icon);
                  const active = entry.id === section;
                  const badge = attentionCount(entry.id, counts);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => goto(entry.id)}
                      className={`flex items-center gap-2 p-3 rounded-2xl text-left text-xs font-extrabold border transition-colors ${active ? 'border-transparent text-primary-foreground' : 'border-border bg-muted/40'
                        }`}
                      style={active ? { background: accent } : undefined}
                    >
                      <Icon size={16} />
                      <span className="flex-1 truncate">{entry.label}</span>
                      {badge > 0 && (
                        <span className="px-1.5 rounded-md text-[10px] tabular-nums bg-red-500 text-white">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <Link
                to={spacePublicPath(space.handle)}
                className="mt-3 flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-muted text-xs font-extrabold"
              >
                <ExternalLink size={14} /> View public Space
              </Link>
            </div>
          </div>
        )}
      </div>
    </ManageProvider>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] flex gap-6 px-3 sm:px-4 lg:px-6 py-4 lg:py-6">
        <div className="hidden lg:block w-64 shrink-0 space-y-3">
          <div className="h-36 rounded-3xl bg-muted animate-pulse" />
          <div className="h-[520px] rounded-3xl bg-muted animate-pulse" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-12 rounded-2xl bg-muted animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-3xl bg-muted animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-muted animate-pulse" />
        </div>
      </div>
      <span className="sr-only" role="status">
        <Loader2 className="animate-spin" /> Loading dashboard
      </span>
    </div>
  );
}

/**
 * 403 and 404 read differently on purpose. "Not yours" must not imply "does not
 * exist", and either way the visitor is offered the public Space instead of a
 * dead end.
 */
function DashboardBlocked({
  failure,
  handle,
}: {
  failure: { status: number; message: string } | null;
  handle: string;
}) {
  const { t } = useMarketplaceLang();
  const notFound = failure?.status === 404;
  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 text-center">
        <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <ShieldAlert size={20} />
        </span>
        <h1 className="mt-3 text-lg font-black">
          {notFound ? t('WevSpace not found', 'WevSpace পাওয়া যায়নি') : t('You cannot manage this WevSpace', 'আপনি এই WevSpace পরিচালনা করতে পারবেন না')}
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {failure?.message ||
            t('Ask the owner to invite you to the team if you need access to this dashboard.', 'এই ড্যাশবোর্ডে প্রবেশ করতে চাইলে মালিককে আপনাকে টিমে আমন্ত্রণ জানাতে বলুন।')}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
          {!notFound && handle && (
            <Link
              to={spacePublicPath(handle)}
              className="px-4 py-2.5 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {t('View the Space', 'স্পেসটি দেখুন')}
            </Link>
          )}
          <Link
            to="/spaces"
            className="px-4 py-2.5 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {t('My WevSpaces', 'আমার WevSpaces')}
          </Link>
        </div>
      </div>
    </div>
  );
}
