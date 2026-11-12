/**
 * SettingsPage — Consumer-grade Settings UI
 *
 * Every toggle, select, and button is connected to real backend APIs via useSettings hook.
 * Special UI panels:
 *  - 2FA: Full TOTP setup flow with QR code, backup codes
 *  - Sessions: Real active session list with sign-out
 *  - Blocked users: Real blocked user list with unblock
 *  - Password change: Inline form with validation
 *  - Close friends: Search/add chips persisted via preferences.closeFriendIds
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PERSONAL_CREATOR_HUB_PATH, personalCreatorHubPath } from '../lib/creatorHub';
import { useTranslation } from 'react-i18next';
import { useSettingsTr } from '../i18n/settingsBn';
import { ConfirmIdentitySheet, useIdentityConfirmation, isConfirmCancelled } from '../components/wevspace/manage/ConfirmIdentitySheet';
import { settingsReauthBlobFetch, settingsReauthFetch } from '../lib/settingsReauth';
import { SettingsConfirmDialog, SettingsEmptyState, SettingsErrorState, SettingsSkeleton as SettingsRowsSkeleton } from '../components/settings/SettingsPrimitives';
import { SettingsHubs, SETTINGS_HUB_NAV_ICONS } from '../components/settings/SettingsHubs';
import { SETTINGS_HUB_DEFS } from '../lib/settingsHubs';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import {
  User, Shield, FileText, Image as ImageIcon, MessageCircle,
  Bell, Users, Globe, Store, Briefcase, Sparkles, CreditCard,
  Palette, Eye, HelpCircle, Info, ChevronRight, ChevronLeft,
  Search, X, Check, Lock, Smartphone, Moon, Monitor, Activity, Play,
  Bookmark, Share2, Award, LogOut, Sliders, Volume2, Download,
  ExternalLink, Layers, QrCode, KeyRound, AlertTriangle, RefreshCw,
  Laptop, Trash2, Eye as EyeIcon, EyeOff, Copy, CheckCircle2, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CONSUMER_SETTINGS_CATEGORIES,
  ConsumerSettingCategory,
  ConsumerSettingOption,
  searchSettings,
  getOptionById,
  isSettingVisible
} from './consumerSettingsData';
import { useSettings } from '../hooks/useSettings';
import { dismissWevSplash } from '../lib/wevSplash';
import { DESKTOP_MD_QUERY } from '../lib/desktopHeader';
import { goBackOr, hasInAppHistory } from '../lib/appNavigation';
import { useOverlayBack } from '../hooks/useOverlayBack';
import { PROFILE_THEMES, getProfileThemeByName } from '../lib/profileThemes';
import { FeedAlgorithmSelector } from '../components/feed/FeedAlgorithmSelector';
import AccountSettingsOverview from '../components/settings/AccountSettingsOverview';
import SettingsNavSidebar from '../components/settings/SettingsNavSidebar';
import { SETTINGS_NAV_GROUPS } from '../lib/settingsNavGroups';
import SettingsOptionList from '../components/settings/SettingsOptionList';
import { isInlineAccordionOption } from '../lib/settingsControlKind';
import { WevChatIcon } from '../icons/WevChatIcon';
import { useL10n } from '../utils/l10n';
import { getLanguageByCode } from '../i18n/languages';

const lazyNamed = (load: () => Promise<Record<string, any>>, name: string): React.LazyExoticComponent<React.ComponentType<any>> =>
  React.lazy(async () => {
    const mod = await load();
    const C = mod[name] as React.ComponentType<any> | undefined;
    if (!C) throw new Error(`Settings panel "${name}" is missing`);
    return { default: C };
  });

/** Keeps a failing settings panel (or a stale lazy chunk after a deploy) from crashing the whole app. */
class SettingsPanelBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[Settings] panel crashed:', error); }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (!this.state.error) return this.props.children;
    const chunk = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(this.state.error.message);
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{chunk ? 'A new version is available. Reload to continue.' : 'This section could not be shown.'}</p>
        <button type="button" className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground" onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}>
          {chunk ? 'Reload' : 'Try again'}
        </button>
      </div>
    );
  }
}

const loadCenterPanels = () => import('../components/settings/SettingsCenterPanels');
const Center = {
  RestrictedListPanel: lazyNamed(loadCenterPanels, 'RestrictedListPanel'),
  MutedListPanel: lazyNamed(loadCenterPanels, 'MutedListPanel'),
  HiddenWordsPanel: lazyNamed(loadCenterPanels, 'HiddenWordsPanel'),
  ActivityLogPanel: lazyNamed(loadCenterPanels, 'ActivityLogPanel'),
  TrashPanel: lazyNamed(loadCenterPanels, 'TrashPanel'),
  AppsWebsitesPanel: lazyNamed(loadCenterPanels, 'AppsWebsitesPanel'),
  LegacyContactPanel: lazyNamed(loadCenterPanels, 'LegacyContactPanel'),
  ContactInfoPanel: lazyNamed(loadCenterPanels, 'ContactInfoPanel'),
  RecoveryContactsPanel: lazyNamed(loadCenterPanels, 'RecoveryContactsPanel'),
  SecurityCheckupPanel: lazyNamed(loadCenterPanels, 'SecurityCheckupPanel'),
  LimitPastPostsPanel: lazyNamed(loadCenterPanels, 'LimitPastPostsPanel'),
  AdPreferencesPanel: lazyNamed(loadCenterPanels, 'AdPreferencesPanel'),
};
const loadPostPanels = () => import('../components/settings/PostContentPanels');
const PostPanels = {
  OPEN_DRAFT_KEY: 'wev:openDraft',
  ModerationAssistPanel: lazyNamed(loadPostPanels, 'ModerationAssistPanel'),
  DraftsPanel: lazyNamed(loadPostPanels, 'DraftsPanel'),
  ScheduledPostsPanel: lazyNamed(loadPostPanels, 'ScheduledPostsPanel'),
  ArchivePanel: lazyNamed(loadPostPanels, 'ArchivePanel'),
  PostInsightsPanel: lazyNamed(loadPostPanels, 'PostInsightsPanel'),
  EditHistoryPanel: lazyNamed(loadPostPanels, 'EditHistoryPanel'),
  PostToolsPanel: lazyNamed(loadPostPanels, 'PostToolsPanel'),
  BulkManagePanel: lazyNamed(loadPostPanels, 'BulkManagePanel'),
  ContentCalendarPanel: lazyNamed(loadPostPanels, 'ContentCalendarPanel'),
  ExportPostsPanel: lazyNamed(loadPostPanels, 'ExportPostsPanel'),
};
const loadFeedFilterPanels = () => import('../components/settings/FeedFilterPanels');
const FeedFilterPanels = {
  MutedKeywordsPanel: lazyNamed(loadFeedFilterPanels, 'MutedKeywordsPanel'),
  SnoozedAccountsPanel: lazyNamed(loadFeedFilterPanels, 'SnoozedAccountsPanel'),
  HiddenPostsPanel: lazyNamed(loadFeedFilterPanels, 'HiddenPostsPanel'),
};
const loadAccountCenterPanels = () => import('../components/settings/AccountCenterPanels');
const loadAccountCenterPhase3 = () => import('../components/settings/AccountCenterPhase3');
const SettingsLanguagePage = React.lazy(() => import('../components/settings/SettingsLanguagePage'));
const TrustIdentityPanel = React.lazy(() => import('../components/TrustIdentityPanel'));
const ConnectedAccountsPanel = React.lazy(() => import('../components/settings/ConnectedAccountsPanel'));
const UsernameSettingsPanel = React.lazy(() => import('../components/account/UsernameSettingsPanel'));
const AccountPausePanel = React.lazy(() => import('../components/account/AccountPausePanel'));
const ConsumerAIProviderSettings = React.lazy(() => import('../components/settings/ConsumerAIProviderSettings'));
const QrDeviceLoginPanel = React.lazy(() => import('../components/settings/QrDeviceLoginPanel'));
const SecuritySettingsTab = React.lazy(() => import('../components/settings/SecuritySettingsTab'));
const SpacesVisibilityPanel = React.lazy(() => import('../components/wevspace/SpacesVisibilityPanel'));
const DesktopHeaderNavPanel = React.lazy(() => import('../components/settings/DesktopHeaderNavPanel'));
const MobileBottomNavPanel = React.lazy(() => import('../components/settings/MobileBottomNavPanel'));
const MobileTopHeaderPanel = React.lazy(() => import('../components/settings/MobileTopHeaderPanel'));
const AiTranslationSettingsPanel = React.lazy(() => import('../components/settings/AiTranslationSettingsPanel'));
const WevChatStorageSettingsPanel = React.lazy(() => import('../components/wevchat/WevChatStorageSettingsPanel'));
const NotificationsSettingsPanel = React.lazy(() => import('../components/settings/NotificationsSettingsPanel'));
const AccountActivityPanel = lazyNamed(loadAccountCenterPanels, 'AccountActivityPanel');
const AccountStandingPanel = lazyNamed(loadAccountCenterPanels, 'AccountStandingPanel');
const DataDownloadPanel = lazyNamed(loadAccountCenterPanels, 'DataDownloadPanel');
const PasskeysPanel = lazyNamed(loadAccountCenterPhase3, 'PasskeysPanel');
const ProfilesPanel = lazyNamed(loadAccountCenterPhase3, 'ProfilesPanel');
const AccountDangerZonePanel = React.lazy(() => import('../components/settings/AccountSettingsOverview').then((m) => ({ default: m.AccountDangerZonePanel })));
const SecurityShortcutPanel = React.lazy(() => import('../components/settings/AccountSettingsOverview').then((m) => ({ default: m.SecurityShortcutPanel })));
const OPEN_DRAFT_KEY = 'wev:openDraft';

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  User: <User size={20} />, Shield: <Shield size={20} />, FileText: <FileText size={20} />,
  Image: <ImageIcon size={20} />, MessageCircle: <MessageCircle size={20} />, WevChatIcon: <WevChatIcon size={20} />,
  Bell: <Bell size={20} />, Users: <Users size={20} />, Globe: <Globe size={20} />,
  Store: <Store size={20} />, Briefcase: <Briefcase size={20} />,
  Sparkles: <Sparkles size={20} />, CreditCard: <CreditCard size={20} />,
  Palette: <Palette size={20} />, Eye: <Eye size={20} />, Monitor: <Monitor size={20} />,
  HelpCircle: <HelpCircle size={20} />, Info: <Info size={20} />,
  Volume2: <Volume2 size={20} />, Play: <Play size={20} />
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Loading skeleton for settings rows
function SettingsSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="px-5 py-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-muted/60 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-muted/60 rounded-full w-32" />
            <div className="h-3 bg-muted/40 rounded-full w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 2FA Panel ───────────────────────────────────────────────────────────────
interface TwoFAStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
  backupCodesRemaining: number;
  verifiedAt?: string;
}

function TwoFAPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [step, setStep] = useState<'idle' | 'setup' | 'verify' | 'backup' | 'disable' | 'regen'>('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [regenCode, setRegenCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/2fa/status', { headers: authH });
      if (r.ok) setStatus(await r.json());
    } catch { /* ignore */ }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/2fa/setup', { method: 'POST', headers: authH, body: '{}' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
      setStep('setup');
    } catch (e: any) {
      toast.error(e.message || tr('Setup failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (otpInput.length !== 6) { toast.error(tr('Enter 6-digit code')); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/2fa/enable', {
        method: 'POST', headers: authH,
        body: JSON.stringify({ code: otpInput })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      await loadStatus();
      toast.success(tr('2FA enabled!'));
    } catch (e: any) {
      toast.error(e.message || tr('Verification failed'));
    } finally {
      setLoading(false);
      setOtpInput('');
    }
  };

  const handleDisable = async () => {
    if (!disableCode) { toast.error(tr('Enter your authenticator code')); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/2fa/disable', {
        method: 'POST', headers: authH,
        body: JSON.stringify({ code: disableCode })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setStep('idle');
      await loadStatus();
      toast.success(tr('2FA disabled'));
    } catch (e: any) {
      toast.error(e.message || tr('Failed to disable 2FA'));
    } finally {
      setLoading(false);
      setDisableCode('');
    }
  };

  const handleRegen = async () => {
    if (!regenCode) { toast.error(tr('Enter your authenticator code')); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/2fa/backup-codes/regenerate', {
        method: 'POST', headers: authH,
        body: JSON.stringify({ code: regenCode })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setBackupCodes(data.backupCodes || []);
      setStep('backup');
      await loadStatus();
      toast.success(tr('New backup codes generated'));
    } catch (e: any) {
      toast.error(e.message || tr('Failed to regenerate codes'));
    } finally {
      setLoading(false);
      setRegenCode('');
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    });
  };

  if (!status) {
    return <div className="h-20 bg-muted/30 rounded-2xl animate-pulse" />;
  }

  // ── BACKUP CODES VIEW ──
  if (step === 'backup') {
    return (
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-1">
                {tr('Save your backup codes now')}
              </div>
              <p className="text-xs text-muted-foreground">
                {tr('These 10 one-time recovery codes will NOT be shown again. Store them in a password manager or printed in a safe place.')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm mb-4">
            {backupCodes.map((code, i) => (
              <div key={i} className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-center tracking-widest font-semibold text-foreground">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const text = backupCodes.join('\n');
              navigator.clipboard.writeText(text);
              toast.success(tr('Copied all backup codes'));
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border border-border rounded-xl hover:bg-muted/50 transition-colors"
          >
            <Copy size={16} />
            {tr('Copy all codes')}
          </button>
        </div>

        <button
          onClick={() => setStep('idle')}
          className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-2xl text-sm hover:bg-primary/90 transition-all"
        >
          {tr('I\'ve saved my backup codes')}
        </button>
      </div>
    );
  }

  // ── SETUP VIEW (QR + manual secret) ──
  if (step === 'setup') {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {tr('Scan this QR code with')} <strong>{tr('Google Authenticator, Microsoft Authenticator, Authy')}</strong>{tr(', or any TOTP app.')}
          </p>
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt={tr('2FA QR Code')} className="w-52 h-52 mx-auto rounded-xl border-4 border-white shadow-md" />
          ) : (
            <div className="w-52 h-52 mx-auto bg-muted/30 rounded-xl flex items-center justify-center">
              <Loader2 size={32} className="animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {tr('Can\'t scan? Enter manually')}
          </div>
          <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5">
            <code className="flex-1 text-xs font-mono text-foreground tracking-widest break-all">{secret}</code>
            <button onClick={copySecret} className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
              {copiedSecret ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Account: Wevsoft · Algorithm: SHA1 · Digits: 6 · Period: 30s
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="text-sm font-semibold text-foreground">{tr('Enter verification code')}</div>
          <p className="text-xs text-muted-foreground">{tr('Open your authenticator app and enter the 6-digit code shown.')}</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otpInput}
            onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full text-center text-2xl font-mono tracking-[0.6em] bg-muted/40 border border-border rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
          />
          <button
            onClick={handleEnable}
            disabled={loading || otpInput.length !== 6}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {tr('Verify & Enable 2FA')}
          </button>
          <button onClick={() => setStep('idle')} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── DISABLE VIEW ──
  if (step === 'disable') {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="text-sm font-bold text-rose-500">{tr('Disable Two-Factor Authentication')}</div>
        <p className="text-xs text-muted-foreground">{tr('Enter your current authenticator code or a backup code to confirm.')}</p>
        <input
          type="text"
          value={disableCode}
          onChange={e => setDisableCode(e.target.value)}
          placeholder={tr('6-digit code or XXXX-XXXX backup')}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/40"
        />
        <div className="flex gap-3">
          <button onClick={() => setStep('idle')} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">{tr('Cancel')}</button>
          <button
            onClick={handleDisable}
            disabled={loading || !disableCode}
            className="flex-1 py-2.5 bg-rose-500 text-white font-bold rounded-xl text-sm hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {tr('Disable 2FA')}
          </button>
        </div>
      </div>
    );
  }

  // ── REGENERATE CODES VIEW ──
  if (step === 'regen') {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="text-sm font-bold text-foreground">{tr('Regenerate backup codes')}</div>
        <p className="text-xs text-muted-foreground">{tr('All current backup codes will be invalidated. Enter your TOTP code to continue.')}</p>
        <input
          type="text"
          value={regenCode}
          onChange={e => setRegenCode(e.target.value)}
          placeholder={tr('6-digit authenticator code')}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex gap-3">
          <button onClick={() => setStep('idle')} className="flex-1 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">{tr('Cancel')}</button>
          <button
            onClick={handleRegen}
            disabled={loading || !regenCode}
            className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {tr('Generate New Codes')}
          </button>
        </div>
      </div>
    );
  }

  // ── STATUS VIEW (idle) ──
  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${status.enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30 border-border'}`}>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${status.enabled ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
          {status.enabled ? <CheckCircle2 size={20} /> : <Lock size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-foreground">
            {status.enabled ? tr('Two-Factor Authentication is enabled') : tr('Two-Factor Authentication is disabled')}
          </div>
          {status.enabled && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {status.backupCodesRemaining === 1
                ? tr('{n} backup code remaining').replace('{n}', String(status.backupCodesRemaining))
                : tr('{n} backup codes remaining').replace('{n}', String(status.backupCodesRemaining))}
            </div>
          )}
        </div>
      </div>

      {!status.enabled ? (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
          {tr('Set up Two-Factor Authentication')}
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={() => setStep('regen')}
            className="w-full py-3 border border-border rounded-2xl text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            {tr('Regenerate backup codes')}
          </button>
          <button
            onClick={() => setStep('disable')}
            className="w-full py-3 border border-rose-500/40 rounded-2xl text-sm font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            {tr('Disable 2FA')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Active Sessions Panel ────────────────────────────────────────────────────
/** Session cache of the settings lists (per signed-in token) so panels reopen without a skeleton. */
const settingsListCache = new Map<string, any[]>();
let settingsListCacheOwner = '';
function settingsCache(token: string) {
  if (settingsListCacheOwner !== token) { settingsListCache.clear(); settingsListCacheOwner = token; }
  return settingsListCache;
}

function SessionsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [sessions, setSessions] = useState<any[]>(() => settingsCache(token).get('sessions') ?? []);
  const [loading, setLoading] = useState(() => !settingsCache(token).has('sessions'));
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'one'; id: string; label: string } | { kind: 'others' } | null>(null);
  const [busy, setBusy] = useState(false);
  const identity = useIdentityConfirmation();

  const authH = { Authorization: `Bearer ${token}` };

  const load = useCallback(() => {
    if (!settingsCache(token).has('sessions')) setLoading(true);
    setError(null);
    fetch('/api/settings/sessions', { headers: authH })
      .then(r => { if (!r.ok) throw new Error('load'); return r.json(); })
      .then(d => { const list = Array.isArray(d) ? d : []; settingsCache(token).set('sessions', list); setSessions(list); })
      .catch(() => { setSessions([]); setError(tr('Could not load your sessions.')); })
      .finally(() => setLoading(false));
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- data load on mount (existing behavior)
  useEffect(() => { load(); }, [load]);

  const revokeSession = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/settings/sessions/${id}`, { method: 'DELETE', headers: authH });
      if (!r.ok) throw new Error('fail');
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success(tr('Session signed out'));
    } catch {
      toast.error(tr('Failed to sign out session'));
    } finally { setBusy(false); setConfirm(null); }
  };

  const revokeOthers = async () => {
    setBusy(true);
    try {
      // Server requires step-up confirmation (password or 2FA code); the shared prompt
      // opens on 403 REAUTH_REQUIRED and re-runs this same call with the credential.
      const d = await identity.run((confirm) =>
        settingsReauthFetch('/api/settings/sessions', { method: 'DELETE', headers: { ...authH, 'Content-Type': 'application/json' } }, confirm),
      );
      toast.success(`${tr('Signed out of other sessions')}: ${d?.revoked ?? 0}`);
      load();
    } catch (err) {
      if (!isConfirmCancelled(err)) toast.error(tr('Failed to sign out session'));
    } finally { setBusy(false); setConfirm(null); }
  };

  const others = sessions.filter(s => !s.isCurrent);

  return (
    <div className="space-y-3">
      <ConfirmIdentitySheet prompt={identity.prompt} onClose={identity.close} t={tr} />
      {loading ? <SettingsRowsSkeleton rows={2} /> : error ? <SettingsErrorState message={error} onRetry={load} retryLabel={tr('Try again')} /> : !sessions.length ? (
        <SettingsEmptyState>{tr('No active sessions found')}</SettingsEmptyState>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">
          {sessions.map(s => (
            <div key={s.id} className="px-4 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                <Laptop size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">
                  {s.device || tr('Unknown Device')}
                  {s.isCurrent && <span className="ml-2 text-[10px] bg-primary/15 text-primary font-bold px-1.5 py-0.5 rounded-full">{tr('Current')}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.ipAddress || tr('Unknown IP')}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {s.lastActive ? new Date(s.lastActive).toLocaleString() : tr('Unknown time')}
                </div>
              </div>
              {!s.isCurrent && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: 'one', id: s.id, label: s.device || tr('Unknown Device') })}
                  className="flex-shrink-0 text-xs text-rose-500 font-semibold hover:text-rose-600 transition-colors px-3 py-1.5 border border-rose-500/30 rounded-xl hover:bg-rose-500/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
                >
                  {tr('Sign out')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && !error && others.length > 0 && (
        <button type="button" disabled={busy} onClick={() => setConfirm({ kind: 'others' })}
          className="w-full text-sm font-semibold text-rose-500 border border-rose-500/30 rounded-2xl py-2.5 hover:bg-rose-500/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50">
          {tr('Sign out of all other sessions')} ({others.length})
        </button>
      )}
      <SettingsConfirmDialog
        open={!!confirm}
        busy={busy}
        danger
        title={confirm?.kind === 'others' ? tr('Sign out of all other sessions?') : tr('Sign out this session?')}
        body={confirm?.kind === 'one' ? confirm.label : tr('Every device except this one will need to sign in again.')}
        confirmLabel={tr('Sign out')}
        cancelLabel={tr('Cancel')}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { if (confirm?.kind === 'one') revokeSession(confirm.id); else if (confirm) revokeOthers(); }}
      />
    </div>
  );
}

function TrustedDevicesPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [devices, setDevices] = useState<any[]>(() => settingsCache(token).get('devices') ?? []);
  const [loading, setLoading] = useState(() => !settingsCache(token).has('devices'));
  const [trusting, setTrusting] = useState(false);

  const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadDevices = useCallback(async () => {
    try {
      const r = await fetch('/api/settings/trusted-devices', { headers: authH });
      if (r.ok) {
        const data = await r.json();
        const list = Array.isArray(data) ? data : [];
        settingsCache(token).set('devices', list);
        setDevices(list);
      } else {
        setDevices([]);
      }
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { loadDevices(); }, [loadDevices]);

  const trustThisDevice = async () => {
    setTrusting(true);
    try {
      let deviceId = localStorage.getItem('wev_device_id');
      if (!deviceId) {
        deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('wev_device_id', deviceId);
      }
      const r = await fetch('/api/settings/trusted-devices', {
        method: 'POST',
        headers: authH,
        body: JSON.stringify({ deviceId }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || 'Failed to trust device');
      toast.success(tr('This device is now trusted'));
      await loadDevices();
    } catch (e: any) {
      toast.error(e.message || tr('Failed to trust device'));
    } finally {
      setTrusting(false);
    }
  };

  const removeDevice = async (id: string) => {
    try {
      const r = await fetch(`/api/settings/trusted-devices/${id}`, { method: 'DELETE', headers: authH });
      if (r.ok) {
        setDevices(prev => prev.filter(d => d.id !== id));
        toast.success(tr('Device removed'));
      } else {
        toast.error(tr('Failed to remove device'));
      }
    } catch {
      toast.error(tr('Failed to remove device'));
    }
  };

  if (loading) return <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={trustThisDevice}
        disabled={trusting}
        className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm shadow-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {trusting ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
        {tr('Trust this device')}
      </button>

      {!devices.length ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
          {tr('No trusted devices yet')}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">
          {devices.map(d => (
            <div key={d.id} className="px-4 py-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-muted/60 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                <Smartphone size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{d.deviceId || 'Device'}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{d.userAgent || 'Unknown agent'}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {d.createdAt ? new Date(d.createdAt).toLocaleString() : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeDevice(d.id)}
                className="flex-shrink-0 text-xs text-rose-500 font-semibold hover:text-rose-600 transition-colors px-3 py-1.5 border border-rose-500/30 rounded-xl hover:bg-rose-500/10 flex items-center gap-1"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wallet Panel ─────────────────────────────────────────────────────────────
function WalletPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/settings/wallet', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const data = await r.json();
          if (!cancelled) setWallet(data);
        } else if (!cancelled) {
          setWallet(null);
        }
      } catch {
        if (!cancelled) setWallet(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) return <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />;
  if (!wallet) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
        Unable to load wallet
      </div>
    );
  }

  const txs = Array.isArray(wallet.coinTransactions) ? wallet.coinTransactions : [];
  const sellerPayouts = Array.isArray(wallet.sellerPayouts) ? wallet.sellerPayouts : [];
  const creatorPayouts = Array.isArray(wallet.creatorPayouts) ? wallet.creatorPayouts : [];
  const recentPayouts = [...sellerPayouts, ...creatorPayouts]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{tr('Coin balance')}</div>
          <div className="text-2xl font-extrabold text-foreground mt-1">{Number(wallet.coinBalance || 0).toLocaleString()}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{tr('Seller revenue')}</div>
          <div className="text-2xl font-extrabold text-foreground mt-1">
            ${Number(wallet.seller?.totalRevenue || 0).toLocaleString()}
          </div>
          {wallet.seller?.shopName && (
            <div className="text-xs text-muted-foreground mt-1 truncate">{wallet.seller.shopName}</div>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{tr('Creator earnings')}</div>
          <div className="text-2xl font-extrabold text-foreground mt-1">
            ${Number(wallet.creator?.monthlyEarnings || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => navigate('/rewards')}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
        >
          Open Rewards
        </button>
        <button
          type="button"
          onClick={() => navigate('/seller')}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-border text-foreground hover:bg-muted/50 transition-colors"
        >
          Seller dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate('/wevmall')}
          className="px-4 py-2 text-sm font-semibold rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          WevMall
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/60 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Recent coin transactions
        </div>
        {!txs.length ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">{tr('No coin transactions yet')}</div>
        ) : (
          <div className="divide-y divide-border/40">
            {txs.slice(0, 10).map((t: any) => (
              <div key={t.id || `${t.createdAt}-${t.amount}`} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{t.type || t.reason || 'Transaction'}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                  </div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${Number(t.amount) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {Number(t.amount) >= 0 ? '+' : ''}{Number(t.amount || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/60 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Recent payouts
        </div>
        {!recentPayouts.length ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">{tr('No payouts yet')}</div>
        ) : (
          <div className="divide-y divide-border/40">
            {recentPayouts.map((p: any) => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {p.payoutMethod || 'Payout'} · {p.status || 'PENDING'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                  </div>
                </div>
                <div className="text-sm font-bold text-foreground flex-shrink-0">
                  ${Number(p.amount || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Blocked Users Panel ──────────────────────────────────────────────────────
function BlockedUsersPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [blocked, setBlocked] = useState<any[]>(() => settingsCache(token).get('blocked') ?? []);
  const [loading, setLoading] = useState(() => !settingsCache(token).has('blocked'));

  const authH = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/settings/blocks', { headers: authH })
      .then(r => r.ok ? r.json() : [])
      .then(data => { const list = Array.isArray(data) ? data : []; settingsCache(token).set('blocked', list); setBlocked(list); })
      .catch(() => setBlocked(cur => cur))
      .finally(() => setLoading(false));
  }, [token]);

  const unblock = async (blockedId: string) => {
    try {
      const r = await fetch(`/api/settings/blocks/${blockedId}`, { method: 'DELETE', headers: authH });
      if (r.ok) {
        setBlocked(prev => prev.filter(b => (b.blockedId || b.id) !== blockedId));
        toast.success(tr('User unblocked'));
      }
    } catch {
      toast.error(tr('Failed to unblock user'));
    }
  };

  if (loading) return <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />;
  if (!blocked.length) return (
    <div className="bg-card border border-border rounded-2xl p-6 text-center text-sm text-muted-foreground">
      {tr('You haven\'t blocked anyone')}
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">
      {blocked.map(b => {
        const u = b.blocked || b;
        const uid = b.blockedId || b.id;
        return (
          <div key={uid} className="px-4 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {u.avatar ? (
                <img src={u.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{u.name || u.username || 'Unknown'}</div>
              {u.username && <div className="text-xs text-muted-foreground">@{u.username}</div>}
            </div>
            <button
              onClick={() => unblock(uid)}
              className="flex-shrink-0 text-xs text-primary font-semibold hover:text-primary/80 transition-colors px-3 py-1.5 border border-primary/30 rounded-xl hover:bg-primary/10"
            >
              {tr('Unblock')}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Close Friends Panel ──────────────────────────────────────────────────────
function CloseFriendsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [selected, setSelected] = useState<Array<{ id: string; name?: string | null; avatar?: string | null; username?: string | null }>>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);

  const authH = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/settings/close-friends', { headers: authH });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        if (!cancelled) setSelected(data.users || []);
      } catch {
        if (!cancelled) toast.error('Failed to load close friends');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setResults(Array.isArray(data) ? data : data.users || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, token]);

  const addUser = (u: any) => {
    if (!u?.id) return;
    setSelected((prev) => (prev.some((x) => x.id === u.id) ? prev : [...prev, u]));
    setQuery('');
    setResults([]);
  };

  const removeUser = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/close-friends', {
        method: 'PUT',
        headers: authH,
        body: JSON.stringify({ userIds: selected.map((u) => u.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSelected(data.users || selected);
      toast.success('Close friends saved');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save close friends');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-24 bg-muted/30 rounded-2xl animate-pulse" />;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-foreground mb-1">{tr('Close friends')}</div>
        <p className="text-xs text-muted-foreground">{tr('People here can see stories shared with Close Friends only.')}</p>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[36px]">
        {selected.length === 0 ? (
          <span className="text-xs text-muted-foreground">{tr('No one selected yet')}</span>
        ) : (
          selected.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => removeUser(u.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/15 text-primary text-xs font-semibold border border-primary/25 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              {u.name || u.username || 'User'}
              <X size={12} />
            </button>
          ))
        )}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends to add..."
          className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {searching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {results.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/40 max-h-48 overflow-y-auto">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => addUser(u)}
              disabled={selected.some((s) => s.id === u.id)}
              className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                {u.avatar ? (
                  <img src={u.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{u.name || u.username || 'User'}</div>
                {u.username && <div className="text-[11px] text-muted-foreground">@{u.username}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}
        Save close friends ({selected.length})
      </button>
    </div>
  );
}

// ─── Change Password Panel ────────────────────────────────────────────────────
function ChangePasswordPanel({ token }: { token: string }) {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, newPass: false, confirm: false });
  const [editable, setEditable] = useState({ current: false, newPass: false, confirm: false });
  const tr = useSettingsTr();
  const userTyped = useRef(false);
  // Wipe any late browser autofill that lands without an onChange (only before the user types).
  useEffect(() => {
    const timers = [0, 300, 800].map((ms) => window.setTimeout(() => {
      if (userTyped.current) return;
      setForm({ current: '', newPass: '', confirm: '' });
      (['current', 'newPass', 'confirm'] as const).forEach((f) => {
        const el = document.getElementById(`wev-chpw-${f}`) as HTMLInputElement | null;
        if (el && el.value) el.value = '';
      });
    }, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current) { toast.error('Enter your current password'); return; }
    if (form.newPass.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (form.newPass !== form.confirm) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const r = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Password change failed');
      toast.success('Password updated successfully');
      setForm({ current: '', newPass: '', confirm: '' });
      setEditable({ current: false, newPass: false, confirm: false });
    } catch (e: any) {
      toast.error(e.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const [isSecondary, setIsSecondary] = useState(false);
  useEffect(() => {
    fetch('/api/me/contact', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsSecondary(!!d?.isSecondaryProfile))
      .catch(() => {});
  }, [token]);
  if (isSecondary) {
    return (
      <div data-testid="secondary-no-password" className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        This is a linked profile. It signs in through your main account, so it has no password of its own. Switch to your main profile to change your password.
      </div>
    );
  }

  // Plain render function (not an inline component) so inputs don't remount on each keystroke.
  // Browsers autofill the first password field with the saved login password, so every field
  // opts out (autoComplete="new-password", unique names) and stays read-only until focused.
  const renderInput = (field: 'current' | 'newPass' | 'confirm', label: string, placeholder: string) => (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{label}</label>
      <div className="relative">
        <input
          // Always type=text so Chrome never sees a password field to autofill; masking is done
          // with -webkit-text-security while hidden (and only once there is a value).
          type="text"
          inputMode="text"
          style={!showPass[field] && form[field] ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
          name={`wev-chpw-${field}`}
          id={`wev-chpw-${field}`}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          readOnly={!editable[field]}
          onFocus={() => setEditable(prev => (prev[field] ? prev : { ...prev, [field]: true }))}
          value={form[field]}
          onChange={e => { userTyped.current = true; const v = e.target.value; setForm(prev => ({ ...prev, [field]: v })); }}
          placeholder={placeholder}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 pr-11 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={() => setShowPass(prev => ({ ...prev, [field]: !prev[field] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {showPass[field] ? <EyeOff size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleChange} autoComplete="off" className="bg-card border border-border rounded-2xl p-5 space-y-4">
      {renderInput('current', tr('Current password'), tr('Enter your current password'))}
      {renderInput('newPass', tr('New password'), tr('Min. 8 characters'))}
      {renderInput('confirm', tr('Confirm new password'), tr('Re-enter new password'))}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        Update Password
      </button>
    </form>
  );
}

// ─── Profile Theme Panel ──────────────────────────────────────────────────────
function ProfileThemePanel({
  value, previewName, saving, onSelect
}: {
  value: string;
  previewName: string;
  saving?: boolean;
  onSelect: (themeName: string) => void;
}) {
  const navigate = useNavigate();
  const current = getProfileThemeByName(value);

  return (
    <div className="space-y-5">
      {/* Live preview of the profile header */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className={`h-24 bg-gradient-to-br ${current.cover} relative`}>
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${current.accent}22 0%, transparent 50%, ${current.accent}15 100%)` }}
          />
          {current.particles.slice(0, 3).map((emoji, i) => (
            <span key={i} className="absolute text-base select-none" style={{ left: `${18 + i * 28}%`, top: `${20 + (i % 2) * 34}%` }}>
              {emoji}
            </span>
          ))}
        </div>
        <div className="bg-card px-4 pb-4">
          <div
            className={`w-14 h-14 -mt-7 rounded-full flex items-center justify-center text-lg font-black text-white ${current.avatarRing}`}
            style={{ background: `linear-gradient(135deg, ${current.accent}, ${current.accent}aa)`, border: '3px solid white' }}
          >
            {previewName.charAt(0).toUpperCase()}
          </div>
          <div className={`mt-2.5 text-xl font-extrabold bg-gradient-to-r ${current.textGrad} bg-clip-text text-transparent`}>
            {previewName}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: current.accentLight, color: current.accent, border: `1px solid ${current.accentBorder}` }}
            >
              {current.name}
            </span>
            <span className="text-[11px] text-muted-foreground">{current.desc}</span>
          </div>
        </div>
      </div>

      {/* Swatch grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Choose a theme
          </div>
          {saving && <Loader2 size={14} className="animate-spin text-primary" />}
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile?customize=1')}
          className="mb-3 w-full py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground"
        >
          Open full profile customizer
        </button>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {PROFILE_THEMES.map(t => {
            const isSelected = t.id === current.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelect(t.name)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shadow-inner"
                  style={{ background: `linear-gradient(135deg, ${t.swatchFrom}, ${t.swatchTo})` }}
                >
                  {t.particles[0] || '⚪'}
                </div>
                <span className="text-[11px] font-semibold leading-tight text-center text-foreground truncate max-w-full">
                  {t.name.split(' ').slice(1).join(' ') || t.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
function findCategoryForOption(optionId: string) {
  return CONSUMER_SETTINGS_CATEGORIES.find((c) => c.options.some((o) => o.id === optionId)) ?? null;
}

function resolveSettingsNav(searchParams: URLSearchParams) {
  const sectionParam = searchParams.get('section');
  const categoryId =
    searchParams.get('cat') ||
    (sectionParam === 'language' ? 'language' : null);
  const optionId =
    searchParams.get('opt') ||
    (sectionParam === 'language' ? 'acc_regional_settings' : null);
  const option = optionId
    ? CONSUMER_SETTINGS_CATEGORIES.flatMap((c) => c.options).find((o) => o.id === optionId) ?? null
    : null;
  const category =
    (categoryId ? CONSUMER_SETTINGS_CATEGORIES.find((c) => c.id === categoryId) : null) ??
    (option ? findCategoryForOption(option.id) : null);
  let viewMode: 'categories' | 'category_detail' | 'feature_detail' = 'categories';
  // Choice/channel accordions stay on the category page (Facebook-style). Complex flows still use feature_detail.
  if (option && isInlineAccordionOption(option)) viewMode = 'category_detail';
  else if (option) viewMode = 'feature_detail';
  else if (category) viewMode = 'category_detail';
  return { viewMode, category, option };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { t } = useTranslation();
  const tr = useSettingsTr();
  const { currentLang } = useL10n();
  const currentLangMeta = getLanguageByCode(currentLang) || getLanguageByCode(String(currentLang || '').split(/[-_]/)[0]);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const user = useStore(state => state.user);
  const token = useStore(state => state.token);
  const logout = useStore(state => state.logout);

  useEffect(() => {
    dismissWevSplash();
  }, []);

  const { valuesMap, isLoading, isSaving, saveSetting } = useSettings();

  const { viewMode, category: selectedCategory, option: selectedOption } = useMemo(
    () => resolveSettingsNav(searchParams),
    [searchParams],
  );

  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') || '',
  );
  const [exporting, setExporting] = useState(false);
  const exportIdentity = useIdentityConfirmation();

  // Clear any stale cached settings search query from previous sessions
  useEffect(() => {
    try {
      sessionStorage.removeItem('wev_ui:settings');
      localStorage.removeItem('wev_ui:settings');
    } catch { /* ignore */ }
  }, []);

  // Sync if URL query param 'q' changes or reset when navigating into categories/options
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      if (qParam !== searchQuery) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
        setSearchQuery(qParam);
      }
    } else if (searchParams.has('cat') || searchParams.has('opt')) {
      if (searchQuery) setSearchQuery('');
    }
  }, [searchParams]);

  const [isDesktopMd, setIsDesktopMd] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MD_QUERY).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MD_QUERY);
    const sync = () => setIsDesktopMd(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    document.getElementById('settings-scroll-area')?.scrollTo({ top: 0 });
  }, [searchParams]);

  useOverlayBack(searchQuery.trim().length > 0, () => setSearchQuery(''));

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchSettings(searchQuery, tr).filter(({ option }) => isSettingVisible(option, isDesktopMd));
  }, [searchQuery, isDesktopMd, tr]);

  // History model: drilling *down* (list -> category -> feature) pushes and marks
  // the entry as pushedFromParent, so the in-app Back / breadcrumb can simply pop
  // to the parent. Switching *sideways* (desktop sidebar category, related setting,
  // search hit from inside a detail view) replaces the entry, so tapping around
  // Settings never builds a long Back trail. Re-selecting the current item is a no-op.
  const pushedFromParent = Boolean(
    (location.state as { settingsDrill?: boolean } | null)?.settingsDrill,
  );

  const settingsSearch = (catId?: string, optId?: string) => {
    const params = new URLSearchParams();
    if (catId) params.set('cat', catId);
    if (optId) params.set('opt', optId);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const handleBack = () => {
    if (searchQuery) setSearchQuery('');
    if (pushedFromParent && hasInAppHistory()) {
      navigate(-1);
      return;
    }
    // Deep link / sideways-switched entry: the previous entry is not our parent,
    // so go up by replacing instead of popping to an unrelated page.
    const parentSearch =
      viewMode === 'feature_detail' && selectedCategory ? settingsSearch(selectedCategory.id) : '';
    navigate({ pathname: '/settings', search: parentSearch }, { replace: true });
  };

  const handleOpenCategory = (cat: ConsumerSettingCategory) => {
    if (cat.id === 'language') {
      if (searchQuery) setSearchQuery('');
      const langOpt = cat.options.find((o) => o.id === 'acc_regional_settings') || cat.options[0];
      if (langOpt) {
        const to = { pathname: '/settings', search: settingsSearch(cat.id, langOpt.id) };
        if (viewMode === 'categories') navigate(to, { state: { settingsDrill: true } });
        else if (viewMode === 'category_detail') navigate(to, { replace: true, state: { settingsDrill: pushedFromParent } });
        else navigate(to, { replace: true });
      }
      return;
    }
    if (searchQuery) setSearchQuery('');
    if (selectedCategory?.id === cat.id) {
      if (viewMode === 'feature_detail') handleBack();
      return;
    }
    const to = { pathname: '/settings', search: settingsSearch(cat.id) };
    if (viewMode === 'categories') navigate(to, { state: { settingsDrill: true } });
    // Sibling category: same parent (the list), so the entry below is unchanged
    // and keeps its drill marker. From a feature, the entry below is the old
    // category, not the new one's parent.
    else if (viewMode === 'category_detail') {
      navigate(to, { replace: true, state: { settingsDrill: pushedFromParent } });
    } else navigate(to, { replace: true });
  };

  const openSecuritySection = () => {
    const f = getOptionById('sec_two_step');
    if (f) handleOpenCategory(f.category);
  };

  const openSupport = () => {
    const f = getOptionById('sup_help_center');
    if (f) handleOpenFeature(f.option, f.category);
  };

  const handleOpenFeature = (opt: ConsumerSettingOption, cat?: ConsumerSettingCategory) => {
    if (opt.linkCategoryId) {
      const target = CONSUMER_SETTINGS_CATEGORIES.find(c => c.id === opt.linkCategoryId);
      if (target) { handleOpenCategory(target); return; }
    }
    if (opt.linkOptionId) {
      const found = getOptionById(opt.linkOptionId);
      if (found) { handleOpenFeature(found.option, found.category); return; }
    }
    // Posts & Content shortcuts that leave Settings immediately.
    if (opt.id === 'post_mention_reviews') {
      navigate(personalCreatorHubPath('mentions'));
      return;
    }
    if (opt.id === 'post_browse_posts') {
      navigate('/profile');
      return;
    }
    if (opt.id === 'post_browse_reels') {
      navigate(personalCreatorHubPath('content_library'));
      return;
    }
    if (opt.id === 'post_browse_stories') {
      navigate('/story-studio');
      return;
    }
    if (opt.id === 'fri_find_from_contacts') {
      navigate('/friends');
      return;
    }
    if (searchQuery) setSearchQuery('');
    if (viewMode === 'feature_detail' && selectedOption?.id === opt.id) return;
    const catId = cat?.id ?? selectedCategory?.id ?? findCategoryForOption(opt.id)?.id;
    const to = { pathname: '/settings', search: settingsSearch(catId, opt.id) };
    if (viewMode === 'category_detail' && catId === selectedCategory?.id) {
      navigate(to, { state: { settingsDrill: true } });
    } else if (viewMode === 'categories') {
      navigate(to);
    } else {
      // Related setting in the same category keeps the same parent entry below.
      const sameParent = viewMode === 'feature_detail' && catId === selectedCategory?.id;
      navigate(to, { replace: true, state: { settingsDrill: sameParent && pushedFromParent } });
    }
  };

  /** Mobile top-bar back: leave Settings to Home, or step up within Settings. */
  const handleHeaderBack = () => {
    if (searchQuery.trim()) {
      setSearchQuery('');
      return;
    }
    if (viewMode === 'feature_detail' || viewMode === 'category_detail') {
      handleBack();
      return;
    }
    goBackOr(navigate, '/home');
  };

  const handleValueChange = async (optionId: string, newValue: any) => {
    const ok = await saveSetting(optionId, newValue);
    if (ok) toast.success(tr('Saved'), { id: `save-${optionId}`, duration: 1500 });
  };

  const handleButtonAction = async (opt: ConsumerSettingOption) => {
    if (opt.id === 'sec_data_download') {
      if (!token) {
        toast.error(tr('Please sign in to download your data'));
        return;
      }
      setExporting(true);
      try {
        // Same ZIP export as Settings > Account > Download your data.
        // The server asks for a password / 2FA confirmation first; the shared sheet prompts and retries.
        const { blob } = await exportIdentity.run((confirm) =>
          settingsReauthBlobFetch('/api/account-center/export', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }, confirm),
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wevsoft-data-export-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success(tr('Your data export downloaded'));
      } catch (e: any) {
        if (isConfirmCancelled(e)) return;
        toast.error(e.message || tr('Failed to export data'));
      } finally {
        setExporting(false);
      }
      return;
    }

    if (opt.id === 'pro_creator_studio') {
      navigate(PERSONAL_CREATOR_HUB_PATH);
      return;
    }
    if (opt.id === 'pro_monetization') {
      navigate(personalCreatorHubPath('monetization'));
      return;
    }
    if (opt.id === 'pro_brand_collaborations') {
      navigate(personalCreatorHubPath('brand_collab'));
      return;
    }
    if (opt.id === 'pro_ad_campaigns') {
      navigate('/profile/manage/ads');
      return;
    }

    if (opt.id === 'post_mention_reviews') {
      navigate(personalCreatorHubPath('mentions'));
      return;
    }
    if (opt.id === 'post_browse_posts') {
      navigate('/profile');
      return;
    }
    if (opt.id === 'post_browse_reels') {
      navigate(personalCreatorHubPath('content_library'));
      return;
    }
    if (opt.id === 'post_browse_stories') {
      navigate('/story-studio');
      return;
    }
    if (opt.id === 'fri_find_from_contacts') {
      navigate('/friends');
      return;
    }

    if (opt.id === 'mkt_saved_listings' || opt.id === 'mkt_order_history') {
      navigate('/wevmall');
      return;
    }

    if (
      opt.id === 'sec_login_devices' ||
      opt.id === 'sec_qr_login' ||
      opt.id === 'sec_biometric_login' ||
      opt.id === 'sec_two_step' ||
      opt.id === 'sec_blocked_users' ||
      opt.id === 'sec_wevspaces_visibility' ||
      opt.id === 'acc_password_change' ||
      opt.id === 'acc_username' ||
      opt.id === 'acc_pause_account' ||
      opt.id === 'acc_account_ownership' ||
      opt.id === 'acc_security_shortcut' ||
      opt.id === 'acc_activity_log' ||
      opt.id === 'acc_standing' ||
      opt.id === 'acc_passkeys' ||
      opt.id === 'acc_profiles' ||
      opt.id === 'acc_data_download' ||
      opt.id === 'sup_account_status' ||
      opt.id === 'sec_restricted_list' ||
      opt.id === 'sec_muted_list' ||
      opt.id === 'sec_security_checkup' ||
      opt.id === 'sec_recovery_contacts' ||
      opt.id === 'sec_activity_log' ||
      opt.id === 'sec_trash' ||
      opt.id === 'sec_apps_websites' ||
      opt.id === 'sec_legacy_contact' ||
      opt.id === 'sec_limit_past_posts' ||
      opt.id === 'sec_ad_preferences' ||
      opt.id === 'cmt_hidden_words' ||
      opt.id === 'post_comment_moderation_assist' ||
      opt.id === 'post_drafts_manager' ||
      opt.id === 'post_scheduled_posts' ||
      opt.id === 'post_archive_vault' ||
      opt.id === 'post_trash' ||
      opt.id === 'post_bulk_manage' ||
      opt.id === 'post_templates' ||
      opt.id === 'post_insights_30d' ||
      opt.id === 'post_edit_history' ||
      opt.id === 'post_hashtag_sets' ||
      opt.id === 'post_content_calendar' ||
      opt.id === 'post_export_posts' ||
      opt.id === 'post_limit_past_posts' ||
      opt.id === 'post_mention_reviews' ||
      opt.id === 'post_browse_posts' ||
      opt.id === 'post_browse_reels' ||
      opt.id === 'post_browse_stories' ||
      opt.id === 'fri_find_from_contacts' ||
      opt.id === 'post_close_friends' ||
      opt.id === 'acc_email_addresses' ||
      opt.id === 'acc_phone_numbers' ||
      opt.id === 'ai_translation_providers' ||
      opt.id === 'msg_storage' ||
      opt.id === 'story_close_friends' ||
      opt.id === 'sec_trusted_devices' ||
      opt.id === 'pay_wallet_balance' ||
      opt.id === 'pay_transaction_history' ||
      opt.id === 'pay_payment_methods' ||
      opt.id === 'app_desktop_header_nav' ||
      opt.id === 'app_mobile_bottom_nav' ||
      opt.id === 'app_mobile_top_header_style'
    ) {
      // Special panels render below — no toast needed
      return;
    }

    toast(`${opt.name} is not available yet.`, { id: `na-${opt.id}`, duration: 2500 });
  };

  // ── Feature detail: some IDs get custom panels ──
  const getSpecialPanel = (optId: string) => {
    if (optId === 'acc_regional_settings') {
      return <SettingsLanguagePage />;
    }
    if (optId === 'app_profile_theme') {
      return (
        <ProfileThemePanel
          value={valuesMap['app_profile_theme']}
          previewName={user?.name || user?.username || 'Wevsoft'}
          saving={isSaving['app_profile_theme']}
          onSelect={name => handleValueChange('app_profile_theme', name)}
        />
      );
    }
    if (!token) return null;
    if (optId === 'sec_two_step') return <TwoFAPanel token={token} />;
    if (optId === 'acc_identity_verification') return <TrustIdentityPanel token={token} />;
    if (optId === 'acc_connected_accounts') return <ConnectedAccountsPanel token={token} />;
      if (optId === 'ai_provider_setup') return <ConsumerAIProviderSettings />;
    if (optId === 'sec_login_devices') return <SessionsPanel token={token} />;
    if (optId === 'sec_qr_login') return <QrDeviceLoginPanel token={token} />;
    if (optId === 'sec_biometric_login') return <SecuritySettingsTab />;
    if (optId === 'sec_trusted_devices') return <TrustedDevicesPanel token={token} />;
    if (optId === 'sec_blocked_users') return <BlockedUsersPanel token={token} />;
    if (optId === 'sec_wevspaces_visibility') return <SpacesVisibilityPanel />;
    if (optId === 'app_desktop_header_nav') return <DesktopHeaderNavPanel />;
    if (optId === 'app_mobile_bottom_nav') return <MobileBottomNavPanel />;
    if (optId === 'app_mobile_top_header_style') return <MobileTopHeaderPanel />;
    if (optId === 'acc_password_change') return <ChangePasswordPanel token={token} />;
    if (optId === 'acc_username') return <UsernameSettingsPanel token={token} />;
    if (optId === 'acc_pause_account') return <AccountPausePanel token={token} />;
    if (optId === 'acc_account_ownership') return <AccountDangerZonePanel token={token} />;
    if (optId === 'acc_security_shortcut') return <SecurityShortcutPanel onOpen={openSecuritySection} />;
    if (optId === 'acc_activity_log') return <AccountActivityPanel token={token} />;
    if (optId === 'acc_standing' || optId === 'sup_account_status') return <AccountStandingPanel token={token} onContactSupport={openSupport} />;
    if (optId === 'acc_data_download') return <DataDownloadPanel token={token} t={tr} />;
    if (optId === 'acc_passkeys') return <PasskeysPanel token={token} />;
    if (optId === 'acc_profiles') return <ProfilesPanel token={token} />;
    if (optId === 'sec_restricted_list') return <Center.RestrictedListPanel token={token} />;
    if (optId === 'sec_muted_list') return <Center.MutedListPanel token={token} />;
    if (optId === 'feed_muted_keywords') return <FeedFilterPanels.MutedKeywordsPanel token={token} />;
    if (optId === 'feed_snoozed_accounts') return <FeedFilterPanels.SnoozedAccountsPanel token={token} />;
    if (optId === 'feed_hidden_posts') return <FeedFilterPanels.HiddenPostsPanel token={token} />;
    if (optId === 'sec_security_checkup') return <Center.SecurityCheckupPanel token={token} onOpen={(id) => { const f = getOptionById(id); if (f) handleOpenFeature(f.option, f.category); }} />;
    if (optId === 'sec_recovery_contacts') return <Center.RecoveryContactsPanel token={token} />;
    if (optId === 'sec_activity_log') return <Center.ActivityLogPanel token={token} />;
    if (optId === 'sec_trash' || optId === 'post_trash') return <Center.TrashPanel token={token} />;
    if (optId === 'sec_apps_websites') return <Center.AppsWebsitesPanel token={token} />;
    if (optId === 'sec_legacy_contact') return <Center.LegacyContactPanel token={token} />;
    if (optId === 'sec_limit_past_posts' || optId === 'post_limit_past_posts') return <Center.LimitPastPostsPanel token={token} />;
    if (optId === 'sec_ad_preferences') return <Center.AdPreferencesPanel token={token} />;
    if (optId === 'cmt_hidden_words') return <Center.HiddenWordsPanel token={token} />;
    if (optId === 'post_comment_moderation_assist') return <PostPanels.ModerationAssistPanel token={token} />;
    if (optId === 'post_drafts_manager') return <PostPanels.DraftsPanel token={token} onOpen={(id) => { try { sessionStorage.setItem(PostPanels.OPEN_DRAFT_KEY, id); } catch { /* ignore */ } navigate('/feed'); }} />;
    if (optId === 'post_scheduled_posts') return <PostPanels.ScheduledPostsPanel token={token} />;
    if (optId === 'post_archive_vault') return <PostPanels.ArchivePanel token={token} />;
    if (optId === 'post_insights_30d') return <PostPanels.PostInsightsPanel token={token} />;
    if (optId === 'post_edit_history') return <PostPanels.EditHistoryPanel token={token} />;
    if (optId === 'post_templates') return <PostPanels.PostToolsPanel token={token} kind="templates" />;
    if (optId === 'post_hashtag_sets') return <PostPanels.PostToolsPanel token={token} kind="hashtagSets" />;
    if (optId === 'post_bulk_manage') return <PostPanels.BulkManagePanel token={token} />;
    if (optId === 'post_content_calendar') return <PostPanels.ContentCalendarPanel token={token} />;
    if (optId === 'post_export_posts') return <PostPanels.ExportPostsPanel token={token} />;
    if (optId === 'acc_email_addresses') return <Center.ContactInfoPanel token={token} focus="email" />;
    if (optId === 'acc_phone_numbers') return <Center.ContactInfoPanel token={token} focus="phone" />;
    if (optId === 'ai_translation_providers') return <AiTranslationSettingsPanel token={token} />;
    if (optId === 'msg_storage') return <WevChatStorageSettingsPanel />;
    if (optId === 'story_close_friends') return <CloseFriendsPanel token={token} />;
    if (
      optId === 'pay_wallet_balance' ||
      optId === 'pay_transaction_history' ||
      optId === 'pay_payment_methods'
    ) {
      return <WalletPanel token={token} />;
    }
    return null;
  };

  // ─── RENDER CATEGORY LIST ROW ───────────────────────────────────────────
  const renderCategoryRow = (cat: ConsumerSettingCategory) => (
    <button
      key={cat.id}
      onClick={() => handleOpenCategory(cat)}
      className="w-full text-left px-3 sm:px-4 py-2.5 flex items-center justify-between hover:bg-muted/50 active:bg-muted transition-colors group"
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="w-8 h-8 rounded-xl bg-muted/80 text-foreground flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 group-hover:text-primary transition-colors">
          {ICON_MAP[cat.iconName] || <Sliders size={16} />}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate leading-tight">{tr(cat.name)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate leading-snug">{tr(cat.description)}</div>
        </div>
      </div>
      {cat.id === 'language' ? (
        <span className="text-xs text-muted-foreground font-medium shrink-0 max-w-[40%] truncate">
          {currentLangMeta?.nativeName || currentLang}
        </span>
      ) : (
        <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
      )}
    </button>
  );

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground select-none flex overflow-hidden pt-[env(safe-area-inset-top,0px)]">
      <ConfirmIdentitySheet prompt={exportIdentity.prompt} onClose={exportIdentity.close} t={tr} />
      <div className="hidden md:flex shrink-0 h-full">
        <SettingsNavSidebar
          selectedCategoryId={selectedCategory?.id ?? null}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectCategory={handleOpenCategory}
          iconFor={(iconName) => ICON_MAP[iconName] || <Sliders size={18} />}
          hubGroupLabel={tr('Tools and resources')}
          activeHubId={viewMode === 'categories' ? searchParams.get('hub') : null}
          hubItems={[
            { id: 'privacy_checkup', label: tr('Privacy Checkup') },
            ...(getOptionById('sec_security_checkup') ? [{ id: 'security_checkup', label: tr('Security Checkup') }] : []),
            ...SETTINGS_HUB_DEFS.map((h) => ({ id: h.id, label: tr(h.label) })),
          ].map((h) => { const I = (SETTINGS_HUB_NAV_ICONS as Record<string, React.ComponentType<{ size?: number }>>)[h.id]; return { ...h, icon: I ? <I size={18} /> : <Sliders size={18} /> }; })}
          onSelectHub={(id) => {
            if (searchQuery) setSearchQuery('');
            if (id === 'security_checkup') { const f = getOptionById('sec_security_checkup'); if (f) handleOpenFeature(f.option, f.category); return; }
            navigate({ pathname: '/settings', search: `?hub=${encodeURIComponent(id)}` });
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <div className="md:hidden sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-3 py-2 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleHeaderBack}
            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted transition-colors shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-foreground truncate">
              {viewMode === 'feature_detail' && selectedOption
                ? selectedOption.name
                : viewMode === 'category_detail' && selectedCategory
                  ? selectedCategory.name
                  : 'Settings and privacy'}
            </h1>
          </div>
        </div>

        <div className="hidden md:flex shrink-0 items-center gap-2 border-b border-border bg-card/80 backdrop-blur px-5 py-2.5">
          {viewMode === 'category_detail' && selectedCategory && !searchQuery.trim() && (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </button>
              <span className="text-muted-foreground text-xs">›</span>
            </>
          )}
          {viewMode === 'feature_detail' && selectedCategory && !searchQuery.trim() && (
            <>
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedCategory.name}
              </button>
              <span className="text-muted-foreground text-xs">›</span>
            </>
          )}
          <span className="text-sm font-bold text-foreground truncate">
            {viewMode === 'feature_detail' && selectedOption
              ? selectedOption.name
              : viewMode === 'category_detail' && selectedCategory
                ? selectedCategory.name
                : 'Settings and privacy'}
          </span>
        </div>

        <div id="settings-scroll-area" className="flex-1 min-h-0 w-full px-3 sm:px-5 lg:px-8 pt-3 sm:pt-5 lg:pt-8 pb-6 overflow-y-auto overflow-x-hidden no-scrollbar">

        {/* HEADER — mobile title + search */}
        <div className="mb-3 sm:mb-5">
          {viewMode === 'categories' && !searchQuery.trim() && (
            <div className="mb-3 md:hidden">
              <h1 className="text-lg font-extrabold text-foreground tracking-tight leading-tight">
                Settings and privacy
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Manage your account, security, and social preferences
              </p>
            </div>
          )}

          <div className="relative md:hidden">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              id="settings-search-input"
              name="settingsSearch"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={tr('Search settings')}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={tr('Clear search')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground w-5 h-5 rounded-full flex items-center justify-center bg-muted/50"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* SEARCH RESULTS */}
        {searchQuery.trim().length > 0 && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {tr('Search Results')} ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
                <p className="text-sm">{`${tr('No results')}: "${searchQuery}"`}</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40">
                {searchResults.map(({ option, category }) => (
                  <button key={`${category.id}-${option.id}`} onClick={() => { setSearchQuery(''); handleOpenFeature(option, category); }}
                    className="w-full text-left px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-muted/50 active:bg-muted transition-colors group">
                    <div className="flex items-center gap-4 min-w-0 pr-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        {ICON_MAP[category.iconName] || <Sliders size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{option.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{category.name} • {option.description}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TOOLS AND RESOURCES: checkups + hubs (links to real existing settings only) */}
        {!searchQuery.trim() && viewMode === 'categories' && (
          <div className="mb-3.5">
            <SettingsHubs key={searchParams.get('hub') || 'none'} initialOpen={searchParams.get('hub')} values={valuesMap} tr={tr} onOpenOption={(id) => { const f = getOptionById(id); if (f) handleOpenFeature(f.option, f.category); }} />
          </div>
        )}

        {/* CATEGORIES LIST — mobile only; desktop uses left sidebar */}
        {!searchQuery.trim() && viewMode === 'categories' && (
          <div className="space-y-3.5 animate-in fade-in duration-300 md:hidden">
            {SETTINGS_NAV_GROUPS.map((group) => (
              <section key={group.id} aria-labelledby={`settings-m-group-${group.id}`}>
                <h2 id={`settings-m-group-${group.id}`} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">{group.label}</h2>
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm divide-y divide-border/40">
                  {group.categories.map(renderCategoryRow)}
                </div>
              </section>
            ))}

            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">{tr('Feed Preferences')}</div>
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm p-3">
                <FeedAlgorithmSelector />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">{tr('Account')}</div>
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm divide-y divide-border/40">
                

                <button
                  onClick={() => { logout(); toast.success('Signed out successfully'); }}
                  className="w-full text-left px-3 sm:px-4 py-2.5 flex items-center justify-between hover:bg-rose-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center flex-shrink-0">
                      <LogOut size={15} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-rose-500 leading-tight">{tr('Log out')}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">Sign out of {user?.username || 'your account'}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-rose-400 flex-shrink-0" />
                </button>
              </div>
            </div>

            <div className="pt-2 pb-4 text-center">
              <div className="text-[11px] text-muted-foreground font-medium">Wevsoft Mobile & Web Studio • Version 2.5.0</div>
              <div className="text-[10px] text-muted-foreground/70 mt-0.5">{tr('Transparent privacy controls')}</div>
            </div>
          </div>
        )}

        {!searchQuery.trim() && viewMode === 'categories' && (
          <div className="hidden md:block space-y-8 max-w-3xl">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{tr('Choose a setting')}</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Pick a category from the sidebar, or open the app menu to jump back to Home, Wev Chat, and the rest of Wevsoft.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">{tr('Feed Preferences')}</div>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm p-4">
                <FeedAlgorithmSelector />
              </div>
            </div>
            <div className="pt-2 pb-4 text-center">
              <div className="text-xs text-muted-foreground font-medium">Wevsoft Mobile & Web Studio • Version 2.5.0</div>
              <div className="text-[11px] text-muted-foreground/70 mt-1">{tr('Transparent privacy controls')}</div>
            </div>
          </div>
        )}

        {/* CATEGORY DETAIL */}
        {!searchQuery.trim() && viewMode === 'category_detail' && selectedCategory && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-250">
            <div className="flex items-center gap-4 bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {ICON_MAP[selectedCategory.iconName] || <Sliders size={24} />}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-foreground">{tr(selectedCategory.name)}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{tr(selectedCategory.description)}</p>
              </div>
            </div>

            {isLoading ? <SettingsSkeleton /> : selectedCategory.id === 'account' && token ? (
              <AccountSettingsOverview
                token={token}
                options={selectedCategory.options}
                onOpen={(opt) => handleOpenFeature(opt, selectedCategory)}
                onOpenSecurity={openSecuritySection}
              />
            ) : selectedCategory.id === 'notifications' ? (
              <React.Suspense fallback={<SettingsRowsSkeleton />}><NotificationsSettingsPanel
                valuesMap={valuesMap}
                isSaving={isSaving}
                expandedOptionId={selectedOption?.id ?? null}
                onToggleExpand={(optionId) => {
                  const open = selectedOption?.id === optionId;
                  if (open) {
                    navigate(
                      { pathname: '/settings', search: settingsSearch(selectedCategory.id) },
                      { replace: true, state: { settingsDrill: true } },
                    );
                  } else {
                    const opt = selectedCategory.options.find((o) => o.id === optionId);
                    if (opt) handleOpenFeature(opt, selectedCategory);
                  }
                }}
                onSave={(optionId, value) => handleValueChange(optionId, value)}
              /></React.Suspense>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border/40 pb-[env(safe-area-inset-bottom,0px)]">
                <SettingsOptionList
                  options={selectedCategory.options.filter(opt => isSettingVisible(opt, isDesktopMd))}
                  valuesMap={valuesMap}
                  isSaving={isSaving}
                  expandedOptionId={selectedOption && isInlineAccordionOption(selectedOption) ? selectedOption.id : null}
                  onToggleExpand={(opt) => {
                    const open = selectedOption?.id === opt.id && isInlineAccordionOption(opt);
                    if (open) {
                      navigate(
                        { pathname: '/settings', search: settingsSearch(selectedCategory.id) },
                        { replace: true, state: { settingsDrill: true } },
                      );
                    } else {
                      handleOpenFeature(opt, selectedCategory);
                    }
                  }}
                  onNavigate={(opt) => handleOpenFeature(opt, selectedCategory)}
                  onSave={(optionId, value) => handleValueChange(optionId, value)}
                />
              </div>
            )}
          </div>
        )}

        {/* FEATURE DETAIL */}
        {!searchQuery.trim() && viewMode === 'feature_detail' && selectedOption && selectedOption.id === 'acc_regional_settings' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-250 pb-4">
            <React.Suspense fallback={<SettingsRowsSkeleton />}><SettingsLanguagePage /></React.Suspense>
          </div>
        )}

        {!searchQuery.trim() && viewMode === 'feature_detail' && selectedOption && selectedOption.id !== 'acc_regional_settings' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-250">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-2xl font-extrabold text-foreground">{tr(selectedOption.name)}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{tr(selectedOption.description)}</p>

              {/* Special full-replacement panels (2FA, sessions, etc.) */}
              {(() => {
                const panel = getSpecialPanel(selectedOption.id);
                if (panel) {
                  return <div className="mt-6 pt-6 border-t border-border/60"><SettingsPanelBoundary resetKey={selectedOption.id}><React.Suspense fallback={<SettingsRowsSkeleton />}>{panel}</React.Suspense></SettingsPanelBoundary></div>;
                }
                return null;
              })()}

              {/* Standard controls for non-special options */}
              {!getSpecialPanel(selectedOption.id) && selectedOption.unavailableNote && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <div role="note" className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    <div className="font-semibold text-foreground mb-1">{tr('Not available yet')}</div>
                    {tr(selectedOption.unavailableNote)}
                  </div>
                </div>
              )}
              {!getSpecialPanel(selectedOption.id) && !selectedOption.unavailableNote && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  {selectedOption.type === 'toggle' && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{tr(selectedOption.name)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {selectedOption.id === 'student_mode' && valuesMap['student_mode_locked']
                            ? tr('Locked on by a parent or guardian — you cannot turn this off here.')
                            : valuesMap[selectedOption.id] ? tr('Currently enabled') : tr('Currently disabled')}
                        </div>
                      </div>
                      <label className={`relative inline-flex items-center ${selectedOption.id === 'student_mode' && valuesMap['student_mode_locked'] ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          checked={Boolean(valuesMap[selectedOption.id])}
                          disabled={selectedOption.id === 'student_mode' && Boolean(valuesMap['student_mode_locked'])}
                          onChange={e => handleValueChange(selectedOption.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  )}

                  {selectedOption.type === 'select' && selectedOption.options && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" id="settings-choice-label">{tr('Choose an option')}</div>
                      <div className="space-y-2" role="radiogroup" aria-labelledby="settings-choice-label">
                        {selectedOption.options.map(optValue => {
                          const isSelected = valuesMap[selectedOption.id] === optValue;
                          return (
                            <button
                              key={optValue}
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => handleValueChange(selectedOption.id, optValue)}
                              className={`w-full text-left px-4 py-3.5 rounded-xl border flex items-center justify-between transition-all ${isSelected ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-sm' : 'bg-background/80 border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'}`}
                            >
                              <span className="text-sm">{tr(optValue)}</span>
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedOption.type === 'button' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="text-sm text-muted-foreground">
                        {tr('Status')}: <strong className="text-foreground">{tr(String(valuesMap[selectedOption.id] ?? ''))}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleButtonAction(selectedOption)}
                        className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-sm shadow-sm transition-all"
                      >
                        {tr(selectedOption.actionText || 'Manage setting')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
        </div>
      </div>
    </div>
  );
}
