/**
 * Unified Finance â€” Personal + Business cash wallets.
 * Pure helpers only (no Prisma / React). Ads prepaid stays a separate silo.
 * Money math uses local cents helpers (shared modules must not import siblings).
 */

export function toCents(amount: number): number {
  return Math.round((Number(amount) || 0) * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export const WALLET_CONTEXTS = ['PERSONAL', 'BUSINESS'] as const;
export type WalletContext = (typeof WALLET_CONTEXTS)[number];

export const WALLET_STATUSES = ['ACTIVE', 'FROZEN', 'CLOSED'] as const;
export type WalletStatus = (typeof WALLET_STATUSES)[number];

export const WALLET_TX_TYPES = [
  'DEPOSIT',
  'WITHDRAWAL',
  'FEE',
  'REFUND',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'EARNING',
  'AD_SPEND',
  'AD_REFUND',
] as const;
export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

export const WALLET_TX_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED'] as const;
export type WalletTxStatus = (typeof WALLET_TX_STATUSES)[number];

export const WITHDRAWAL_STATUSES = [
  'REQUESTED',
  'PENDING_REVIEW',
  'APPROVED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REJECTED',
  'CANCELLED',
] as const;
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const PAYOUT_METHODS = ['BKASH', 'NAGAD', 'BANK', 'OTHER'] as const;
export type PayoutMethodKind = (typeof PAYOUT_METHODS)[number];

export const FINANCE_DEFAULTS = {
  currency: 'BDT',
  minDeposit: 10,
  maxDeposit: 500_000,
  withdrawFeeFixed: 0,
  withdrawFeePercent: 0,
  withdrawFeeMin: 0,
  withdrawFeeMax: 500,
  minWithdraw: 50,
  maxWithdraw: 200_000,
  manualReviewAbove: 50_000,
  reauthAbove: 10_000,
} as const;

/** Admin-editable fee knobs (mirror SystemSettings finance* columns). */
export type FinanceFeeConfig = {
  withdrawFeeFixed: number;
  withdrawFeePercent: number;
  withdrawFeeMin: number;
  withdrawFeeMax: number;
  minWithdraw: number;
  maxWithdraw: number;
  manualReviewAbove: number;
  depositsEnabled: boolean;
  withdrawalsEnabled: boolean;
};

export function coerceFinanceFeeConfig(raw: Partial<FinanceFeeConfig> | null | undefined): FinanceFeeConfig {
  const n = (v: unknown, fallback: number) => {
    const x = Number(v);
    return Number.isFinite(x) && x >= 0 ? x : fallback;
  };
  return {
    withdrawFeeFixed: n(raw?.withdrawFeeFixed, FINANCE_DEFAULTS.withdrawFeeFixed),
    withdrawFeePercent: n(raw?.withdrawFeePercent, FINANCE_DEFAULTS.withdrawFeePercent),
    withdrawFeeMin: n(raw?.withdrawFeeMin, FINANCE_DEFAULTS.withdrawFeeMin),
    withdrawFeeMax: n(raw?.withdrawFeeMax, FINANCE_DEFAULTS.withdrawFeeMax),
    minWithdraw: n(raw?.minWithdraw, FINANCE_DEFAULTS.minWithdraw),
    maxWithdraw: n(raw?.maxWithdraw, FINANCE_DEFAULTS.maxWithdraw),
    manualReviewAbove: n(raw?.manualReviewAbove, FINANCE_DEFAULTS.manualReviewAbove),
    depositsEnabled: raw?.depositsEnabled !== false,
    withdrawalsEnabled: raw?.withdrawalsEnabled !== false,
  };
}

/** Withdrawal fee in major units (BDT). Percent is of gross amount. */
export function calcWithdrawalFee(amount: number, cfg: FinanceFeeConfig): number {
  const grossCents = toCents(amount);
  if (grossCents <= 0) return 0;
  const fixed = toCents(cfg.withdrawFeeFixed);
  const pct = Math.round((grossCents * Math.max(0, cfg.withdrawFeePercent)) / 100);
  let fee = fixed + pct;
  const min = toCents(cfg.withdrawFeeMin);
  const max = toCents(cfg.withdrawFeeMax);
  if (fee < min) fee = min;
  if (max > 0 && fee > max) fee = max;
  if (fee > grossCents) fee = grossCents;
  return fromCents(fee);
}

export function assertDepositAmount(raw: unknown): number {
  const amount = Math.round((Number(raw) || 0) * 100) / 100;
  if (!(amount >= FINANCE_DEFAULTS.minDeposit)) {
    throw Object.assign(new Error(`Minimum deposit is ${FINANCE_DEFAULTS.minDeposit}`), { status: 400 });
  }
  if (amount > FINANCE_DEFAULTS.maxDeposit) {
    throw Object.assign(new Error(`Maximum deposit is ${FINANCE_DEFAULTS.maxDeposit}`), { status: 400 });
  }
  return amount;
}

export function assertWithdrawAmount(raw: unknown, cfg: FinanceFeeConfig): number {
  const amount = Math.round((Number(raw) || 0) * 100) / 100;
  if (!(amount >= cfg.minWithdraw)) {
    throw Object.assign(new Error(`Minimum withdrawal is ${cfg.minWithdraw}`), { status: 400 });
  }
  if (amount > cfg.maxWithdraw) {
    throw Object.assign(new Error(`Maximum withdrawal is ${cfg.maxWithdraw}`), { status: 400 });
  }
  return amount;
}

export type WithdrawalAllocation = {
  walletId: string;
  context: WalletContext;
  spaceId?: string | null;
  amount: number;
};

/** Allocations must be positive and sum (cents) to the withdrawal amount. */
export function assertAllocationsSum(
  amount: number,
  allocations: WithdrawalAllocation[],
): WithdrawalAllocation[] {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw Object.assign(new Error('At least one funding source is required'), { status: 400 });
  }
  let sum = 0;
  const cleaned: WithdrawalAllocation[] = [];
  for (const row of allocations) {
    const part = Math.round((Number(row.amount) || 0) * 100) / 100;
    if (!(part > 0)) {
      throw Object.assign(new Error('Each allocation must be greater than zero'), { status: 400 });
    }
    if (!row.walletId || typeof row.walletId !== 'string') {
      throw Object.assign(new Error('Invalid wallet in allocation'), { status: 400 });
    }
    const context = String(row.context || '').toUpperCase();
    if (context !== 'PERSONAL' && context !== 'BUSINESS') {
      throw Object.assign(new Error('Invalid wallet context'), { status: 400 });
    }
    sum += toCents(part);
    cleaned.push({
      walletId: row.walletId,
      context: context as WalletContext,
      spaceId: row.spaceId ?? null,
      amount: part,
    });
  }
  if (sum !== toCents(amount)) {
    throw Object.assign(new Error('Allocation total must equal withdrawal amount'), { status: 400 });
  }
  return cleaned;
}

/** Legal withdrawal state transitions (admin + user cancel). */
const WITHDRAWAL_TRANSITIONS: Record<WithdrawalStatus, readonly WithdrawalStatus[]> = {
  REQUESTED: ['PENDING_REVIEW', 'APPROVED', 'CANCELLED', 'REJECTED'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PROCESSING', 'REJECTED', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: ['PROCESSING'],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransitionWithdrawal(from: string, to: string): boolean {
  const a = from as WithdrawalStatus;
  const b = to as WithdrawalStatus;
  if (!WITHDRAWAL_STATUSES.includes(a) || !WITHDRAWAL_STATUSES.includes(b)) return false;
  return WITHDRAWAL_TRANSITIONS[a].includes(b);
}

export function assertWithdrawalTransition(from: string, to: string): void {
  if (!canTransitionWithdrawal(from, to)) {
    throw Object.assign(new Error(`Cannot move withdrawal from ${from} to ${to}`), { status: 409 });
  }
}

export function initialWithdrawalStatus(amount: number, cfg: FinanceFeeConfig, suspicious = false): WithdrawalStatus {
  if (suspicious || toCents(amount) >= toCents(cfg.manualReviewAbove)) return 'PENDING_REVIEW';
  return 'REQUESTED';
}

export function needsFinanceReauth(amount: number): boolean {
  return toCents(amount) >= toCents(FINANCE_DEFAULTS.reauthAbove);
}

/** Credit available + withdrawable on completed deposit. */
export function balancesAfterDeposit(available: number, withdrawable: number, amount: number) {
  const a = toCents(available) + toCents(amount);
  const w = toCents(withdrawable) + toCents(amount);
  return { available: fromCents(a), withdrawable: fromCents(w) };
}

/** Reserve withdrawable for a pending withdrawal (moves available â†’ reserved). */
export function balancesAfterReserveWithdraw(available: number, reserved: number, withdrawable: number, amount: number) {
  const need = toCents(amount);
  if (toCents(available) < need || toCents(withdrawable) < need) {
    return { ok: false as const, error: 'INSUFFICIENT_BALANCE' as const };
  }
  return {
    ok: true as const,
    available: fromCents(toCents(available) - need),
    reserved: fromCents(toCents(reserved) + need),
    withdrawable: fromCents(toCents(withdrawable) - need),
  };
}

/** Release reserved funds back (reject / cancel). */
export function balancesAfterReleaseWithdraw(available: number, reserved: number, withdrawable: number, amount: number) {
  const release = Math.min(toCents(amount), toCents(reserved));
  return {
    available: fromCents(toCents(available) + release),
    reserved: fromCents(toCents(reserved) - release),
    withdrawable: fromCents(toCents(withdrawable) + release),
    released: fromCents(release),
  };
}

/** Complete withdrawal: burn reserved (fee stays platform; net left wallet). */
export function balancesAfterCompleteWithdraw(reserved: number, amount: number) {
  const burn = Math.min(toCents(amount), toCents(reserved));
  return {
    reserved: fromCents(toCents(reserved) - burn),
    burned: fromCents(burn),
  };
}

export function financeDepositOrderId(txId: string): string {
  return `finance_deposit:${txId}`;
}

export function parseFinanceDepositOrderId(orderId: unknown): string | null {
  if (typeof orderId !== 'string') return null;
  const m = /^finance_deposit:([a-zA-Z0-9_-]+)$/.exec(orderId.trim());
  return m ? m[1] : null;
}

export function maskAccountHint(raw: string): string {
  const s = String(raw || '').replace(/\s+/g, '');
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

export function isWalletContext(value: unknown): value is WalletContext {
  return value === 'PERSONAL' || value === 'BUSINESS';
}

export function isPayoutMethodKind(value: unknown): value is PayoutMethodKind {
  return typeof value === 'string' && (PAYOUT_METHODS as readonly string[]).includes(value);
}

/** Simple fraud heuristics â€” never auto-punish; only flag for review. */
export function withdrawalFraudSignals(input: {
  amount: number;
  recentWithdrawCount24h: number;
  accountAgeDays: number;
  destinationChangedRecently: boolean;
}): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.recentWithdrawCount24h >= 5) reasons.push('high_frequency_24h');
  if (input.accountAgeDays < 7 && toCents(input.amount) >= toCents(5000)) reasons.push('new_account_large');
  if (input.destinationChangedRecently) reasons.push('new_destination');
  return { suspicious: reasons.length > 0, reasons };
}

export const FINANCE_PERMISSIONS = ['finance.view', 'finance.deposit', 'finance.withdraw'] as const;
export type FinancePermission = (typeof FINANCE_PERMISSIONS)[number];

export const METRIC_DEFINITIONS = {
  views: { id: 'views', label: 'Views', description: 'Server-validated view events for owned content in the selected range.' },
  uniqueViewers: { id: 'uniqueViewers', label: 'Unique viewers', description: 'Distinct authenticated viewers. Anonymous fingerprints are shown separately when collected.' },
  watchTime: { id: 'watchTime', label: 'Watch time', description: 'Server-validated watch seconds. Raw player reports that fail validation are excluded.' },
  watchCompletion: { id: 'watchCompletion', label: 'Watch completion', description: 'Completed views / valid views when duration is known. Hidden when duration is missing.' },
  likes: { id: 'likes', label: 'Likes', description: 'Like rows on owned posts and reels.' },
  comments: { id: 'comments', label: 'Comments', description: 'Comment rows on owned posts and reels.' },
  shares: { id: 'shares', label: 'Shares', description: 'Share rows on owned posts and reels.' },
  saves: { id: 'saves', label: 'Saves', description: 'Save/bookmark rows on owned content.' },
  followers: { id: 'followers', label: 'Followers', description: 'Net follower change in range (gained minus lost) when those events exist.' },
  reach: { id: 'reach', label: 'Reach', description: 'Unique viewers of owned content. Organic vs paid only when attribution rows exist.' },
  engagement: { id: 'engagement', label: 'Engagement rate', description: '(likes + comments + shares + saves) / unique viewers. Unavailable when unique viewers is 0.' },
  earnings: { id: 'earnings', label: 'Earnings', description: 'Completed wallet EARNING rows. Never inferred from views.' },
  adSpend: { id: 'adSpend', label: 'Ad spend', description: 'Completed Ads wallet CHARGE rows. Ads prepaid is a separate ledger.' },
  websiteClicks: { id: 'websiteClicks', label: 'Website clicks', description: 'CTA and link clicks recorded on the business Space daily stats.' },
  messages: { id: 'messages', label: 'Messages', description: 'Inbox threads opened against the business Space in range.' },
} as const;

export type MetricId = keyof typeof METRIC_DEFINITIONS;

export type MetricValue =
  | { available: true; value: number; unit?: string }
  | { available: false; reason: 'insufficient_data' | 'not_applicable' };

export function metricValue(hasSource: boolean, value: number | null | undefined, unit?: string): MetricValue {
  if (!hasSource || value == null || !Number.isFinite(Number(value))) {
    return { available: false, reason: 'insufficient_data' };
  }
  return unit ? { available: true, value: Number(value), unit } : { available: true, value: Number(value) };
}

export function engagementRate(
  likes: number,
  comments: number,
  shares: number,
  saves: number,
  uniqueViewers: number,
): MetricValue {
  if (!(uniqueViewers > 0)) return { available: false, reason: 'insufficient_data' };
  const actions = likes + comments + shares + saves;
  const pct = Math.round((actions / uniqueViewers) * 10000) / 100;
  return { available: true, value: pct, unit: 'percent' };
}

export function watchCompletionRate(completedViews: number, validViews: number): MetricValue {
  if (!(validViews > 0)) return { available: false, reason: 'insufficient_data' };
  return { available: true, value: Math.round((completedViews / validViews) * 10000) / 100, unit: 'percent' };
}

export type WalletSource = {
  walletId: string;
  context: WalletContext;
  spaceId?: string | null;
  available: number;
  withdrawable: number;
};

/** Greedy allocation across listed wallets. Never silently moves leftover to another context. */
export function allocateUnifiedWithdrawal(amount: number, sources: WalletSource[]): WithdrawalAllocation[] {
  const need = toCents(amount);
  if (need <= 0) {
    throw Object.assign(new Error('Withdrawal amount must be greater than zero'), { status: 400 });
  }
  const allocations: WithdrawalAllocation[] = [];
  let remaining = need;
  for (const src of sources) {
    if (remaining <= 0) break;
    const cap = Math.min(toCents(src.available), toCents(src.withdrawable));
    if (cap <= 0) continue;
    const take = Math.min(cap, remaining);
    allocations.push({
      walletId: src.walletId,
      context: src.context,
      spaceId: src.spaceId ?? null,
      amount: fromCents(take),
    });
    remaining -= take;
  }
  if (remaining > 0) {
    throw Object.assign(new Error('Insufficient withdrawable balance across selected sources'), { status: 400 });
  }
  return assertAllocationsSum(amount, allocations);
}

export function actorOwnsWallet(
  wallet: { ownerUserId: string; context: string; spaceId?: string | null },
  actorId: string,
  allowedBusinessSpaceIds: readonly string[] = [],
): boolean {
  if (!wallet?.ownerUserId || !actorId) return false;
  if (wallet.context === 'PERSONAL') return wallet.ownerUserId === actorId;
  if (wallet.context === 'BUSINESS') {
    return Boolean(wallet.spaceId && allowedBusinessSpaceIds.includes(wallet.spaceId));
  }
  return false;
}

export function depositCreditAllowed(status: string): boolean {
  return status === 'PENDING';
}

export function adminAdjustmentReason(raw: unknown): string {
  const reason = String(raw || '').trim();
  if (reason.length < 8) {
    throw Object.assign(new Error('Admin adjustments require a reason of at least 8 characters'), { status: 400 });
  }
  if (reason.length > 500) {
    throw Object.assign(new Error('Reason is too long'), { status: 400 });
  }
  return reason;
}

export type DateRange = { from: Date; to: Date };

export function parseDateRange(query: { from?: unknown; to?: unknown; range?: unknown }, now = new Date()): DateRange {
  const range = String(query.range || '30d');
  const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '90d' ? 90 : range === '365d' ? 365 : 30;
  if (query.from && query.to) {
    const from = new Date(String(query.from));
    const to = new Date(String(query.to));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw Object.assign(new Error('Invalid date range'), { status: 400 });
    }
    const maxMs = 366 * 24 * 60 * 60 * 1000;
    if (to.getTime() - from.getTime() > maxMs) {
      throw Object.assign(new Error('Date range cannot exceed 366 days'), { status: 400 });
    }
    return { from, to };
  }
  const to = now;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export function previousPeriod(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span), to: new Date(range.from.getTime()) };
}

export function deltaPct(current: number, previous: number): MetricValue {
  if (!Number.isFinite(previous) || previous === 0) {
    return { available: false, reason: 'insufficient_data' };
  }
  return { available: true, value: Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100, unit: 'percent' };
}

export const FINANCE_PROVIDERS = ['sslcommerz', 'bkash', 'stripe'] as const;
export type FinanceProvider = (typeof FINANCE_PROVIDERS)[number];

export function coerceFinanceProvider(raw: unknown): FinanceProvider {
  const v = String(raw || 'sslcommerz').toLowerCase();
  if (v === 'bkash' || v === 'stripe' || v === 'sslcommerz') return v;
  throw Object.assign(new Error('Unsupported payment method'), { status: 400 });
}

export function moneyNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'object' && value && typeof (value as { toNumber?: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  const x = Number(value);
  return Number.isFinite(x) ? x : 0;
}

export function serializeWalletBalances(row: {
  available: unknown;
  pending: unknown;
  reserved: unknown;
  withdrawable: unknown;
}) {
  return {
    available: fromCents(toCents(moneyNumber(row.available))),
    pending: fromCents(toCents(moneyNumber(row.pending))),
    reserved: fromCents(toCents(moneyNumber(row.reserved))),
    withdrawable: fromCents(toCents(moneyNumber(row.withdrawable))),
  };
}

export function statementCsv(rows: Array<Record<string, unknown>>): string {
  const cols = ['id', 'createdAt', 'context', 'type', 'status', 'amount', 'fee', 'netAmount', 'currency', 'reference', 'source', 'destination'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

/** Stable ledger reference for WevSpace payout to cash wallet credit. */
export function wevspacePayoutCreditRef(payoutId: string): string {
  return `wevspace_payout:${String(payoutId || "").trim()}`;
}

export function wevspaceTxCreditRef(transactionId: string): string {
  return `wevspace_tx:${String(transactionId || "").trim()}`;
}

export function creatorEarningCreditRef(kind: string, id: string): string {
  const k = String(kind || "earning").replace(/[^a-z0-9_]/gi, "_").slice(0, 40);
  return `creator_${k}:${String(id || "").trim()}`;
}

export function isAlreadyCreditedError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === "P2002";
}

export const ANALYTICS_INGEST_TYPES = [
  "PROFILE_VIEW",
  "FOLLOW",
  "POST_VIEW",
  "REEL_IMPRESSION",
  "AD_IMPRESSION",
  "AD_CLICK",
  "WEBSITE_CLICK",
  "CTA_CLICK",
] as const;
export type AnalyticsIngestType = (typeof ANALYTICS_INGEST_TYPES)[number];

const FORBIDDEN_ANALYTICS_OVERRIDE_KEYS = [
  "views","viewCount","watchTime","watchSeconds","uniqueViewers","likes","comments","shares","saves","revenue","earnings","followers","reach","plays","impressions","count",
];

export function validateAnalyticsIngest(body: unknown): {
  ok: true;
  type: AnalyticsIngestType;
  targetType: string;
  targetId: string;
  idempotencyKey?: string;
} | { ok: false; status: number; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid analytics payload" };
  }
  const input = body as Record<string, unknown>;
  const type = String(input.type || "").toUpperCase();
  if (type === "VIDEO_VIEW" || type === "VIDEO_COMPLETE" || type === "REEL_VIEW" || type === "WATCH") {
    return { ok: false, status: 400, error: "Watch-time and views must use the validated video session API, not client counts" };
  }
  if (!(ANALYTICS_INGEST_TYPES as readonly string[]).includes(type)) {
    return { ok: false, status: 400, error: "Unsupported analytics event type" };
  }
  for (const key of FORBIDDEN_ANALYTICS_OVERRIDE_KEYS) {
    if (key in input && input[key] != null) {
      return { ok: false, status: 400, error: "Fake analytics rejected: client metric overrides are not accepted" };
    }
  }
  const targetType = String(input.targetType || "").trim().slice(0, 40);
  const targetId = String(input.targetId || "").trim().slice(0, 80);
  if (!targetType || !targetId) {
    return { ok: false, status: 400, error: "targetType and targetId are required" };
  }
  const idempotencyKey = input.idempotencyKey ? String(input.idempotencyKey).slice(0, 120) : undefined;
  return { ok: true, type: type as AnalyticsIngestType, targetType, targetId, idempotencyKey };
}

export type PerformanceScoreWeights = {
  engagement: number;
  growth: number;
  consistency: number;
  watchTime: number;
  reach: number;
};

export const DEFAULT_PERFORMANCE_SCORE_WEIGHTS: PerformanceScoreWeights = {
  engagement: 0.3, growth: 0.2, consistency: 0.15, watchTime: 0.2, reach: 0.15,
};

export function coercePerformanceScoreWeights(raw: unknown): PerformanceScoreWeights {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = (k: keyof PerformanceScoreWeights) => {
    const x = Number(o[k]);
    return Number.isFinite(x) && x >= 0 ? x : DEFAULT_PERFORMANCE_SCORE_WEIGHTS[k];
  };
  const next = { engagement: n("engagement"), growth: n("growth"), consistency: n("consistency"), watchTime: n("watchTime"), reach: n("reach") };
  const sum = next.engagement + next.growth + next.consistency + next.watchTime + next.reach;
  if (!(sum > 0)) return DEFAULT_PERFORMANCE_SCORE_WEIGHTS;
  return { engagement: next.engagement / sum, growth: next.growth / sum, consistency: next.consistency / sum, watchTime: next.watchTime / sum, reach: next.reach / sum };
}

export function computePerformanceScore(
  parts: Partial<Record<keyof PerformanceScoreWeights, number | null | undefined>>,
  weights: PerformanceScoreWeights = DEFAULT_PERFORMANCE_SCORE_WEIGHTS,
): MetricValue & { disclaimer?: string; used?: string[] } {
  const used: string[] = [];
  let acc = 0;
  let wsum = 0;
  (Object.keys(weights) as (keyof PerformanceScoreWeights)[]).forEach((key) => {
    const v = parts[key];
    if (v == null || !Number.isFinite(Number(v))) return;
    const clamped = Math.max(0, Math.min(100, Number(v)));
    acc += clamped * weights[key];
    wsum += weights[key];
    used.push(key);
  });
  if (used.length < 2 || !(wsum > 0)) return { available: false, reason: "insufficient_data" };
  return { available: true, value: Math.round((acc / wsum) * 10) / 10, unit: "score", disclaimer: "Platform-defined analytics score, not a financial or guaranteed success score.", used };
}

export function anonymizeUserPiiPatch(userId: string, now = new Date()) {
  const id = String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "unknown";
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  return {
    email: `deleted+${id}@anonymized.invalid`,
    username: `deleted_${id}`.slice(0, 40),
    usernameNormalized: `deleted_${id}`.slice(0, 40).toLowerCase(),
    phone: null as string | null,
    mobile: null as string | null,
    name: "Deleted user",
    firstName: null as string | null,
    lastName: null as string | null,
    preferredName: null as string | null,
    avatar: null as string | null,
    cover: null as string | null,
    bio: null as string | null,
    intro: null as string | null,
    academicEmail: null as string | null,
    whatsapp: null as string | null,
    dob: null as Date | null,
    location: null as string | null,
    status: "deleted",
    profileSlug: `deleted-${id}-${stamp}`.slice(0, 60),
    password: null as string | null,
  };
}

export const FINANCE_SKIP_NOTES = {
  nagadDeposit: "Nagad is a payout destination and donation label only. No Nagad PaymentProvider adapter exists (only sslcommerz, bkash, stripe). Deposit via Nagad was not faked.",
  withdrawalPin: "No withdrawal-PIN model exists. Withdrawals already require session auth; amounts at/above reauth threshold use password/TOTP reauth plus optional 2FA. PIN skipped.",
} as const;

export const MILESTONE_THRESHOLDS = {
  followers: [10, 50, 100, 500, 1000, 5000, 10000],
  views: [100, 1000, 10000, 100000],
} as const;

export function nextMilestone(kind: keyof typeof MILESTONE_THRESHOLDS, value: number, already: number[]): number | null {
  const n = Number(value) || 0;
  for (const t of MILESTONE_THRESHOLDS[kind]) {
    if (n >= t && !already.includes(t)) return t;
  }
  return null;
}

export function statementPdfFilename(now = new Date()): string {
  return `wevsoft-statement-${now.toISOString().slice(0, 10)}.pdf`;
}

export const STATEMENT_SYNC_ROW_CAP = 2000;
export const STATEMENT_HARD_CAP = 5000;