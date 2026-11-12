import { trLabel } from '../settings/languagePickerShared';
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Flag,
  HelpCircle,
  Languages,
  Mail,
  Monitor,
  Moon,
  MoreVertical,
  Shield,
  Sun,
  Trash2,
  UserRoundX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { useL10n } from '../../utils/l10n';
import { getLanguageByCode } from '../../i18n/languages';
import { isDesktopMd } from '../../lib/desktopHeader';
import UserAvatar from '../UserAvatar';
import {
  forgetSignedOutAccount,
  getSavedAccounts,
  getSignedOutAccounts,
  removeSavedAccount,
  type SavedAccount,
  type SignedOutAccount,
} from '../../lib/savedAccounts';

const LanguageModal = lazy(() =>
  import('../LanguageModal').then((m) => ({ default: m.LanguageModal })),
);
const HelpReportModal = lazy(() => import('./HelpReportModal'));

type Panel = 'root' | 'display' | 'help' | 'remove';

type RemovableAccount = {
  id: string;
  name: string;
  email?: string | null;
  username?: string | null;
  avatar?: string | null;
  kind: 'saved' | 'signed_out';
};

const DISPLAY_OPTIONS = [
  { id: 'Light mode', label: 'Light', icon: Sun },
  { id: 'Dark mode', label: 'Dark', icon: Moon },
  { id: 'OLED True Black', label: 'OLED', icon: Contrast },
] as const;

function collectRemovable(): RemovableAccount[] {
  const saved = getSavedAccounts().map((a: SavedAccount) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    username: a.username,
    avatar: a.avatar,
    kind: 'saved' as const,
  }));
  const signedOut = getSignedOutAccounts().map((a: SignedOutAccount) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    username: a.username,
    avatar: a.avatar,
    kind: 'signed_out' as const,
  }));
  const seen = new Set(saved.map((a) => a.id));
  return [...saved, ...signedOut.filter((a) => !seen.has(a.id))];
}

export type AuthOverflowMenuProps = {
  onAccountsChanged?: () => void;
};

export default function AuthOverflowMenu({ onAccountsChanged }: AuthOverflowMenuProps) {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const { currentLang, t } = useL10n();
  const currentLangMeta = getLanguageByCode(currentLang) || getLanguageByCode(String(currentLang || '').split(/[-_]/)[0]);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('root');
  const [langOpen, setLangOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPrefill, setReportPrefill] = useState<{ email?: string | null; name?: string | null }>({});
  const [removable, setRemovable] = useState<RemovableAccount[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setPanel('root');
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPanel('root');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const refreshRemovable = () => setRemovable(collectRemovable());

  const openMenu = () => {
    setPanel('root');
    refreshRemovable();
    setOpen((v) => !v);
  };

  const closeMenu = () => {
    setOpen(false);
    setPanel('root');
  };

  const removeOne = (account: RemovableAccount) => {
    if (account.kind === 'saved') removeSavedAccount(account.id);
    forgetSignedOutAccount(account.id);
    toast.success(`Removed ${account.name} from this device`);
    refreshRemovable();
    onAccountsChanged?.();
  };

  return (
    <div ref={rootRef} className="auth-overflow absolute z-30 top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))]">
      <button
        type="button"
        onClick={openMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={trLabel(t, 'MoreOptions', 'More options')}
        className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <MoreVertical size={20} strokeWidth={2.1} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 mt-1.5 w-[min(18.5rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-xl"
          >
            {panel === 'root' && (
              <div className="py-1.5">
                <MenuRow
                  icon={Monitor}
                  label="Display"
                  hint={DISPLAY_OPTIONS.find((o) => o.id === theme)?.label || theme || 'Light'}
                  onClick={() => setPanel('display')}
                  trailing={<ChevronRight size={16} className="text-muted-foreground" />}
                />
                {!isDesktopMd() && (
                  <MenuRow
                    icon={Languages}
                    label={t('Language') || 'Language'}
                    hint={currentLangMeta?.nativeName || currentLang}
                    onClick={() => {
                      closeMenu();
                      setLangOpen(true);
                    }}
                    trailing={<ChevronRight size={16} className="text-muted-foreground" />}
                  />
                )}
                <MenuRow
                  icon={HelpCircle}
                  label="Help"
                  onClick={() => setPanel('help')}
                  trailing={<ChevronRight size={16} className="text-muted-foreground" />}
                />
                <div className="my-1.5 border-t border-border/70" />
                <MenuRow
                  icon={UserRoundX}
                  label="Remove account from this device"
                  danger
                  onClick={() => {
                    refreshRemovable();
                    setPanel('remove');
                  }}
                  trailing={<ChevronRight size={16} className="text-muted-foreground" />}
                />
              </div>
            )}

            {panel === 'help' && (
              <div className="py-1.5">
                <button
                  type="button"
                  onClick={() => setPanel('root')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <ChevronLeft size={16} /> Help
                </button>
                <MenuRow
                  icon={Flag}
                  label="Report a problem"
                  hint="Login issues, bugs, abuse, feedback"
                  onClick={() => {
                    const first = collectRemovable()[0];
                    setReportPrefill({
                      email: first?.email || null,
                      name: first?.name || null,
                    });
                    setReportOpen(true);
                    closeMenu();
                  }}
                />
                <a
                  href="mailto:support@wevsoft.com"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <Mail size={17} className="text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{trLabel(t, 'EmailSupport', 'Email support')}</span>
                    <span className="block text-[11px] text-muted-foreground">support@wevsoft.com</span>
                  </span>
                </a>
                <Link
                  to="/privacy"
                  onClick={closeMenu}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <Shield size={17} className="text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{trLabel(t, 'PrivacyPolicy', 'Privacy Policy')}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{trLabel(t, 'PrivacyPolicyHelp', 'How we handle your data')}</span>
                  </span>
                </Link>
                <Link
                  to="/terms"
                  onClick={closeMenu}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <HelpCircle size={17} className="text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{trLabel(t, 'TermsOfService', 'Terms of Service')}</span>
                    <span className="block text-[11px] text-muted-foreground">Account rules &amp; policies</span>
                  </span>
                </Link>
              </div>
            )}

            {panel === 'display' && (
              <div className="py-1.5">
                <button
                  type="button"
                  onClick={() => setPanel('root')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <ChevronLeft size={16} /> Display
                </button>
                {DISPLAY_OPTIONS.map(({ id, label, icon: Icon }) => {
                  const active = theme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        setTheme(id);
                        toast.success(`Display: ${label}`);
                        closeMenu();
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                    >
                      <Icon size={17} className="text-muted-foreground" />
                      <span className="flex-1 font-medium">{label}</span>
                      {active ? <Check size={16} className="text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            )}

            {panel === 'remove' && (
              <div className="py-1.5">
                <button
                  type="button"
                  onClick={() => setPanel('root')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-foreground hover:bg-muted"
                >
                  <ChevronLeft size={16} /> Remove account
                </button>
                <p className="px-3 pb-2 text-[11px] leading-snug text-muted-foreground">
                  Removes the account from quick switch on this device. You can still sign in with your password.
                </p>
                {removable.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">{trLabel(t, 'NoSavedAccounts', 'No saved accounts on this device.')}</p>
                ) : (
                  removable.map((account) => (
                    <button
                      key={`${account.kind}-${account.id}`}
                      type="button"
                      onClick={() => removeOne(account)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-red-500/10"
                    >
                      <UserAvatar user={account} className="h-9 w-9 text-xs" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{account.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {account.username ? `@${account.username}` : account.email || 'Account'}
                        </div>
                      </div>
                      <Trash2 size={15} className="shrink-0 text-red-400" />
                    </button>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <LanguageModal isOpen={langOpen} onClose={() => setLangOpen(false)} />
        <HelpReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          defaultEmail={reportPrefill.email}
          defaultName={reportPrefill.name}
        />
      </Suspense>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  hint,
  onClick,
  trailing,
  danger,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted ${
        danger ? 'text-red-500 hover:bg-red-500/10' : 'text-foreground'
      }`}
    >
      <Icon size={17} className={danger ? 'text-red-400' : 'text-muted-foreground'} />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {hint ? <span className="block text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
      {trailing}
    </button>
  );
}
