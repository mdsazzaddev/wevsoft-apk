import { PROFILE_THEMES } from '../lib/profileThemes';
import { ACCENT_THEME_NAMES } from '@wevsoft/shared/accentThemes';
import { CREATOR_HUB_NAME } from '../lib/creatorHub';
import { FONT_SCALE_DEFAULT, FONT_SCALE_NAMES } from '../lib/fontScale';
import {
  NAV_ICON_STYLE_DARK_PREF_KEY,
  NAV_ICON_STYLE_LIGHT_PREF_KEY,
  NAV_ICON_STYLE_OPTION_LABELS,
} from '@wevsoft/shared/nav-icon-style';

const NAV_ICON_STYLE_SETTING_OPTIONS: ConsumerSettingOption[] = [
  {
    id: NAV_ICON_STYLE_LIGHT_PREF_KEY,
    name: 'Navigation icon style (Light mode)',
    description: 'Choose colorful or outline icons when the app is in light mode',
    type: 'select',
    defaultValue: 'Use default',
    options: [...NAV_ICON_STYLE_OPTION_LABELS],
    helpText: 'Colorful A is the illustrated reference-matched set. Colorful B uses official Fluent color icons. Outline is the current monochrome look. Use default follows the platform default (Colorful A unless an admin changes it).',
    relatedIds: [NAV_ICON_STYLE_DARK_PREF_KEY, 'app_theme_mode'],
    searchAliases: ['nav icons', 'sidebar icons', 'colorful icons', 'fluent icons', 'navigation icon style'],
  },
  {
    id: NAV_ICON_STYLE_DARK_PREF_KEY,
    name: 'Navigation icon style (Dark mode)',
    description: 'Choose colorful or outline icons when the app is in dark or OLED mode',
    type: 'select',
    defaultValue: 'Use default',
    options: [...NAV_ICON_STYLE_OPTION_LABELS],
    helpText: 'Colorful A is the illustrated reference-matched set. Colorful B uses official Fluent color icons. Outline is the current monochrome look. Use default follows the platform default (Outline unless an admin changes it).',
    relatedIds: [NAV_ICON_STYLE_LIGHT_PREF_KEY, 'app_theme_mode'],
    searchAliases: ['nav icons', 'sidebar icons', 'colorful icons', 'fluent icons', 'navigation icon style'],
  },
];

/** Single option set for AccountSettings.postPrivacy (composer default audience). */
export const POST_AUDIENCE_OPTIONS = ['Public', 'Friends', 'Followers', 'Close Friends', 'Only Me'];

export interface ConsumerSettingOption {
  id: string;
  name: string;
  description: string;
  type: 'toggle' | 'select' | 'button' | 'slider';
  defaultValue: any;
  options?: string[];
  actionText?: string;
  /** Legacy long-form copy; no longer rendered (one-line description only). */
  helpText?: string;
  group?: string;
  /** Legacy cross-links; no longer rendered. */
  relatedIds?: string[];
  /** Row is a shortcut: opening it jumps to this category instead of a detail view. */
  linkCategoryId?: string;
  /** Row is a shortcut to another setting (single source of truth lives there). */
  linkOptionId?: string;
  /** Hidden on viewports below md. The desktop header toggle itself only applies at md+. */
  desktopOnly?: boolean;
  /** Hidden on desktop (md+). The mobile navbar toggle only applies below md. */
  mobileOnly?: boolean;
  /** Optional Push/Email/SMS-style channel toggles for SettingsChannelAccordion. */
  channels?: { id: string; label: string; description?: string }[];
  /** Feature is not implemented: the row shows this honest note and no control. Stored value is kept untouched. */
  unavailableNote?: string;
  /** Extra search keywords (e.g. transliterations) matched by settings search. */
  searchAliases?: string[];
}

export interface ConsumerSettingCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  options: ConsumerSettingOption[];
}

export const CONSUMER_SETTINGS_CATEGORIES: ConsumerSettingCategory[] = [
  {
    id: 'ai_features',
    name: 'AI Features (BYOK)',
    iconName: 'Sparkles',
    description: 'Configure your own AI providers (Google Gemini, OpenAI, Groq) to unlock post generation, translation, and summaries',
    options: [
      {
        id: 'ai_provider_setup',
        name: 'AI Provider Keys',
        description: 'Set up your API keys for Gemini, OpenAI, or other providers',
        // Rendered by SettingsPage getSpecialPanel → ConsumerAIProviderSettings.
        type: 'button',
        defaultValue: null,
        actionText: 'Manage keys',
        helpText: 'Connect your own AI provider keys to power post generation, translation, and summaries.',
        relatedIds: []
      }
    ]
  },
  {
    id: 'account',
    name: 'Account',
    description: 'Personal info, security credentials, and identity verification',
    iconName: 'User',
    options: [
      {
        id: 'acc_username',
        name: 'Username',
        description: 'Your unique @username for mentions and your profile link',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage username',
        helpText: 'Usernames are unique and case-insensitive. You can change yours once every 30 days.',
        relatedIds: ['acc_identity_verification']
      },
      {
        id: 'acc_identity_verification',
        name: 'Identity verification',
        description: 'Verify your phone and national ID to earn a trusted badge',
        type: 'button',
        defaultValue: '',
        actionText: 'Review verification',
        helpText: 'Verifying your identity protects against impersonation and unlocks community trust features.',
        relatedIds: ['acc_phone_numbers', 'acc_username']
      },
      {
        id: 'acc_email_addresses',
        name: 'Email address',
        description: 'Used for sign-in, security alerts, and account notices',
        type: 'button',
        defaultValue: '',
        actionText: 'Verify or change',
        helpText: 'Changing your email needs a code sent to the new address.',
        relatedIds: ['acc_phone_numbers', 'acc_password_change']
      },
      {
        id: 'acc_phone_numbers',
        name: 'Phone number',
        description: 'Used for SMS codes, two-step verification, and recovery',
        type: 'button',
        defaultValue: '',
        actionText: 'Verify or change',
        helpText: 'Changing your phone needs a code sent to the new number.',
        relatedIds: ['acc_email_addresses', 'sec_two_step']
      },
      {
        id: 'acc_password_change',
        name: 'Password',
        description: 'Change the password you use to sign in',
        type: 'button',
        defaultValue: '',
        actionText: 'Change password',
        helpText: 'Use a strong password that you do not use on any other site.',
        relatedIds: ['sec_two_step', 'sec_login_devices']
      },
      {
        id: 'acc_connected_accounts',
        name: 'Connected accounts',
        description: 'Link Google, Facebook, and other platforms to your profile',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage connections',
        helpText: 'Connected platforms let you sign in quickly. You can disconnect them at any time.',
        relatedIds: ['acc_password_change']
      },
      {
        id: 'acc_security_shortcut',
        name: 'Security & login',
        description: 'Two-step verification, signed-in devices, and recovery contacts',
        type: 'button',
        defaultValue: '',
        actionText: 'Open Security',
        helpText: 'Security tools live in the Privacy & security section.',
        relatedIds: ['sec_two_step', 'sec_login_devices', 'sec_recovery_contacts']
      },
      {
        id: 'acc_passkeys',
        name: 'Passkeys',
        description: 'Sign in with your fingerprint, face or screen lock',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage passkeys',
        helpText: 'Passkeys are phishing-resistant and replace your password on trusted devices.',
        relatedIds: ['acc_password_change', 'acc_security_shortcut']
      },
      {
        id: 'acc_profiles',
        name: 'Profiles',
        description: 'Add and switch between profiles on one login',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage profiles',
        helpText: 'Each profile has its own name, username and followers.',
        relatedIds: ['acc_username']
      },
      {
        id: 'acc_activity_log',
        name: 'Account activity',
        description: 'Sign-ins and changes to your password, contact info and username',
        type: 'button',
        defaultValue: '',
        actionText: 'View activity',
        helpText: 'A timeline of security events on your account.',
        relatedIds: ['acc_password_change', 'sec_login_devices']
      },
      {
        id: 'acc_standing',
        name: 'Account standing',
        description: 'Warnings, restrictions and actions taken on your account',
        type: 'button',
        defaultValue: '',
        actionText: 'View standing',
        helpText: 'Shows real moderation actions on your account and content.',
        relatedIds: ['sup_guidelines', 'sup_help_center']
      },
      {
        id: 'acc_data_download',
        name: 'Download your data',
        description: 'Get a copy of your profile, posts, media list and activity',
        type: 'button',
        defaultValue: '',
        actionText: 'Download',
        helpText: 'Creates a JSON file with your information.',
        relatedIds: ['sec_data_download', 'acc_account_ownership']
      },
      {
        id: 'acc_account_ownership',
        name: 'Pause, deactivate or delete',
        description: 'Take a break, hide your account, or delete it for good',
        type: 'button',
        defaultValue: '',
        actionText: 'Review options',
        helpText: 'Pausing signs you out until a date you choose. Deactivation hides your profile. Deletion is scheduled and can be cancelled before it completes.',
        relatedIds: ['sec_data_download']
      },
      {
        id: 'acc_pause_account',
        name: 'Pause account',
        description: 'Temporarily suspend your own account. Posts and media stay visible.',
        type: 'button',
        defaultValue: '',
        actionText: 'Pause account',
        helpText: 'Self-pause signs you out until the selected date. You can restore a self-pause from the login screen. Admin suspensions cannot be removed by you.',
        relatedIds: ['acc_account_ownership']
      }
    ]
  },
  {
    id: 'privacy_security',
    name: 'Privacy & Security',
    description: 'Activity status, blocked accounts, two-step verification, and login devices',
    iconName: 'Shield',
    options: [
      {
        id: 'sec_privacy_controls',
        name: 'Privacy controls',
        description: 'Manage who can see your profile, posts, and personal details',
        type: 'button',
        defaultValue: '',
        linkOptionId: 'post_default_audience',
        helpText: 'You can customize visibility for individual posts or set a global default for all future content you share.',
        relatedIds: ['sec_activity_status', 'sec_blocked_users']
      },
      {
        id: 'sec_activity_status',
        name: 'Activity status',
        description: 'Control when others see that you are currently online or active',
        type: 'toggle',
        defaultValue: true,
        helpText: 'When turned off, you will not be able to see the online status of your friends and contacts.',
        relatedIds: ['msg_read_receipts', 'sec_privacy_controls']
      },
      {
        id: 'sec_view_activity_privacy',
        name: 'View activity privacy',
        description: 'Control whether your identity can appear in someone else’s post view list',
        type: 'select',
        defaultValue: 'Limited',
        options: ['Public', 'Limited', 'Private'],
        helpText: 'Public may show your name when a post owner allows a viewer list. Limited and Private keep you anonymous in that list. Aggregate view counts are never blocked.',
        relatedIds: ['sec_privacy_controls', 'sec_activity_status']
      },
      {
        id: 'sec_profile_visitors',
        name: 'Profile visit count',
        description: 'Who can see how many people visited your profile',
        type: 'select',
        defaultValue: 'Only me',
        options: ['Only me', 'Friends', 'Everyone'],
        helpText: 'Visitors are never listed by name; this only controls the visit counter.',
        relatedIds: ['sec_privacy_controls', 'sec_view_activity_privacy']
      },
      {
        id: 'sec_email_privacy',
        name: 'Show email on profile',
        description: 'Let people who can see your profile details see your email address',
        type: 'toggle',
        defaultValue: true,
        helpText: 'The audience of each profile field still applies; turning this off hides the email from everyone but you.',
        relatedIds: ['sec_phone_privacy', 'acc_email_addresses']
      },
      {
        id: 'sec_phone_privacy',
        name: 'Show phone number on profile',
        description: 'Let people who can see your profile details see your phone number',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Off by default. Your number is still used for sign-in and security alerts.',
        relatedIds: ['sec_email_privacy', 'acc_phone_numbers']
      },
      {
        id: 'sec_restricted_list',
        name: "Restricted people",
        description: "Keep someone as a friend while limiting what they can do on your posts",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Manage list",
        helpText: "Their comments on your posts appear only to them. They are not notified.",
        relatedIds: ['sec_muted_list','sec_blocked_users'],
      },
      {
        id: 'sec_muted_list',
        name: "Muted people",
        description: "People whose activity no longer notifies you",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Manage list",
        helpText: "Muting stops notifications from someone without unfriending or blocking them.",
        relatedIds: ['sec_restricted_list','sec_blocked_users'],
      },
      {
        id: 'feed_muted_keywords',
        name: "Muted keywords",
        description: "Hide posts in your home feed that contain specific words or phrases",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Manage list",
        helpText: "Filtering happens on the server, so muted posts never reach your feed. Your own posts are never hidden.",
        relatedIds: ['feed_snoozed_accounts','feed_hidden_posts'],
      },
      {
        id: 'feed_snoozed_accounts',
        name: "Snoozed accounts",
        description: "Take a 30-day break from someone's posts in your home feed",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Manage list",
        helpText: "They are not notified. Snoozes end automatically after 30 days.",
        relatedIds: ['feed_muted_keywords','sec_muted_list'],
      },
      {
        id: 'feed_hidden_posts',
        name: "Hidden posts",
        description: "Review posts you hid from your feed and unhide them",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Review",
        relatedIds: ['feed_muted_keywords','feed_snoozed_accounts'],
      },
      {
        id: 'sec_blocked_users',
        name: 'Blocked accounts',
        description: 'Review and manage accounts you have blocked from contacting you',
        type: 'button',
        defaultValue: '3 blocked accounts',
        actionText: 'Manage blocklist',
        helpText: 'Blocked accounts cannot see your profile, send you messages, or comment on your posts.',
        relatedIds: ['sec_privacy_controls', 'msg_message_requests']
      },
      {
        id: 'sec_wevspaces_visibility',
        name: 'WevSpaces on your profile',
        description: 'Choose who can see the list of WevSpaces you own on your personal profile',
        type: 'button',
        defaultValue: 'Everyone',
        actionText: 'Change who can see them',
        helpText: 'This only hides the list on your profile. Each WevSpace stays reachable by its own link and keeps its own visibility settings.',
        relatedIds: ['sec_privacy_controls', 'acc_username']
      },
      {
        id: 'sec_security_checkup',
        name: "Security checkup",
        description: "A quick review of your password, two-step verification, contact info and devices",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Start checkup",
        helpText: "Each item links to the setting that fixes it.",
        relatedIds: ['sec_two_step','sec_login_alerts','sec_recovery_contacts'],
      },
      {
        id: 'sec_recovery_contacts',
        name: "Recovery contacts",
        description: "Friends who can help confirm it is you if you get locked out",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Choose friends",
        helpText: "Choose between 2 and 5 friends.",
        relatedIds: ['sec_security_checkup','sec_two_step'],
      },
      {
        id: 'sec_login_alerts',
        name: 'Alerts for unrecognized sign-ins',
        description: 'Get a notification (and an email, when email delivery is set up) when your account is opened on a new device or browser',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Each sign-in is compared with the devices you have used before.',
        relatedIds: ['sec_login_devices'],
      },
      {
        id: 'sec_login_devices',
        name: 'Where you are logged in',
        description: 'Review active sessions across smartphones, tablets, and computers',
        type: 'button',
        defaultValue: '4 active devices',
        actionText: 'Review devices & sign out',
        helpText: 'If you notice an unfamiliar device or location, you can sign out remotely and reset your password immediately.',
        relatedIds: ['sec_two_step', 'acc_password_change']
      },
      {
        id: 'sec_qr_login',
        name: 'Login with QR',
        description: 'মোবাইল দিয়ে নিরাপদে কম্পিউটারের লগইন অনুমোদন করুন',
        type: 'button',
        defaultValue: 'Secure device pairing',
        actionText: 'QR স্ক্যান করুন',
        helpText: 'QR কোড স্বল্পমেয়াদি, একবার ব্যবহারযোগ্য এবং অনুমোদনের আগে কখনও লগইন সম্পন্ন করে না।',
        relatedIds: ['sec_login_devices', 'sec_two_step']
      },
      {
        id: 'sec_two_step',
        name: 'Two-step verification',
        description: 'Add extra security with authenticator apps or biometric passkeys',
        type: 'select',
        defaultValue: 'Authenticator App Enabled',
        options: ['Authenticator App Enabled', 'Passkey / Biometric Key', 'SMS Code Verification', 'Disabled'],
        helpText: 'Two-step verification requires an approval code whenever someone logs in from an unrecognized device.',
        relatedIds: ['sec_login_devices', 'acc_password_change']
      },
      {
        id: 'sec_activity_log',
        name: "Activity log",
        description: "Everything you posted, commented, reacted to and when you signed in",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Open log",
        helpText: "Only you can see your activity log.",
        relatedIds: ['sec_trash','sec_login_devices'],
      },
      {
        id: 'sec_trash',
        name: "Trash",
        description: "Deleted posts stay here for 30 days before they are erased",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Open trash",
        helpText: "Restoring brings a post back with its original audience, comments and reactions.",
        relatedIds: ['sec_activity_log'],
      },
      {
        id: 'sec_apps_websites',
        name: "Apps and websites",
        description: "Apps you signed in to with your account, and what they can access",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Review apps",
        helpText: "Removing an app signs it out of your account straight away.",
        relatedIds: ['sec_security_checkup'],
      },
      {
        id: 'sec_legacy_contact',
        name: "Legacy contact & memorialization",
        description: "Choose who looks after your profile later, or ask to memorialize an account",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Manage",
        helpText: "Memorialization requests are reviewed by our team before anything changes.",
        relatedIds: ['sec_recovery_contacts'],
      },
      {
        id: 'sec_limit_past_posts',
        name: "Limit past posts",
        description: "Change all your earlier public posts to Friends in one step",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Review",
        helpText: "You can still make a single post public again by editing its audience.",
        relatedIds: ['post_default_audience'],
      },
      {
        id: 'sec_ad_preferences',
        name: "Ad preferences",
        description: "Ads you hid or marked as not relevant",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Manage",
        helpText: "Hide an ad from its menu in the feed; it shows up here.",
        relatedIds: [],
      },
      {
        id: 'sec_find_by_email',
        name: "Find me by email",
        description: "Let people who already know your email address find your profile in search",
        type: 'toggle',
        defaultValue: false,
        helpText: "Only an exact, full email address matches. Off by default.",
        relatedIds: ['sec_find_by_phone','sec_email_privacy'],
      },
      {
        id: 'sec_find_by_phone',
        name: "Find me by phone number",
        description: "Let people who already know your number find your profile (search + Contact Discovery)",
        type: 'toggle',
        defaultValue: false,
        helpText: "Requires a verified phone. Used by people search and Friends → Find from contacts. Off by default.",
        relatedIds: ['sec_find_by_email','sec_phone_privacy','fri_find_from_contacts'],
      },
      {
        id: 'loc_post_location',
        name: "Location on posts",
        description: "Allow a place to be attached to the posts you create",
        type: 'toggle',
        defaultValue: true,
        helpText: "When off, any location added to a new personal post is dropped before it is saved.",
        relatedIds: ['post_default_audience'],
      },
      {
        id: 'sec_data_download',
        name: 'Download your information',
        description: 'Request a secure export copy of your posts, media, and messages',
        type: 'button',
        defaultValue: 'Export in JSON or HTML',
        actionText: 'Request data archive',
        helpText: 'We will prepare a ZIP archive containing your profile history, shared photos, and account logs.',
        relatedIds: ['acc_account_ownership', 'sec_privacy_controls']
      },
      {
        id: 'sec_app_permissions',
        name: 'Device permissions',
        description: 'Manage camera, microphone, location, and photo gallery access',
        type: 'select',
        defaultValue: 'While using app',
        options: ['While using app', 'Always allow', 'Ask every time', 'Never allow'],
        helpText: 'You can adjust what hardware features the application can access when creating stories or joining voice calls.',
        relatedIds: ['story_camera_access', 'msg_voice_calls']
      },
      {
        id: 'sec_safe_browsing',
        name: 'Safe link protection',
        description: 'Protect against suspicious links, phishing, and external malware',
        type: 'toggle',
        defaultValue: true,
        helpText: 'External websites are checked against our real-time reputation database before opening.',
        relatedIds: ['sec_privacy_controls', 'acc_password_change']
      },
      {
        id: 'sec_search_indexing',
        name: 'Search engine visibility',
        description: 'Allow search engines outside the platform to link to your profile',
        type: 'toggle',
        defaultValue: true,
        helpText: 'When off, your profile page tells search engines not to index it (robots noindex). Already-indexed pages drop out as engines recrawl.',
        relatedIds: ['sec_privacy_controls', 'acc_username']
      },
      {
        id: 'sec_trusted_devices',
        name: 'Recognized devices',
        description: 'Manage trusted phones and laptops that bypass verification challenges',
        type: 'button',
        defaultValue: '2 trusted devices',
        actionText: 'Manage recognized devices',
        helpText: 'Devices you mark as trusted will not ask for a two-step code on subsequent sign-ins.',
        relatedIds: ['sec_two_step', 'sec_login_devices']
      }
    ]
  },
  {
    id: 'posts_content',
    name: 'Posts & Content',
    description: 'Audience, comments, mentions, sharing, post defaults, create tools, your posts, insights and media',
    iconName: 'FileText',
    options: [
      {
        id: 'post_default_audience',
        group: 'Audience',
        name: 'Default post audience',
        description: 'Choose who can see new posts you create by default',
        type: 'select',
        defaultValue: 'Public',
        options: POST_AUDIENCE_OPTIONS,
        helpText: 'You can always change the visibility for any individual post before or after publishing.',
        relatedIds: ['post_who_can_tag', 'sec_privacy_controls']
      },
      {
        id: 'post_limit_past_posts',
        group: 'Audience',
        name: 'Limit past posts',
        description: 'Change all your earlier public posts to Friends in one step',
        type: 'button',
        defaultValue: '',
        actionText: 'Review',
        helpText: 'You can still make a single post public again by editing its audience.',
        relatedIds: ['post_default_audience', 'sec_limit_past_posts']
      },
      {
        id: 'post_close_friends',
        group: 'Audience',
        name: 'Close friends list',
        description: 'People who see Close Friends posts and private stories',
        type: 'button',
        defaultValue: '',
        actionText: 'Edit list',
        linkOptionId: 'story_close_friends',
        helpText: 'The same list is used for Close Friends post audience and story audience.',
        relatedIds: ['post_default_audience', 'story_view_privacy']
      },
      {
        id: 'post_comment_privacy',
        group: 'Comments & replies',
        name: 'Who can comment',
        description: 'Who can comment on your posts and reels',
        type: 'select',
        defaultValue: 'Everyone',
        options: ['Everyone', 'Friends', 'Followers', 'No one']
      },
      {
        id: 'post_default_reply_audience',
        group: 'Comments & replies',
        name: 'Default reply control',
        description: 'Who can reply to new posts; you can change it per post in the composer',
        type: 'select',
        defaultValue: 'Everyone',
        options: ['Everyone', 'Followers', 'Friends', 'People you mention', 'No one'],
        helpText: 'Applies to new posts only. Who can comment above still applies to every post.'
      },
      {
        id: 'post_limit_interactions',
        group: 'Comments & replies',
        name: 'Limit interactions',
        description: 'Temporarily stop new accounts and non-followers from commenting or mentioning you',
        type: 'select',
        defaultValue: 'Off',
        options: ['Off', '24 hours', '7 days'],
        helpText: 'Turns itself off when the time runs out. Friends and followers are not affected.'
      },
      {
        id: 'cmt_hidden_words',
        group: 'Comments & replies',
        name: "Hidden words",
        description: "Hide new comments on your posts that contain words you choose",
        type: 'button',
        defaultValue: "Manage",
        actionText: "Edit words",
        helpText: "Comments that are already posted are not changed.",
        relatedIds: ['sec_restricted_list', 'post_comment_moderation_assist'],
      },
      {
        id: 'post_comment_moderation_assist',
        group: 'Comments & replies',
        name: 'Comment filters',
        description: 'Auto-hide spammy comments — links, new accounts, keywords and more',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage filters',
        helpText: 'Same Moderation Assist rules as Creator Hub Community. Hidden words still apply separately.',
        relatedIds: ['cmt_hidden_words']
      },
      {
        id: 'post_mention_privacy',
        group: 'Tags & mentions',
        name: 'Who can mention you',
        description: 'Who can @mention you in posts and comments',
        type: 'select',
        defaultValue: 'Everyone',
        options: ['Everyone', 'People you follow', 'No one']
      },
      {
        id: 'post_who_can_tag',
        group: 'Tags & mentions',
        name: 'Who can tag you',
        description: 'Choose who can tag you, or review tags before they appear on your profile',
        type: 'select',
        options: ['Everyone', 'Friends', 'No one', 'Approve first'],
        defaultValue: 'Everyone',
        helpText: 'Approve first sends new tags and @mentions to your review queue. No one blocks new tags.',
        relatedIds: ['post_default_audience', 'sec_privacy_controls']
      },
      {
        id: 'post_mention_reviews',
        group: 'Tags & mentions',
        name: 'Review tags & mentions',
        description: 'Approve or decline pending tags and @mentions on your content',
        type: 'button',
        defaultValue: '',
        actionText: `Open in ${CREATOR_HUB_NAME}`,
        helpText: 'Opens Creator Hub Mentions so you can clear the approval queue.',
        relatedIds: ['post_who_can_tag', 'post_mention_privacy']
      },
      {
        id: 'post_share_controls',
        group: 'Sharing & reuse',
        name: 'Sharing permissions',
        description: 'Allow friends to share your posts to their own stories or feeds',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Turning this off prevents others from reposting or quoting your content outside your chosen audience.',
        relatedIds: ['story_sharing_rules', 'post_default_audience']
      },
      {
        id: 'post_crosspost_link',
        group: 'Sharing & reuse',
        name: 'Cross-posting',
        description: 'Share new posts to linked platforms',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage connections',
        linkOptionId: 'acc_connected_accounts'
      },
      {
        id: 'post_default_allow_downloads',
        group: 'Post defaults',
        name: 'Allow downloads',
        description: 'New posts start with downloads allowed',
        type: 'toggle',
        defaultValue: true
      },
      {
        id: 'post_default_allow_remix',
        group: 'Post defaults',
        name: 'Allow remix and duets',
        description: 'New posts start with remix and duets allowed',
        type: 'toggle',
        defaultValue: true
      },
      {
        id: 'post_default_hide_like_count',
        group: 'Post defaults',
        name: 'Hide like count',
        description: 'New posts hide their like count from others',
        type: 'toggle',
        defaultValue: false
      },
      {
        id: 'post_default_sensitive_warning',
        group: 'Post defaults',
        name: 'Sensitive content warning',
        description: 'New posts start with a sensitive content warning on',
        type: 'toggle',
        defaultValue: false
      },
      {
        id: 'post_default_ai_label',
        group: 'Post defaults',
        name: 'AI-generated label',
        description: 'New posts start labelled as AI-generated',
        type: 'toggle',
        defaultValue: false
      },
      {
        id: 'post_default_paid_partnership',
        group: 'Post defaults',
        name: 'Paid partnership label',
        description: 'New posts start with the Paid partnership label on',
        type: 'toggle',
        defaultValue: false
      },
      {
        id: 'post_default_link_preview',
        group: 'Post defaults',
        name: 'Link previews',
        description: 'Show a preview card when your post includes a link',
        type: 'toggle',
        defaultValue: true
      },
      {
        id: 'post_coauthor_invites',
        group: 'Post defaults',
        name: 'Co-author invites',
        description: 'Who can invite you to co-author a post or reel',
        type: 'select',
        defaultValue: 'Everyone',
        options: ['Everyone', 'People you follow', 'No one']
      },
      {
        id: 'post_auto_alt_text',
        group: 'Post defaults',
        name: 'Automatic alt text',
        description: 'Generate alt text for photos with AI when you leave it blank (needs an AI provider)',
        type: 'toggle',
        defaultValue: true
      },
      {
        id: 'post_templates',
        group: 'Create tools',
        name: 'Post templates',
        description: 'Save text you post often and insert it from the composer',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage templates'
      },
      {
        id: 'post_hashtag_sets',
        group: 'Create tools',
        name: 'Saved hashtag sets',
        description: 'Groups of hashtags you can add to a post in one tap',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage hashtag sets'
      },
      {
        id: 'post_browse_posts',
        group: 'Your posts',
        name: 'Published posts',
        description: 'Open your profile timeline of published posts',
        type: 'button',
        defaultValue: '',
        actionText: 'Open profile'
      },
      {
        id: 'post_browse_reels',
        group: 'Your posts',
        name: 'Your Reels & videos',
        description: 'Browse and manage Reels in Creator Hub library',
        type: 'button',
        defaultValue: '',
        actionText: 'Open library'
      },
      {
        id: 'post_browse_stories',
        group: 'Your posts',
        name: 'Story Studio',
        description: 'Create stories or manage story settings',
        type: 'button',
        defaultValue: '',
        actionText: 'Open Story Studio',
        relatedIds: ['story_view_privacy', 'story_archive_auto']
      },
      {
        id: 'post_drafts_manager',
        group: 'Your posts',
        name: 'Saved drafts',
        description: 'Open, publish or delete unfinished posts',
        type: 'button',
        defaultValue: '',
        actionText: 'Review saved drafts',
        helpText: 'Drafts are saved securely to your account so you can continue writing from any device.',
        relatedIds: ['post_archive_vault', 'post_default_audience']
      },
      {
        id: 'post_scheduled_posts',
        group: 'Your posts',
        name: 'Scheduled posts',
        description: 'Reschedule or cancel posts waiting to go live',
        type: 'button',
        defaultValue: '',
        actionText: 'View scheduled posts'
      },
      {
        id: 'post_archive_vault',
        group: 'Your posts',
        name: 'Timeline archive',
        description: 'Posts you archived; unarchive to show them again',
        type: 'button',
        defaultValue: '',
        actionText: 'Open post archive',
        helpText: 'Archived posts are only visible to you and can be restored to your timeline at any time.',
        relatedIds: ['post_drafts_manager', 'sec_privacy_controls']
      },
      {
        id: 'post_edit_history',
        group: 'Your posts',
        name: 'Edit history',
        description: 'See text and audience changes to your posts and restore an earlier version',
        type: 'button',
        defaultValue: '',
        actionText: 'View edit history'
      },
      {
        id: 'post_bulk_manage',
        group: 'Your posts',
        name: 'Manage posts in bulk',
        description: 'Select many posts to archive, move to Trash or change audience',
        type: 'button',
        defaultValue: '',
        actionText: 'Manage posts'
      },
      {
        id: 'post_content_calendar',
        group: 'Your posts',
        name: 'Content calendar',
        description: 'See published and scheduled posts by day',
        type: 'button',
        defaultValue: '',
        actionText: 'Open calendar'
      },
      {
        id: 'post_trash',
        group: 'Your posts',
        name: 'Trash',
        description: 'Deleted posts stay here for 30 days before they are erased',
        type: 'button',
        defaultValue: '',
        actionText: 'Open trash',
        helpText: 'Restoring brings a post back with its original audience, comments and reactions.',
        relatedIds: ['post_archive_vault', 'sec_trash']
      },
      {
        id: 'post_insights_30d',
        group: 'Insights & data',
        name: 'Post insights (30 days)',
        description: 'Views, reactions, comments, shares and top posts from the last 30 days',
        type: 'button',
        defaultValue: '',
        actionText: 'View insights'
      },
      {
        id: 'post_export_posts',
        group: 'Insights & data',
        name: 'Export your posts',
        description: 'Download your posts as a ZIP (JSON + CSV)',
        type: 'button',
        defaultValue: '',
        actionText: 'Download ZIP'
      },
      {
        id: 'post_media_link',
        group: 'Media',
        name: 'Media quality & autoplay',
        description: 'Upload quality and video autoplay live in Media settings',
        type: 'button',
        defaultValue: '',
        linkCategoryId: 'media_playback'
      }
    ]
  },
  {
    id: 'stories_media',
    name: 'Stories & Media',
    description: '24-hour story controls, media quality, and gallery permissions',
    iconName: 'Image',
    options: [
      {
        id: 'story_view_privacy',
        name: 'Story audience',
        description: 'Choose who can view your 24-hour stories and highlights',
        type: 'select',
        defaultValue: 'Friends',
        options: ['Friends', 'Followers', 'Public'],
        helpText: 'Stories expire after 24 hours unless you add them to your profile highlights.',
        relatedIds: ['story_close_friends', 'story_sharing_rules']
      },
      {
        id: 'story_close_friends',
        name: 'Close friends list',
        description: 'Select trusted friends for private stories and exclusive updates',
        type: 'button',
        defaultValue: '18 friends selected',
        actionText: 'Edit close friends',
        helpText: 'Friends are never notified when you add or remove them from your Close Friends list.',
        relatedIds: ['story_view_privacy', 'fri_friend_requests']
      },
      {
        id: 'story_archive_auto',
        name: 'Save stories to archive',
        description: 'Automatically save expired stories to your private archive',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Only you can see your story archive, and you can republish any memory as a highlight.',
        relatedIds: ['story_view_privacy', 'post_archive_vault']
      },
      {
        id: 'story_sharing_rules',
        name: 'Allow message sharing',
        description: 'Allow viewers to share your stories as direct messages to others',
        type: 'toggle',
        defaultValue: true,
        helpText: 'When disabled, viewers cannot forward your story clips in private messages.',
        relatedIds: ['story_view_privacy', 'msg_message_requests']
      },
      {
        id: 'story_camera_access',
        name: 'Camera & filter presets',
        description: 'Manage quick camera capture filters and AR studio effects',
        type: 'select',
        defaultValue: 'Smart Auto-Focus',
        options: ['Smart Auto-Focus', 'Cinema Smooth', 'Natural Color Mode'],
        helpText: 'You can customize your favorite camera filters for instant access when recording stories.',
        relatedIds: ['sec_app_permissions', 'media_upload_quality']
      },
      {
        id: 'story_replies_allow',
        name: 'Story replies',
        description: 'Choose who can reply to your stories with messages or emoji reactions',
        type: 'select',
        defaultValue: 'Friends and followers',
        options: ['Friends and followers', 'Friends only', 'Turn off replies'],
        helpText: 'Replies to your story appear directly in your private inbox.',
        relatedIds: ['story_view_privacy', 'msg_message_requests']
      }
    ]
  },
  {
    id: 'messages_chats',
    name: 'Wevchat',
    description: 'Chat requests, read receipts, typing indicator, and voice calls',
    iconName: 'WevChatIcon',
    options: [
      {
        id: 'msg_read_receipts',
        name: 'Read receipts',
        description: 'Show others when you have read their messages',
        type: 'toggle',
        defaultValue: true,
        helpText: 'If you turn off read receipts, you will not be able to see when others read your messages.',
        relatedIds: ['msg_typing_indicator', 'sec_activity_status']
      },
      {
        id: 'msg_typing_indicator',
        name: 'Typing indicators',
        description: 'Let friends know when you are composing a message',
        type: 'toggle',
        defaultValue: true,
        helpText: 'This displays a gentle typing animation in chat threads while you write.',
        relatedIds: ['msg_read_receipts', 'sec_activity_status']
      },
      {
        id: 'msg_message_requests',
        name: 'Message requests',
        description: 'Control who can send you direct messages or group invites',
        type: 'select',
        defaultValue: 'Friends (others go to requests)',
        options: ['Everyone', 'Friends (others go to requests)', 'No one'],
        helpText: 'Enforced by the server: Everyone = anyone can start a chat; Friends = non-friends land in message requests; No one = new direct chats are blocked.',
        relatedIds: ['msg_e2e_encryption', 'sec_privacy_controls']
      },
      {
        id: 'msg_e2e_encryption',
        name: 'Message encryption',
        description: 'End-to-end encryption is not available yet',
        unavailableNote: 'WevChat messages are protected in transit (HTTPS) but are NOT end-to-end encrypted yet, so this choice has no effect and is turned off. For messages that vanish, use Private Chat inside a conversation: private messages are removed for both people when Private Chat is turned off.',
        type: 'select',
        defaultValue: 'Always encrypted',
        options: ['Always encrypted', 'Standard mode', 'Disappearing after 24h'],
        helpText: 'End-to-end encryption is not available yet. This option is shown for transparency only.',
        relatedIds: ['msg_message_requests', 'sec_two_step']
      },
      {
        id: 'msg_translation_language',
        name: 'AI Message Translation',
        description: 'Set your preferred language for incoming message translation',
        type: 'select',
        defaultValue: 'Auto',
        options: ['Auto', 'English', 'Spanish', 'French', 'German', 'Bengali'],
        helpText: 'AI will translate incoming messages into this language when you click Translate. For full AI provider and quality controls, open AI Center → AI & Translation.',
        relatedIds: ['msg_read_receipts', 'msg_e2e_encryption', 'ai_translation_providers']
      },
      {
        id: 'msg_voice_calls',
        name: 'Voice & video calling',
        description: 'Manage call ringtones, noise cancellation, and bandwidth saver',
        type: 'select',
        defaultValue: 'High Quality Audio',
        options: ['High Quality Audio', 'Noise Suppression ON', 'Data Saver Calling'],
        helpText: 'Our smart audio engine filters out background noise during voice and video calls.',
        relatedIds: ['sec_app_permissions', 'app_data_saver']
      },
      {
        id: 'msg_media_auto_download',
        name: 'Media auto-download',
        description: 'Choose when incoming photos and videos save automatically',
        type: 'select',
        defaultValue: 'Wi-Fi Only',
        options: ['Wi-Fi Only', 'Wi-Fi and Cellular', 'Never Auto-Download'],
        helpText: 'Preventing auto-download on cellular networks saves your mobile data plan.',
        relatedIds: ['app_data_saver', 'msg_e2e_encryption']
      },
      {
        id: 'msg_storage',
        name: 'WevChat storage',
        description: 'Choose where WevChat media is stored',
        type: 'button',
        defaultValue: 'WebSoft',
        actionText: 'Manage storage',
        helpText: 'Keep media on WebSoft, use your private Google Drive, or hybrid. Message text always stays on WebSoft.',
        relatedIds: ['msg_media_auto_download', 'msg_e2e_encryption']
      }
    ]
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Choose what you are notified about and where you receive alerts',
    iconName: 'Bell',
    options: [
      // ── What notifications you receive (channel accordions) ──
      { id: 'notif_cat_comments', group: 'What notifications you receive', name: 'Comments', description: 'Comments on your posts and replies to your comments', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_tags', group: 'What notifications you receive', name: 'Tags', description: 'When someone tags you in a post, photo, or comment', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_reminders', group: 'What notifications you receive', name: 'Reminders', description: 'Reminders about posts, events, and unfinished actions', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_more_activity', group: 'What notifications you receive', name: 'More activity about you', description: 'Likes, reactions, shares, and other activity on your content', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_updates_friends', group: 'What notifications you receive', name: 'Updates from friends', description: 'Posts, stories, and status updates from people you are friends with', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_friend_requests', group: 'What notifications you receive', name: 'Friend requests', description: 'New friend requests and accepted requests', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_pymk', group: 'What notifications you receive', name: 'People you may know', description: 'Suggestions for people you may know', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_birthdays', group: 'What notifications you receive', name: 'Birthdays', description: 'Birthday reminders for friends', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_groups', group: 'What notifications you receive', name: 'Groups', description: 'Activity in groups you belong to', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_reels', group: 'What notifications you receive', name: 'Reels', description: 'Reels recommendations and activity on your Reels', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_events', group: 'What notifications you receive', name: 'Events', description: 'Invites, reminders, and updates for events', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_pages_manage', group: 'What notifications you receive', name: 'Pages you manage', description: 'Activity on Pages you manage', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_pages_follow', group: 'What notifications you receive', name: 'Pages you follow', description: 'Updates from Pages you follow', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_marketplace', group: 'What notifications you receive', name: 'Marketplace', description: 'Orders, messages, and listings on WevMall', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_fundraisers', group: 'What notifications you receive', name: 'Fundraisers and crises', description: 'Fundraisers you support and crisis alerts', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_voting', group: 'What notifications you receive', name: 'Voting reminders', description: 'In-app reminders about voting and civic moments', type: 'select', defaultValue: { inApp: true, push: false, email: false, sms: false }, channels: [{ id: 'inApp', label: 'In app' }] },
      { id: 'notif_cat_messaging', group: 'What notifications you receive', name: 'Messaging', description: 'Message requests and WevChat alerts', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_memories', group: 'What notifications you receive', name: 'Memories', description: 'On-this-day memories and anniversary reminders', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      { id: 'notif_cat_other', group: 'What notifications you receive', name: 'Other notifications', description: 'Product updates and notifications that do not fit another category', type: 'select', defaultValue: { push: true, email: true, sms: false, inApp: true }, channels: [{ id: 'push', label: 'Push' }, { id: 'email', label: 'Email' }, { id: 'sms', label: 'SMS' }] },
      // ── Where you receive notifications ──
      { id: 'notif_master', group: 'Where you receive notifications', name: 'Allow notifications on Wevsoft', description: 'Master switch for in-app, push, email, and SMS alerts', type: 'toggle', defaultValue: true },
      { id: 'notif_delivery_browser', group: 'Where you receive notifications', name: 'Browser', description: 'Show alerts in this browser when Wevsoft is in the background', type: 'toggle', defaultValue: true },
      { id: 'notif_delivery_email', group: 'Where you receive notifications', name: 'Email', description: 'Send notification emails to your account email', type: 'toggle', defaultValue: true },
      { id: 'notif_delivery_email_frequency', group: 'Where you receive notifications', name: 'Email frequency', description: 'How often we send email digests when Email is on', type: 'select', defaultValue: 'Suggested', options: ['Suggested', 'Important only', 'All'] },
      { id: 'notif_delivery_sms', group: 'Where you receive notifications', name: 'SMS', description: 'Text message alerts to your verified phone number', type: 'toggle', defaultValue: false },
      { id: 'notif_quiet_hours', group: 'Where you receive notifications', name: 'Quiet hours schedule', description: 'Mute push sounds during nighttime hours', type: 'select', defaultValue: 'Turn off quiet hours', options: ['10:00 PM to 7:00 AM', '11:00 PM to 6:00 AM', 'Custom schedule', 'Turn off quiet hours'] },
      { id: 'notif_sound_vibration', group: 'Where you receive notifications', name: 'Sounds and haptics', description: 'Play sounds and vibrate for alerts on this device', type: 'toggle', defaultValue: true },
    ],
  },
  {
    id: 'friends_connections',
    name: 'Friends & Connections',
    description: 'Friend requests, follower filtering, and close friends circle',
    iconName: 'Users',
    options: [
      {
        id: 'fri_friend_requests',
        name: 'Who can send friend requests',
        description: 'Choose who can invite you to connect on the platform',
        type: 'select',
        defaultValue: 'Everyone',
        options: ['Everyone', 'Friends of friends', 'No one'],
        helpText: 'Restricting friend requests helps reduce unwanted invitations from people you do not know.',
        relatedIds: ['fri_follower_filtering', 'sec_privacy_controls']
      },
      {
        id: 'fri_follower_filtering',
        name: 'Follower review & filtering',
        description: 'Manage who can follow your public updates and review pending requests',
        type: 'select',
        defaultValue: 'Automatic spam protection',
        options: ['Automatic spam protection', 'Open following'],
        helpText: 'Spam protection turns away follows from accounts under a day old that have no profile photo (friends are always allowed).',
        relatedIds: ['fri_friend_requests', 'story_close_friends']
      },
      {
        id: 'fri_mutual_friends',
        name: 'Mutual connections visibility',
        description: 'Control who can view your friends list and mutual connections',
        type: 'select',
        defaultValue: 'Friends only',
        options: ['Friends only', 'Public', 'Only me'],
        helpText: 'Hiding your friends list keeps your social network private from profile visitors.',
        relatedIds: ['sec_privacy_controls', 'fri_friend_requests']
      },
      {
        id: 'fri_contact_suggestions',
        name: 'People you may know',
        description: 'Allow us to suggest mutual friends and contacts to connect with',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Suggestions are based on mutual friendships, shared groups, and verified study/work details.',
        relatedIds: ['fri_friend_requests', 'fri_find_from_contacts']
      },
      {
        id: 'fri_find_from_contacts',
        name: 'Find friends from contacts',
        description: 'Match phone numbers you provide with verified WevSoft accounts that opted in',
        type: 'button',
        defaultValue: null,
        actionText: 'Open Friends',
        helpText: 'Opens Friends → Home. Numbers are matched transiently and not stored. To appear in others’ results, enable Find me by phone.',
        relatedIds: ['sec_find_by_phone', 'fri_contact_suggestions']
      }
    ]
  },
  {
    id: 'communities_groups',
    name: 'Communities',
    description: 'Group invitations, event reminders, and meetup discovery',
    iconName: 'Globe',
    options: [
      {
        id: 'comm_group_invites',
        name: 'Group invitations',
        description: 'Control who can add you to community groups and discussions',
        type: 'select',
        defaultValue: 'Friends only',
        options: ['Friends only', 'Everyone', 'Require my approval'],
        helpText: 'Setting this to require approval lets you preview groups before joining.',
        relatedIds: ['comm_event_reminders', 'fri_friend_requests']
      },
      {
        id: 'comm_event_reminders',
        name: 'Event reminders',
        description: 'Receive notifications for upcoming meetups and RSVP deadlines',
        type: 'select',
        defaultValue: '1 hour before event',
        options: ['1 hour before event', '1 day before', 'At start time', 'Off'],
        helpText: 'Event alerts help you never miss live broadcasts or local gatherings.',
        relatedIds: ['comm_group_invites', 'notif_push_alerts']
      },
      {
        id: 'comm_feed_priority',
        name: 'Community feed ranking',
        description: 'Show popular community discussions or sort chronologically',
        type: 'select',
        defaultValue: 'Smart ranking',
        options: ['Smart ranking', 'Most recent first', 'Top weekly posts'],
        helpText: 'Smart ranking highlights active conversations from communities you participate in most.',
        relatedIds: ['comm_group_invites', 'ai_feed_ranking']
      },
      {
        id: 'comm_member_badges',
        name: 'Community badges',
        description: 'Display contributor and founder badges on your group posts',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Badges highlight your helpful contributions and active participation in discussions.',
        relatedIds: ['comm_feed_priority', 'acc_identity_verification']
      }
    ]
  },
  {
    id: 'marketplace_shopping',
    name: 'WevMall',
    description: 'Saved listings, seller preferences, order history, and checkout',
    iconName: 'Store',
    options: [
      {
        id: 'mkt_saved_listings',
        name: 'Saved items & wishlist',
        description: 'Review marketplace listings and products you have bookmarked',
        type: 'button',
        defaultValue: '12 saved items',
        actionText: 'Open saved wishlist',
        helpText: 'We will notify you if a saved item drops in price or is marked as sold out.',
        relatedIds: ['mkt_order_history', 'pay_wallet_balance']
      },
      {
        id: 'mkt_seller_profile',
        name: 'Seller reputation & ratings',
        description: 'Manage your public seller rating, response time badge, and reviews',
        type: 'select',
        defaultValue: '5.0 ★ Top Rated Seller',
        options: ['5.0 ★ Top Rated Seller', 'Standard Seller Card', 'Hide Seller Stats'],
        helpText: 'High seller ratings improve your listing visibility across local marketplace searches.',
        relatedIds: ['mkt_saved_listings', 'pay_wallet_balance']
      },
      {
        id: 'mkt_order_history',
        name: 'Order & shipping tracking',
        description: 'Track active deliveries, past purchases, and buyer/seller receipts',
        type: 'button',
        defaultValue: '3 active shipments',
        actionText: 'View order center',
        helpText: 'Every marketplace purchase is protected by our buyer satisfaction guarantee.',
        relatedIds: ['mkt_saved_listings', 'pay_payment_methods']
      },
      {
        id: 'mkt_location_radius',
        name: 'WevMall search radius',
        description: 'Set your local distance for discovering nearby items for sale',
        type: 'select',
        defaultValue: 'Within 25 kilometers',
        options: ['Within 25 kilometers', 'Within 50 kilometers', 'Within 100 kilometers', 'Nationwide shipping'],
        helpText: 'Your precise address is never shared with sellers until you confirm an order.',
        relatedIds: ['sec_app_permissions', 'mkt_saved_listings']
      }
    ]
  },
  {
    id: 'professional_tools',
    name: 'Professional Tools',
    description: 'Creator analytics, brand studio, ad campaigns, and monetization',
    iconName: 'Briefcase',
    options: [
      {
        id: 'pro_creator_studio',
        name: `${CREATOR_HUB_NAME} & analytics`,
        description: 'View post reach, audience demographics, and engagement velocity',
        type: 'button',
        defaultValue: 'Creator Mode Active',
        actionText: `Open ${CREATOR_HUB_NAME}`,
        helpText: `${CREATOR_HUB_NAME} gives you professional insights to understand your audience growth.`,
        relatedIds: ['pro_monetization', 'post_default_audience']
      },
      {
        id: 'pro_monetization',
        name: 'Monetization & revenue share',
        description: 'Manage ad revenue share, virtual gifts, and subscription payouts',
        type: 'select',
        defaultValue: 'Monthly Payout Active',
        options: ['Monthly Payout Active', 'Weekly Direct Deposit', 'Pause Payouts'],
        helpText: 'Earnings are deposited directly to your selected wallet or bank account on the 1st of each month.',
        relatedIds: ['pro_creator_studio', 'pay_wallet_balance']
      },
      {
        id: 'pro_brand_collaborations',
        name: 'Sponsored brand partnerships',
        description: 'Manage paid partnership labels and brand collaboration requests',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Easily tag sponsor partners on branded posts to comply with transparent advertising standards.',
        relatedIds: ['pro_creator_studio', 'pro_ad_campaigns']
      },
      {
        id: 'pro_ad_campaigns',
        name: 'Advertising & promotions',
        description: 'Create and monitor promotional boosts for your top performing posts',
        type: 'button',
        defaultValue: '2 active campaigns',
        actionText: 'Manage ad campaigns',
        helpText: 'Boost your reach to specific age groups, regions, and interest categories.',
        relatedIds: ['pro_creator_studio', 'pay_payment_methods']
      }
    ]
  },
  {
    id: 'ai_center',
    name: 'AI Center',
    description: 'Smart feed recommendations, AI filters, voice assistance, and auto-captions',
    iconName: 'Sparkles',
    options: [
      {
        id: 'ai_translation_providers',
        name: 'AI & Translation',
        description: 'Preferred language, automatic translation, quality, and your own API keys',
        type: 'button',
        defaultValue: 'Manage',
        actionText: 'Open AI & Translation',
        helpText: 'Translate posts, comments, and messages on demand. Optionally connect your own OpenAI, Gemini, Anthropic, Groq, or custom OpenAI-compatible API key. Keys are encrypted and never shown in full after saving.',
        relatedIds: ['msg_translation_language', 'ai_feed_ranking']
      },
      {
        id: 'ai_feed_ranking',
        name: 'Smart feed personalization',
        description: 'Allow AI to rank posts by relevance or choose chronological order',
        type: 'select',
        defaultValue: 'AI Balanced Ranking',
        options: ['AI Balanced Ranking', 'Strict Chronological', 'Discovery Focus'],
        helpText: 'Our AI learns what topics you enjoy without sharing your preferences with third parties.',
        relatedIds: ['ai_auto_captions', 'comm_feed_priority', 'ai_translation_providers']
      },
      {
        id: 'student_mode',
        name: 'Student Mode',
        description: 'Prioritise learning content and limit distractions across your feed and Reels',
        type: 'toggle',
        defaultValue: true,
        helpText: 'When on, Wevsoft boosts educational content and applies your learning-focused limits and study hours. A parent or guardian may lock this on for you — in which case it cannot be switched off here.',
        relatedIds: ['ai_feed_ranking', 'reels_autoplay']
      },
      {
        id: 'ai_auto_captions',
        name: 'Automatic speech captioning',
        description: 'Generate instant subtitles for videos and voice messages',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Auto-captions make videos accessible in silent mode and support multi-language translation.',
        relatedIds: ['ai_feed_ranking', 'access_reduced_motion']
      },
      {
        id: 'ai_creative_assistant',
        name: 'AI writing & filter suggestions',
        description: 'Helpful caption ideas and smart lighting filters in story studio',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Get creative inspiration when writing posts or enhancing your photos.',
        relatedIds: ['story_camera_access', 'ai_feed_ranking']
      },
      {
        id: 'ai_data_usage_model',
        name: 'AI model improvement',
        description: 'Allow public posts to help improve platform recommendation quality',
        type: 'toggle',
        defaultValue: true,
        helpText: 'You can opt out at any time. Private messages and friends-only posts are never used.',
        relatedIds: ['sec_privacy_controls', 'ai_feed_ranking']
      }
    ]
  },
  {
    id: 'wallet_payments',
    name: 'Wallet & Payments',
    description: 'Wevsoft balance, payment methods, transaction receipts, and subscriptions',
    iconName: 'CreditCard',
    options: [
      {
        id: 'pay_wallet_balance',
        name: 'Wevsoft digital wallet balance',
        description: 'View your available balance, add funds, or withdraw to bank',
        type: 'button',
        defaultValue: '$450.00 USD available',
        actionText: 'Manage wallet funds',
        helpText: 'Your digital wallet allows instant, zero-fee transfers and secure marketplace checkouts.',
        relatedIds: ['pay_payment_methods', 'pay_transaction_history']
      },
      {
        id: 'pay_payment_methods',
        name: 'Payment cards & accounts',
        description: 'Add or update credit cards, PayPal, and Apple/Google Pay',
        type: 'button',
        defaultValue: '2 saved cards',
        actionText: 'Manage payment cards',
        helpText: 'All payment cards are encrypted with bank-grade security standards.',
        relatedIds: ['pay_wallet_balance', 'pay_subscriptions']
      },
      {
        id: 'pay_transaction_history',
        name: 'Receipts & transactions',
        description: 'Itemized history of purchases, gift tips, and withdrawals',
        type: 'button',
        defaultValue: 'Recent transactions',
        actionText: 'View transaction receipts',
        helpText: 'Download PDF receipts for your accounting and tax reporting needs.',
        relatedIds: ['pay_wallet_balance', 'mkt_order_history']
      },
      {
        id: 'pay_subscriptions',
        name: 'Active subscriptions',
        description: 'Manage Wevsoft AI PRO membership and creator subscriptions',
        type: 'select',
        defaultValue: 'Wevsoft AI PRO Active',
        options: ['Wevsoft AI PRO Active', 'Standard Free Member', 'Manage Subscriptions'],
        helpText: 'You can pause or cancel recurring subscriptions at any time without losing remaining days.',
        relatedIds: ['pay_payment_methods', 'pro_monetization']
      }
    ]
  },
  {
    id: 'language',
    name: 'Language',
    description: 'App display language',
    iconName: 'Globe',
    options: [
      {
        id: 'acc_regional_settings',
        name: 'Language',
        description: 'Choose the display language for the whole app',
        type: 'button',
        defaultValue: 'English (US)',
        actionText: 'Change language',
        helpText: 'This changes the display language across the entire application.',
        searchAliases: ['language', 'bhasha', 'ভাষা', 'lang', 'locale', 'ui language', 'wevsoft language'],
      },
    ],
  },
  {
    id: 'display_options',
    name: 'Display',
    description: 'Display mode, theme colors, glass effects, and font sizing',
    iconName: 'Monitor',
    options: [

      {
        id: 'app_theme_mode',
        name: 'Theme',
        description: 'Switch between dark mode, light mode, or system default',
        type: 'select',
        defaultValue: 'Light mode',
        options: ['Dark mode', 'Light mode', 'System default', 'OLED True Black'],
        helpText: 'Dark mode reduces eyestrain in low-light environments and saves OLED battery.',
        relatedIds: ['app_accent_color', 'app_font_scale']
      },
      ...NAV_ICON_STYLE_SETTING_OPTIONS,
      {
        id: 'app_profile_theme',
        name: 'Profile theme',
        description: 'Pick the cover gradient, accent color, and glow used on your profile',
        type: 'select',
        defaultValue: PROFILE_THEMES[0].name,
        options: PROFILE_THEMES.map(t => t.name),
        helpText: 'Your profile theme styles your cover photo, name gradient, cards, and floating particles. It is visible to everyone who opens your profile.',
        relatedIds: ['app_theme_mode', 'app_accent_color']
      },
      {
        id: 'app_accent_color',
        name: 'Accent color theme',
        description: 'Choose your primary color for buttons, badges, and active links',
        type: 'select',
        defaultValue: ACCENT_THEME_NAMES[0],
        options: [...ACCENT_THEME_NAMES],
        helpText: 'Your selected accent color applies across the entire mobile and desktop experience.',
        relatedIds: ['app_theme_mode', 'app_glass_effects']
      },
      {
        id: 'app_glass_effects',
        name: 'Glassmorphism & blur effects',
        description: 'Enable frosted glass translucency on headers and navigation bars',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Disabling blur effects can improve battery performance on older devices.',
        relatedIds: ['app_theme_mode', 'app_desktop_header', 'app_mobile_bottom_nav_style']
      },
      {
        id: 'app_desktop_header',
        name: 'Show header',
        description: 'Keep the desktop top bar. Off removes the bar but keeps the logo, notifications, and profile.',
        type: 'toggle',
        defaultValue: true,
        desktopOnly: true,
        helpText: 'PC and web preview only. On keeps the header background and border. Off overlays logo, notifications, and avatar on the page so feed content can sit at the top.',
        relatedIds: ['app_glass_effects', 'app_theme_mode', 'app_desktop_header_nav', 'app_desktop_header_nav_floating']
      },
      {
        id: 'app_desktop_header_nav_floating',
        name: 'Transparent header shortcuts',
        description: 'Keep shortcut icons visible when the header bar is off',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Floats your shortcut icons in the center with no bar background (Home and Friends). On PC / web preview this needs Show header off. On phones and tablets the shortcuts float whenever this is on — there is no desktop header bar.',
        relatedIds: ['app_desktop_header', 'app_desktop_header_nav', 'app_glass_effects']
      },
      {
        id: 'app_desktop_header_nav',
        name: 'Header shortcuts',
        description: 'Choose which icons appear in the center of the desktop top bar',
        type: 'button',
        defaultValue: 'Home, Friends, WevChat, Reels, WevMall',
        desktopOnly: true,
        actionText: 'Customize header icons',
        helpText: 'Pick up to six shortcuts — Home, Friends, Reels, Groups, and more — and reorder them left to right.',
        relatedIds: ['app_desktop_header', 'app_glass_effects']
      },
      {
        id: 'app_mobile_bottom_nav_style',
        name: 'Bottom nav style',
        description: 'Solid bar, feed-blend blur, or icons only',
        type: 'select',
        defaultValue: 'Solid bar',
        options: ['Solid bar', 'Feed blend', 'Icons only'],
        helpText: 'Solid bar = classic plate (default). Feed blend = frosted bar that softens into the feed; scroll down feels heavy, scroll up blurs into content. Icons only = no plate. Open Mobile Preview to see it.',
        relatedIds: ['app_glass_effects', 'app_theme_mode', 'app_mobile_bottom_nav', 'app_mobile_top_header', 'app_reels_bottom_nav']
      },
      {
        id: 'app_mobile_nav_transparent',
        name: 'Transparent navbar (legacy)',
        description: 'Prefer Bottom nav style → Icons only',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Legacy. Use Bottom nav style instead. On = Icons only; Off = Solid bar (does not select Feed blend).',
        relatedIds: ['app_mobile_bottom_nav_style']
      },
     
      {
        id: 'app_reels_bottom_nav',
        name: 'Bottom nav on Reels',
        description: 'Hide the bar on Reels, or keep Instagram-style transparent / frosted icons',
        type: 'select',
        defaultValue: 'Hidden',
        options: ['Transparent', 'Frosted blur', 'Hidden'],
        mobileOnly: true,
        helpText: 'Mobile only. Hidden (default) = no bottom nav on Reels. Frosted blur = dark glass plate. Transparent = icons over the video (white + shadow).',
        relatedIds: ['app_mobile_bottom_nav_style', 'app_glass_effects', 'app_mobile_bottom_nav']
      },
      {
        id: 'app_mobile_top_header',
        name: 'Mobile top header',
        description: 'Show Wevsoft brand and profile avatar at the top of Mobile Preview',
        type: 'toggle',
        defaultValue: true,
        mobileOnly: true,
        helpText: 'Phones and tablets only — never on PC Preview. Left: Wevsoft. Right: your profile photo. Notch/status bar color follows the header.',
        relatedIds: ['app_mobile_top_header_chrome', 'app_mobile_top_header_style', 'app_glass_effects', 'app_mobile_bottom_nav_style']
      },
      {
        id: 'app_mobile_top_header_chrome',
        name: 'Top header style',
        description: 'Solid bar, feed-blend blur, or icons only',
        type: 'select',
        defaultValue: 'Solid bar',
        options: ['Solid bar', 'Feed blend', 'Icons only'],
        mobileOnly: true,
        helpText: 'Solid bar = classic plate (default). Feed blend = frosted bar that softens downward into the feed. Icons only = brand + search + avatar with no plate. Open Mobile Preview to see it.',
        relatedIds: ['app_mobile_top_header', 'app_mobile_top_header_style', 'app_glass_effects', 'app_mobile_bottom_nav_style']
      },
      {
        id: 'app_mobile_top_header_style',
        name: 'Mobile header appearance',
        description: 'Transparent glass, blur, border, height, logo and avatar sizing',
        type: 'button',
        defaultValue: 'Glass · Brand color',
        mobileOnly: true,
        actionText: 'Customize mobile header',
        helpText: 'Fine controls for background, blur, border, shadow, padding, logo size/color, and profile icon. Top header style (Solid / Feed blend / Icons only) still wins for the plate.',
        relatedIds: ['app_mobile_top_header', 'app_mobile_top_header_chrome', 'app_glass_effects', 'app_accent_color']
      },
      {
        id: 'app_mobile_bottom_nav',
        name: 'Bottom nav icons',
        description: 'Choose Home, WevChat, Reels, WevMall, Notifications, Menu, and more',
        type: 'button',
        defaultValue: 'Home, WevChat, Reels, WevMall, Notifications, Menu',
        mobileOnly: true,
        actionText: 'Customize bottom nav',
        helpText: 'Mobile and tablet only. Reorder left to right — put Profile and Notifications at the end for the right side.',
        relatedIds: ['app_mobile_bottom_nav_style', 'app_glass_effects']
      },
      {
        id: 'app_font_scale',
        name: 'Text size and spacing',
        description: 'Adjust reading font size from compact to comfortable large text',
        type: 'select',
        defaultValue: FONT_SCALE_DEFAULT,
        options: [...FONT_SCALE_NAMES],
        helpText: 'Text scaling applies immediately to posts, comments, and settings menus.',
        relatedIds: ['app_theme_mode']
      }
    ]
  },
  {
    id: 'appearance_theme',
    name: 'Appearance',
    description: 'Dark mode, theme colors, glass effects, and font sizing',
    iconName: 'Palette',
    options: [
      {
        id: 'app_theme_mode',
        name: 'Theme',
        description: 'Switch between dark mode, light mode, or system default',
        type: 'select',
        defaultValue: 'Light mode',
        options: ['Dark mode', 'Light mode', 'System default', 'OLED True Black'],
        helpText: 'Dark mode reduces eyestrain in low-light environments and saves OLED battery.',
        relatedIds: ['app_accent_color', 'app_font_scale']
      },
      ...NAV_ICON_STYLE_SETTING_OPTIONS,
      {
        id: 'app_profile_theme',
        name: 'Profile theme',
        description: 'Pick the cover gradient, accent color, and glow used on your profile',
        type: 'select',
        defaultValue: PROFILE_THEMES[0].name,
        options: PROFILE_THEMES.map(t => t.name),
        helpText: 'Your profile theme styles your cover photo, name gradient, cards, and floating particles. It is visible to everyone who opens your profile.',
        relatedIds: ['app_theme_mode', 'app_accent_color']
      },
      {
        id: 'app_accent_color',
        name: 'Accent color theme',
        description: 'Choose your primary color for buttons, badges, and active links',
        type: 'select',
        defaultValue: ACCENT_THEME_NAMES[0],
        options: [...ACCENT_THEME_NAMES],
        helpText: 'Your selected accent color applies across the entire mobile and desktop experience.',
        relatedIds: ['app_theme_mode', 'app_glass_effects']
      },
      {
        id: 'app_glass_effects',
        name: 'Glassmorphism & blur effects',
        description: 'Enable frosted glass translucency on headers and navigation bars',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Disabling blur effects can improve battery performance on older devices.',
        relatedIds: ['app_theme_mode', 'access_reduced_motion', 'app_desktop_header', 'app_mobile_bottom_nav_style']
      },
      {
        id: 'app_desktop_header',
        name: 'Show header',
        description: 'Keep the desktop top bar. Off removes the bar but keeps the logo, notifications, and profile.',
        type: 'toggle',
        defaultValue: true,
        desktopOnly: true,
        helpText: 'PC and web preview only. On keeps the header background and border. Off overlays logo, notifications, and avatar on the page so feed content can sit at the top.',
        relatedIds: ['app_glass_effects', 'app_theme_mode', 'app_desktop_header_nav', 'app_desktop_header_nav_floating']
      },
      {
        id: 'app_desktop_header_nav_floating',
        name: 'Transparent header shortcuts',
        description: 'Keep shortcut icons visible when the header bar is off',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Floats your shortcut icons in the center with no bar background (Home and Friends). On PC / web preview this needs Show header off. On phones and tablets the shortcuts float whenever this is on — there is no desktop header bar.',
        relatedIds: ['app_desktop_header', 'app_desktop_header_nav', 'app_glass_effects']
      },
      {
        id: 'app_desktop_header_nav',
        name: 'Header shortcuts',
        description: 'Choose which icons appear in the center of the desktop top bar',
        type: 'button',
        defaultValue: 'Home, Friends, WevChat, Reels, WevMall',
        desktopOnly: true,
        actionText: 'Customize header icons',
        helpText: 'Pick up to six shortcuts — Home, Friends, Reels, Groups, and more — and reorder them left to right.',
        relatedIds: ['app_desktop_header', 'app_glass_effects']
      },
      {
        id: 'app_mobile_bottom_nav_style',
        name: 'Bottom nav style',
        description: 'Solid bar, feed-blend blur, or icons only',
        type: 'select',
        defaultValue: 'Solid bar',
        options: ['Solid bar', 'Feed blend', 'Icons only'],
        helpText: 'Solid bar = classic plate (default). Feed blend = frosted bar that softens into the feed; scroll down feels heavy, scroll up blurs into content. Icons only = no plate. Open Mobile Preview to see it.',
        relatedIds: ['app_glass_effects', 'app_theme_mode', 'app_mobile_bottom_nav', 'app_mobile_top_header', 'app_reels_bottom_nav']
      },
      {
        id: 'app_mobile_nav_transparent',
        name: 'Transparent navbar (legacy)',
        description: 'Prefer Bottom nav style → Icons only',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Legacy. Use Bottom nav style instead. On = Icons only; Off = Solid bar (does not select Feed blend).',
        relatedIds: ['app_mobile_bottom_nav_style']
      },
     
      {
        id: 'app_reels_bottom_nav',
        name: 'Bottom nav on Reels',
        description: 'Hide the bar on Reels, or keep Instagram-style transparent / frosted icons',
        type: 'select',
        defaultValue: 'Hidden',
        options: ['Transparent', 'Frosted blur', 'Hidden'],
        mobileOnly: true,
        helpText: 'Mobile only. Hidden (default) = no bottom nav on Reels. Frosted blur = dark glass plate. Transparent = icons over the video (white + shadow).',
        relatedIds: ['app_mobile_bottom_nav_style', 'app_glass_effects', 'app_mobile_bottom_nav']
      },
      {
        id: 'app_mobile_top_header',
        name: 'Mobile top header',
        description: 'Show Wevsoft brand and profile avatar at the top of Mobile Preview',
        type: 'toggle',
        defaultValue: true,
        mobileOnly: true,
        helpText: 'Phones and tablets only — never on PC Preview. Left: Wevsoft. Right: your profile photo. Notch/status bar color follows the header.',
        relatedIds: ['app_mobile_top_header_chrome', 'app_mobile_top_header_style', 'app_glass_effects', 'app_mobile_bottom_nav_style']
      },
      {
        id: 'app_mobile_top_header_chrome',
        name: 'Top header style',
        description: 'Solid bar, feed-blend blur, or icons only',
        type: 'select',
        defaultValue: 'Solid bar',
        options: ['Solid bar', 'Feed blend', 'Icons only'],
        mobileOnly: true,
        helpText: 'Solid bar = classic plate (default). Feed blend = frosted bar that softens downward into the feed. Icons only = brand + search + avatar with no plate. Open Mobile Preview to see it.',
        relatedIds: ['app_mobile_top_header', 'app_mobile_top_header_style', 'app_glass_effects', 'app_mobile_bottom_nav_style']
      },
      {
        id: 'app_mobile_top_header_style',
        name: 'Mobile header appearance',
        description: 'Transparent glass, blur, border, height, logo and avatar sizing',
        type: 'button',
        defaultValue: 'Glass · Brand color',
        mobileOnly: true,
        actionText: 'Customize mobile header',
        helpText: 'Fine controls for background, blur, border, shadow, padding, logo size/color, and profile icon. Top header style (Solid / Feed blend / Icons only) still wins for the plate.',
        relatedIds: ['app_mobile_top_header', 'app_mobile_top_header_chrome', 'app_glass_effects', 'app_accent_color']
      },
      {
        id: 'app_mobile_bottom_nav',
        name: 'Bottom nav icons',
        description: 'Choose Home, WevChat, Reels, WevMall, Notifications, Menu, and more',
        type: 'button',
        defaultValue: 'Home, WevChat, Reels, WevMall, Notifications, Menu',
        mobileOnly: true,
        actionText: 'Customize bottom nav',
        helpText: 'Mobile and tablet only. Reorder left to right — put Profile and Notifications at the end for the right side.',
        relatedIds: ['app_mobile_bottom_nav_style', 'app_glass_effects']
      },
      {
        id: 'app_font_scale',
        name: 'Text size and spacing',
        description: 'Adjust reading font size from compact to comfortable large text',
        type: 'select',
        defaultValue: FONT_SCALE_DEFAULT,
        options: [...FONT_SCALE_NAMES],
        helpText: 'Text scaling applies immediately to posts, comments, and settings menus.',
        relatedIds: ['access_high_contrast', 'app_theme_mode']
      },
      {
        id: 'app_data_saver',
        name: 'Data saver mode',
        description: 'Reduce image resolution and turn off autoplay on mobile cellular data',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Data saver can reduce mobile cellular bandwidth usage by up to 60%.',
        relatedIds: ['media_upload_quality', 'msg_media_auto_download']
      }
    ]
  },
  {
    id: 'media_playback',
    name: 'Media, Autoplay & Sound',
    description: 'Autoplay preferences, sound controls, preview length, video looping, and cellular data rules',
    iconName: 'Volume2',
    options: [
      {
        id: 'media_autoplay_mode',
        name: 'Autoplay Videos',
        description: 'Choose when feed videos automatically start playing',
        type: 'select',
        defaultValue: 'Autoplay on Wi-Fi only',
        options: ['Autoplay everywhere', 'Autoplay on Wi-Fi only', 'Autoplay on Mobile Data only', 'Never Autoplay'],
        helpText: 'Control automatic playback on Cellular and Wi-Fi to save mobile data.',
        relatedIds: ['media_autoplay_scope', 'media_preview_length', 'app_data_saver']
      },
      {
        id: 'media_autoplay_scope',
        name: 'Autoplay locations',
        description: 'Customize which sections of the app allow autoplay videos',
        type: 'select',
        defaultValue: 'Feed, Stories & Reels',
        options: ['Feed, Stories & Reels', 'Stories & Reels only', 'Stories only', 'Reels only', 'WevChat only'],
        helpText: 'You can keep autoplay active in immersive fullscreen formats like Stories or Reels while keeping the main Feed quiet.',
        relatedIds: ['media_autoplay_mode', 'media_loop_videos']
      },
      {
        id: 'media_loop_videos',
        name: 'Loop feed videos',
        description: 'Automatically repeat short videos when they finish playing',
        type: 'toggle',
        defaultValue: true,
        helpText: 'When enabled, videos will replay seamlessly until you scroll away.',
        relatedIds: ['media_autoplay_mode', 'media_pause_on_scroll']
      },
      {
        id: 'media_preview_length',
        name: 'Autoplay preview duration',
        description: 'Choose how long preview videos play automatically in feed',
        type: 'select',
        defaultValue: '5 seconds',
        options: ['3 seconds', '5 seconds', 'Full video duration'],
        helpText: 'Shorter preview durations save battery and cellular data bandwidth.',
        relatedIds: ['media_autoplay_mode', 'app_data_saver']
      },
      {
        id: 'media_pause_on_scroll',
        name: 'Pause on scroll away',
        description: 'Automatically pause playing videos when scrolled out of view',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Ensures background audio stops immediately as you scroll past a video.',
        relatedIds: ['media_loop_videos', 'media_sound_default']
      },
      {
        id: 'media_sound_default',
        name: 'Default sound state',
        description: 'Choose whether videos start with sound on or muted in your feed',
        type: 'select',
        defaultValue: 'Muted by default',
        options: ['Sound On by default', 'Muted by default (Mute Feed)', 'Sound only when Fullscreen', 'Remember last sound preference'],
        helpText: 'Muting feed videos by default lets you browse quietly in public places.',
        relatedIds: ['media_pause_on_scroll', 'app_data_saver']
      },
      {
        id: 'media_upload_quality',
        name: 'HD media upload quality',
        description: 'Upload quality choice is not applied yet',
        unavailableNote: 'Photos and videos are currently uploaded as the original file you pick; WevSoft does not resize or re-encode uploads yet, so this choice has no effect and is turned off. Your saved choice is kept for when this is supported.',
        type: 'select',
        defaultValue: 'HD (1080p / 4K)',
        options: ['Standard Quality (Fast upload)', 'HD (1080p / 4K)', 'Auto (based on connection)'],
        helpText: 'HD uploads may take longer over cellular connections.',
        relatedIds: ['app_data_saver', 'media_autoplay_mode']
      },
      {
        id: 'media_live_streaming',
        name: 'Live stream default quality',
        description: 'Live stream quality choice is not applied yet',
        unavailableNote: 'Live broadcast bitrate and latency are not controlled by this setting yet, so this choice has no effect and is turned off. Reels playback quality (Reels → Video quality) does work.',
        type: 'select',
        defaultValue: '1080p Ultra Low Latency',
        options: ['720p Standard Latency', '1080p Ultra Low Latency', '4K High Definition (Wi-Fi only)'],
        helpText: 'Ultra Low Latency ensures real-time interaction with viewers during live streams.',
        relatedIds: ['media_upload_quality', 'app_data_saver']
      }
    ]
  },
  {
    id: 'reels',
    name: 'Reels',
    description: 'Autoplay, sound, captions, data saver, and For You feed preferences',
    iconName: 'Play',
    options: [
      {
        id: 'reels_autoplay',
        name: 'Autoplay',
        description: 'When Reels start playing automatically',
        type: 'select',
        defaultValue: 'Wi-Fi only',
        options: ['Always', 'Wi-Fi only', 'Off'],
        helpText: 'Always plays on any connection. Wi-Fi only saves cellular data. Off waits for a tap.',
        relatedIds: ['reels_auto_next', 'reels_data_saver']
      },
      {
        id: 'reels_sound',
        name: 'Auto sound',
        description: 'Default mute state when a Reel starts',
        type: 'select',
        defaultValue: 'Remember last',
        options: ['Remember last', 'Muted', 'Sound on'],
        helpText: 'Remember last keeps your mute toggle. Muted starts silent. Sound on starts with audio.',
        relatedIds: ['reels_autoplay', 'media_sound_default']
      },
      {
        id: 'reels_auto_next',
        name: 'Auto next',
        description: 'Advance to the next Reel when the current one ends',
        type: 'toggle',
        defaultValue: true,
        helpText: 'When off, the current Reel loops until you swipe or tap next.',
        relatedIds: ['reels_loop', 'reels_autoplay']
      },
      {
        id: 'reels_loop',
        name: 'Loop video',
        description: 'Replay the current Reel until you move on',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Loop is ignored when Auto next is on so the feed can advance.',
        relatedIds: ['reels_auto_next']
      },
      {
        id: 'reels_data_saver',
        name: 'Data saver',
        description: 'Prefer 480p and skip HLS on cellular',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Uses lower-bitrate renditions when available to reduce mobile data use.',
        relatedIds: ['reels_hd_wifi', 'app_data_saver']
      },
      {
        id: 'reels_hd_wifi',
        name: 'HD on Wi-Fi only',
        description: 'Limit high quality playback to Wi-Fi',
        type: 'toggle',
        defaultValue: true,
        helpText: 'On cellular, Wevsoft picks a 480p rendition when one exists.',
        relatedIds: ['reels_data_saver']
      },
      {
        id: 'reels_captions',
        name: 'Captions',
        description: 'Show timed captions when a Reel has them',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Captions overlay the player using stored segments when available.',
        relatedIds: ['reels_caption_lang']
      },
      {
        id: 'reels_caption_lang',
        name: 'Caption language',
        description: 'Preferred language for Reel captions',
        type: 'select',
        defaultValue: 'English',
        options: ['English', 'Bangla'],
        helpText: 'Used when generating or selecting caption tracks.',
        relatedIds: ['reels_captions']
      },
      {
        id: 'reels_infinite',
        name: 'Infinite scroll',
        description: 'Load more Reels as you reach the end of the feed',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Turn off to keep a single page of results.',
        relatedIds: ['reels_show_watched']
      },
      {
        id: 'reels_show_watched',
        name: 'Show watched',
        description: 'Keep completed Reels in For You',
        type: 'toggle',
        defaultValue: true,
        helpText: 'When off, Reels you have finished are hidden from For You.',
        relatedIds: ['reels_infinite']
      },
      {
        id: 'reels_cinematic',
        name: 'Cinematic mode',
        description: 'Dark surroundings, background blur, and fewer distractions',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Puts the video in a darkened frame so the clip stays the focus.',
        relatedIds: ['reels_auto_hide', 'reels_nav_indicator']
      },
      {
        id: 'reels_auto_hide',
        name: 'Auto-hide controls',
        description: 'Hide like, comment, and other icons after two seconds of inactivity',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Off by default so action icons stay visible. On: tap or move to show controls, then they hide after 2 seconds.',
        relatedIds: ['reels_cinematic', 'reels_progress_bar']
      },
      {
        id: 'reels_nav_indicator',
        name: 'Navigation indicator',
        description: 'Show dots or “3 of 25” for your place in the feed',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Desktop uses a vertical dot rail. Mobile shows the current index.',
        relatedIds: ['reels_progress_bar']
      },
      {
        id: 'reels_progress_bar',
        name: 'Progress bar',
        description: 'Show the bottom scrubber and current / total time',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Example: 00:25 / 01:20. Hidden with the rest of the chrome when auto-hide is on.',
        relatedIds: ['reels_auto_hide']
      },
      {
        id: 'reels_quality',
        name: 'Video quality',
        description: 'Preferred playback quality when renditions exist',
        type: 'select',
        defaultValue: 'Auto',
        options: ['Auto', '480p', '720p', '1080p'],
        helpText: 'Auto follows connection and Data saver. Lower quality uses less data.',
        relatedIds: ['reels_data_saver', 'reels_hd_wifi']
      },
      {
        id: 'reels_ui_sidebar',
        name: 'Sidebar menu (desktop)',
        description: 'Left Reels menu visibility',
        type: 'select',
        defaultValue: 'Auto-hide (show on hover)',
        options: ['Auto-hide (show on hover)', 'Always visible', 'Hidden'],
        helpText: 'Auto-hide slides the menu in when you point at the left edge.',
        relatedIds: ['reels_ui_sidebar', 'reels_ui_volume', 'reels_ui_wevchat', 'reels_ui_notifications']
      },
      {
        id: 'reels_ui_volume',
        name: 'Volume indicator (desktop)',
        description: 'Volume slider visibility',
        type: 'select',
        defaultValue: 'Always visible',
        options: ['Auto-hide (show on hover)', 'Always visible', 'Hidden'],
        helpText: 'Auto-hide shows the slider when you hover its corner.',
        relatedIds: ['reels_ui_sidebar', 'reels_ui_volume', 'reels_ui_wevchat', 'reels_ui_notifications']
      },
      {
        id: 'reels_ui_wevchat',
        name: 'WevChat button (desktop)',
        description: 'WevChat shortcut visibility on Reels',
        type: 'select',
        defaultValue: 'Always visible',
        options: ['Auto-hide (show on hover)', 'Always visible', 'Hidden'],
        helpText: 'Auto-hide shows the button when you hover its spot.',
        relatedIds: ['reels_ui_sidebar', 'reels_ui_volume', 'reels_ui_wevchat', 'reels_ui_notifications']
      },
      {
        id: 'reels_ui_notifications',
        name: 'Notifications button (desktop)',
        description: 'Notifications bell visibility on Reels',
        type: 'select',
        defaultValue: 'Always visible',
        options: ['Auto-hide (show on hover)', 'Always visible', 'Hidden'],
        helpText: 'Auto-hide shows the bell when you hover its spot.',
        relatedIds: ['reels_ui_sidebar', 'reels_ui_volume', 'reels_ui_wevchat', 'reels_ui_notifications']
      },
      {
        id: 'reels_ui_search',
        name: 'Search button (desktop)',
        description: 'Search icon visibility on Reels',
        type: 'select',
        defaultValue: 'Always visible',
        options: ['Auto-hide (show on hover)', 'Always visible', 'Hidden'],
        helpText: 'Auto-hide shows the search icon when you hover its spot.',
        relatedIds: ['reels_ui_sidebar', 'reels_ui_volume', 'reels_ui_wevchat', 'reels_ui_notifications']
      }
    ]
  },
  {
    id: 'accessibility',
    name: 'Accessibility',
    description: 'Screen reader labels, reduced motion, high contrast, and touch targets',
    iconName: 'Eye',
    options: [
      {
        id: 'access_reduced_motion',
        name: 'Reduce screen motion',
        description: 'Minimize animations, parallax scrolling, and screen transitions',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Helpful for users who experience motion sensitivity or visual fatigue.',
        relatedIds: ['app_glass_effects', 'access_high_contrast']
      },
      {
        id: 'access_high_contrast',
        name: 'High contrast borders',
        description: 'Increase border sharpness and text contrast across UI cards',
        type: 'toggle',
        defaultValue: false,
        helpText: 'Makes buttons, input borders, and text labels stand out more clearly.',
        relatedIds: ['app_font_scale', 'app_theme_mode']
      },
      {
        id: 'access_screen_reader',
        name: 'Screen reader announcements',
        description: 'Optimize ARIA labels and vocal descriptions for VoiceOver and TalkBack',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Ensures assistive screen readers announce timeline posts and buttons accurately.',
        relatedIds: ['ai_auto_captions', 'access_high_contrast']
      },
      {
        id: 'access_large_touch',
        name: 'Comfortable touch targets',
        description: 'Expand button padding for easier one-handed mobile tapping',
        type: 'toggle',
        defaultValue: true,
        helpText: 'Increases touchable area around buttons and icons to prevent accidental taps.',
        relatedIds: ['app_font_scale', 'access_reduced_motion']
      }
    ]
  },
  {
    id: 'support_help',
    name: 'Support',
    description: 'Help center, bug reporting, account diagnostics, and community guidelines',
    iconName: 'HelpCircle',
    options: [
      {
        id: 'sup_help_center',
        name: 'Help Center & FAQs',
        description: 'Browse step-by-step guides, video tutorials, and troubleshooting tips',
        type: 'button',
        defaultValue: 'English & Bengali articles',
        actionText: 'Open Help Center',
        helpText: 'Find instant answers on privacy settings, account security, and creator tools.',
        relatedIds: ['sup_report_issue', 'sup_guidelines']
      },
      {
        id: 'sup_report_issue',
        name: 'Report a technical problem',
        description: 'Let us know if something is not working as expected',
        type: 'button',
        defaultValue: '0 open tickets',
        actionText: 'Submit problem report',
        helpText: 'We review bug reports daily to ensure a smooth, reliable platform experience.',
        relatedIds: ['sup_help_center', 'sup_account_status']
      },
      {
        id: 'sup_account_status',
        name: 'Account status & health',
        description: 'Check your standing regarding community rules and feature limits',
        type: 'button',
        defaultValue: '',
        actionText: 'View standing',
        helpText: 'Shows real moderation actions on your account and content.',
        relatedIds: ['sup_guidelines', 'sup_help_center']
      },
      {
        id: 'sup_guidelines',
        name: 'Community guidelines',
        description: 'Read our rules for keeping the platform safe, respectful, and secure',
        type: 'button',
        defaultValue: 'Updated for 2026',
        actionText: 'Read Guidelines',
        helpText: 'We are committed to fostering a welcoming community free from harassment and spam.',
        relatedIds: ['sup_account_status', 'about_terms_service']
      }
    ]
  },
  {
    id: 'about_legal',
    name: 'About',
    description: 'Terms of service, privacy policy, version information, and licenses',
    iconName: 'Info',
    options: [
      {
        id: 'about_terms_service',
        name: 'Terms of Service',
        description: 'Read the legal terms governing use of the Wevsoft social application',
        type: 'button',
        defaultValue: 'Version 2026.1',
        actionText: 'View Terms of Service',
        helpText: 'Our Terms of Service outline your rights and responsibilities when using the platform.',
        relatedIds: ['about_privacy_policy', 'sup_guidelines']
      },
      {
        id: 'about_privacy_policy',
        name: 'Privacy Policy',
        description: 'Learn how we protect, handle, and never sell your personal data',
        type: 'button',
        defaultValue: 'Transparent Data Shield',
        actionText: 'View Privacy Policy',
        helpText: 'We believe your data belongs to you. Read our plain-language summary of how data is protected.',
        relatedIds: ['sec_data_download', 'about_terms_service']
      },
      {
        id: 'about_app_version',
        name: 'Application build & release',
        description: 'Wevsoft Mobile & Web OS version 2.5.0 (build 2026.08)',
        type: 'select',
        defaultValue: 'Up to date (v2.5.0)',
        options: ['Up to date (v2.5.0)', 'Check for updates', 'Release notes'],
        helpText: 'You are running the latest consumer release of Wevsoft AI Social Studio.',
        relatedIds: ['about_terms_service', 'sup_help_center']
      },
      {
        id: 'about_open_source',
        name: 'Open source software licenses',
        description: 'Acknowledgments for libraries and tools that power the platform',
        type: 'button',
        defaultValue: 'MIT & Apache Licenses',
        actionText: 'View Software Licenses',
        helpText: 'We proudly support and contribute to open-source web and mobile technologies.',
        relatedIds: ['about_app_version', 'about_terms_service']
      }
    ]
  }
];

export function getOptionById(optionId: string): { option: ConsumerSettingOption; category: ConsumerSettingCategory } | null {
  for (const category of CONSUMER_SETTINGS_CATEGORIES) {
    const found = category.options.find(opt => opt.id === optionId);
    if (found) {
      return { option: found, category };
    }
  }
  return null;
}

export function isSettingVisible(option: ConsumerSettingOption, isDesktopMd: boolean): boolean {
  if (option.desktopOnly && !isDesktopMd) return false;
  if (option.mobileOnly && isDesktopMd) return false;
  return true;
}

export function searchSettings(
  query: string,
  tr?: (s: string) => string,
): { option: ConsumerSettingOption; category: ConsumerSettingCategory }[] {
  if (!query || !query.trim()) return [];
  const q = query.toLowerCase().trim();
  const blob = (english: string) => {
    const localized = tr ? tr(english) : english;
    return `${english} ${localized}`.toLowerCase();
  };
  const results: { option: ConsumerSettingOption; category: ConsumerSettingCategory }[] = [];
  for (const category of CONSUMER_SETTINGS_CATEGORIES) {
    for (const opt of category.options) {
      const aliases = (opt.searchAliases || []).some((a) => a.toLowerCase().includes(q) || q.includes(a.toLowerCase()));
      if (
        blob(opt.name).includes(q) ||
        blob(opt.description).includes(q) ||
        blob(category.name).includes(q) ||
        blob(category.description).includes(q) ||
        aliases
      ) {
        results.push({ option: opt, category });
      }
    }
  }
  return results;
}

