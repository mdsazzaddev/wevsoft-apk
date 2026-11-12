/**
 * Settings -> Content and feed: muted keywords, snoozed accounts, hidden posts.
 * Backed by /api/settings/muted-keywords, /api/settings/snoozed-accounts, /api/settings/hidden-posts.
 * Filtering itself is enforced on the server (home feed); these panels only manage the lists.
 */
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Clock, EyeOff, Plus, Type, X } from 'lucide-react';
import { useSettingsTr } from '../../i18n/settingsBn';
import { SettingsSection, SettingsRow, SettingsEmptyState, SettingsSkeleton, SettingsErrorState } from './SettingsPrimitives';

function api(token: string) {
  return async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
    const r = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `Request failed (${r.status})`);
    return j as T;
  };
}
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
const btn = 'inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted disabled:opacity-50';
const primary = 'inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50';
const input = 'h-9 flex-1 min-w-0 rounded-lg border border-border bg-background px-3 text-sm';

function useList<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => { load().then((d) => { setError(null); setData(d); }).catch((e) => setError(e.message || 'Failed to load')); }, [load]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}

function AddRow({ placeholder, label, onAdd, maxLength }: { placeholder: string; label: string; onAdd: (v: string) => Promise<void>; maxLength?: number }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.trim() || busy) return;
    setBusy(true);
    try { await onAdd(v.trim()); setV(''); } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input className={input} value={v} maxLength={maxLength} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <button type="submit" className={primary} disabled={busy || !v.trim()}><Plus className="w-3.5 h-3.5" />{label}</button>
    </form>
  );
}

export function MutedKeywordsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const load = useCallback(() => call<{ items: { id: string; keyword: string; createdAt: string }[]; limit: number }>('/api/settings/muted-keywords'), [token]);
  const { data, error, reload } = useList(load);
  const add = async (keyword: string) => { await call('/api/settings/muted-keywords', { method: 'POST', body: JSON.stringify({ keyword }) }); toast.success(tr('Keyword muted')); reload(); };
  const remove = async (id: string) => { try { await call(`/api/settings/muted-keywords/${encodeURIComponent(id)}`, { method: 'DELETE' }); reload(); } catch (e: any) { toast.error(e.message); } };
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{tr('Posts in your home feed that contain these words or phrases are hidden. Matching is not case-sensitive. Your own posts are never hidden.')}</p>
      <AddRow placeholder={tr('Add a word or phrase')} label={tr('Mute')} onAdd={add} maxLength={50} />
      {error ? <SettingsErrorState message={error} onRetry={reload} retryLabel={tr('Try again')} /> : !data ? <SettingsSkeleton /> : !data.items.length ? <SettingsEmptyState>{tr('No muted keywords yet.')}</SettingsEmptyState> : (
        <SettingsSection title={`${tr('Muted keywords')} (${data.items.length}/${data.limit})`}>
          {data.items.map((k) => (
            <SettingsRow key={k.id} icon={<Type size={16} />} title={k.keyword} description={day(k.createdAt)}
              trailing={<button type="button" className={btn} onClick={() => remove(k.id)} aria-label={`${tr('Unmute')} ${k.keyword}`}><X className="w-3.5 h-3.5" />{tr('Unmute')}</button>} />
          ))}
        </SettingsSection>
      )}
    </div>
  );
}

type Snoozed = { userId: string; expiresAt: string; user: { id: string; name: string; username?: string | null; avatar?: string | null } | null };

export function SnoozedAccountsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const load = useCallback(() => call<{ items: Snoozed[]; days: number }>('/api/settings/snoozed-accounts'), [token]);
  const { data, error, reload } = useList(load);
  const add = async (username: string) => {
    const u = await call<{ id: string }>(`/api/me/lookup?username=${encodeURIComponent(username.replace(/^@/, ''))}`);
    await call('/api/settings/snoozed-accounts', { method: 'POST', body: JSON.stringify({ userId: u.id }) });
    toast.success(tr('Snoozed for 30 days')); reload();
  };
  const remove = async (id: string) => { try { await call(`/api/settings/snoozed-accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }); reload(); } catch (e: any) { toast.error(e.message); } };
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{tr('Snoozed accounts are hidden from your home feed for 30 days, then come back automatically. They are not notified and you stay connected.')}</p>
      <AddRow placeholder={tr('Username')} label={tr('Snooze')} onAdd={add} />
      {error ? <SettingsErrorState message={error} onRetry={reload} retryLabel={tr('Try again')} /> : !data ? <SettingsSkeleton /> : !data.items.length ? <SettingsEmptyState>{tr('No snoozed accounts.')}</SettingsEmptyState> : (
        <SettingsSection title={tr('Snoozed accounts')}>
          {data.items.map((s) => (
            <SettingsRow key={s.userId}
              icon={s.user?.avatar ? <img src={s.user.avatar} alt="" className="w-10 h-10 rounded-2xl object-cover" /> : <Clock size={16} />}
              title={s.user?.name || s.user?.username || tr('Unknown account')}
              description={`${s.user?.username ? '@' + s.user.username + ' · ' : ''}${tr('Until')} ${day(s.expiresAt)}`}
              trailing={<button type="button" className={btn} onClick={() => remove(s.userId)}><X className="w-3.5 h-3.5" />{tr('End snooze')}</button>} />
          ))}
        </SettingsSection>
      )}
    </div>
  );
}

type Hidden = { postId: string; reason?: string | null; hiddenAt: string; preview: string | null; author: { id: string; name: string; username?: string | null } | null };

export function HiddenPostsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const call = api(token);
  const load = useCallback(() => call<Hidden[]>('/api/settings/hidden-posts?limit=100'), [token]);
  const { data, error, reload } = useList(load);
  const unhide = async (postId: string) => { try { await call(`/api/posts/${encodeURIComponent(postId)}/hide`, { method: 'DELETE' }); toast.success(tr('Post restored to your feed')); reload(); } catch (e: any) { toast.error(e.message); } };
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{tr('Posts you chose to hide from your feed. Unhide a post to let it appear again.')}</p>
      {error ? <SettingsErrorState message={error} onRetry={reload} retryLabel={tr('Try again')} /> : !data ? <SettingsSkeleton /> : !data.length ? <SettingsEmptyState>{tr('You have not hidden any posts.')}</SettingsEmptyState> : (
        <SettingsSection title={tr('Hidden posts')}>
          {data.map((h) => (
            <SettingsRow key={h.postId} icon={<EyeOff size={16} />}
              title={h.preview || tr('Preview not available')}
              description={`${h.author?.name ? h.author.name + ' · ' : ''}${tr('Hidden')} ${day(h.hiddenAt)}`}
              trailing={<button type="button" className={btn} onClick={() => unhide(h.postId)}>{tr('Unhide')}</button>} />
          ))}
        </SettingsSection>
      )}
    </div>
  );
}