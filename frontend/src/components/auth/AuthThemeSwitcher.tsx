import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Moon, Sun, MonitorSmartphone, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';

/**
 * Compact top-right controls for the auth screen: icon-only theme menu + settings.
 * Theme values match Settings (`Dark mode` / `Light mode` / `OLED True Black`)
 * so App.tsx's classList logic picks them up without special-casing.
 */

type ThemeChoice = {
  id: 'dark' | 'light' | 'oled';
  value: string;
  label: string;
  hint: string;
  swatch: string;
  Icon: typeof Moon;
};

const CHOICES: ThemeChoice[] = [
  {
    id: 'dark',
    value: 'Dark mode',
    label: 'Dark',
    hint: 'Charcoal cards',
    swatch: 'bg-[#0b0e11] border-white/20',
    Icon: Moon,
  },
  {
    id: 'light',
    value: 'Light mode',
    label: 'Light',
    hint: 'Bright & clear',
    swatch: 'bg-[#f8fafc] border-black/15',
    Icon: Sun,
  },
  {
    id: 'oled',
    value: 'OLED True Black',
    label: 'OLED',
    hint: 'True black',
    swatch: 'bg-black border-white/25',
    Icon: MonitorSmartphone,
  },
];

function resolveChoice(theme: string): ThemeChoice {
  const t = (theme || '').toLowerCase();
  if (t.includes('oled')) return CHOICES[2];
  if (t.includes('light')) return CHOICES[1];
  return CHOICES[0];
}

const iconBtn =
  'grid size-9 place-items-center rounded-full text-foreground/90 transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60';

export default function AuthThemeSwitcher() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = resolveChoice(theme);
  const ActiveIcon = active.Icon;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="absolute right-3 top-3 z-30 flex items-center gap-0.5 rounded-full border border-border/70 bg-card/45 p-1 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:right-5 sm:top-4">
      <button
        type="button"
        aria-label="Settings"
        title="Settings"
        onClick={() => {
          setOpen(false);
          navigate('/settings');
        }}
        className={iconBtn}
      >
        <Settings size={18} aria-hidden="true" />
      </button>

      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Theme: ${active.label}. Change appearance.`}
          title={active.label}
          onClick={() => setOpen((v) => !v)}
          className={iconBtn}
        >
          <span
            className={`grid size-6 place-items-center rounded-full border ${active.swatch}`}
            aria-hidden="true"
          >
            <ActiveIcon size={13} className={active.id === 'light' ? 'text-slate-700' : 'text-white'} />
          </span>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="menu"
              aria-label="Choose theme"
              initial={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.96 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -4, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="absolute right-0 top-full mt-2 w-[220px] overflow-hidden rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl"
            >
              {CHOICES.map((choice) => {
                const selected = choice.id === active.id;
                const Icon = choice.Icon;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    onClick={() => {
                      setTheme(choice.value);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                      selected ? 'bg-primary/12 text-foreground' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-xl border ${choice.swatch}`}
                      aria-hidden="true"
                    >
                      <Icon
                        size={16}
                        className={choice.id === 'light' ? 'text-slate-700' : 'text-white'}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-tight">{choice.label}</span>
                      <span className="block text-xs text-muted-foreground">{choice.hint}</span>
                    </span>
                    {selected && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
