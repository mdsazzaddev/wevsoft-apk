/** WevDesk → Broadcast: one Space message to an audience, delivered through the Space inbox pipeline. */

import { useState } from 'react';
import { Megaphone, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { cancelBroadcast, createBroadcast, fetchBroadcasts, type BroadcastAudience, type SpaceBroadcast } from '../../lib/wevspaceManageApi';
import { useDesk } from './deskContext';
import { DeskButton, EmptyNote, PageHeader, Pill, StatTile, cx, fmtNum } from './deskUi';

const TEMPLATES: Record<string, { label: string; text: string }> = {
  announcement: { label: 'Announcement', text: '' },
  offer: { label: 'Offer', text: '' },
  review: { label: 'Review request', text: 'Thanks for choosing us! Could you take a minute to leave a review on our Space? It really helps.' },
};
const AUDIENCE_LABEL: Record<BroadcastAudience, string> = { FOLLOWERS: 'All followers', CHATTED: 'People who messaged you', OPEN: 'Open conversations' };
const STATUS_TONE: Record<SpaceBroadcast['status'], 'green' | 'grey' | 'ai'> = { SENT: 'green', SENDING: 'ai', QUEUED: 'ai', SCHEDULED: 'grey', FAILED: 'grey', CANCELLED: 'grey' };

function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function WevDeskBroadcast() {
  const { spaceId, space, deskPath } = useDesk();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const initial = params.get('template') && TEMPLATES[params.get('template')!] ? params.get('template')! : 'announcement';
  const [template, setTemplate] = useState(initial);
  const [text, setText] = useState(TEMPLATES[initial].text);
  const [audience, setAudience] = useState<BroadcastAudience>(initial === 'review' ? 'CHATTED' : 'FOLLOWERS');
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const key = ['wevdesk', spaceId, 'broadcasts'];
  const q = useQuery({
    queryKey: key,
    queryFn: () => fetchBroadcasts(spaceId),
    retry: false,
    refetchInterval: (query) => ((query.state.data?.broadcasts || []).some((b) => b.status === 'QUEUED' || b.status === 'SENDING') ? 4000 : false),
  });
  const data = q.data;
  const max = data?.limits.maxText ?? 1000;
  const send = useMutation({
    mutationFn: () => createBroadcast(spaceId, { audience, text, scheduledAt: scheduling ? new Date(when).toISOString() : null }),
    onSuccess: (b) => {
      setNotice({ ok: true, text: b.status === 'SCHEDULED' ? `Scheduled for ${new Date(b.scheduledAt!).toLocaleString()}.` : 'Sending now. Progress shows in History.' });
      setText('');
      void qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => setNotice({ ok: false, text: e?.message || 'Could not send the broadcast' }),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelBroadcast(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => setNotice({ ok: false, text: e?.message || 'Could not cancel' }),
  });

  const counts = data?.audiences;
  const picked = counts ? counts[audience] : null;
  const capped = picked !== null && data ? Math.min(picked, data.limits.maxRecipients) : null;
  const left = data ? Math.max(0, data.limits.perDay - data.usedToday) : null;
  const blockReason = !data
    ? q.isError ? 'You cannot open broadcasts on this Space' : 'Loading…'
    : !data.messagingEnabled
      ? 'Messaging is turned off for this Space'
      : !data.canBroadcast
        ? 'Only the Space owner or an admin can send broadcasts'
        : left === 0
          ? 'Daily broadcast limit reached'
          : !text.trim()
            ? 'Write a message first'
            : picked === 0
              ? 'Nobody is in that audience yet'
              : null;
  const sentTotal = (data?.broadcasts || []).reduce((s, b) => s + b.sentCount, 0);

  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1400px]">
      <PageHeader
        icon={Megaphone}
        title="Broadcast"
        subtitle="Send one message from your Space to many people at once. Each person gets it in their WevChat from the Space, and replies land in Chat."
        badge={data ? <Pill tone="grey">{left} of {data.limits.perDay} left today</Pill> : undefined}
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Followers" value={counts ? fmtNum(counts.FOLLOWERS) : '—'} sub="With notifications on" />
        <StatTile label="Conversations" value={counts ? fmtNum(counts.CHATTED) : '—'} sub="People who messaged you" />
        <StatTile label="Broadcasts" value={fmtNum(data?.broadcasts.length || 0)} sub="Sent or scheduled" />
        <StatTile label="Messages delivered" value={fmtNum(sentTotal)} sub="Across all broadcasts" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="wd-card p-[18px] lg:col-span-2">
          <h2 className="text-[15px] font-semibold">Compose</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(TEMPLATES).map(([id, t]) => (
              <button key={id} type="button" onClick={() => { setTemplate(id); if (t.text) setText(t.text); }} className={cx('h-[28px] px-3 rounded-full text-[12px] font-medium', template === id ? 'bg-[var(--wd-text)] text-white' : 'bg-[var(--wd-chip)] text-[var(--wd-text-2)] hover:bg-[#e3e6ea]')}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-[var(--wd-muted)]">Sends as <b className="text-[var(--wd-text-2)]">{space.name}</b></p>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, max))} rows={7} placeholder="Write your message…" className="mt-1.5 w-full rounded-[12px] border border-[var(--wd-btn-border)] bg-white px-3.5 py-3 text-[13px] outline-none focus:border-[var(--wd-teal)] resize-y" />
          <div className="mt-1 flex justify-between text-[11px] text-[var(--wd-muted)]">
            <span>People who blocked the Space, are banned/muted, or accept no messages are skipped.</span>
            <span>{text.length}/{max}</span>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12.5px]">
            <input type="checkbox" checked={scheduling} onChange={(e) => setScheduling(e.target.checked)} className="accent-[var(--wd-teal)]" /> Schedule for later
          </label>
          {scheduling && (
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-2 h-[36px] rounded-[10px] border border-[var(--wd-btn-border)] px-3 text-[12.5px]" />
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DeskButton
              disabled={Boolean(blockReason) || send.isPending}
              title={blockReason || undefined}
              onClick={() => { setNotice(null); send.mutate(); }}
              className="bg-[var(--wd-teal)] text-white border-transparent hover:!bg-[var(--wd-teal-2)]"
            >
              {send.isPending ? 'Sending…' : scheduling ? `Schedule for ${capped === null ? '—' : fmtNum(capped)}` : `Send to ${capped === null ? '—' : fmtNum(capped)}`}
            </DeskButton>
            {blockReason && <span className="text-[11.5px] text-[var(--wd-muted)]">{blockReason}</span>}
            {data && picked !== null && picked > data.limits.maxRecipients && <span className="text-[11.5px] text-[var(--wd-muted)]">Capped at the {fmtNum(data.limits.maxRecipients)} most recent.</span>}
          </div>
          {notice && <p className={cx('mt-2 text-[12px]', notice.ok ? 'text-[var(--wd-green)]' : 'text-[#b42318]')}>{notice.text}</p>}
        </section>
        <section className="wd-card p-[18px]">
          <h2 className="text-[15px] font-semibold">Audience</h2>
          <div className="mt-2 space-y-2">
            {(Object.keys(AUDIENCE_LABEL) as BroadcastAudience[]).map((a) => (
              <label key={a} className={cx('flex items-center gap-3 rounded-[12px] border px-3 py-2.5 cursor-pointer', audience === a ? 'border-[var(--wd-teal)] bg-[#f1faf7]' : 'border-[var(--wd-border)] hover:bg-[#fafbfc]')}>
                <input type="radio" name="aud" checked={audience === a} onChange={() => setAudience(a)} className="accent-[var(--wd-teal)]" />
                <Users size={15} className="text-[var(--wd-muted)]" />
                <span className="flex-1 min-w-0 text-[12.5px] font-medium">{AUDIENCE_LABEL[a]}</span>
                <span className="text-[13px] font-semibold tabular-nums">{counts ? fmtNum(counts[a]) : '—'}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-[11.5px] text-[var(--wd-muted)]">Up to {fmtNum(data?.limits.maxRecipients ?? 500)} people per broadcast, {data?.limits.perDay ?? 3} broadcasts a day.</p>
        </section>
      </div>
      <section className="wd-card p-[18px]">
        <div className="flex items-center"><h2 className="flex-1 text-[15px] font-semibold">History</h2><DeskButton to={deskPath('inbox')}>Open Chat</DeskButton></div>
        <div className="mt-3">
          {!data || data.broadcasts.length === 0 ? (
            <EmptyNote title="No broadcasts yet">Sent and scheduled broadcasts appear here with delivery counts.</EmptyNote>
          ) : (
            <ul className="divide-y divide-[var(--wd-line)]">
              {data.broadcasts.map((b) => (
                <li key={b.id} className="py-3 flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[12.5px] line-clamp-2">{b.text}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--wd-muted)]">
                      {AUDIENCE_LABEL[b.audience]} · {b.status === 'SCHEDULED' && b.scheduledAt ? `for ${new Date(b.scheduledAt).toLocaleString()}` : new Date(b.createdAt).toLocaleString()}
                      {b.createdBy?.name ? ` · by ${b.createdBy.name}` : ''}
                    </p>
                  </div>
                  <span className="text-[11.5px] text-[var(--wd-text-2)] tabular-nums">
                    {b.sentCount} sent{b.failedCount ? ` · ${b.failedCount} failed` : ''}{b.skippedCount ? ` · ${b.skippedCount} skipped` : ''}
                  </span>
                  <Pill tone={STATUS_TONE[b.status]}>{b.status.toLowerCase()}</Pill>
                  {b.status === 'SCHEDULED' && data.canBroadcast && (
                    <DeskButton onClick={() => cancel.mutate(b.id)} disabled={cancel.isPending}>Cancel</DeskButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
