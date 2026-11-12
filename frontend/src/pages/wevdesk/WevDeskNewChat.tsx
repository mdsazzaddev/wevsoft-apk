/** WevDesk → New chat: the Space starts (or continues) a conversation with a follower, then opens it in Chat. */

import { useState } from 'react';
import { PenSquare, Search, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchManagedFollowers, startSpaceChat } from '../../lib/wevspaceManageApi';
import { resolveAvatarUrl } from '../../components/UserAvatar';
import { useDesk } from './deskContext';
import { DeskButton, EmptyNote, PageHeader } from './deskUi';

export default function WevDeskNewChat() {
  const { spaceId, deskPath, managePath, space, can } = useDesk();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [to, setTo] = useState<any | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const followers = useQuery({
    queryKey: ['wevdesk', spaceId, 'followers', q],
    queryFn: () => fetchManagedFollowers(spaceId, { search: q || undefined, limit: 30 }),
    retry: false,
  });
  const start = useMutation({
    mutationFn: () => startSpaceChat(spaceId, { userId: to.id, text }),
    onSuccess: (r) => navigate(`${deskPath('inbox')}?c=${r.threadId}`),
    onError: (e: any) => setError(e?.message || 'Could not start the chat'),
  });
  const canReply = can('messages.reply');
  const rows = followers.data?.followers || [];
  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1100px]">
      <PageHeader
        icon={PenSquare}
        title="New chat"
        subtitle="Message someone who follows your Space. It arrives in their WevChat from the Space, and the conversation continues in Chat."
        actions={<DeskButton to={deskPath('inbox')}>Open Chat</DeskButton>}
      />
      {to && (
        <section className="wd-card p-[18px]">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-[15px] font-semibold">Message {to.name || to.username} as {space.name}</h2>
            <button type="button" aria-label="Clear" onClick={() => { setTo(null); setError(null); }} className="p-1.5 rounded-lg hover:bg-[var(--wd-chip)]"><X size={16} /></button>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 4000))} rows={4} autoFocus placeholder="Write your first message…" className="mt-2 w-full rounded-[12px] border border-[var(--wd-btn-border)] px-3.5 py-3 text-[13px] outline-none focus:border-[var(--wd-teal)]" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <DeskButton disabled={!text.trim() || start.isPending} onClick={() => { setError(null); start.mutate(); }} className="bg-[var(--wd-teal)] text-white border-transparent">
              {start.isPending ? 'Sending…' : 'Send & open chat'}
            </DeskButton>
            {error && <span className="text-[12px] text-[#b42318]">{error}</span>}
          </div>
        </section>
      )}
      <section className="wd-card p-[18px]">
        <label className="flex items-center gap-2.5 h-[42px] px-3.5 rounded-[12px] border border-[var(--wd-btn-border)] bg-white">
          <Search size={15} className="text-[var(--wd-muted)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search followers by name or username" className="flex-1 bg-transparent outline-none text-[13px]" />
        </label>
        <p className="mt-2 text-[11.5px] text-[var(--wd-muted)]">
          {followers.data ? `${followers.data.total} follower${followers.data.total === 1 ? '' : 's'} of ${space.name}` : ''}
          {!canReply && ' · Your role cannot send messages for this Space.'}
        </p>
        <div className="mt-2">
          {followers.isLoading ? (
            <p className="text-[12px] text-[var(--wd-muted)] py-4">Loading…</p>
          ) : followers.isError ? (
            <EmptyNote title="Followers not available">Your role cannot see this Space's followers.</EmptyNote>
          ) : rows.length === 0 ? (
            <EmptyNote title={q ? 'No matches' : 'No followers yet'}>{q ? 'Try another name.' : 'People who follow your Space appear here.'}</EmptyNote>
          ) : (
            <ul className="divide-y divide-[var(--wd-line)]">
              {rows.map((f: any) => {
                const u = f.user || f;
                const avatar = resolveAvatarUrl(u.avatar || null);
                return (
                  <li key={u.id || f.id} className="py-2.5 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full overflow-hidden bg-[var(--wd-chip)] grid place-items-center text-[13px] font-semibold shrink-0">
                      {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : String(u.name || u.username || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium truncate">{u.name || u.username}</span>
                      {u.username && <span className="block text-[11.5px] text-[var(--wd-muted)] truncate">@{u.username}</span>}
                    </span>
                    <DeskButton disabled={!canReply || !u.id} title={!canReply ? 'Your role cannot send messages for this Space' : undefined} onClick={() => { setTo(u); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      Message
                    </DeskButton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="mt-3"><DeskButton to={managePath('followers')}>All followers</DeskButton></div>
      </section>
    </div>
  );
}
