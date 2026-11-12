/**
 * Settings hubs (Your activity, Data and privacy, Advanced) and the Privacy
 * Checkup. Every entry points at an EXISTING option id in
 * consumerSettingsData; unknown ids are dropped, never faked.
 */
import { getOptionById } from '../pages/consumerSettingsData';

export interface SettingsHubDef { id: string; label: string; description: string; optionIds: string[] }

export const SETTINGS_HUB_DEFS: SettingsHubDef[] = [
  { id: 'your_activity', label: 'Your activity', description: 'What you have posted, edited, bought and where you are signed in',
    optionIds: ['acc_activity_log', 'post_browse_posts', 'post_edit_history', 'post_archive_vault', 'post_trash', 'mkt_order_history', 'pay_transaction_history', 'sec_login_devices'] },
  { id: 'data_privacy', label: 'Data and privacy', description: 'Download or export your data and control how it is used',
    optionIds: ['acc_data_download', 'post_export_posts', 'ai_data_usage_model', 'sec_app_permissions', 'sec_search_indexing', 'acc_account_ownership', 'about_privacy_policy'] },
  { id: 'advanced', label: 'Advanced', description: 'Devices, sign-in methods, storage and app information',
    optionIds: ['sec_trusted_devices', 'sec_qr_login', 'ai_provider_setup', 'msg_storage', 'app_data_saver', 'about_app_version', 'about_open_source'] },
];

export function resolveHubOptionIds(ids: string[]): string[] {
  return ids.filter((id) => !!getOptionById(id));
}

export interface PrivacyCheckStep {
  optionId: string;
  /** Returns true when the saved value is the more private choice. Omitted = review-only step (never counted as done). */
  isPrivate?: (value: unknown) => boolean;
}

export const PRIVACY_CHECKUP_STEPS: PrivacyCheckStep[] = [
  { optionId: 'post_default_audience', isPrivate: (v) => typeof v === 'string' && v !== 'Public' },
  { optionId: 'sec_email_privacy', isPrivate: (v) => v === false },
  { optionId: 'sec_phone_privacy', isPrivate: (v) => v === false },
  { optionId: 'sec_activity_status', isPrivate: (v) => v === false },
  { optionId: 'sec_search_indexing', isPrivate: (v) => v === false },
  { optionId: 'post_who_can_tag' },
  { optionId: 'sec_blocked_users' },
];

export type PrivacyStepStatus = 'private' | 'open' | 'review';

export interface PrivacyCheckupResult {
  steps: { optionId: string; status: PrivacyStepStatus }[];
  privateCount: number;
  checkable: number;
}

/** Status comes only from saved values; opening a step never changes it. */
export function evaluatePrivacyCheckup(values: Record<string, unknown>): PrivacyCheckupResult {
  const steps = PRIVACY_CHECKUP_STEPS.filter((s) => !!getOptionById(s.optionId)).map((s) => {
    if (!s.isPrivate) return { optionId: s.optionId, status: 'review' as const };
    const v = s.optionId in values ? values[s.optionId] : getOptionById(s.optionId)!.option.defaultValue;
    return { optionId: s.optionId, status: s.isPrivate(v) ? ('private' as const) : ('open' as const) };
  });
  const checkable = steps.filter((s) => s.status !== 'review').length;
  const privateCount = steps.filter((s) => s.status === 'private').length;
  return { steps, privateCount, checkable };
}