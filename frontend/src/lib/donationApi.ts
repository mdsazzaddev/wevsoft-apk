import api from './api';
import { getMediaApiOrigin } from './apiBase';

/**
 * Typed helpers for the Donation Center (`/api/v2/donations/*`).
 * Responses are normalised defensively: missing fields stay `null`/empty, never invented.
 */

const BASE = '/api/v2/donations';

/** Absolute URL for stored logo/QR/cover paths so SPA hosts can load API media. */
export function resolveDonationAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const s = String(url).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith('data:') || s.startsWith('blob:')) return s;
  if (s.startsWith('/')) {
    const origin = getMediaApiOrigin();
    return origin ? `${origin}${s}` : s;
  }
  return s;
}

export type DonationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface DonationStats {
  totalVerifiedAmount: number | null;
  verifiedDonors: number | null;
  activeCampaigns: number | null;
  totalCampaignGoal: number | null;
}

export interface DonationFooterLink {
  id: string;
  label: string;
  href: string;
  openInNewTab?: boolean;
}

export interface DonationCenterConfig {
  enabled?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
  heroHeading?: string;
  heroDescription?: string;
  presetAmounts?: number[];
  defaultCurrency?: string;
  minAmount?: number;
  maxAmount?: number;
  allowAnonymous?: boolean;
  allowDonorWall?: boolean;
  allowGuestDonate?: boolean;
  supportEmail?: string;
  termsPath?: string;
  privacyPath?: string;
  footerLinks?: DonationFooterLink[];
  receiptDisclaimer?: string;
  cryptoSectionVisible?: boolean;
  cryptoSectionLabel?: string;
  cryptoSectionNote?: string;
  stats?: Partial<DonationStats> | null;
}

export interface DonationMethod {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  logoUrl: string | null;
  merchantDisplay: string | null;
  publicInstructions: string | null;
  qrUrl: string | null;
  supportedCurrencies: string[];
  minimumAmount: number | null;
  maximumAmount: number | null;
  status: string;
  selectable: boolean;
}

export interface DonationCampaign {
  id: string;
  title: string;
  description: string | null;
  goalAmount: number | null;
  currency: string;
  coverUrl: string | null;
  status: string;
  raised: number;
  percent: number | null;
  remaining: number | null;
  featured: boolean;
}

export interface DonorWallItem {
  id: string;
  displayName: string;
  amount: number | null;
  currency: string | null;
  message: string | null;
  donatedAt: string | null;
}

export interface CryptoProvider {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  walletAddress: string | null;
  qrUrl: string | null;
}

export interface CryptoWalletPublic {
  id: string;
  label: string | null;
  address: string;
  logoUrl: string | null;
  qrUrl: string | null;
  memoRequirement: string | null;
}

export interface CryptoNetworkPublic {
  id: string;
  networkCode: string;
  name: string;
  chainIdentifier: string | null;
  contractAddress: string | null;
  logoUrl: string | null;
  wallets: CryptoWalletPublic[];
}

export interface CryptoAssetPublic {
  id: string;
  symbol: string;
  name: string;
  displaySymbol: string | null;
  logoUrl: string | null;
  networks: CryptoNetworkPublic[];
}

export interface CryptoCatalogPayload {
  providers: CryptoProvider[];
  catalog: CryptoAssetPublic[];
}

export interface DonationProof {
  id: string;
  url: string | null;
  name: string | null;
}

export interface Donation {
  id: string;
  publicReference: string;
  status: DonationStatus;
  amount: number;
  currency: string;
  methodName: string | null;
  methodCode: string | null;
  campaignTitle: string | null;
  anonymous: boolean;
  showOnDonorWall: boolean;
  donorDisplayName: string | null;
  donorMessage: string | null;
  transactionReference: string | null;
  senderReference: string | null;
  paymentDate: string | null;
  createdAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  receiptNumber: string | null;
  proofs: DonationProof[];
}

export interface DonationReceipt {
  receiptNumber: string;
  publicReference: string | null;
  issuedAt: string | null;
  approvedAt: string | null;
  donorName: string | null;
  amount: number;
  currency: string;
  methodName: string | null;
  campaignTitle: string | null;
  transactionReference: string | null;
  disclaimer: string | null;
  issuerName: string | null;
}

export interface DonationListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DonationSummary {
  totalCount: number | null;
  approvedCount: number | null;
  pendingCount: number | null;
  approvedAmount: number | null;
  currency: string | null;
}

export interface DonationListResult {
  items: Donation[];
  meta: DonationListMeta;
  /** Server-provided summary when available; otherwise null. */
  summary: DonationSummary | null;
}

export interface CreateDonationInput {
  amount: number;
  currency: string;
  paymentMethodId: string;
  campaignId?: string | null;
  /** Rizon (CHAIN_CATALOG) only — must match an ACTIVE network under the asset. */
  cryptoAssetId?: string | null;
  networkId?: string | null;
  /** Preferred deposit wallet id (must belong to networkId). */
  cryptoWalletId?: string | null;
  anonymous?: boolean;
  donorDisplayName?: string | null;
  donorMessage?: string | null;
  showOnDonorWall?: boolean;
  shareAmount?: boolean;
  idempotencyKey?: string;
}

export interface SubmitDonationInput {
  /** Optional when proof photo and/or sender phone is provided. */
  transactionReference?: string;
  paymentDate?: string;
  senderReference?: string;
  message?: string;
  proofs?: File[];
}

export interface DonationListQuery {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// ── helpers ────────────────────────────────────────────────────────────────

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v : null;

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const bool = (v: unknown, fallback = false): boolean =>
  typeof v === 'boolean' ? v : fallback;

const rec = (v: unknown): Record<string, any> =>
  v && typeof v === 'object' ? (v as Record<string, any>) : {};

/** `{ success, data }` envelope → data. Throws if `success === false`. */
function unwrap<T = unknown>(res: { data: any }): T {
  const body = res?.data;
  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === false) throw new Error(body.error || body.message || 'Request failed');
    return body.data as T;
  }
  return body as T;
}

function listOf(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  const o = rec(raw);
  for (const k of ['items', 'data', 'rows', 'results']) if (Array.isArray(o[k])) return o[k];
  return [];
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as { message?: string; data?: { error?: string; message?: string } };
  return e?.data?.error || e?.data?.message || e?.message || fallback;
}

export const STATUS_LABEL: Record<DonationStatus, string> = {
  DRAFT: 'Awaiting payment details',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  const cur = (currency || '').toUpperCase();
  const crypto = cur && !['BDT', 'USD', 'EUR', 'GBP', 'INR'].includes(cur);
  const maxFrac = cur === 'BTC' ? 8 : cur === 'ETH' || cur === 'BNB' || cur === 'SOL' ? 6 : crypto ? 4 : 2;
  const minFrac = crypto && amount > 0 && amount < 1 ? Math.min(maxFrac, 4) : 0;
  const body = amount.toLocaleString(undefined, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac });
  if (cur === 'BDT') return `৳${body}`;
  return cur ? `${body} ${cur}` : body;
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return withTime
    ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

// ── normalisers ────────────────────────────────────────────────────────────

export function normalizeMethod(raw: any): DonationMethod {
  const o = rec(raw);
  const status = String(o.status ?? 'ACTIVE').toUpperCase();
  const type = String(o.type ?? 'MANUAL').toUpperCase();
  const currencies = Array.isArray(o.supportedCurrencies)
    ? o.supportedCurrencies.map(String)
    : (() => {
        try {
          const p = JSON.parse(String(o.supportedCurrencies ?? '[]'));
          return Array.isArray(p) ? p.map(String) : [];
        } catch {
          return [];
        }
      })();
  return {
    id: String(o.id ?? ''),
    code: String(o.code ?? ''),
    name: String(o.name ?? o.code ?? 'Payment method'),
    description: str(o.description),
    type,
    logoUrl: resolveDonationAssetUrl(str(o.logoUrl ?? o.logoAssetId)),
    merchantDisplay: str(o.merchantDisplay),
    publicInstructions: str(o.publicInstructions),
    qrUrl: resolveDonationAssetUrl(str(o.qrUrl ?? o.qrAssetUrl)),
    supportedCurrencies: currencies,
    minimumAmount: num(o.minimumAmount),
    maximumAmount: num(o.maximumAmount),
    status,
    // Trust server `selectable` (CRYPTO needs ACTIVE + jurisdictionApproved).
    selectable: typeof o.selectable === 'boolean' ? o.selectable : status === 'ACTIVE',
  };
}

export function normalizeCampaign(raw: any): DonationCampaign {
  const o = rec(raw);
  return {
    id: String(o.id ?? ''),
    title: String(o.title ?? 'Campaign'),
    description: str(o.description),
    goalAmount: num(o.goalAmount),
    currency: String(o.currency ?? 'BDT'),
    coverUrl: resolveDonationAssetUrl(str(o.coverUrl)),
    status: String(o.status ?? 'ACTIVE'),
    raised: num(o.raised) ?? 0,
    percent: num(o.percent),
    remaining: num(o.remaining),
    featured: bool(o.featured),
  };
}

function normalizeProof(raw: any, i: number): DonationProof {
  const o = rec(raw);
  return {
    id: String(o.id ?? i),
    url: str(o.url ?? o.fileUrl ?? o.path ?? o.storageUrl),
    name: str(o.fileName ?? o.name ?? o.originalName),
  };
}

export function normalizeDonation(raw: any): Donation {
  const o = rec(raw);
  const method = rec(o.paymentMethod ?? o.method);
  const campaign = rec(o.campaign);
  const tx = Array.isArray(o.transactions) ? rec(o.transactions[0]) : {};
  const receipt = rec(o.receipt);
  const proofs = Array.isArray(o.proofs) ? o.proofs : [];
  return {
    id: String(o.id ?? ''),
    publicReference: String(o.publicReference ?? o.reference ?? o.id ?? ''),
    status: String(o.status ?? 'SUBMITTED').toUpperCase() as DonationStatus,
    amount: num(o.amount) ?? 0,
    currency: String(o.currency ?? 'BDT'),
    methodName: str(method.name ?? o.methodName ?? o.paymentMethodName),
    methodCode: str(method.code ?? o.methodCode),
    campaignTitle: str(campaign.title ?? o.campaignTitle),
    anonymous: bool(o.anonymous),
    showOnDonorWall: bool(o.showOnDonorWall),
    donorDisplayName: str(o.donorDisplayName),
    donorMessage: str(o.donorMessage),
    transactionReference: str(o.transactionReference ?? tx.transactionReference),
    senderReference: str(o.senderReference ?? tx.senderReference),
    paymentDate: str(o.paymentDate ?? tx.paymentDate),
    createdAt: str(o.createdAt),
    submittedAt: str(o.submittedAt),
    reviewedAt: str(o.reviewedAt ?? o.underReviewAt),
    approvedAt: str(o.approvedAt),
    rejectedAt: str(o.rejectedAt),
    rejectionReason: str(o.rejectionReason ?? o.rejectReason ?? o.reviewNote),
    receiptNumber: str(o.receiptNumber ?? receipt.receiptNumber),
    proofs: proofs.map(normalizeProof),
  };
}

export function normalizeReceipt(raw: any): DonationReceipt {
  const o = rec(raw);
  const donation = rec(o.donation);
  const d = Object.keys(donation).length ? normalizeDonation(donation) : null;
  return {
    receiptNumber: String(o.receiptNumber ?? o.number ?? d?.receiptNumber ?? ''),
    publicReference: str(o.publicReference ?? o.reference) ?? d?.publicReference ?? null,
    issuedAt: str(o.issuedAt ?? o.createdAt),
    approvedAt: str(o.approvedAt) ?? d?.approvedAt ?? null,
    donorName: str(o.donorName ?? o.donorDisplayName) ?? d?.donorDisplayName ?? null,
    amount: num(o.amount) ?? d?.amount ?? 0,
    currency: String(o.currency ?? d?.currency ?? 'BDT'),
    methodName: str(o.methodName ?? o.paymentMethod ?? rec(o.paymentMethod).name) ?? d?.methodName ?? null,
    campaignTitle: str(o.campaignTitle ?? rec(o.campaign).title) ?? d?.campaignTitle ?? null,
    transactionReference: str(o.transactionReference) ?? d?.transactionReference ?? null,
    disclaimer: str(o.disclaimer ?? o.receiptDisclaimer),
    issuerName: str(o.issuerName ?? o.issuer),
  };
}

// ── requests ───────────────────────────────────────────────────────────────

export async function fetchDonationConfig(): Promise<DonationCenterConfig> {
  return rec(unwrap(await api.get(`${BASE}/config`))) as DonationCenterConfig;
}

export async function fetchDonationMethods(): Promise<DonationMethod[]> {
  return listOf(unwrap(await api.get(`${BASE}/methods`))).map(normalizeMethod);
}

export async function fetchDonationCampaigns(): Promise<DonationCampaign[]> {
  return listOf(unwrap(await api.get(`${BASE}/campaigns`))).map(normalizeCampaign);
}

export async function fetchDonorWall(limit = 12): Promise<DonorWallItem[]> {
  const raw = listOf(unwrap(await api.get(`${BASE}/donor-wall?limit=${limit}`)));
  return raw.map((r) => {
    const o = rec(r);
    return {
      id: String(o.id ?? ''),
      displayName: String(o.displayName ?? 'Supporter'),
      amount: num(o.amount),
      currency: str(o.currency),
      message: str(o.message),
      donatedAt: str(o.donatedAt),
    };
  });
}

function normalizeCryptoProvider(r: unknown, i: number): CryptoProvider {
  const o = rec(r);
  return {
    id: String(o.id ?? o.code ?? i),
    name: String(o.name ?? o.code ?? 'Provider'),
    description: str(o.description),
    logoUrl: resolveDonationAssetUrl(str(o.logoUrl)),
    walletAddress: str(o.walletAddress) || str(o.merchantDisplay),
    qrUrl: resolveDonationAssetUrl(str(o.qrUrl) || str(o.qrAssetUrl)),
  };
}

function normalizeCryptoWallet(r: unknown, i: number): CryptoWalletPublic {
  const o = rec(r);
  return {
    id: String(o.id ?? i),
    label: str(o.label),
    address: String(o.address ?? ''),
    logoUrl: resolveDonationAssetUrl(str(o.logoUrl)),
    qrUrl: resolveDonationAssetUrl(str(o.qrUrl)),
    memoRequirement: str(o.memoRequirement),
  };
}

function normalizeCryptoNetwork(r: unknown, i: number): CryptoNetworkPublic {
  const o = rec(r);
  return {
    id: String(o.id ?? o.networkCode ?? i),
    networkCode: String(o.networkCode ?? ''),
    name: String(o.name ?? o.networkCode ?? 'Network'),
    chainIdentifier: str(o.chainIdentifier),
    contractAddress: str(o.contractAddress),
    logoUrl: resolveDonationAssetUrl(str(o.logoUrl)),
    wallets: listOf(o.wallets).map(normalizeCryptoWallet).filter((w) => w.address),
  };
}

function normalizeCryptoAsset(r: unknown, i: number): CryptoAssetPublic {
  const o = rec(r);
  return {
    id: String(o.id ?? o.symbol ?? i),
    symbol: String(o.symbol ?? ''),
    name: String(o.name ?? o.symbol ?? 'Asset'),
    displaySymbol: str(o.displaySymbol),
    logoUrl: resolveDonationAssetUrl(str(o.logoUrl)),
    networks: listOf(o.networks).map(normalizeCryptoNetwork),
  };
}

/** Providers (legacy CRYPTO methods) + nested asset/network/wallet catalog. */
export async function fetchCryptoProviders(): Promise<CryptoCatalogPayload> {
  const data = unwrap(await api.get(`${BASE}/crypto-providers`));
  // Legacy: bare array of provider cards.
  if (Array.isArray(data)) {
    return { providers: data.map(normalizeCryptoProvider), catalog: [] };
  }
  const o = rec(data);
  return {
    providers: listOf(o.providers).map(normalizeCryptoProvider),
    catalog: listOf(o.catalog).map(normalizeCryptoAsset),
  };
}

export async function createDonation(input: CreateDonationInput): Promise<Donation> {
  return normalizeDonation(unwrap(await api.post(BASE, input)));
}

/** Cancel an unused DRAFT so Back/edit does not leave a stale pending row. */
export async function cancelDonation(id: string): Promise<Donation> {
  return normalizeDonation(unwrap(await api.post(`${BASE}/${encodeURIComponent(id)}/cancel`, {})));
}

export async function submitDonation(id: string, input: SubmitDonationInput): Promise<Donation> {
  const form = new FormData();
  if (input.transactionReference?.trim()) form.append('transactionReference', input.transactionReference.trim());
  if (input.paymentDate) form.append('paymentDate', input.paymentDate);
  if (input.senderReference?.trim()) form.append('senderReference', input.senderReference.trim());
  if (input.message) form.append('message', input.message);
  (input.proofs || []).slice(0, 3).forEach((f) => form.append('proofs', f));
  return normalizeDonation(unwrap(await api.postForm(`${BASE}/${encodeURIComponent(id)}/submit`, form)));
}

export async function fetchMyDonations(query: DonationListQuery = {}): Promise<DonationListResult> {
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') qs.set(k, String(v));
  });
  const res = await api.get(`${BASE}/me${qs.toString() ? `?${qs}` : ''}`);
  const body = rec(res.data);
  const data = unwrap(res);
  const items = listOf(data).map(normalizeDonation);
  const m = { ...rec(body.meta), ...rec(body.pagination), ...(Array.isArray(data) ? {} : rec(data)) };
  const limit = num(m.limit) ?? query.limit ?? 20;
  const total = num(m.total) ?? num(m.count) ?? items.length;
  const s = rec(body.summary ?? (Array.isArray(data) ? null : rec(data).summary));
  const hasSummary = Object.keys(s).length > 0;
  return {
    items,
    meta: {
      page: num(m.page) ?? query.page ?? 1,
      limit,
      total,
      totalPages: num(m.totalPages) ?? num(m.pages) ?? Math.max(1, Math.ceil(total / Math.max(1, limit))),
    },
    summary: hasSummary
      ? {
          totalCount: num(s.totalCount ?? s.total),
          approvedCount: num(s.approvedCount ?? s.approved),
          pendingCount: num(s.pendingCount ?? s.pending),
          approvedAmount: num(s.approvedAmount ?? s.totalApprovedAmount),
          currency: str(s.currency),
        }
      : null,
  };
}

export async function fetchDonation(id: string): Promise<Donation> {
  return normalizeDonation(unwrap(await api.get(`${BASE}/${encodeURIComponent(id)}`)));
}

export async function fetchDonationReceipt(id: string): Promise<DonationReceipt> {
  return normalizeReceipt(unwrap(await api.get(`${BASE}/${encodeURIComponent(id)}/receipt`)));
}
