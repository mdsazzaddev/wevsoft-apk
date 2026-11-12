import { describe, it, expect } from 'vitest';
import { SETTINGS_HUB_DEFS, resolveHubOptionIds, evaluatePrivacyCheckup, PRIVACY_CHECKUP_STEPS } from './settingsHubs';
import { getOptionById } from '../pages/consumerSettingsData';

describe('settingsHubs', () => {
  it('every hub and checkup id is a real existing option', () => {
    for (const h of SETTINGS_HUB_DEFS) expect(resolveHubOptionIds(h.optionIds)).toEqual(h.optionIds);
    for (const s of PRIVACY_CHECKUP_STEPS) expect(getOptionById(s.optionId)).not.toBeNull();
    expect(getOptionById('sec_security_checkup')).not.toBeNull();
  });
  it('drops unknown ids instead of faking them', () => {
    expect(resolveHubOptionIds(['acc_activity_log', 'does_not_exist'])).toEqual(['acc_activity_log']);
  });
  it('status depends on saved values only, review steps are never done', () => {
    const open = evaluatePrivacyCheckup({ post_default_audience: 'Public', sec_email_privacy: true, sec_phone_privacy: true, sec_activity_status: true, sec_search_indexing: true });
    expect(open.privateCount).toBe(0);
    expect(open.checkable).toBe(5);
    const priv = evaluatePrivacyCheckup({ post_default_audience: 'Friends', sec_email_privacy: false, sec_phone_privacy: false, sec_activity_status: false, sec_search_indexing: false });
    expect(priv.privateCount).toBe(5);
    expect(priv.steps.filter((s) => s.status === 'review').length).toBe(2);
  });
  it('falls back to catalog defaults when a value was never saved', () => {
    const expected = PRIVACY_CHECKUP_STEPS.filter((s) => s.isPrivate && s.isPrivate(getOptionById(s.optionId)!.option.defaultValue)).length;
    expect(evaluatePrivacyCheckup({}).privateCount).toBe(expected);
  });
});