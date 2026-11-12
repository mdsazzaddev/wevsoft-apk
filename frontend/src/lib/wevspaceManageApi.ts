/**
 * WevSpace Management frontend client (Master Prompt 2).
 *
 * Sibling of wevspaceApi.ts, which covers the public Space surface from Master
 * Prompt 1. Both share that file's `request`/`authHeaders`/`qs` so there is one
 * fetch dialect, one error class and one auth header for every Space call.
 *
 * Every function here maps 1:1 to a route in wevspace-manage.routes.ts. `id` is
 * a Space id or handle; ids of child rows (`memberId`, `postId`, …) are resolved
 * back to their Space by the server, which then re-checks permissions.
 */

import { SpaceApiError, authHeaders, qs, request } from './wevspaceApi';
import type { SpaceConfirmation } from './wevspaceApi';
import type {
  CampaignStatus,
  FollowerListFilter,
  InsightRange,
  MonetizationKind,
  PayoutStatus,
  SpaceSanction,
  SpaceCannedKind,
  SpaceCommentAction,
  SpaceComposerDraft,
  SpaceContentStatus,
  SpaceDashboardSection,
  SpaceInboxFolder,
  SpaceMemberRole,
  SpacePermission,
  SpaceSettingsBlob,
  SpaceThreadStatus,
  SpaceVerificationTier,
  TransactionStatus,
  VerificationDraft,
  VerificationRequestStatus,
  VerificationViewState,
} from '@wevsoft/shared/wevspace';

export { SpaceApiError };

const BASE = '/manage';

function get<T>(path: string): Promise<T> {
  return request<T>(`${BASE}${path}`, { headers: authHeaders() });
}

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(`${BASE}${path}`, {
    method,
    headers: authHeaders(true),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

// ── Vocabularies ─────────────────────────────────────────

export interface ManageMeta {
  dashboardSections: ReadonlyArray<{ id: SpaceDashboardSection; label: string; [k: string]: unknown }>;
  roles: any[];
  assignableRoles: SpaceMemberRole[];
  memberStatuses: any[];
  permissionGroups: any[];
  permissionLabels: Record<string, string>;
  content: { kinds: any[]; statuses: readonly string[]; audiences: any[]; limits: Record<string, any> };
  moderation: { commentActions: any[]; keywordActions: any[]; keywordPresets: any[]; sanctions: any[] };
  inbox: {
    folders: any[];
    statuses: readonly string[];
    statusLabels: Record<string, string>;
    labels: any[];
    cannedKinds: any[];
    cannedLimits: Record<string, any>;
  };
  followers: { filters: readonly string[]; sources: any[] };
  events: { modes: any[]; registrationModes: any[]; attendeeStatuses: readonly string[]; limits: Record<string, any> };
  insights: { ranges: any[]; defaultRange: InsightRange; panels: any[]; exportFormats: readonly string[] };
  promotion: {
    targetKinds: any[];
    objectives: any[];
    statuses: readonly string[];
    statusLabels: Record<string, string>;
    ownerTransitions: Record<string, readonly string[]>;
    limits: Record<string, any>;
  };
  monetization: {
    kinds: any[];
    transactionStatuses: readonly string[];
    transactionStatusLabels: Record<string, string>;
    payoutStatuses: readonly string[];
    currencies: readonly string[];
    limits: Record<string, any>;
    platformFeePercent: number;
    paymentsLive: boolean;
  };
  controlSwitches: any[];
  verification: {
    tiers: any[];
    entityTypes: any[];
    statuses: readonly string[];
    statusLabels: Record<string, string>;
    adminTransitions: Record<string, readonly string[]>;
    limits: Record<string, any>;
  };
}

export function fetchManageMeta(): Promise<ManageMeta> {
  return get<ManageMeta>('/meta');
}

// ── §1 Overview, activity ────────────────────────────────

/**
 * Where the Space stands with moderation, as the owner is allowed to see it.
 *
 * Everything here is owner-readable by design: a suspension's length and reason,
 * which rung of §5's ladder the Space is on, and which settings staff have locked.
 * The staff-only halves — the internal note and who decided — are not in the
 * payload at all, so no client-side filtering keeps them out.
 */
export interface SpaceStanding {
  status: string;
  suspended: boolean;
  permanent: boolean;
  suspendedAt: string | null;
  /** ISO instant, not a sentence — rendered in the reader's own timezone. */
  suspendedUntil: string | null;
  suspensionReason: string | null;
  reachRestricted: boolean;
  removed: boolean;
  warnings: number;
  lastWarningAt: string | null;
  monetizationFrozen: boolean;
  monetizationFrozenAt: string | null;
  handleChangeRequiredAt: string | null;
  lockedSettings: { id: string; label: string; hint?: string }[];
}

export interface ManageOverview {
  space: any;
  /** Every permission key with a boolean — the nav and the panels read this. */
  permissions: Record<SpacePermission, boolean>;
  /** Stored feature map, so the nav hides sections a Space has switched off. */
  features: Record<string, boolean>;
  isOwner: boolean;
  role: SpaceMemberRole | null;
  counts: Record<string, number>;
  recentActivity: any[];
  standing: SpaceStanding;
}

export function fetchManageOverview(id: string): Promise<ManageOverview> {
  return get<ManageOverview>(`/${id}/overview`);
}

export function fetchManageActivity(id: string, params: { limit?: number; offset?: number; action?: string } = {}) {
  return get<{ activity: any[]; total: number }>(`/${id}/activity${qs(params)}`);
}

// ── §3, §4 Team ──────────────────────────────────────────

export interface TeamResponse {
  owner: any;
  members: any[];
  canInvite: boolean;
  canChangeRoles: boolean;
  canRemove: boolean;
  isOwner: boolean;
}

export function fetchTeam(id: string): Promise<TeamResponse> {
  return get<TeamResponse>(`/${id}/team`);
}

export function inviteTeamMember(
  id: string,
  payload: { username?: string; email?: string; role: SpaceMemberRole; permissions?: SpacePermission[]; note?: string },
) {
  return send<any>('POST', `/${id}/team`, payload);
}

export function resendTeamInvite(memberId: string) {
  return send<any>('POST', `/team/${memberId}/resend`);
}

export function revokeTeamInvite(memberId: string) {
  return send<any>('DELETE', `/team/${memberId}/invite`);
}

/**
 * `confirm` is only ever needed when the change touches an ADMIN membership — the
 * server challenges those (MP4 §10) and the caller retries the same call with the
 * answer. Passing it unconditionally is harmless; the server ignores it otherwise.
 */
export function updateTeamMember(
  memberId: string,
  patch: { role?: SpaceMemberRole; permissions?: SpacePermission[]; status?: string },
  confirm?: SpaceConfirmation,
) {
  return send<any>('PATCH', `/team/${memberId}`, { ...patch, ...(confirm || {}) });
}

export function removeTeamMember(memberId: string, confirm?: SpaceConfirmation) {
  return send<{ removed: boolean }>('DELETE', `/team/${memberId}`, { ...(confirm || {}) });
}

/** Giving up your own access. Separate from removeTeamMember because the server
 *  gate is different: it is your row, so no team permission is involved. */
export function leaveSpace(id: string) {
  return send<{ left: boolean }>('POST', `/${id}/team/leave`);
}

/** Invitations addressed to me — the Space switcher badge reads this. */
export function fetchMyInvites() {
  return get<{ invites: any[] }>('/invites');
}

/** Every Space this user may act as (§2). Personal account is added client-side. */
export interface SpaceIdentityRow {
  kind: 'space';
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  verified: boolean;
  status: string;
  spaceType: string;
  role: SpaceMemberRole;
  permissions: SpacePermission[];
  followersCount: number;
  unreadCount: number;
}

export function fetchMyIdentities() {
  return get<{ identities: SpaceIdentityRow[] }>('/identities');
}

export function respondToTeamInvite(memberId: string, accept: boolean) {
  return send<any>('POST', `/invites/${memberId}/respond`, { accept });
}

// ── §6, §7 Content ───────────────────────────────────────

export interface ContentListParams extends Record<string, unknown> {
  status?: SpaceContentStatus | 'all';
  kind?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function fetchSpaceContent(id: string, params: ContentListParams = {}) {
  return get<{ posts: any[]; total: number; canPublish: boolean; canSchedule: boolean; canDelete: boolean }>(
    `/${id}/content${qs(params)}`,
  );
}

/* The composer is the only producer of these bodies, so both take the shared draft
 * shape rather than a loose bag — a missing field is then a compile error here
 * instead of a 400 from the server. */
export function createSpacePost(id: string, draft: SpaceComposerDraft) {
  return send<any>('POST', `/${id}/content`, draft);
}

export function updateSpacePost(postId: string, draft: SpaceComposerDraft) {
  return send<any>('PATCH', `/content/${postId}`, draft);
}

export function setSpacePostFlags(postId: string, flags: { pinned?: boolean; featured?: boolean; commentsOff?: boolean }) {
  return send<any>('POST', `/content/${postId}/flags`, flags);
}

export function rescheduleSpacePost(postId: string, payload: { scheduledFor?: string | null; unschedule?: boolean }) {
  return send<any>('PATCH', `/content/${postId}/schedule`, payload);
}

export function deleteSpacePost(postId: string) {
  return send<{ deleted: boolean }>('DELETE', `/content/${postId}`);
}

// ── §8 Moderation ────────────────────────────────────────

export function fetchSpaceComments(
  id: string,
  params: { status?: string; postId?: string; limit?: number; offset?: number } = {},
) {
  return get<{ comments: any[]; total: number; pendingCount: number }>(`/${id}/comments${qs(params)}`);
}

export function moderateSpaceComment(
  commentId: string,
  payload: { action: SpaceCommentAction; reason?: string; durationDays?: number },
) {
  return send<any>('POST', `/comments/${commentId}/moderate`, payload);
}

export function fetchKeywordFilters(id: string) {
  return get<{ keywords: any[]; settings: Record<string, any>; limit: number }>(`/${id}/keywords`);
}

export function addKeywordFilter(id: string, payload: { word: string; action?: string }) {
  return send<any>('POST', `/${id}/keywords`, payload);
}

export function removeKeywordFilter(keywordId: string) {
  return send<{ removed: boolean }>('DELETE', `/keywords/${keywordId}`);
}

export function fetchAudienceFlags(id: string) {
  return get<{ flags: any[] }>(`/${id}/audience`);
}

/**
 * `userId` when the person is already on screen (a comment author), `username`
 * when the owner is typing a name into the security panel. The server accepts
 * either in the same field and resolves it, so neither caller needs a lookup of
 * its own.
 */
export function setAudienceFlag(
  id: string,
  payload: { userId?: string; username?: string; sanction: SpaceSanction; reason?: string; durationDays?: number },
) {
  return send<any>('POST', `/${id}/audience`, payload);
}

export function clearAudienceFlag(flagId: string) {
  return send<{ cleared: boolean }>('DELETE', `/audience/${flagId}`);
}

// ── §12 Followers ────────────────────────────────────────

export function fetchManagedFollowers(
  id: string,
  params: { filter?: FollowerListFilter; search?: string; source?: string; limit?: number; offset?: number } = {},
) {
  return get<{
    followers: any[];
    total: number;
    /** Real growth from the daily stat rows — the section's tiles read this. */
    stats: { gained7d: number; lost7d: number; net7d: number; sanctioned: number };
    sources: Array<{ id: string; label: string; count: number }>;
  }>(`/${id}/followers${qs(params)}`);
}

export function removeSpaceFollower(id: string, userId: string, block = false) {
  return send<{ removed: boolean; banned: boolean }>('DELETE', `/${id}/followers`, { userId, block });
}

// ── §9–§11 Space inbox ───────────────────────────────────

/** Visitor-side: opens *the Space's* thread, never the owner's personal DM. */
export function openSpaceConversation(id: string) {
  return send<{ conversationId: string; threadId: string; space: any }>('POST', `/${id}/conversation`);
}

/** The banner every reply screen must render: "Replying as ✓ <Space>" (§11). */
export interface ReplyingAs {
  spaceId: string;
  name: string;
  handle: string;
  avatar: string | null;
  verified: boolean;
}

export interface InboxListResponse {
  folder: SpaceInboxFolder;
  replyingAs: ReplyingAs;
  canReply: boolean;
  canAssign: boolean;
  canManageRequests: boolean;
  total: number;
  statusCounts: Record<string, number>;
  threads: any[];
}

export interface InboxThreadResponse {
  thread: any;
  replyingAs: ReplyingAs;
  canReply: boolean;
  quickReplies: any[];
  messages: any[];
}

export function fetchInboxThreads(
  id: string,
  params: { folder?: SpaceInboxFolder; status?: SpaceThreadStatus; search?: string; limit?: number; offset?: number } = {},
) {
  return get<InboxListResponse>(`/${id}/inbox${qs(params)}`);
}

export function fetchInboxThread(threadId: string, params: { limit?: number; before?: string } = {}) {
  return get<InboxThreadResponse>(`/inbox/${threadId}${qs(params)}`);
}

// `imageUrl` (an uploaded image) is accepted by the server alongside or instead of text.
export function replyAsSpace(threadId: string, payload: { text: string; cannedReplyId?: string; imageUrl?: string }) {
  return send<any>('POST', `/inbox/${threadId}/reply`, payload);
}


export function fetchInboxThreadByConversation(id: string, conversationId: string) {
  return get<InboxThreadResponse>(`/${id}/inbox-by-conversation/${conversationId}`);
}

export function patchInboxThreadByConversation(
  id: string,
  conversationId: string,
  patch: { status?: SpaceThreadStatus; labels?: string[]; assignedMemberId?: string | null; read?: boolean },
) {
  return send<any>('PATCH', `/${id}/inbox-by-conversation/${conversationId}`, patch);
}

export function patchInboxThread(
  threadId: string,
  // Key names match buildThreadPatch() exactly: the route throws "Nothing to
  // change" on an unrecognised body, so a near-miss here would fail silently.
  patch: { status?: SpaceThreadStatus; labels?: string[]; assignedMemberId?: string | null; read?: boolean },
) {
  return send<any>('PATCH', `/inbox/${threadId}`, patch);
}

export function fetchCannedReplies(id: string) {
  return get<{ replies: any[]; limits: Record<string, any> }>(`/${id}/canned-replies`);
}

export function saveCannedReply(
  id: string,
  payload: { kind: SpaceCannedKind; title: string; body: string; shortcut?: string; isActive?: boolean; order?: number },
  replyId?: string,
) {
  return replyId
    ? send<any>('PUT', `/${id}/canned-replies/${replyId}`, payload)
    : send<any>('POST', `/${id}/canned-replies`, payload);
}

export function deleteCannedReply(replyId: string) {
  return send<{ removed: boolean }>('DELETE', `/canned-replies/${replyId}`);
}

// ── §15 Events ───────────────────────────────────────────

export function fetchSpaceEvents(id: string, params: { past?: boolean } = {}) {
  return get<{ canManage: boolean; events: any[] }>(`/${id}/events${qs(params)}`);
}

export function createSpaceEvent(id: string, draft: Record<string, unknown>) {
  return send<any>('POST', `/${id}/events`, draft);
}

export function updateSpaceEvent(eventId: string, draft: Record<string, unknown>) {
  return send<any>('PATCH', `/events/${eventId}`, draft);
}

export function cancelSpaceEvent(eventId: string) {
  return send<any>('POST', `/events/${eventId}/cancel`);
}

export function rsvpSpaceEvent(eventId: string, status: 'interested' | 'going' | 'not_going') {
  return send<any>('POST', `/events/${eventId}/rsvp`, { status });
}

// ── §16 Reviews ──────────────────────────────────────────

export interface ManagedReviewsResponse {
  reviews: any[];
  total: number;
  counts: { visible: number; hidden: number; unanswered: number };
  average: number;
  distribution: Record<string, number>;
  canReply: boolean;
}

export function fetchSpaceReviews(
  id: string,
  params: { status?: 'visible' | 'hidden'; answered?: 'yes' | 'no'; limit?: number; offset?: number } = {},
) {
  return get<ManagedReviewsResponse>(`/${id}/reviews${qs(params)}`);
}

/** `text: null` withdraws the reply. */
export function replyToReview(reviewId: string, text: string | null) {
  return send<any>('POST', `/reviews/${reviewId}/reply`, { text });
}
/* Hiding a review is `setReviewStatus` in wevspaceApi.ts — one endpoint serves the
 * public tab and this dashboard. */

// ── §25 Settings ─────────────────────────────────────────

export function fetchSpaceSettings(id: string) {
  return get<{ settings: SpaceSettingsBlob; canModify: boolean }>(`/${id}/settings`);
}

/** Send one section at a time; omitted sections are left untouched. */
export function saveSpaceSettings(id: string, patch: Partial<SpaceSettingsBlob>) {
  return send<{ settings: SpaceSettingsBlob }>('PUT', `/${id}/settings`, patch);
}

// ── §18 Insights ─────────────────────────────────────────

export interface InsightsResponse {
  format: 'json';
  range: InsightRange;
  from: string;
  to: string;
  days: number;
  canExport: boolean;
  totals: Record<string, number>;
  series: Array<{ day: string } & Record<string, number | string>>;
  topPosts: any[];
  followerSources: Array<{ source: string; count: number }>;
  responseRate?: number | null;
  avgResponseTimeMs?: number | null;
}

export function fetchInsights(
  id: string,
  params: { range?: InsightRange; from?: string; to?: string } = {},
): Promise<InsightsResponse> {
  return get<InsightsResponse>(`/${id}/insights${qs(params)}`);
}

/**
 * Downloads the same numbers the charts show as CSV. Returns the file text so
 * the caller decides between a download and a preview.
 */
export async function exportInsightsCsv(
  id: string,
  params: { range?: InsightRange; from?: string; to?: string } = {},
): Promise<{ filename: string; body: string }> {
  const res = await fetch(`/api/spaces${BASE}/${id}/insights${qs({ ...params, format: 'csv' })}`, {
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      message = JSON.parse(text)?.error || message;
    } catch {
      /* plain-text error body */
    }
    throw new SpaceApiError(message, res.status);
  }
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return { filename: match?.[1] || `${id}-insights.csv`, body: text };
}

// ── §19 Promotion ────────────────────────────────────────

export function fetchCampaigns(id: string, params: { status?: CampaignStatus | 'all'; limit?: number } = {}) {
  return get<{ campaigns: any[]; total: number; canManage: boolean; paymentsReady: boolean }>(
    `/${id}/campaigns${qs(params)}`,
  );
}

export function createCampaign(id: string, draft: Record<string, unknown>) {
  return send<any>('POST', `/${id}/campaigns`, draft);
}

export function updateCampaign(campaignId: string, draft: Record<string, unknown>) {
  return send<any>('PATCH', `/campaigns/${campaignId}`, draft);
}

/** Owners may submit, pause, resume or cancel. Only staff can approve. */
export function transitionCampaign(campaignId: string, status: CampaignStatus) {
  return send<any>('POST', `/campaigns/${campaignId}/transition`, { status });
}

export function fetchAdvertiserAccount(id: string) {
  return get<{
    id: string;
    spaceId: string;
    status: string;
    currency: string;
    timezone: string;
    totalSpend: number;
  }>(`/${id}/ads/account`);
}

export function ensureAdvertiserAccount(id: string) {
  return send<{
    id: string;
    spaceId: string;
    status: string;
    currency: string;
    timezone: string;
    totalSpend: number;
  }>('POST', `/${id}/ads/account`);
}

export function fetchAdsOverview(id: string) {
  return get<{
    account: {
      id: string;
      spaceId: string;
      status: string;
      currency: string;
      timezone: string;
      totalSpend: number;
      balance?: number;
      availableBalance?: number;
      reservedBalance?: number;
    };
    spend: number;
    currency: string;
    activeCount: number;
    adCount: number;
    impressions: number;
    reach: number;
    clicks: number;
    results: number;
    ctr: number;
    cpc?: number | null;
    cpm?: number | null;
    remainingBudget?: number;
    availableBalance?: number;
    reservedBalance?: number;
    balance: number;
    spendIsSimulated: boolean;
    canManage: boolean;
  }>(`/${id}/ads/overview`);
}

export function fetchAdsAnalytics(id: string, params: { range?: string; campaignId?: string } = {}) {
  return get<{
    overview: {
      spend: number;
      impressions: number;
      clicks: number;
      ctr: number;
      conversions: number;
      roas: number | null;
      unavailable?: { roas?: boolean };
    };
    series: Array<{ date: string; spend: number; impressions: number; clicks: number }>;
    campaigns: any[];
    placements: Record<string, { impressions: number; clicks: number; spend: number }>;
    variants: Record<string, { impressions: number; clicks: number; insight: string }>;
    abInsight: string;
  }>(`/${id}/ads/analytics${qs(params)}`);
}

export function fetchAdsConversions(id: string, params: { limit?: number } = {}) {
  return get<{
    pixel: { pixelId: string | null; enabledKinds: string[]; endpoint: string };
    events: Array<{
      id: string;
      campaignId: string;
      campaignName: string | null;
      adId: string | null;
      kind: string;
      value: number;
      currency: string;
      eventId: string;
      source: string | null;
      verified: boolean;
      createdAt: string;
    }>;
    kinds: string[];
  }>(`/${id}/ads/conversions${qs(params)}`);
}

export function saveAdsConversionPixel(id: string, body: { enabledKinds: string[] }) {
  return send<{ pixelId: string; enabledKinds: string[] }>('PUT', `/${id}/ads/conversions/pixel`, body);
}

export function fetchAdsBilling(id: string, params: { limit?: number } = {}) {
  return get<{
    account: any;
    transactions: any[];
    canManage: boolean;
    config: { frequencyCapPerDay: number; feedGap: number; impressionDwellMs: number };
  }>(`/${id}/ads/billing${qs(params)}`);
}

export function startAdsDeposit(id: string, body: { amount: number; currency?: string; provider?: string }) {
  return send<{
    transactionId: string;
    reference: string;
    amount: number;
    currency: string;
    provider: string;
    mode: string;
    checkoutUrl: string;
    sessionId: string;
  }>('POST', `/${id}/ads/billing/deposit`, body);
}

export function confirmAdsDeposit(id: string, body: { transactionId?: string; sessionId?: string }) {
  return send<{ credited: boolean; transactionId?: string; reason?: string }>(
    'POST',
    `/${id}/ads/billing/deposit/confirm`,
    body,
  );
}

export function fetchSpaceAds(id: string, params: { status?: string; limit?: number; offset?: number } = {}) {
  return get<{ ads: any[]; total: number; canManage: boolean }>(`/${id}/ads${qs(params)}`);
}

export function fetchCampaignAds(campaignId: string) {
  return get<{ ads: any[]; canManage: boolean }>(`/campaigns/${campaignId}/ads`);
}

export function createCampaignAd(campaignId: string, body: Record<string, unknown>) {
  return send<any>('POST', `/campaigns/${campaignId}/ads`, body);
}

export function updateCampaignAd(adId: string, body: Record<string, unknown>) {
  return send<any>('PATCH', `/ads/${adId}`, body);
}

export function saveAdCreative(adId: string, body: Record<string, unknown>) {
  return send<any>('PUT', `/ads/${adId}/creative`, body);
}

export function fetchCampaignReviewQueue(params: { status?: CampaignStatus; limit?: number; offset?: number } = {}) {
  return get<{ campaigns: any[]; total: number }>(`/admin/campaigns${qs(params)}`);
}

export function reviewCampaign(campaignId: string, status: CampaignStatus, note?: string) {
  return send<any>('POST', `/admin/campaigns/${campaignId}/review`, { status, note });
}

// ── §17, §20 Monetization ────────────────────────────────

export interface MonetizationOverview {
  settings: {
    enabled: boolean;
    currency: string;
    kinds: Record<MonetizationKind, boolean>;
    payoutDestination: string | null;
  };
  canManage: boolean;
  /** False until a real processor exists — screens must not imply otherwise. */
  paymentsReady: boolean;
  platformFeePercent: number;
  minPayout: number;
  tiers: any[];
  earnings: {
    currency: string;
    grossRealised: number;
    feesTaken: number;
    netRealised: number;
    transactions: number;
    paidOut: number;
    inFlightPayouts: number;
    availableBalance: number;
    byKind: Array<{ kind: MonetizationKind; net: number }>;
  };
  transactions: any[];
  payouts: any[];
}

export function fetchMonetization(id: string): Promise<MonetizationOverview> {
  return get<MonetizationOverview>(`/${id}/monetization`);
}

export function saveMonetizationSettings(
  id: string,
  patch: { enabled?: boolean; currency?: string; kinds?: Partial<Record<MonetizationKind, boolean>>; payoutDestination?: string | null },
) {
  return send<{ monetization: any }>('PUT', `/${id}/monetization`, patch);
}

export function saveMonetizationTier(id: string, payload: Record<string, unknown>, tierId?: string) {
  return tierId
    ? send<any>('PATCH', `/${id}/monetization/tiers/${tierId}`, payload)
    : send<any>('POST', `/${id}/monetization/tiers`, payload);
}

export function deleteMonetizationTier(tierId: string) {
  return send<{ removed?: boolean; retired?: boolean }>('DELETE', `/tiers/${tierId}`);
}

/**
 * Records intent to pay. Deliberately not a checkout: the response carries
 * `paymentPending: true` and a message the UI must show verbatim (§17).
 */
export function recordSupport(
  id: string,
  payload: { kind?: MonetizationKind; tierId?: string; amount?: number; message?: string },
) {
  return send<{
    transaction: any;
    paymentPending: boolean;
    heldForReview: boolean;
    message: string;
  }>('POST', `/${id}/support`, payload);
}

export function fetchTransactions(
  id: string,
  params: { status?: TransactionStatus | 'all'; kind?: MonetizationKind; limit?: number; offset?: number } = {},
) {
  return get<{ transactions: any[]; total: number; sums: { gross: number; net: number } }>(
    `/${id}/transactions${qs(params)}`,
  );
}

export function requestPayout(id: string, payload: { amount: number; destination?: string; note?: string }) {
  return send<any>('POST', `/${id}/payouts`, payload);
}

export function settleTransaction(transactionId: string, status: TransactionStatus, note?: string) {
  return send<any>('POST', `/admin/transactions/${transactionId}/settle`, { status, note });
}

export function reviewPayout(payoutId: string, status: PayoutStatus, note?: string) {
  return send<any>('POST', `/admin/payouts/${payoutId}/review`, { status, note });
}

// ── §7 Verification ──────────────────────────────────────

/**
 * One application, as the applicant is allowed to see it. The reviewer's identity,
 * the triage score and the internal notes are not optional fields that happen to
 * be missing — the owner-facing endpoint never selects them.
 */
export interface VerificationRequestView {
  id: string;
  tier: SpaceVerificationTier;
  status: VerificationRequestStatus;
  statusLabel: string;
  spaceNameAtRequest: string;
  handleAtRequest: string;
  entityType: string;
  country: string | null;
  officialWebsite: string | null;
  reason: string;
  links: Array<{ label: string; url: string }>;
  documentCount: number;
  requestedAt: string;
  reviewedAt: string | null;
  /** The one sentence written for the applicant. Never the private notes. */
  decisionReason: string | null;
  /** False for a teammate who did not sign it: identity fields are then absent. */
  identityVisible: boolean;
  legalName?: string;
  registrationId?: string | null;
  contactEmail?: string | null;
  documents?: string[];
}

export interface VerificationOverview {
  state: VerificationViewState;
  /** The badge actually held, or null. Never a moderation word. */
  tier: SpaceVerificationTier | null;
  verifiedAt: string | null;
  apply: { allowed: boolean; reason?: string; waitDays?: number };
  /** Whether this viewer may apply at all, separate from whether the Space may. */
  canManage: boolean;
  reapplyDays: number;
  latest: VerificationRequestView | null;
  history: VerificationRequestView[];
  prefill: { spaceName: string; handle: string; officialWebsite: string; contactEmail: string; country: string };
}

export function fetchVerification(id: string): Promise<VerificationOverview> {
  return get<VerificationOverview>(`/${id}/verification`);
}

export function submitVerification(id: string, draft: VerificationDraft) {
  return send<{ request: VerificationRequestView }>('POST', `/${id}/verification`, draft);
}

export function withdrawVerification(id: string) {
  return send<{ request: VerificationRequestView }>('POST', `/${id}/verification/withdraw`);
}

/**
 * One application as the *reviewer* sees it: everything the applicant sent, plus
 * the three things the owner-facing view deliberately never selects — the triage
 * score, the signals behind it, and the internal notes.
 *
 * Transcribed from `serializeVerificationForStaff`, and typed rather than left as
 * `any` because a review queue that silently renders `undefined` where a legal
 * name should be is a queue that gets decided on missing evidence.
 */
export interface VerificationStaffRequest {
  id: string;
  spaceId: string;
  space: {
    id: string;
    handle: string;
    name: string;
    avatar: string | null;
    spaceType: string;
    status: string;
    verificationStatus: string;
    moderationStatus: string;
    followersCount: number;
    postsCount: number;
    createdAt: string;
    owner: { id: string; name: string; username: string | null; avatar: string | null } | null;
  } | null;
  tier: SpaceVerificationTier;
  status: VerificationRequestStatus;
  statusLabel: string;
  /** The name and handle at the moment of applying — a Space can rename mid-review. */
  spaceNameAtRequest: string;
  handleAtRequest: string;
  entityType: string;
  legalName: string | null;
  registrationId: string | null;
  country: string | null;
  officialWebsite: string | null;
  contactEmail: string | null;
  reason: string;
  documents: string[];
  links: Array<{ label: string; url: string }>;
  requestedBy: { id: string; name: string; username: string | null; avatar: string | null } | null;
  requestedAt: string;
  reviewedBy: { id: string; name: string; username: string | null; avatar: string | null } | null;
  reviewedAt: string | null;
  /** The one sentence written for the applicant. */
  decisionReason: string | null;
  /** Staff-only (§7: never expose internal moderation notes publicly). */
  internalNote: string | null;
  riskScore: number;
  riskSignals: string[];
  /** Said out loud on the row: the score orders the queue, it never decides (§8). */
  riskIsAdvisory: boolean;
}

export interface VerificationQueue {
  requests: VerificationStaffRequest[];
  total: number;
  status: string;
  counts: Record<string, number>;
}

/** Staff review queue. Ordered by triage score, which orders reading and nothing else. */
export function fetchVerificationQueue(params: { status?: string; limit?: number; offset?: number } = {}) {
  return get<VerificationQueue>(`/admin/verification${qs(params)}`);
}

export function reviewVerificationRequest(
  requestId: string,
  payload: {
    status: VerificationRequestStatus;
    decisionReason?: string;
    internalNote?: string;
    tier?: SpaceVerificationTier;
  },
) {
  return send<{ request: VerificationStaffRequest }>('POST', `/admin/verification/${requestId}/review`, payload);
}

/** Granting or removing a badge with no application to act on (§4). */
export function setSpaceVerification(
  id: string,
  payload: { verified: boolean; tier?: SpaceVerificationTier; decisionReason?: string; internalNote?: string },
) {
  return send<{ verificationStatus: string; verifiedAt: string | null }>(
    'POST',
    `/admin/spaces/${id}/verification`,
    payload,
  );
}

// ── WevDesk: Broadcast, New chat, Invoices ───────────────

export type BroadcastAudience = 'FOLLOWERS' | 'CHATTED' | 'OPEN';

export interface SpaceBroadcast {
  id: string;
  audience: BroadcastAudience;
  text: string;
  status: 'SCHEDULED' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  createdBy: { id: string; name: string | null; username: string | null; avatar: string | null } | null;
}

export interface BroadcastsResponse {
  broadcasts: SpaceBroadcast[];
  audiences: Record<BroadcastAudience, number>;
  usedToday: number;
  limits: { maxRecipients: number; perDay: number; maxText: number; minLeadMs: number; maxAheadMs: number };
  canBroadcast: boolean;
  messagingEnabled: boolean;
}

export function fetchBroadcasts(id: string) {
  return get<BroadcastsResponse>(`/${id}/broadcasts`);
}

export function createBroadcast(id: string, payload: { audience: BroadcastAudience; text: string; scheduledAt?: string | null }) {
  return send<SpaceBroadcast>('POST', `/${id}/broadcasts`, payload);
}

export function cancelBroadcast(broadcastId: string) {
  return send<{ id: string; status: string }>('POST', `/broadcasts/${broadcastId}/cancel`);
}

/** Space starts (or continues) a chat with a follower; returns the inbox thread to open. */
export function startSpaceChat(id: string, payload: { userId: string; text: string }) {
  return send<{ threadId: string; conversationId: string }>('POST', `/${id}/chats`, payload);
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';

export interface SpaceInvoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  total: number;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  customerUserId: string | null;
  customer: { id: string; name: string | null; username: string | null; avatar: string | null } | null;
  customerName: string;
  customerEmail: string | null;
  dueDate: string | null;
  note: string | null;
  sentAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  conversationId: string | null;
  createdAt: string;
  space?: { id: string; name: string; handle: string; avatar: string | null };
  viewerIsTeam?: boolean;
}

export function fetchInvoices(id: string) {
  return get<{ invoices: SpaceInvoice[]; totals: { unpaid: number; paidThisMonth: number; sent: number }; canManage: boolean }>(`/${id}/invoices`);
}

export function createInvoice(
  id: string,
  payload: {
    customerUserId?: string | null;
    customerName?: string;
    customerEmail?: string;
    items: Array<{ description: string; quantity: number; unitPrice: number }>;
    dueDate?: string | null;
    note?: string;
    send?: boolean;
  },
) {
  return send<SpaceInvoice>('POST', `/${id}/invoices`, payload);
}

export function setInvoiceStatus(invoiceId: string, status: Exclude<InvoiceStatus, 'DRAFT'>) {
  return send<SpaceInvoice>('PATCH', `/invoices/${invoiceId}`, { status });
}

export function fetchInvoice(invoiceId: string) {
  return get<SpaceInvoice>(`/invoices/${invoiceId}`);
}

// ── Inbox automations (wevspace-automation.service.ts) ─────────────────────────────────────

export const AUTOMATION_DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type AutomationDay = (typeof AUTOMATION_DAYS)[number];

export interface InboxAutomationConfig {
  instantReply: { enabled: boolean; text: string; reopenAfterHours: number };
  welcome: { enabled: boolean; text: string; faqs: { question: string; answer: string }[] };
  away: {
    enabled: boolean;
    manualAway: boolean;
    useSchedule: boolean;
    text: string;
    cooldownMinutes: number;
    timezone: string;
    schedule: Record<AutomationDay, { open: boolean; from: string; to: string }>;
  };
  keywords: { enabled: boolean; cooldownMinutes: number };
}

export interface AutoReplyRule {
  id: string;
  keywords: string[];
  matchType: 'contains' | 'exact';
  replyText: string;
  isActive: boolean;
  priority: number;
  hitCount: number;
}

export interface InboxAutomationPayload {
  spaceId: string;
  spaceName: string;
  configured: boolean;
  config: InboxAutomationConfig;
  rules: AutoReplyRule[];
  canEdit: boolean;
  limits: Record<string, number>;
  updatedAt: string | null;
}

export function fetchInboxAutomation(id: string) {
  return get<InboxAutomationPayload>(`/${id}/automation`);
}

export function saveInboxAutomation(id: string, config: InboxAutomationConfig) {
  return send<InboxAutomationPayload>('PUT', `/${id}/automation`, { config });
}

export function createAutoReplyRule(id: string, rule: Partial<Omit<AutoReplyRule, 'id' | 'hitCount'>>) {
  return send<AutoReplyRule>('POST', `/${id}/auto-replies`, rule);
}

export function updateAutoReplyRule(ruleId: string, patch: Partial<Omit<AutoReplyRule, 'id' | 'hitCount'>>) {
  return send<AutoReplyRule>('PATCH', `/auto-replies/${ruleId}`, patch);
}

export function deleteAutoReplyRule(ruleId: string) {
  return send<{ ok: boolean }>('DELETE', `/auto-replies/${ruleId}`);
}

export function reorderAutoReplyRules(id: string, ids: string[]) {
  return send<{ rules: AutoReplyRule[] }>('POST', `/${id}/auto-replies/reorder`, { ids });
}

/** Customer side: greeting + FAQ questions for an empty chat with this Space. */
export function fetchSpaceGreeting(spaceId: string) {
  return get<{ enabled: boolean; text: string; faqs: string[]; spaceName?: string }>(`/${spaceId}/greeting`);
}
