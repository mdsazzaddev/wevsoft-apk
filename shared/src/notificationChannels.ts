/**
 * Facebook-style notification channel preferences (Settings > Notifications).
 * Shared by frontend UI and backend delivery gating.
 */

export type NotifChannelKey = 'push' | 'email' | 'sms' | 'inApp';

export type NotifCategoryChannels = Partial<Record<NotifChannelKey, boolean>>;

export type NotifDeliveryPrefs = {
  /** Browser / web-push master (also requires OS/browser permission). */
  browser: boolean;
  email: boolean;
  /** Suggested | Important | Off-style frequency label when email is on. */
  emailFrequency: 'Suggested' | 'Important only' | 'All';
  sms: boolean;
};

export type NotifChannelsPrefs = {
  /** Master: Allow notifications on Wevsoft */
  master: boolean;
  delivery: NotifDeliveryPrefs;
  categories: Record<string, NotifCategoryChannels>;
};

export type NotifCategoryDef = {
  /** Stable category key used in prefs.categories and type mapping. */
  id: string;
  /** Consumer settings option id (preferences blob key). */
  optionId: string;
  name: string;
  description: string;
  /** Lucide-ish icon name for the UI. */
  icon: string;
  /** Channels shown as switches. Voting is in-app only. */
  channels: NotifChannelKey[];
  inAppOnly?: boolean;
};

export const NOTIF_CHANNEL_CATEGORIES: NotifCategoryDef[] = [
  { id: 'comments', optionId: 'notif_cat_comments', name: 'Comments', description: 'Comments on your posts and replies to your comments', icon: 'MessageCircle', channels: ['push', 'email', 'sms'] },
  { id: 'tags', optionId: 'notif_cat_tags', name: 'Tags', description: 'When someone tags you in a post, photo, or comment', icon: 'Tag', channels: ['push', 'email', 'sms'] },
  { id: 'reminders', optionId: 'notif_cat_reminders', name: 'Reminders', description: 'Reminders about posts, events, and unfinished actions', icon: 'Bell', channels: ['push', 'email', 'sms'] },
  { id: 'more_activity', optionId: 'notif_cat_more_activity', name: 'More activity about you', description: 'Likes, reactions, shares, and other activity on your content', icon: 'Activity', channels: ['push', 'email', 'sms'] },
  { id: 'updates_friends', optionId: 'notif_cat_updates_friends', name: 'Updates from friends', description: 'Posts, stories, and status updates from people you are friends with', icon: 'Users', channels: ['push', 'email', 'sms'] },
  { id: 'friend_requests', optionId: 'notif_cat_friend_requests', name: 'Friend requests', description: 'New friend requests and accepted requests', icon: 'UserPlus', channels: ['push', 'email', 'sms'] },
  { id: 'people_you_may_know', optionId: 'notif_cat_pymk', name: 'People you may know', description: 'Suggestions for people you may know', icon: 'UserRoundSearch', channels: ['push', 'email', 'sms'] },
  { id: 'birthdays', optionId: 'notif_cat_birthdays', name: 'Birthdays', description: 'Birthday reminders for friends', icon: 'Cake', channels: ['push', 'email', 'sms'] },
  { id: 'groups', optionId: 'notif_cat_groups', name: 'Groups', description: 'Activity in groups you belong to', icon: 'UsersRound', channels: ['push', 'email', 'sms'] },
  { id: 'reels', optionId: 'notif_cat_reels', name: 'Reels', description: 'Reels recommendations and activity on your Reels', icon: 'Clapperboard', channels: ['push', 'email', 'sms'] },
  { id: 'events', optionId: 'notif_cat_events', name: 'Events', description: 'Invites, reminders, and updates for events', icon: 'Calendar', channels: ['push', 'email', 'sms'] },
  { id: 'pages_manage', optionId: 'notif_cat_pages_manage', name: 'Pages you manage', description: 'Activity on Pages you manage', icon: 'Flag', channels: ['push', 'email', 'sms'] },
  { id: 'pages_follow', optionId: 'notif_cat_pages_follow', name: 'Pages you follow', description: 'Updates from Pages you follow', icon: 'Bookmark', channels: ['push', 'email', 'sms'] },
  { id: 'marketplace', optionId: 'notif_cat_marketplace', name: 'Marketplace', description: 'Orders, messages, and listings on WevMall', icon: 'Store', channels: ['push', 'email', 'sms'] },
  { id: 'fundraisers', optionId: 'notif_cat_fundraisers', name: 'Fundraisers and crises', description: 'Fundraisers you support and crisis alerts', icon: 'HeartHandshake', channels: ['push', 'email', 'sms'] },
  { id: 'voting', optionId: 'notif_cat_voting', name: 'Voting reminders', description: 'In-app reminders about voting and civic moments', icon: 'Vote', channels: ['inApp'], inAppOnly: true },
  { id: 'messaging', optionId: 'notif_cat_messaging', name: 'Messaging', description: 'Message requests and WevChat alerts', icon: 'MessageSquare', channels: ['push', 'email', 'sms'] },
  { id: 'memories', optionId: 'notif_cat_memories', name: 'Memories', description: 'On-this-day memories and anniversary reminders', icon: 'Images', channels: ['push', 'email', 'sms'] },
  { id: 'other', optionId: 'notif_cat_other', name: 'Other notifications', description: 'Product updates and notifications that do not fit another category', icon: 'BellRing', channels: ['push', 'email', 'sms'] },
];

export const NOTIF_CATEGORY_BY_ID = Object.fromEntries(
  NOTIF_CHANNEL_CATEGORIES.map((c) => [c.id, c]),
) as Record<string, NotifCategoryDef>;

export const NOTIF_CATEGORY_BY_OPTION_ID = Object.fromEntries(
  NOTIF_CHANNEL_CATEGORIES.map((c) => [c.optionId, c]),
) as Record<string, NotifCategoryDef>;

/** Maps notify.service NotifyType → category id. Unmapped types use `other`. */
export const NOTIFY_TYPE_TO_CATEGORY: Record<string, string> = {
  comment: 'comments',
  reply: 'comments',
  comment_reaction: 'more_activity',
  post_reaction: 'more_activity',
  like: 'more_activity',
  mention: 'tags',
  mention_review: 'tags',
  share: 'more_activity',
  reshare: 'more_activity',
  follow: 'people_you_may_know',
  friend_request: 'friend_requests',
  friend_accept: 'friend_requests',
  story_reply: 'updates_friends',
  story_reaction: 'updates_friends',
  story_share: 'updates_friends',
  birthday: 'birthdays',
  birthday_reminder: 'birthdays',
  group: 'groups',
  group_invite: 'groups',
  group_post: 'groups',
  group_comment: 'groups',
  reel: 'reels',
  reel_reaction: 'reels',
  reel_comment: 'reels',
  event: 'events',
  event_invite: 'events',
  event_reminder: 'events',
  page: 'pages_follow',
  page_update: 'pages_follow',
  page_manage: 'pages_manage',
  marketplace: 'marketplace',
  marketplace_order: 'marketplace',
  marketplace_message: 'marketplace',
  fundraiser: 'fundraisers',
  crisis: 'fundraisers',
  voting: 'voting',
  voting_reminder: 'voting',
  memory: 'memories',
  memories: 'memories',
  reminder: 'reminders',
  direct_message: 'messaging',
  message: 'messaging',
  message_request: 'messaging',
  poll_vote: 'other',
  poll_ended: 'other',
  live: 'other',
  admin_action: 'other',
  moderation: 'other',
  restrict: 'other',
  security_alert: 'other',
  // WevSpace → Pages you manage / Events / Messaging / Other
  space_follow: 'pages_manage',
  space_comment: 'pages_manage',
  space_mention: 'pages_manage',
  space_message: 'messaging',
  space_review: 'pages_manage',
  space_event_rsvp: 'events',
  space_team_invite: 'pages_manage',
  space_team_joined: 'pages_manage',
  space_verification: 'pages_manage',
  space_promotion: 'pages_manage',
  space_milestone: 'pages_manage',
  space_monetization: 'pages_manage',
  space_moderation: 'pages_manage',
};

export const DEFAULT_DELIVERY: NotifDeliveryPrefs = {
  browser: true,
  email: true,
  emailFrequency: 'Suggested',
  /** Social SMS defaults off; security/OTP use the SMS module directly. */
  sms: false,
};

export function defaultCategoryChannels(def: NotifCategoryDef): NotifCategoryChannels {
  const out: NotifCategoryChannels = { inApp: true };
  for (const ch of def.channels) out[ch] = true;
  // Social / product categories: SMS off by default (costly). OTP/security use sendSms directly.
  if ('sms' in out) out.sms = false;
  if (def.inAppOnly) {
    out.push = false;
    out.email = false;
    out.sms = false;
    out.inApp = true;
  }
  return out;
}

export function defaultNotifChannelsPrefs(): NotifChannelsPrefs {
  const categories: Record<string, NotifCategoryChannels> = {};
  for (const def of NOTIF_CHANNEL_CATEGORIES) {
    categories[def.id] = defaultCategoryChannels(def);
  }
  return { master: true, delivery: { ...DEFAULT_DELIVERY }, categories };
}

export function normalizeNotifChannelsPrefs(raw: unknown): NotifChannelsPrefs {
  const base = defaultNotifChannelsPrefs();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const r = raw as Record<string, any>;

  // Prefer nested blob if present
  const nested = r.notif_channels && typeof r.notif_channels === 'object' ? r.notif_channels : r;
  if (typeof nested.master === 'boolean') base.master = nested.master;
  if (nested.delivery && typeof nested.delivery === 'object') {
    if (typeof nested.delivery.browser === 'boolean') base.delivery.browser = nested.delivery.browser;
    if (typeof nested.delivery.email === 'boolean') base.delivery.email = nested.delivery.email;
    if (typeof nested.delivery.sms === 'boolean') base.delivery.sms = nested.delivery.sms;
    const freq = String(nested.delivery.emailFrequency || '');
    if (freq === 'Suggested' || freq === 'Important only' || freq === 'All') {
      base.delivery.emailFrequency = freq;
    }
  }

  // Per-category from nested.categories OR flat option ids on preferences root
  for (const def of NOTIF_CHANNEL_CATEGORIES) {
    const fromNested = nested.categories?.[def.id];
    const fromFlat = r[def.optionId];
    const src = fromNested && typeof fromNested === 'object' ? fromNested
      : fromFlat && typeof fromFlat === 'object' ? fromFlat
      : null;
    if (!src) continue;
    const next = { ...base.categories[def.id] };
    for (const ch of ['push', 'email', 'sms', 'inApp'] as NotifChannelKey[]) {
      if (typeof (src as any)[ch] === 'boolean') next[ch] = (src as any)[ch];
    }
    if (def.inAppOnly) {
      next.push = false;
      next.email = false;
      next.sms = false;
    }
    base.categories[def.id] = next;
  }

  // Legacy flat toggles
  if (typeof r.notif_master === 'boolean') base.master = r.notif_master;
  if (typeof r.notif_delivery_browser === 'boolean') base.delivery.browser = r.notif_delivery_browser;
  if (typeof r.notif_delivery_email === 'boolean') base.delivery.email = r.notif_delivery_email;
  if (typeof r.notif_delivery_sms === 'boolean') base.delivery.sms = r.notif_delivery_sms;
  if (typeof r.notif_push_alerts === 'boolean') base.delivery.browser = r.notif_push_alerts;

  return base;
}

export type NotifDeliveryChannel = 'inApp' | 'push' | 'email' | 'sms';

/**
 * Whether a notification may be delivered on a channel.
 * security_alert always allows inApp (+ push if browser on).
 * Email/SMS gated even when prefs allow — callers must also have a sender configured.
 */
export function canDeliverNotifChannel(
  prefs: NotifChannelsPrefs,
  notifyType: string,
  channel: NotifDeliveryChannel,
): boolean {
  if (notifyType === 'security_alert') {
    if (channel === 'inApp') return true;
    if (channel === 'push') return prefs.delivery.browser !== false && prefs.master !== false;
    return false;
  }
  if (prefs.master === false) return false;

  const catId = NOTIFY_TYPE_TO_CATEGORY[notifyType] || 'other';
  const cat = prefs.categories[catId] || defaultCategoryChannels(NOTIF_CATEGORY_BY_ID[catId] || NOTIF_CHANNEL_CATEGORIES[NOTIF_CHANNEL_CATEGORIES.length - 1]);

  if (channel === 'inApp') return cat.inApp !== false;
  if (channel === 'push') return prefs.delivery.browser !== false && cat.push === true;
  if (channel === 'email') return prefs.delivery.email !== false && cat.email === true;
  if (channel === 'sms') return prefs.delivery.sms !== false && cat.sms === true;
  return false;
}

export function summarizeCategoryChannels(
  def: NotifCategoryDef,
  cat: NotifCategoryChannels | undefined,
  delivery: NotifDeliveryPrefs,
): string {
  if (def.inAppOnly) return 'In app only';
  const c = cat || defaultCategoryChannels(def);
  const parts: string[] = [];
  if (c.push && delivery.browser) parts.push('Push');
  if (c.email && delivery.email) parts.push('Email');
  if (c.sms && delivery.sms) parts.push('SMS');
  if (!parts.length) return 'Off';
  return parts.join(', ');
}

export const CHANNEL_LABELS: Record<NotifChannelKey, string> = {
  push: 'Push',
  email: 'Email',
  sms: 'SMS',
  inApp: 'In app',
};

/** Pref key for the nested blob (also mirrored as flat option ids for SettingsChannelAccordion). */
export const NOTIF_CHANNELS_PREF_KEY = 'notif_channels';
