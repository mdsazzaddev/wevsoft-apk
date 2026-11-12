import { useStudio } from '../panels/StudioContext';
import {
  POLL_THEMES,
  type StoryPollDraft,
  type StoryPollOptionDraft,
  type StoryPollType,
} from '../model/types';

const TYPES: { id: StoryPollType; label: string }[] = [
  { id: 'single', label: 'Single choice' },
  { id: 'multiple', label: 'Multiple choice' },
  { id: 'yes_no', label: 'Yes / No' },
  { id: 'emoji_slider', label: 'Emoji slider' },
  { id: 'quiz', label: 'Quiz' },
];

function maxOptions(type: StoryPollType) {
  if (type === 'multiple') return 6;
  if (type === 'yes_no' || type === 'emoji_slider') return 2;
  return 4;
}

function minOptions(type: StoryPollType) {
  if (type === 'emoji_slider') return 0;
  return 2;
}

export default function PollEditorPanel() {
  const s = useStudio();
  const o = s.overlay;
  if (!o || o.kind !== 'poll' || !o.poll || !s.slide) {
    return (
      <div className="p-4 text-[13px] text-[color:var(--ss-muted)]">
        Select a poll sticker to edit question, options, and settings.
      </div>
    );
  }
  const poll = o.poll;
  const slideId = s.slide.id;

  const patchPoll = (next: Partial<StoryPollDraft>) => {
    const merged: StoryPollDraft = {
      ...poll,
      ...next,
      settings: { ...poll.settings, ...(next.settings || {}) },
      options: next.options ?? poll.options,
    };
    if (merged.type === 'yes_no') {
      merged.options = [
        { text: 'Yes', emoji: '👍' },
        { text: 'No', emoji: '👎' },
      ];
    }
    s.dispatch({
      type: 'updateOverlay',
      slideId,
      overlayId: o.id,
      patch: { poll: merged, text: merged.question, name: 'Poll' },
    });
  };

  const setType = (type: StoryPollType) => {
    let options = [...poll.options];
    if (type === 'yes_no') {
      options = [
        { text: 'Yes', emoji: '👍' },
        { text: 'No', emoji: '👎' },
      ];
    } else if (type === 'emoji_slider') {
      options = [];
    } else if (options.length < 2) {
      options = [
        { text: 'Option 1', emoji: '' },
        { text: 'Option 2', emoji: '' },
      ];
    } else {
      options = options.slice(0, maxOptions(type));
    }
    patchPoll({ type, options, correctOptionIndex: type === 'quiz' ? 0 : null });
  };

  const updateOption = (i: number, patch: Partial<StoryPollOptionDraft>) => {
    const options = poll.options.map((opt, idx) => (idx === i ? { ...opt, ...patch } : opt));
    patchPoll({ options });
  };

  const moveOption = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= poll.options.length) return;
    const options = [...poll.options];
    [options[i], options[j]] = [options[j], options[i]];
    let correct = poll.correctOptionIndex ?? null;
    if (correct === i) correct = j;
    else if (correct === j) correct = i;
    patchPoll({ options, correctOptionIndex: correct });
  };

  const addOption = () => {
    if (poll.options.length >= maxOptions(poll.type)) return;
    patchPoll({ options: [...poll.options, { text: `Option ${poll.options.length + 1}`, emoji: '' }] });
  };

  const removeOption = (i: number) => {
    if (poll.options.length <= minOptions(poll.type)) return;
    const options = poll.options.filter((_, idx) => idx !== i);
    let correct = poll.correctOptionIndex ?? null;
    if (correct === i) correct = 0;
    else if (correct != null && correct > i) correct -= 1;
    patchPoll({ options, correctOptionIndex: correct });
  };

  return (
    <div className="space-y-4 p-4" data-testid="ss-poll-editor">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ss-muted)]">
          Poll type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                poll.type === t.id
                  ? 'bg-[color:var(--ss-accent)] text-white'
                  : 'bg-[color:var(--ss-hover)] text-[color:var(--ss-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ss-muted)]">
          Question
        </label>
        <input
          value={poll.question}
          maxLength={120}
          onChange={(e) => patchPoll({ question: e.target.value.slice(0, 120) })}
          className="w-full rounded-lg border border-[color:var(--ss-border)] bg-transparent px-3 py-2 text-[14px]"
          dir="auto"
        />
        <p className="mt-0.5 text-right text-[11px] text-[color:var(--ss-muted)]">{poll.question.length}/120</p>
      </div>

      {poll.type === 'emoji_slider' ? (
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ss-muted)]">
            Slider emoji
          </label>
          <input
            value={poll.settings.sliderEmoji}
            maxLength={8}
            onChange={(e) => patchPoll({ settings: { ...poll.settings, sliderEmoji: e.target.value } })}
            className="w-24 rounded-lg border border-[color:var(--ss-border)] bg-transparent px-3 py-2 text-center text-[22px]"
          />
        </div>
      ) : (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ss-muted)]">
              Options
            </label>
            {poll.type !== 'yes_no' ? (
              <button
                type="button"
                disabled={poll.options.length >= maxOptions(poll.type)}
                onClick={addOption}
                className="text-[12px] font-semibold text-[color:var(--ss-accent)] disabled:opacity-40"
              >
                + Add
              </button>
            ) : null}
          </div>
          <ul className="space-y-2">
            {poll.options.map((opt, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <input
                  value={opt.emoji || ''}
                  onChange={(e) => updateOption(i, { emoji: e.target.value.slice(0, 8) })}
                  placeholder="😀"
                  className="w-10 shrink-0 rounded-md border border-[color:var(--ss-border)] bg-transparent px-1 py-1.5 text-center text-[16px]"
                  disabled={poll.type === 'yes_no'}
                />
                <input
                  value={opt.text}
                  maxLength={40}
                  onChange={(e) => updateOption(i, { text: e.target.value.slice(0, 40) })}
                  className="min-w-0 flex-1 rounded-md border border-[color:var(--ss-border)] bg-transparent px-2 py-1.5 text-[13px]"
                  dir="auto"
                  disabled={poll.type === 'yes_no'}
                />
                {poll.type === 'quiz' ? (
                  <button
                    type="button"
                    title="Mark correct"
                    onClick={() =>
                      patchPoll({
                        correctOptionIndex: i,
                        options: poll.options.map((x, idx) => ({ ...x, isCorrect: idx === i })),
                      })
                    }
                    className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                      (poll.correctOptionIndex ?? 0) === i || opt.isCorrect
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[color:var(--ss-hover)]'
                    }`}
                  >
                    ✓
                  </button>
                ) : null}
                {poll.type !== 'yes_no' ? (
                  <>
                    <button type="button" aria-label="Move up" onClick={() => moveOption(i, -1)} className="px-1 text-[12px] opacity-60">
                      ↑
                    </button>
                    <button type="button" aria-label="Move down" onClick={() => moveOption(i, 1)} className="px-1 text-[12px] opacity-60">
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label="Remove option"
                      disabled={poll.options.length <= minOptions(poll.type)}
                      onClick={() => removeOption(i)}
                      className="px-1 text-[12px] text-red-500 disabled:opacity-30"
                    >
                      ×
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          {poll.type === 'multiple' ? (
            <label className="mt-2 flex items-center gap-2 text-[12px]">
              Max selections
              <input
                type="number"
                min={1}
                max={poll.options.length}
                value={poll.settings.maxSelections}
                onChange={(e) =>
                  patchPoll({
                    settings: {
                      ...poll.settings,
                      maxSelections: Math.min(poll.options.length, Math.max(1, Number(e.target.value) || 1)),
                    },
                  })
                }
                className="w-14 rounded border border-[color:var(--ss-border)] bg-transparent px-2 py-1"
              />
            </label>
          ) : null}
        </div>
      )}

      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[color:var(--ss-muted)]">
          Theme
        </label>
        <div className="flex flex-wrap gap-2">
          {POLL_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => patchPoll({ theme: t.id })}
              className={`h-8 w-8 rounded-full border-2 ${poll.theme === t.id ? 'border-[color:var(--ss-accent)]' : 'border-transparent'}`}
              style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.accent})` }}
              aria-label={t.label}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-[color:var(--ss-border)] pt-3">
        <Toggle
          label="Anonymous voting"
          checked={poll.settings.anonymous}
          onChange={(v) => patchPoll({ settings: { ...poll.settings, anonymous: v } })}
        />
        <label className="flex items-center justify-between gap-2 text-[13px]">
          <span>Show results</span>
          <select
            value={poll.settings.showResults}
            onChange={(e) =>
              patchPoll({ settings: { ...poll.settings, showResults: e.target.value as any } })
            }
            className="rounded-md border border-[color:var(--ss-border)] bg-transparent px-2 py-1 text-[12px]"
          >
            <option value="before">Before voting</option>
            <option value="after">After voting</option>
            <option value="never">Never (owner only)</option>
          </select>
        </label>
        <Toggle
          label="Allow changing vote"
          checked={poll.settings.allowChange}
          onChange={(v) => patchPoll({ settings: { ...poll.settings, allowChange: v } })}
        />
        <Toggle
          label="Allow reply after voting"
          checked={poll.settings.allowReply}
          onChange={(v) => patchPoll({ settings: { ...poll.settings, allowReply: v } })}
        />
        <label className="flex items-center justify-between gap-2 text-[13px]">
          <span>Who can vote</span>
          <select
            value={poll.settings.whoCanVote}
            onChange={(e) =>
              patchPoll({ settings: { ...poll.settings, whoCanVote: e.target.value as any } })
            }
            className="rounded-md border border-[color:var(--ss-border)] bg-transparent px-2 py-1 text-[12px]"
          >
            <option value="everyone">Everyone</option>
            <option value="followers">Followers</option>
            <option value="close_friends">Close friends</option>
          </select>
        </label>
        <label className="flex items-center justify-between gap-2 text-[13px]">
          <span>Poll expiry</span>
          <select
            value={poll.settings.expiryMode}
            onChange={(e) =>
              patchPoll({ settings: { ...poll.settings, expiryMode: e.target.value as any } })
            }
            className="rounded-md border border-[color:var(--ss-border)] bg-transparent px-2 py-1 text-[12px]"
          >
            <option value="story">Ends with story</option>
            <option value="1h">1 hour</option>
            <option value="6h">6 hours</option>
            <option value="12h">12 hours</option>
            <option value="24h">24 hours</option>
          </select>
        </label>
      </div>
      <p className="text-[11px] text-[color:var(--ss-muted)]">
        Drag, resize, and rotate the sticker on the canvas. One poll per story.
      </p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-[13px]">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-[color:var(--ss-accent)]' : 'bg-zinc-500/40'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'left-4' : 'left-0.5'}`}
        />
      </button>
    </label>
  );
}
