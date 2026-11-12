import React from 'react';
import { ArrowDown, ArrowUp, BarChart2, Plus, X } from 'lucide-react';
import type { PostEditPollState } from '@wevsoft/shared/post-edit-state';
import {
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LEN,
  POLL_QUESTION_MAX_LEN,
  type PollDurationPreset,
  type PollResultsVisibility,
} from '@wevsoft/shared/post-poll';
import { usePollT } from './pollText';

export function emptyPollDraft(): PostEditPollState {
  return {
    question: '',
    options: ['', ''],
    expiresAt: null,
    durationPreset: '1d',
    multiChoice: false,
    allowAddOptions: false,
    anonymous: false,
    resultsVisibility: 'always',
  };
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  poll: PostEditPollState;
  onChange: (next: PostEditPollState | null) => void;
  /** Hide the remove button (inline edit of an existing poll). */
  hideRemove?: boolean;
  /** Question placeholder hint, e.g. "defaults to your post text". */
  questionHint?: string;
}

/** Composer block for building a post poll: question, 2-10 options, duration and settings. */
export const PollComposerEditor: React.FC<Props> = ({ poll, onChange, hideRemove, questionHint }) => {
  const { t } = usePollT();
  const preset: PollDurationPreset = poll.durationPreset ?? (poll.expiresAt ? 'custom' : 'none');
  const set = (patch: Partial<PostEditPollState>) => onChange({ ...poll, ...patch });
  const optionRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= poll.options.length) return;
    const options = [...poll.options];
    [options[i], options[j]] = [options[j], options[i]];
    set({ options });
    requestAnimationFrame(() => optionRefs.current[j]?.focus());
  };
  const addOption = () => {
    if (poll.options.length >= POLL_MAX_OPTIONS) return;
    set({ options: [...poll.options, ''] });
    requestAnimationFrame(() => optionRefs.current[poll.options.length]?.focus());
  };

  const lowered = poll.options.map(o => o.trim().toLocaleLowerCase());
  const isDup = (i: number) => !!lowered[i] && lowered.indexOf(lowered[i]) !== i;
  const minCustom = toLocalInput(new Date(Date.now() + 6 * 60_000).toISOString());
  const maxCustom = toLocalInput(new Date(Date.now() + 30 * 24 * 3600_000).toISOString());

  const presets: Array<{ id: PollDurationPreset; label: string }> = [
    { id: '1d', label: t('1 day', '১ দিন') },
    { id: '3d', label: t('3 days', '৩ দিন') },
    { id: '7d', label: t('1 week', '১ সপ্তাহ') },
    { id: 'custom', label: t('Custom', 'কাস্টম') },
    { id: 'none', label: t('No end', 'শেষ নেই') },
  ];
  const visOpts: Array<{ id: PollResultsVisibility; label: string }> = [
    { id: 'always', label: t('Always', 'সবসময়') },
    { id: 'after_vote', label: t('After voting', 'ভোট দেওয়ার পরে') },
    { id: 'after_close', label: t('After poll ends', 'পোল শেষ হলে') },
  ];

  const Toggle = ({ checked, onToggle, label, hint }: { checked: boolean; onToggle: () => void; label: string; hint: string }) => (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-1 py-1 hover:bg-muted/40">
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-foreground">{label}</span>
        <span className="block text-[10px] text-muted-foreground">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );

  return (
    <fieldset className="mx-3 mb-2 space-y-2.5 rounded-xl border border-border/70 bg-muted/25 p-3 sm:mx-4" aria-label={t('Poll', 'পোল')}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <BarChart2 size={14} className="text-primary" aria-hidden />
          {t('Poll', 'পোল')}
        </span>
        {!hideRemove && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground focus-visible:underline"
          >
            {t('Remove poll', 'পোল সরান')}
          </button>
        )}
      </div>

      <div>
        <input
          type="text"
          value={poll.question}
          maxLength={POLL_QUESTION_MAX_LEN}
          onChange={e => set({ question: e.target.value.slice(0, POLL_QUESTION_MAX_LEN) })}
          placeholder={questionHint || t('Ask a question (optional, uses your post text)', 'প্রশ্ন লিখুন (ঐচ্ছিক, না দিলে পোস্টের লেখা)')}
          aria-label={t('Poll question', 'পোলের প্রশ্ন')}
          className="w-full rounded-lg border border-border bg-card/70 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
        {poll.question.length > POLL_QUESTION_MAX_LEN - 40 && (
          <p className="mt-0.5 text-right text-[10px] text-muted-foreground">{poll.question.length}/{POLL_QUESTION_MAX_LEN}</p>
        )}
      </div>

      <ol className="space-y-1.5" aria-label={t('Options', 'অপশনসমূহ')}>
        {poll.options.map((opt, i) => (
          <li key={i} className="flex items-center gap-1">
            <input
              ref={el => { optionRefs.current[i] = el; }}
              type="text"
              value={opt}
              maxLength={POLL_OPTION_MAX_LEN}
              onChange={e => set({ options: poll.options.map((o, idx) => (idx === i ? e.target.value.slice(0, POLL_OPTION_MAX_LEN) : o)) })}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (i === poll.options.length - 1) addOption();
                  else optionRefs.current[i + 1]?.focus();
                } else if (e.altKey && e.key === 'ArrowUp') {
                  e.preventDefault();
                  move(i, -1);
                } else if (e.altKey && e.key === 'ArrowDown') {
                  e.preventDefault();
                  move(i, 1);
                }
              }}
              placeholder={`${t('Option', 'অপশন')} ${i + 1}${i >= POLL_MIN_OPTIONS ? ` (${t('optional', 'ঐচ্ছিক')})` : ''}`}
              aria-label={`${t('Option', 'অপশন')} ${i + 1}`}
              aria-invalid={isDup(i) || undefined}
              className={`min-w-0 flex-1 rounded-lg border bg-card/70 px-3 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50 ${isDup(i) ? 'border-destructive' : 'border-border'}`}
            />
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t(`Move option ${i + 1} up`, `অপশন ${i + 1} উপরে`)} className="rounded-full p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
              <ArrowUp size={12} aria-hidden />
            </button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === poll.options.length - 1} aria-label={t(`Move option ${i + 1} down`, `অপশন ${i + 1} নিচে`)} className="rounded-full p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
              <ArrowDown size={12} aria-hidden />
            </button>
            {poll.options.length > POLL_MIN_OPTIONS && (
              <button
                type="button"
                onClick={() => set({ options: poll.options.filter((_, idx) => idx !== i) })}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                aria-label={t(`Remove option ${i + 1}`, `অপশন ${i + 1} সরান`)}
              >
                <X size={12} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ol>
      {poll.options.some((_, i) => isDup(i)) && (
        <p role="alert" className="text-[10px] font-semibold text-destructive">{t('Options must be different', 'অপশনগুলো আলাদা হতে হবে')}</p>
      )}
      {poll.options.length < POLL_MAX_OPTIONS && (
        <button type="button" onClick={addOption} className="flex items-center gap-1 text-[11px] font-bold text-primary focus-visible:underline">
          <Plus size={12} aria-hidden /> {t('Add option', 'অপশন যোগ করুন')}
          <span className="font-normal text-muted-foreground">({poll.options.length}/{POLL_MAX_OPTIONS})</span>
        </button>
      )}

      <div role="radiogroup" aria-label={t('Poll length', 'পোলের সময়কাল')} className="space-y-1">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t('Poll length', 'পোলের সময়কাল')}</span>
        <div className="flex flex-wrap gap-1">
          {presets.map(p => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={preset === p.id}
              onClick={() =>
                set({
                  durationPreset: p.id,
                  expiresAt: p.id === 'custom' ? poll.expiresAt || new Date(Date.now() + 2 * 24 * 3600_000).toISOString() : null,
                })
              }
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${preset === p.id ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <label className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <span>{t('Ends at', 'শেষ হবে')}</span>
            <input
              type="datetime-local"
              value={toLocalInput(poll.expiresAt)}
              min={minCustom}
              max={maxCustom}
              onChange={e => set({ expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="rounded-md border border-border bg-card/70 px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/50"
            />
          </label>
        )}
      </div>

      <div className="space-y-0.5 border-t border-border/60 pt-2">
        <Toggle
          checked={!!poll.multiChoice}
          onToggle={() => set({ multiChoice: !poll.multiChoice })}
          label={t('Allow multiple answers', 'একাধিক উত্তর দেওয়া যাবে')}
          hint={t('Voters can pick more than one option', 'ভোটাররা একাধিক অপশন বেছে নিতে পারবেন')}
        />
        <Toggle
          checked={!!poll.allowAddOptions}
          onToggle={() => set({ allowAddOptions: !poll.allowAddOptions })}
          label={t('Let people add options', 'অন্যরাও অপশন যোগ করতে পারবে')}
          hint={t(`Anyone who can see the post can add (up to ${POLL_MAX_OPTIONS})`, `পোস্ট দেখতে পারা যে কেউ যোগ করতে পারবে (সর্বোচ্চ ${POLL_MAX_OPTIONS})`)}
        />
        <Toggle
          checked={!!poll.anonymous}
          onToggle={() => set({ anonymous: !poll.anonymous })}
          label={t('Anonymous votes', 'বেনামি ভোট')}
          hint={t('Nobody, including you, can see who voted', 'কে ভোট দিয়েছে তা কেউ দেখতে পাবে না, আপনিও না')}
        />
        <label className="flex items-center justify-between gap-3 px-1 py-1">
          <span className="text-[11px] font-semibold text-foreground">{t('Show results', 'ফলাফল দেখাবে')}</span>
          <select
            value={poll.resultsVisibility || 'always'}
            onChange={e => set({ resultsVisibility: e.target.value as PollResultsVisibility })}
            className="rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary/50"
          >
            {visOpts.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </label>
      </div>
    </fieldset>
  );
};

/** Client-side mirror of the server rules; returns an error message or null. */
export function pollDraftError(
  poll: PostEditPollState,
  postText: string,
  t: (en: string, bn: string) => string,
): string | null {
  if (!poll.question.trim() && !postText.trim()) return t('Add a poll question or post text', 'পোলের প্রশ্ন বা পোস্টের লেখা দিন');
  const opts = poll.options.map(o => o.trim()).filter(Boolean);
  if (opts.length < POLL_MIN_OPTIONS) return t('Poll needs at least 2 options', 'পোলে অন্তত ২টি অপশন লাগবে');
  if (opts.length > POLL_MAX_OPTIONS) return t(`At most ${POLL_MAX_OPTIONS} options`, `সর্বোচ্চ ${POLL_MAX_OPTIONS}টি অপশন`);
  if (new Set(opts.map(o => o.toLocaleLowerCase())).size !== opts.length) return t('Options must be different', 'অপশনগুলো আলাদা হতে হবে');
  const preset = poll.durationPreset ?? (poll.expiresAt ? 'custom' : 'none');
  if (preset === 'custom') {
    const ms = poll.expiresAt ? new Date(poll.expiresAt).getTime() - Date.now() : NaN;
    if (!Number.isFinite(ms) || ms < 5 * 60_000 || ms > 30 * 24 * 3600_000) {
      return t('Poll must end between 5 minutes and 30 days from now', 'পোল এখন থেকে ৫ মিনিট থেকে ৩০ দিনের মধ্যে শেষ হতে হবে');
    }
  }
  return null;
}

/** Payload sent to the API (FormData `pollData` / draft `poll`). */
export function pollDraftPayload(poll: PostEditPollState) {
  const preset = poll.durationPreset ?? (poll.expiresAt ? 'custom' : 'none');
  return {
    question: poll.question.trim(),
    options: poll.options.map(o => o.trim()).filter(Boolean).slice(0, POLL_MAX_OPTIONS),
    durationPreset: preset,
    expiresAt: preset === 'custom' ? poll.expiresAt || null : null,
    multiChoice: !!poll.multiChoice,
    allowAddOptions: !!poll.allowAddOptions,
    anonymous: !!poll.anonymous,
    resultsVisibility: poll.resultsVisibility || 'always',
  };
}

export default PollComposerEditor;