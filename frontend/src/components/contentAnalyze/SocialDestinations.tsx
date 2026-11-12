/**
 * Batch Upload — connected-account destinations + the "Connect platform" flow.
 * Only accounts the user connected (and whose platform an admin enabled) are listed; WebSoft is always there.
 */
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, ExternalLink, Loader2, Plus, RefreshCw, Star, Trash2, X } from 'lucide-react';
import WevsoftMark from '../auth/WevsoftMark';
import {
  ACCOUNT_TYPE_LABEL, connectPlatform, disconnectConnection, refreshConnection, setDefaultConnection,
  type SocialConnection, type SocialDelivery, type SocialPlatformInfo,
} from '../../lib/socialConnections';

export function Brand({ id, size = 20 }: { id: string; size?: number }) {
  const s = { width: size, height: size };
  switch (id) {
    case 'wevsoft': return <span className="inline-flex shrink-0 items-center justify-center" style={{ height: size, width: Math.round(size * 375 / 186) }}><WevsoftMark className="h-full w-auto" /></span>;
    case 'facebook': return <svg style={s} viewBox="0 0 24 24" className="shrink-0"><circle cx="12" cy="12" r="12" fill="#1877F2" /><path fill="#fff" d="M15.1 24v-8.8h2.6l.4-3.2h-3V10c0-.9.3-1.6 1.6-1.6h1.6V5.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V12H9.3v3.2h2.6V24z" /></svg>;
    case 'instagram': return <span style={{ ...s, background: 'radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285AEB 90%)' }} className="grid shrink-0 place-items-center rounded-[6px]"><svg viewBox="0 0 24 24" style={{ width: size * 0.66, height: size * 0.66 }} fill="none" stroke="#fff" strokeWidth="2.2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.9" /><circle cx="17.3" cy="6.7" r="1" fill="#fff" stroke="none" /></svg></span>;
    case 'youtube': return <svg style={{ width: size * 1.1, height: size }} viewBox="0 0 26 24" className="shrink-0"><rect x="0.5" y="4" width="25" height="16" rx="4.5" fill="#FF0000" /><path d="M10.5 8.3v7.4l6.4-3.7z" fill="#fff" /></svg>;
    case 'tiktok': return <span style={s} className="grid shrink-0 place-items-center rounded-full bg-black"><svg viewBox="0 0 24 24" style={{ width: size * 0.6, height: size * 0.6 }}><path fill="#25F4EE" d="M15.6 2.2c.3 2.3 1.8 3.8 4 4v3.1c-1.4 0-2.8-.4-4-1.2v6.1a5.5 5.5 0 1 1-5.5-5.5h.8v3.2a2.4 2.4 0 1 0 1.6 2.3V2.2z" transform="translate(-0.8 -0.6)" /><path fill="#FE2C55" d="M15.6 2.2c.3 2.3 1.8 3.8 4 4v3.1c-1.4 0-2.8-.4-4-1.2v6.1a5.5 5.5 0 1 1-5.5-5.5h.8v3.2a2.4 2.4 0 1 0 1.6 2.3V2.2z" transform="translate(0.8 0.6)" /><path fill="#fff" d="M15.6 2.2c.3 2.3 1.8 3.8 4 4v3.1c-1.4 0-2.8-.4-4-1.2v6.1a5.5 5.5 0 1 1-5.5-5.5h.8v3.2a2.4 2.4 0 1 0 1.6 2.3V2.2z" /></svg></span>;
    case 'x': return <span style={s} className="grid shrink-0 place-items-center rounded-full bg-black"><svg viewBox="0 0 24 24" style={{ width: size * 0.52, height: size * 0.52 }} fill="#fff"><path d="M17.8 2.5h3.3l-7.2 8.2 8.5 10.8h-6.6l-5.2-6.6-5.9 6.6H1.4l7.7-8.8L1 2.5h6.8l4.7 6.1zm-1.2 17.1h1.8L6.6 4.3H4.7z" /></svg></span>;
    case 'linkedin': return <span style={s} className="grid shrink-0 place-items-center rounded-[5px] bg-[#0A66C2]"><svg viewBox="0 0 24 24" style={{ width: size * 0.62, height: size * 0.62 }} fill="#fff"><path d="M5.4 8.6h3.1V19H5.4zM7 3.8a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6M10.4 8.6h3v1.4c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.2 3.9 5V19h-3.1v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V19h-3.1z" /></svg></span>;
    default: return <span style={s} className="rounded-full bg-slate-300" />;
  }
}

const DELIVERY_DOT: Record<SocialDelivery['status'], { cls: string; label: string }> = {
  queued: { cls: 'bg-amber-400', label: 'Queued' },
  publishing: { cls: 'bg-blue-500 animate-pulse', label: 'Publishing…' },
  published: { cls: 'bg-emerald-500', label: 'Published' },
  failed: { cls: 'bg-rose-500', label: 'Failed' },
  unsupported: { cls: 'bg-slate-400', label: 'Coming soon' },
  canceled: { cls: 'bg-slate-300', label: 'Canceled' },
};

export function AccountAvatar({ conn, size = 22, dim, delivery }: { conn: Pick<SocialConnection, 'name' | 'avatarUrl' | 'platform'>; size?: number; dim?: boolean; delivery?: SocialDelivery }) {
  const [broken, setBroken] = useState(false);
  const badge = Math.max(10, Math.round(size * 0.5));
  return (
    <span className={`relative inline-block shrink-0 ${dim ? 'opacity-35 grayscale' : ''}`} style={{ width: size, height: size }}>
      {conn.avatarUrl && !broken
        ? <img src={conn.avatarUrl} alt="" onError={() => setBroken(true)} className="h-full w-full rounded-full object-cover ring-1 ring-black/5" referrerPolicy="no-referrer" />
        : <span className="grid h-full w-full place-items-center rounded-full bg-slate-200 text-[10px] font-bold uppercase text-slate-600 dark:bg-white/10 dark:text-slate-200">{conn.name.slice(0, 1)}</span>}
      <span className="absolute -bottom-[3px] -right-[3px] rounded-full bg-white p-[1px] dark:bg-[#151823]"><Brand id={conn.platform} size={badge} /></span>
      {delivery && <span className={`absolute -right-[2px] -top-[2px] h-[7px] w-[7px] rounded-full ring-2 ring-white dark:ring-[#151823] ${DELIVERY_DOT[delivery.status].cls}`} />}
    </span>
  );
}

function deliveryTitle(c: SocialConnection, d?: SocialDelivery) {
  const base = `${c.name} · ${ACCOUNT_TYPE_LABEL[c.accountType] || c.accountType}`;
  if (!d) return base;
  return `${base}\n${DELIVERY_DOT[d.status].label}${d.error ? `: ${d.error}` : ''}`;
}

/**
 * Destination picker: WebSoft toggle + connected accounts (avatar + platform badge). `boxed` is the
 * compact batch-default variant. The "+" opens the full list (pick, set defaults, connect more).
 */
export function AccountDestinations({ wevsoft, onWevsoft, value, onChange, accounts, deliveries = [], disabled, boxed, onConnect, onToggleDefault, size = 20, max = 4 }: {
  wevsoft?: boolean; onWevsoft?: (on: boolean) => void; value: string[]; onChange?: (ids: string[]) => void; accounts: SocialConnection[];
  deliveries?: SocialDelivery[]; disabled?: boolean; boxed?: boolean; onConnect: () => void; onToggleDefault?: (c: SocialConnection) => void; size?: number; max?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const toggle = (id: string) => onChange?.(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const byDelivery = new Map(deliveries.map((d) => [d.connectionId, d]));
  // Selected accounts first, then the rest; deliveries for accounts no longer connected are still shown in the list.
  const ordered = [...accounts].sort((a, b) => Number(value.includes(b.id)) - Number(value.includes(a.id)));
  const shown = ordered.slice(0, max);
  const hidden = ordered.length - shown.length;
  const orphan = deliveries.filter((d) => !accounts.some((a) => a.id === d.connectionId));
  return (
    <div ref={ref} className={`relative flex items-center ${boxed ? 'gap-1' : 'gap-[5px] rounded-full border border-[#e4e9f2] bg-white px-1.5 py-1 dark:border-white/10 dark:bg-white/[0.04]'}`}>
      {!boxed && onWevsoft && (
        <button type="button" disabled={disabled} title={`WebSoft: ${wevsoft ? 'on' : 'off'}`} onClick={() => onWevsoft(!wevsoft)} className={`grid shrink-0 place-items-center transition disabled:cursor-not-allowed ${wevsoft ? '' : 'opacity-35 grayscale'}`}>
          <Brand id="wevsoft" size={size} />
        </button>
      )}
      {shown.map((c) => {
        const on = value.includes(c.id);
        return (
          <button key={c.id} type="button" disabled={disabled} title={deliveryTitle(c, byDelivery.get(c.id))} onClick={() => toggle(c.id)}
            className={`relative grid shrink-0 place-items-center transition disabled:cursor-not-allowed ${boxed ? 'h-[26px] w-[26px] rounded-[7px] border border-[#e4e9f2] bg-white dark:border-white/10 dark:bg-white/[0.04]' : ''}`}>
            <AccountAvatar conn={c} size={boxed ? 18 : size} dim={!on} delivery={byDelivery.get(c.id)} />
          </button>
        );
      })}
      {orphan.slice(0, 2).map((d) => (
        <span key={d.id} title={`${d.name} (disconnected)\n${DELIVERY_DOT[d.status].label}${d.error ? `: ${d.error}` : ''}`}><AccountAvatar conn={d} size={boxed ? 18 : size} delivery={d} /></span>
      ))}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={accounts.length ? 'Choose destinations' : 'Connect platform'} title={accounts.length ? 'Choose destinations' : 'Connect platform'}
        className={boxed ? 'grid h-[26px] min-w-[30px] place-items-center rounded-full bg-[#eef1f6] px-2 text-[10.5px] font-semibold text-slate-600 hover:bg-[#e4e9f2] dark:bg-white/10 dark:text-slate-300' : 'grid h-5 min-w-5 place-items-center rounded-full px-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}>
        {hidden > 0 ? `+${hidden}` : boxed && !accounts.length ? <span className="inline-flex items-center gap-1"><Plus className="h-3 w-3" />Connect</span> : <Plus className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-[270px] rounded-xl border border-slate-200 bg-white p-1.5 text-[12px] shadow-xl dark:border-white/10 dark:bg-[#151823]">
          {onWevsoft && (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5">
              <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={!!wevsoft} disabled={disabled} onChange={() => onWevsoft(!wevsoft)} />
              <span className="inline-flex h-[22px] items-center"><WevsoftMark className="h-[13px] w-auto" /></span><span className="flex-1 font-medium">WebSoft</span>
            </label>
          )}
          {accounts.length === 0 && <p className="px-2 py-2 text-[11.5px] text-slate-500">No accounts connected yet. Connect a Facebook Page, YouTube channel and more to publish there too.</p>}
          <div className="max-h-[260px] overflow-y-auto">
            {ordered.map((c) => {
              const d = byDelivery.get(c.id);
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5">
                  <input type="checkbox" aria-label={`Publish to ${c.name}`} className="h-3.5 w-3.5 accent-blue-600" checked={value.includes(c.id)} disabled={disabled} onChange={() => toggle(c.id)} />
                  <AccountAvatar conn={c} size={22} delivery={d} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                    <span className="block truncate text-[10.5px] text-slate-500">{d ? `${DELIVERY_DOT[d.status].label}${d.error ? ` · ${d.error}` : ''}` : c.status !== 'active' ? 'Needs reconnect' : ACCOUNT_TYPE_LABEL[c.accountType]}</span>
                  </span>
                  {d?.externalUrl && <a href={d.externalUrl} target="_blank" rel="noreferrer" title="Open post" className="text-slate-400 hover:text-blue-600"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  {onToggleDefault && (
                    <button type="button" title={c.isDefault ? 'Default destination (click to remove)' : 'Use by default for new posts'} onClick={() => onToggleDefault(c)} className={c.isDefault ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}>
                      <Star className="h-3.5 w-3.5" fill={c.isDefault ? 'currentColor' : 'none'} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <button type="button" onClick={() => { setOpen(false); onConnect(); }} className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-2 py-2 text-left font-semibold text-[#2d55c8] hover:bg-[#eef3ff] dark:border-white/10 dark:hover:bg-blue-500/10">
            <Plus className="h-3.5 w-3.5" />Connect platform
          </button>
        </div>
      )}
    </div>
  );
}

/** Manage connected accounts: connect (OAuth popup), refresh, set default, disconnect. */
export function ConnectPlatformsModal({ token, connections, platforms, onClose, reload }: {
  token: string | null; connections: SocialConnection[]; platforms: SocialPlatformInfo[]; onClose: () => void; reload: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast.success(ok); await reload(); } catch (err) { toast.error(err instanceof Error ? err.message : 'Something went wrong'); } finally { setBusy(null); }
  };
  const connect = async (p: SocialPlatformInfo) => {
    setBusy(`connect:${p.platform}`);
    const r = await connectPlatform(token, p.platform);
    setBusy(null);
    if (r.ok) { toast.success(`Connected ${r.count ?? ''} ${p.label} account${r.count === 1 ? '' : 's'}`.replace('  ', ' ')); await reload(); }
    else if (r.error && r.error !== 'closed') toast.error(r.error);
    else await reload();
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Connect platforms" className="flex max-h-[86vh] w-full max-w-[560px] flex-col rounded-[16px] border border-[#e4e9f2] bg-white shadow-2xl dark:border-white/10 dark:bg-[#121521]">
        <div className="flex items-center justify-between border-b border-[#edf1f7] px-5 py-3.5 dark:border-white/[0.06]">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Connect platforms</h3>
            <p className="text-[11.5px] text-slate-500">Sign in and authorize each account you want to publish to. You can connect several per platform.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
          <div className="flex items-center gap-3 rounded-[12px] border border-[#e4e9f2] px-3 py-2.5 dark:border-white/10">
            <span className="inline-flex h-7 items-center"><WevsoftMark className="h-[15px] w-auto" /></span>
            <span className="flex-1 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">WebSoft<span className="ml-1.5 font-normal text-slate-500">your profile</span></span>
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" />Always on</span>
          </div>
          {platforms.length === 0 && (
            <p className="rounded-[12px] border border-dashed border-[#dfe5ee] px-4 py-6 text-center text-[12px] text-slate-500 dark:border-white/10">
              No other platforms are available yet. An admin has to add app credentials under <b>Admin → Social platforms</b>.
            </p>
          )}
          {platforms.map((p) => {
            const mine = connections.filter((c) => c.platform === p.platform);
            const connecting = busy === `connect:${p.platform}`;
            return (
              <div key={p.platform} className="rounded-[12px] border border-[#e4e9f2] dark:border-white/10">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <Brand id={p.platform} size={26} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{p.label}</span>
                    <span className="block truncate text-[10.5px] text-slate-500">{p.accounts} · {p.publishes}</span>
                  </span>
                  <button type="button" disabled={!!busy} onClick={() => connect(p)} className="inline-flex h-8 items-center gap-1.5 rounded-[9px] bg-[#2563eb] px-3 text-[11.5px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-50">
                    {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{mine.length ? 'Add another' : 'Connect'}
                  </button>
                </div>
                {mine.length > 0 && (
                  <ul className="border-t border-[#edf1f7] dark:border-white/[0.06]">
                    {mine.map((c) => (
                      <li key={c.id} className="flex items-center gap-2.5 px-3 py-2">
                        <AccountAvatar conn={c} size={26} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-medium text-slate-800 dark:text-slate-100">{c.name}</span>
                          <span className="block truncate text-[10.5px] text-slate-500">{ACCOUNT_TYPE_LABEL[c.accountType]}{c.username ? ` · ${c.username}` : ''}{c.pageName ? ` · via ${c.pageName}` : ''}</span>
                        </span>
                        {c.status !== 'active' && (
                          <button
                            type="button"
                            title={c.lastError || 'Reconnect this account'}
                            disabled={!!busy}
                            onClick={() => void connect(p)}
                            className="inline-flex h-7 items-center gap-1 rounded-full bg-rose-50 px-2.5 text-[10px] font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/10 dark:hover:bg-rose-500/20"
                          >
                            {busy === `connect:${p.platform}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                            Reconnect
                          </button>
                        )}
                        <button type="button" title={c.isDefault ? 'Default destination' : 'Use by default'} disabled={!!busy} onClick={() => run(`def:${c.id}`, () => setDefaultConnection(token, c.id, !c.isDefault))} className={`grid h-7 w-7 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 ${c.isDefault ? 'text-amber-500' : 'text-slate-400'}`}><Star className="h-3.5 w-3.5" fill={c.isDefault ? 'currentColor' : 'none'} /></button>
                        <button type="button" title="Refresh token" disabled={!!busy} onClick={() => run(`ref:${c.id}`, () => refreshConnection(token, c.id), 'Account refreshed')} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10">{busy === `ref:${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</button>
                        <button type="button" title="Disconnect" disabled={!!busy} onClick={() => { if (window.confirm(`Disconnect ${c.name}? Queued posts to it are canceled.`)) void run(`del:${c.id}`, () => disconnectConnection(token, c.id), 'Disconnected'); }} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-[#edf1f7] px-5 py-3 text-[10.5px] text-slate-500 dark:border-white/[0.06]">
          <span><Star className="mr-1 inline h-3 w-3 text-amber-500" fill="currentColor" />Default accounts are pre-selected for new posts.</span>
          <button type="button" onClick={onClose} className="inline-flex h-8 items-center rounded-[9px] border border-[#dfe5ee] bg-white px-3 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">Done</button>
        </div>
      </div>
    </div>
  );
}
