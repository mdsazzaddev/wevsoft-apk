import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, Clock, Fingerprint, Gavel, ImagePlus, KeyRound, Loader2, Pencil, Plus, RefreshCw, Repeat, Smartphone,
  Trash2, Users, X, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useStore } from '../../store';

/* Settings > Account: appeals, passkeys and linked profiles. */

const authed = (token: string, init?: RequestInit) => ({ ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}` } });
async function call<T = any>(url: string, token: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, authed(token, init));
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.message || `Request failed (${r.status})`);
  return j as T;
}
const jsonInit = (method: string, body?: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
const fmt = (d?: string | null, time = false) => {
  if (!d) return '';
  const x = new Date(d);
  return time ? x.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : x.toLocaleDateString(undefined, { dateStyle: 'medium' });
};
const btn = 'inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg text-sm font-semibold disabled:opacity-50';
const btnPrimary = `${btn} bg-primary text-primary-foreground hover:opacity-90`;
const btnGhost = `${btn} border border-border text-foreground hover:bg-muted`;
const input = 'w-full rounded-lg border border-border bg-background px-3 h-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40';

function Spin() {
  return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={22} /></div>;
}
function Err({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400 flex items-center justify-between gap-3">
      <span>{message}</span>
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-xs font-semibold"><RefreshCw size={14} /> Retry</button>
    </div>
  );
}

/* ------------------------------------------------------------------ appeals */

type Appeal = { id: string; targetType: string; targetId: string | null; reason: string; evidenceNote?: string | null; evidence: string[]; status: 'pending' | 'approved' | 'rejected'; adminNote?: string | null; decidedAt?: string | null; createdAt: string };
type Target = { targetType: string; targetId: string | null; label: string; detail?: string | null; pending: boolean };

const STATUS_CHIP: Record<Appeal['status'], { label: string; cls: string; icon: React.ComponentType<{ size?: number }> }> = {
  pending: { label: 'In review', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', icon: Clock },
  approved: { label: 'Approved', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2 },
  rejected: { label: 'Not approved', cls: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: XCircle },
};
const TYPE_LABEL: Record<string, string> = { ban: 'Account ban', suspension: 'Suspension', warning: 'Warning', restriction: 'Restriction', moderation_action: 'Moderation action' };

export function AppealsSection({ token, onChanged }: { token: string; onChanged?: () => void }) {
  const tr = useSettingsTr();
  const [data, setData] = useState<{ appeals: Appeal[]; targets: Target[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Target | null>(null);
  const load = useCallback(() => {
    setError(null);
    call<{ appeals: Appeal[]; targets: Target[] }>('/api/account-center/appeals', token).then(setData).catch((e) => setError(e.message));
  }, [token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronises with an external system (network/media/DOM)
  useEffect(load, [load]);

  if (error) return <Err message={error} onRetry={load} />;
  if (!data) return <Spin />;
  const appealable = data.targets;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Gavel size={16} className="text-primary" />
        <h4 className="text-sm font-bold text-foreground">{tr('Appeals')}</h4>
      </div>
      {appealable.length === 0 && data.appeals.length === 0 && (
        <p className="text-xs text-muted-foreground rounded-xl border border-border p-3">Nothing to appeal right now. If a moderation decision is made on your account, you can ask for a review here.</p>
      )}
      {appealable.length > 0 && (
        <ul className="rounded-xl border border-border divide-y divide-border/50">
          {appealable.map((t) => (
            <li key={`${t.targetType}:${t.targetId || ''}`} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground first-letter:uppercase">{t.label}</p>
                {t.detail && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.detail}</p>}
              </div>
              {t.pending ? (
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 flex-shrink-0">{tr('In review')}</span>
              ) : (
                <button type="button" onClick={() => setOpen(t)} className={`${btnGhost} h-8 px-3 text-xs flex-shrink-0`}>{tr('Appeal')}</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {data.appeals.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{tr('Your appeals')}</h5>
          <ul className="rounded-xl border border-border divide-y divide-border/50">
            {data.appeals.map((a) => {
              const S = STATUS_CHIP[a.status] || STATUS_CHIP.pending;
              const I = S.icon;
              return (
                <li key={a.id} className="p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground">{TYPE_LABEL[a.targetType] || a.targetType}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${S.cls}`}><I size={12} />{S.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.reason}</p>
                  {a.adminNote && <p className="text-xs rounded-lg bg-muted/50 p-2 text-foreground"><span className="font-semibold">Reviewer note: </span>{a.adminNote}</p>}
                  <p className="text-[11px] text-muted-foreground">Sent {fmt(a.createdAt)}{a.decidedAt ? ` · Decided ${fmt(a.decidedAt)}` : ''}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {open && <AppealForm token={token} target={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load(); onChanged?.(); }} />}
    </section>
  );
}

function AppealForm({ token, target, onClose, onDone }: { token: string; target: Target; onClose: () => void; onDone: () => void }) {
  const tr = useSettingsTr();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [links, setLinks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = async () => {
    if (reason.trim().length < 20) return toast.error('Please explain in at least 20 characters.');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('targetType', target.targetType);
      if (target.targetId) fd.append('targetId', target.targetId);
      fd.append('reason', reason.trim());
      if (note.trim()) fd.append('evidenceNote', note.trim());
      if (links.trim()) fd.append('evidenceLinks', links.trim());
      files.forEach((f) => fd.append('evidence', f));
      await call('/api/account-center/appeals', token, { method: 'POST', body: fd });
      toast.success('Appeal sent. We will notify you when it is reviewed.');
      onDone();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">Appeal: <span className="first-letter:uppercase">{target.label}</span></p>
          <p className="text-xs text-muted-foreground mt-0.5">A moderator will review your request. You can only have one open appeal per decision.</p>
        </div>
        <button type="button" onClick={onClose} aria-label={tr('Close')} className="p-1 rounded-md hover:bg-muted"><X size={16} /></button>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-foreground">{tr('Why should this be reviewed?')}</span>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={4} className={`${input} h-auto py-2`} placeholder={tr('Tell us what happened and why you think the decision was wrong.')} />
        <span className="text-[11px] text-muted-foreground">{reason.trim().length}/2000 · at least 20 characters</span>
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-foreground">Extra context (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={input} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-foreground">Links (optional, one per line)</span>
        <textarea value={links} onChange={(e) => setLinks(e.target.value)} rows={2} className={`${input} h-auto py-2`} />
      </label>
      <div className="space-y-2">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))} />
        <button type="button" onClick={() => fileRef.current?.click()} className={`${btnGhost} h-8 px-3 text-xs`}><ImagePlus size={14} /> {files.length ? `${files.length} image${files.length > 1 ? 's' : ''} attached` : 'Attach screenshots (up to 3)'}</button>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnGhost}>{tr('Cancel')}</button>
        <button type="button" onClick={submit} disabled={busy} className={btnPrimary}>{busy && <Loader2 size={14} className="animate-spin" />}Send appeal</button>
      </div>
    </div>
  );
}

/** Appeal form on the sign-in page for suspended or banned accounts (they cannot sign in). */
export function PublicAppealForm({ identifier, password }: { identifier: string; password: string }) {
  const tr = useSettingsTr();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  if (sent) return <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{sent}</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-primary underline-offset-2 hover:underline">{tr('Think this is a mistake? Appeal')}</button>;
  const submit = async () => {
    if (reason.trim().length < 20) return toast.error('Please explain in at least 20 characters.');
    if (!identifier || !password) return toast.error('Enter your sign-in details above first.');
    setBusy(true);
    try {
      const r = await fetch('/api/account-center/appeals/public', jsonInit('POST', { identifier, password, reason: reason.trim() }));
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || 'Could not send appeal');
      setSent(j.existing ? 'You already have an appeal in review. We will email or notify you once it is decided.' : 'Appeal sent. We will let you know once it is reviewed.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2 text-left">
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={3} className={`${input} h-auto py-2`} placeholder={tr('Explain why this decision should be reviewed (min. 20 characters)')} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className={`${btnGhost} h-8 px-3 text-xs`}>{tr('Cancel')}</button>
        <button type="button" onClick={submit} disabled={busy} className={`${btnPrimary} h-8 px-3 text-xs`}>{busy && <Loader2 size={12} className="animate-spin" />}Send appeal</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ passkeys */

type Passkey = { id: string; name: string; deviceType?: string; backedUp: boolean; transports: string[]; createdAt: string; lastUsedAt?: string | null };

export function PasskeysPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [data, setData] = useState<{ passkeys: Passkey[]; max: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const supported = typeof window !== 'undefined' && browserSupportsWebAuthn();
  const load = useCallback(() => {
    setError(null);
    call<{ passkeys: Passkey[]; max: number }>('/api/auth/webauthn/authenticators', token).then(setData).catch((e) => setError(e.message));
  }, [token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
  useEffect(load, [load]);

  const add = async () => {
    setBusy(true);
    try {
      const options = await call('/api/auth/webauthn/register/generate', token);
      const response = await startRegistration({ optionsJSON: options });
      await call('/api/auth/webauthn/register/verify', token, jsonInit('POST', { response }));
      toast.success('Passkey added');
      load();
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') toast('Passkey setup was cancelled');
      else if (e?.name === 'InvalidStateError') toast.error('This device already has a passkey for your account.');
      else toast.error(e?.message || 'Could not add passkey');
    } finally {
      setBusy(false);
    }
  };
  const rename = async () => {
    if (!editing) return;
    try {
      await call(`/api/auth/webauthn/authenticators/${editing.id}`, token, jsonInit('PATCH', { name: editing.name }));
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };
  const remove = async (p: Passkey) => {
    if (!window.confirm(`Remove "${p.name}"? You will no longer be able to sign in with it.`)) return;
    try {
      await call(`/api/auth/webauthn/authenticators/${p.id}`, token, { method: 'DELETE' });
      toast.success('Passkey removed');
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (error) return <Err message={error} onRetry={load} />;
  if (!data) return <Spin />;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/30 p-4 flex gap-3">
        <Fingerprint size={22} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-foreground">{tr('Sign in without a password')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Passkeys use your fingerprint, face or screen lock. They can't be phished or reused on other sites.</p>
        </div>
      </div>
      {!supported && <p className="text-xs rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-amber-700 dark:text-amber-400">This browser doesn't support passkeys. Try a recent version of Chrome, Safari, Edge or Firefox.</p>}
      {data.passkeys.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{tr('You haven\'t added a passkey yet.')}</p>
      ) : (
        <ul className="rounded-xl border border-border divide-y divide-border/50">
          {data.passkeys.map((p) => (
            <li key={p.id} className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {p.backedUp ? <KeyRound size={16} /> : <Smartphone size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                {editing?.id === p.id ? (
                  <div className="flex gap-2">
                    <input autoFocus value={editing.name} maxLength={60} onChange={(e) => setEditing({ id: p.id, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && rename()} className={`${input} h-8`} />
                    <button type="button" onClick={rename} className={`${btnPrimary} h-8 px-3 text-xs`}>{tr('Save')}</button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.backedUp ? 'Synced' : 'This device only'} · Added {fmt(p.createdAt)}{p.lastUsedAt ? ` · Last used ${fmt(p.lastUsedAt)}` : ' · Never used'}
                    </p>
                  </>
                )}
              </div>
              {editing?.id !== p.id && (
                <div className="flex gap-1 flex-shrink-0">
                  <button type="button" aria-label={tr('Rename')} onClick={() => setEditing({ id: p.id, name: p.name })} className="p-2 rounded-lg hover:bg-muted text-muted-foreground"><Pencil size={15} /></button>
                  <button type="button" aria-label={tr('Remove')} onClick={() => remove(p)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-600"><Trash2 size={15} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{data.passkeys.length}/{data.max} passkeys</p>
        <button type="button" onClick={add} disabled={busy || !supported || data.passkeys.length >= data.max} className={btnPrimary}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Add a passkey
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ profiles */

type Profile = { id: string; name: string; username: string; avatar?: string | null; isOwner: boolean; kind: string; label?: string | null; linkStatus: string; disabledReason?: string | null; current: boolean };
const KINDS = ['personal', 'creator', 'business', 'community', 'fan'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Avatar({ p }: { p: Pick<Profile, 'avatar' | 'name'> }) {
  return p.avatar
    ? <img src={p.avatar} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
    : <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-bold">{(p.name || '?').charAt(0).toUpperCase()}</div>;
}

export function ProfilesPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const setAuth = useStore((s) => s.setAuth);
  const [data, setData] = useState<{ profiles: Profile[]; max: number; ownerId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', kind: 'personal', label: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    call('/api/account-center/profiles', token).then(setData).catch((e) => setError(e.message));
  }, [token]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
  useEffect(load, [load]);

  const create = async () => {
    setBusy('create');
    try {
      const j = await call('/api/account-center/profiles', token, jsonInit('POST', { ...form, username: form.username.replace(/^@/, '') }));
      setData(j);
      setCreating(false);
      setForm({ name: '', username: '', kind: 'personal', label: '' });
      toast.success('Profile created');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };
  const switchTo = async (p: Profile) => {
    setBusy(p.id);
    try {
      const j = await call<{ token: string; user: any }>('/api/account-center/profiles/switch', token, jsonInit('POST', { profileUserId: p.id }));
      setAuth(j.token, j.user);
      toast.success(`Switched to ${p.name}`);
      setTimeout(() => window.location.assign('/'), 300);
    } catch (e: any) { toast.error(e.message); setBusy(null); }
  };
  const remove = async (p: Profile) => {
    const password = window.prompt(`Delete the profile @${p.username}? Its posts and data will be removed. Enter your password to confirm (leave empty if your account has no password).`);
    if (password === null) return;
    setBusy(p.id);
    try {
      setData(await call('/api/account-center/profiles/' + p.id, token, jsonInit('DELETE', { password })));
      toast.success('Profile deleted');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  };

  if (error) return <Err message={error} onRetry={load} />;
  if (!data) return <Spin />;
  const extra = data.profiles.filter((p) => !p.isOwner).length;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-muted/30 p-4 flex gap-3">
        <Users size={22} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">Run separate profiles (for example a creator or business page) from one login. Each profile has its own name, username, followers and posts. Your password, passkeys and security settings stay on the main account.</p>
      </div>
      <ul className="rounded-xl border border-border divide-y divide-border/50">
        {data.profiles.map((p) => (
          <li key={p.id} className="p-3 flex items-center gap-3">
            <Avatar p={p} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{p.name} {p.current && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary align-middle">{tr('Current')}</span>}</p>
              <p className="text-[11px] text-muted-foreground truncate">@{p.username} · {p.isOwner ? 'Main account' : `${cap(p.kind)}${p.label ? ` · ${p.label}` : ''}`}</p>
              {p.linkStatus === 'disabled' && <p className="text-[11px] text-red-600 mt-0.5">Disabled by an administrator{p.disabledReason ? `: ${p.disabledReason}` : ''}</p>}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {!p.current && p.linkStatus === 'active' && (
                <button type="button" onClick={() => switchTo(p)} disabled={!!busy} className={`${btnGhost} h-8 px-3 text-xs`}>{busy === p.id ? <Loader2 size={12} className="animate-spin" /> : <Repeat size={12} />}Switch</button>
              )}
              {!p.isOwner && !p.current && (
                <button type="button" aria-label={tr('Delete profile')} onClick={() => remove(p)} disabled={!!busy} className="p-2 rounded-lg hover:bg-red-500/10 text-red-600"><Trash2 size={15} /></button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {creating ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">{tr('New profile')}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs font-semibold">{tr('Display name')}</span><input value={form.name} maxLength={50} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></label>
            <label className="space-y-1"><span className="text-xs font-semibold">{tr('Username')}</span><input value={form.username} maxLength={30} onChange={(e) => setForm({ ...form, username: e.target.value.trim() })} className={input} placeholder="@" /></label>
            <label className="space-y-1"><span className="text-xs font-semibold">{tr('Type')}</span>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={input}>{KINDS.map((k) => <option key={k} value={k}>{cap(k)}</option>)}</select>
            </label>
            <label className="space-y-1"><span className="text-xs font-semibold">Private label (optional)</span><input value={form.label} maxLength={40} onChange={(e) => setForm({ ...form, label: e.target.value })} className={input} /></label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className={btnGhost}>{tr('Cancel')}</button>
            <button type="button" onClick={create} disabled={busy === 'create' || form.name.trim().length < 2 || form.username.length < 3} className={btnPrimary}>{busy === 'create' && <Loader2 size={14} className="animate-spin" />}Create profile</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">{extra}/{data.max} extra profiles</p>
          <button type="button" onClick={() => setCreating(true)} disabled={extra >= data.max} className={btnPrimary}><Plus size={14} />{tr('Add profile')}</button>
        </div>
      )}
    </div>
  );
}

