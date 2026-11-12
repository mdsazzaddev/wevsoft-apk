import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Archive,
  BarChart3,
  Clapperboard,
  Copyright,
  Eye,
  FileWarning,
  Handshake,
  AtSign,
  BadgeCheck,
  LayoutGrid,
  Megaphone,
  Pencil,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import { PERSONAL_CREATOR_HUB_PATH, personalCreatorHubPath } from '../../lib/creatorHub';
import {
  groupProfileManagerRows,
  settingsOptPath,
  visibleProfileManagerRows,
  viewAsQueryPath,
  type ProfileManagerRow,
  type ProfileManagerRowId,
  type ViewAsRole,
} from '../../lib/profileManager.logic';
import { useL10n } from '../../utils/l10n';

/** Bump as phases ship. Phase 0 = 0; all current plan phases = 8. */
export const PROFILE_MANAGER_SHIPPED_PHASE = 8;

const ROW_ICONS: Partial<Record<ProfileManagerRowId, LucideIcon>> = {
  edit_profile: Pencil,
  view_as: Eye,
  professional_mode: LayoutGrid,
  creator_hub: Clapperboard,
  insights: BarChart3,
  mentions: AtSign,
  boost: Zap,
  invite: Handshake,
  copyright: Copyright,
  advertising: Megaphone,
  verification: BadgeCheck,
  action_buttons: LayoutGrid,
  highlights: Star,
  archive: Archive,
  trash: Trash2,
  activity: FileWarning,
  standing: ShieldCheck,
  privacy: Shield,
  profile_search: Search,
  share: Share2,
  avatar_frame: Sparkles,
  settings: Settings,
};

export type ProfileManagerHandlers = {
  onEditProfile?: () => void;
  onShare?: () => void;
  onOpenFrame?: () => void;
  onProfileTab?: (tab: string) => void;
  onProfileSearch?: () => void;
  onViewAsPick?: (role: ViewAsRole) => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  handlers: ProfileManagerHandlers;
  /** Override shipped phase (tests / progressive unlock). */
  maxPhase?: number;
};

export default function ProfileManagerSheet({
  open,
  onClose,
  handlers,
  maxPhase = PROFILE_MANAGER_SHIPPED_PHASE,
}: Props) {
  useOverlayBack(open, onClose);
  const navigate = useNavigate();
  const { t } = useL10n();
  const [viewAsPicker, setViewAsPicker] = useState(false);
  /** PC: corner popover; phone: bottom sheet. */
  const [desktopCorner, setDesktopCorner] = useState(false);
  if (!open && viewAsPicker) setViewAsPicker(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setDesktopCorner(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const groups = useMemo(() => {
    const rows = visibleProfileManagerRows({
      maxPhase,
      hasFrame: !!handlers.onOpenFrame,
    });
    return groupProfileManagerRows(rows);
  }, [maxPhase, handlers.onOpenFrame]);

  const labelFor = (row: ProfileManagerRow) => {
    const translated = t(row.labelKey);
    return translated && translated !== row.labelKey ? translated : row.label;
  };

  const sectionLabel = (labelKey: string, fallback: string) => {
    const translated = t(labelKey);
    return translated && translated !== labelKey ? translated : fallback;
  };

  /**
   * Leave the manager by *replacing* the overlay history entry.
   * Calling onClose() first would navigate(-1) and undo the destination (View As bug).
   */
  const goReplace = (to: string) => {
    navigate(to, { replace: true });
  };

  const pickViewAs = (role: ViewAsRole) => {
    setViewAsPicker(false);
    if (handlers.onViewAsPick) handlers.onViewAsPick(role);
    else goReplace(viewAsQueryPath(role));
  };

  const runRow = (row: ProfileManagerRow) => {
    if (row.kind === 'viewAs' || row.id === 'view_as') {
      setViewAsPicker(true);
      return;
    }
    switch (row.kind) {
      case 'callback':
        // Stay on /profile — pop overlay history, then run host callback.
        onClose();
        if (row.id === 'edit_profile') handlers.onEditProfile?.();
        else if (row.id === 'share') handlers.onShare?.();
        else if (row.id === 'avatar_frame') handlers.onOpenFrame?.();
        else if (row.id === 'profile_search') handlers.onProfileSearch?.();
        break;
      case 'navigate':
        if (row.target) goReplace(row.target);
        break;
      case 'settingsOpt':
        if (row.target) goReplace(settingsOptPath(row.target));
        break;
      case 'creatorTab':
        goReplace(
          row.target && row.target !== 'overview'
            ? personalCreatorHubPath(row.target)
            : PERSONAL_CREATOR_HUB_PATH,
        );
        break;
      case 'profileTab':
        onClose();
        if (row.target) handlers.onProfileTab?.(row.target);
        break;
      default:
        break;
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            key="pm-backdrop"
            aria-label="Close"
            className={`fixed inset-0 z-[90] ${desktopCorner ? 'bg-black/25' : 'bg-black/45'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="pm-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={sectionLabel('profile.manager.title', 'Profile Manager')}
            initial={
              desktopCorner
                ? { opacity: 0, scale: 0.94, y: -6 }
                : { y: '100%' }
            }
            animate={desktopCorner ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={
              desktopCorner
                ? { opacity: 0, scale: 0.96, y: -4 }
                : { y: '100%' }
            }
            transition={
              desktopCorner
                ? { type: 'spring', damping: 26, stiffness: 380 }
                : { type: 'spring', damping: 30, stiffness: 320 }
            }
            className={
              desktopCorner
                ? 'fixed top-14 right-3 z-[91] flex w-[min(20rem,calc(100vw-1.5rem))] max-h-[min(68dvh,28rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl origin-top-right'
                : 'fixed inset-x-0 bottom-0 z-[91] flex max-h-[85dvh] flex-col rounded-t-2xl border border-border bg-card shadow-2xl'
            }
          >
            <div
              className={`flex shrink-0 items-center justify-between border-b border-border ${
                desktopCorner ? 'px-3 py-2.5' : 'px-4 py-3'
              }`}
            >
              <div className="min-w-0">
                <h2
                  className={`font-bold text-foreground ${
                    desktopCorner ? 'text-[14px]' : 'text-[16px]'
                  }`}
                >
                  {sectionLabel('profile.manager.title', 'Profile Manager')}
                </h2>
                {!desktopCorner && (
                  <p className="text-[12px] text-muted-foreground">
                    {sectionLabel(
                      'profile.manager.subtitle',
                      'Manage your profile and professional tools',
                    )}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-muted/80 p-1.5 hover:bg-muted shrink-0"
                aria-label="Close"
              >
                <X size={desktopCorner ? 16 : 18} />
              </button>
            </div>
            <div
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${
                desktopCorner
                  ? 'px-1.5 py-1.5'
                  : 'px-2 py-2 pb-[max(1rem,env(safe-area-inset-bottom))]'
              }`}
            >
              {viewAsPicker ? (
                <div className="px-2 py-3 space-y-2">
                  <button
                    type="button"
                    className="text-[13px] font-medium text-primary px-2"
                    onClick={() => setViewAsPicker(false)}
                  >
                    ← Back
                  </button>
                  <p className="px-2 text-[13px] text-muted-foreground">
                    {sectionLabel(
                      'profile.manager.viewAsDesc',
                      'Preview how others see your profile',
                    )}
                  </p>
                  {(
                    [
                      ['public', 'Public visitor'],
                      ['follower', 'Follower'],
                      ['friend', 'Friend'],
                    ] as const
                  ).map(([role, label]) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => pickViewAs(role)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left hover:bg-muted/70"
                    >
                      <Eye size={18} className="text-muted-foreground" />
                      <span className="text-[14px] font-semibold">{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                groups.map(({ section, rows }) => (
                  <section key={section.id} className={desktopCorner ? 'mb-1.5' : 'mb-3'}>
                    <h3
                      className={`font-semibold uppercase tracking-wide text-muted-foreground ${
                        desktopCorner
                          ? 'px-2 pb-0.5 pt-1.5 text-[10px]'
                          : 'px-3 pb-1 pt-2 text-[11px]'
                      }`}
                    >
                      {sectionLabel(section.labelKey, section.label)}
                    </h3>
                    <ul className="rounded-xl border border-border bg-background/60 overflow-hidden">
                      {rows.map((row) => {
                        const Icon = ROW_ICONS[row.id] || Settings;
                        return (
                          <li key={row.id} className="border-b border-border last:border-b-0">
                            <button
                              type="button"
                              onClick={() => runRow(row)}
                              className={`flex w-full items-center text-left hover:bg-muted/70 active:bg-muted ${
                                desktopCorner ? 'gap-2.5 px-2.5 py-2' : 'gap-3 px-3 py-3'
                              }`}
                            >
                              <span
                                className={`flex shrink-0 items-center justify-center rounded-lg bg-muted text-foreground ${
                                  desktopCorner ? 'h-7 w-7' : 'h-9 w-9'
                                }`}
                              >
                                <Icon size={desktopCorner ? 15 : 18} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block font-semibold text-foreground ${
                                    desktopCorner ? 'text-[13px]' : 'text-[14px]'
                                  }`}
                                >
                                  {labelFor(row)}
                                </span>
                                {row.description && !desktopCorner && (
                                  <span className="block text-[12px] text-muted-foreground line-clamp-2">
                                    {row.descriptionKey
                                      ? (() => {
                                          const d = t(row.descriptionKey);
                                          return d && d !== row.descriptionKey
                                            ? d
                                            : row.description;
                                        })()
                                      : row.description}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
