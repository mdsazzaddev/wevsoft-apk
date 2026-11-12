import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AlertTriangle, Building2, Copy, KeyRound, Plus, User, X } from 'lucide-react';
import api from '../../../../lib/api';
import type { DeveloperApp } from '../../devApi';
import { ConfirmDialog, cx } from '../../devUi';
import { btn, fmtDate } from '../ui';
import { StepHeader } from './WebhookFieldsPanel';

/**
 * Step 2 "Generate access tokens" (Messenger style). Backed by
 *   GET/POST   /api/developer/apps/:id/token-connections
 *   POST       /api/developer/apps/:id/token-connections/:cid/token   (revokes the previous one)
 *   DELETE     /api/developer/apps/:id/token-connections/:cid
 */
interface Connection {
  id: string;
  type: 'account' | 'space';
  targetId: string;
  name: string;
  avatar: string | null;
  handle: string | null;
  scopes: string[];
  connectedAt: string;
  lastGeneratedAt: string | null;
  tokenPrefix: string | null;
  tokenExpiresAt: string | null;
  tokenActive: boolean;
}
interface ConnectionsResponse {
  connections: Connection[];
  candidates: { account: { id: string; name: string; username?: string; avatar: string | null } | null; spaces: { id: string; name: string; handle?: string | null; avatar: string | null }[] };
  scopes: { account: string[]; space: string[] };
  mode: string;
}
const errMsg = (e: any, f: string) => e?.response?.data?.error || e?.response?.data?.message || e?.message || f;

function Avatar({ src, type, name }: { src: string | null; type: 'account' | 'space'; name: string }) {
  if (src) return <img src={src} alt="" className="w-[32px] h-[32px] rounded-full object-cover shrink-0" />;
  const Icon = type === 'space' ? Building2 : User;
  return (
    <span aria-label={name} className="w-[32px] h-[32px] rounded-full bg-[var(--dc-hover)] text-[var(--dc-muted)] grid place-items-center shrink-0">
      <Icon size={15} />
    </span>
  );
}

function ScopeChips({ scopes }: { scopes: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {scopes.map((s) => (
        <span key={s} className="rounded bg-[var(--dc-hover)] px-1 py-px text-[9.5px] text-[var(--dc-muted)] dc-code">{s}</span>
      ))}
    </span>
  );
}

export function AccessTokensCard({ app }: { app: DeveloperApp }) {
  const queryClient = useQueryClient();
  const key = ['developerConsole', 'tokenConnections', app.id];
  const q = useQuery({ queryKey: key, queryFn: async () => (await api.get(`/api/developer/apps/${app.id}/token-connections`)).data as ConnectionsResponse });
  const [connectOpen, setConnectOpen] = useState(false);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [issued, setIssued] = useState<{ name: string; token: string; expiresAt: string; previousRevoked: boolean } | null>(null);
  const [disconnecting, setDisconnecting] = useState<Connection | null>(null);
  const [regen, setRegen] = useState<Connection | null>(null);

  const d = q.data;
  const connectedTargets = new Set((d?.connections || []).map((c) => (c.type === 'space' ? `space:${c.targetId}` : 'account')));

  const connect = useMutation({
    mutationFn: async (targets: string[]) => {
      for (const t of targets) {
        await api.post(`/api/developer/apps/${app.id}/token-connections`, t === 'account' ? { type: 'account' } : { type: 'space', spaceId: t.slice(6) });
      }
      return targets.length;
    },
    onSuccess: (n) => {
      toast.success(n === 1 ? 'Connected' : `${n} connected`);
      setConnectOpen(false);
      setPick({});
    },
    onError: (e: any) => toast.error(errMsg(e, 'Could not connect')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const generate = useMutation({
    mutationFn: async (c: Connection) => (await api.post(`/api/developer/apps/${app.id}/token-connections/${c.id}/token`)).data as { accessToken: string; expiresAt: string; previousRevoked: boolean },
    onSuccess: (r, c) => {
      setIssued({ name: c.name, token: r.accessToken, expiresAt: r.expiresAt, previousRevoked: r.previousRevoked });
      setRegen(null);
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(errMsg(e, 'Could not generate a token')),
  });
  const disconnect = useMutation({
    mutationFn: async (c: Connection) => (await api.delete(`/api/developer/apps/${app.id}/token-connections/${c.id}`)).data,
    onSuccess: () => {
      toast.success('Disconnected. Its token was revoked.');
      setDisconnecting(null);
    },
    onError: (e: any) => toast.error(errMsg(e, 'Could not disconnect')),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const onGenerate = (c: Connection) => (c.tokenActive ? setRegen(c) : generate.mutate(c));
  const chosen = Object.keys(pick).filter((k) => pick[k]);

  return (
    <section className="dc-card p-[16px] sm:p-[20px] space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StepHeader n={2} title="Generate access tokens" subtitle="Connect your account or a WevSpace you manage, then generate a token your server uses to call the API for it." />
        <button type="button" onClick={() => setConnectOpen(true)} disabled={!d} className={cx(btn.primary, btn.sm)}>
          <Plus size={13} /> Connect
        </button>
      </div>

      {q.isLoading ? (
        <p className="text-[12px] text-[var(--dc-muted)]">Loading...</p>
      ) : q.isError ? (
        <p className="text-[12px] text-[var(--dc-red,#ef4444)]">{errMsg(q.error, 'Could not load connections')}</p>
      ) : !Array.isArray(d?.connections) || !d.connections.length ? (
        <div className="rounded-[10px] border border-dashed border-[var(--dc-border)] px-4 py-5 text-center text-[12px] text-[var(--dc-muted)]">
          Nothing connected yet. Click <b>Connect</b> to add your account or a Space.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[10px] border border-[var(--dc-border)]" role="table" aria-label="Connected accounts and Spaces">
          <div role="row" className="hidden md:grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-3 py-2 bg-[var(--dc-hover)] text-[11px] font-semibold text-[var(--dc-text-2)]">
            <span role="columnheader">Account / Space</span>
            <span role="columnheader">Scopes</span>
            <span role="columnheader">Token</span>
            <span role="columnheader" className="text-right">Actions</span>
          </div>
          {d.connections.map((c) => (
            <div key={c.id} role="row" className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-3 gap-y-2 items-center border-t border-[var(--dc-border)] px-3 py-[10px]">
              <div role="cell" className="flex items-center gap-2.5 min-w-0">
                <Avatar src={c.avatar} type={c.type} name={c.name} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-semibold text-[var(--dc-text)]">{c.name}</span>
                    <span className="rounded bg-[var(--dc-blue-soft)] px-1 py-px text-[9.5px] font-medium text-[var(--dc-blue)]">{c.type === 'space' ? 'Space' : 'Account'}</span>
                  </div>
                  <p className="truncate text-[10.5px] text-[var(--dc-faint)] dc-code">ID {c.targetId}</p>
                  <p className="text-[10.5px] text-[var(--dc-muted)]">Connected {fmtDate(c.connectedAt)}</p>
                </div>
              </div>
              <div role="cell"><ScopeChips scopes={c.scopes} /></div>
              <div role="cell" className="text-[11px] text-[var(--dc-muted)]">
                {c.tokenPrefix ? (
                  <>
                    <span className="dc-code text-[var(--dc-text-2)]">{c.tokenPrefix}...</span>{' '}
                    {c.tokenActive ? null : <span className="text-[var(--dc-red,#ef4444)]">(expired or revoked)</span>}
                    <p>Last generated {fmtDate(c.lastGeneratedAt)}</p>
                  </>
                ) : (
                  'No token yet'
                )}
              </div>
              <div role="cell" className="flex items-center gap-2 md:justify-end">
                <button type="button" onClick={() => onGenerate(c)} disabled={generate.isPending} className={cx(btn.secondary, btn.sm)}>
                  <KeyRound size={13} /> {generate.isPending && generate.variables?.id === c.id ? 'Generating...' : c.tokenPrefix ? 'Regenerate' : 'Generate token'}
                </button>
                <button type="button" onClick={() => setDisconnecting(c)} className={cx(btn.ghost, btn.sm)}>Disconnect</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {connectOpen && d && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Connect to app">
          <div className="dc-card w-full max-w-[460px] p-[18px] space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-[var(--dc-text)]">Connect to {app.name}</h3>
              <button type="button" aria-label="Close" onClick={() => setConnectOpen(false)} className="text-[var(--dc-muted)]"><X size={16} /></button>
            </div>
            <p className="text-[12px] text-[var(--dc-muted)]">
              {app.name} will be able to act for what you select, with these permissions. {d.mode === 'development' && 'In Development mode only the app\'s team can connect.'}
            </p>
            {d.candidates.account && (
              <label className={cx('flex items-start gap-2.5 rounded-[10px] border border-[var(--dc-border)] p-2.5', connectedTargets.has('account') ? 'opacity-60' : 'cursor-pointer hover:bg-[var(--dc-hover)]')}>
                <input type="checkbox" className="mt-2" disabled={connectedTargets.has('account')} checked={connectedTargets.has('account') || Boolean(pick.account)} onChange={(e) => setPick((p) => ({ ...p, account: e.target.checked }))} />
                <Avatar src={d.candidates.account.avatar} type="account" name={d.candidates.account.name} />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold text-[var(--dc-text)]">{d.candidates.account.name} <span className="font-normal text-[var(--dc-muted)]">(your WevChat account)</span></span>
                  <ScopeChips scopes={d.scopes.account} />
                  {connectedTargets.has('account') && <span className="block text-[10.5px] text-[var(--dc-faint)]">Already connected</span>}
                </span>
              </label>
            )}
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--dc-faint)]">Spaces you own or admin</p>
            {d.candidates.spaces.length === 0 ? (
              <p className="text-[12px] text-[var(--dc-muted)]">You don't own or admin any WevSpace.</p>
            ) : (
              d.candidates.spaces.map((s) => {
                const k = `space:${s.id}`;
                const done = connectedTargets.has(k);
                return (
                  <label key={s.id} className={cx('flex items-start gap-2.5 rounded-[10px] border border-[var(--dc-border)] p-2.5', done ? 'opacity-60' : 'cursor-pointer hover:bg-[var(--dc-hover)]')}>
                    <input type="checkbox" className="mt-2" disabled={done} checked={done || Boolean(pick[k])} onChange={(e) => setPick((p) => ({ ...p, [k]: e.target.checked }))} />
                    <Avatar src={s.avatar} type="space" name={s.name} />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-[var(--dc-text)]">{s.name}{s.handle ? <span className="font-normal text-[var(--dc-muted)]"> @{s.handle}</span> : null}</span>
                      <ScopeChips scopes={d.scopes.space} />
                      {done && <span className="block text-[10.5px] text-[var(--dc-faint)]">Already connected</span>}
                    </span>
                  </label>
                );
              })
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setConnectOpen(false)} className={cx(btn.secondary, btn.sm)}>Cancel</button>
              <button type="button" disabled={!chosen.length || connect.isPending} onClick={() => connect.mutate(chosen)} className={cx(btn.primary, btn.sm)}>
                {connect.isPending ? 'Connecting...' : `Connect${chosen.length > 1 ? ` (${chosen.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {issued && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Access token">
          <div className="dc-card w-full max-w-[520px] p-[18px] space-y-3">
            <h3 className="text-[14px] font-semibold text-[var(--dc-text)]">Access token for {issued.name}</h3>
            <div className="flex items-start gap-2 rounded-[8px] bg-[var(--dc-amber-soft,var(--dc-hover))] p-2.5 text-[11.5px] text-[var(--dc-text-2)]">
              <AlertTriangle size={14} className="shrink-0 mt-[1px] text-[var(--dc-amber,#f59e0b)]" />
              <span>
                Copy it now. It won't be shown again. Keep it on your server only and never in client code.
                {issued.previousRevoked && ' The previous token for this connection has been revoked.'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 break-all rounded-[6px] border border-[var(--dc-border)] bg-[var(--dc-hover)] p-2 text-[11.5px] dc-code">{issued.token}</code>
              <button
                type="button"
                className={cx(btn.secondary, btn.sm)}
                onClick={() => navigator.clipboard?.writeText(issued.token).then(() => toast.success('Token copied'), () => toast.error('Copy failed'))}
              >
                <Copy size={13} /> Copy
              </button>
            </div>
            <p className="text-[11px] text-[var(--dc-muted)]">Expires {fmtDate(issued.expiresAt)}. Send it as <span className="dc-code">Authorization: Bearer &lt;token&gt;</span>.</p>
            <div className="flex justify-end">
              <button type="button" onClick={() => setIssued(null)} className={cx(btn.primary, btn.sm)}>I've copied it</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(regen)}
        onClose={() => setRegen(null)}
        onConfirm={() => regen && generate.mutate(regen)}
        title="Generate a new token?"
        description={<>The current token for <b>{regen?.name}</b> stops working immediately.</>}
        confirmLabel="Generate new token"
        busy={generate.isPending}
      />
      <ConfirmDialog
        open={Boolean(disconnecting)}
        onClose={() => setDisconnecting(null)}
        onConfirm={() => disconnecting && disconnect.mutate(disconnecting)}
        title={`Disconnect ${disconnecting?.name || ''}?`}
        description="Its access token is revoked right away. You can connect it again later."
        confirmLabel="Disconnect"
        busy={disconnect.isPending}
      />
    </section>
  );
}