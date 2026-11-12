import assert from 'node:assert/strict';
import test from 'node:test';
import {
  actorOwnsWallet,
  validateAnalyticsIngest,
  wevspacePayoutCreditRef,
  wevspaceTxCreditRef,
  anonymizeUserPiiPatch,
  computePerformanceScore,
  coercePerformanceScoreWeights,
  nextMilestone,
  statementPdfFilename,
  FINANCE_SKIP_NOTES,
} from './finance.js';

test('payout credit refs are stable and unique per id', () => {
  assert.equal(wevspacePayoutCreditRef('p1'), 'wevspace_payout:p1');
  assert.equal(wevspacePayoutCreditRef('p1'), wevspacePayoutCreditRef('p1'));
  assert.notEqual(wevspacePayoutCreditRef('p1'), wevspacePayoutCreditRef('p2'));
  assert.equal(wevspaceTxCreditRef('t9'), 'wevspace_tx:t9');
});

test('fake analytics client overrides are rejected', () => {
  const fake = validateAnalyticsIngest({ type: 'PROFILE_VIEW', targetType: 'user', targetId: 'u1', views: 1000000 });
  assert.equal(fake.ok, false);
  if (!fake.ok) assert.match(fake.error, /Fake analytics rejected/i);
});

test('watch-time cannot be asserted on generic track API', () => {
  const v = validateAnalyticsIngest({ type: 'VIDEO_VIEW', targetType: 'reel', targetId: 'r1' });
  assert.equal(v.ok, false);
});

test('valid profile view ingest is accepted', () => {
  const ok = validateAnalyticsIngest({ type: 'PROFILE_VIEW', targetType: 'user', targetId: 'u2' });
  assert.equal(ok.ok, true);
});

test('IDOR helper denies other personal wallets for statement export', () => {
  assert.equal(actorOwnsWallet({ ownerUserId: 'owner', context: 'PERSONAL' }, 'stranger'), false);
  assert.equal(actorOwnsWallet({ ownerUserId: 'owner', context: 'PERSONAL' }, 'owner'), true);
  assert.equal(actorOwnsWallet({ ownerUserId: 'owner', context: 'BUSINESS', spaceId: 's1' }, 'editor', ['s1']), true);
  assert.equal(actorOwnsWallet({ ownerUserId: 'owner', context: 'BUSINESS', spaceId: 's1' }, 'editor', ['other']), false);
});

test('account anonymize keeps a stable user id mapping and unique email', () => {
  const a = anonymizeUserPiiPatch('user-1');
  const b = anonymizeUserPiiPatch('user-1');
  assert.equal(a.email, b.email);
  assert.equal(a.status, 'deleted');
  assert.equal(a.name, 'Deleted user');
  assert.notEqual(anonymizeUserPiiPatch('user-2').email, a.email);
});

test('performance score is labeled and unavailable without real parts', () => {
  const empty = computePerformanceScore({});
  assert.equal(empty.available, false);
  const score = computePerformanceScore({ engagement: 40, reach: 80 });
  assert.equal(score.available, true);
  if (score.available) assert.ok(score.value > 0);
  const weights = coercePerformanceScoreWeights({ engagement: 2, growth: 0, consistency: 0, watchTime: 0, reach: 0 });
  assert.ok(Math.abs(weights.engagement - 1) < 0.001);
});

test('milestones do not repeat already-sent thresholds', () => {
  assert.equal(nextMilestone('followers', 120, [10, 50, 100]), null);
  assert.equal(nextMilestone('followers', 500, [10, 50, 100]), 500);
  assert.equal(nextMilestone('followers', 8, []), null);
});

test('statement filename and skip notes exist (Nagad/PIN not faked)', () => {
  assert.match(statementPdfFilename(new Date('2026-08-30T00:00:00Z')), /wevsoft-statement-2026-08-30\.pdf/);
  assert.match(FINANCE_SKIP_NOTES.nagadDeposit, /not faked/i);
  assert.match(FINANCE_SKIP_NOTES.withdrawalPin, /PIN skipped/i);
});
