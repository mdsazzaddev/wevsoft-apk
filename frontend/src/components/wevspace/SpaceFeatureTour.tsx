import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BadgeCheck, Image as ImageIcon, LayoutGrid, Sparkles, UserCircle2, Users, X } from 'lucide-react';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

const STORAGE_KEY = 'wevspace:feature-tour:dismissed';

/** What a Space is made of - mirrors the master design's breakdown bar. */
const STEPS = [
  { title: 'Space Cover & Profile', titleBn: 'স্পেস কভার ও প্রোফাইল', hint: 'Cover, avatar, name and @handle', hintBn: 'কভার, অ্যাভাটার, নাম ও @হ্যান্ডেল', icon: UserCircle2 },
  { title: 'Space Type', titleBn: 'স্পেসের ধরন', hint: 'Creator, business, community and more', hintBn: 'ক্রিয়েটর, ব্যবসা, কমিউনিটি ও আরও', icon: LayoutGrid },
  { title: 'Posts & Media', titleBn: 'পোস্ট ও মিডিয়া', hint: 'Recent photos show on your card', hintBn: 'সাম্প্রতিক ছবি আপনার কার্ডে দেখা যায়', icon: ImageIcon },
  { title: 'Followers & Friends', titleBn: 'ফলোয়ার ও বন্ধু', hint: 'See which friends follow a Space', hintBn: 'কোন বন্ধুরা স্পেস ফলো করেন দেখুন', icon: Users },
  { title: 'Badges', titleBn: 'ব্যাজ', hint: 'Verified Spaces are Featured; hot ones Trend', hintBn: 'ভেরিফায়েড স্পেস ফিচার্ড; জনপ্রিয়গুলো ট্রেন্ডিং', icon: BadgeCheck },
] as const;

export function isSpaceFeatureTourDismissed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Sticky bottom bar introducing Space features. Dismissal is remembered in
 * localStorage. On mobile it floats above MobileBottomNav (52px + safe area).
 */
export default function SpaceFeatureTour({ onDismiss }: { onDismiss?: () => void } = {}) {
  const [dismissed, setDismissed] = useState(isSpaceFeatureTourDismissed);
  const reduceMotion = useReducedMotion();
  const { t, formatNum } = useMarketplaceLang();

  const dismiss = () => {
    setDismissed(true);
    onDismiss?.();
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* private mode: hide for this session only */
    }
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.aside
          aria-label={t('WevSpace features', 'WevSpace ফিচার')}
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          className="fixed left-3 right-[calc(max(0.75rem,env(safe-area-inset-right,0px))+3.25rem)] z-40 bottom-[calc(60px+env(safe-area-inset-bottom,0px))] md:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] md:inset-x-0 md:mx-auto md:w-[min(1100px,calc(100%-2rem))]"
        >
          <div className="flex items-center gap-2 rounded-2xl bg-card/95 backdrop-blur border border-border shadow-xl pl-3 pr-1.5 py-2 text-foreground">
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 text-[12px] font-extrabold text-primary pr-2 border-r border-border">
              <Sparkles size={14} /> {t('Space features', 'স্পেস ফিচার')}
            </span>
            <ol className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    title={t(step.hint, step.hintBn)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-muted text-[11.5px] font-semibold"
                  >
                    <span className="grid place-items-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {formatNum(i + 1)}
                    </span>
                    <Icon size={13} className="text-muted-foreground" />
                    {t(step.title, step.titleBn)}
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('Dismiss Space features', 'স্পেস ফিচার বন্ধ করুন')}
              className="shrink-0 inline-grid place-items-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <X size={15} />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
