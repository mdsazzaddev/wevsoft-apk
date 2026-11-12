import assert from 'node:assert/strict';
import test from 'node:test';
import {
  actorOwnsWallet,
  adminAdjustmentReason,
  allocateUnifiedWithdrawal,
  assertAllocationsSum,
  assertDepositAmount,
  assertWithdrawAmount,
  assertWithdrawalTransition,
  balancesAfterCompleteWithdraw,
  balancesAfterDeposit,
  balancesAfterReleaseWithdraw,
  balancesAfterReserveWithdraw,
  calcWithdrawalFee,
  canTransitionWithdrawal,
  coerceFinanceFeeConfig,
  coerceFinanceProvider,
  deltaPct,
  depositCreditAllowed,
  engagementRate,
  financeDepositOrderId,
  metricValue,
  parseFinanceDepositOrderId,
  previousPeriod,
  statementCsv,
  toCents,
  fromCents,
  watchCompletionRate,
  withdrawalFraudSignals,
} from './finance.js';

const fees = coerceFinanceFeeConfig({
  withdrawFeeFixed: 10,
  withdrawFeePercent: 1,
  withdrawFeeMin: 5,
  withdrawFeeMax: 50,
  minWithdraw: 50,
  maxWithdraw: 200000,
  manualReviewAbove: 50000,
  depositsEnabled: true,
  withdrawalsEnabled: true,
});

test('money math uses cents and never leaves float dust', () => {
  assert.equal(toCents(10.1 + 0.2), 1030);
  assert.equal(fromCents(1030), 10.3);
  const next = balancesAfterDeposit(10.1, 4.2, 0.2);
  assert.equal(next.available, 10.3);
  assert.equal(next.withdrawable, 4.4);
});

test('deposit rejects below minimum', () => {
  assert.throws(() => assertDepositAmount(1), /Minimum deposit/);
  assert.equal(assertDepositAmount(10), 10);
});

test('withdrawal fee is admin-configurable and shown as amount/fee/net', () => {
  const fee = calcWithdrawalFee(5000, fees);
  assert.equal(fee, 50);
  assert.equal(fromCents(toCents(5000) - toCents(fee)), 4950);
});

test('unified allocation 10000 = personal 4000 + business 6000 is auditable', () => {
  const rows = allocateUnifiedWithdrawal(10000, [
    { walletId: 'p', context: 'PERSONAL', available: 4000, withdrawable: 4000 },
    { walletId: 'b', context: 'BUSINESS', spaceId: 'space-1', available: 7000, withdrawable: 6000 },
  ]);
  assert.deepEqual(rows, [
    { walletId: 'p', context: 'PERSONAL', spaceId: null, amount: 4000 },
    { walletId: 'b', context: 'BUSINESS', spaceId: 'space-1', amount: 6000 },
  ]);
  assertAllocationsSum(10000, rows);
});

test('unified allocation fails instead of silently mixing leftover', () => {
  assert.throws(
    () =>
      allocateUnifiedWithdrawal(10000, [
        { walletId: 'p', context: 'PERSONAL', available: 4000, withdrawable: 4000 },
      ]),
    /Insufficient/,
  );
});

test('reserve then complete withdrawal burns reserved only', () => {
  const reserved = balancesAfterReserveWithdraw(200, 0, 200, 50);
  assert.equal(reserved.ok, true);
  if (!reserved.ok) return;
  assert.equal(reserved.available, 150);
  assert.equal(reserved.reserved, 50);
  assert.equal(reserved.withdrawable, 150);
  const done = balancesAfterCompleteWithdraw(reserved.reserved, 50);
  assert.equal(done.reserved, 0);
  const released = balancesAfterReleaseWithdraw(150, 50, 150, 50);
  assert.equal(released.available, 200);
  assert.equal(released.reserved, 0);
});

test('withdrawal state machine rejects illegal jumps', () => {
  assert.equal(canTransitionWithdrawal('REQUESTED', 'COMPLETED'), false);
  assert.throws(() => assertWithdrawalTransition('COMPLETED', 'APPROVED'));
  assert.equal(canTransitionWithdrawal('REQUESTED', 'PENDING_REVIEW'), true);
  assert.equal(canTransitionWithdrawal('APPROVED', 'PROCESSING'), true);
  assert.equal(canTransitionWithdrawal('PROCESSING', 'FAILED'), true);
});

test('IDOR: other user cannot use a personal wallet', () => {
  assert.equal(actorOwnsWallet({ ownerUserId: 'a', context: 'PERSONAL' }, 'b'), false);
  assert.equal(actorOwnsWallet({ ownerUserId: 'a', context: 'PERSONAL' }, 'a'), true);
  assert.equal(
    actorOwnsWallet({ ownerUserId: 'a', context: 'BUSINESS', spaceId: 's1' }, 'a', []),
    false,
  );
  assert.equal(
    actorOwnsWallet({ ownerUserId: 'a', context: 'BUSINESS', spaceId: 's1' }, 'editor', ['s1']),
    true,
  );
});

test('duplicate deposit credit is rejected once COMPLETED', () => {
  assert.equal(depositCreditAllowed('PENDING'), true);
  assert.equal(depositCreditAllowed('COMPLETED'), false);
  assert.equal(depositCreditAllowed('FAILED'), false);
});

test('fake analytics are unavailable rather than invented', () => {
  assert.deepEqual(metricValue(false, 123), { available: false, reason: 'insufficient_data' });
  assert.deepEqual(metricValue(true, null), { available: false, reason: 'insufficient_data' });
  assert.deepEqual(engagementRate(10, 2, 1, 0, 0), { available: false, reason: 'insufficient_data' });
  assert.deepEqual(watchCompletionRate(5, 0), { available: false, reason: 'insufficient_data' });
  assert.deepEqual(deltaPct(10, 0), { available: false, reason: 'insufficient_data' });
  assert.equal(engagementRate(10, 0, 0, 0, 100).available, true);
});

test('admin adjustment requires a reason', () => {
  assert.throws(() => adminAdjustmentReason('short'), /reason/);
  assert.equal(adminAdjustmentReason('Manual correction after ticket 123'), 'Manual correction after ticket 123');
});

test('deposit order ids round-trip and providers are existing gateways only', () => {
  const id = financeDepositOrderId('abc');
  assert.equal(parseFinanceDepositOrderId(id), 'abc');
  assert.equal(parseFinanceDepositOrderId('ads_deposit:x'), null);
  assert.equal(coerceFinanceProvider('bkash'), 'bkash');
  assert.throws(() => coerceFinanceProvider('paypal'));
});

test('withdraw amount respects admin min/max', () => {
  assert.throws(() => assertWithdrawAmount(1, fees), /Minimum/);
  assert.equal(assertWithdrawAmount(50, fees), 50);
});

test('fraud signals never auto-punish; they only flag review', () => {
  const hit = withdrawalFraudSignals({
    amount: 8000,
    recentWithdrawCount24h: 5,
    accountAgeDays: 2,
    destinationChangedRecently: true,
  });
  assert.equal(hit.suspicious, true);
  assert.ok(hit.reasons.includes('high_frequency_24h'));
});

test('previous period is the same length immediately before', () => {
  const from = new Date('2026-08-01T00:00:00Z');
  const to = new Date('2026-08-31T00:00:00Z');
  const prev = previousPeriod({ from, to });
  assert.equal(prev.to.toISOString(), from.toISOString());
  assert.equal(prev.to.getTime() - prev.from.getTime(), to.getTime() - from.getTime());
});

test('statement CSV includes source allocation columns', () => {
  const csv = statementCsv([
    {
      id: '1',
      createdAt: '2026-08-30',
      context: 'PERSONAL',
      type: 'WITHDRAWAL',
      status: 'COMPLETED',
      amount: 4000,
      fee: 0,
      netAmount: 4000,
      currency: 'BDT',
      reference: 'w1',
      source: 'PERSONAL',
      destination: 'BKASH',
    },
  ]);
  assert.match(csv, /source,destination/);
  assert.match(csv, /PERSONAL/);
});

