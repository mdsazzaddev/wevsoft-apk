import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePollDraft,
  validateVoteSelection,
  pollPercentages,
  canSeePollResults,
  isPollClosed,
  serializePoll,
  canListPollVoters,
  shouldNotifyPollAuthor,
  resolvePollExpiry,
  pollTimeLeft,
  POLL_MAX_OPTIONS,
} from './post-poll.js';

const NOW = new Date('2026-10-25T12:00:00.000Z');

test('draft: question falls back to post text', () => {
  const r = validatePollDraft({ options: ['A', 'B'] }, '  Which one? ', NOW);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.question, 'Which one?');
});

test('draft: requires question or text', () => {
  const r = validatePollDraft({ options: ['A', 'B'] }, '', NOW);
  assert.equal(r.ok, false);
});

test('draft: 2..10 options, blanks dropped, duplicates rejected', () => {
  assert.equal(validatePollDraft({ question: 'q', options: ['A', ' '] }, '', NOW).ok, false);
  assert.equal(validatePollDraft({ question: 'q', options: ['A', 'a'] }, '', NOW).ok, false);
  const many = Array.from({ length: POLL_MAX_OPTIONS + 1 }, (_, i) => `o${i}`);
  assert.equal(validatePollDraft({ question: 'q', options: many }, '', NOW).ok, false);
  const ten = many.slice(0, POLL_MAX_OPTIONS);
  const ok = validatePollDraft({ question: 'q', options: [...ten, ''] }, '', NOW);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.value.options.length, 10);
});

test('draft: option length capped at 80', () => {
  const r = validatePollDraft({ question: 'q', options: ['x'.repeat(200), 'B'] }, '', NOW);
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.options[0].length, 80);
});

test('draft: flags and visibility normalised', () => {
  const r = validatePollDraft(
    { question: 'q', options: ['A', 'B'], multiChoice: true, allowAddOptions: 'true', anonymous: 1, resultsVisibility: 'weird' },
    '',
    NOW,
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.multiChoice, true);
    assert.equal(r.value.allowAddOptions, true);
    assert.equal(r.value.anonymous, true);
    assert.equal(r.value.resultsVisibility, 'always');
  }
});

test('expiry: presets, none, custom range', () => {
  assert.equal(resolvePollExpiry({ durationPreset: '1d' }, NOW)?.toISOString(), '2026-10-26T12:00:00.000Z');
  assert.equal(resolvePollExpiry({ durationPreset: '7d' }, NOW)?.toISOString(), '2026-11-01T12:00:00.000Z');
  assert.equal(resolvePollExpiry({ durationPreset: 'none' }, NOW), null);
  assert.equal(resolvePollExpiry({}, NOW), null);
  assert.equal(resolvePollExpiry({ durationPreset: 'custom' }, NOW), undefined);
  assert.equal(resolvePollExpiry({ expiresAt: '2026-10-25T12:01:00.000Z' }, NOW), undefined);
  assert.equal(resolvePollExpiry({ expiresAt: '2027-10-25T12:00:00.000Z' }, NOW), undefined);
  assert.ok(resolvePollExpiry({ durationPreset: 'custom', expiresAt: '2026-10-27T12:00:00.000Z' }, NOW));
  assert.equal(resolvePollExpiry({ durationHours: 48 }, NOW)?.toISOString(), '2026-10-27T12:00:00.000Z');
  assert.equal(validatePollDraft({ question: 'q', options: ['A', 'B'], expiresAt: 'nope' }, '', NOW).ok, false);
});

test('vote selection: single vs multi, foreign ids', () => {
  const ids = ['a', 'b', 'c'];
  assert.equal(validateVoteSelection([], ids, false).ok, false);
  assert.equal(validateVoteSelection(['z'], ids, true).ok, false);
  assert.equal(validateVoteSelection(['a', 'b'], ids, false).ok, false);
  const m = validateVoteSelection(['a', 'b', 'a'], ids, true);
  assert.equal(m.ok, true);
  if (m.ok) assert.deepEqual(m.value, ['a', 'b']);
  assert.equal(validateVoteSelection('c', ids, false).ok, true);
});

test('percentages sum to 100', () => {
  const p = pollPercentages([1, 1, 1]);
  assert.equal(p.reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(pollPercentages([0, 0]), [0, 0]);
  assert.deepEqual(pollPercentages([3, 1]), [75, 25]);
  // multi-choice relative to voters
  assert.deepEqual(pollPercentages([2, 1], 2), [100, 50]);
});

test('results visibility rules', () => {
  assert.equal(canSeePollResults({ visibility: 'always', isAuthor: false, hasVoted: false, closed: false }), true);
  assert.equal(canSeePollResults({ visibility: 'after_vote', isAuthor: false, hasVoted: false, closed: false }), false);
  assert.equal(canSeePollResults({ visibility: 'after_vote', isAuthor: false, hasVoted: true, closed: false }), true);
  assert.equal(canSeePollResults({ visibility: 'after_close', isAuthor: false, hasVoted: true, closed: false }), false);
  assert.equal(canSeePollResults({ visibility: 'after_close', isAuthor: false, hasVoted: false, closed: true }), true);
  assert.equal(canSeePollResults({ visibility: 'after_close', isAuthor: true, hasVoted: false, closed: false }), true);
});

test('closed state', () => {
  assert.equal(isPollClosed({ expiresAt: null }, NOW), false);
  assert.equal(isPollClosed({ expiresAt: '2026-10-25T11:59:00.000Z' }, NOW), true);
  assert.equal(isPollClosed({ expiresAt: '2026-10-26T00:00:00.000Z', closedAt: NOW }, NOW), true);
});

const basePoll = {
  id: 'p1', postId: 'post1', userId: 'author', question: 'Q', multiChoice: false,
  allowAddOptions: false, anonymous: false, resultsVisibility: 'after_vote',
  expiresAt: null, closedAt: null, createdAt: NOW,
};
const opts = [
  { id: 'b', text: 'B', order: 1, voteCount: 3 },
  { id: 'a', text: 'A', order: 0, voteCount: 1 },
];

test('serialize hides counts until allowed', () => {
  const s = serializePoll({ poll: basePoll, options: opts, totalVoters: 4, viewerId: 'v', myVotes: [], now: NOW });
  assert.equal(s.resultsVisible, false);
  assert.equal(s.totalVotes, null);
  assert.equal(s.options[0].id, 'a');
  assert.equal(s.options[0].voteCount, null);
  assert.equal(s.canEdit, false);
  assert.equal(s.canAddOption, false);
});

test('serialize after vote: percentages, my vote, winner only when closed', () => {
  const s = serializePoll({ poll: basePoll, options: opts, totalVoters: 4, viewerId: 'v', myVotes: ['b'], now: NOW });
  assert.equal(s.resultsVisible, true);
  assert.deepEqual(s.options.map(o => o.percentage), [25, 75]);
  assert.equal(s.options[1].votedByMe, true);
  assert.equal(s.options[1].isWinner, false);
  const c = serializePoll({ poll: { ...basePoll, closedAt: NOW }, options: opts, totalVoters: 4, viewerId: 'v', myVotes: [], now: NOW });
  assert.equal(c.options[1].isWinner, true);
  assert.equal(c.canVote, false);
});

test('serialize author edit only without votes', () => {
  const zero = opts.map(o => ({ ...o, voteCount: 0 }));
  assert.equal(serializePoll({ poll: basePoll, options: zero, totalVoters: 0, viewerId: 'author', myVotes: [], now: NOW }).canEdit, true);
  assert.equal(serializePoll({ poll: basePoll, options: opts, totalVoters: 4, viewerId: 'author', myVotes: [], now: NOW }).canEdit, false);
});

test('voter list blocked for anonymous polls', () => {
  assert.equal(canListPollVoters({ anonymous: true, resultsVisible: true }), false);
  assert.equal(canListPollVoters({ anonymous: false, resultsVisible: false }), false);
  assert.equal(canListPollVoters({ anonymous: false, resultsVisible: true }), true);
});

test('author notification throttle', () => {
  assert.equal(shouldNotifyPollAuthor(null, NOW), true);
  assert.equal(shouldNotifyPollAuthor(new Date(NOW.getTime() - 60_000), NOW), false);
  assert.equal(shouldNotifyPollAuthor(new Date(NOW.getTime() - 31 * 60_000), NOW), true);
});

test('time left', () => {
  assert.equal(pollTimeLeft(null, NOW), null);
  assert.deepEqual(pollTimeLeft('2026-10-27T13:00:00.000Z', NOW), { unit: 'd', value: 2 });
  assert.deepEqual(pollTimeLeft('2026-10-25T15:30:00.000Z', NOW), { unit: 'h', value: 3 });
  assert.deepEqual(pollTimeLeft('2026-10-25T12:10:00.000Z', NOW), { unit: 'm', value: 10 });
});