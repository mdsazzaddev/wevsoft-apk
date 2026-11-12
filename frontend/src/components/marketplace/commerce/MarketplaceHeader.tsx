import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, LayoutDashboard, Package, Sparkles, MapPin, Radio, History, Bell, User, Languages, ChevronDown, LogIn, UserCircle } from 'lucide-react';
import { useStore } from '../../../store';
import { marketFetch } from './utils';
import VoiceSearchButton from './VoiceSearchButton';
import ImageSearchButton from './ImageSearchButton';
import SearchDropdown from './SearchDropdown';
import AiShoppingAssistant from './AiShoppingAssistant';
import { useUnreadNotifications } from '../../../hooks/useUnreadNotifications';
import { Bot } from 'lucide-react';
import { useMarketplaceLang } from './useMarketplaceLang';
import { DepartmentMegaMenu } from './DepartmentMegaMenu';
import { CartHoverPreview } from './CartHoverPreview';
import { useStorefrontConfig } from './useStorefrontConfig';


export function MarketplaceHeader({
  search,
  onSearchChange,
  onSearchSubmit,
  onNlpSearch,
  cartCount = 0,
  wishCount: wishCountProp,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  onNlpSearch?: () => void;
  category?: string;
  onCategory?: (c: string) => void;
  cartCount?: number;
  wishCount?: number;
}) {
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const { lang, toggleLang, t } = useMarketplaceLang();
  const hoverCartEnabled = useStorefrontConfig()?.widgets?.hoverCartEnabled !== false;
  const [wishCount, setWishCount] = useState(wishCountProp ?? 0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const { unread: unreadNotificationsCount } = useUnreadNotifications();
  const lastY = useRef(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  type MenuItem = { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; onClick: () => void; badge?: number };
  const unread = unreadNotificationsCount ?? 0;
  const menuGroups: MenuItem[][] = [
    token
      ? [
          { label: t('My profile', 'আমার প্রোফাইল'), icon: UserCircle, onClick: () => navigate('/profile') },
          { label: t('My orders', 'আমার অর্ডার'), icon: Package, onClick: () => navigate('/wevmall/orders') },
          { label: t('Wishlist', 'উইশলিস্ট'), icon: Heart, onClick: () => navigate('/wevmall/wishlist'), badge: wishCount },
          { label: t('Notifications', 'নোটিফিকেশন'), icon: Bell, onClick: () => navigate('/notifications'), badge: unread },
        ]
      : [
          { label: t('Login / Sign up', 'লগইন / সাইন আপ'), icon: LogIn, onClick: () => navigate('/auth') },
          { label: t('Wishlist', 'উইশলিস্ট'), icon: Heart, onClick: () => navigate('/wevmall/wishlist') },
        ],
    [
      { label: t('Recently viewed', 'সম্প্রতি দেখা'), icon: History, onClick: () => navigate('/wevmall/history') },
      { label: t('Live shopping', 'লাইভ শপিং'), icon: Radio, onClick: () => navigate('/wevmall/live') },
      { label: t('Stores near me (map)', 'কাছের স্টোর (ম্যাপ)'), icon: MapPin, onClick: () => navigate('/wevmall/map') },
      ...(onNlpSearch ? [{ label: t('AI smart search', 'এআই স্মার্ট সার্চ'), icon: Sparkles, onClick: onNlpSearch }] : []),
    ],
    [{ label: t('Seller hub', 'সেলার হাব'), icon: LayoutDashboard, onClick: () => navigate('/seller/dashboard') }],
  ];
  const menuBadge = token ? unread : 0;

  useEffect(() => {
    if (typeof wishCountProp === 'number') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setWishCount(wishCountProp);
      return;
    }
    if (!token) return;
    marketFetch('/api/marketplace/wishlist', token)
      .then((items) => setWishCount(Array.isArray(items) ? items.length : 0))
      .catch(() => {});
  }, [token, wishCountProp]);

  useEffect(() => {
    const scroller = document.getElementById('main-scroll-area');
    const readY = () => (scroller ? scroller.scrollTop : window.scrollY);
    lastY.current = readY();

    const onScroll = () => {
      const y = readY();
      const delta = y - lastY.current;
      if (y < 56) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
      } else if (delta < -6) {
        setHidden(false);
      }
      lastY.current = y;
    };

    const target: HTMLElement | Window = scroller || window;
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`sticky top-0 z-30 mb-2 md:mb-4 transition-transform duration-300 ease-out will-change-transform bg-background/95 backdrop-blur-md border-b border-border pt-[env(safe-area-inset-top,0px)] ${
        hidden ? '-translate-y-[calc(100%+1px)] pointer-events-none' : 'translate-y-0'
      }`}
    >
      <div className="bg-transparent">
        <div className="px-3 sm:px-4 md:px-6 py-2.5 md:py-3.5 flex flex-col gap-2 md:gap-3.5 max-w-7xl mx-auto">
          {/* Top Bar: Brand, Back, and Action icons */}
          <div className="flex items-center justify-between gap-2.5 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <Link to="/wevmall" className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-primary leading-none">WevMall</span>
                  <span className="text-[10px] text-muted-foreground hidden md:block mt-0.5 font-medium tracking-wide">
                    {t('Shop • Save • Grow', 'কিনুন • সাশ্রয় করুন • এগিয়ে যান')}
                  </span>
                </div>
              </Link>
              <div className="hidden md:block">
                <DepartmentMegaMenu />
              </div>
            </div>

            {/* Desktop-only Search Bar (Centered, expansive) */}
            <form
              className="hidden md:flex flex-1 max-w-2xl mx-2 items-stretch relative"
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit();
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
                <input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  placeholder={t('Search in WevMall: products, brands, models…', 'WevMall-এ খুঁজুন: পণ্য, ব্র্যান্ড, মডেল…')}
                  className="w-full h-10 pl-10 pr-20 border border-border rounded-l-xl bg-card text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <VoiceSearchButton onResult={(text) => onSearchChange(text)} />
                  <ImageSearchButton onResults={(products) => {
                    if (products && products.length > 0) {
                      onSearchChange(products[0].title);
                      onSearchSubmit();
                    }
                  }} />
                  <button
                    type="button"
                    onClick={() => setIsAiOpen(true)}
                    className="flex items-center justify-center p-1 rounded-full bg-gradient-to-r from-purple-500/10 to-primary/10 text-primary hover:from-purple-500/20 hover:to-primary/20 border border-primary/20 hover:border-primary/40 transition-all"
                    title={t('Ask WevMall AI', 'উইভমল এআই অ্যাসিস্ট্যান্ট')}
                  >
                    <Bot size={14} />
                  </button>
                </div>
                <SearchDropdown query={search} isVisible={searchFocused} onSelect={(text) => { onSearchChange(text); onSearchSubmit(); setSearchFocused(false); }} />
              </div>
              <button
                type="submit"
                className="h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-r-xl transition-all"
              >
                {t('Search', 'খুঁজুন')}
              </button>
            </form>

            {/* Right Action Icons (Responsive) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Bilingual Language Switcher (EN / বাংলা) — P0 Daraz Parity */}
              <button
                id="topActionSwitchLang"
                type="button"
                onClick={toggleLang}
                className="inline-flex items-center gap-1 px-2.5 h-9 md:h-10 rounded-xl border border-primary/40 bg-primary/5 hover:bg-primary/15 text-xs font-bold text-foreground hover:text-primary transition-colors"
                title={t('Switch to বাংলা (Bengali)', 'Switch to English')}
                aria-label="Toggle Language"
              >
                <Languages size={14} className="text-primary shrink-0" />
                <span className={lang === 'bn' ? 'text-primary font-extrabold' : 'text-muted-foreground'}>বাংলা</span>
                <span className="text-muted-foreground/50">/</span>
                <span className={lang === 'en' ? 'text-primary font-extrabold' : 'text-muted-foreground'}>EN</span>
              </button>

              <CartHoverPreview cartCount={cartCount} disabled={!hoverCartEnabled}>
              <button
                type="button"
                onClick={() => navigate('/wevmall/cart')}
                className="relative inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl border border-border text-foreground hover:text-primary transition-colors"
                title={t('Cart', 'শপিং কার্ট')}
                aria-label="Cart"
              >
                <ShoppingCart size={16} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              </CartHoverPreview>

              {/* Account menu — everything that is not core navbar lives here (2026-10-25 navbar declutter) */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="relative inline-flex items-center justify-center gap-1 h-9 md:h-10 w-9 md:w-auto md:px-2.5 rounded-xl border border-border text-foreground hover:text-primary transition-colors"
                  title={t('Account & more', 'অ্যাকাউন্ট ও আরও')}
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <User size={16} />
                  <span className="hidden md:inline text-xs font-semibold">{token ? t('Account', 'অ্যাকাউন্ট') : t('Login', 'লগইন')}</span>
                  <ChevronDown size={12} className="hidden md:inline text-muted-foreground" />
                  {menuBadge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {menuBadge > 99 ? '99+' : menuBadge}
                    </span>
                  )}
                </button>
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-1.5 z-50"
                  >
                    {menuGroups.map((group, gi) => (
                      <div key={gi} className={gi > 0 ? 'border-t border-border mt-1 pt-1' : ''}>
                        {group.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              item.onClick();
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left hover:bg-muted transition-colors"
                          >
                            <item.icon size={15} className="text-primary shrink-0" />
                            <span className="flex-1 truncate">{item.label}</span>
                            {!!item.badge && item.badge > 0 && (
                              <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile-only Search Bar (Row 2 on iPhone and Android) */}
          <div className="flex md:hidden items-center gap-1.5 w-full">
            <div className="shrink-0">
              <DepartmentMegaMenu />
            </div>
            <form
              className="flex flex-1 items-stretch relative"
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit();
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                  placeholder={t('Search products, brands, models…', 'পণ্য, ব্র্যান্ড বা মডেল খুঁজুন…')}
                  className="w-full h-10 pl-9 pr-16 border border-border rounded-l-xl bg-card text-xs sm:text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <VoiceSearchButton onResult={(text) => onSearchChange(text)} />
                  <ImageSearchButton onResults={(products) => {
                    if (products && products.length > 0) {
                      onSearchChange(products[0].title);
                      onSearchSubmit();
                    }
                  }} />
                  <button
                    type="button"
                    onClick={() => setIsAiOpen(true)}
                    className="flex items-center justify-center p-1 rounded-full bg-gradient-to-r from-purple-500/10 to-primary/10 text-primary border border-primary/20" title={t('Ask WevMall AI', 'উইভমল এআই অ্যাসিস্ট্যান্ট')} aria-label="Ask WevMall AI"
                  >
                    <Bot size={13} />
                  </button>
                </div>
                <SearchDropdown query={search} isVisible={searchFocused} onSelect={(text) => { onSearchChange(text); onSearchSubmit(); setSearchFocused(false); }} />
              </div>
              <button
                type="submit"
                className="h-10 px-3 sm:px-4 bg-primary text-primary-foreground text-xs font-bold rounded-r-xl shrink-0"
              >
                {t('Search', 'খুঁজুন')}
              </button>
            </form>
          </div>
        </div>
      </div>
      <AiShoppingAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
