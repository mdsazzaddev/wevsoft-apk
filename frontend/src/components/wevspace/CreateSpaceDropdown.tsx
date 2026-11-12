import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Briefcase, ChevronDown, Compass, Lock, Plus } from 'lucide-react';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

/** Each option deep-links the creation wizard, which reads ?type= (CreateSpaceWizard). */
const OPTIONS = [
  { to: '/spaces/create?type=public', label: 'Create Public Space', labelBn: 'পাবলিক স্পেস তৈরি করুন', hint: 'Anyone can find and follow', hintBn: 'যে কেউ খুঁজে ফলো করতে পারবে', icon: Compass, tone: 'text-primary' },
  { to: '/spaces/create?type=private', label: 'Create Private Space', labelBn: 'প্রাইভেট স্পেস তৈরি করুন', hint: 'Only you, until you open it up', hintBn: 'খুলে না দেওয়া পর্যন্ত শুধু আপনি', icon: Lock, tone: 'text-muted-foreground' },
  { to: '/spaces/create?type=business', label: 'Create Business Space', labelBn: 'বিজনেস স্পেস তৈরি করুন', hint: 'For brands & organizations', hintBn: 'ব্র্যান্ড ও প্রতিষ্ঠানের জন্য', icon: Briefcase, tone: 'text-muted-foreground' },
] as const;

interface Props {
  className?: string;
}

/** "+ Create Space" button with a keyboard-accessible options menu. */
export default function CreateSpaceDropdown({ className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const reduceMotion = useReducedMotion();
  const { t } = useMarketplaceLang();

  useEffect(() => {
    if (!open) return;
    const close = (ev: Event) => {
      if (!rootRef.current?.contains(ev.target as Node)) setOpen(false);
    };
    const esc = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const focusItem = (index: number) => {
    const count = OPTIONS.length;
    itemRefs.current[((index % count) + count) % count]?.focus();
  };

  const onButtonKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(e.key === 'ArrowDown' ? 0 : OPTIONS.length - 1));
    }
  };

  const onMenuKeyDown = (e: ReactKeyboardEvent) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(current + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(current - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(OPTIONS.length - 1);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onButtonKeyDown}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-card text-foreground shadow-sm text-sm font-extrabold hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Plus size={16} /> <span>{t('Create Space', 'স্পেস তৈরি করুন')}</span>
        <ChevronDown size={14} className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={t('Create a Space', 'একটি স্পেস তৈরি করুন')}
            onKeyDown={onMenuKeyDown}
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
            className="absolute right-0 left-0 sm:left-auto top-full mt-2 sm:w-64 bg-card border border-border shadow-2xl rounded-2xl overflow-hidden z-50 py-1.5 text-foreground origin-top-right"
          >
            {OPTIONS.map((opt, i) => {
              const Icon = opt.icon;
              return (
                <Link
                  key={opt.to}
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  to={opt.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 hover:bg-muted focus:bg-muted focus:outline-none transition-colors flex gap-3 items-start"
                >
                  <div className="mt-0.5">
                    <Icon size={16} className={opt.tone} />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold">{t(opt.label, opt.labelBn)}</div>
                    <div className="text-[11px] text-muted-foreground font-semibold">{t(opt.hint, opt.hintBn)}</div>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
