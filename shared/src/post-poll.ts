/**
 * Post poll rules shared by the composer (frontend) and the polls API (backend).
 * Pure: no I/O, so both sides validate identically and it is unit-testable.
 */

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;
export const POLL_OPTION_MAX_LEN = 80;
export const POLL_QUESTION_MAX_LEN = 280;
/** Custom durations: 5 minutes .. 30 days. */
export const POLL_MIN_DURATION_MS = 5 * 60 * 1000;
export const POLL_MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type PollDurationPreset = '1d' | '3d' | '7d' | 'custom' | 'none';
export const POLL_DURATION_PRESET_HOURS: Record<'1d' | '3d' | '7d', number> = { '1d': 24, '3d': 72, '7d': 168 };

/** always = everyone sees results; after_vote = only voters/author (or once closed); after_close = only once the poll ended (author always). */
export type PollResultsVisibility = 'always' | 'after_vote' | 'after_close';
export const POLL_RESULTS_VISIBILITY: PollResultsVisibility[] = ['always', 'after_vote', 'after_close'];

export interface PollDraftInput {
  question?: unknown;
  options?: unknown;
  expiresAt?: unknown;
  durationHours?: unknown;
  durationPreset?: unknown;
  multiChoice?: unknown;
  allowAddOptions?: unknown;
  anonymous?: unknown;
  resultsVisibility?: unknown;
}

export interface ValidPollDraft {
  question: string;
  options: string[];
  expiresAt: Date | null;
  multiChoice: boolean;
  allowAddOptions: boolean;
  anonymous: boolean;
  resultsVisibility: PollResultsVisibility;
}

export type PollValidation<T> = { ok: true; value: T } | { ok: false; error: string; code: string };

const fail = (code: string, error: string) => ({ ok: false as const, code, error });

export function cleanPollText(v: unknown, max: number): string {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Normalises and validates one option label (returns '' if empty). */
export function cleanPollOption(v: unknown): string {
  return cleanPollText(v, POLL_OPTION_MAX_LEN);
}

export function normalizeResultsVisibility(v: unknown): PollResultsVisibility {
  return POLL_RESULTS_VISIBILITY.includes(v as PollResultsVisibility) ? (v as PollResultsVisibility) : 'always';
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** Resolves the end time from preset / hours / absolute date. Returns undefined when invalid. */
export function resolvePollExpiry(raw: PollDraftInput, now: Date = new Date()): Date | null | undefined {
  const preset = typeof raw.durationPreset === 'string' ? raw.durationPreset : '';
  if (preset === 'none') return null;
  if (preset === '1d' || preset === '3d' || preset === '7d') {
    return new Date(now.getTime() + POLL_DURATION_PRESET_HOURS[preset] * 3600_000);
  }
  if (raw.expiresAt != null && raw.expiresAt !== '') {
    const d = new Date(String(raw.expiresAt));
    if (Number.isNaN(d.getTime())) return undefined;
    const delta = d.getTime() - now.getTime();
    if (delta < POLL_MIN_DURATION_MS || delta > POLL_MAX_DURATION_MS) return undefined;
    return d;
  }
  if (raw.durationHours != null && raw.durationHours !== '') {
    const h = Number(raw.durationHours);
    if (!Number.isFinite(h) || h * 3600_000 < POLL_MIN_DURATION_MS || h * 3600_000 > POLL_MAX_DURATION_MS) return undefined;
    return new Date(now.getTime() + h * 3600_000);
  }
  if (preset === 'custom') return undefined;
  return null;
}

/** Validates a composer/API poll draft. `fallbackQuestion` (post text) is used when the question is blank. */
export function validatePollDraft(
  raw: unknown,
  fallbackQuestion = '',
  now: Date = new Date(),
): PollValidation<ValidPollDraft> {
  if (!raw || typeof raw !== 'object') return fail('poll_invalid', 'Invalid poll');
  const r = raw as PollDraftInput;
  const question = cleanPollText(r.question, POLL_QUESTION_MAX_LEN) || cleanPollText(fallbackQuestion, POLL_QUESTION_MAX_LEN);
  if (!question) return fail('poll_question_required', 'Add a question or post text for the poll');
  if (!Array.isArray(r.options)) return fail('poll_options_required', 'Poll needs at least 2 options');
  const rawOpts = r.options as unknown[];
  if (rawOpts.length > POLL_MAX_OPTIONS * 2) return fail('poll_too_many_options', `At most ${POLL_MAX_OPTIONS} options`);
  const options: string[] = [];
  const seen = new Set<string>();
  for (const o of rawOpts) {
    const t = cleanPollOption(o);
    if (!t) continue;
    const key = t.toLocaleLowerCase();
    if (seen.has(key)) return fail('poll_duplicate_option', 'Options must be different');
    seen.add(key);
    options.push(t);
  }
  if (options.length < POLL_MIN_OPTIONS) return fail('poll_options_required', 'Poll needs at least 2 options');
  if (options.length > POLL_MAX_OPTIONS) return fail('poll_too_many_options', `At most ${POLL_MAX_OPTIONS} options`);
  const expiresAt = resolvePollExpiry(r, now);
  if (expiresAt === undefined) return fail('poll_invalid_duration', 'Poll must end between 5 minutes and 30 days from now');
  return {
    ok: true,
    value: {
      question,
      options,
      expiresAt,
      multiChoice: bool(r.multiChoice),
      allowAddOptions: bool(r.allowAddOptions),
      anonymous: bool(r.anonymous),
      resultsVisibility: normalizeResultsVisibility(r.resultsVisibility),
    },
  };
}

/** Validates a vote selection against the poll's options. Empty selection is invalid (use retract). */
export function validateVoteSelection(
  raw: unknown,
  validOptionIds: readonly string[],
  multiChoice: boolean,
): PollValidation<string[]> {
  const arr = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const ids = [...new Set(arr.map(x => String(x ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return fail('poll_no_selection', 'Select an option');
  const valid = new Set(validOptionIds);
  if (ids.some(id => !valid.has(id))) return fail('poll_bad_option', 'Option does not belong to this poll');
  if (!multiChoice && ids.length > 1) return fail('poll_single_choice', 'This poll allows only one choice');
  return { ok: true, value: ids };
}

export function isPollClosed(p: { expiresAt?: Date | string | null; closedAt?: Date | string | null }, now: Date = new Date()): boolean {
  if (p.closedAt) return true;
  if (!p.expiresAt) return false;
  const t = new Date(p.expiresAt).getTime();
  return Number.isFinite(t) && t <= now.getTime();
}

export function canSeePollResults(args: {
  visibility: PollResultsVisibility | string | null | undefined;
  isAuthor: boolean;
  hasVoted: boolean;
  closed: boolean;
}): boolean {
  if (args.isAuthor || args.closed) return true;
  const v = normalizeResultsVisibility(args.visibility);
  if (v === 'always') return true;
  if (v === 'after_vote') return args.hasVoted;
  return false;
}

/**
 * Percentages that always sum to 100 (largest remainder), relative to the
 * number of voters for single choice and total selections for multi choice.
 */
export function pollPercentages(counts: readonly number[], base?: number): number[] {
  const total = base ?? counts.reduce((a, b) => a + b, 0);
  if (!total) return counts.map(() => 0);
  const exact = counts.map(c => (c / total) * 100);
  const floor = exact.map(Math.floor);
  const sumExact = Math.round(exact.reduce((a, b) => a + b, 0));
  let rest = sumExact - floor.reduce((a, b) => a + b, 0);
  const order = exact.map((e, i) => ({ i, r: e - Math.floor(e) })).sort((a, b) => b.r - a.r);
  for (const { i } of order) {
    if (rest <= 0) break;
    floor[i] += 1;
    rest -= 1;
  }
  return floor;
}

export interface PollOptionRow { id: string; text: string; order: number; voteCount: number; createdById?: string | null }

export interface SerializedPollOption {
  id: string;
  text: string;
  order: number;
  voteCount: number | null;
  percentage: number | null;
  isWinner: boolean;
  votedByMe: boolean;
  addedByVoter: boolean;
}

export interface SerializedPoll {
  id: string;
  postId: string | null;
  question: string;
  multiChoice: boolean;
  allowAddOptions: boolean;
  anonymous: boolean;
  resultsVisibility: PollResultsVisibility;
  expiresAt: string | null;
  closedAt: string | null;
  closed: boolean;
  createdAt: string;
  options: SerializedPollOption[];
  totalVotes: number | null;
  totalVoters: number | null;
  myVotes: string[];
  hasVoted: boolean;
  resultsVisible: boolean;
  isAuthor: boolean;
  canEdit: boolean;
  canAddOption: boolean;
  canVote: boolean;
}

export function serializePoll(args: {
  poll: {
    id: string;
    postId: string | null;
    userId: string;
    question: string;
    multiChoice: boolean;
    allowAddOptions?: boolean | null;
    anonymous?: boolean | null;
    resultsVisibility?: string | null;
    expiresAt: Date | string | null;
    closedAt?: Date | string | null;
    createdAt: Date | string;
  };
  options: PollOptionRow[];
  totalVoters: number;
  viewerId: string | null;
  myVotes: string[];
  now?: Date;
}): SerializedPoll {
  const { poll, viewerId } = args;
  const now = args.now ?? new Date();
  const closed = isPollClosed(poll, now);
  const isAuthor = !!viewerId && viewerId === poll.userId;
  const myVotes = args.myVotes;
  const hasVoted = myVotes.length > 0;
  const resultsVisible = canSeePollResults({ visibility: poll.resultsVisibility, isAuthor, hasVoted, closed });
  const sorted = [...args.options].sort((a, b) => a.order - b.order);
  const counts = sorted.map(o => o.voteCount);
  const totalVotes = counts.reduce((a, b) => a + b, 0);
  const pct = pollPercentages(counts, poll.multiChoice ? args.totalVoters : undefined);
  const max = Math.max(0, ...counts);
  const mine = new Set(myVotes);
  return {
    id: poll.id,
    postId: poll.postId,
    question: poll.question,
    multiChoice: !!poll.multiChoice,
    allowAddOptions: !!poll.allowAddOptions,
    anonymous: !!poll.anonymous,
    resultsVisibility: normalizeResultsVisibility(poll.resultsVisibility),
    expiresAt: poll.expiresAt ? new Date(poll.expiresAt).toISOString() : null,
    closedAt: poll.closedAt ? new Date(poll.closedAt).toISOString() : null,
    closed,
    createdAt: new Date(poll.createdAt).toISOString(),
    options: sorted.map((o, i) => ({
      id: o.id,
      text: o.text,
      order: o.order,
      voteCount: resultsVisible ? o.voteCount : null,
      percentage: resultsVisible ? pct[i] : null,
      isWinner: resultsVisible && closed && max > 0 && o.voteCount === max,
      votedByMe: mine.has(o.id),
      addedByVoter: !!o.createdById && o.createdById !== poll.userId,
    })),
    totalVotes: resultsVisible ? totalVotes : null,
    totalVoters: resultsVisible ? args.totalVoters : null,
    myVotes,
    hasVoted,
    resultsVisible,
    isAuthor,
    canEdit: isAuthor && !closed && totalVotes === 0,
    canAddOption: !!viewerId && !closed && (isAuthor || !!poll.allowAddOptions) && sorted.length < POLL_MAX_OPTIONS,
    canVote: !!viewerId && !closed,
  };
}

/** Who may list voters of an option. Anonymous polls never expose voters. */
export function canListPollVoters(args: { anonymous: boolean; resultsVisible: boolean }): boolean {
  return !args.anonymous && args.resultsVisible;
}

/** Throttle window for "people voted on your poll" notifications to the author. */
export const POLL_VOTE_NOTIFY_WINDOW_MS = 30 * 60 * 1000;
export function shouldNotifyPollAuthor(lastNotifiedAt: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!lastNotifiedAt) return true;
  const t = new Date(lastNotifiedAt).getTime();
  return !Number.isFinite(t) || now.getTime() - t >= POLL_VOTE_NOTIFY_WINDOW_MS;
}

/** Human remaining-time parts for the card; null when no end. */
export function pollTimeLeft(expiresAt: string | Date | null | undefined, now: Date = new Date()):
  | { unit: 'd' | 'h' | 'm'; value: number }
  | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return { unit: 'm', value: 0 };
  const m = Math.ceil(ms / 60000);
  if (m >= 60 * 24) return { unit: 'd', value: Math.floor(m / (60 * 24)) };
  if (m >= 60) return { unit: 'h', value: Math.floor(m / 60) };
  return { unit: 'm', value: m };
}