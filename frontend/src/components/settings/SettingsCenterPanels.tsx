import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, Mail, Phone, RotateCcw, ShieldCheck, Trash2, UserMinus, UserPlus, XCircle,
} from 'lucide-react';
import OtpDigitBoxes from '../auth/OtpDigitBoxes';

/* Panels for the Settings page that talk to /api/me (settings center) and related endpoints. */

type Card = { id: string; name: string; username?: string | null; avatar?: string | null };

function api(token: string) {
  return async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
    return j as T;
  };
}
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const btn = 'inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-50';
const primary = 'inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50';
const input = 'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm';
const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
const Spinner = () => <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

function Person({ u, right }: { u: Card; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {u.avatar ? <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{(u.name || '?').slice(0, 1)}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{u.name}</p>
        {u.username && <p className="text-xs text-muted-foreground truncate">@{u.username}</p>}
      </div>
      {right}
    </div>
  );
}

/** Add-by-username form shared by the people lists. */
function AddByUsername({ label, onAdd, busy }: { label: string; onAdd: (username: string) => Promise<void>; busy?: boolean }) {
  const tr = useSettingsTr();
  const [v, setV] = useState('');
  return (
    <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (!v.trim()) return; try { await onAdd(v.trim()); setV(''); } catch (err: any) { toast.error(err.message); } }}>
      <input className={input} placeholder={tr('username')} value={v} onChange={(e) => setV(e.target.value)} />
      <button type="submit" className={primary} disabled={busy || !v.trim()}><UserPlus className="w-3.5 h-3.5" />{label}</button>
    </form>
  );
}

// ------------------------------------------------------------------ activity log
const KINDS: [string, string][] = [['all', 'Everything'], ['posts', 'Posts'], ['comments', 'Comments'], ['reactions', 'Reactions'], ['friends', 'Friend requests'], ['logins', 'Sign-ins']];
export function ActivityLogPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [kind, setKind] = useState('all');
  const [items, setItems] = useState<any[] | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const load = useCallback(async (k: string, before?: string) => {
    const q = new URLSearchParams({ kind: k, limit: '30', ...(before ? { before } : {}) });
    const r = await call<{ items: any[]; nextBefore: string | null }>(`/api/me/activity?${q}`);
    setItems((prev) => (before && prev ? [...prev, ...r.items] : r.items)); setNext(r.nextBefore);
  }, [token]);  
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { setItems(null); load(kind).catch((e) => toast.error(e.message)); }, [kind, load]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map(([k, l]) => <button key={k} type="button" onClick={() => setKind(k)} className={`px-3 h-7 rounded-full text-xs font-semibold border ${kind === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>{tr(l)}</button>)}
      </div>
      {!items ? <Spinner /> : !items.length ? <Empty>{tr('No activity to show.')}</Empty> : (
        <ul className="divide-y divide-border/60">
          {items.map((i) => (
            <li key={`${i.kind}-${i.id}`} className="py-2.5 flex gap-3 items-start">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-sm break-words">{i.summary}</p><p className="text-xs text-muted-foreground">{when(i.at)}</p></div>
              {i.link && <a href={i.link} className="text-xs text-primary inline-flex items-center gap-1 shrink-0">{tr('Open ')}<ExternalLink className="w-3 h-3" /></a>}
            </li>
          ))}
        </ul>
      )}
      {next && <button type="button" className={btn} onClick={() => load(kind, next).catch((e) => toast.error(e.message))}>{tr('Load older')}</button>}
    </div>
  );
}

// ------------------------------------------------------------------ trash
export function TrashPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [data, setData] = useState<{ retentionDays: number; items: any[] } | null>(null);
  const load = useCallback(() => call('/api/me/trash').then(setData).catch((e) => toast.error(e.message)), [token]);  
  useEffect(() => { load(); }, [load]);
  const act = async (id: string, how: 'restore' | 'erase') => {
    if (how === 'erase' && !window.confirm(tr('Erase this post for good? This cannot be undone.'))) return;
    try { await call(how === 'restore' ? `/api/me/trash/${id}/restore` : `/api/me/trash/${id}`, { method: how === 'restore' ? 'POST' : 'DELETE' }); toast.success(how === 'restore' ? tr('Post restored') : tr('Post erased')); load(); } catch (e: any) { toast.error(e.message); }
  };
  if (!data) return <Spinner />;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Posts you delete wait here for {data.retentionDays} days, then they are erased automatically. Restore puts a post back exactly as it was.</p>
      {!data.items.length ? <Empty>{tr('Your trash is empty.')}</Empty> : (
        <ul className="divide-y divide-border/60">
          {data.items.map((p) => (
            <li key={p.id} className="py-2.5 flex gap-3 items-center">
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{p.preview}</p>
                <p className="text-xs text-muted-foreground">{tr('Deleted {when}').replace('{when}', when(p.trashedAt))} · {p.daysLeft == null ? tr('kept until you erase it') : tr('{n} day(s) left').replace('{n}', String(p.daysLeft))}</p>
              </div>
              <button type="button" className={btn} onClick={() => act(p.id, 'restore')}><RotateCcw className="w-3.5 h-3.5" />{tr('Restore')}</button>
              <button type="button" className={`${btn} text-red-600`} onClick={() => act(p.id, 'erase')}><Trash2 className="w-3.5 h-3.5" />{tr('Erase')}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ connected apps (OAuth)
export function AppsWebsitesPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [apps, setApps] = useState<any[] | null>(null);
  const load = useCallback(() => call<any[]>('/api/oauth/authorized-apps').then(setApps).catch((e) => { setApps([]); toast.error(e.message); }), [token]);  
  useEffect(() => { load(); }, [load]);
  const revoke = async (a: any) => {
    if (!window.confirm(tr('Remove {name}? It will lose access to your account immediately.').replace('{name}', a.app?.name || tr('this app')))) return;
    try { await call(`/api/oauth/authorized-apps/${a.app.id}`, { method: 'DELETE' }); toast.success(tr('Access removed')); load(); } catch (e: any) { toast.error(e.message); }
  };
  if (!apps) return <Spinner />;
  if (!apps.length) return <Empty>{tr('No apps or websites are connected to your account.')}</Empty>;
  return (
    <ul className="divide-y divide-border/60">
      {apps.map((a) => (
        <li key={a.app.id} className="py-3 flex gap-3 items-start">
          {a.app.logoUrl ? <img src={a.app.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-muted" />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{a.app.name}{a.app.mode === 'development' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">{tr('in development')}</span>}</p>
            <p className="text-xs text-muted-foreground">Connected {when(a.authorizedAt)} · last used {when(a.lastTokenAt)}</p>
            <div className="mt-1 flex flex-wrap gap-1">{a.scopes.map((s: string) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{s}</span>)}</div>
            {a.app.privacyPolicyUrl && <a href={a.app.privacyPolicyUrl} target="_blank" rel="noreferrer" className="text-xs text-primary">{tr('Privacy policy')}</a>}
          </div>
          <button type="button" className={`${btn} text-red-600`} onClick={() => revoke(a)}>{tr('Remove')}</button>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ restricted + muted
function PeopleList({ token, kind }: { token: string; kind: 'restricted' | 'muted' }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [list, setList] = useState<Card[] | null>(null);
  const load = useCallback(() => call<Card[]>(kind === 'restricted' ? '/api/me/restricted' : '/api/settings/mutes').then(setList).catch((e) => toast.error(e.message)), [token, kind]);  
  useEffect(() => { load(); }, [load]);
  const add = async (username: string) => {
    if (kind === 'restricted') await call('/api/me/restricted', { method: 'POST', body: JSON.stringify({ username }) });
    else { const u = await call<Card>(`/api/me/lookup?username=${encodeURIComponent(username)}`); await call('/api/settings/mutes', { method: 'POST', body: JSON.stringify({ mutedId: u.id }) }); }
    toast.success(kind === 'restricted' ? tr('Added to restricted') : tr('Muted')); load();
  };
  const remove = async (id: string) => {
    try { await call(kind === 'restricted' ? `/api/me/restricted/${id}` : `/api/settings/mutes/${id}`, { method: 'DELETE' }); load(); } catch (e: any) { toast.error(e.message); }
  };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{kind === 'restricted'
        ? tr('Restricted people stay friends, but their new comments on your posts are only visible to them, and they are not told.')
        : tr('Muted people can still interact with you, but you will not get notifications from them.')}</p>
      <AddByUsername label={kind === 'restricted' ? tr('Restrict') : tr('Mute')} onAdd={add} />
      {!list ? <Spinner /> : !list.length ? <Empty>{tr('Nobody here.')}</Empty> : (
        <div className="divide-y divide-border/60">{list.map((u) => <Person key={u.id} u={u} right={<button type="button" className={btn} onClick={() => remove(u.id)}><UserMinus className="w-3.5 h-3.5" />{kind === 'restricted' ? tr('Unrestrict') : tr('Unmute')}</button>} />)}</div>
      )}
    </div>
  );
}
export const RestrictedListPanel = ({ token }: { token: string }) => <PeopleList token={token} kind="restricted" />;
export const MutedListPanel = ({ token }: { token: string }) => <PeopleList token={token} kind="muted" />;

// ------------------------------------------------------------------ hidden words
export function HiddenWordsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { call<{ words: string[] }>('/api/me/hidden-words').then((r) => setText(r.words.join(', '))).catch((e) => toast.error(e.message)); }, [token]);  
  if (text === null) return <Spinner />;
  const save = async () => { setBusy(true); try { const r = await call<{ words: string[] }>('/api/me/hidden-words', { method: 'PUT', body: JSON.stringify({ words: text }) }); setText(r.words.join(', ')); toast.success(`${r.words.length} word(s) saved`); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tr('Separate words or phrases with commas.')}</p>
      <textarea className="w-full min-h-[110px] rounded-lg border border-border bg-background p-3 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={tr('spoiler, buy followers')} />
      <div className="flex justify-end"><button type="button" className={primary} disabled={busy} onClick={save}>{busy ? tr('Saving...') : tr('Save words')}</button></div>
    </div>
  );
}

// ------------------------------------------------------------------ legacy contact + memorialization
export function LegacyContactPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [data, setData] = useState<{ contact: Card | null } | null>(null);
  const [reqs, setReqs] = useState<any[]>([]);
  const [form, setForm] = useState({ username: '', relationship: '', details: '' });
  const load = useCallback(() => { call('/api/me/legacy-contact').then(setData).catch((e) => toast.error(e.message)); call<any[]>('/api/me/memorialization-requests').then(setReqs).catch(() => {}); }, [token]);  
  useEffect(() => { load(); }, [load]);
  if (!data) return <Spinner />;
  const submitReq = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await call('/api/me/memorialization-requests', { method: 'POST', body: JSON.stringify(form) }); toast.success(tr('Request sent for review')); setForm({ username: '', relationship: '', details: '' }); load(); } catch (err: any) { toast.error(err.message); }
  };
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-bold">{tr('Your legacy contact')}</h3>
        <p className="text-xs text-muted-foreground">{tr('A friend you trust to look after your profile if it is ever turned into a memorial. They cannot sign in as you or read your messages.')}</p>
        {data.contact
          ? <Person u={data.contact} right={<button type="button" className={btn} onClick={async () => { await call('/api/me/legacy-contact', { method: 'DELETE' }); load(); }}>{tr('Remove')}</button>} />
          : <AddByUsername label={tr('Choose')} onAdd={async (username) => { await call('/api/me/legacy-contact', { method: 'PUT', body: JSON.stringify({ username }) }); toast.success(tr('Legacy contact saved')); load(); }} />}
      </section>
      <section className="space-y-2 border-t border-border/60 pt-4">
        <h3 className="text-sm font-bold">{tr('Ask to memorialize someone\'s account')}</h3>
        <p className="text-xs text-muted-foreground">{tr('If someone you knew has passed away, our team can review a request to turn their profile into a memorial.')}</p>
        <form className="grid gap-2" onSubmit={submitReq}>
          <input className={input} placeholder={tr('Their username')} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className={input} placeholder={tr('Your relationship (e.g. sibling, close friend)')} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} />
          <textarea className="rounded-lg border border-border bg-background p-3 text-sm min-h-[70px]" placeholder={tr('Anything that helps us confirm (optional)')} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          <div className="flex justify-end"><button type="submit" className={primary} disabled={!form.username || !form.relationship}>{tr('Send request')}</button></div>
        </form>
        {reqs.length > 0 && <ul className="text-xs text-muted-foreground space-y-1">{reqs.map((r) => <li key={r.id}>{r.subject?.name || 'Account'}: {r.status} ({when(r.createdAt)})</li>)}</ul>}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ email / phone
type ContactChannel = 'email' | 'phone';
type ContactStep = 'view' | 'enter' | 'password' | 'code';

function StatusBadge({ verified }: { verified: boolean }) {
  const tr = useSettingsTr();
  return verified ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" />{tr('Verified')}
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5" />{tr('Unverified')}
    </span>
  );
}

const RESEND_SECONDS = 60;

function ContactRow({ token, channel, info, reload }: { token: string; channel: ContactChannel; info: any; reload: () => void }) {
  const tr = useSettingsTr();
  const call = api(token);
  const current: string = (channel === 'email' ? info?.email : info?.phone) || '';
  const verified = !!(channel === 'email' ? info?.emailVerified : info?.phoneVerified);
  const smsOff = channel === 'phone' && info?.smsDelivery === false;
  const isDevFallback = smsOff && typeof window !== 'undefined' && /^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname);
  const Icon = channel === 'email' ? Mail : Phone;
  const needPassword = !!(info?.requirePassword && info?.hasPassword);

  const [step, setStep] = useState<ContactStep>('view');
  const [mode, setMode] = useState<'verify' | 'change'>('verify');
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [target, setTarget] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  const reset = () => {
    setStep('view'); setValue(''); setPassword(''); setCode(''); setTarget(''); setDevCode(null); setError(null); setResendIn(0);
  };
  const openVerify = () => { reset(); setMode('verify'); setValue(current); setStep('enter'); };
  const openChange = () => { reset(); setMode('change'); setStep('enter'); };

  const validValue = (v: string) => (channel === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : /^\+?\d{8,15}$/.test(v.replace(/[\s-]/g, '')));
  const next = () => {
    const v = mode === 'verify' ? current : value.trim();
    if (!v || !validValue(v)) { setError(channel === 'email' ? tr('Enter a valid email address') : tr('Enter a valid phone number')); return; }
    setError(null);
    if (needPassword) setStep('password'); else void sendCode();
  };

  const sendCode = async () => {
    const v = mode === 'verify' ? current : value.trim();
    if (!v) { setError(channel === 'email' ? tr('Enter a valid email address') : tr('Enter a valid phone number')); return; }
    if (needPassword && !password) { setError(tr('Enter your current password')); return; }
    setBusy(true); setError(null);
    try {
      const r = await call<{ sent: boolean; target: string; devCode?: string }>('/api/me/contact/start', {
        method: 'POST', body: JSON.stringify({ channel, value: v, ...(needPassword ? { password } : {}) }),
      });
      setTarget(r.target || v);
      setDelivered(!!r.sent);
      setDevCode(r.devCode || null);
      setCode('');
      setStep('code');
      setResendIn(RESEND_SECONDS);
      toast.success(r.sent ? tr('Code sent') : tr('Code created'));
    } catch (e: any) {
      setError(e?.message || tr('Could not send the code. Try again or use another channel.'));
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    if (code.length !== 6) return;
    setBusy(true); setError(null);
    try {
      await call('/api/me/contact/verify', { method: 'POST', body: JSON.stringify({ channel, code }) });
      toast.success(tr('Verified'));
      reset();
      reload();
    } catch (e: any) {
      setError(e?.message || tr('That code is not right'));
    } finally { setBusy(false); }
  };

  const title = channel === 'email' ? tr('Email address') : tr('Phone number');

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
            {current ? <StatusBadge verified={verified} /> : null}
          </div>
          <p className="mt-0.5 break-all text-sm font-semibold text-foreground">
            {current || (channel === 'email' ? tr('No email address') : tr('No phone number'))}
          </p>
          {current && !verified ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {channel === 'phone' ? tr('Verify your phone to use it for SMS security and account recovery.') : tr('Verify your email to use it for sign-in alerts and account recovery.')}
            </p>
          ) : null}
        </div>
      </div>

      {step === 'view' ? (
        <div className="flex flex-wrap gap-2 border-t border-border bg-muted/20 px-4 py-3">
          {current && !verified ? (
            <button type="button" className={primary} onClick={openVerify}><ShieldCheck className="h-3.5 w-3.5" />{tr('Verify')}</button>
          ) : null}
          <button type="button" className={btn} onClick={openChange}>
            {current ? (channel === 'email' ? tr('Change email') : tr('Change phone number')) : (channel === 'email' ? tr('Add email') : tr('Add phone number'))}
          </button>
        </div>
      ) : null}

      {step !== 'view' ? (
        <div className="space-y-3 border-t border-border bg-muted/20 p-4">
          {smsOff ? (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {isDevFallback
                ? tr('SMS is not configured yet. In development the code is shown on screen instead.')
                : tr('SMS delivery is not configured on this server yet. Phone verification codes cannot be sent until an approved sender ID is set.')}
            </p>
          ) : null}

          {step === 'enter' ? (
            <>
              <p className="text-sm font-semibold">
                {mode === 'verify'
                  ? (channel === 'email' ? tr('Confirm your email address') : tr('Confirm your phone number'))
                  : channel === 'email' ? tr('Enter the new email address') : tr('Enter the new phone number')}
              </p>
              <input
                className={`${input} ${mode === 'verify' ? 'opacity-80' : ''}`}
                type={channel === 'email' ? 'email' : 'tel'}
                inputMode={channel === 'email' ? 'email' : 'tel'}
                autoComplete="off"
                readOnly={mode === 'verify'}
                placeholder={channel === 'email' ? tr('New email address') : tr('New phone number')}
                value={mode === 'verify' ? current : value}
                onChange={(e) => { setValue(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') next(); }}
              />
              <p className="text-xs text-muted-foreground">{tr('We will send a 6-digit code to confirm it is yours.')}</p>
              {error ? <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive"><XCircle className="h-3.5 w-3.5" />{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primary} disabled={busy || (mode === 'change' && !value.trim())} onClick={next}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{needPassword ? tr('Continue') : tr('Send code')}
                </button>
                <button type="button" className={btn} disabled={busy} onClick={reset}>{tr('Cancel')}</button>
              </div>
            </>
          ) : null}

          {step === 'password' ? (
            <>
              <p className="text-sm font-semibold">{tr('Enter your password to continue')}</p>
              <p className="text-xs text-muted-foreground">
                {tr('A code will be sent to')} <span className="font-semibold break-all">{mode === 'verify' ? current : value.trim()}</span>
              </p>
              <input
                className={input}
                type="text"
                name={`wev-contact-pw-${channel}`}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                autoFocus
                style={password ? ({ WebkitTextSecurity: 'disc' } as React.CSSProperties) : undefined}
                placeholder={tr('Enter your current password')}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && password) void sendCode(); }}
              />
              <a href="/auth?view=forgot" className="inline-block text-xs font-semibold text-primary hover:underline">{tr('Forgot password?')}</a>
              {error ? <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive"><XCircle className="h-3.5 w-3.5" />{error}</p> : null}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primary} disabled={busy || !password} onClick={sendCode}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{tr('Send code')}
                </button>
                <button type="button" className={btn} disabled={busy} onClick={() => { setPassword(''); setError(null); setStep('enter'); }}>{tr('Back')}</button>
                <button type="button" className={btn} disabled={busy} onClick={reset}>{tr('Cancel')}</button>
              </div>
            </>
          ) : null}

          {step === 'code' ? (
            <>
              <p className="text-sm">
                {delivered ? tr('Enter the 6-digit code we sent to') : tr('Enter the 6-digit code for')} <span className="font-semibold break-all">{target}</span>
              </p>
              <p className="text-xs text-muted-foreground">{tr('The code expires in 10 minutes.')}</p>
              {devCode ? (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  {tr('Development: no delivery is configured, so the code is shown here:')} <b className="font-mono tracking-widest">{devCode}</b>
                </p>
              ) : null}
              <OtpDigitBoxes
                label={tr('Verification code')}
                value={code}
                onChange={(next) => { setCode(next); setError(null); }}
                autoFocus
              />
              {error ? <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-destructive"><XCircle className="h-3.5 w-3.5" />{error}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={primary} disabled={busy || code.length !== 6} onClick={confirm}>
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{tr('Confirm')}
                </button>
                <button type="button" className={btn} disabled={busy || resendIn > 0} onClick={sendCode}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {resendIn > 0 ? `${tr('Resend code')} (${resendIn}s)` : tr('Resend code')}
                </button>
                <button type="button" className={btn} disabled={busy} onClick={reset}>{tr('Cancel')}</button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ContactInfoPanel({ token, focus }: { token: string; focus?: ContactChannel }) {
  const tr = useSettingsTr();
  const [info, setInfo] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    return api(token)('/api/me/contact')
      .then((d) => setInfo(d && typeof d === 'object' ? d : {}))
      .catch((e) => { setFailed(true); toast.error(e?.message || tr('Could not load contact info')); });
  }, [token, tr]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
  useEffect(() => { void load(); }, [load]);
  if (failed && !info) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-muted-foreground">{tr('Could not load contact info')}</p>
        <button type="button" className={btn} onClick={() => void load()}><RotateCcw className="h-3.5 w-3.5" />{tr('Try again')}</button>
      </div>
    );
  }
  if (!info) return <Spinner />;
  const order: ContactChannel[] = focus === 'phone' ? ['phone', 'email'] : ['email', 'phone'];
  return (
    <div className="space-y-3">
      {order.map((c) => <ContactRow key={c} token={token} channel={c} info={info} reload={() => void load()} />)}
      <p className="px-1 text-xs text-muted-foreground">{tr('Changing your email or phone needs a code sent to the new address, so nobody can swap it without access to it.')}</p>
    </div>
  );
}

// ------------------------------------------------------------------ recovery contacts
export function RecoveryContactsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [list, setList] = useState<Card[] | null>(null);
  const load = useCallback(() => call<Card[]>('/api/me/recovery-contacts').then(setList).catch((e) => toast.error(e.message)), [token]);  
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tr('Pick 2 to 5 friends who can confirm it is really you if you ever lose access. They are not notified and get no access to your account.')}</p>
      <AddByUsername label={tr('Add')} onAdd={async (username) => { await call('/api/me/recovery-contacts', { method: 'POST', body: JSON.stringify({ username }) }); load(); }} />
      {!list ? <Spinner /> : !list.length ? <Empty>{tr('No recovery contacts yet.')}</Empty> : <div className="divide-y divide-border/60">{list.map((u) => <Person key={u.id} u={u} right={<button type="button" className={btn} onClick={async () => { await call(`/api/me/recovery-contacts/${u.id}`, { method: 'DELETE' }); load(); }}>{tr('Remove')}</button>} />)}</div>}
    </div>
  );
}

// ------------------------------------------------------------------ security checkup
export function SecurityCheckupPanel({ token, onOpen }: { token: string; onOpen?: (optionId: string) => void }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [data, setData] = useState<any>(null);
  useEffect(() => { call('/api/me/security-checkup').then(setData).catch((e) => toast.error(e.message)); }, [token]);  
  if (!data) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-xl border border-border p-3">
        <ShieldCheck className={`w-8 h-8 ${data.score === data.total ? 'text-emerald-500' : 'text-amber-500'}`} />
        <div><p className="text-sm font-bold">{data.score} of {data.total} checks look good</p><p className="text-xs text-muted-foreground">{tr('Fix the ones marked below to make your account harder to take over.')}</p></div>
      </div>
      <ul className="divide-y divide-border/60">
        {data.items.map((i: any) => (
          <li key={i.id} className="py-2.5 flex items-start gap-3">
            {i.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <XCircle className="w-4 h-4 text-amber-500 mt-0.5" />}
            <div className="flex-1"><p className="text-sm font-semibold">{i.label}</p><p className="text-xs text-muted-foreground">{i.detail}</p></div>
            {onOpen && <button type="button" className={btn} onClick={() => onOpen(i.optionId)}>{i.ok ? tr('Review') : tr('Fix')}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ limit past posts
export function LimitPastPostsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => call<{ publicPosts: number }>('/api/me/limit-past-posts').then((r) => setCount(r.publicPosts)).catch((e) => toast.error(e.message)), [token]);  
  useEffect(() => { load(); }, [load]);
  if (count === null) return <Spinner />;
  const run = async () => {
    if (!window.confirm(`Change ${count} public post(s) to Friends? To make one public again you will have to edit it individually.`)) return;
    setBusy(true);
    try { const r = await call<{ changed: number }>('/api/me/limit-past-posts', { method: 'POST', body: JSON.stringify({ confirm: true }) }); toast.success(`${r.changed} post(s) now visible to friends only`); load(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3">
      <p className="text-sm">{tr('You have ')}<b>{count}</b> public post(s) on your profile.</p>
      <p className="text-xs text-muted-foreground">This changes every public post you have made to Friends in one step. Posts shared with a custom audience, friends or only you are left as they are. Posts in Spaces are not touched.</p>
      <button type="button" className={primary} disabled={busy || count === 0} onClick={run}>{busy ? tr('Updating...') : tr('Limit past posts')}</button>
    </div>
  );
}

// ------------------------------------------------------------------ ad preferences
export function AdPreferencesPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const [rows, setRows] = useState<any[] | null>(null);
  const load = useCallback(() => call<any[]>('/api/me/ad-preferences').then(setRows).catch((e) => toast.error(e.message)), [token]);  
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{tr('Ads you hid or marked as not relevant are kept out of your feed. Remove an entry to allow that ad again.')}</p>
      {!rows ? <Spinner /> : !rows.length ? <Empty>{tr('You have not hidden any ads.')}</Empty> : (
        <ul className="divide-y divide-border/60">{rows.map((r) => (
          <li key={r.id} className="py-2.5 flex items-center gap-3">
            <div className="flex-1"><p className="text-sm font-semibold">{r.adName}</p><p className="text-xs text-muted-foreground">{r.action === 'HIDE' ? tr('Hidden') : tr('Not relevant')} · {when(r.createdAt)}</p></div>
            <button type="button" className={btn} onClick={async () => { await call(`/api/me/ad-preferences/${r.id}`, { method: 'DELETE' }); load(); }}>{tr('Allow again')}</button>
          </li>))}</ul>
      )}
    </div>
  );
}
