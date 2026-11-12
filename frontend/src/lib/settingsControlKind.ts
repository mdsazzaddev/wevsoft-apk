/**
 * Central classifier: which Facebook-style control each settings option gets.
 * Keep SPECIAL_PANEL_OPTION_IDS in sync with SettingsPage.getSpecialPanel.
 */

import type { ConsumerSettingOption } from '../pages/consumerSettingsData';

export const THEME_MODE_OPTION_ID = 'app_theme_mode';
export const ACCENT_OPTION_ID = 'app_accent_color';

export type SettingsControlKind = 'switch' | 'choice' | 'channel' | 'nav' | 'destructive';

/** Options that open a dedicated panel / multi-step flow (chevron row → feature detail). */
export const SPECIAL_PANEL_OPTION_IDS = new Set<string>([
  'acc_regional_settings',
  'app_profile_theme',
  'sec_two_step',
  'acc_identity_verification',
  'acc_connected_accounts',
  'ai_provider_setup',
  'sec_login_devices',
  'sec_qr_login',
  'sec_biometric_login',
  'sec_trusted_devices',
  'sec_blocked_users',
  'sec_wevspaces_visibility',
  'app_desktop_header_nav',
  'app_mobile_bottom_nav',
  'app_mobile_top_header_style',
  'acc_password_change',
  'acc_username',
  'acc_pause_account',
  'acc_account_ownership',
  'acc_security_shortcut',
  'acc_activity_log',
  'acc_standing',
  'sup_account_status',
  'acc_data_download',
  'acc_passkeys',
  'acc_profiles',
  'sec_restricted_list',
  'sec_muted_list',
  'feed_muted_keywords',
  'feed_snoozed_accounts',
  'feed_hidden_posts',
  'sec_security_checkup',
  'sec_recovery_contacts',
  'sec_activity_log',
  'sec_trash',
  'post_trash',
  'sec_apps_websites',
  'sec_legacy_contact',
  'sec_limit_past_posts',
  'post_limit_past_posts',
  'sec_ad_preferences',
  'cmt_hidden_words',
  'post_comment_moderation_assist',
  'post_drafts_manager',
  'post_scheduled_posts',
  'post_archive_vault',
  'post_insights_30d',
  'post_edit_history',
  'post_templates',
  'post_hashtag_sets',
  'post_bulk_manage',
  'post_content_calendar',
  'post_export_posts',
  'acc_email_addresses',
  'acc_phone_numbers',
  'ai_translation_providers',
  'msg_storage',
  'story_close_friends',
  'pay_wallet_balance',
  'pay_transaction_history',
  'pay_payment_methods',
  'post_close_friends',
]);

/** Red destructive rows (still navigate to their confirm/panel flow). */
export const DESTRUCTIVE_OPTION_IDS = new Set<string>([
  'acc_account_ownership',
  'acc_pause_account',
]);

/** Soft max for inline radio accordions (larger lists still accordion unless special-panel). */
export const CHOICE_ACCORDION_MAX = 16;

export function getSettingsControlKind(opt: ConsumerSettingOption): SettingsControlKind {
  if (DESTRUCTIVE_OPTION_IDS.has(opt.id)) return 'destructive';
  if (SPECIAL_PANEL_OPTION_IDS.has(opt.id)) return 'nav';
  if (opt.linkCategoryId || opt.linkOptionId) return 'nav';
  if (opt.unavailableNote) return 'nav';
  if (opt.type === 'toggle') return 'switch';
  if (opt.type === 'select') {
    const channels = (opt as ConsumerSettingOption & { channels?: unknown[] }).channels;
    if (Array.isArray(channels) && channels.length > 0) return 'channel';
    const n = opt.options?.length ?? 0;
    if (n > 0 && n <= CHOICE_ACCORDION_MAX) return 'choice';
    if (n > CHOICE_ACCORDION_MAX) return 'choice'; // still inline; scrollable panel
    return 'nav';
  }
  // buttons and anything else → dedicated page / external action
  return 'nav';
}

/** Deep-link ?opt= should expand these on the category page instead of feature_detail. */
export function isInlineAccordionOption(opt: ConsumerSettingOption | null | undefined): boolean {
  if (!opt) return false;
  const kind = getSettingsControlKind(opt);
  return kind === 'choice' || kind === 'channel';
}
