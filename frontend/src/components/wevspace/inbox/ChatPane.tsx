/**
 * Chat area (~55%) of the Space Inbox. Carries every control the classic
 * InboxThread had — accept request, resolve / reopen, spam, labels, assignment,
 * saved replies, the sanction warning, "Replying as ✓ <Space>" and the
 * team-only "sent by" line — on the same endpoints (GET/PATCH /inbox/:threadId,
 * POST /inbox/:threadId/reply), plus image replies (POST /api/media/upload →
 * reply.imageUrl), emoji and an AI-drafted reply (POST /api/ai/chat).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Film,
  ImageIcon,
  Info,
  Loader2,
  MessageSquareText,
  Mic,
  MoreVertical,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldOff,
  Smile,
  Sparkles,
  Sticker,
  Tag,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  SPACE_THREAD_LABELS,
  SPACE_THREAD_STATUS_LABELS,
  type SpaceThreadLabel,
  type SpaceThreadStatus,
} from '@wevsoft/shared/wevspace';
import { fetchTeam, patchInboxThread, replyAsSpace } from '../../../lib/wevspaceManageApi';
import { authHeaders, uploadDraftImage } from '../../../lib/wevspaceApi';
import { resolveAvatarUrl } from '../../UserAvatar';
import { clockTime, dayKey, dayLabel } from './inboxData';
import { Avatar, EmptyBlock, IconBtn, MenuItem, Popover, btn, cx, useDismiss } from './inboxUi';

const EMOJI = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤩', '🥳', '🙂', '😉',
  '🤔', '😅', '😇', '🙏', '👍', '👎', '👏', '🙌', '💪', '🤝', '👋', '✌️',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🔥', '✨', '🎉', '🎁', '✅', '❌',
  '⭐', '💯', '📦', '🚚', '💳', '🛒', '📞', '📧', '⏰', '📍', '😢', '😮',
];

const MAX_IMAGE_MB = 10;

interface Detail {
  data: any | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void> | void;
  refresh: () => Promise<void> | void;
}

interface Props {
  spaceId: string;
  threadId: string;
  listRow: any | null;
  detail: Detail;
  canAssign: boolean;
  presence: Record<string, 'online' | 'offline'>;
  contactOpen: boolean;
  onToggleContact: () => void;
  onBack: () => void;
  onChanged: () => void;
  onOpenSaved: () => void;
}

export default function ChatPane({
  spaceId,
  threadId,
  listRow,
  detail,
  canAssign,
  presence,
  contactOpen,
  onToggleContact,
  onBack,
  onChanged,
  onOpenSaved,
}: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [patching, setPatching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [image, setImage] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cannedId, setCannedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useDismiss(menuOpen, () => {
    setMenuOpen(false);
    setLabelsOpen(false);
    setAssignOpen(false);
  });
  const emojiRef = useDismiss(emojiOpen, () => setEmojiOpen(false));
  const quickRef = useDismiss(quickOpen, () => setQuickOpen(false));

  const data = detail.data;
  const thread = data?.thread || null;
  const messages: any[] = data?.messages || [];
  const replyingAs = data?.replyingAs || null;
  const canReply = data?.canReply === true;
  const quickReplies: any[] = data?.quickReplies || [];
  const customer = thread?.customer || listRow?.customer || null;
  const status: SpaceThreadStatus = (thread?.status || listRow?.status || 'OPEN') as SpaceThreadStatus;
  const labels: string[] = Array.isArray(thread?.labels) ? thread.labels : [];
  const online = customer?.id ? presence[customer.id] : undefined;

  // New conversation → fresh composer.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setText('');
    setImage(null);
    setCannedId(null);
    setMenuOpen(false);
  }, [threadId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, threadId]);

  // Teammates for assignment — only fetched when the viewer may assign (§12).
  const [team, setTeam] = useState<any[] | null>(null);
  useEffect(() => {
    let alive = true;
    if (!canAssign) return;
    fetchTeam(spaceId)
      .then((r: any) => alive && setTeam((r?.members || []).filter((m: any) => m.status === 'ACTIVE')))
      .catch(() => alive && setTeam([]));
    return () => {
      alive = false;
    };
  }, [spaceId, canAssign]);

  const applyPatch = useCallback(
    async (patch: Parameters<typeof patchInboxThread>[1], message: string) => {
      setPatching(true);
      try {
        await patchInboxThread(threadId, patch);
        toast.success(message);
        await detail.refresh();
        onChanged();
      } catch (error: any) {
        toast.error(error?.message || 'Could not update this conversation');
      } finally {
        setPatching(false);
      }
    },
    [threadId, detail, onChanged],
  );

  const send = async () => {
    const value = text.trim();
    if ((!value && !image) || sending || uploading) return;
    setSending(true);
    try {
      await replyAsSpace(threadId, {
        text: value,
        ...(image ? { imageUrl: image.url } : {}),
        ...(cannedId ? { cannedReplyId: cannedId } : {}),
      });
      setText('');
      setImage(null);
      setCannedId(null);
      await detail.refresh();
      onChanged();
    } catch (error: any) {
      toast.error(error?.message || 'Could not send that reply');
    } finally {
      setSending(false);
    }
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image file');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Images up to ${MAX_IMAGE_MB} MB`);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadDraftImage(file);
      setImage({ url, name: file.name });
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const insertEmoji = (emoji: string) => {
    const el = textRef.current;
    if (!el) {
      setText((t) => t + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  // AI drafts a reply into the composer; a human still reviews and sends it.
  const aiReply = async () => {
    if (aiBusy) return;
    const recent = messages.filter((m) => m.text).slice(-12);
    if (!recent.length) {
      toast('There is no message to reply to yet.');
      return;
    }
    setAiBusy(true);
    try {
      const spaceName = replyingAs?.name || 'the business';
      const transcript = recent
        .map((m) => `${m.fromSpace ? spaceName : customer?.name || 'Customer'}: ${String(m.text).slice(0, 600)}`)
        .join('\n');
      const prompt =
        `You are writing a reply on behalf of "${spaceName}" in its customer inbox on Wevsoft. ` +
        'Write ONE short, friendly, helpful reply to the customer\'s latest message. ' +
        'Do not invent prices, order details, policies or promises. Reply with the message text only, no quotes.\n\n' +
        `Conversation:\n${transcript}`;
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ userMessage: prompt, pageContext: 'space-inbox', featureContext: 'global' }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'AI is not available right now');
      const draft = String(body?.message || body?.response || '').trim();
      if (!draft) throw new Error('AI returned an empty draft');
      setText(draft.replace(/^"|"$/g, ''));
      setCannedId(null);
      requestAnimationFrame(() => textRef.current?.focus());
      toast.success('AI draft ready — review it before sending');
    } catch (error: any) {
      toast.error(error?.message || 'AI is not available right now');
    } finally {
      setAiBusy(false);
    }
  };

  const toggleLabel = (id: SpaceThreadLabel) => {
    const next = labels.includes(id) ? labels.filter((entry) => entry !== id) : [...labels, id];
    void applyPatch({ labels: next }, 'Labels updated');
  };

  const grouped = useMemo(() => {
    const out: Array<{ key: string; label: string; items: any[] }> = [];
    for (const m of messages) {
      const key = dayKey(m.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(m);
      else out.push({ key, label: dayLabel(m.createdAt), items: [m] });
    }
    return out;
  }, [messages]);

  const subline = online === 'online' ? 'Online' : online === 'offline' ? 'Offline' : customer?.username ? `@${customer.username}` : 'Visitor';

  return (
    <section aria-label="Conversation" className="h-full min-h-0 flex flex-col bg-[var(--si-card)]">
      {/* Header */}
      <header className="shrink-0 h-[60px] flex items-center gap-2.5 px-3 sm:px-4 border-b border-[var(--si-border)]">
        <button type="button" onClick={onBack} aria-label="Back to conversations" className="lg:hidden -ml-1 p-2 rounded-lg text-[var(--si-text)] hover:bg-[var(--si-hover)]">
          <ArrowLeft size={18} />
        </button>
        <Avatar person={customer} size={38} presence={online || null} />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-[var(--si-text)] truncate">{customer?.name || customer?.username || 'Someone'}</p>
          <p className="text-[11.5px] text-[var(--si-muted)] truncate" title={online ? undefined : 'Live presence shows once this person connects or disconnects while you are here'}>
            <span className={online === 'online' ? 'text-[var(--si-green)] font-semibold' : undefined}>{subline}</span>
            {thread?.assignedTo?.user?.name && ` · handled by ${thread.assignedTo.user.name}`}
          </p>
        </div>
        <span className={cx('hidden sm:inline-flex shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-bold uppercase tracking-wide', statusPill(status))}>
          {SPACE_THREAD_STATUS_LABELS[status] || status}
        </span>
        {canReply && status === 'PENDING' && (
          <button type="button" className={btn.smallPrimary} disabled={patching} onClick={() => applyPatch({ status: 'OPEN' }, 'Request accepted')}>
            <Check size={13} /> <span className="hidden sm:inline">Accept</span>
          </button>
        )}
        {canReply && status !== 'RESOLVED' && status !== 'PENDING' && status !== 'SPAM' && (
          <button type="button" className={cx(btn.small, 'hidden sm:inline-flex')} disabled={patching} onClick={() => applyPatch({ status: 'RESOLVED' }, 'Marked resolved')}>
            <CheckCircle2 size={13} /> Resolve
          </button>
        )}
        {canReply && status === 'RESOLVED' && (
          <button type="button" className={cx(btn.small, 'hidden sm:inline-flex')} disabled={patching} onClick={() => applyPatch({ status: 'OPEN' }, 'Reopened')}>
            <RotateCcw size={13} /> Reopen
          </button>
        )}
        <IconBtn icon={Info} label="Contact details" active={contactOpen} onClick={onToggleContact} />
        <div className="relative" ref={menuRef}>
          <IconBtn icon={MoreVertical} label="More actions" active={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
          {menuOpen && (
            <Popover className="right-0 top-10 w-64">
              {canReply && status !== 'RESOLVED' && status !== 'PENDING' && status !== 'SPAM' && (
                <MenuItem icon={CheckCircle2} onClick={() => { setMenuOpen(false); void applyPatch({ status: 'RESOLVED' }, 'Marked resolved'); }}>Mark resolved</MenuItem>
              )}
              {canReply && (status === 'RESOLVED' || status === 'ARCHIVED' || status === 'SPAM') && (
                <MenuItem icon={status === 'ARCHIVED' ? ArchiveRestore : RotateCcw} onClick={() => { setMenuOpen(false); void applyPatch({ status: 'OPEN' }, status === 'SPAM' ? 'Moved back to the inbox' : 'Reopened'); }}>
                  {status === 'SPAM' ? 'Not spam — move to inbox' : status === 'ARCHIVED' ? 'Unarchive' : 'Reopen'}
                </MenuItem>
              )}
              {canReply && (
                <MenuItem icon={Tag} onClick={() => { setLabelsOpen((v) => !v); setAssignOpen(false); }} right={<span className="text-[11px] text-[var(--si-faint)]">{labels.length || ''}</span>}>
                  Labels
                </MenuItem>
              )}
              {labelsOpen && (
                <div className="flex flex-wrap gap-1.5 px-3 py-2">
                  {SPACE_THREAD_LABELS.map((def) => {
                    const on = labels.includes(def.id);
                    return (
                      <button key={def.id} type="button" disabled={patching} onClick={() => toggleLabel(def.id)} className={cx('px-2 py-1 rounded-md text-[11px] font-semibold transition-opacity', def.tone, on ? '' : 'opacity-40 hover:opacity-70')}>
                        {on ? '✓ ' : ''}{def.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {canAssign && (
                <MenuItem icon={UserCheck} onClick={() => { setAssignOpen((v) => !v); setLabelsOpen(false); }} right={<span className="text-[11px] text-[var(--si-faint)] truncate max-w-[90px]">{thread?.assignedTo?.user?.name?.split(' ')[0] || 'None'}</span>}>
                  Assign to
                </MenuItem>
              )}
              {assignOpen && (
                <div className="max-h-48 overflow-y-auto si-scroll px-1.5 pb-1">
                  <AssignOption label="Unassigned" active={!thread?.assignedTo} disabled={patching} onClick={() => applyPatch({ assignedMemberId: null }, 'Assignment cleared')} />
                  {team === null ? (
                    <p className="px-2 py-1.5 text-[12px] text-[var(--si-muted)]">Loading team…</p>
                  ) : (
                    team.map((m: any) => (
                      <AssignOption
                        key={m.id}
                        label={m.user?.name || m.user?.username || 'Teammate'}
                        person={m.user}
                        active={thread?.assignedTo?.memberId === m.id}
                        disabled={patching}
                        onClick={() => applyPatch({ assignedMemberId: m.id }, 'Conversation assigned')}
                      />
                    ))
                  )}
                </div>
              )}
              {canReply && status !== 'SPAM' && (
                <MenuItem icon={ShieldOff} onClick={() => { setMenuOpen(false); void applyPatch({ status: 'SPAM' }, 'Moved to spam'); }}>Mark as spam</MenuItem>
              )}
              {canReply && status !== 'ARCHIVED' && status !== 'PENDING' && (
                <MenuItem icon={Archive} onClick={() => { setMenuOpen(false); void applyPatch({ status: 'ARCHIVED' }, 'Archived'); }}>Archive</MenuItem>
              )}
              {canReply && (
                <MenuItem icon={Zap} onClick={() => { setMenuOpen(false); onOpenSaved(); }}>Manage saved replies</MenuItem>
              )}
              {customer?.username && (
                <Link to={`/u/${customer.username}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 px-3 py-2 text-[13px] text-[var(--si-text)] hover:bg-[var(--si-hover)]">
                  <ExternalLink size={15} className="text-[var(--si-muted)]" /> View profile
                </Link>
              )}
              <MenuItem icon={Info} onClick={() => { setMenuOpen(false); onToggleContact(); }}>{contactOpen ? 'Hide' : 'Show'} contact details</MenuItem>
            </Popover>
          )}
        </div>
      </header>

      {/* A person under a sanction must be obvious before anyone replies (§8). */}
      {Array.isArray(thread?.customerSanctions) && thread.customerSanctions.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--si-amber-soft)] text-[var(--si-amber)] text-[12px] font-semibold">
          <ShieldAlert size={14} />
          This person is currently {thread.customerSanctions.join(' and ').toLowerCase()} on this Space.
        </div>
      )}

      {/* Thread */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto si-scroll px-3 sm:px-5 py-4 bg-[var(--si-card-2)]">
        {detail.loading && !data ? (
          <div className="h-full grid place-items-center text-[var(--si-muted)]">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : detail.error ? (
          <EmptyBlock icon={AlertCircle} title="Could not open this conversation" blurb={detail.error}>
            <button type="button" className={btn.small} onClick={() => void detail.reload()}>
              Try again
            </button>
          </EmptyBlock>
        ) : messages.length === 0 ? (
          <EmptyBlock icon={MessageSquareText} title="No messages yet" blurb="Messages in this conversation will appear here." />
        ) : (
          grouped.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center gap-3 py-3">
                <span className="flex-1 h-px bg-[var(--si-border)]" />
                <span className="text-[11px] font-semibold text-[var(--si-muted)]">{group.label}</span>
                <span className="flex-1 h-px bg-[var(--si-border)]" />
              </div>
              {group.items.map((m, i) => {
                const prev = group.items[i - 1];
                const isGrouped = prev && prev.fromSpace === m.fromSpace && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
                return <Bubble key={m.id} message={m} compact={Boolean(isGrouped)} />;
              })}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      {canReply ? (
        <div className="shrink-0 border-t border-[var(--si-border)] bg-[var(--si-card)]">
          {replyingAs && (
            <div className="flex items-center gap-1.5 px-4 pt-2 text-[11.5px] font-semibold text-[var(--si-blue)]">
              Replying as
              {replyingAs.verified && <BadgeCheck size={12} />}
              <span className="truncate">{replyingAs.name}</span>
            </div>
          )}
          {image && (
            <div className="px-4 pt-2">
              <span className="relative inline-flex items-center gap-2 rounded-lg border border-[var(--si-border)] bg-[var(--si-card-2)] p-1.5 pr-8">
                <img src={resolveAvatarUrl(image.url) || image.url} alt="" className="w-12 h-12 rounded-md object-cover" />
                <span className="text-[12px] text-[var(--si-text-2)] max-w-[180px] truncate">{image.name}</span>
                <button type="button" aria-label="Remove image" onClick={() => setImage(null)} className="absolute right-1.5 top-1.5 p-1 rounded text-[var(--si-muted)] hover:bg-[var(--si-hover)]">
                  <X size={13} />
                </button>
              </span>
            </div>
          )}
          <div className="px-3 sm:px-4 pt-2">
            <textarea
              ref={textRef}
              rows={2}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (!e.target.value) setCannedId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={`Reply as ${replyingAs?.name || 'the Space'}…  (Enter to send, Shift+Enter for a new line)`}
              className="w-full resize-none max-h-40 min-h-[44px] px-3 py-2.5 rounded-lg border border-[var(--si-border)] bg-[var(--si-card-2)] text-[13.5px] text-[var(--si-text)] placeholder:text-[var(--si-faint)] outline-none focus:border-[var(--si-blue)] focus:bg-[var(--si-card)]"
            />
          </div>
          <div className="flex items-center gap-0.5 px-2 sm:px-3 pb-2.5 pt-1">
            <div className="relative" ref={emojiRef}>
              <IconBtn icon={Smile} label="Emoji" active={emojiOpen} onClick={() => setEmojiOpen((v) => !v)} />
              {emojiOpen && (
                <Popover className="bottom-11 left-0 w-[264px] p-2">
                  <div className="grid grid-cols-8 gap-0.5">
                    {EMOJI.map((e) => (
                      <button key={e} type="button" onClick={() => insertEmoji(e)} className="h-8 rounded-md text-[18px] hover:bg-[var(--si-hover)]">
                        {e}
                      </button>
                    ))}
                  </div>
                </Popover>
              )}
            </div>
            <IconBtn icon={Sticker} label="GIF" disabled tip="GIFs — coming next (no GIF provider is connected for Space replies yet)" />
            <IconBtn icon={uploading ? Loader2 : ImageIcon} label="Image" tip={`Attach an image (up to ${MAX_IMAGE_MB} MB)`} onClick={() => fileRef.current?.click()} disabled={uploading || Boolean(image)} className={uploading ? '[&>svg]:animate-spin' : ''} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickImage(e.target.files?.[0])} />
            <span className="hidden sm:contents">
              <IconBtn icon={Film} label="Video" disabled tip="Video replies — coming next (Space replies carry text and images today)" />
              <IconBtn icon={FileText} label="File" disabled tip="File attachments — coming next (Space replies carry text and images today)" />
              <IconBtn icon={Mic} label="Voice" disabled tip="Voice notes — coming next (Space replies carry text and images today)" />
            </span>
            <span className="mx-1 w-px h-5 bg-[var(--si-border)]" />
            <button type="button" onClick={() => void aiReply()} disabled={aiBusy} title="Draft a reply with Wevsoft AI — you review it before it is sent" className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] font-semibold text-[var(--si-blue)] hover:bg-[var(--si-blue-soft)] disabled:opacity-50">
              {aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} <span className="hidden sm:inline">AI Reply</span>
            </button>
            <div className="relative" ref={quickRef}>
              <button type="button" onClick={() => setQuickOpen((v) => !v)} title="Insert a saved quick reply" className={cx('inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] font-semibold hover:bg-[var(--si-hover)]', quickOpen ? 'text-[var(--si-blue)] bg-[var(--si-blue-soft)]' : 'text-[var(--si-text-2)]')}>
                <Zap size={14} /> <span className="hidden sm:inline">Quick Reply</span>
              </button>
              {quickOpen && (
                <Popover className="bottom-11 left-0 w-[300px] max-h-72 overflow-y-auto si-scroll p-1.5">
                  {quickReplies.length === 0 ? (
                    <div className="px-2 py-3 text-[12px] text-[var(--si-muted)]">
                      No saved replies yet.{' '}
                      <button type="button" className="text-[var(--si-blue)] font-semibold" onClick={() => { setQuickOpen(false); onOpenSaved(); }}>
                        Add some
                      </button>
                    </div>
                  ) : (
                    quickReplies.map((reply: any) => (
                      <button
                        key={reply.id}
                        type="button"
                        onClick={() => {
                          setText(reply.body);
                          setCannedId(reply.id);
                          setQuickOpen(false);
                          requestAnimationFrame(() => textRef.current?.focus());
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-[var(--si-hover)]"
                      >
                        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--si-text)]">
                          <span className="truncate">{reply.title}</span>
                          {reply.shortcut && <span className="shrink-0 text-[10.5px] font-medium text-[var(--si-faint)]">/{reply.shortcut}</span>}
                        </span>
                        <span className="block text-[11.5px] text-[var(--si-muted)] line-clamp-2">{reply.body}</span>
                      </button>
                    ))
                  )}
                </Popover>
              )}
            </div>
            <span className="flex-1" />
            <button type="button" onClick={() => void send()} disabled={sending || uploading || (!text.trim() && !image)} className={btn.primary} aria-label="Send reply">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      ) : data ? (
        <div className="shrink-0 px-4 py-3 border-t border-[var(--si-border)] text-[12px] font-medium text-[var(--si-muted)]">
          You can read this Space's messages but not reply. Ask the owner for the reply permission.
        </div>
      ) : null}
    </section>
  );
}

function statusPill(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-[var(--si-amber-soft)] text-[var(--si-amber)]';
    case 'OPEN':
      return 'bg-[var(--si-green-soft)] text-[var(--si-green)]';
    case 'SPAM':
      return 'bg-[var(--si-red-soft)] text-[var(--si-red)]';
    case 'RESOLVED':
      return 'bg-[var(--si-blue-soft)] text-[var(--si-blue)]';
    default:
      return 'bg-[var(--si-hover)] text-[var(--si-muted)]';
  }
}

function AssignOption({ label, person, active, disabled, onClick }: { label: string; person?: any; active: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled || active} onClick={onClick} className={cx('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[12.5px]', active ? 'bg-[var(--si-blue-soft)] text-[var(--si-blue)] font-semibold' : 'text-[var(--si-text)] hover:bg-[var(--si-hover)]')}>
      {person ? <Avatar person={person} size={22} /> : <span className="w-[22px] h-[22px] rounded-full border border-dashed border-[var(--si-border-2)]" />}
      <span className="flex-1 truncate">{label}</span>
      {active && <Check size={13} />}
    </button>
  );
}

function Bubble({ message, compact }: { message: any; compact: boolean }) {
  const out = message.fromSpace === true;
  const imageUrl = message.imageUrl ? resolveAvatarUrl(message.imageUrl) || message.imageUrl : null;
  return (
    <div className={cx('flex items-end gap-2', out ? 'flex-row-reverse' : '', compact ? '!mt-0.5' : '')}>
      <span className="w-7 shrink-0">{!compact && <Avatar person={message.author} size={28} />}</span>
      <div className={cx('min-w-0 max-w-[78%] sm:max-w-[68%] flex flex-col', out ? 'items-end' : 'items-start')}>
        {message.text ? (
          <div
            className={cx(
              'px-3.5 py-2 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap',
              out ? 'bg-[var(--si-blue)] text-white rounded-2xl rounded-br-md' : 'bg-[var(--si-card)] border border-[var(--si-border)] text-[var(--si-text)] rounded-2xl rounded-bl-md',
            )}
          >
            {message.text}
          </div>
        ) : !imageUrl ? (
          <div className="px-3.5 py-2 rounded-2xl text-[12.5px] italic text-[var(--si-muted)] bg-[var(--si-hover)]">Sent an attachment</div>
        ) : null}
        {imageUrl && (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-1 block">
            <img src={imageUrl} alt="" loading="lazy" className="max-w-[260px] max-h-[320px] rounded-xl border border-[var(--si-border)] object-cover" />
          </a>
        )}
        <p className="mt-0.5 px-1 text-[10.5px] text-[var(--si-faint)]" title={new Date(message.createdAt).toLocaleString()}>
          {clockTime(message.createdAt)}
          {message.automated && <span className="ml-1 font-semibold" title="Sent by inbox automations">· Automated</span>}
          {/* Visible to the team only — the visitor sees just the Space. */}
          {out && message.sentBy?.name && ` · sent by ${message.sentBy.name}`}
        </p>
      </div>
    </div>
  );
}
