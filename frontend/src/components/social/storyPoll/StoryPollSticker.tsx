import { useState } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { POLL_THEMES, type StoryPollTheme } from '../../storyStudio/model/types';
import { useDepsChanged } from '../../../hooks/useValueChanged';

export interface StoryPollApi {
  id: string;
  storyId: string;
  type: string;
  question: string;
  theme: string;
  position?: { x: number; y: number; w: number; h: number; rotation: number };
  settings: {
    anonymous: boolean;
    showResults: 'before' | 'after' | 'never';
    allowChange: boolean;
    allowReply: boolean;
    maxSelections: number;
    sliderEmoji: string;
  };
  status: string;
  totalVotes?: number;
  uniqueVoters?: number;
  options: Array<{
    id: string;
    text: string;
    emoji?: string | null;
    voteCount?: number;
    percentage?: number;
    isCorrect?: boolean;
  }>;
  sliderAverage?: number | null;
  myVote?: { optionIds: string[]; sliderValue: number | null; voted: boolean } | null;
  isOwner: boolean;
  canVote: boolean;
  loginRequired?: boolean;
}

type Props = {
  storyId: string;
  token: string | null;
  poll: StoryPollApi;
  onPollUpdate: (p: StoryPollApi) => void;
  onInteract: (active: boolean) => void;
  onLoginRequired: () => void;
  scale?: number;
};

export default function StoryPollSticker({
  storyId,
  token,
  poll,
  onPollUpdate,
  onInteract,
  onLoginRequired,
  scale = 1,
}: Props) {
  const [selected, setSelected] = useState<string[]>(poll.myVote?.optionIds || []);
  const [slider, setSlider] = useState(poll.myVote?.sliderValue ?? 50);
  const [busy, setBusy] = useState(false);
  const theme = POLL_THEMES.find((t) => t.id === (poll.theme as StoryPollTheme)) || POLL_THEMES[1];
  const ended = poll.status === 'ended';
  const showResults =
    poll.isOwner ||
    poll.settings.showResults === 'before' ||
    ((poll.myVote?.voted || ended) && poll.settings.showResults === 'after');
  const pos = poll.position || { x: 140, y: 700, w: 800, h: 520, rotation: 0 };

  const myVoteChanged = useDepsChanged([poll.myVote?.optionIds?.join(','), poll.myVote?.sliderValue]);
  if (myVoteChanged) {
    setSelected(poll.myVote?.optionIds || []);
    if (poll.myVote?.sliderValue != null) setSlider(poll.myVote.sliderValue);
  }

  const submit = async (optionIds?: string[], sliderValue?: number) => {
    if (poll.loginRequired || !token) {
      onLoginRequired();
      return;
    }
    if (!poll.canVote && !(poll.settings.allowChange && poll.myVote?.voted)) return;
    if (busy) return;

    const prev = poll;
    const optimistic: StoryPollApi = {
      ...poll,
      myVote: {
        optionIds: optionIds || [],
        sliderValue: sliderValue ?? null,
        voted: true,
      },
      canVote: poll.settings.allowChange,
    };
    onPollUpdate(optimistic);
    setBusy(true);
    onInteract(true);
    try {
      const method = poll.myVote?.voted && poll.settings.allowChange ? 'PUT' : 'POST';
      const res = await fetch(`/api/stories/${storyId}/poll/vote`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionIds, sliderValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        onPollUpdate(prev);
        toast.error(data.error || 'Could not submit vote');
        return;
      }
      onPollUpdate(data);
    } catch {
      onPollUpdate(prev);
      toast.error('Network error — try again');
    } finally {
      setBusy(false);
    }
  };

  const onOptionTap = (id: string) => {
    if (poll.isOwner || ended) return;
    if (poll.loginRequired || !token) {
      onLoginRequired();
      return;
    }
    if (poll.type === 'multiple') {
      setSelected((prev) => {
        const has = prev.includes(id);
        let next = has ? prev.filter((x) => x !== id) : [...prev, id];
        if (next.length > poll.settings.maxSelections) {
          next = next.slice(-poll.settings.maxSelections);
        }
        return next;
      });
      return;
    }
    void submit([id]);
  };

  const submitMulti = () => {
    if (!selected.length) return;
    void submit(selected);
  };

  return (
    <div
      className="absolute z-20"
      style={{
        left: pos.x * scale,
        top: pos.y * scale,
        width: pos.w * scale,
        transform: `rotate(${pos.rotation}deg)`,
        transformOrigin: 'top left',
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onInteract(true);
      }}
      role="group"
      aria-label="Story poll"
    >
      <div
        className="flex flex-col gap-2 rounded-2xl p-3 shadow-xl backdrop-blur-sm"
        style={{
          background: `${theme.bg}ee`,
          color: theme.fg,
          border: `2px solid ${theme.accent}66`,
          fontSize: Math.max(12, 14 * scale * 2.2),
        }}
        dir="auto"
      >
        <p className="line-clamp-2 font-bold leading-snug" style={{ fontSize: Math.max(14, 16 * scale * 2.4) }}>
          {poll.question}
        </p>

        {ended ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Poll ended</p>
        ) : null}

        {poll.type === 'emoji_slider' ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <span style={{ fontSize: Math.max(28, 36 * scale * 2) }}>{poll.settings.sliderEmoji || '😍'}</span>
            {!poll.isOwner && (!poll.myVote?.voted || poll.settings.allowChange) && !ended ? (
              <>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slider}
                  aria-label="Poll slider"
                  onChange={(e) => setSlider(Number(e.target.value))}
                  onPointerUp={() => void submit([], slider)}
                  className="w-full"
                  style={{ accentColor: theme.accent }}
                />
                <span className="text-[12px] opacity-70">{slider}</span>
              </>
            ) : (
              <div className="w-full text-center text-[13px]">
                {poll.myVote?.sliderValue != null ? <div>You: {poll.myVote.sliderValue}</div> : null}
                {showResults && poll.sliderAverage != null ? (
                  <div className="opacity-80">Avg: {poll.sliderAverage}</div>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {poll.options.map((opt) => {
              const mine = selected.includes(opt.id) || poll.myVote?.optionIds?.includes(opt.id);
              const pct = opt.percentage ?? 0;
              const quizWrong =
                poll.type === 'quiz' && poll.myVote?.voted && mine && opt.isCorrect === false;
              const quizRight = poll.type === 'quiz' && poll.myVote?.voted && opt.isCorrect === true;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    disabled={busy || poll.isOwner || ended || (poll.myVote?.voted && !poll.settings.allowChange && poll.type !== 'multiple')}
                    onClick={() => onOptionTap(opt.id)}
                    className="relative w-full overflow-hidden rounded-xl px-3 py-2 text-left font-semibold transition disabled:opacity-90"
                    style={{
                      border: `1px solid ${
                        quizRight ? '#22c55e' : quizWrong ? '#ef4444' : mine ? theme.accent : `${theme.accent}44`
                      }`,
                      background: quizRight
                        ? '#22c55e33'
                        : quizWrong
                          ? '#ef444433'
                          : `${theme.accent}18`,
                    }}
                    aria-pressed={mine}
                  >
                    {showResults && typeof opt.percentage === 'number' ? (
                      <motion.div
                        className="absolute inset-y-0 left-0"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        style={{ background: `${theme.accent}33` }}
                      />
                    ) : null}
                    <span className="relative z-[1] flex items-center gap-2">
                      {opt.emoji ? <span>{opt.emoji}</span> : null}
                      <span className="min-w-0 flex-1 truncate">{opt.text}</span>
                      {showResults && typeof opt.percentage === 'number' ? (
                        <span className="tabular-nums opacity-80">{pct}%</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {poll.type === 'multiple' && !poll.isOwner && !ended && (!poll.myVote?.voted || poll.settings.allowChange) ? (
          <button
            type="button"
            disabled={!selected.length || busy}
            onClick={submitMulti}
            className="mt-1 rounded-full px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-40"
            style={{ background: theme.accent }}
          >
            Submit ({selected.length})
          </button>
        ) : null}

        {showResults && typeof poll.totalVotes === 'number' ? (
          <p className="text-[11px] opacity-60">
            {poll.uniqueVoters ?? poll.totalVotes} vote{(poll.uniqueVoters ?? poll.totalVotes) === 1 ? '' : 's'}
          </p>
        ) : null}

        {poll.loginRequired ? (
          <button
            type="button"
            onClick={onLoginRequired}
            className="text-[12px] font-semibold underline opacity-80"
          >
            Log in to vote
          </button>
        ) : null}
      </div>
    </div>
  );
}
