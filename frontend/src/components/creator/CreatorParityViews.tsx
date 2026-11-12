import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AtSign, Activity, UserPlus, Users, Loader2, RefreshCw,
  Check, X, Search, Copy, ExternalLink, BookOpen, Film, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { creatorHubPath } from '../../lib/creatorHub';
import { consumerAppUrl, isBusinessAppHost } from '../../lib/consumerAppUrl';
import { useCreatorSpace, withCreatorSpaceQuery } from '../../lib/creatorSpaceContext';
import { HubEmpty, hubCard } from './hub/HubUI';

const authHeaders = (token: string | null) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

/** Open an item link: in-app, or on the main app when the Space hub (Business host) links to a post/reel. */
function useOpenLink() {
  const navigate = useNavigate();
  return (link: string | null | undefined) => {
    if (!link) return;
    if (/^https?:\/\//i.test(link)) { window.location.assign(link); return; }
    if (isBusinessAppHost() && !link.startsWith('/business')) { window.location.assign(consumerAppUrl(link)); return; }
    navigate(link);
  };
}
const fmtTime = (d: string | Date) => new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Flat empty state (one line), same as HubEmpty. */
function Empty({ title, sub }: { icon?: React.ElementType; title: string; sub: string }) {
  return (
    <div className={hubCard}>
      <HubEmpty text={<><span className="font-medium text-foreground">{title}.</span> {sub}</>} />
    </div>
  );
}

/** Mentions inbox — tags & @mentions + approve/deny queue (FB Review tags parity). */
export function MentionsView() {
  const token = useStore((s) => s.token);
  // Space hub: the Space's mentions (read-only). Tag approval is a personal setting.
  const { spaceId } = useCreatorSpace();
  const inSpace = !!spaceId;
  const open = useOpenLink();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'all' | 'pending'>(() => (searchParams.get('sub') === 'pending' ? 'pending' : 'all'));
  const [items, setItems] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingPref, setSavingPref] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(withCreatorSpaceQuery('/api/v1/jobs-creator/creator/mentions', spaceId), { headers: authHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setItems(data.items || []);
      setPending(data.pending || []);
      setUnread(data.unread || 0);
      setApprovalRequired(!!data.approvalRequired);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load mentions');
    } finally {
      setLoading(false);
    }
  }, [token, spaceId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
  useEffect(() => { void load(); }, [load]);

  const markRead = async () => {
    if (!token || !unread) return;
    await fetch(withCreatorSpaceQuery('/api/v1/jobs-creator/creator/mentions/read', spaceId), { method: 'POST', headers: authHeaders(token) });
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    toast.success('Marked as read');
  };

  const toggleApproval = async () => {
    if (!token) return;
    setSavingPref(true);
    try {
      const next = !approvalRequired;
      const res = await fetch('/api/v1/jobs-creator/creator/mentions/settings', {
        method: 'PUT',
        headers: authHeaders(token),
        body: JSON.stringify({ approvalRequired: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setApprovalRequired(!!data.approvalRequired);
      toast.success(next ? 'Tag approval on — new mentions need your OK' : 'Tag approval off');
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setSavingPref(false);
    }
  };

  const respond = async (id: string, accept: boolean) => {
    if (!token) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/mentions/${id}/${accept ? 'approve' : 'decline'}`, {
        method: 'POST',
        headers: authHeaders(token),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(accept ? 'Approved' : 'Declined');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Mentions</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{inSpace ? 'Where people @mention this Space.' : <>Review tags and @mentions — like Facebook’s Review tags.</>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unread > 0 && (
            <button type="button" onClick={() => void markRead()} className="h-9 rounded-lg border border-border px-3 text-[13px] font-semibold">
              Mark {unread} read
            </button>
          )}
          <button type="button" onClick={() => void load()} className="grid h-9 w-9 place-items-center rounded-lg border border-border"><RefreshCw className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {!inSpace && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold">Require approval before mentions</div>
          <div className="text-[11.5px] text-muted-foreground">When on, people who @mention you wait in Pending until you approve.</div>
        </div>
        <button
          type="button"
          disabled={savingPref}
          onClick={() => void toggleApproval()}
          className={`relative h-7 w-12 rounded-full transition-colors ${approvalRequired ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          aria-pressed={approvalRequired}
          aria-label="Toggle mention approval"
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${approvalRequired ? 'left-5' : 'left-0.5'}`} />
        </button>
      </div>}

      {!inSpace && <div className="flex gap-1 border-b border-border" role="tablist">
        {[
          { id: 'all' as const, label: 'All' },
          { id: 'pending' as const, label: `Pending${pending.length ? ` (${pending.length})` : ''}` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              const next = new URLSearchParams(searchParams);
              if (t.id === 'pending') next.set('sub', 'pending');
              else next.delete('sub');
              setSearchParams(next, { replace: true });
            }}
            className={`border-b-2 px-3 py-2 text-[13px] font-semibold ${tab === t.id ? 'border-border text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>}

      {loading ? <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : tab === 'pending' && !inSpace ? (
          !pending.length ? <Empty icon={AtSign} title="No pending reviews" sub={approvalRequired ? 'New mentions will land here for your OK.' : 'Turn on approval above to review mentions first.'} />
            : (
              <ul className="space-y-2">
                {pending.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                    {item.actor?.avatar ? <img src={item.actor.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      : <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-xs font-bold">{(item.actor?.name || '?')[0]}</span>}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">
                        <button type="button" className="hover:underline" onClick={() => open(item.link)}>
                          {item.actor?.name || item.actor?.username || 'Someone'} {item.text}
                        </button>
                      </div>
                      {item.preview && <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.preview}</div>}
                      <div className="mt-1 text-[11px] text-muted-foreground">{fmtTime(item.createdAt)} · {item.entityType}</div>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" disabled={busyId === item.id} onClick={() => void respond(item.id, true)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-50">
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button type="button" disabled={busyId === item.id} onClick={() => void respond(item.id, false)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[12px] font-semibold disabled:opacity-50">
                        <X className="h-3.5 w-3.5" /> Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
        ) : !items.length ? <Empty icon={AtSign} title="No mentions yet" sub={inSpace ? 'When someone @mentions this Space, it shows up here.' : 'When someone tags you, it shows up here.'} />
          : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card dark:divide-white/[0.06]">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => open(item.link)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-hover ${!item.read ? 'bg-primary/10' : ''}`}
                  >
                    {item.actor?.avatar ? <img src={item.actor.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
                      : <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-xs font-bold">{(item.actor?.name || '?')[0]}</span>}
                    {item.thumb && <img src={item.thumb} alt="" className="h-12 w-9 rounded-md object-cover" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-foreground">{item.text}</div>
                      {item.preview && <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{item.preview}</div>}
                      <div className="mt-1 text-[11px] text-muted-foreground">{fmtTime(item.createdAt)} · {item.entityType}</div>
                    </div>
                    {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
    </div>
  );
}

/** Creator activity log (FB Activity log parity — synthesized from real actions). */
export function ActivityLogView() {
  const token = useStore((s) => s.token);
  const { spaceId } = useCreatorSpace();
  const open = useOpenLink();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(withCreatorSpaceQuery('/api/v1/jobs-creator/creator/activity', spaceId), { headers: authHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setEvents(data.events || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [token, spaceId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Activity log</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{spaceId ? "This Space's recent content and moderation across the last 90 days." : 'Your recent creator actions across the last 90 days.'}</p>
        </div>
        <button type="button" onClick={() => void load()} className="grid h-9 w-9 place-items-center rounded-lg border border-border"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>
      {loading ? <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : !events.length ? <Empty icon={Activity} title="No activity yet" sub={spaceId ? 'Publish or moderate as this Space to fill this log.' : 'Publish, boost, or moderate to fill this log.'} />
        : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => open(e.link)}
                  className="flex w-full items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left hover:border-primary/40"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-foreground"><Activity className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{e.label}</div>
                    <div className="truncate text-[12px] text-muted-foreground">{e.detail}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{fmtTime(e.at)}</div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

/** Invite people via referral link (FB Invite people parity). */
export function InvitePeopleView() {
  const token = useStore((s) => s.token);
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/growth/invite', { headers: authHeaders(token) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed');
        setInfo(data);
      } catch (e: any) {
        toast.error(e.message || 'Failed to load invite');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Invite people</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Share your link so friends join Wevsoft — you earn XP and coins when they do.</p>
      </div>
      {loading ? <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : !info ? <Empty icon={UserPlus} title="Invite unavailable" sub="Try again in a moment." />
        : (
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-5">
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Your invite link</div>
              <div className="mt-2 break-all rounded-lg bg-muted/50 px-3 py-2 text-[13px] font-medium">{info.url}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copy(info.url)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground"><Copy className="h-3.5 w-3.5" /> Copy link</button>
                <button type="button" onClick={() => void copy(info.code)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold">Code: {info.code}</button>
              </div>
              <p className="mt-3 text-[12px] text-muted-foreground">Reward per successful invite: +{info.reward?.xp || 80} XP · +{info.reward?.coins || 40} coins</p>
            </section>
            <section className="grid grid-cols-3 gap-3">
              {[
                { label: 'Invited', value: info.stats?.invited ?? 0 },
                { label: 'Pending', value: info.stats?.pending ?? 0 },
                { label: 'Rewarded', value: info.stats?.rewarded ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-4 text-center">
                  <div className="text-[22px] font-semibold tabular-nums">{s.value}</div>
                  <div className="text-[11px] font-semibold text-muted-foreground">{s.label}</div>
                </div>
              ))}
              <Link to="/rewards" className="col-span-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border py-2.5 text-[13px] font-semibold hover:bg-surface-hover">
                Open Rewards <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </section>
          </div>
        )}
    </div>
  );
}

/** Co-author collaborations (FB Collaborations parity). */
export function CoAuthorView() {
  const token = useStore((s) => s.token);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/collabs', { headers: authHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setInvites(data.invites || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
  useEffect(() => { void load(); }, [load]);

  const search = async () => {
    if (!token || q.trim().length < 2) return;
    const res = await fetch(`/api/v1/jobs-creator/creator/collabs/search?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) });
    const data = await res.json().catch(() => ({}));
    setHits(data.users || []);
  };

  const invite = async (guestUserId: string) => {
    if (!token) return;
    setBusy(guestUserId);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/collabs', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ guestUserId, contentType: 'general', message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success('Invite sent');
      setMessage('');
      setHits([]);
      setQ('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const respond = async (id: string, accept: boolean) => {
    if (!token) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/v1/jobs-creator/creator/collabs/${id}/respond`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ accept }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(accept ? 'Accepted' : 'Declined');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (id: string) => {
    if (!token) return;
    const res = await fetch(`/api/v1/jobs-creator/creator/collabs/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || 'Failed');
      return;
    }
    toast.success('Cancelled');
    await load();
  };

  const incoming = invites.filter((i) => i.role === 'guest' && i.status === 'pending');
  const outgoing = invites.filter((i) => i.role === 'host');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Collaborations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Invite co-authors for posts and reels — like Facebook Collaborations.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="text-[13px] font-bold">Invite a creator</div>
        <div className="mt-2 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void search()} placeholder="Search username…" className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-8 pr-3 text-sm dark:bg-background" />
          </div>
          <button type="button" onClick={() => void search()} className="h-9 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground">Search</button>
        </div>
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional message" maxLength={300} className="mt-2 h-9 w-full rounded-lg border border-border px-3 text-sm dark:bg-background" />
        {hits.length > 0 && (
          <ul className="mt-2 space-y-1">
            {hits.map((u) => (
              <li key={u.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover">
                {u.avatar ? <img src={u.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-bold">{(u.name || '?')[0]}</span>}
                <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{u.name}</div><div className="text-[11px] text-muted-foreground">@{u.username}</div></div>
                <button type="button" disabled={busy === u.id} onClick={() => void invite(u.id)} className="rounded-lg bg-primary px-2.5 py-1 text-[11.5px] font-semibold text-primary-foreground disabled:opacity-50">Invite</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {loading ? <div className="grid h-32 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
        <>
          {incoming.length > 0 && (
            <section>
              <h3 className="mb-2 text-[13px] font-bold text-foreground">Incoming</h3>
              <ul className="space-y-2">
                {incoming.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">{i.host?.name || i.host?.username} invited you</div>
                      {i.message && <div className="text-[12px] text-muted-foreground">{i.message}</div>}
                    </div>
                    <button type="button" disabled={!!busy} onClick={() => void respond(i.id, true)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-2.5 text-[12px] font-semibold text-primary-foreground"><Check className="h-3.5 w-3.5" /> Accept</button>
                    <button type="button" disabled={!!busy} onClick={() => void respond(i.id, false)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[12px] font-semibold"><X className="h-3.5 w-3.5" /> Decline</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h3 className="mb-2 text-[13px] font-bold text-foreground">Your invites</h3>
            {!outgoing.length ? <Empty icon={Users} title="No invites yet" sub="Search a username above to collaborate." /> : (
              <ul className="space-y-2">
                {outgoing.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold">To {i.guest?.name || i.guest?.username}</div>
                      <div className="text-[11px] capitalize text-muted-foreground">{i.status} · {fmtTime(i.createdAt)}</div>
                    </div>
                    {i.status === 'pending' && (
                      <button type="button" onClick={() => void cancel(i.id)} className="text-[12px] font-semibold text-primary">Cancel</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Boost / promote hub using existing post & reel boost APIs. */
export function BoostPromoteView() {
  const token = useStore((s) => s.token);
  const [posts, setPosts] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/boosts', { headers: authHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPosts(data.posts || []);
      setReels(data.reels || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- API (re)fetch when its inputs change: the loader sets loading/data state around the request
  useEffect(() => { void load(); }, [load]);

  const toggle = async (item: { id: string; type: string; boosted: boolean }) => {
    if (!token) return;
    const key = `${item.type}:${item.id}`;
    setBusy(key);
    try {
      const path = item.type === 'reel' ? `/api/reels/${item.id}/boost` : `/api/posts/${item.id}/boost`;
      const res = await fetch(path, {
        method: item.boosted ? 'DELETE' : 'POST',
        headers: authHeaders(token),
        body: item.boosted ? undefined : JSON.stringify({ boosted: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Boost failed');
      toast.success(item.boosted ? 'Boost removed' : 'Boosted');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Boost failed');
    } finally {
      setBusy(null);
    }
  };

  const Row = ({ item }: { item: any }) => (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5">
      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.thumb ? <img src={item.thumb} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-muted-foreground">{item.type === 'reel' ? <Film className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold">{item.title}</div>
        <div className="text-[11px] text-muted-foreground">{item.type} · {item.boostsCount || 0} boosts</div>
      </div>
      <button
        type="button"
        disabled={busy === `${item.type}:${item.id}`}
        onClick={() => void toggle(item)}
        className={`h-8 rounded-lg px-2.5 text-[12px] font-semibold ${item.boosted ? 'border border-border text-primary' : 'bg-primary text-primary-foreground'}`}
      >
        {item.boosted ? 'Boosted' : 'Boost'}
      </button>
    </li>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Boost & promote</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Soft-boost your posts and reels to your network — same engine as the feed boost button.</p>
        </div>
        <button type="button" onClick={() => void load()} className="grid h-9 w-9 place-items-center rounded-lg border border-border"><RefreshCw className="h-3.5 w-3.5" /></button>
      </div>
      {loading ? <div className="grid h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[13px] font-bold">Posts</h3>
            {!posts.length ? <Empty icon={FileText} title="No posts" sub="Publish a post to boost it." /> : <ul className="space-y-2">{posts.map((p) => <Row key={p.id} item={p} />)}</ul>}
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-bold">Reels</h3>
            {!reels.length ? <Empty icon={Film} title="No reels" sub="Publish a reel to boost it." /> : <ul className="space-y-2">{reels.map((r) => <Row key={r.id} item={r} />)}</ul>}
          </div>
        </div>
      )}
      <p className="text-[12px] text-muted-foreground">Paid ads campaigns live in WevSpaces Ads. <Link to="/spaces" className="font-semibold text-primary">Open Spaces →</Link></p>
    </div>
  );
}

/** Linked accounts + education tips (FB Linked accounts / education parity). */
export function LinkedAndLearnView() {
  const tips = [
    { title: 'Post when your audience is online', body: 'Check Insights → Audience → Best time to post, then schedule in Planner.', to: creatorHubPath('analytics', 'audience') },
    { title: 'Use playlists for series', body: 'Group related Reels so fans can binge your best content.', to: creatorHubPath('playlists') },
    { title: 'Reply to Mentions fast', body: 'Mentions drive reciprocal engagement — clear the inbox daily.', to: creatorHubPath('mentions') },
    { title: 'Boost winners, not everything', body: 'Boost only posts already getting organic traction.', to: creatorHubPath('boost') },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Learn & accounts</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Linked accounts and short creator tips.</p>
      </div>
      <section className={`${hubCard} p-4`}>
        <h2 className="text-[15px] font-semibold text-foreground">Linked accounts</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Connect other platforms for cross-posting and identity. Managed in Settings.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/settings?opt=acc_connected_accounts" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-semibold text-primary-foreground">Manage connected accounts</Link>
          <Link to={creatorHubPath('content_studio')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-semibold">Content Studio</Link>
        </div>
      </section>
      <section>
        <h2 className="text-[15px] font-semibold text-foreground">Creator education</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Quick tips inspired by Meta’s Professional Dashboard learning cards.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tips.map((t) => (
            <Link key={t.title} to={t.to} className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
              <div className="flex items-start gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-[13px] font-bold">{t.title}</div>
                  <p className="mt-1 text-[12px] text-muted-foreground">{t.body}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="text-[15px] font-semibold text-foreground">Switch dashboards</div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">Personal Creator Hub for your profile · WevSpaces / WevDesk for brand pages (Meta Business Suite equivalent).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={creatorHubPath()} className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground">Creator Hub</Link>
            <Link to="/spaces" className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold">WevSpaces</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
