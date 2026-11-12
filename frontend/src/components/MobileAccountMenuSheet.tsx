import { trLabel } from './settings/languagePickerShared';
import SignedOutAccountsList from './account/SignedOutAccountsList';
import { useEffect, useMemo, useState, lazy, Suspense, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Building2,
  Check,
  Download,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Globe,
  Settings,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import { WevSpaceIcon } from './wevspace/WevSpaceIcon';
import toast from 'react-hot-toast';
import {
  spacePublicPath,
  type SpaceIdentityOption,
} from '@wevsoft/shared/wevspace';
import { useStore } from '../store';
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from '../lib/savedAccounts';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';
import { useOverlayBack } from '../hooks/useOverlayBack';
import { usePwaInstall } from '../hooks/usePwaInstall';
import UserAvatar, { resolveAvatarUrl } from './UserAvatar';
import { WevsoftMenuIcon } from '../icons/WevsoftMenuIcon';
import { isHomePath, requestAppRefresh, requestHomeRefresh } from '../lib/appNavigation';
import { useL10n } from '../utils/l10n';
import { getLanguageByCode } from '../i18n/languages';
import { pauseExclusivePlayback } from '../lib/exclusiveMediaPlayback';
import { acquireVisibleMediaSuspend } from '../lib/visibleMediaPlayback';
import { acquirePostMusicSuspend } from '../lib/postMusicPlayback';
import { stopReelPreview } from '../lib/reelPreviewPlayback';
const LanguageModal = lazy(() =>
  import('./LanguageModal').then((m) => ({ default: m.LanguageModal }))
);

interface MobileAccountMenuSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenMenu?: () => void;
}

function SpaceAvatar({ option, size = 28 }: { option: SpaceIdentityOption; size?: number }) {
  const url = resolveAvatarUrl(option.avatar || null);
  const radius = option.kind === 'personal' ? 'rounded-full' : 'rounded-xl';
  return (
    <span
      className={`inline-grid place-items-center shrink-0 overflow-hidden bg-muted text-muted-foreground ${radius}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : option.kind === 'personal' ? (
        <UserRound size={Math.round(size / 2)} />
      ) : (
        <span className="font-bold" style={{ fontSize: Math.round(size / 2.4) }}>
          {option.name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export default function MobileAccountMenuSheet({
  open,
  onClose,
  onOpenMenu,
}: MobileAccountMenuSheetProps) {
  useOverlayBack(open, onClose);
  const navigate = useNavigate();
  const { currentLang, t } = useL10n();
  const currentLangMeta =
    getLanguageByCode(currentLang) || getLanguageByCode(String(currentLang || '').split(/[-_]/)[0]);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const user = useStore((state) => state.user);
  const setAuth = useStore((state) => state.setAuth);
  const beginAddAccount = useStore((state) => state.beginAddAccount);
  const { options, active, loading, setActive } = useSpaceIdentities();
  const { canInstall, promptInstall } = usePwaInstall();
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [installBusy, setInstallBusy] = useState(false);

  const personalOption = useMemo(
    () => options.find((option) => option.kind === 'personal') ?? null,
    [options],
  );
  const spaceOptions = useMemo(
    () => options.filter((option) => option.kind === 'space'),
    [options],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (open) setAccounts(getSavedAccounts());
  }, [open]);

  // Feed/reels keep autoplaying under the sheet — pause + block reclaim while open.
  useEffect(() => {
    if (!open) return;
    const releaseVisible = acquireVisibleMediaSuspend();
    const releaseMusic = acquirePostMusicSuspend();
    pauseExclusivePlayback();
    stopReelPreview();
    return () => {
      releaseVisible();
      releaseMusic();
    };
  }, [open]);

  const profileTo =
    active?.kind === 'space' && active.handle ? spacePublicPath(active.handle) : '/profile';
  const isSpaceMode = active?.kind === 'space';

  const isIdentityActive = (option: SpaceIdentityOption) =>
    option.kind === (active?.kind || 'personal') && option.id === (active?.id ?? null);

  /**
   * Replace the overlay history entry with the destination. Do not call onClose
   * here — useOverlayBack closes the sheet when the overlay leaves the stack.
   * Calling onClose() in the same tick used to navigate(-1) and undo the route.
   */
  const goAndClose = (to: string) => {
    navigate(to, { replace: true });
  };

  const pickSpace = (option: SpaceIdentityOption) => {
    setActive(option.kind === 'space' ? option.id : null);
    // Soft business login (Facebook Page): stay on Wevsoft `/home` with Space feed —
    // never dump into Manage Overview. Manage is via the Manage chip / nav remap.
    if (option.kind === 'space' && option.handle) {
      toast.success(`Logged in as ${option.name}`);
      goAndClose('/home');
      return;
    }
    toast.success(trLabel(t, 'SwitchedToMainAccount', 'Switched to your main account'));
    if (/\/space\/[^/]+\/manage/.test(location.pathname)) {
      goAndClose('/home');
      return;
    }
    onClose();
  };

  const switchTo = (account: SavedAccount) => {
    if (account.id === user?.id) {
      onClose();
      return;
    }
    setBusyId(account.id);
    setAuth(account.token, {
      id: account.id,
      name: account.name,
      email: account.email || '',
      username: account.username || undefined,
      avatar: account.avatar || undefined,
      role: account.role || undefined,
      theme: account.theme || 'dark',
    });
    toast.success(`Switched to ${account.name}`);
    window.location.assign('/feed');
  };

  const removeAccount = (event: MouseEvent, account: SavedAccount) => {
    event.stopPropagation();
    if (account.id === user?.id) {
      toast.error(trLabel(t, 'CannotRemoveActiveAccount', 'You cannot remove the account you are using. Log out first.'));
      return;
    }
    setAccounts(removeSavedAccount(account.id));
    toast.success(`Removed ${account.name}`);
  };

  const addAnother = () => {
    beginAddAccount();
    window.location.assign('/auth?add_account=1');
  };

  const openMenu = () => {
    onClose();
    onOpenMenu?.();
  };

  if (typeof document === 'undefined') return null;

  const sheet = createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
          data-account-sheet-root
        >
          {/* absolute (not fixed) so it stacks under the panel inside this root */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            aria-hidden
          />

          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            onClick={(event) => event.stopPropagation()}
            className="relative z-10 w-full sm:max-w-sm max-h-[70vh] bg-background/95 backdrop-blur-xl border border-border/80 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-label={trLabel(t, 'Accounts', 'Account menu')}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/70">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-foreground leading-tight truncate">{trLabel(t, 'Accounts', 'Accounts')}</h3>
                <p className="text-[10px] text-muted-foreground truncate leading-tight">
                  {active?.kind === 'space'
                    ? `WevSpace · ${active.name}`
                    : `Main · ${user?.name || 'Personal'}`}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (isHomePath(location.pathname)) {
                      requestHomeRefresh();
                      toast.success(trLabel(t, 'FeedRefreshed', 'Feed refreshed'));
                    } else {
                      toast.success(trLabel(t, 'Refreshing', 'Refreshing…'));
                      requestAppRefresh({ hard: true });
                    }
                  }}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors touch-manipulation"
                  aria-label={trLabel(t, 'Refresh', 'Refresh')}
                  title={trLabel(t, 'Refresh', 'Refresh')}
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  aria-label={trLabel(t, 'Close', 'Close')}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3 overscroll-contain">
              {canInstall && (
                <button
                  type="button"
                  disabled={installBusy}
                  onClick={async () => {
                    setInstallBusy(true);
                    try {
                      const outcome = await promptInstall();
                      if (outcome === 'accepted') {
                        toast.success(trLabel(t, 'WevsoftInstalled', 'Wevsoft installed'));
                        onClose();
                      } else if (outcome === 'unavailable') {
                        toast.error(trLabel(t, 'InstallUnavailable', 'Install unavailable — open via HTTPS (or ngrok) on Chrome'));
                      }
                    } finally {
                      setInstallBusy(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 px-3 text-xs font-bold shadow-sm touch-manipulation"
                >
                  {installBusy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Install Wevsoft app
                </button>
              )}

              <div className="space-y-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-0.5 flex items-center gap-1">
                  <UserRound size={10} />
                  Main account
                </div>
                {loading && !personalOption ? (
                  <div className="py-3 grid place-items-center text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                ) : personalOption ? (
                  <button
                    type="button"
                    onClick={() => pickSpace(personalOption)}
                    className={`w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors ${
                      isIdentityActive(personalOption)
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-muted/40 border border-border/60 hover:bg-muted'
                    }`}
                  >
                    <span className="relative shrink-0">
                      <SpaceAvatar option={personalOption} size={32} />
                      <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-3.5 h-3.5 rounded-full bg-emerald-500 text-white ring-2 ring-background">
                        <UserRound size={8} strokeWidth={3} />
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-xs truncate leading-tight">
                          {personalOption.name}
                        </span>
                        <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                          Main
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate leading-tight">
                        Personal profile
                        {user?.username ? ` · @${user.username}` : ''}
                      </div>
                    </div>
                    {isIdentityActive(personalOption) && (
                      <Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </button>
                ) : null}
              </div>

              <div className="space-y-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-0.5 flex items-center gap-1">
                  <Building2 size={10} />
                  WevSpaces
                </div>
                {loading && !spaceOptions.length ? (
                  <div className="py-3 grid place-items-center text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                  </div>
                ) : spaceOptions.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground px-1 py-1.5">
                    No WevSpaces yet. Create one from Spaces.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border/70 bg-card/50 overflow-hidden divide-y divide-border/50">
                    {spaceOptions.map((option) => {
                      const isCurrent = isIdentityActive(option);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => pickSpace(option)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors ${
                            isCurrent ? 'bg-sky-500/10' : 'hover:bg-muted/80'
                          }`}
                        >
                          <span className="relative shrink-0">
                            <SpaceAvatar option={option} size={28} />
                            <span className="absolute -bottom-0.5 -right-0.5 grid place-items-center w-3.5 h-3.5 rounded-full bg-sky-500 text-white ring-2 ring-background">
                              <Building2 size={8} strokeWidth={3} />
                            </span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-xs truncate leading-tight">
                                {option.name}
                              </span>
                              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-400">
                                Space
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate leading-tight">
                              {option.handle ? `@${option.handle}` : 'WevSpace'}
                            </div>
                          </div>
                          {isCurrent && (
                            <Check size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <SignedOutAccountsList compact onPick={(a) => { beginAddAccount(); window.location.assign('/auth?add_account=1&login_hint=' + encodeURIComponent(a.email || a.username || '')); }} />
              </div>

              <div className="space-y-1">
                <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-0.5 flex items-center gap-1">
                  <RefreshCw size={10} />
                  Switch login
                </div>
                <p className="text-[10px] text-muted-foreground px-0.5 -mt-0.5 mb-0.5">
                  Other users saved on this device
                </p>
                {accounts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground px-1 py-2 text-center">
                    No other logins on this device.
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {accounts.map((account) => {
                      const isCurrent = account.id === user?.id;
                      return (
                        <div
                          key={account.id}
                          className={`w-full flex items-center gap-0.5 rounded-xl px-0.5 ${
                            isCurrent
                              ? 'bg-muted border border-border'
                              : 'border border-transparent hover:bg-muted'
                          }`}
                        >
                          <button
                            type="button"
                            disabled={busyId === account.id}
                            onClick={() => switchTo(account)}
                            className="min-w-0 flex-1 flex items-center gap-2 rounded-lg px-1 py-1.5 text-left"
                          >
                            <UserAvatar user={account} className="w-7 h-7 text-[10px]" />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs truncate leading-tight">
                                {account.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate leading-tight">
                                {account.username
                                  ? `@${account.username}`
                                  : account.email || 'Saved login'}
                              </div>
                            </div>
                            {isCurrent && (
                              <span className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-muted-foreground/15 text-muted-foreground shrink-0">
                                Active
                              </span>
                            )}
                          </button>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={(event) => removeAccount(event, account)}
                              className="p-1.5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              title={trLabel(t, 'RemoveFromThisDevice', 'Remove from this device')}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addAnother}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-1.5 text-[11px] font-semibold hover:bg-muted transition-colors"
                >
                  <Plus size={13} />
                  Add another login
                </button>
              </div>
            </div>

            <div className="shrink-0 px-2 py-1.5 border-t border-border/60">
              <button
                type="button"
                onClick={() => {
                  setLangOpen(true);
                  onClose();
                }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors touch-manipulation"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Globe size={17} className="text-foreground shrink-0" />
                  <span className="text-sm font-semibold text-foreground truncate">
                    {t('Language') || 'Language'}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground font-medium shrink-0 max-w-[45%] truncate">
                  {currentLangMeta?.nativeName || currentLang}
                </span>
              </button>
            </div>

            <div
              data-account-sheet-footer
              className="relative z-20 shrink-0 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-border/70 flex items-center justify-between gap-0.5 bg-background/95"
            >
              <button
                type="button"
                onClick={openMenu}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 px-1 rounded-xl hover:bg-muted transition-colors touch-manipulation"
              >
                <WevsoftMenuIcon size={17} className="text-foreground" />
                <span className="text-[9px] font-semibold text-muted-foreground truncate">{trLabel(t, 'Menu', 'Menu')}</span>
              </button>
              {!isSpaceMode && (
                <button
                  type="button"
                  onClick={() => goAndClose('/friends')}
                  className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 px-1 rounded-xl hover:bg-muted transition-colors touch-manipulation"
                >
                  <UserPlus size={17} className="text-foreground" />
                  <span className="text-[9px] font-semibold text-muted-foreground truncate">{trLabel(t, 'Friends', 'Friends')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => goAndClose('/spaces')}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 px-1 rounded-xl hover:bg-muted transition-colors touch-manipulation"
              >
                <WevSpaceIcon size={17} className="text-foreground" />
                <span className="text-[9px] font-semibold text-muted-foreground truncate">WevSpaces</span>
              </button>
              <button
                type="button"
                onClick={() => goAndClose('/settings')}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 px-1 rounded-xl hover:bg-muted transition-colors touch-manipulation"
              >
                <Settings size={17} className="text-foreground" />
                <span className="text-[9px] font-semibold text-muted-foreground truncate">{trLabel(t, 'Settings', 'Settings')}</span>
              </button>
              <button
                type="button"
                onClick={() => goAndClose(profileTo)}
                className="flex flex-col items-center gap-0.5 flex-1 min-w-0 py-2 px-1 rounded-xl hover:bg-muted transition-colors touch-manipulation"
              >
                <UserRound size={17} className="text-foreground" />
                <span className="text-[9px] font-semibold text-muted-foreground truncate">{trLabel(t, 'Profile', 'Profile')}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );

  // Language modal is a separate portal so it stays after the account sheet closes.
  return (
    <>
      {sheet}
      {typeof document !== 'undefined' &&
        createPortal(
          <Suspense fallback={null}>
            <LanguageModal isOpen={langOpen} onClose={() => setLangOpen(false)} />
          </Suspense>,
          document.body,
        )}
    </>
  );
}
