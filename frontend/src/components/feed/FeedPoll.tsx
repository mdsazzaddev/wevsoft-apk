import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart2, Check, Clock, EyeOff, Loader2, Lock, MoreHorizontal, Pencil, Plus, Trophy, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { apiUrl } from '../../lib/apiBase';
import { getSocket } from '../../lib/socket';
import type { PostEditPollState } from '@wevsoft/shared/post-edit-state';
import { POLL_OPTION_MAX_LEN, pollTimeLeft, type SerializedPoll } from '@wevsoft/shared/post-poll';
import { PollComposerEditor, pollDraftError, pollDraftPayload } from '../polls/PollComposerEditor';
import { localNum, usePollT } from '../polls/pollText';
import { useDepsChanged } from '../../hooks/useValueChanged';

function pollIdFromRaw(raw: unknown): string | null {
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if ((parsed as any)?.sharedFrom) return null;
    const id = (parsed as any)?.pollId;
    if (typeof id === 'string' && id) return id;
  } catch {
    /* ignore */
  }
  return null;
}

/** Poll id of the post itself, or of the original post for shares / reposts. */
function pollIdFromPost(post: any): string | null {
  return pollIdFromRaw(post?.pollData) || pollIdFromRaw(post?.shareMeta?.originalPost?.pollData) || pollIdFromRaw(post?.originalPost?.pollData);
}

export function postHasFeedPoll(post: any): boolean {
  return !!pollIdFromPost(post);
}

type Voter = { id: string; name?: string | null; username?: string | null; avatar?: string | null; profileSlug?: string | null };

async function call(token: string | null, path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err: any = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Local optimistic result after selecting `ids` (only used while results are visible). */
function optimistic(p: SerializedPoll, ids: string[]): SerializedPoll {
  const prev = new Set(p.myVotes);
  const next = new Set(ids);
  const options = p.options.map(o => {
    if (o.voteCount == null) return { ...o, votedByMe: next.has(o.id) };
    const delta = (next.has(o.id) ? 1 : 0) - (prev.has(o.id) ? 1 : 0);
    return { ...o, voteCount: Math.max(0, o.voteCount + delta), votedByMe: next.has(o.id) };
  });
  const voters = (p.totalVoters ?? 0) + (ids.length > 0 ? 1 : 0) - (p.myVotes.length > 0 ? 1 : 0);
  const totalVotes = options.reduce((a, o) => a + (o.voteCount ?? 0), 0);
  const base = p.multiChoice ? voters : totalVotes;
  return {
    ...p,
    myVotes: ids,
    hasVoted: ids.length > 0,
    totalVoters: p.totalVoters == null ? null : voters,
    totalVotes: p.totalVotes == null ? null : totalVotes,
    options: options.map(o => ({ ...o, percentage: o.voteCount == null ? null : base ? Math.round((o.voteCount / base) * 100) : 0 })),
  };
}

/** Full poll card for feed / post detail / shared posts. */
export default function FeedPoll({ post }: { post: any }) {
  const token = useStore(s => s.token);
  const me = useStore(s => s.user);
  const { t, isBn } = usePollT();
  const pollId = pollIdFromPost(post);
  const [poll, setPoll] = useState<SerializedPoll | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [changing, setChanging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState<PostEditPollState | null>(null);
  const [adding, setAdding] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [voters, setVoters] = useState<{ optionId: string; text: string; list: Voter[]; next: string | null; loading: boolean } | null>(null);
  const [, setTick] = useState(0);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!pollId || !token) return;
    try {
      const data = await call(token, `/api/polls/${encodeURIComponent(pollId)}`);
      if (mounted.current && data?.id) setPoll(data);
    } catch {
      /* hidden / gone: render nothing */
    }
  }, [pollId, token]);

  useEffect(() => {
    mounted.current = true;
    if (!pollId || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external subscription: resets state, then follows the subscribed source
      setPoll(null);
      return;
    }
    setLoading(true);
    load().finally(() => mounted.current && setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, [pollId, token, load]);

  // Realtime: the server broadcasts only the poll id; refetch with our own permissions.
  useEffect(() => {
    if (!pollId || !token) return;
    let s: ReturnType<typeof getSocket> | null = null;
    try {
      s = getSocket(me?.id);
    } catch {
      return;
    }
    const onUpdate = (msg: { pollId?: string }) => {
      if (msg?.pollId === pollId && !busy) void load();
    };
    s.on('poll:update', onUpdate);
    return () => {
      s?.off('poll:update', onUpdate);
    };
  }, [pollId, token, me?.id, load, busy]);

  // Refresh countdown each minute; reload once when it expires.
  useEffect(() => {
    if (!poll?.expiresAt || poll.closed) return;
    const id = window.setInterval(() => {
      setTick(x => x + 1);
      if (poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now()) void load();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [poll?.expiresAt, poll?.closed, load]);

  // Poll / my votes changed on the server → sync the local selection (adjusted during render).
  const votesChanged = useDepsChanged([poll?.id, poll?.myVotes.join(',')]);
  if (votesChanged && poll) setSelection(poll.myVotes);

  const votingMode = !!poll && poll.canVote && (!poll.hasVoted || changing);

  const submitVote = async (ids: string[]) => {
    if (!poll || !pollId || busy) return;
    const before = poll;
    setBusy(true);
    if (poll.resultsVisible) setPoll(optimistic(poll, ids));
    else setPoll({ ...poll, myVotes: ids, hasVoted: ids.length > 0 });
    setChanging(false);
    try {
      const data = ids.length
        ? await call(token, `/api/polls/${encodeURIComponent(pollId)}/vote`, { method: 'POST', body: JSON.stringify({ optionIds: ids }) })
        : await call(token, `/api/polls/${encodeURIComponent(pollId)}/vote`, { method: 'DELETE' });
      if (mounted.current) setPoll(data);
    } catch (e: any) {
      if (mounted.current) setPoll(before);
      toast.error(e?.message || t('Could not save vote', 'ভোট সংরক্ষণ হয়নি'));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const action = async (path: string, init: RequestInit, ok?: string) => {
    if (!pollId) return;
    setBusy(true);
    try {
      const data = await call(token, `/api/polls/${encodeURIComponent(pollId)}${path}`, init);
      if (mounted.current && data?.id) setPoll(data);
      if (ok) toast.success(ok);
      return true;
    } catch (e: any) {
      toast.error(e?.message || t('Something went wrong', 'কিছু ভুল হয়েছে'));
      return false;
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const openVoters = async (optionId: string, text: string, cursor?: string | null) => {
    if (!pollId) return;
    setVoters(v => ({ optionId, text, list: cursor && v ? v.list : [], next: null, loading: true }));
    try {
      const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const data = await call(token, `/api/polls/${encodeURIComponent(pollId)}/options/${encodeURIComponent(optionId)}/voters${q}`);
      setVoters(v => ({ optionId, text, list: [...(cursor && v ? v.list : []), ...(data?.voters || [])], next: data?.nextCursor || null, loading: false }));
    } catch (e: any) {
      toast.error(e?.message || t('Could not load voters', 'ভোটারদের তালিকা আনা যায়নি'));
      setVoters(null);
    }
  };

  const timeLabel = useMemo(() => {
    if (!poll) return '';
    if (poll.closed) return poll.closedAt && (!poll.expiresAt || new Date(poll.closedAt) < new Date(poll.expiresAt)) ? t('Ended early', 'আগেই শেষ করা হয়েছে') : t('Final results', 'চূড়ান্ত ফলাফল');
    const left = pollTimeLeft(poll.expiresAt);
    if (!left) return t('No end date', 'শেষের সময় নেই');
    const n = localNum(left.value, isBn);
    if (left.unit === 'd') return t(`${left.value} day${left.value === 1 ? '' : 's'} left`, `${n} দিন বাকি`);
    if (left.unit === 'h') return t(`${left.value} hour${left.value === 1 ? '' : 's'} left`, `${n} ঘণ্টা বাকি`);
    return t(`${left.value} min left`, `${n} মিনিট বাকি`);
  }, [poll, t, isBn]);

  if (!pollId) return null;
  if (!poll) {
    return loading ? (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground" aria-busy="true">
        <Loader2 size={14} className="animate-spin" aria-hidden /> {t('Loading poll', 'পোল লোড হচ্ছে')}
      </div>
    ) : null;
  }

  if (editing) {
    return (
      <div className="mb-2">
        <PollComposerEditor poll={editing} onChange={next => next && setEditing(next)} hideRemove />
        <div className="mx-3 flex justify-end gap-2 sm:mx-4">
          <button type="button" onClick={() => setEditing(null)} className="rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
            {t('Cancel', 'বাতিল')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const err = pollDraftError(editing, poll.question, t);
              if (err) return toast.error(err);
              const body = pollDraftPayload(editing);
              if (await action('', { method: 'PATCH', body: JSON.stringify({ ...body, question: body.question || poll.question }) }, t('Poll updated', 'পোল আপডেট হয়েছে'))) setEditing(null);
            }}
            className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            {t('Save poll', 'পোল সংরক্ষণ')}
          </button>
        </div>
      </div>
    );
  }

  const totalVoters = poll.totalVoters ?? 0;
  const groupRole = poll.multiChoice ? 'group' : 'radiogroup';
  const headingId = `poll-q-${poll.id}`;

  return (
    <section className="mx-3 mb-2 rounded-xl border border-border/60 bg-muted/20 p-3 text-foreground" aria-labelledby={headingId} onClick={e => e.stopPropagation()}>
      <div className="mb-2 flex items-start gap-2">
        <BarChart2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
        <h3 id={headingId} className="min-w-0 flex-1 break-words text-sm font-bold">{poll.question}</h3>
        {poll.isAuthor && !poll.closed && (
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen(o => !o)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label={t('Poll options', 'পোল অপশন')} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
              <MoreHorizontal size={16} aria-hidden />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 z-30 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-popover py-1 text-xs shadow-lg">
                {poll.canEdit && (
                  <button
                    role="menuitem"
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing({
                        question: poll.question,
                        options: poll.options.map(o => o.text),
                        durationPreset: poll.expiresAt ? 'custom' : 'none',
                        expiresAt: poll.expiresAt,
                        multiChoice: poll.multiChoice,
                        allowAddOptions: poll.allowAddOptions,
                        anonymous: poll.anonymous,
                        resultsVisibility: poll.resultsVisibility,
                      });
                    }}
                  >
                    <Pencil size={13} aria-hidden /> {t('Edit poll', 'পোল এডিট')}
                  </button>
                )}
                <button
                  role="menuitem"
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-destructive hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false);
                    if (window.confirm(t('End this poll now? Voting will stop.', 'এখনই পোল শেষ করবেন? আর ভোট দেওয়া যাবে না।'))) {
                      void action('/close', { method: 'POST' }, t('Poll ended', 'পোল শেষ হয়েছে'));
                    }
                  }}
                >
                  <Lock size={13} aria-hidden /> {t('End poll now', 'এখনই পোল শেষ করুন')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] font-semibold text-muted-foreground">
        {poll.multiChoice && <span className="rounded-full bg-muted px-2 py-0.5">{t('Multiple answers', 'একাধিক উত্তর')}</span>}
        {poll.anonymous && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5"><EyeOff size={10} aria-hidden /> {t('Anonymous', 'বেনামি')}</span>
        )}
        {!poll.resultsVisible && (
          <span className="rounded-full bg-muted px-2 py-0.5">
            {poll.resultsVisibility === 'after_close' ? t('Results after poll ends', 'পোল শেষে ফলাফল') : t('Vote to see results', 'ফলাফল দেখতে ভোট দিন')}
          </span>
        )}
      </div>

      <div role={votingMode ? groupRole : 'list'} aria-labelledby={headingId} aria-live="polite" className="space-y-1.5">
        {poll.options.map(opt => {
          const selected = selection.includes(opt.id);
          if (votingMode) {
            return (
              <button
                key={opt.id}
                type="button"
                role={poll.multiChoice ? 'checkbox' : 'radio'}
                aria-checked={selected}
                disabled={busy}
                onClick={() => {
                  if (poll.multiChoice) setSelection(s => (s.includes(opt.id) ? s.filter(x => x !== opt.id) : [...s, opt.id]));
                  else void submitVote([opt.id]);
                }}
                className={`relative flex w-full items-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-primary/5'}`}
              >
                {poll.resultsVisible && (
                  <span className="absolute inset-y-0 left-0 bg-muted-foreground/10 transition-[width] duration-500" style={{ width: `${opt.percentage ?? 0}%` }} aria-hidden />
                )}
                <span className={`relative flex h-4 w-4 shrink-0 items-center justify-center border ${poll.multiChoice ? 'rounded' : 'rounded-full'} ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50'}`} aria-hidden>
                  {selected && <Check size={11} />}
                </span>
                <span className="relative min-w-0 flex-1 break-words">{opt.text}</span>
                {poll.resultsVisible && <span className="relative shrink-0 tabular-nums">{localNum(opt.percentage ?? 0, isBn)}%</span>}
                {opt.addedByVoter && <span className="text-[9px] font-normal text-muted-foreground">{t('added', 'যোগ করা')}</span>}
              </button>
            );
          }
          const pct = opt.percentage ?? 0;
          const canSeeVoters = poll.resultsVisible && !poll.anonymous && (opt.voteCount ?? 0) > 0;
          return (
            <div key={opt.id} role="listitem" className={`relative overflow-hidden rounded-lg border px-3 py-2 ${opt.isWinner ? 'border-primary/60' : 'border-border/60'}`}>
              {poll.resultsVisible && (
                <div
                  className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${opt.isWinner ? 'bg-primary/25' : opt.votedByMe ? 'bg-primary/15' : 'bg-muted-foreground/10'}`}
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              )}
              <div className="relative flex items-center gap-2 text-xs">
                {opt.isWinner && <Trophy size={12} className="shrink-0 text-primary" aria-label={t('Winner', 'বিজয়ী')} />}
                <span className={`min-w-0 flex-1 break-words ${opt.isWinner ? 'font-bold' : 'font-semibold'}`}>{opt.text}</span>
                {opt.votedByMe && (
                  <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-primary">
                    <Check size={11} aria-hidden /> {t('Your vote', 'আপনার ভোট')}
                  </span>
                )}
                {poll.resultsVisible && (
                  canSeeVoters ? (
                    <button type="button" onClick={() => openVoters(opt.id, opt.text)} className="shrink-0 font-bold tabular-nums underline-offset-2 hover:underline" aria-label={t(`${pct}%, ${opt.voteCount} votes. See who voted`, `${localNum(pct, true)}%, ${localNum(opt.voteCount ?? 0, true)} ভোট। কারা ভোট দিয়েছে দেখুন`)}>
                      {localNum(pct, isBn)}%
                    </button>
                  ) : (
                    <span className="shrink-0 font-bold tabular-nums" aria-label={t(`${pct}%, ${opt.voteCount ?? 0} votes`, `${localNum(pct, true)}%, ${localNum(opt.voteCount ?? 0, true)} ভোট`)}>{localNum(pct, isBn)}%</span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {votingMode && poll.multiChoice && (
        <button
          type="button"
          disabled={busy || selection.length === 0}
          onClick={() => submitVote(selection)}
          className="mt-2 w-full rounded-full bg-primary py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 size={13} className="mx-auto animate-spin" aria-hidden /> : t('Vote', 'ভোট দিন')}
        </button>
      )}

      {poll.canAddOption && !poll.closed && (
        showAdd ? (
          <form
            className="mt-2 flex items-center gap-1.5"
            onSubmit={async e => {
              e.preventDefault();
              const text = adding.trim();
              if (!text) return;
              if (await action('/options', { method: 'POST', body: JSON.stringify({ text }) }, t('Option added', 'অপশন যোগ হয়েছে'))) {
                setAdding('');
                setShowAdd(false);
              }
            }}
          >
            <input
              autoFocus
              value={adding}
              maxLength={POLL_OPTION_MAX_LEN}
              onChange={e => setAdding(e.target.value)}
              placeholder={t('New option', 'নতুন অপশন')}
              aria-label={t('New option', 'নতুন অপশন')}
              className="min-w-0 flex-1 rounded-lg border border-border bg-card/70 px-3 py-1.5 text-xs outline-none focus:border-primary/50"
            />
            <button type="submit" disabled={busy || !adding.trim()} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{t('Add', 'যোগ')}</button>
            <button type="button" onClick={() => setShowAdd(false)} aria-label={t('Cancel', 'বাতিল')} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X size={14} aria-hidden /></button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowAdd(true)} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary">
            <Plus size={12} aria-hidden /> {t('Add an option', 'অপশন যোগ করুন')}
          </button>
        )
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {poll.totalVoters != null && (
          <span className="flex items-center gap-1"><Users size={11} aria-hidden /> {t(`${totalVoters} vote${totalVoters === 1 ? '' : 's'}`, `${localNum(totalVoters, true)} ভোট`)}</span>
        )}
        <span className="flex items-center gap-1"><Clock size={11} aria-hidden /> {timeLabel}</span>
        {poll.canVote && poll.hasVoted && !changing && (
          <>
            <button type="button" disabled={busy} onClick={() => { setSelection(poll.myVotes); setChanging(true); }} className="font-bold text-primary hover:underline">
              {t('Change vote', 'ভোট পরিবর্তন')}
            </button>
            <button type="button" disabled={busy} onClick={() => submitVote([])} className="font-bold hover:underline">
              {t('Remove vote', 'ভোট তুলে নিন')}
            </button>
          </>
        )}
        {changing && (
          <button type="button" onClick={() => setChanging(false)} className="font-bold hover:underline">{t('Cancel', 'বাতিল')}</button>
        )}
        {!poll.canVote && !poll.closed && !token && <span>{t('Log in to vote', 'ভোট দিতে লগইন করুন')}</span>}
      </div>

      {voters && (
        <div role="dialog" aria-modal="true" aria-label={t('Voters', 'ভোটাররা')} className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setVoters(null)} onKeyDown={e => e.key === 'Escape' && setVoters(null)}>
          <div className="max-h-[70vh] w-full max-w-sm overflow-hidden rounded-t-2xl border border-border bg-card text-foreground shadow-xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="min-w-0 truncate text-sm font-bold">{voters.text}</p>
              <button type="button" autoFocus onClick={() => setVoters(null)} aria-label={t('Close', 'বন্ধ করুন')} className="rounded-full p-1 hover:bg-muted"><X size={16} aria-hidden /></button>
            </div>
            <ul className="max-h-[55vh] overflow-y-auto p-2">
              {voters.list.map(v => (
                <li key={v.id}>
                  <a href={`/profile/${encodeURIComponent(v.id)}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                    {v.avatar ? <img src={v.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="h-8 w-8 rounded-full bg-muted" aria-hidden />}
                    <span className="min-w-0 truncate font-semibold">{v.name || v.username || t('User', 'ব্যবহারকারী')}</span>
                  </a>
                </li>
              ))}
              {!voters.loading && voters.list.length === 0 && <li className="px-2 py-4 text-center text-xs text-muted-foreground">{t('No visible voters', 'দেখানোর মতো কোনো ভোটার নেই')}</li>}
              {voters.loading && <li className="flex justify-center py-3"><Loader2 size={16} className="animate-spin" aria-hidden /></li>}
              {voters.next && !voters.loading && (
                <li>
                  <button type="button" onClick={() => openVoters(voters.optionId, voters.text, voters.next)} className="w-full py-2 text-xs font-bold text-primary">{t('Load more', 'আরও দেখুন')}</button>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}