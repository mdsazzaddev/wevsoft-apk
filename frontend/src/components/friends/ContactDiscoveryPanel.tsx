import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookUser,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Play,
  Trash2,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserAvatar, { resolveAvatarUrl } from '../UserAvatar';
import { withoutStaff } from '../../lib/hideStaff';
import { useEnBn } from '../../lib/useEnBn';
import { profilePathFor } from '../../lib/profileLinks';
import { Link } from 'react-router-dom';
import {
  installNativeContactSyncResumeHook,
  isContactPickerSupported,
  isNativeAndroid,
  markNativeSyncDone,
  pickWebContactPhones,
  readNativeContactPhones,
  setLocalSyncEnabled,
} from '../../lib/contactDiscoveryNative';

const CONSENT_VERSION = 1;
const CONSENT_DECLINED_KEY = 'wev_contact_discovery_declined';
const NATIVE_ANDROID = isNativeAndroid();
const CONTACT_PICKER_SUPPORTED = isContactPickerSupported();

type Settings = {
  syncEnabled: boolean;
  consentVersion: number;
  currentConsentVersion: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
};

type MatchChip = {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  friendStatus?: string;
};

export type ContactDiscoveryMatch = MatchChip;

type Props = {
  token: string | null | undefined;
  viewerRole?: unknown;
  onFriendRequest: (userId: string) => Promise<boolean>;
  /** Lift matches into Friends Discover feed. */
  onMatchesChange?: (matches: ContactDiscoveryMatch[]) => void;
  /** When true, match rows are omitted here (shown in the main feed instead). */
  hideMatchList?: boolean;
};

function formatLastSynced(iso: string | null, t: (en: string, bn: string) => string) {
  if (!iso) return t('Never', '\u0995\u09C1\u09A8\u09CB\u09A6\u09BF\u09A8 \u09A8\u09BE');
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function parsePastedPhones(text: string): string[] {
  return text
    .split(/[\s,;|\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);
}

export default function ContactDiscoveryPanel({
  token,
  viewerRole,
  onFriendRequest,
  onMatchesChange,
  hideMatchList = false,
}: Props) {
  const { t } = useEnBn();
  const [available, setAvailable] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [matches, setMatches] = useState<MatchChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showConsent, setShowConsent] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const declinedRef = useRef(false);

  useEffect(() => {
    try {
      declinedRef.current = localStorage.getItem(CONSENT_DECLINED_KEY) === '1';
    } catch {
      declinedRef.current = false;
    }
  }, []);

  useEffect(() => {
    onMatchesChange?.(matches);
  }, [matches, onMatchesChange]);

  const authHeaders = token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : null;

  const load = useCallback(async () => {
    if (!authHeaders) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // UI-01: skip the feature calls entirely while the kill-switch is off.
      const statusRes = await fetch('/api/contact-discovery/status', { headers: authHeaders });
      if (statusRes.ok) {
        const status = await statusRes.json().catch(() => null);
        if (status && status.enabled === false) {
          setAvailable(false);
          return;
        }
      }
      const [settingsRes, matchesRes] = await Promise.all([
        fetch('/api/contact-discovery/settings', { headers: authHeaders }),
        fetch('/api/contact-discovery/matches', { headers: authHeaders }),
      ]);
      if (settingsRes.status === 404 || matchesRes.status === 404) {
        setAvailable(false);
        return;
      }
      if (!settingsRes.ok) throw new Error('settings');
      const settingsJson = await settingsRes.json();
      setSettings(settingsJson.settings ?? null);
      if (matchesRes.ok) {
        const matchesJson = await matchesRes.json();
        setMatches(withoutStaff(Array.isArray(matchesJson.matches) ? matchesJson.matches : [], viewerRole));
        if (matchesJson.settings) setSettings(matchesJson.settings);
      }
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [token, viewerRole]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
    void load();
  }, [load]);

  const runSync = useCallback(async (phones: string[], opts?: { quiet?: boolean }) => {
    if (!token) return;
    if (!phones.length) {
      if (!opts?.quiet) {
        toast.error(t('No phone numbers to sync', '\u09B8\u09BF\u0999\u09CD\u0995 \u0995\u09B0\u09BE\u09B0 \u09AE\u09A4\u09CB \u09AB\u09CB\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A8\u09C7\u0987'));
      }
      return;
    }
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    setBusy(true);
    try {
      const res = await fetch('/api/contact-discovery/sync', {
        method: 'POST',
        headers,
        body: JSON.stringify({ phones }),
      });
      if (res.status === 403) {
        setShowConsent(true);
        throw new Error('consent');
      }
      if (!res.ok) throw new Error();
      const json = await res.json();
      setMatches(withoutStaff(Array.isArray(json.matches) ? json.matches : [], viewerRole));
      if (json.settings) setSettings(json.settings);
      if (NATIVE_ANDROID) markNativeSyncDone();
      if (!opts?.quiet) {
        toast.success(
          t(
            `Found ${Array.isArray(json.matches) ? json.matches.length : 0} people on WevSoft`,
            `WevSoft-\u098F ${(Array.isArray(json.matches) ? json.matches.length : 0)} \u099C\u09A8 \u09AA\u09BE\u0993\u09DF\u09BE \u0997\u09C7\u099B\u09C7`,
          ),
        );
      }
    } catch (e: any) {
      if (e?.message !== 'consent' && !opts?.quiet) {
        toast.error(t('Sync failed', '\u09B8\u09BF\u0999\u09CD\u0995 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5 \u09B9\u09DF\u09C7\u099B\u09C7'));
      }
    } finally {
      setBusy(false);
    }
  }, [token, t, viewerRole]);

  useEffect(() => {
    if (!NATIVE_ANDROID || !settings?.syncEnabled || !token) return;
    setLocalSyncEnabled(true);
    let dispose: (() => void) | undefined;
    void installNativeContactSyncResumeHook({
      syncEnabled: () => true,
      onDueSync: async (phones) => {
        await runSync(phones, { quiet: true });
      },
    }).then((off) => {
      dispose = off;
    });
    return () => {
      dispose?.();
    };
  }, [settings?.syncEnabled, token, runSync]);

  const enableSync = async () => {
    if (!authHeaders) return;
    setBusy(true);
    try {
      const res = await fetch('/api/contact-discovery/settings', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ syncEnabled: true, consentVersion: CONSENT_VERSION }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSettings(json.settings);
      setLocalSyncEnabled(true);
      setShowConsent(false);
      try {
        localStorage.removeItem(CONSENT_DECLINED_KEY);
      } catch {
        /* ignore */
      }
      toast.success(t('Contact sync enabled', '\u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F \u09B8\u09BF\u0999\u09CD\u0995 \u099A\u09BE\u09B2\u09C1 \u09B9\u09DF\u09C7\u099B\u09C7'));
    } catch {
      toast.error(t('Could not enable sync', '\u09B8\u09BF\u0999\u09CD\u0995 \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'));
    } finally {
      setBusy(false);
    }
  };

  const pauseSync = async () => {
    if (!authHeaders) return;
    setBusy(true);
    try {
      const res = await fetch('/api/contact-discovery/settings', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ syncEnabled: false }),
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setSettings(json.settings);
      setLocalSyncEnabled(false);
      toast.success(t('Contact sync paused', '\u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F \u09B8\u09BF\u0999\u09CD\u0995 \u09A5\u09BE\u09AE\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7'));
    } catch {
      toast.error(t('Could not pause sync', '\u09B8\u09BF\u0999\u09CD\u0995 \u09A5\u09BE\u09AE\u09BE\u09A8\u09CB \u0995\u09B0\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'));
    } finally {
      setBusy(false);
    }
  };

  const syncNow = async () => {
    if (!settings?.syncEnabled) {
      if (declinedRef.current) {
        toast(t('Enable contact sync from Manage to continue', '\u099A\u09BE\u09B2\u09C1 \u09B0\u09BE\u0996\u09A4\u09C7 Manage \u09A5\u09C7\u0995\u09C7 Contact Sync \u09B8\u0995\u09CD\u09B0\u09BF\u09DF \u0995\u09B0\u09C1\u09A8'));
        setManageOpen(true);
        return;
      }
      setShowConsent(true);
      return;
    }
    if (NATIVE_ANDROID) {
      const { phones, permission } = await readNativeContactPhones();
      if (permission === 'denied') {
        toast.error(
          t(
            'Contacts permission denied. Enable it in Android Settings.',
            'Contacts permission বন্ধ আছে। Android Settings থেকে চালু করুন।',
          ),
        );
        return;
      }
      if (phones.length) {
        await runSync(phones);
        return;
      }
    }
    if (CONTACT_PICKER_SUPPORTED) {
      try {
        const phones = await pickWebContactPhones();
        await runSync(phones);
        return;
      } catch {
        /* user cancelled or picker failed — fall through to paste */
      }
    }
    setShowPaste(true);
  };

  const deleteData = async () => {
    if (!authHeaders) return;
    if (!window.confirm(t('Delete synced contact discovery data?', '\u09B8\u09BF\u0999\u09CD\u0995 \u0995\u09B0\u09BE Contact Discovery \u09A1\u09BE\u099F\u09BE \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09AC\u09C7\u09A8?'))) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/contact-discovery/data', { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error();
      setMatches([]);
      setLocalSyncEnabled(false);
      setSettings({
        syncEnabled: false,
        consentVersion: 0,
        currentConsentVersion: CONSENT_VERSION,
        lastSyncAt: null,
        lastSyncStatus: null,
      });
      toast.success(t('Synced data deleted', '\u09B8\u09BF\u0999\u09CD\u0995 \u0995\u09B0\u09BE \u09A1\u09BE\u099F\u09BE \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09BE \u09B9\u09DF\u09C7\u099B\u09C7'));
    } catch {
      toast.error(t('Could not delete data', '\u09A1\u09BE\u099F\u09BE \u09AE\u09C1\u099B\u09C7 \u09AB\u09C7\u09B2\u09BE \u09AF\u09BE\u09DF\u09A8\u09BF'));
    } finally {
      setBusy(false);
      setManageOpen(false);
    }
  };

  const declineConsent = () => {
    setShowConsent(false);
    declinedRef.current = true;
    try {
      localStorage.setItem(CONSENT_DECLINED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const requestFriend = async (userId: string) => {
    const ok = await onFriendRequest(userId);
    if (ok) {
      setMatches((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, friendStatus: 'pending_sent' } : m)),
      );
    }
  };

  if (!available || loading) {
    if (!available) return null;
    return (
      <div className="rounded-2xl border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="inline size-4 animate-spin mr-2" aria-hidden />
        {t('Loading contact discovery…', '\u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F \u09A1\u09BF\u09B8\u0995\u09BE\u09AD\u09BE\u09B0\u09BF \u09B2\u09CB\u09A1 \u09B9\u099A\u09CD\u099B\u09C7…')}
      </div>
    );
  }

  return (
    <section
      data-testid="contact-discovery-panel"
      className="rounded-2xl border border-border bg-card/30 p-4 sm:p-5"
      aria-labelledby="contact-discovery-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="contact-discovery-heading" className="flex items-center gap-2 text-sm font-bold text-foreground">
            <BookUser size={16} className="shrink-0 text-primary" aria-hidden />
            {t('Find friends from contacts', '\u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F \u09A5\u09C7\u0995\u09C7 \u09AC\u09A8\u09CD\u09A7\u09C1 \u0996\u09C1\u0981\u099C\u09C1\u09A8')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              'With your permission, WevSoft matches phone numbers you provide to verified accounts that opted in. Numbers are not stored.',
              '\u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09A8\u09C1\u09AE\u09A4\u09BF\u09A4\u09C7 WevSoft \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 verified \u0993 opt-in \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AE\u09BF\u09B2\u09BE\u09DF\u0964 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09DF \u09A8\u09BE\u0964',
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('Last synced', '\u09B6\u09C7\u09B7 \u09B8\u09BF\u0999\u09CD\u0995')}: {formatLastSynced(settings?.lastSyncAt ?? null, t)}
            {settings?.syncEnabled
              ? ` · ${t('Sync on', '\u09B8\u09BF\u0999\u09CD\u0995 \u099A\u09BE\u09B2\u09C1')}`
              : ` · ${t('Sync off', '\u09B8\u09BF\u0999\u09CD\u0995 \u09AC\u09A8\u09CD\u09A7')}`}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-expanded={expanded}
          aria-label={expanded ? t('Collapse', '\u09B8\u0982\u0995\u09C1\u099A\u09BF\u09A4 \u0995\u09B0\u09C1\u09A8') : t('Expand', '\u09AA\u09CD\u09B0\u09B8\u09BE\u09B0\u09BF\u09A4 \u0995\u09B0\u09C1\u09A8')}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {!settings?.syncEnabled ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => (declinedRef.current ? setManageOpen(true) : setShowConsent(true))}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                <Play size={14} aria-hidden />
                {t('Enable contact sync', '\u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F \u09B8\u09BF\u0999\u09CD\u0995 \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8')}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void pauseSync()}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-60"
              >
                <Pause size={14} aria-hidden />
                {t('Pause sync', '\u09B8\u09BF\u0999\u09CD\u0995 \u09A5\u09BE\u09AE\u09BE\u09A8')}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void syncNow()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-60"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <BookUser size={14} aria-hidden />}
              {t('Sync now', '\u098F\u0996\u09A8\u09BF \u09B8\u09BF\u0999\u09CD\u0995')}
            </button>
            <button
              type="button"
              onClick={() => setManageOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-bold text-foreground hover:bg-muted"
            >
              {t('Manage contact discovery', '\u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F \u09A1\u09BF\u09B8\u0995\u09BE\u09AD\u09BE\u09B0\u09BF \u09AA\u09B0\u09BF\u099A\u09BE\u09B2\u09A8\u09BE')}
            </button>
          </div>

          {manageOpen && (
            <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
              <p>
                {NATIVE_ANDROID
                  ? t(
                      'Android: contacts sync uses the Contacts permission. Background WorkManager only marks a due flag (~24h, best-effort); matching runs when the app is open.',
                      'Android: Contacts permission দিয়ে sync হয়। WorkManager শুধু due flag (~২৪ঘণ্টা, best-effort); ম্যাচিং অ্যাপ খোলা থাকলে চলে।',
                    )
                  : t(
                      'Website sync is user-triggered only (Contact Picker or paste). Use the Android app for native contacts access.',
                      'Website sync শুধুমাত্র user-triggered (Contact Picker বা paste)। Native contacts-এর জন্য Android অ্যাপ ব্যবহার করুন।',
                    )}
              </p>
              <p className="text-[11px]">
                {t(
                  'To be findable by others, enable “Find me by phone” in Settings → Privacy.',
                  '\u0985\u09A8\u09CD\u09AF\u09B0\u09BE \u09AF\u09C7\u09A8\u09BE\u09A4\u09C7 \u0986\u09AA\u09A8\u09BE\u0995\u09C7 \u0996\u09C1\u0981\u099C\u09C1\u09A8, Settings → Privacy-\u09A4\u09C7 “Find me by phone” \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8\u0964',
                )}
              </p>
              {!settings?.syncEnabled && declinedRef.current && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowConsent(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground"
                >
                  {t('Review consent again', '\u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u0986\u09AC\u09BE\u09B0 \u09A6\u09C7\u0996\u09C1\u09A8')}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteData()}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-destructive/40 px-3 text-xs font-bold text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={13} aria-hidden />
                {t('Delete synced data', '\u09B8\u09BF\u0999\u09CD\u0995 \u0995\u09B0\u09BE \u09A1\u09BE\u099F\u09BE \u09AE\u09C1\u099B\u09C1\u09A8')}
              </button>
            </div>
          )}

          {showPaste && (
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-card p-3">
              <label htmlFor="contact-discovery-paste" className="text-xs font-semibold text-foreground">
                {t(
                  'Paste phone numbers (one per line). Names and other fields are not sent.',
                  '\u09AB\u09CB\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09AA\u09C7\u09B8\u09CD\u099F \u0995\u09B0\u09C1\u09A8 (\u09AA\u09CD\u09B0\u09A4\u09BF \u09B2\u09BE\u0987\u09A8\u09C7 \u098F\u0995\u099F\u09BF)\u0964 \u09A8\u09BE\u09AE \u09AC\u09BE \u0985\u09A8\u09CD\u09AF\u09BE\u09A8\u09CD\u09AF field \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09DF \u09A8\u09BE\u0964',
                )}
              </label>
              <textarea
                id="contact-discovery-paste"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="+8801…"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runSync(parsePastedPhones(pasteText))}
                  className="h-9 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  {t('Match numbers', '\u09A8\u09AE\u09CD\u09AC\u09B0 \u09AE\u09BF\u09B2\u09BE\u09A8')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaste(false)}
                  className="h-9 rounded-full border border-border px-4 text-xs font-bold text-foreground"
                >
                  {t('Cancel', '\u09AC\u09BE\u09A4\u09BF\u09B2')}
                </button>
              </div>
            </div>
          )}

          {!hideMatchList && matches.length > 0 && (
            <ul className="mt-4 space-y-2" aria-label={t('People from your contacts', '\u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F\u09C7\u09B0 \u09AE\u09BE\u09A8\u09C1\u09B7')}>
              {matches.map((m) => {
                const href = profilePathFor(m);
                const identity = (
                  <>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border">
                      <UserAvatar user={m} src={resolveAvatarUrl(m.avatar)} alt={m.name} className="h-full w-full" decorative />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground">{m.name}</span>
                      {m.username && (
                        <span className="block truncate text-xs text-muted-foreground">@{m.username}</span>
                      )}
                    </span>
                  </>
                );
                return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-transparent bg-card/40 px-3 py-2.5 hover:border-border"
                >
                  {href ? (
                    <Link to={href} className="flex min-w-0 flex-1 items-center gap-3">
                      {identity}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
                  )}
                  {m.friendStatus === 'pending_sent' ? (
                    <span className="inline-flex h-9 items-center gap-1 rounded-full border border-border px-3 text-xs font-bold text-muted-foreground">
                      <Check size={14} aria-hidden />
                      {t('Request sent', '\u09B0\u09BF\u0995\u09CB\u09DF\u09C7\u09B8\u09CD\u099F \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void requestFriend(m.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      <UserPlus size={14} aria-hidden />
                      {t('Add Friend', '\u09AC\u09A8\u09CD\u09A7\u09C1 \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8')}
                    </button>
                  )}
                </li>
              );
              })}
            </ul>
          )}
          {hideMatchList && matches.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              {t(
                `${matches.length} people from your contacts are shown in the list below.`,
                `তোমার contacts থেকে ${matches.length} জন নিচের তালিকায় দেখানো হচ্ছে।`,
              )}
            </p>
          )}
        </>
      )}

      {showConsent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contact-consent-title"
          onClick={declineConsent}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="contact-consent-title" className="text-base font-bold text-foreground">
              {t('Allow contact matching?', '\u0995\u09A8\u09CD\u099F\u09BE\u0995\u09CD\u099F \u09AE\u09CD\u09AF\u09BE\u099A\u09BF\u0982 \u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u09A6\u09C7\u09AC\u09C7\u09A8?')}
            </h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                {t(
                  'We use phone numbers you choose (picker or paste) to find WevSoft accounts.',
                  '\u0986\u09AA\u09A8\u09BF \u09AC\u09BE\u099B\u09BE\u0987 \u09AB\u09CB\u09A8 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A6\u09BF\u09DF\u09C7 WevSoft \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0996\u09CB\u099C\u09BE \u09B9\u09DF\u0964',
                )}
              </li>
              <li>
                {t(
                  'Only verified accounts that opted into “Find me by phone” can appear.',
                  '\u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 verified \u098F\u09AC\u0982 “Find me by phone” opt-in \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7\u09B0\u09BE\u0987 \u09A6\u09C7\u0996\u09BE\u09A8\u09CB \u09AF\u09BE\u09DF\u0964',
                )}
              </li>
              <li>
                {t(
                  'Numbers are processed for matching and are not stored on our servers.',
                  '\u09A8\u09AE\u09CD\u09AC\u09B0 \u09AE\u09CD\u09AF\u09BE\u099A\u09BF\u0982\u09AF\u09B0 \u099C\u09A8\u09CD\u09AF \u09AA\u09CD\u09B0\u09B8\u09C7\u09B8 \u09B9\u09DF; \u09B8\u09BE\u09B0\u09CD\u09AD\u09BE\u09B0\u09C7 \u09B8\u09CD\u09A5\u09BE\u09DF\u09C0\u09AD\u09BE\u09AC\u09C7 \u09B0\u09BE\u0996\u09BE \u09B9\u09DF \u09A8\u09BE\u0964',
                )}
              </li>
              <li>
                {t(
                  'You can pause sync or delete discovery data anytime from Manage.',
                  '\u0986\u09AA\u09A8\u09BF Manage \u09A5\u09C7\u0995\u09C7 \u09AF\u0995\u09CB\u09A8\u09CB \u09B8\u09BF\u0999\u09CD\u0995 \u09A5\u09BE\u09AE\u09BE\u09A8\u09CB \u09AC\u09BE \u09A1\u09BE\u099F\u09BE \u09AE\u09C1\u099B\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u0964',
                )}
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={declineConsent}
                className="h-9 rounded-full border border-border px-4 text-xs font-bold text-foreground"
              >
                {t('Not now', '\u098F\u0996\u09A8 \u09A8\u09DF')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void enableSync()}
                className="h-9 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground disabled:opacity-60"
              >
                {t('Allow & enable', '\u0985\u09A8\u09C1\u09AE\u09A4\u09BF \u09A6\u09BF\u09DF\u09C7 \u099A\u09BE\u09B2\u09C1 \u0995\u09B0\u09C1\u09A8')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
