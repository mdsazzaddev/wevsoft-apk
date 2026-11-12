import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigationManager } from './components/navigation/AppNavigationManager';
import { useStore } from './store';
import { applyAccentToDocument, ACCENT_PREF_KEY, isAllowedAccentName } from '@wevsoft/shared/accentThemes';
import {
  NAV_ICON_STYLE_DARK_PREF_KEY,
  NAV_ICON_STYLE_LIGHT_PREF_KEY,
} from '@wevsoft/shared/nav-icon-style';
import { hydrateNavIconAdminDefaults, hydrateNavIconUserPrefs } from './lib/navIconStyleState';
import { resolveWebsiteName } from '@wevsoft/shared/brand';
import { applyGlassEffectsToDocument, GLASS_PREF_KEY, parseGlassEnabled } from './lib/glassEffects';
import { bootstrapMobilePerf } from './lib/mobilePerf';
import { DESKTOP_HEADER_PREF_KEY, parseDesktopHeaderEnabled } from './lib/desktopHeader';
import { DESKTOP_HEADER_NAV_PREF_KEY, parseDesktopHeaderNavIds, normalizeDesktopHeaderNavIds } from './lib/desktopHeaderNav';
import {
  DESKTOP_HEADER_NAV_FLOATING_PREF_KEY,
  parseDesktopHeaderNavFloating,
} from './lib/desktopHeaderNavFloating';
import { MOBILE_NAV_TRANSPARENT_PREF_KEY, parseMobileNavTransparent } from './lib/mobileNavTransparent';
import {
  MOBILE_BOTTOM_NAV_STYLE_PREF_KEY,
  parseMobileBottomNavStyle,
  styleFromLegacyTransparent,
} from './lib/mobileBottomNavStyle';
import {
  REELS_BOTTOM_NAV_PREF_KEY,
  parseReelsBottomNavMode,
} from './lib/reelsBottomNav';
import {
  MOBILE_TOP_HEADER_PREF_KEY,
  MOBILE_TOP_HEADER_STYLE_PREF_KEY,
  parseMobileTopHeaderEnabled,
  parseMobileTopHeaderStyle,
} from './lib/mobileTopHeader';
import {
  MOBILE_TOP_HEADER_CHROME_PREF_KEY,
  parseMobileTopHeaderChrome,
} from './lib/mobileTopHeaderChrome';
import { MOBILE_BOTTOM_NAV_PREF_KEY, normalizeMobileBottomNavIds } from './lib/mobileBottomNav';
import { applyFontScaleToDocument, FONT_SCALE_PREF_KEY, isAllowedFontScale } from './lib/fontScale';
import { applyReducedMotionToDocument, parseReducedMotion, REDUCED_MOTION_PREF_KEY } from './lib/reducedMotion';
import {
  applyDisplayModeToDocument,
  resolveThemeLabelForPaint,
} from './lib/statusBarTheme';
import { dismissWevSplash } from './lib/wevSplash';
import StatusBarChrome from './components/StatusBarChrome';
import { Toaster } from 'react-hot-toast';
import UploadProgressToast from './components/UploadProgressToast';
import { WebSocketProvider } from './components/providers/WebSocketProvider';
import { getAdminAppUrl } from './lib/adminAppUrl';
import { rejectAdminConsumerUser } from './lib/consumerAuthGuards';
import RouteFallback from './components/RouteFallback';
import DeveloperAppRedirect from './components/DeveloperAppRedirect';
import BusinessAppRedirect from './components/BusinessAppRedirect';
import CreatorHubAppRedirect from './components/CreatorHubAppRedirect';
import { StepUpHost } from './components/StepUpHost';

// Route pages are lazy so phones on LAN aren't blocked downloading ~70 eager modules
// before the first paint (endless "Loading Wevsoft…" on Wi-Fi).
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const PhantomUiPage = lazy(() => import('./pages/phantom-ui/PhantomUiPage'));
const PhantomCreatePage = lazy(() => import('./pages/phantom-ui/PhantomCreatePage'));
const PhantomProfilePage = lazy(() => import('./pages/phantom-ui/PhantomProfilePage'));
const PhotosPage = lazy(() => import('./pages/PhotosPage'));
const ConnectedAccountsCallbackPage = lazy(() => import('./pages/ConnectedAccountsCallbackPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const StoryStudioPage = lazy(() => import('./components/storyStudio/panels/StoryStudioPage'));
const IgStoryCreator = lazy(() => import('./components/storyCreate/IgStoryCreator'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProfileManagePage = lazy(() => import('./pages/profile/ProfileManagePage'));
const PublicProfilePage = lazy(() => import('./pages/PublicProfilePage'));

/** Legacy share links used `/profile/:username`; public profiles live at `/u/:username`. */
function LegacyProfileUsernameRedirect() {
  const { username } = useParams();
  if (!username) return <Navigate to="/home" replace />;
  return <Navigate to={`/u/${encodeURIComponent(username)}`} replace />;
}
const GuardianDashboard = lazy(() => import('./pages/GuardianDashboard'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const PostPage = lazy(() => import('./pages/PostPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const FriendsPage = lazy(() => import('./pages/FriendsPage'));
const MiniReelPlayer = lazy(() => import('./components/reels/MiniReelPlayer'));
const ProfileOverlayHost = lazy(() => import('./components/ProfileOverlayHost'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const MarketplaceSectionPage = lazy(() => import('./pages/MarketplaceSectionPage'));
const MarketplaceCategoryPage = lazy(() => import('./pages/MarketplaceCategoryPage'));
const MarketplaceSellersPage = lazy(() => import('./pages/MarketplaceSellersPage'));
const MarketplaceProductPage = lazy(() => import('./pages/MarketplaceProductPage'));
const MarketplaceCartPage = lazy(() => import('./pages/MarketplaceCartPage'));
const MarketplaceCheckoutPage = lazy(() => import('./pages/MarketplaceCheckoutPage'));
const MarketplaceOrdersPage = lazy(() => import('./pages/MarketplaceOrdersPage'));
const SpaceInvoicePage = lazy(() => import('./pages/SpaceInvoicePage'));
const MarketplaceWishlistPage = lazy(() => import('./pages/MarketplaceWishlistPage'));
const MarketplaceComparePage = lazy(() => import('./pages/MarketplaceComparePage'));
const MarketplaceMapPage = lazy(() => import('./pages/MarketplaceMapPage'));
const MarketplaceLivePage = lazy(() => import('./pages/MarketplaceLivePage'));
const MarketplaceHistoryPage = lazy(() => import('./pages/MarketplaceHistoryPage'));
const PublicShopPage = lazy(() => import('./pages/PublicShopPage'));
const SellerOnboardingPage = lazy(() => import('./pages/SellerOnboardingPage'));
const SellerDashboardPage = lazy(() => import('./pages/SellerDashboardPage'));
const VideosPage = lazy(() => import('./pages/VideosPage'));
const MemoriesPage = lazy(() => import('./pages/MemoriesPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const AcademicPage = lazy(() => import('./pages/AcademicPage'));
const CampusPage = lazy(() => import('./pages/CampusPage'));
const InviteLandingPage = lazy(() => import('./pages/InviteLandingPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const AiStudyPage = lazy(() => import('./pages/AiStudyPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const GroupsPage = lazy(() => import('./pages/GroupsPage'));
const SpacesPage = lazy(() => import('./pages/SpacesPage'));
const CreateSpacePage = lazy(() => import('./pages/CreateSpacePage'));
const SpacePage = lazy(() => import('./pages/SpacePage'));
// The old Manage page was replaced by WevDesk; legacy /manage URLs redirect there.
const LegacyManageRedirect = lazy(() => import('./pages/wevdesk/LegacyManageRedirect'));
// WevDesk: the Space's full-screen business workspace (Space-mode WevChat opens it).
const WevDeskLayout = lazy(() => import('./pages/wevdesk/WevDeskLayout'));
const WevDeskHome = lazy(() => import('./pages/wevdesk/WevDeskHome'));
const WevDeskInbox = lazy(() => import('./pages/wevdesk/WevDeskInbox'));
const WevDeskPlaceholder = lazy(() => import('./pages/wevdesk/WevDeskPlaceholder'));
const WevDeskPlanner = lazy(() => import('./pages/wevdesk/WevDeskPlanner'));
const WevDeskWorkflows = lazy(() => import('./pages/wevdesk/WevDeskWorkflows'));
const WevDeskBookings = lazy(() => import('./pages/wevdesk/WevDeskBookings'));
const WevDeskBilling = lazy(() => import('./pages/wevdesk/WevDeskBilling'));
const WevDeskBroadcast = lazy(() => import('./pages/wevdesk/WevDeskBroadcast'));
const WevDeskNewChat = lazy(() => import('./pages/wevdesk/WevDeskNewChat'));
const GlobalShareHost = lazy(() => import('./components/share/GlobalShareHost'));
const WevDeskInvoices = lazy(() => import('./pages/wevdesk/WevDeskInvoices'));
const WevDeskSection = lazy(() => import('./pages/wevdesk/WevDeskSection'));
const WevDeskSectionRoute = lazy(() => import('./pages/wevdesk/WevDeskSection').then((m) => ({ default: m.WevDeskSectionRoute })));
const WevDeskEmbeds = lazy(() => import('./pages/wevdesk/WevDeskEmbeds'));
const WevDeskIntegrations = lazy(() => import('./pages/wevdesk/WevDeskIntegrations'));
const DeveloperConsolePage = lazy(() => import('./pages/DeveloperConsolePage'));
const OAuthConsentPage = lazy(() => import('./pages/developer/OAuthConsentPage'));
const EmbedPostPage = lazy(() => import('./pages/embed/EmbedPages').then((m) => ({ default: m.EmbedPostPage })));
const EmbedFollowPage = lazy(() => import('./pages/embed/EmbedPages').then((m) => ({ default: m.EmbedFollowPage })));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const CreateJobPage = lazy(() => import('./pages/CreateJobPage'));
const JobDetailsPage = lazy(() => import('./pages/JobDetailsPage'));
const JobApplicationFormPage = lazy(() => import('./pages/JobApplicationFormPage'));
const MyApplicationsPage = lazy(() => import('./pages/MyApplicationsPage'));
const TalentSearchPage = lazy(() => import('./pages/TalentSearchPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const ContentStudioPage = lazy(() => import('./pages/ContentStudioPage'));
// Wevsoft AI assistant (/ai, /ai/workflows) removed from the UI; pages kept in
// src/pages/AiAssistantPage.tsx + AiWorkflowPage.tsx for easy restore.
const AiPostCreatorPage = lazy(() => import('./pages/AiPostCreatorPage'));
const CreatePostPage = lazy(() => import('./pages/CreatePostPage'));
const SharePage = lazy(() => import('./pages/SharePage'));
const LiveStreamPage = lazy(() => import('./pages/LiveStreamPage'));
const WatchPartyPage = lazy(() => import('./pages/WatchPartyPage'));
const SfuRoomPage = lazy(() => import('./pages/SfuRoomPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const RewardsPage = lazy(() => import('./pages/RewardsPage'));
const AiWevChatPage = lazy(() => import('./pages/AiWevChatPage'));
const ReelsPage = lazy(() => import('./pages/ReelsPage'));
const ReelCreatorPage = lazy(() => import('./pages/ReelCreatorPage'));
const BulletinsPage = lazy(() => import('./legacy-social/BulletinsPage'));
const PersonalCreatorHubPage = lazy(() => import('./pages/PersonalCreatorHubPage'));
const CreatorHubRedirect = lazy(() => import('./pages/CreatorHubRedirect'));

const CRMLeadKanban = lazy(() => import('./components/business/CRMLeadKanban').then(m => ({ default: m.CRMLeadKanban })));
const SupportTicketList = lazy(() => import('./components/business/SupportTicketList').then(m => ({ default: m.SupportTicketList })));
const KnowledgeBasePage = lazy(() => import('./components/knowledge/KnowledgeBasePage').then(m => ({ default: m.KnowledgeBasePage })));
const BusinessAIAgentConfig = lazy(() => import('./components/business/BusinessAIAgentConfig').then(m => ({ default: m.BusinessAIAgentConfig })));

// Kept out of the entry chunk: signed-in visitors never need the login page
// (it drags in qrcode + WebAuthn + the mascot), and donations are a rare route.
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DonationPage = lazy(() => import('./pages/DonationPage').then((m) => ({ default: m.DonationPage })));
const DonationHistoryPage = lazy(() => import('./pages/donate/DonationHistoryPage'));
const DonationDetailPage = lazy(() => import('./pages/donate/DonationDetailPage'));
// Public legal surface. Google's OAuth reviewers crawl these anonymously while
// checking branding, so they must never sit behind the auth gate.
const LegalPage = lazy(() => import('./pages/LegalPage'));
const routeFallback = <RouteFallback />;

/**
 * Shared React Query client. Created once at module level (not inside the
 * component) so it survives re-renders and is never inadvertently reset.
 * - defaultOptions.queries.staleTime: 30 s — reduces unnecessary refetches.
 * - retry: 1 — avoids flooding the backend on transient failures.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 60 s stale window — reduces refetches on repeated navigation.
      staleTime: 60_000,
      retry: 1,
      // Disabled: tab-focus was firing a full re-fetch cascade on every
      // window switch, creating unnecessary server pressure.
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  // Selective Zustand reads — useStore() without a selector re-renders App (and the
  // whole router tree) on every unrelated store write (chat active, gamification, …).
  const theme = useStore((s) => s.theme);
  const accentTheme = useStore((s) => s.accentTheme);
  const glassEffects = useStore((s) => s.glassEffects);
  const fontScale = useStore((s) => s.fontScale);
  const token = useStore((s) => s.token);
  const systemSettings = useStore((s) => s.systemSettings);
  const setSystemSettings = useStore((s) => s.setSystemSettings);
  const setAccentTheme = useStore((s) => s.setAccentTheme);
  const setGlassEffects = useStore((s) => s.setGlassEffects);
  const setShowDesktopHeader = useStore((s) => s.setShowDesktopHeader);
  const setDesktopHeaderNavFloating = useStore((s) => s.setDesktopHeaderNavFloating);
  const setMobileNavTransparent = useStore((s) => s.setMobileNavTransparent);
  const setMobileBottomNavStyle = useStore((s) => s.setMobileBottomNavStyle);
  const setReelsBottomNav = useStore((s) => s.setReelsBottomNav);
  const setShowMobileTopHeader = useStore((s) => s.setShowMobileTopHeader);
  const setMobileTopHeaderChrome = useStore((s) => s.setMobileTopHeaderChrome);
  const setMobileTopHeaderStyle = useStore((s) => s.setMobileTopHeaderStyle);
  const setFontScale = useStore((s) => s.setFontScale);
  const setDesktopHeaderNavIds = useStore((s) => s.setDesktopHeaderNavIds);
  const setMobileNavItems = useStore((s) => s.setMobileNavItems);
  const setGamification = useStore((s) => s.setGamification);
  const setAuth = useStore((s) => s.setAuth);

  React.useEffect(() => bootstrapMobilePerf(), []);
  // Warm the shell chunk while App mounts so Home isn't stuck behind Suspense on slow phones.
  React.useEffect(() => {
    if (!token) return;
    void import('./components/DashboardLayout');
    // Prefetch the Friends route chunk on idle so opening it never waits on a lazy download.
    const ric = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
    // Main nav sections, fetched one at a time on idle so they don't compete with the current page.
    const warm = () => {
      const chunks = [
        () => import('./pages/FriendsPage'),
        () => import('./pages/FeedPage'),
        () => import('./pages/NotificationsPage'),
        () => import('./pages/MessagesPage'),
        () => import('./pages/ProfilePage'),
        () => import('./pages/ReelsPage'),
        () => import('./pages/ExplorePage'),
        () => import('./pages/GroupsPage'),
        () => import('./pages/MarketplacePage'),
        () => import('./pages/SpacesPage'),
      ];
      const conn = (navigator as any).connection;
      const n = conn?.saveData || /2g/.test(conn?.effectiveType ?? '') ? 1 : chunks.length;
      void chunks.slice(0, n).reduce<Promise<unknown>>((p, load) => p.then(load, load), Promise.resolve());
    };
    if (ric) ric(warm); else window.setTimeout(warm, 1500);
  }, [token]);
  React.useEffect(() => {
    let active = true;
    const ac = new AbortController();
    const kill = window.setTimeout(() => {
      if (active) ac.abort();
    }, 12000);
    fetch("/api/settings/system", { signal: ac.signal })
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        setSystemSettings(data);
        hydrateNavIconAdminDefaults(data.navIconStyleDefaults);
        document.title = resolveWebsiteName(data.websiteName);
        if (data.favicon) {
          // Wide wordmark (/logo.svg|/logo.png) must NEVER become the tab icon —
          // browsers squash non-1:1 marks. Map built-ins to the square W mark.
          const raw = String(data.favicon);
          const builtInWide =
            raw === '/logo.png' ||
            raw === '/logo.svg' ||
            raw.endsWith('/logo.png') ||
            raw.endsWith('/logo.svg');
          const href = builtInWide ? '/logo-mark.svg?v=20261111' : raw;
          const links = document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']");
          if (links.length === 0) {
            const link = document.createElement('link');
            link.rel = 'icon';
            if (builtInWide) link.type = 'image/svg+xml';
            link.href = href;
            document.head.appendChild(link);
          } else {
            links.forEach((link) => {
              if (builtInWide) {
                link.type = 'image/svg+xml';
                link.removeAttribute('sizes');
              }
              link.href = href;
            });
          }
        }
      })
      .catch(() => { })
      .finally(() => {
        window.clearTimeout(kill);
      });
    return () => {
      active = false;
      window.clearTimeout(kill);
    };
  }, []);

  React.useEffect(() => {
    if (!token) return;
    fetch('/api/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const ct = String(res.headers.get('content-type') || '');
        // www SPA shell can answer /api/* with HTML 200 when the proxy is missing —
        // never treat that as a profile payload or we keep a stale avatar forever.
        if (!ct.includes('application/json')) return null;
        return res.json();
      })
      .then(profileData => {
        if (profileData && profileData.id) {
          if (rejectAdminConsumerUser(profileData)) {
            useStore.getState().logout();
            return;
          }
          // Always take avatar/cover from the profile payload (including explicit null)
          // so a stale localStorage user cannot keep a deleted or wrong avatar.
          const prev = useStore.getState().user || {};
          setAuth(token, {
            ...prev,
            ...profileData,
            avatar: Object.prototype.hasOwnProperty.call(profileData, 'avatar')
              ? profileData.avatar
              : (prev as { avatar?: string | null }).avatar,
            cover: Object.prototype.hasOwnProperty.call(profileData, 'cover')
              ? profileData.cover
              : (prev as { cover?: string | null }).cover,
          });
        }
      })
      .catch(err => console.error('[App] Failed to sync user profile:', err));
  }, [token]);
  useEffect(() => {
    // applyDisplayModeToDocument owns classList + theme-color + shell paint.
    // System → platform default / last paint (never OS-light FOUC on refresh).
    const activeTheme = resolveThemeLabelForPaint(
      theme ? String(theme) : 'Light mode',
      systemSettings?.theme,
    );
    applyDisplayModeToDocument(activeTheme);

    const stillFollowsOs =
      /system/i.test(String(theme || '')) &&
      !(systemSettings?.theme && !/system/i.test(String(systemSettings.theme)));
    if (stillFollowsOs) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const onChange = () =>
        applyDisplayModeToDocument(
          resolveThemeLabelForPaint(String(theme), systemSettings?.theme),
        );
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
  }, [theme, systemSettings?.theme]);

  useEffect(() => {
    applyAccentToDocument(accentTheme, systemSettings?.brandColor || null);
  }, [accentTheme, systemSettings?.brandColor]);

  useEffect(() => {
    applyGlassEffectsToDocument(glassEffects);
  }, [glassEffects]);

  useEffect(() => {
    applyFontScaleToDocument(fontScale);
  }, [fontScale]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/settings/account', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (!settings) return;
        let saved: unknown;
        let glassRaw: unknown;
        let fontRaw: unknown;
        let headerRaw: unknown;
        let navTransparentRaw: unknown;
        let navStyleRaw: unknown;
        let reelsBottomNavRaw: unknown;
        let mobileTopHeaderRaw: unknown;
        let mobileTopHeaderChromeRaw: unknown;
        let mobileTopHeaderStyleRaw: unknown;
        let headerNavRaw: unknown;
        let headerNavFloatingRaw: unknown;
        let mobileBottomNavRaw: unknown;
        if (settings.accentColor && isAllowedAccentName(settings.accentColor)) {
          saved = settings.accentColor;
        }
        if (settings.preferences) {
          try {
            const blob = JSON.parse(settings.preferences);
            if (saved === undefined) saved = blob?.[ACCENT_PREF_KEY];
            glassRaw = blob?.[GLASS_PREF_KEY];
            fontRaw = blob?.[FONT_SCALE_PREF_KEY];
            if (blob && REDUCED_MOTION_PREF_KEY in blob) applyReducedMotionToDocument(parseReducedMotion(blob[REDUCED_MOTION_PREF_KEY]));
            headerRaw = blob?.[DESKTOP_HEADER_PREF_KEY];
            navTransparentRaw = blob?.[MOBILE_NAV_TRANSPARENT_PREF_KEY];
            navStyleRaw = blob?.[MOBILE_BOTTOM_NAV_STYLE_PREF_KEY];
            reelsBottomNavRaw = blob?.[REELS_BOTTOM_NAV_PREF_KEY];
            mobileTopHeaderRaw = blob?.[MOBILE_TOP_HEADER_PREF_KEY];
            mobileTopHeaderChromeRaw = blob?.[MOBILE_TOP_HEADER_CHROME_PREF_KEY];
            mobileTopHeaderStyleRaw = blob?.[MOBILE_TOP_HEADER_STYLE_PREF_KEY];
            headerNavRaw = blob?.[DESKTOP_HEADER_NAV_PREF_KEY];
            headerNavFloatingRaw = blob?.[DESKTOP_HEADER_NAV_FLOATING_PREF_KEY];
            mobileBottomNavRaw = blob?.[MOBILE_BOTTOM_NAV_PREF_KEY];
            hydrateNavIconUserPrefs(
              {
                light: blob?.[NAV_ICON_STYLE_LIGHT_PREF_KEY],
                dark: blob?.[NAV_ICON_STYLE_DARK_PREF_KEY],
              },
              { replaceMissing: true },
            );
          } catch { /* ignore */ }
        }
        if (typeof saved === 'string' && isAllowedAccentName(saved) && saved !== useStore.getState().accentTheme) {
          setAccentTheme(saved);
        }
        if (glassRaw !== undefined) {
          const enabled = parseGlassEnabled(glassRaw);
          if (enabled !== useStore.getState().glassEffects) setGlassEffects(enabled);
        }
        if (typeof fontRaw === 'string' && isAllowedFontScale(fontRaw) && fontRaw !== useStore.getState().fontScale) {
          setFontScale(fontRaw);
        }
        if (headerRaw !== undefined) {
          const enabled = parseDesktopHeaderEnabled(headerRaw);
          if (enabled !== useStore.getState().showDesktopHeader) setShowDesktopHeader(enabled);
        }
        if (navStyleRaw !== undefined) {
          const style = parseMobileBottomNavStyle(navStyleRaw);
          if (style !== useStore.getState().mobileBottomNavStyle) setMobileBottomNavStyle(style);
        } else if (navTransparentRaw !== undefined) {
          const enabled = parseMobileNavTransparent(navTransparentRaw);
          const style = styleFromLegacyTransparent(enabled);
          if (style !== useStore.getState().mobileBottomNavStyle) setMobileBottomNavStyle(style);
          else if (enabled !== useStore.getState().mobileNavTransparent) setMobileNavTransparent(enabled);
        }
        if (reelsBottomNavRaw !== undefined) {
          const mode = parseReelsBottomNavMode(reelsBottomNavRaw);
          if (mode !== useStore.getState().reelsBottomNav) setReelsBottomNav(mode);
        }
        if (mobileTopHeaderRaw !== undefined) {
          const enabled = parseMobileTopHeaderEnabled(mobileTopHeaderRaw);
          if (enabled !== useStore.getState().showMobileTopHeader) setShowMobileTopHeader(enabled);
        }
        if (mobileTopHeaderChromeRaw !== undefined) {
          const chrome = parseMobileTopHeaderChrome(mobileTopHeaderChromeRaw);
          if (chrome !== useStore.getState().mobileTopHeaderChrome) setMobileTopHeaderChrome(chrome);
        }
        if (mobileTopHeaderStyleRaw !== undefined) {
          const style = parseMobileTopHeaderStyle(mobileTopHeaderStyleRaw);
          const current = useStore.getState().mobileTopHeaderStyle;
          if (JSON.stringify(style) !== JSON.stringify(current)) setMobileTopHeaderStyle(style);
        }
        if (headerNavRaw !== undefined) {
          const ids = normalizeDesktopHeaderNavIds(headerNavRaw);
          const current = useStore.getState().desktopHeaderNavIds;
          if (JSON.stringify(ids) !== JSON.stringify(current)) setDesktopHeaderNavIds(ids);
        }
        if (headerNavFloatingRaw !== undefined) {
          const enabled = parseDesktopHeaderNavFloating(headerNavFloatingRaw);
          if (enabled !== useStore.getState().desktopHeaderNavFloating) setDesktopHeaderNavFloating(enabled);
        }
        if (mobileBottomNavRaw !== undefined) {
          const ids = normalizeMobileBottomNavIds(mobileBottomNavRaw);
          const current = useStore.getState().mobileNavItems;
          if (JSON.stringify(ids) !== JSON.stringify(current)) setMobileNavItems(ids);
        }
      })
      .catch((err) => console.error('[App] Failed to sync display prefs:', err));
  }, [token, setAccentTheme, setGlassEffects, setShowDesktopHeader, setDesktopHeaderNavFloating, setMobileNavTransparent, setMobileBottomNavStyle, setReelsBottomNav, setShowMobileTopHeader, setMobileTopHeaderChrome, setMobileTopHeaderStyle, setFontScale, setDesktopHeaderNavIds, setMobileNavItems]);

  // Daily check-in is idempotent server-side; throttle per calendar day + defer past first paint.
  useEffect(() => {
    if (!token) return;
    const todayKey = new Date().toISOString().slice(0, 10);
    const cacheKey = `wev_checkin_day_${token.slice(-12)}`;
    try {
      if (sessionStorage.getItem(cacheKey) === todayKey) return;
      sessionStorage.setItem(cacheKey, todayKey);
    } catch { /* ignore */ }
    const timer = window.setTimeout(() => {
      fetch('/api/v1/gamification/checkin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setGamification({
            xp: data.xp,
            coins: data.coins,
            level: data.level,
            tier: data.tier,
            streak: data.streak,
          });
        })
        .catch(() => { });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [token, setGamification]);

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <StatusBarChrome />
        <StepUpHost />
        <Toaster position="top-center" toastOptions={{ className: 'dark:bg-zinc-900 dark:text-white' }} />
        <UploadProgressToast />
        <Router>
          <AppNavigationManager />
          <GlobalShareHost />
          <Routes>
            <Route path="/auth" element={<Suspense fallback={routeFallback}><AuthPage /></Suspense>} /><Route path="/settings/connected-accounts/callback" element={<ConnectedAccountsCallbackPage />} />
            <Route path="/invite/:code" element={<InviteLandingPage />} />
            <Route
              path="/privacy"
              element={
                <Suspense fallback={routeFallback}>
                  <LegalPage kind="privacy" />
                </Suspense>
              }
            />
            <Route
              path="/terms"
              element={
                <Suspense fallback={routeFallback}>
                  <LegalPage kind="terms" />
                </Suspense>
              }
            />
              <Route path="/embed/post/:postId" element={<EmbedPostPage />} />
              <Route path="/embed/follow" element={<EmbedFollowPage />} />
              {/* Developer console lives in its own app (developer.wevsoft.com / :3003). */}
              <Route path="/developer" element={<DeveloperAppRedirect />} />
              <Route path="/developer/*" element={<DeveloperAppRedirect />} />
            {/* Dedicated full-viewport shell — same idea as admin, not nested in DashboardLayout. */}
            {/* Phantom: zero-knowledge anonymous board with PIN-based ownership. */}
            <Route path="/phantom" element={<ProtectedRoute><PhantomUiPage /></ProtectedRoute>} />
            <Route path="/phantom/create" element={<ProtectedRoute><PhantomCreatePage /></ProtectedRoute>} />
            <Route path="/phantom/profile" element={<ProtectedRoute><PhantomProfilePage /></ProtectedRoute>} />
            <Route path="/phantom/post/:id" element={<ProtectedRoute><PhantomUiPage /></ProtectedRoute>} />
            <Route path="/phantom/feed" element={<Navigate to="/phantom" replace />} />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            {/* IG-style create at /create-story; advanced desktop studio at /story-studio. */}
            <Route path="/story-studio" element={<ProtectedRoute><StoryStudioPage /></ProtectedRoute>} />
            <Route path="/create-story" element={<ProtectedRoute><IgStoryCreator /></ProtectedRoute>} />
            
            {/* Full-viewport developer pages, outside DashboardLayout */}
            <Route element={
              <ProtectedRoute>
                <Suspense fallback={routeFallback}>
                  <Outlet />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route path="/developer-console" element={<DeveloperConsolePage />} />
              <Route path="/oauth/authorize" element={<OAuthConsentPage />} />
              {/* Wevsoft Space Inbox: full-viewport app (own header + rail), not nested in DashboardLayout. */}
              <Route path="/space/:handle/manage/wevchat" element={<LegacyManageRedirect />} />
              {/* WevDesk: own shell (dark rail + top search); Unified Inbox renders the Space Inbox inside it. */}
              <Route path="/space/:handle/desk" element={<WevDeskLayout />}>
                <Route index element={<WevDeskHome />} />
                <Route path="inbox" element={<WevDeskInbox />} />
                <Route path="planner" element={<WevDeskPlanner />} />
                <Route path="workflows" element={<WevDeskWorkflows />} />
                <Route path="bookings" element={<WevDeskBookings />} />
                <Route path="billing" element={<WevDeskBilling />} />
                <Route path="broadcast" element={<WevDeskBroadcast />} />
                <Route path="new-chat" element={<WevDeskNewChat />} />
                <Route path="invoices" element={<WevDeskInvoices />} />
            <Route path="s/:section" element={<WevDeskSectionRoute />} />
                {/* Sidebar options rendered inside the desk shell (existing features, not copies). */}
                <Route path="commerce" element={<WevDeskSection section="products" />} />
                <Route path="team" element={<WevDeskSection section="team" />} />
                <Route path="insights" element={<WevDeskSection section="analytics" />} />
                <Route path="ads" element={<WevDeskSection section="promotion" />} />
                <Route path="payments" element={<WevDeskSection section="monetization" />} />
                <Route path="reviews" element={<WevDeskSection section="reviews" />} />
                <Route path="settings" element={<WevDeskSection section="settings" />} />
                <Route path="notifications" element={<WevDeskSection section="notifications" />} />
                <Route path="brand-kit" element={<WevDeskSection section="custom-profile" />} />
                <Route path="content-studio" element={<WevDeskEmbeds page="content-studio" />} />
                <Route path="ai-agents" element={<WevDeskEmbeds page="ai-agents" />} />
                <Route path="crm" element={<WevDeskEmbeds page="crm" />} />
                <Route path="creator-hub" element={<WevDeskEmbeds page="creator-hub" />} />
                <Route path="integrations" element={<WevDeskIntegrations />} />
                <Route path=":page" element={<WevDeskPlaceholder />} />
              </Route>
              <Route path="/studio/content" element={<ContentStudioPage />} />
              <Route path="/insights" element={<InsightsPage />} />
            </Route>
            <Route path="/" element={
              <ProtectedRoute>
                <Suspense fallback={routeFallback}>
                  <DashboardLayout />
                </Suspense>
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="home" element={<HomePage />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="donate" element={<DonationPage />} />
              <Route path="donate/history" element={<DonationHistoryPage />} />
              <Route path="donate/history/:id" element={<DonationDetailPage />} />
              <Route path="posts/:postId" element={<PostPage />} />
              <Route path="messages" element={<MessagesPage />} />
              
                <Route path="messages/:conversationId" element={<MessagesPage />} />
                <Route path="wevchat" element={<MessagesPage />} />
                <Route path="wevchat/:conversationId" element={<MessagesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="explore" element={<ExplorePage />} />
              <Route path="bulletins" element={<BulletinsPage />} />
              <Route path="bulletins/*" element={<BulletinsPage />} />
              <Route path="support" element={<SupportPage />} />
              <Route path="photos" element={<PhotosPage />} />
              <Route path="photos/*" element={<PhotosPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/manage/:section" element={<ProfileManagePage />} />
              <Route path="profile/:username" element={<LegacyProfileUsernameRedirect />} />
              <Route path="u/:username" element={<PublicProfilePage />} />
              <Route path="@:username" element={<PublicProfilePage />} />
              <Route path="guardian" element={<GuardianDashboard />} />
              <Route path="guardian/*" element={<GuardianDashboard />} />

              <Route path="friends" element={<FriendsPage />} />
              <Route path="friends/*" element={<FriendsPage />} />
              <Route path="reels" element={<ReelsPage />} />
              <Route path="reels/create" element={<ReelCreatorPage />} />
              <Route path="upload-reel" element={<Navigate to="/reels/create" replace />} />
              <Route path="reels/:reelId" element={<ReelsPage />} />
              <Route path="wevmall" element={<MarketplacePage />} />
              <Route path="marketplace" element={<MarketplaceRouteRedirect />} />
              <Route path="marketplace/*" element={<MarketplaceRouteRedirect />} />
              <Route path="wevmall/category/:categorySlug" element={<MarketplaceCategoryPage />} />
              <Route path="wevmall/sellers" element={<MarketplaceSellersPage />} />
              <Route path="wevmall/product/:id" element={<MarketplaceProductPage />} />
              <Route path="wevmall/cart" element={<MarketplaceCartPage />} />
              <Route path="wevmall/checkout" element={<MarketplaceCheckoutPage />} />
              <Route path="wevmall/orders" element={<MarketplaceOrdersPage />} />
              <Route path="space-invoice/:invoiceId" element={<SpaceInvoicePage />} />
              <Route path="wevmall/wishlist" element={<MarketplaceWishlistPage />} />
              <Route path="wevmall/compare" element={<MarketplaceComparePage />} />
              <Route path="wevmall/map" element={<MarketplaceMapPage />} />
              <Route path="wevmall/live" element={<MarketplaceLivePage />} />
              <Route path="wevmall/live/:id" element={<MarketplaceLivePage />} />
              <Route path="wevmall/history" element={<MarketplaceHistoryPage />} />
              <Route path="wevmall/:sectionId" element={<MarketplaceSectionPage />} />
              <Route path="shop" element={<Navigate to="/wevmall/sellers" replace />} />
              <Route path="shop/:slug" element={<PublicShopPage />} />
              <Route path="seller/onboarding" element={<SellerOnboardingPage />} />
              <Route path="seller/dashboard" element={<SellerDashboardPage />} />
              <Route path="videos" element={<VideosPage />} />
              <Route path="videos/*" element={<VideosPage />} />
              <Route path="memories" element={<MemoriesPage />} />
              <Route path="files" element={<FilesPage />} />
              <Route path="welcome" element={<OnboardingPage />} />
              <Route path="campus" element={<CampusPage />} />
              <Route path="campus/*" element={<CampusPage />} />
              <Route path="academic" element={<AcademicPage />} />
              <Route path="academic/*" element={<AcademicPage />} />
              <Route path="study" element={<AiStudyPage />} />
              <Route path="study/*" element={<AiStudyPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="groups" element={<GroupsPage />} />
              {/* WevSpaces. `:handle` matches both `name` and `@name`; the API strips
              the leading @, so one route serves the canonical and bare form. */}

              <Route path="spaces" element={<SpacesPage />} />
              <Route path="spaces/create" element={<CreateSpacePage />} />
              {/* §11/§12 category directory. Declared after `spaces/create` so the
              literal segment always wins over a would-be category slug. */}
              <Route path="spaces/category/:categorySlug" element={<SpacesPage />} />
              {/* Owner dashboard. Declared before the bare `space/:handle` view so the
              two never compete, and the paths match spaceDashboardPath() exactly. */}
              <Route path="space/:handle/manage" element={<LegacyManageRedirect />} />
              <Route path="space/:handle/manage/:section" element={<LegacyManageRedirect />} />
              <Route path="space/:handle" element={<SpacePage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="jobs/create" element={<CreateJobPage />} />
              <Route path="jobs/applications" element={<MyApplicationsPage />} />
              <Route path="jobs/talent" element={<TalentSearchPage />} />
              <Route path="jobs/:id" element={<JobDetailsPage />} />
              <Route path="jobs/:id/apply" element={<JobApplicationFormPage />} />
              {/* Personal Creator Hub (this app). In Space mode /creator-hub opens the Space hub on Business Suite. */}
              <Route path="creator-hub" element={<PersonalCreatorHubPage />} />
              {/* Old names for the personal Creator Hub (see lib/creatorHub.ts). */}
              <Route path="creator" element={<CreatorHubRedirect />} />
              <Route path="pro-studio" element={<CreatorHubRedirect />} />
              <Route path="professional-dashboard" element={<CreatorHubRedirect />} />
              {/* Space Creator Hub lives on Business Suite (:3004 / business.wevsoft.com). */}
              <Route path="business/creator-hub" element={<CreatorHubAppRedirect />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="ai" element={<Navigate to="/home" replace />} />
              <Route path="ai-wevchat" element={<AiWevChatPage />} />
              <Route path="ai/workflows" element={<Navigate to="/home" replace />} />
              <Route path="ai/post" element={<AiPostCreatorPage />} />
              <Route path="create-post" element={<CreatePostPage />} />
              <Route path="share" element={<SharePage />} />
              <Route path="live" element={<LiveStreamPage />} />
              <Route path="live/:streamId" element={<LiveStreamPage />} />
              <Route path="watch-party" element={<WatchPartyPage />} />
              <Route path="watch-party/:code" element={<WatchPartyPage />} />
              <Route path="sfu" element={<SfuRoomPage />} />
              <Route path="sfu/:roomId" element={<SfuRoomPage />} />
              <Route path="subscriptions" element={<SubscriptionsPage />} />
              <Route path="rewards" element={<RewardsPage />} />
              <Route path="rewards/*" element={<RewardsPage />} />

              {/* Business Suite lives in its own app (business.wevsoft.com / :3004). */}
              <Route path="business" element={<BusinessAppRedirect />} />
              {/* Legacy "Business Dashboard" / Professional Dashboard → personal Creator Hub. */}
              <Route path="business/dashboard" element={<CreatorHubRedirect />} />
              <Route path="business/crm" element={<BusinessAppRedirect />} />
              <Route path="business/inbox" element={<BusinessAppRedirect />} />
              <Route path="business/leads" element={<BusinessAppRedirect />} />
              <Route path="business/support" element={<SupportTicketList />} />
              <Route path="business/knowledge" element={<KnowledgeBasePage />} />
              <Route path="business/ai" element={<BusinessAIAgentConfig />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Route>

            {/* Admin UI runs as a separate app on port 3002 (admin workspace). */}
            <Route path="/admin/*" element={<AdminAppRedirect />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
          <ConsumerOverlays />
        </Router>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

function AdminAppRedirect() {
  useEffect(() => {
    const suffix = window.location.pathname.replace(/^\/admin/, '') || '';
    window.location.assign(`${getAdminAppUrl(`/admin${suffix}`)}${window.location.search}`);
  }, []);
  return (
    <div className="flex justify-center items-center h-screen bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function ConsumerOverlays() {
  const location = useLocation();
  const user = useStore((state) => state.user);
  const path = location.pathname;
  if (path === '/settings') return null;
  return (
    <>
      {user && (
        <Suspense fallback={null}>
          <MiniReelPlayer />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <ProfileOverlayHost />
      </Suspense>
    </>
  );
}

function MarketplaceRouteRedirect() {
  const location = useLocation();
  const targetPath = location.pathname.replace(/^\/marketplace(\/|$)/, '/wevmall$1');
  return <Navigate to={`${targetPath}${location.search}${location.hash}`} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useStore((state) => state.token);
  const location = useLocation();
  // Public profiles, public WevSpaces and the WevSpace directory are readable
  // without an account; the API decides per-Space whether an anonymous viewer
  // gets the content. Two exceptions: the Space dashboard is never anonymous,
  // and creating a Space needs an owner — both go to the login gate rather than
  // loading into a wall of 401s. The directory in particular must stay open,
  // because it is indexed: a crawler that sees results where a visitor sees a
  // login wall is cloaking.
  const isPublicMarketplace =
    /^\/(wevmall|marketplace|shop)(\/|$)/.test(location.pathname) &&
    !/^\/wevmall\/(checkout|orders)(\/|$)/.test(location.pathname) &&
    !/^\/marketplace\/(checkout|orders)(\/|$)/.test(location.pathname);
  const publicPath =
    (
      /^\/(u\/|@|space\/|spaces(\/|$))/.test(location.pathname) &&
      !/\/manage(\/|$)/.test(location.pathname) &&
      !/^\/spaces\/create/.test(location.pathname)
    ) ||
    isPublicMarketplace ||
    // Privacy Policy and Terms must render for signed-out visitors (and for
    // Google's OAuth reviewers, who never authenticate).
    /^\/(privacy|terms)(\/|$)/.test(location.pathname) ||
    // Donation Center landing is browsable signed-out; history/detail stay gated
    // and the wizard sends signed-out visitors to /auth before donating.
    /^\/donate\/?$/.test(location.pathname);
  if (!token && !publicPath) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} />;
  }
  return <>{children}</>;
}

