import React, { Suspense, lazy, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AppNavLink } from "./navigation/AppNavLink";
import { NavGlyph } from "./navigation/NavGlyph";
import { handleHomeNavClick } from "../lib/appNavigation";
import { handleWevChatNavClick, isWevChatNavPath } from "../lib/wevchatNav";
import { useTranslation } from "react-i18next";
import { trLabel } from "./settings/languagePickerShared";
import { useStore } from "../store";
import { useUiStore } from "../stores/uiStore";
import {
  ChevronDown,
  ChevronUp,
  Settings,
  LogOut,
  ShieldAlert,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import {
  DIRECT_NAVIGATION_ITEMS,
  MORE_NAVIGATION_ITEMS,
  filterNavigationForDonationNav,
  filterNavigationForSpaceMode,
  isSpaceModeExternalNav,
  type NavigationMenuItem,
} from "../lib/navigationMenu";
import { openAdminApp } from "../lib/adminAppUrl";
import SmartSearchBar from "./SmartSearchBar";
import SpaceSwitcher from "./wevspace/SpaceSwitcher";
import { useSpaceIdentities } from "../lib/useSpaceIdentities";
import { spaceModeNavPath } from "@wevsoft/shared/wevspace";
import UserAvatar, { resolveAvatarUrl } from "./UserAvatar";
import { useSystemSettings } from "../hooks/useSystemSettings";

const SwitchAccountModal = lazy(() => import("./SwitchAccountModal").then((m) => ({ default: m.SwitchAccountModal })));

interface MemoizedSidebarProps {
  sidebarLogoUrl: string;
  sidebarLogoError: boolean;
  onLogoError: () => void;
}

const linkClass = (isActive: boolean) =>
  `group w-full px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
    isActive
      ? "bg-white/[0.08] text-foreground font-semibold"
      : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground font-medium"
  }`;

export const MemoizedSidebar: React.FC<MemoizedSidebarProps> = React.memo(({
  sidebarLogoUrl,
  sidebarLogoError,
  onLogoError,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const logout = useStore((state) => state.logout);
  const user = useStore((state) => state.user);
  const token = useStore((state) => state.token);
  const showDesktopHeader = useStore((state) => state.showDesktopHeader);
  const { active, isSpaceMode } = useSpaceIdentities();
  const systemSettings = useSystemSettings();
  const donationNavEnabled = systemSettings?.donationNavEnabled;

  const actingName = isSpaceMode && active ? active.name : user?.name;
  const actingUser = isSpaceMode && active
    ? { name: active.name, avatar: resolveAvatarUrl(active.avatar) }
    : user
      ? { name: user.name, avatar: resolveAvatarUrl(user.avatar) }
      : null;
  const navTo = (to: string) => (isSpaceMode ? spaceModeNavPath(to, active) : to);

  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [shortcuts, setShortcuts] = useState<any[]>([]);

  const brandLogo =
    !sidebarLogoError &&
    sidebarLogoUrl &&
    sidebarLogoUrl !== '/logo.svg' &&
    sidebarLogoUrl !== '/logo.svg' &&
    !sidebarLogoUrl.endsWith('/logo-wevsoft.jpg') &&
    !sidebarLogoUrl.endsWith('/logo-wevsoft.png')
      ? sidebarLogoUrl
      : '/logo.svg';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        if (isSpaceMode) {
          if (!cancelled) setShortcuts([]);
          return;
        }
        const gRes = await fetch("/api/groups?mine=true", { headers: { Authorization: `Bearer ${token}` } });
        if (gRes.ok) {
          const data = await gRes.json();
          const list = Array.isArray(data) ? data : data.groups || [];
          if (!cancelled) setShortcuts(list.slice(0, 4));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isSpaceMode]);

  const wevChatDesktopFloat = useUiStore((s) => s.wevChatDesktopFloat);

  const renderItem = (item: NavigationMenuItem) => {
    const Icon = item.icon;
    const to = navTo(item.to);
    const isHomeItem = item.to === '/home';
    const isWevChatItem = isWevChatNavPath(item.to);

    // WevDesk / Developer Console live outside DashboardLayout — open in a new tab
    if (isSpaceModeExternalNav(item.to, isSpaceMode)) {
      const href = typeof to === 'string' ? to : item.to;
      return (
        <a
          key={item.to}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass(false)}
        >
          <NavGlyph icon={Icon} to={item.to} size={22} className="text-muted-foreground group-hover:text-foreground" />
          <span className="truncate">{trLabel(t, item.labelKey || item.label, item.label)}</span>
        </a>
      );
    }

    return (
      <AppNavLink
        key={item.to}
        to={to}
        onClick={(event) => {
          if (isHomeItem) handleHomeNavClick(event, location.pathname);
          if (isWevChatItem) handleWevChatNavClick(event);
        }}
        className={({ isActive }) => linkClass(isActive || (isWevChatItem && wevChatDesktopFloat))}
      >
        {({ isActive }) => {
          const active = isActive || (isWevChatItem && wevChatDesktopFloat);
          return (
            <>
              <NavGlyph icon={Icon} to={item.to} size={22} className={active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
              <span className="truncate">{trLabel(t, item.labelKey || item.label, item.label)}</span>
            </>
          );
        }}
      </AppNavLink>
    );
  };


  return (
    <nav className="w-[260px] h-full bg-card border-r border-border hidden device-md:flex flex-col shrink-0">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pt-3 pb-4 space-y-1">
        {/* Brand scrolls with the menu when the desktop header bar is off. */}
        {!showDesktopHeader && (
          <Link
            to="/feed"
            className="flex items-center gap-2.5 px-2 py-1.5 mb-1 rounded-lg hover:bg-white/[0.05] transition-colors"
          >
            <img
              src={brandLogo}
              alt="Wevsoft"
              className="h-7 w-auto object-contain bg-transparent border-0 shadow-none"
              onError={onLogoError}
            />
            <span className="font-black text-lg tracking-tight text-foreground">Wevsoft</span>
          </Link>
        )}

        <div className="relative z-20 pb-2">
          <SmartSearchBar
            placeholder={trLabel(t, 'SearchAnything', 'Search anything')}
            className=""
            compact
          />
        </div>
        {/* Soft-login switcher — same chip look as the old profile link; opens SpaceSwitcher sheet. */}
        <SpaceSwitcher
          className="mb-2"
          renderTrigger={({ open, current }) => (
            <button
              type="button"
              onClick={open}
              aria-label={trLabel(t, 'SwitchAccount', 'Switch Account')}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left"
            >
              <UserAvatar
                user={
                  current
                    ? { name: current.name, avatar: resolveAvatarUrl(current.avatar) }
                    : actingUser
                }
                decorative
                className="w-10 h-10 text-sm border border-border"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-foreground">
                  {current?.name || actingName || t("Profile")}
                </p>
                <p className="text-xs text-primary font-medium">
                  {current?.kind === "space" || isSpaceMode
                    ? t("Business account", "Business account")
                    : t("Personal account", "Personal account")}
                </p>
              </div>
              <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
            </button>
          )}
        />

        {isSpaceMode && active && (
          <div className="mb-2 px-2.5 py-2 rounded-xl border border-primary/25 bg-primary/5 text-[11px] font-semibold text-muted-foreground">
            Logged in as <span className="text-foreground font-extrabold">{active.name}</span>
            {active.handle ? <span className="text-muted-foreground"> · @{active.handle}</span> : null}
          </div>
        )}

        <div className="space-y-0.5">
          {filterNavigationForDonationNav(
            filterNavigationForSpaceMode(DIRECT_NAVIGATION_ITEMS, isSpaceMode, location.pathname),
            donationNavEnabled,
          ).map(renderItem)}
        </div>

        {showMore && (
          <div className="mt-1 space-y-0.5">
            {filterNavigationForSpaceMode(MORE_NAVIGATION_ITEMS, isSpaceMode).map(renderItem)}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowMore((value) => !value)}
          className={linkClass(false)}
          aria-expanded={showMore}
        >
          {showMore ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          <span>{showMore ? trLabel(t, 'SeeLess', 'See Less') : trLabel(t, 'SeeMore', 'See More')}</span>
        </button>

        {!isSpaceMode && shortcuts.length > 0 && (
          <div className="pt-4 mt-2 border-t border-border">
            <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {trLabel(t, 'YourShortcuts', 'Your Shortcuts')}
            </p>
            {shortcuts.map((g) => (
              <Link
                key={g.id}
                to="/groups"
                className={linkClass(false)}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0">
                  {g.coverPhoto || g.photo ? (
                    <img src={g.coverPhoto || g.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary">
                      {(g.name || "G").charAt(0)}
                    </div>
                  )}
                </div>
                <span className="truncate text-sm">{g.name}</span>
              </Link>
            ))}
          </div>
        )}

        <div className="pt-3 mt-2 border-t border-border space-y-1 pb-2">
          {(user?.role === "admin" || user?.role === "superadmin") && (
            <button
              type="button"
              onClick={() => openAdminApp()}
              className={linkClass(false)}
            >
              <ShieldAlert size={20} className="text-primary" />
              <span>{t("Admin Panel")}</span>
            </button>
          )}

          <AppNavLink to="/settings" className={({ isActive }) => linkClass(isActive)}>
            <NavGlyph icon={Settings} to="/settings" size={22} />
            <span>{t("Settings")}</span>
          </AppNavLink>

          <AppNavLink to="/support" className={({ isActive }) => linkClass(isActive)}>
            <NavGlyph icon={HelpCircle} to="/support" iconKey="help" size={22} />
            <span>{trLabel(t, 'HelpAndSupport', 'Help & Support')}</span>
          </AppNavLink>

          <button
            type="button"
            onClick={() => setIsSwitchAccountOpen(true)}
            className={linkClass(false)}
          >
            <NavGlyph icon={RefreshCw} iconKey="switch" size={22} />
            <span className="truncate">{trLabel(t, 'SwitchAccount', 'Switch Account')}</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className={`${linkClass(false)} hover:!bg-red-500/10 hover:!text-red-400`}
          >
            <NavGlyph icon={LogOut} iconKey="logout" size={22} />
            <span>{t("Logout")}</span>
          </button>

          <p className="px-3 pt-3 text-[10px] text-muted-foreground/70">
            © {new Date().getFullYear()} Wevsoft · All rights reserved.
          </p>
        </div>
      </div>
      {isSwitchAccountOpen && (
        <Suspense fallback={null}>
          <SwitchAccountModal isOpen={isSwitchAccountOpen} onClose={() => setIsSwitchAccountOpen(false)} />
        </Suspense>
      )}
    </nav>
  );
});

MemoizedSidebar.displayName = "MemoizedSidebar";
