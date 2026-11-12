import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

/** Shapes returned by /api/developer/* (secret hashes are never sent). */
export interface DeveloperAccount {
  id: string;
  userId: string;
  companyName: string | null;
  website?: string | null;
  description?: string | null;
  status: string;
  createdAt: string;
}

export interface DeveloperMe {
  registered: boolean;
  account: DeveloperAccount | null;
  appsCount: number;
  /** Phase 3 feature flags (absent on older servers; treat missing as enabled). */
  features?: Partial<DeveloperFeatures>;
}

export interface DeveloperFeatures {
  keyRotation: boolean;
  appMembers: boolean;
  tracing: boolean;
  /** Phase 5 flags: default off, only true when the server reports true. */
  changelogSubs: boolean;
  marketplaceV2: boolean;
  aiAssistant: boolean;
  community: boolean;
}

export interface DeveloperApp {
  /** Caller's effective role (list + detail responses). */
  role?: 'owner' | 'admin' | 'developer' | 'billing' | 'support' | 'viewer';
  /** Phase 3 W3: access comes from a per-app member row, not the account team. */
  isAppMember?: boolean;
  id: string;
  developerId: string;
  wevspaceId: string | null;
  name: string;
  logoUrl: string | null;
  category: string | null;
  privacyPolicyUrl: string | null;
  termsUrl: string | null;
  deauthorizeUrl?: string | null;
  dataDeletionUrl?: string | null;
  clientId: string;
  /** JSON array of exact redirect URIs. Read it through `parseRedirectUris`. */
  redirectUris: string | string[];
  status: 'draft' | 'in_review' | 'live' | string;
  mode: 'development' | 'production' | string;
  createdAt: string;
  updatedAt: string;
  /** Only present in the create / rotate-secret responses; lists never include it. */
  clientSecretRaw?: string;
  hasClientSecret?: boolean;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  /** Allowed source IPs / CIDRs. Returned as an array. */
  ipAllowlist?: string[] | string | null;
  /** HMAC request-signing state. The secret itself is never returned. */
  hasSigningSecret?: boolean;
  signingRequired?: boolean;
  /** SHA-256 client-certificate fingerprints accepted for mTLS. */
  clientCertFingerprints?: string[] | string | null;
  mtlsRequired?: boolean;
  isVerified?: boolean;
  trustBadge?: 'verified_app' | 'official_partner' | 'standard';
}

export const APP_CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'social', label: 'Social', hint: 'Sharing, communities, sign-in' },
  { value: 'games', label: 'Games', hint: 'Casual, multiplayer, leaderboards' },
  { value: 'productivity', label: 'Productivity', hint: 'Tools, scheduling, automation' },
  { value: 'business', label: 'Business', hint: 'CRM, commerce, analytics' },
  { value: 'education', label: 'Education', hint: 'Courses, learning, classrooms' },
  { value: 'utilities', label: 'Utilities', hint: 'Integrations and helpers' },
  { value: 'other', label: 'Other', hint: 'Something else' },
];

export function categoryLabel(value: string | null | undefined): string {
  return APP_CATEGORIES.find((c) => c.value === value)?.label || 'Uncategorized';
}

/** Scopes accepted by /api/oauth/authorize (keep in step with oauth.routes.ts). */
export const OAUTH_SCOPES: { scope: string; title: string; description: string; always?: boolean }[] = [
  { scope: 'profile', title: 'See your public profile', description: 'Your name, username and profile photo.', always: true },
  { scope: 'email', title: 'See your email address', description: 'The primary email on your Wevsoft account.' },
  { scope: 'posts.read', title: 'See your posts', description: 'Your published posts, and posts you are allowed to see. Public posts you publish can be sent to the app\'s webhooks.' },
  { scope: 'posts.write', title: 'Publish on your behalf', description: 'Create, update, comment, react and delete posts on your account.' },
  { scope: 'messages.read', title: 'Read WevChat messages', description: 'View direct messages in conversations on your account. Also unlocks WevChat webhook events (message.received, message.read, reactions, edits, and more).' },
  { scope: 'messages.write', title: 'Send WevChat messages', description: 'Send direct messages from your account to people you chat with via POST /api/developer/messages.' },
  { scope: 'conversations.read', title: 'List WevChat conversations', description: 'See your personal WevChat inbox — conversation list, peers, and last-message previews.' },
  { scope: 'stories.read', title: 'See your active stories', description: 'View active 24-hour stories published on your profile.' },
  { scope: 'stories.write', title: 'Post stories', description: 'Share stories to your profile on your behalf.' },
  { scope: 'media.upload', title: 'Upload media', description: 'Upload photos, videos and files to your Wevsoft storage.' },
  { scope: 'reels.read', title: 'See your reels', description: 'View your published short-form reels, views, comments, and engagement analytics.' },
  { scope: 'reels.write', title: 'Publish and manage reels', description: 'Create reels, comment, like and delete reels on your behalf.' },
  { scope: 'groups.read', title: 'View groups & communities', description: 'Browse public groups, view groups you belong to, members, and group feeds.' },
  { scope: 'groups.write', title: 'Manage groups & post', description: 'Create groups, publish posts inside groups, and join or leave communities.' },
  { scope: 'marketplace.read', title: 'Browse the marketplace', description: 'Browse public product listings, categories, your seller profile, and orders you are part of.' },
  { scope: 'marketplace.write', title: 'Manage marketplace listings & orders', description: 'Create, edit and remove your product listings, and advance fulfilment status on orders you sell.' },
  { scope: 'search.read', title: 'Search Wevsoft platform', description: 'Search across public users, posts, reels, groups, and trending hashtags.' },
  { scope: 'insights.read', title: 'View account & post insights', description: 'Access account growth, engagement rates, reach metrics, and audience demographics.' },
  { scope: 'notifications.read', title: 'View sent notifications', description: 'Inspect notifications dispatched by this application.' },
  { scope: 'notifications.write', title: 'Send notifications to users', description: 'Send direct in-app notifications and alerts to consenting users.' },
  { scope: 'relationships.write', title: 'Follow and unfollow users', description: 'Follow or unfollow creators, pages, and users on your behalf.' },
  { scope: 'events.read', title: 'View events', description: 'Browse public events and view the events you organize, with attendee counts and your RSVP.' },
  { scope: 'events.write', title: 'Organize events & RSVP', description: 'Create, edit and remove events on your behalf, and answer RSVPs (going / interested / not going).' },
  { scope: 'events.subscribe', title: 'Subscribe to real-time events', description: 'Listen to live Server-Sent Events (SSE) and real-time streaming updates.' },
  { scope: 'livestream.read', title: 'View live streams', description: 'Discover live and scheduled streams, read the live chat, and inspect your own audience telemetry.' },
  { scope: 'livestream.write', title: 'Broadcast live', description: 'Schedule, start and end live streams on your behalf, and post into the live chat.' },
  { scope: 'ai.embeddings', title: 'Generate vector embeddings', description: 'Convert text into dense semantic vector representations for search and AI indexing.' },
  { scope: 'ai.moderation', title: 'Content moderation & safety', description: 'Scan text for toxicity, hate speech, harassment, and policy compliance.' },
  { scope: 'ai.translate', title: 'Multilingual AI translation', description: 'Translate text across languages with contextual accuracy and preservation.' },
  { scope: 'ai.generate', title: 'Generate AI imagery', description: 'Create and edit visual assets from natural language descriptions.' },
  { scope: 'openid', title: 'Sign you in', description: 'Let the app verify who you are with a signed OpenID Connect identity token.' },
  { scope: 'ads.read', title: 'View ads & campaign results', description: 'Read advertiser accounts, campaigns, ads, analytics and conversions for Spaces you manage.' },
  { scope: 'ads.write', title: 'Manage ad campaigns', description: 'Create and edit draft campaigns and ads, submit them for review, pause or cancel them, and send server-side conversion events. It can never activate a campaign or move money.' },
  { scope: 'spaces.read', title: 'View Spaces & Pages', description: 'Read public and operational profiles, metrics, and offerings of Spaces you manage.' },
  { scope: 'spaces.write', title: 'Manage Spaces', description: 'Update Space settings, profile information, and branding.' },
  { scope: 'spaces.posts.write', title: 'Post on behalf of Spaces', description: 'Publish and manage posts, stories, and feed updates as the Space.' },
  { scope: 'spaces.inbox', title: 'Manage Space inbox & customer messages', description: 'Read and reply to customer inquiries in Space inbox threads.' },
  { scope: 'spaces.events', title: 'Manage Space-hosted events', description: 'Create and manage events hosted by the Space, ticket caps, and RSVPs.' },
  { scope: 'spaces.manage', title: 'Full Space automation & app installation', description: 'Install apps into the Space, manage team roles, and administrative workflows.' },
];

export const DEV_KEYS = {
  me: ['developerMe'] as const,
  apps: ['developerApps'] as const,
  app: (id: string | undefined) => ['developerApp', id] as const,
};

export function parseRedirectUris(app: Pick<DeveloperApp, 'redirectUris'> | null | undefined): string[] {
  const raw = app?.redirectUris;
  // The API returns this as a real array (safeApp normalizes the stored JSON
  // string); tolerate the legacy string form so an older cached payload from
  // react-query still renders.
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Mirrors the backend rule: https anywhere, http only on localhost, or a native app scheme. */
export function redirectUriError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter a URI';
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return 'Must be an absolute URI, e.g. https://example.com/callback';
  }
  if (u.hash) return 'Redirect URIs cannot contain a #fragment';
  if (u.protocol === 'https:') return null;
  if (u.protocol === 'http:') {
    return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ? null : 'Use https (http is only allowed for localhost)';
  }
  if (['javascript:', 'data:', 'file:'].includes(u.protocol)) return 'This scheme is not allowed';
  return null;
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function useDeveloperMe() {
  return useQuery<DeveloperMe>({
    queryKey: DEV_KEYS.me,
    queryFn: async () => (await api.get('/api/developer/me')).data,
    staleTime: 30_000,
  });
}

/** Server feature flags from /developer/me; anything not reported counts as on. */
export function useDeveloperFeatures(): DeveloperFeatures {
  const me = useDeveloperMe();
  const f = me.data?.features || {};
  return {
    keyRotation: f.keyRotation !== false,
    appMembers: f.appMembers !== false,
    tracing: f.tracing !== false,
    changelogSubs: f.changelogSubs === true,
    marketplaceV2: f.marketplaceV2 === true,
    aiAssistant: f.aiAssistant === true,
    community: f.community === true,
  };
}

export function useDeveloperApps(enabled = true) {
  return useQuery<DeveloperApp[]>({
    queryKey: DEV_KEYS.apps,
    queryFn: async () => (await api.get('/api/developer/apps')).data,
    enabled,
  });
}

export function appOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'https://wevsoft.com';
}

export function relativeFromNow(value: string | null | undefined): string {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return '';
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const DOCS_READ_KEY = 'wev-dev-docs-read';

export interface DeveloperTeamMember {
  id: string;
  developerId: string;
  userId: string;
  role: 'owner' | 'admin' | 'developer' | 'billing' | 'support' | 'viewer';
  createdAt: string;
  user: {
    id: string;
    username: string | null;
    name: string | null;
    avatar?: string | null;
  };
}

export interface ReviewChecklistCriteria {
  id: string;
  label: string;
  description: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
}

export interface AppReviewChecklist {
  isReady: boolean;
  scorePercent: number;
  criteria: ReviewChecklistCriteria[];
  blockers: string[];
}

export async function getTeamRolesMatrix() {
  return (await api.get('/api/developer/team/roles')).data;
}

export async function updateTeamMemberRole(memberId: string, role: string) {
  return (await api.put(`/api/developer/team/${memberId}/role`, { role })).data;
}

export async function transferAccountOwnership(targetUserId: string, confirmation = 'TRANSFER', developerId?: string) {
  return (await api.post('/api/developer/team/transfer-ownership', { targetUserId, confirmation, developerId })).data;
}

export async function getAppReviewChecklist(appId: string): Promise<{ success: boolean; checklist: AppReviewChecklist }> {
  return (await api.get(`/api/developer/apps/${appId}/review-checklist`)).data;
}

export interface ServiceHealth {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'maintenance';
  latencyMs?: number;
  activeConnections?: number;
  dlqSize?: number;
  description: string;
}

export interface PlatformIncident {
  id: string;
  title: string;
  impact: 'none' | 'minor' | 'major';
  status: 'resolved' | 'monitoring' | 'investigating';
  createdAt: string;
  resolvedAt?: string;
  description: string;
}

export interface PlatformStatus {
  status: 'operational' | 'degraded' | 'maintenance';
  timestamp: string;
  uptime30d: number;
  environment: string;
  services: ServiceHealth[];
  dailyUptime: Array<{ date: string; uptime: number; incidents: number }>;
  incidents: PlatformIncident[];
}

export interface RateLimitsInfo {
  appId: string;
  appName: string;
  tier: string;
  perMinuteLimit: number;
  remaining: number;
  resetEpoch: number;
  resetSeconds: number;
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyRemaining: number;
}

export async function getPlatformStatus(): Promise<PlatformStatus> {
  return (await api.get('/api/developer/status')).data;
}

export async function sendDeveloperPing(): Promise<{
  ok: boolean;
  message: string;
  timestamp: string;
  appId: string | null;
  authType: string;
  rateLimit?: any;
}> {
  return (await api.get('/api/developer/ping')).data;
}

export async function getAppRateLimits(appId?: string): Promise<RateLimitsInfo> {
  const url = appId ? `/api/developer/rate-limits?appId=${encodeURIComponent(appId)}` : '/api/developer/rate-limits';
  return (await api.get(url)).data;
}

export interface SpaceAppInstall {
  id: string;
  spaceId: string;
  appId: string;
  status: string;
  scopes: string[];
  installedAt: string;
  updatedAt: string;
  app?: {
    id: string;
    name: string;
    logoUrl: string | null;
    clientId: string;
    status: string;
    ownerType: string;
    wevspaceId: string | null;
  };
  installer?: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
}

export interface SpaceTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string;
  kind: string;
  space: { id: string; name: string; handle: string };
  app: { id: string; name: string; clientId: string };
  scopes: string[];
}

export function useSpaceInstalledApps(spaceId: string | null | undefined) {
  return useQuery({
    queryKey: ['developer', 'spaces', spaceId, 'apps'],
    queryFn: async (): Promise<SpaceAppInstall[]> => {
      if (!spaceId) return [];
      const res = await api.get(`/api/developer/spaces/${encodeURIComponent(spaceId)}/apps`);
      return res.data?.apps || [];
    },
    enabled: Boolean(spaceId),
  });
}

export async function installSpaceApp(spaceId: string, appId: string, scopes?: string[]) {
  const res = await api.post(`/api/developer/spaces/${encodeURIComponent(spaceId)}/apps/${encodeURIComponent(appId)}/install`, {
    scopes,
  });
  return res.data;
}

export async function uninstallSpaceApp(spaceId: string, appId: string) {
  const res = await api.delete(`/api/developer/spaces/${encodeURIComponent(spaceId)}/apps/${encodeURIComponent(appId)}/install`);
  return res.data;
}

export async function issueSpaceToken(spaceId: string, options?: { appId?: string; scopes?: string[]; expiresIn?: number }): Promise<SpaceTokenResponse> {
  const res = await api.post(`/api/developer/spaces/${encodeURIComponent(spaceId)}/token`, options || {});
  return res.data;
}


