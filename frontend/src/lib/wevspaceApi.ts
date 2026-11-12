/**
 * WevSpace frontend API client. One place for every Space HTTP call so pages and
 * components never hand-roll fetch options or auth headers.
 *
 * Types mirror the server payloads produced by wevspace.logic.ts#serializeSpace.
 */

import type {
  SpaceCardPayload,
  SpaceDeletionState,
  SpaceDraft,
  SpacePublicPayload,
  SpaceTab,
} from '@wevsoft/shared/wevspace';

export type { SpaceCardPayload, SpaceDeletionState, SpaceDraft, SpacePublicPayload, SpaceTab };

import { authHeadersFromStorage } from '@wevsoft/shared/api/client';

/** Exported for wevspaceManageApi.ts — one dialect for both Space clients. */
export function authHeaders(json = false): Record<string, string> {
  return authHeadersFromStorage(json);
}

export class SpaceApiError extends Error {
  status: number;
  /** Extra body fields the server attached, e.g. the restricted-view card. */
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'SpaceApiError';
    this.status = status;
    this.data = data || null;
  }
}

// ── Confirmation for dangerous actions (MP4 §10) ──────────

/** How the account can prove itself, mirroring `server/common/reauth.ts`. */
export type SpaceReauthMethod = 'twofactor' | 'password';

/**
 * The credential a dangerous route asks for on its second attempt.
 *
 * Every write helper below that can be challenged takes this as an optional
 * trailing argument, so a caller retries the *same* call with the confirmation
 * attached rather than routing through a parallel "confirmed" endpoint.
 */
export interface SpaceConfirmation {
  confirmPassword?: string;
  confirmCode?: string;
}

/** What the server asked for when it refused, decoded from the 401/403 body. */
export interface SpaceReauthChallenge {
  reason: 'required' | 'invalid' | 'unavailable';
  /** Empty when `reason` is `unavailable` — there is nothing to prompt for. */
  methods: SpaceReauthMethod[];
  /** e.g. `'space.transfer_ownership'`. Lets the prompt name what it is guarding. */
  action: string;
  message: string;
  /** `unavailable` is terminal: retrying with a credential cannot help. */
  retryable: boolean;
}

/**
 * Reads a confirmation challenge off a rejected call, or null when the failure was
 * something else entirely.
 *
 * Callers must branch on null rather than assuming a 401 means "ask for a
 * password" — an expired session is also a 401, and prompting for a password
 * there would collect a credential the page cannot use.
 */
export function reauthChallengeOf(err: unknown): SpaceReauthChallenge | null {
  const api = err as SpaceApiError | null;
  const code = api?.data?.code;
  if (code !== 'REAUTH_REQUIRED' && code !== 'REAUTH_UNAVAILABLE') return null;
  const reauth = api?.data?.reauth || {};
  const reason = reauth.reason === 'invalid' || reauth.reason === 'unavailable' ? reauth.reason : 'required';
  return {
    reason,
    methods: Array.isArray(reauth.methods) ? reauth.methods : [],
    action: typeof reauth.action === 'string' ? reauth.action : '',
    message: api?.message || 'Confirm it is you to continue.',
    retryable: reason !== 'unavailable',
  };
}

/**
 * Folds a confirmation into a request body.
 *
 * Empty fields are dropped rather than sent as `''`, because the server reads a
 * present-but-empty password as "nothing supplied" and an empty code would burn
 * nothing but muddy the failure reason in the account's security history.
 */
function withConfirmation(body: Record<string, unknown>, confirm?: SpaceConfirmation): Record<string, unknown> {
  if (!confirm) return body;
  const out = { ...body };
  if (confirm.confirmPassword) out.confirmPassword = confirm.confirmPassword;
  if (confirm.confirmCode) out.confirmCode = confirm.confirmCode.trim();
  return out;
}

/** `path` is relative to /api/spaces, so the manage client passes '/manage/…'. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/spaces${path}`, init);
  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  if (!res.ok) {
    throw new SpaceApiError(body?.error || `Request failed (${res.status})`, res.status, body);
  }
  return body as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path, { headers: authHeaders() });
}

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method,
    headers: authHeaders(true),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

export function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
}

// ── Metadata / handles ───────────────────────────────────

export interface SpaceMeta {
  types: any[];
  categories: Record<string, string[]>;
  tabs: Array<{ id: SpaceTab; label: string }>;
  features: Array<{ id: string; label: string }>;
  themes: any[];
  ctaTypes: any[];
  linkPlatforms: any[];
  visibilities: any[];
  profileVisibilities: any[];
  memberRoles: any[];
  limits: { maxSpacesPerUser: number; maxLinks: number };
}

export function fetchSpaceMeta(): Promise<SpaceMeta> {
  return get<SpaceMeta>('/meta');
}

export interface HandleAvailability {
  handle: string;
  available: boolean;
  reason?: string;
  suggestions: string[];
}

export function checkSpaceHandle(handle: string, spaceId?: string): Promise<HandleAvailability> {
  return get<HandleAvailability>(`/handle-available${qs({ handle, spaceId })}`);
}

// ── Read ─────────────────────────────────────────────────

export interface RestrictedSpaceResponse {
  restricted: true;
  reason: string;
  space: SpaceCardPayload;
}

/** Public page load. Accepts `handle` or `@handle`. */
export function fetchSpaceByHandle(handle: string, source?: string): Promise<SpacePublicPayload> {
  const clean = handle.replace(/^@/, '');
  return get<SpacePublicPayload>(`/by-handle/${encodeURIComponent(clean)}${qs({ src: source })}`);
}

export function fetchSpace(id: string): Promise<SpacePublicPayload> {
  return get<SpacePublicPayload>(`/${encodeURIComponent(id)}`);
}

export interface MySpacesResponse {
  owned: SpaceCardPayload[];
  managed: Array<SpaceCardPayload & { membershipStatus: string; membershipId: string }>;
  limit: number;
  spacesVisibility: 'everyone' | 'followers' | 'nobody' | string;
  /**
   * Ownership offers made *to* this account and still open (MP4 §10). Bundled here
   * rather than fetched separately so a 14-day deadline does not depend on the
   * receiver opening a screen they have no reason to visit.
   */
  ownershipOffers: SpaceOwnershipTransfer[];
}

export function fetchMySpaces(): Promise<MySpacesResponse> {
  return get<MySpacesResponse>('/mine');
}

export interface UserSpacesResponse {
  spaces: SpaceCardPayload[];
  hidden: boolean;
  visibility: string;
}

export function fetchUserSpaces(username: string): Promise<UserSpacesResponse> {
  return get<UserSpacesResponse>(`/user/${encodeURIComponent(username.replace(/^@/, ''))}`);
}

// ── Write ────────────────────────────────────────────────

export function createSpace(payload: Partial<SpaceDraft> & { handle: string; name: string }): Promise<SpacePublicPayload> {
  return send<SpacePublicPayload>('POST', '/', payload);
}

export function updateSpace(id: string, patch: Record<string, unknown>): Promise<SpacePublicPayload> {
  return send<SpacePublicPayload>('PATCH', `/${encodeURIComponent(id)}`, patch);
}

export function publishSpace(id: string): Promise<SpacePublicPayload> {
  return send<SpacePublicPayload>('POST', `/${encodeURIComponent(id)}/publish`);
}

export function unpublishSpace(id: string): Promise<SpacePublicPayload> {
  return send<SpacePublicPayload>('POST', `/${encodeURIComponent(id)}/unpublish`);
}

export function archiveSpace(id: string, confirm?: SpaceConfirmation): Promise<SpacePublicPayload> {
  return send<SpacePublicPayload>('POST', `/${encodeURIComponent(id)}/archive`, withConfirmation({}, confirm));
}

// ── §6 Deletion lifecycle ────────────────────────────────

/**
 * What `POST /:id/delete-request` answers with.
 *
 * The two shapes are not interchangeable and the caller must branch: `scheduled`
 * means the Space is still there with a countdown on it, `immediate` means an
 * untouched draft was purged on the spot and there is nothing left to navigate to.
 */
export interface SpaceDeletionRequestResult {
  purged: boolean;
  scheduled: boolean;
  /** True when the request was a no-op because a countdown was already running. */
  alreadyScheduled?: boolean;
  /** True when the Space was an empty draft and went immediately. */
  immediate?: boolean;
  deletion: SpaceDeletionState | null;
  space?: SpacePublicPayload;
  id?: string;
  handle?: string;
}

export function requestSpaceDeletion(
  id: string,
  reason?: string,
  confirm?: SpaceConfirmation,
): Promise<SpaceDeletionRequestResult> {
  return send<SpaceDeletionRequestResult>(
    'POST',
    `/${encodeURIComponent(id)}/delete-request`,
    withConfirmation({ reason: reason || undefined }, confirm),
  );
}

export function cancelSpaceDeletion(id: string): Promise<SpacePublicPayload> {
  return send<SpacePublicPayload>('POST', `/${encodeURIComponent(id)}/delete-request/cancel`);
}

/**
 * Downloads the export as a file (§6 "allow export", §22).
 *
 * Goes through `fetch` rather than an `<a download>` because the endpoint needs
 * the Authorization header, and a plain link cannot carry one. Returns the
 * filename so the caller can say what was saved instead of a bare "done".
 */
export async function downloadSpaceExport(id: string, handleHint?: string): Promise<{ filename: string; bytes: number }> {
  const res = await fetch(`/api/spaces/${encodeURIComponent(id)}/export`, { headers: authHeaders() });
  if (!res.ok) {
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    throw new SpaceApiError(body?.error || `Export failed (${res.status})`, res.status, body);
  }
  const blob = await res.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const clean = String(handleHint || 'wevspace').replace(/[^a-z0-9_-]/gi, '') || 'wevspace';
  const filename = `wevspace-${clean}-${stamp}.json`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoked on the next frame, not immediately: Safari cancels an in-flight
  // download if the object URL dies in the same task as the click.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
  return { filename, bytes: blob.size };
}

export function saveSpaceLinks(
  id: string,
  links: Array<{ platform: string; url: string; label?: string | null }>,
): Promise<{ links: any[] }> {
  return send<{ links: any[] }>('PUT', `/${encodeURIComponent(id)}/links`, { links });
}

// ── Follow ───────────────────────────────────────────────

export interface FollowResult {
  following: boolean;
  followersCount: number;
}

export function followSpace(id: string): Promise<FollowResult> {
  return send<FollowResult>('POST', `/${encodeURIComponent(id)}/follow`);
}

export function unfollowSpace(id: string): Promise<FollowResult> {
  return send<FollowResult>('DELETE', `/${encodeURIComponent(id)}/follow`);
}

export function fetchSpaceFollowers(id: string, limit = 24, offset = 0) {
  return get<{ followers: any[]; total: number }>(`/${encodeURIComponent(id)}/followers${qs({ limit, offset })}`);
}

/** Counted for insights; failure is intentionally ignored by callers. */
export function trackCtaClick(id: string): Promise<{ ok: boolean }> {
  return send<{ ok: boolean }>('POST', `/${encodeURIComponent(id)}/cta-click`);
}

// ── Discovery ────────────────────────────────────────────

export interface DiscoverParams {
  sort?: string;
  category?: string;
  type?: string;
  country?: string;
  location?: string;
  limit?: number;
  offset?: number;
}

export function discoverSpaces(params: DiscoverParams = {}) {
  return get<{ spaces: SpaceCardPayload[]; total: number; sort: string }>(`/discover${qs(params as any)}`);
}

/** Spaces the signed-in account follows (GET /api/spaces/following). */
export function fetchFollowedSpaces(limit = 24, offset = 0) {
  return get<{ spaces: SpaceCardPayload[]; total: number }>(`/following${qs({ limit, offset })}`);
}

export function searchSpaces(query: string, limit = 20, offset = 0) {
  return get<{ spaces: SpaceCardPayload[]; total: number; query: string }>(
    `/search${qs({ q: query, limit, offset })}`,
  );
}

export function fetchSpaceCategories() {
  return get<{ categories: Array<{ category: string; count: number }> }>('/categories');
}

// ── Offerings ────────────────────────────────────────────

export interface SpaceOffering {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  priceNote: string | null;
  image: string | null;
  url: string | null;
  isActive: boolean;
  order: number;
}

export function fetchOfferings(id: string) {
  return get<{ offerings: SpaceOffering[] }>(`/${encodeURIComponent(id)}/offerings`);
}

export function createOffering(id: string, payload: Record<string, unknown>) {
  return send<SpaceOffering>('POST', `/${encodeURIComponent(id)}/offerings`, payload);
}

export function updateOffering(offeringId: string, payload: Record<string, unknown>) {
  return send<SpaceOffering>('PATCH', `/offerings/${encodeURIComponent(offeringId)}`, payload);
}

export function deleteOffering(offeringId: string) {
  return send<{ deleted: boolean }>('DELETE', `/offerings/${encodeURIComponent(offeringId)}`);
}

// ── Reviews ──────────────────────────────────────────────

export interface SpaceReview {
  id: string;
  rating: number;
  text: string | null;
  createdAt: string;
  user: { id: string; name: string; username: string | null; avatar: string | null };
  isMine: boolean;
  /** The Space's public answer, if it gave one. The teammate who wrote it is
   *  never sent here — publicly the Space speaks, not a person (§16). */
  ownerReply: string | null;
  ownerReplyAt: string | null;
}

export function fetchReviews(id: string, limit = 20, offset = 0) {
  return get<{ reviews: SpaceReview[]; total: number; average: number; canModerate: boolean }>(
    `/${encodeURIComponent(id)}/reviews${qs({ limit, offset })}`,
  );
}

export function saveReview(id: string, rating: number, text?: string) {
  return send<SpaceReview>('PUT', `/${encodeURIComponent(id)}/reviews`, { rating, text });
}

export function setReviewStatus(reviewId: string, status: 'visible' | 'hidden' | 'removed') {
  return send<SpaceReview>('PATCH', `/reviews/${encodeURIComponent(reviewId)}`, { status });
}

// ── Team ─────────────────────────────────────────────────

export interface SpaceMember {
  id: string;
  role: string;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  user: { id: string; name: string; username: string | null; avatar: string | null };
  invitedBy?: { id: string; name: string } | null;
  isOwner: boolean;
  canManage: boolean;
}

export function fetchMembers(id: string) {
  return get<{ members: SpaceMember[] }>(`/${encodeURIComponent(id)}/members`);
}

export function inviteMember(id: string, payload: { username?: string; email?: string; role: string }) {
  return send<SpaceMember>('POST', `/${encodeURIComponent(id)}/members`, payload);
}

export function respondToInvite(id: string, accept: boolean) {
  return send<SpaceMember>('POST', `/${encodeURIComponent(id)}/members/respond`, { accept });
}

export function updateMemberRole(memberId: string, role: string, confirm?: SpaceConfirmation) {
  return send<SpaceMember>('PATCH', `/members/${encodeURIComponent(memberId)}`, withConfirmation({ role }, confirm));
}

export function removeMember(memberId: string, confirm?: SpaceConfirmation) {
  return send<{ removed: boolean }>(
    'DELETE',
    `/members/${encodeURIComponent(memberId)}`,
    withConfirmation({}, confirm),
  );
}

// ── Ownership transfer (MP4 §10) ─────────────────────────

/** One side of a transfer as the other side is allowed to see them. */
export interface SpaceTransferParty {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
}

/**
 * A transfer offer. `spaceName`/`handle` are the values snapshotted when the offer
 * was made, so a rename mid-offer cannot change what the recipient agreed to.
 */
export interface SpaceOwnershipTransfer {
  id: string;
  spaceId: string;
  status: string;
  message: string | null;
  spaceName: string | null;
  handle: string | null;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  from: SpaceTransferParty | null;
  to: SpaceTransferParty | null;
  state: {
    pending: boolean;
    status: string;
    daysLeft: number;
    hoursLeft: number;
    expired: boolean;
    actionable: boolean;
  };
}

export function fetchSpaceTransfers(id: string) {
  return get<{ pending: SpaceOwnershipTransfer | null; history: SpaceOwnershipTransfer[] }>(
    `/${encodeURIComponent(id)}/transfer`,
  );
}

export function requestSpaceTransfer(
  id: string,
  payload: { username?: string; userId?: string; message?: string },
  confirm?: SpaceConfirmation,
) {
  return send<SpaceOwnershipTransfer>(
    'POST',
    `/${encodeURIComponent(id)}/transfer`,
    withConfirmation({ ...payload }, confirm),
  );
}

/** Withdrawing is the safe direction, so it is never challenged. */
export function cancelSpaceTransfer(id: string) {
  return send<SpaceOwnershipTransfer>('POST', `/${encodeURIComponent(id)}/transfer/cancel`);
}

/**
 * Answers an offer made to the signed-in account.
 *
 * Accepting is challenged; declining is not — refusing a Space you never asked for
 * should never require digging out an authenticator app.
 */
export function respondToSpaceTransfer(transferId: string, accept: boolean, confirm?: SpaceConfirmation) {
  return send<SpaceTransferResponse>(
    'POST',
    `/transfers/${encodeURIComponent(transferId)}/respond`,
    withConfirmation({ accept }, confirm),
  );
}

/**
 * The answer to an offer. `manageUrl` only comes back on acceptance — there is
 * nowhere to send someone who declined.
 */
export interface SpaceTransferResponse {
  accepted: boolean;
  id: string;
  spaceId?: string;
  handle?: string;
  manageUrl?: string;
}

// ── Insights / activity ──────────────────────────────────

export function fetchInsights(id: string, days = 30) {
  return get<any>(`/${encodeURIComponent(id)}/insights${qs({ days })}`);
}

export function fetchActivity(id: string, limit = 30, offset = 0) {
  return get<{ activity: any[] }>(`/${encodeURIComponent(id)}/activity${qs({ limit, offset })}`);
}

// ── Published content (MP3 §35) ──────────────────────────

/** One published post as a visitor gets it — no draft state, no author identity. */
export interface SpacePostPayload {
  id: string;
  content: string | null;
  type: string;
  privacy: string;
  pinned: boolean;
  isFeatured: boolean;
  isSensitive: boolean;
  commentsDisabled: boolean;
  sharingDisabled: boolean;
  hideLikeCount: boolean;
  location: string | null;
  feeling: string | null;
  createdAt: string;
  postMedia: Array<{ id?: string; url: string; type?: string }>;
  /** Legacy JSON media column, still populated for older rows. */
  media: string | null;
  poll: any;
  hashtags: string[];
  myReaction: string | null;
  _count: { likes: number; comments: number };
}

export interface SpacePostsResponse {
  posts: SpacePostPayload[];
  total: number;
  canPost: boolean;
}

/**
 * `kind` splits the two tabs that share one table: a Space reel is a Post with
 * type 'reel'. Omitting it returns both, which is what the Home preview wants.
 */
export function fetchSpacePosts(
  id: string,
  options: { kind?: 'post' | 'reel'; limit?: number; offset?: number } = {},
) {
  const { kind, limit = 10, offset = 0 } = options;
  return get<SpacePostsResponse>(`/${encodeURIComponent(id)}/posts${qs({ kind, limit, offset })}`);
}

export interface SpaceEventPayload {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  category: string | null;
  status: string;
  mode: string | null;
  onlineUrl: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string | null;
  registrationMode: string | null;
  registrationUrl: string | null;
  capacity: number | null;
  visibility: string;
  goingCount: number;
  interestedCount: number;
  myStatus: 'interested' | 'going' | 'not_going' | null;
}

export function fetchSpaceEvents(id: string, past = false) {
  return get<{ canManage: boolean; events: SpaceEventPayload[] }>(
    `/${encodeURIComponent(id)}/events${qs({ past: past ? 'true' : undefined })}`,
  );
}

export function rsvpSpaceEvent(eventId: string, status: 'interested' | 'going' | 'not_going') {
  return send<{ status: string }>('POST', `/events/${encodeURIComponent(eventId)}/rsvp`, { status });
}

// ── Profile-level setting ────────────────────────────────

export function setSpacesVisibility(value: 'everyone' | 'followers' | 'nobody') {
  return send<{ spacesVisibility: string }>('PUT', '/visibility', { spacesVisibility: value });
}

// ── Media upload ─────────────────────────────────────────

/**
 * Uploads a Space image. Goes through the Space media endpoint (not the generic
 * one) so the resulting Media row carries spaceId + uploaderUserId.
 *
 * `privacy: 'private'` keeps the file out of the Space's media listing — what
 * verification evidence needs, since a photo of a registration certificate must
 * never turn up in the public gallery.
 */
export async function uploadSpaceImage(
  spaceId: string,
  file: File,
  options: { privacy?: 'public' | 'private' } = {},
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  if (options.privacy) form.append('privacy', options.privacy);
  const res = await fetch(`/api/spaces/${encodeURIComponent(spaceId)}/media`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new SpaceApiError(body?.error || 'Upload failed', res.status, body);
  const url = body?.url || body?.media?.path;
  if (!url) throw new SpaceApiError('Upload returned no URL', 500);
  return url as string;
}

/**
 * Upload used before a Space exists (the creation wizard). Falls back to the
 * platform media endpoint; the image is re-registered against the Space by the
 * server when the Space is created with that URL.
 */
export async function uploadDraftImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/media/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new SpaceApiError(body?.error || 'Upload failed', res.status, body);
  const url = body?.path || body?.url;
  if (!url) throw new SpaceApiError('Upload returned no URL', 500);
  return url as string;
}

export function fetchSpaceMedia(id: string, type?: 'image' | 'video', limit = 24, offset = 0) {
  return get<{ items: any[]; total: number }>(
    `/${encodeURIComponent(id)}/media${qs({ type, limit, offset })}`,
  );
}


// -- Custom profile / hosted live-content API --------------------------------

export interface SpaceCustomProfile {
  enabled: boolean;
  hostKind: 'GITHUB_PAGES' | 'CUSTOM_SITE';
  hostOrigin: string | null;
  hostPath: string | null;
  corsOrigins: string[];
  publishableKey: string;
  requirePublishableKey: boolean;
  publicApiBase: string;
  snippet: string;
}

export function fetchCustomProfile(id: string): Promise<SpaceCustomProfile> {
  return get<SpaceCustomProfile>(`/${encodeURIComponent(id)}/custom-profile`);
}

export function saveCustomProfile(
  id: string,
  patch: Partial<{
    enabled: boolean;
    hostKind: SpaceCustomProfile['hostKind'];
    hostOrigin: string | null;
    hostPath: string | null;
    corsOrigins: string[];
    requirePublishableKey: boolean;
  }>,
): Promise<SpaceCustomProfile> {
  return send<SpaceCustomProfile>('PUT', `/${encodeURIComponent(id)}/custom-profile`, patch);
}

export function rotateCustomProfileKey(id: string): Promise<SpaceCustomProfile> {
  return send<SpaceCustomProfile>('POST', `/${encodeURIComponent(id)}/custom-profile/rotate-key`);
}
