import { POLL_THEMES, type Overlay, type StoryPollDraft } from '../model/types';

/** Non-interactive poll sticker preview for Story Studio canvas / published slide chrome. */
export default function PollStickerPreview({
  poll,
  compact,
}: {
  poll: StoryPollDraft;
  /** When true, shrink option rows for small overlay boxes. */
  compact?: boolean;
}) {
  const theme = POLL_THEMES.find((t) => t.id === poll.theme) || POLL_THEMES[1];
  const q = (poll.question || '').trim() || 'Ask a question…';
  const options =
    poll.type === 'yes_no'
      ? [
          { text: 'Yes', emoji: '👍' },
          { text: 'No', emoji: '👎' },
        ]
      : poll.options;

  return (
    <div
      className="flex h-full w-full flex-col justify-center gap-2 rounded-2xl p-3 shadow-lg"
      style={{ background: theme.bg, color: theme.fg, border: `2px solid ${theme.accent}55` }}
      dir="auto"
    >
      <p className={`font-bold leading-snug ${compact ? 'text-[22px]' : 'text-[28px]'}`} style={{ color: theme.fg }}>
        <span className="line-clamp-2">{q}</span>
      </p>
      {poll.type === 'emoji_slider' ? (
        <div className="mt-1 flex flex-col items-center gap-1">
          <span className="text-[48px] leading-none">{poll.settings.sliderEmoji || '😍'}</span>
          <div className="h-2 w-full rounded-full" style={{ background: `${theme.accent}33` }}>
            <div className="h-2 w-1/2 rounded-full" style={{ background: theme.accent }} />
          </div>
          <span className="text-[14px] opacity-70">0 — 100</span>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {options.slice(0, 6).map((o, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 rounded-xl px-3 ${compact ? 'py-1.5 text-[18px]' : 'py-2 text-[22px]'}`}
              style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}44` }}
            >
              {o.emoji ? <span>{o.emoji}</span> : null}
              <span className="truncate font-semibold">{o.text || `Option ${i + 1}`}</span>
              {poll.type === 'quiz' && o.isCorrect ? (
                <span className="ml-auto text-[14px] opacity-60">✓</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <span className="mt-1 text-[12px] font-medium uppercase tracking-wide opacity-50">
        {poll.type.replace('_', ' ')}
      </span>
    </div>
  );
}

export function PollOverlayView({ o }: { o: Overlay }) {
  if (o.kind !== 'poll' || !o.poll) return null;
  return (
    <div
      data-overlay-id={o.id}
      style={{
        position: 'absolute',
        left: o.x,
        top: o.y,
        width: o.w,
        height: o.h,
        transform: `rotate(${o.rotation}deg)`,
        opacity: o.opacity / 100,
        pointerEvents: 'none',
      }}
    >
      <PollStickerPreview poll={o.poll} compact={o.h < 400} />
    </div>
  );
}
