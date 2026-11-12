import React, { useEffect, useState } from 'react';
import { Flame, Grid3x3, Star, ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMarketplaceLang } from './useMarketplaceLang';

function getScroller(): HTMLElement | null {
  return document.getElementById('main-scroll-area');
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

function scrollToTop() {
  const scroller = getScroller();
  if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function WevMallLiftDock() {
  const { t } = useMarketplaceLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // The app shell scrolls inside #main-scroll-area; fall back to window.
    const scroller = getScroller();
    const readY = () => (scroller ? scroller.scrollTop : window.scrollY);
    const onScroll = () => setVisible(readY() >= 300);
    onScroll();
    const target: HTMLElement | Window = scroller || window;
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  const items = [
    { key: 'flash', icon: Flame, label: t('Flash Deals', 'ফ্ল্যাশ ডিল'), onClick: () => scrollToSection('wevmall-flash-deals') },
    { key: 'categories', icon: Grid3x3, label: t('Categories', 'ক্যাটাগরি'), onClick: () => scrollToSection('wevmall-categories') },
    { key: 'for-you', icon: Star, label: t('For You', 'আপনার জন্য'), onClick: () => scrollToSection('wevmall-for-you') },
    { key: 'top', icon: ArrowUp, label: t('Top', 'উপরে'), onClick: scrollToTop },
  ];

  return (
    <div className="hidden md:flex fixed right-3 top-1/2 -translate-y-1/2 z-40">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-1 bg-card border border-border rounded-2xl shadow-xl p-2"
          >
            {items.map(({ key, icon: Icon, label, onClick }) => (
              <button
                key={key}
                type="button"
                onClick={onClick}
                title={label}
                aria-label={label}
                className="group relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <Icon size={18} />
                <span className="pointer-events-none absolute right-full mr-2 whitespace-nowrap rounded-md bg-foreground text-background px-2 py-1 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  {label}
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
