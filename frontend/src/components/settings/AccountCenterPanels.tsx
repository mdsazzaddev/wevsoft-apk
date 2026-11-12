import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, AtSign, Ban, Fingerprint, Gavel, Repeat, UserPlus, CheckCircle2, Download, FileJson, KeyRound, Loader2, LogIn, Mail, PauseCircle,
  Phone, RefreshCw, ShieldAlert, ShieldCheck, Trash2, Undo2, UserX, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AppealsSection } from './AccountCenterPhase3';
import { ConfirmIdentitySheet, useIdentityConfirmation, isConfirmCancelled } from '../wevspace/manage/ConfirmIdentitySheet';
import { settingsReauthBlobFetch } from '../../lib/settingsReauth';

/* Real data panels for Settings > Account: summary card, activity timeline, standing, data download. */

const authed = (token: string, init?: RequestInit) => ({ ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` } });

function useJson<T>(url: string, token: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(url, authed(token))
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
        setData(j);
      })
      .catch((e) => setError(e.message || 'Could not load'))
      .finally(() => setLoading(false));
  }, [url, token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; loading flag is set before the request starts (existing behavior)
    load();
  }, [load]);
  return { data, error, loading, reload: load };
}

const fmtDate = (d?: string | null, withTime = false) =>
  d ? new Date(d).toLocaleString(undefined, withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }) : '';

function relTime(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(d);
}

function shortDevice(ua?: string | null) {
  if (!ua) return null;
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : null;
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  return [br, os].filter(Boolean).join(' on ') || ua.slice(0, 40);
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  const tr = useSettingsTr();
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 flex items-center justify-between gap-3">
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-xs font-semibold text-foreground hover:text-primary"><RefreshCw size={14} />{tr('Retry')}</button>
    </div>
  );
}

const Spinner = () => <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={22} /></div>;

/* ------------------------------------------------------------------ summary card */

type Summary = {
  name?: string | null; username?: string | null; avatar?: string | null; verified?: boolean; joinedAt?: string;
  completeness: { percent: number; missing: { key: string; label: string }[] };
};

export function AccountSummaryCard({ token }: { token: string }) {
  const tr = useSettingsTr();
  const { data, loading } = useJson<Summary>('/api/account-center/summary', token);
  if (loading) {
    return <div className="h-[116px] rounded-2xl border border-border bg-card animate-pulse" aria-hidden />;
  }
  if (!data) return null;
  const pct = data.completeness?.percent ?? 0;
  const missing = data.completeness?.missing ?? [];
  const initials = (data.name || data.username || '?').trim().slice(0, 1).toUpperCase();
  return (
    <section aria-label={tr('Your account')} className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-5">
      <div className="flex items-center gap-4">
        {data.avatar ? (
          <img src={data.avatar} alt="" className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0" />
        ) : (
          <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 text-primary text-xl font-bold flex items-center justify-center flex-shrink-0">{initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base sm:text-lg font-bold text-foreground truncate inline-flex items-center gap-1.5 max-w-full">
            <span className="truncate">{data.name || data.username}</span>
            {data.verified && <ShieldCheck size={18} className="text-primary flex-shrink-0" aria-label={tr('Verified')} />}
          </p>
          {data.username && <p className="text-sm text-muted-foreground truncate">@{data.username}</p>}
          {data.joinedAt && <p className="text-xs text-muted-foreground/80 mt-0.5">Joined {fmtDate(data.joinedAt)}</p>}
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-semibold text-foreground">Profile {pct}% complete</span>
          {pct === 100 && <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-1"><CheckCircle2 size={14} />{tr('All set')}</span>}
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-primary' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
        </div>
        {missing.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <span className="text-xs text-muted-foreground mr-0.5">Add:</span>
            {missing.map((m) => (
              <span key={m.key} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m.label}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ activity timeline */

type EventItem = { id: string; type: string; detail?: string | null; ipAddress?: string | null; device?: string | null; at: string };

const EVENT_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }> = {
  login: { label: 'Signed in', icon: LogIn, tone: 'bg-primary/10 text-primary' },
  login_failed: { label: 'Failed sign-in attempt', icon: XCircle, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  password_change: { label: 'Password changed', icon: KeyRound, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  sessions_revoked: { label: 'Signed out of other sessions', icon: KeyRound, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  email_change: { label: 'Email address verified', icon: Mail, tone: 'bg-primary/10 text-primary' },
  phone_change: { label: 'Phone number verified', icon: Phone, tone: 'bg-primary/10 text-primary' },
  username_change: { label: 'Username changed', icon: AtSign, tone: 'bg-primary/10 text-primary' },
  account_pause: { label: 'Account paused', icon: PauseCircle, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  account_deactivate: { label: 'Account deactivated', icon: UserX, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  account_deletion_requested: { label: 'Account deletion scheduled', icon: Trash2, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  account_deletion_cancelled: { label: 'Account deletion cancelled', icon: Undo2, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  data_export: { label: 'Downloaded your data', icon: Download, tone: 'bg-muted text-muted-foreground' },
  passkey_added: { label: 'Passkey added', icon: Fingerprint, tone: 'bg-primary/10 text-primary' },
  passkey_renamed: { label: 'Passkey renamed', icon: Fingerprint, tone: 'bg-muted text-muted-foreground' },
  passkey_removed: { label: 'Passkey removed', icon: Fingerprint, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  passkey_sign_in: { label: 'Signed in with a passkey', icon: Fingerprint, tone: 'bg-primary/10 text-primary' },
  passkey_revoked_by_admin: { label: 'Passkey revoked by support', icon: Fingerprint, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  profile_created: { label: 'Profile created', icon: UserPlus, tone: 'bg-primary/10 text-primary' },
  profile_switched: { label: 'Switched profile', icon: Repeat, tone: 'bg-muted text-muted-foreground' },
  profile_renamed: { label: 'Profile updated', icon: UserPlus, tone: 'bg-muted text-muted-foreground' },
  profile_deleted: { label: 'Profile deleted', icon: Trash2, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  profile_disabled_by_admin: { label: 'Profile disabled by support', icon: Ban, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  profile_removed_by_admin: { label: 'Profile removed by support', icon: Ban, tone: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  appeal_submitted: { label: 'Appeal submitted', icon: Gavel, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  appeal_decided: { label: 'Appeal decided', icon: Gavel, tone: 'bg-primary/10 text-primary' },
};

export function AccountActivityPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [items, setItems] = useState<EventItem[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (before?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const q = before ? `?before=${encodeURIComponent(before)}` : '';
      const r = await fetch(`/api/account-center/security-events${q}`, authed(token));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Could not load activity');
      setItems((prev) => (before ? [...prev, ...(j.items || [])] : j.items || []));
      setNext(j.nextBefore || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; loading flag is set before the request starts (existing behavior)
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Sign-ins and changes to your password, contact info, username and account status. If something looks unfamiliar, change your password and review your devices.</p>
      {error && <ErrorBox message={error} onRetry={() => load()} />}
      {!error && !loading && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{tr('No account activity recorded yet.')}</div>
      )}
      {items.length > 0 && (
        <ol className="relative ml-4 border-l border-border space-y-4">
          {items.map((e) => {
            const meta = EVENT_META[e.type] || { label: e.type.replace(/_/g, ' '), icon: ShieldCheck, tone: 'bg-muted text-muted-foreground' };
            const Icon = meta.icon;
            const where = [shortDevice(e.device), e.ipAddress].filter(Boolean).join(' · ');
            return (
              <li key={e.id} className="pl-6 relative">
                <span className={`absolute -left-[15px] top-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-background ${meta.tone}`}><Icon size={14} /></span>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-semibold text-foreground">{meta.label}{e.detail ? <span className="font-normal text-muted-foreground"> · {e.detail}</span> : null}</p>
                  <time dateTime={e.at} title={fmtDate(e.at, true)} className="text-xs text-muted-foreground">{relTime(e.at)}</time>
                </div>
                {where && <p className="text-xs text-muted-foreground mt-0.5 truncate">{where}</p>}
              </li>
            );
          })}
        </ol>
      )}
      {loading && <Spinner />}
      {!loading && next && (
        <button type="button" onClick={() => load(next)} className="w-full h-9 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted/60">{tr('Show older activity')}</button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ standing */

type Standing = {
  level: 'good' | 'warned' | 'suspended' | 'banned';
  warningCount: number;
  banReason?: string | null;
  suspension?: { reason?: string | null; startedAt?: string | null; endsAt?: string | null } | null;
  restrictions: { id: string; restrictionType: string; action: string; reason?: string | null; createdAt: string }[];
  actions: { id: string; contentType: string; action: string; reason?: string | null; createdAt: string }[];
  appealAvailable: boolean;
};

const LEVEL: Record<Standing['level'], { title: string; body: string; icon: React.ComponentType<{ size?: number; className?: string }>; box: string }> = {
  good: { title: 'Your account is in good standing', body: 'No strikes, restrictions or removed content.', icon: CheckCircle2, box: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' },
  warned: { title: 'Your account has warnings', body: 'Some actions were taken on your account or content. Repeated violations can lead to limits.', icon: AlertTriangle, box: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400' },
  suspended: { title: 'Your account is suspended', body: 'Some or all features are unavailable until the suspension ends.', icon: ShieldAlert, box: 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400' },
  banned: { title: 'Your account is banned', body: 'This account was removed for violating the community guidelines.', icon: Ban, box: 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400' },
};

const humanize = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function AccountStandingPanel({ token, onContactSupport }: { token: string; onContactSupport?: () => void }) {
  const tr = useSettingsTr();
  const { data, error, loading, reload } = useJson<Standing>('/api/account-center/standing', token);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error || 'Could not load'} onRetry={reload} />;
  const L = LEVEL[data.level] || LEVEL.good;
  const Icon = L.icon;
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 flex gap-3 ${L.box}`}>
        <Icon size={22} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold">{L.title}</p>
          <p className="text-xs mt-0.5 text-foreground/80">{L.body}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { k: 'Warnings', v: data.warningCount },
          { k: 'Restrictions', v: data.restrictions.length },
          { k: 'Actions', v: data.actions.length },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-border bg-muted/30 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{s.v}</p>
            <p className="text-[11px] text-muted-foreground">{s.k}</p>
          </div>
        ))}
      </div>

      {data.suspension && (
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="font-semibold text-foreground">{tr('Suspension')}</p>
          {data.suspension.reason && <p className="text-muted-foreground mt-0.5">{data.suspension.reason}</p>}
          {data.suspension.endsAt && <p className="text-xs text-muted-foreground mt-1">Ends {fmtDate(data.suspension.endsAt, true)}</p>}
        </div>
      )}
      {data.banReason && <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">{data.banReason}</div>}

      {data.restrictions.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{tr('Active restrictions')}</h4>
          <ul className="rounded-xl border border-border divide-y divide-border/50">
            {data.restrictions.map((r) => (
              <li key={r.id} className="p-3 text-sm">
                <p className="font-semibold text-foreground">{humanize(r.restrictionType)} · {humanize(r.action)}</p>
                {r.reason && <p className="text-xs text-muted-foreground mt-0.5">{r.reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.actions.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{tr('History')}</h4>
          <ul className="rounded-xl border border-border divide-y divide-border/50">
            {data.actions.map((a) => (
              <li key={a.id} className="p-3 text-sm flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{humanize(a.action)} <span className="font-normal text-muted-foreground">· {a.contentType === 'user' ? 'your account' : `a ${a.contentType}`}</span></p>
                  {a.reason && <p className="text-xs text-muted-foreground mt-0.5">{a.reason}</p>}
                </div>
                <time className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(a.createdAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="border-t border-border pt-4"><AppealsSection token={token} onChanged={reload} /></div>

      {data.level !== 'good' && onContactSupport && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border p-3">
          <p className="text-xs text-muted-foreground">{tr('Need help with something else? Our support team can assist.')}</p>
          <button type="button" onClick={onContactSupport} className="inline-flex items-center justify-center px-4 h-9 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90">{tr('Contact support')}</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ data download */

export function DataDownloadPanel({ token, t }: { token: string; t?: (s: string) => string }) {
  const tr = t ?? ((s: string) => s);
  const { data, reload } = useJson<{ lastExportAt: string | null }>('/api/account-center/export/status', token);
  const [busy, setBusy] = useState(false);
  const identity = useIdentityConfirmation();

  const download = async () => {
    setBusy(true);
    try {
      // The server asks for a password / 2FA confirmation first (403 REAUTH_REQUIRED); the shared sheet prompts and retries.
      const { blob, filename } = await identity.run((confirm) =>
        settingsReauthBlobFetch('/api/account-center/export', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }, confirm),
      );
      const name = filename || 'wevsoft-account-export.zip';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success(tr('Your data is downloading'));
      reload();
    } catch (e: any) {
      if (isConfirmCancelled(e)) return;
      toast.error(e.message || tr('Export failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tr('Get a copy of your information as a ZIP file (one JSON file per section, plus a README).')}</p>
      <ul className="grid sm:grid-cols-2 gap-2 text-sm">
        {['Profile information', 'Posts and comments', 'Message metadata (no message text)', 'Photos and videos list', 'Sign-in history', 'Account activity'].map((item) => (
          <li key={item} className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-foreground"><CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />{tr(item)}</li>
        ))}
      </ul>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border p-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><FileJson size={18} /></span>
          <div>
            <p className="text-sm font-semibold text-foreground">{busy ? 'Preparing your file…' : data?.lastExportAt ? 'Ready to download' : 'No downloads yet'}</p>
            <p className="text-xs text-muted-foreground">{data?.lastExportAt ? `Last downloaded ${relTime(data.lastExportAt)}` : 'The file is created right away.'}</p>
          </div>
        </div>
        <button type="button" onClick={download} disabled={busy} className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{busy ? 'Preparing' : 'Download'}
        </button>
      </div>
      <ConfirmIdentitySheet prompt={identity.prompt} onClose={identity.close} t={t} />
    </div>
  );
}