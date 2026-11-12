/**
 * useSettings — Central settings hook
 *
 * Loads AccountSettings + NotificationPreferences from the backend on mount.
 * Maps each backend field to its consumer settings option ID (from consumerSettingsData.ts).
 * Provides saveSetting(optionId, value) which routes each change to the correct API.
 * Also handles special cases: theme (calls store.setTheme), language (calls i18n.changeLanguage).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { CONSUMER_SETTINGS_CATEGORIES, getOptionById } from '../pages/consumerSettingsData';
import { getProfileThemeById, getProfileThemeByName } from '../lib/profileThemes';
import { ACCENT_PREF_KEY, applyAccentToDocument, isAllowedAccentName, normalizeAccentName } from '@wevsoft/shared/accentThemes';
import {
  NAV_ICON_STYLE_DARK_PREF_KEY,
  NAV_ICON_STYLE_LIGHT_PREF_KEY,
} from '@wevsoft/shared/nav-icon-style';
import { hydrateNavIconUserPrefs, setNavIconUserPref } from '../lib/navIconStyleState';
import { applyGlassEffectsToDocument, GLASS_PREF_KEY, parseGlassEnabled } from '../lib/glassEffects';
import { DESKTOP_HEADER_PREF_KEY, parseDesktopHeaderEnabled } from '../lib/desktopHeader';
import { DESKTOP_AI_FAB_PREF_KEY, parseDesktopAiFabEnabled } from '../lib/desktopAiFab';
import { DESKTOP_HEADER_NAV_PREF_KEY, parseDesktopHeaderNavIds, normalizeDesktopHeaderNavIds } from '../lib/desktopHeaderNav';
import {
  DESKTOP_HEADER_NAV_FLOATING_PREF_KEY,
  parseDesktopHeaderNavFloating,
} from '../lib/desktopHeaderNavFloating';
import { MOBILE_NAV_TRANSPARENT_PREF_KEY, parseMobileNavTransparent } from '../lib/mobileNavTransparent';
import {
  MOBILE_BOTTOM_NAV_STYLE_PREF_KEY,
  mobileBottomNavStyleLabel,
  parseMobileBottomNavStyle,
  styleFromLegacyTransparent,
} from '../lib/mobileBottomNavStyle';
import {
  REELS_BOTTOM_NAV_PREF_KEY,
  parseReelsBottomNavMode,
  reelsBottomNavLabel,
} from '../lib/reelsBottomNav';
import {
  MOBILE_TOP_HEADER_PREF_KEY,
  MOBILE_TOP_HEADER_STYLE_PREF_KEY,
  parseMobileTopHeaderEnabled,
  parseMobileTopHeaderStyle,
} from '../lib/mobileTopHeader';
import {
  MOBILE_TOP_HEADER_CHROME_PREF_KEY,
  mobileTopHeaderChromeLabel,
  parseMobileTopHeaderChrome,
} from '../lib/mobileTopHeaderChrome';
import {
  MOBILE_BOTTOM_NAV_PREF_KEY,
  mobileBottomNavSummary,
  normalizeMobileBottomNavIds,
} from '../lib/mobileBottomNav';
import { applyFontScaleToDocument, FONT_SCALE_PREF_KEY, isAllowedFontScale } from '../lib/fontScale';
import { applyReducedMotionToDocument, isReducedMotionApplied, parseReducedMotion, REDUCED_MOTION_PREF_KEY } from '../lib/reducedMotion';
import { invalidatePostDefaultsCache } from '../lib/postDefaults';
import { saveRecentLanguage, resolveLanguageCode, languageCodeToSettingsLabel, getLanguageByCode } from '../i18n/languages';
import toast from 'react-hot-toast';
import { saveReelsSettings } from '../lib/reelsPrefs';
import { REELS_UI_PREF_IDS, parseReelsUiMode, reelsUiModeLabel, syncReelsUiPref } from '../lib/reelsUiPrefs';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface SettingsState {
  valuesMap: Record<string, any>;
  isLoading: boolean;
  isSaving: Record<string, boolean>;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT VALUES from consumerSettingsData.ts
// ─────────────────────────────────────────────────────────────────────────────

function buildDefaults(): Record<string, any> {
  const defaults: Record<string, any> = {};
  CONSUMER_SETTINGS_CATEGORIES.forEach(cat => {
    cat.options.forEach(opt => {
      defaults[opt.id] = opt.defaultValue;
    });
  });
  return defaults;
}

// ─────────────────────────────────────────────────────────────────────────────
// API → valuesMap mapping
// Maps accountSettings DB fields to consumerSettingsData option IDs
// ─────────────────────────────────────────────────────────────────────────────

function mapAccountSettingsToValues(s: Record<string, any>): Record<string, any> {
  const map: Record<string, any> = {};
  // Privacy
  if (s.postPrivacy !== undefined)            map['post_default_audience']       = postPrivacyLabel(s.postPrivacy);
  if (s.privacyProfileVisitors !== undefined) map['sec_profile_visibility']      = s.privacyProfileVisitors;
  if (s.showOnlineStatus !== undefined)       map['sec_activity_status']         = s.showOnlineStatus;
  if (s.privacyEmail !== undefined)           map['sec_email_privacy']           = s.privacyEmail;
  if (s.privacyPhone !== undefined)           map['sec_phone_privacy']           = s.privacyPhone;
  if (s.profileDiscoverable !== undefined)    map['sec_search_visibility']       = s.profileDiscoverable;
  if (s.commentPrivacy !== undefined)         map['post_comment_privacy']        = audienceRuleLabel(s.commentPrivacy);
  // Messages
  if (s.readReceipts !== undefined)           map['msg_read_receipts']           = s.readReceipts;
  if (s.typingIndicator !== undefined)        map['msg_typing_indicator']        = s.typingIndicator;
  if (s.whoCanMessage !== undefined)          map['msg_who_can_message']         = s.whoCanMessage;
  if (s.lastSeenPrivacy !== undefined)        map['msg_last_seen']               = s.lastSeenPrivacy;
  if (s.viewActivityPrivacy !== undefined) {
    const v = String(s.viewActivityPrivacy).toLowerCase();
    map['sec_view_activity_privacy'] =
      v === 'public' ? 'Public' : v === 'private' ? 'Private' : 'Limited';
  }
  // Appearance
  if (s.theme !== undefined)                  map['app_theme_mode']              = s.theme;
  // Language
  if (s.language !== undefined)               map['acc_regional_settings']       = s.language;
  // Academic/general privacy
  if (s.privacyAcademic !== undefined)        map['acc_academic_privacy']        = s.privacyAcademic;
  // Push
  if (s.pushEnabled !== undefined)            map['notif_push_enabled']          = s.pushEnabled;
  // Media & Playback
  if (s.mediaAutoplayMode !== undefined)      map['media_autoplay_mode']         = s.mediaAutoplayMode;
  if (s.mediaAutoplayScope !== undefined)     map['media_autoplay_scope']        = s.mediaAutoplayScope;
  if (s.mediaLoopVideos !== undefined)        map['media_loop_videos']           = s.mediaLoopVideos;
  if (s.mediaPreviewLength !== undefined)     map['media_preview_length']        = s.mediaPreviewLength;
  if (s.mediaPauseOnScroll !== undefined)     map['media_pause_on_scroll']       = s.mediaPauseOnScroll;
  if (s.mediaSoundDefault !== undefined)      map['media_sound_default']         = s.mediaSoundDefault;
  if (s.mediaUploadQuality !== undefined)     map['media_upload_quality']        = s.mediaUploadQuality;
  if (s.mediaLiveStreaming !== undefined)     map['media_live_streaming']        = s.mediaLiveStreaming;
  if (s.dataSaverMode !== undefined)          map['app_data_saver']              = s.dataSaverMode;
  return map;
}

/** Stored postPrivacy (any legacy spelling) -> Settings label. */
function postPrivacyLabel(v: unknown): string {
  const s = String(v || '').toLowerCase().trim();
  if (s.startsWith('friend')) return 'Friends';
  if (s.startsWith('follower')) return 'Followers';
  if (s.startsWith('close')) return 'Close Friends';
  if (s === 'only me' || s === 'only_me' || s === 'private') return 'Only Me';
  return 'Public';
}

/** commentPrivacy / mentionPrivacy (any spelling) -> Settings label. */
function audienceRuleLabel(v: unknown): string {
  const s = String(v || '').toLowerCase().trim();
  if (s.startsWith('friend')) return 'Friends';
  if (s.startsWith('follower') || s.startsWith('people')) return 'Followers';
  if (s === 'no one' || s === 'no_one' || s === 'nobody' || s === 'off') return 'No one';
  return 'Everyone';
}

function mapNotifPrefsToValues(p: Record<string, any>): Record<string, any> {
  const map: Record<string, any> = {};
  if (p.priority !== undefined)       map['notif_push_all']         = p.priority;
  if (p.silent !== undefined)         map['notif_silent']           = p.silent;
  if (p.mentions !== undefined)       map['notif_mentions']         = p.mentions;
  if (p.friendRequests !== undefined) map['notif_friend_requests']  = p.friendRequests;
  if (p.marketplace !== undefined)    map['notif_marketplace']      = p.marketplace;
  if (p.stories !== undefined)        map['notif_stories']          = p.stories;
  if (p.live !== undefined)           map['notif_live']             = p.live;
  // Note: notif_* consumer options now persist verbatim via the preferences
  // blob (see getApiTarget). The keys mapped above are legacy IDs with no
  // matching UI option; do NOT map real UI IDs (e.g. notif_email_digests)
  // here or they would clobber the authoritative blob value on load.
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// OPTION ID → API ROUTE MAPPING
// ─────────────────────────────────────────────────────────────────────────────

type ApiTarget = 'account' | 'notif' | 'theme' | 'accent' | 'glass' | 'font' | 'desktop_header' | 'desktop_ai_fab' | 'desktop_header_nav_floating' | 'mobile_nav_transparent' | 'mobile_bottom_nav_style' | 'reels_bottom_nav' | 'mobile_top_header' | 'mobile_top_header_chrome' | 'language' | 'profile_theme' | 'profile_translation' | 'preferences' | 'reels' | 'student_mode' | 'enforced' | 'noop';

const REELS_OPTION_IDS = new Set([
  'reels_autoplay', 'reels_sound', 'reels_auto_next', 'reels_loop',
  'reels_data_saver', 'reels_hd_wifi', 'reels_captions', 'reels_caption_lang',
  'reels_infinite', 'reels_show_watched',
  'reels_cinematic', 'reels_auto_hide', 'reels_nav_indicator', 'reels_progress_bar', 'reels_quality',
]);

const REELS_UI_TO_API: Record<string, Record<string, string>> = {
  reels_autoplay: { Always: 'always', 'Wi-Fi only': 'wifi', Off: 'off' },
  reels_sound: { 'Remember last': 'remember', Muted: 'muted', 'Sound on': 'sound' },
  reels_caption_lang: { English: 'en', Bangla: 'bn' },
};

const REELS_API_TO_UI: Record<string, Record<string, string>> = {
  reels_autoplay: { always: 'Always', wifi: 'Wi-Fi only', off: 'Off' },
  reels_sound: { remember: 'Remember last', muted: 'Muted', sound: 'Sound on', auto_unmute: 'Sound on' },
  reels_caption_lang: { en: 'English', bn: 'Bangla' },
};

const REELS_FIELD: Record<string, string> = {
  reels_autoplay: 'autoplayMode',
  reels_sound: 'soundMode',
  reels_auto_next: 'autoNext',
  reels_loop: 'loopVideo',
  reels_data_saver: 'dataSaver',
  reels_hd_wifi: 'hdOnlyWifi',
  reels_captions: 'autoCaptions',
  reels_caption_lang: 'captionLanguage',
  reels_infinite: 'infiniteScroll',
  reels_show_watched: 'showWatched',
  reels_cinematic: 'cinematicMode',
  reels_auto_hide: 'autoHideChrome',
  reels_nav_indicator: 'showNavIndicator',
  reels_progress_bar: 'showProgressBar',
  reels_quality: 'preferredQuality',
};

function mapReelsSettingsToValues(s: Record<string, any>): Record<string, any> {
  const map: Record<string, any> = {};
  if (s.autoplayMode !== undefined) map.reels_autoplay = REELS_API_TO_UI.reels_autoplay[s.autoplayMode] || 'Wi-Fi only';
  if (s.soundMode !== undefined) map.reels_sound = REELS_API_TO_UI.reels_sound[s.soundMode] || 'Remember last';
  if (s.autoNext !== undefined) map.reels_auto_next = s.autoNext;
  if (s.loopVideo !== undefined) map.reels_loop = s.loopVideo;
  if (s.dataSaver !== undefined) map.reels_data_saver = s.dataSaver;
  if (s.hdOnlyWifi !== undefined) map.reels_hd_wifi = s.hdOnlyWifi;
  if (s.autoCaptions !== undefined) map.reels_captions = s.autoCaptions;
  if (s.captionLanguage !== undefined) map.reels_caption_lang = REELS_API_TO_UI.reels_caption_lang[s.captionLanguage] || 'English';
  if (s.infiniteScroll !== undefined) map.reels_infinite = s.infiniteScroll;
  if (s.showWatched !== undefined) map.reels_show_watched = s.showWatched;
  if (s.cinematicMode !== undefined) map.reels_cinematic = s.cinematicMode;
  if (s.autoHideChrome !== undefined) map.reels_auto_hide = s.autoHideChrome;
  if (s.showNavIndicator !== undefined) map.reels_nav_indicator = s.showNavIndicator;
  if (s.showProgressBar !== undefined) map.reels_progress_bar = s.showProgressBar;
  if (s.preferredQuality !== undefined) map.reels_quality = s.preferredQuality;
  return map;
}

// Option IDs that map to a dedicated, typed AccountSettings column. Everything
// else (toggle/select) is persisted verbatim into the generic preferences blob.
// Only IDs whose UI concept matches an existing column are listed here.
/**
 * Visible options backed by an AccountSettings column that the backend enforces
 * (messaging, tagging, story audience, visit counter, email/phone on profile).
 * UI labels <-> API values are converted here; legacy blob values are migrated by
 * scripts/migrate-settings-prefs (and overridden on load by the column value).
 */
export const ENFORCED_OPTIONS: Record<string, { field: string; toApi: (v: any) => any; fromApi: (v: any) => any }> = {
  msg_message_requests: {
    field: 'whoCanMessage',
    toApi: (v) => (v === 'Everyone' ? 'everyone' : v === 'No one' ? 'nobody' : 'friends'),
    fromApi: (v) => { const s = String(v || 'friends').toLowerCase(); return s === 'everyone' ? 'Everyone' : s === 'nobody' ? 'No one' : 'Friends (others go to requests)'; },
  },
  // post_who_can_tag lives in preferences; the server mirrors it to whoCanTag + tagApproval.
  story_view_privacy: {
    field: 'storyPrivacy',
    toApi: (v) => (v === 'Public' ? 'public' : v === 'Followers' ? 'followers' : 'friends'),
    fromApi: (v) => { const s = String(v || 'friends').toLowerCase(); return s === 'public' || s === 'everyone' ? 'Public' : s === 'followers' ? 'Followers' : 'Friends'; },
  },
  sec_profile_visitors: {
    field: 'privacyProfileVisitors',
    toApi: (v) => (v === 'Everyone' ? 'public' : v === 'Friends' ? 'friends' : 'only_me'),
    fromApi: (v) => { const s = String(v || 'only_me').toLowerCase(); return s === 'public' ? 'Everyone' : s === 'friends' ? 'Friends' : 'Only me'; },
  },
  sec_email_privacy: { field: 'privacyEmail', toApi: (v) => Boolean(v), fromApi: (v) => v !== false },
  sec_phone_privacy: { field: 'privacyPhone', toApi: (v) => Boolean(v), fromApi: (v) => v === true },
  sec_search_indexing: { field: 'profileDiscoverable', toApi: (v) => Boolean(v), fromApi: (v) => v !== false },
};

const ACCOUNT_TYPED_IDS = new Set<string>([
  'post_default_audience', 'sec_activity_status', 'sec_view_activity_privacy',
  'sec_profile_visibility', 'sec_email_privacy', 'sec_phone_privacy',
  'sec_search_visibility',
  'post_comment_privacy',
  'msg_read_receipts', 'msg_typing_indicator', 'msg_who_can_message', 'msg_last_seen',
  'acc_academic_privacy', 'notif_push_enabled',
  'media_autoplay_mode', 'media_autoplay_scope', 'media_loop_videos',
  'media_preview_length', 'media_pause_on_scroll', 'media_sound_default',
  'media_upload_quality', 'media_live_streaming', 'app_data_saver',
]);

const NOTIF_TYPED_IDS = new Set<string>([
  'notif_email_digests',
  'notif_push_all',
  'notif_mentions',
  'notif_friend_requests',
  'notif_marketplace',
  'notif_stories',
  'notif_live',
]);

function getApiTarget(optionId: string): ApiTarget {
  if (ENFORCED_OPTIONS[optionId]) return 'enforced';
  // Theme requires both store update and API call
  if (optionId === 'app_theme_mode') return 'theme';
  if (optionId === 'app_accent_color') return 'accent';
  if (optionId === 'app_glass_effects') return 'glass';
  if (optionId === 'app_font_scale') return 'font';
  if (optionId === DESKTOP_HEADER_PREF_KEY) return 'desktop_header';
  if (optionId === DESKTOP_AI_FAB_PREF_KEY) return 'desktop_ai_fab';
  if (optionId === DESKTOP_HEADER_NAV_FLOATING_PREF_KEY) return 'desktop_header_nav_floating';
  if (optionId === MOBILE_NAV_TRANSPARENT_PREF_KEY) return 'mobile_nav_transparent';
  if (optionId === MOBILE_BOTTOM_NAV_STYLE_PREF_KEY) return 'mobile_bottom_nav_style';
  if (optionId === REELS_BOTTOM_NAV_PREF_KEY) return 'reels_bottom_nav';
  if (optionId === MOBILE_TOP_HEADER_PREF_KEY) return 'mobile_top_header';
  if (optionId === MOBILE_TOP_HEADER_CHROME_PREF_KEY) return 'mobile_top_header_chrome';
  // Profile theme is stored on the User record, not in AccountSettings
  if (optionId === 'app_profile_theme') return 'profile_theme';
  // Language: i18n.changeLanguage + localStorage only (device preference)
  if (optionId === 'acc_regional_settings') return 'language';
  // Translation language is stored on the User profile
  if (optionId === 'msg_translation_language') return 'profile_translation';
  // Student Mode (Content Governance) — dedicated endpoint, may be guardian-locked
  if (optionId === 'student_mode') return 'student_mode';
  // Notification preference table
  if (NOTIF_TYPED_IDS.has(optionId)) return 'notif';
  if (REELS_OPTION_IDS.has(optionId)) return 'reels';
  // Settings with a dedicated typed column
  if (ACCOUNT_TYPED_IDS.has(optionId)) return 'account';
  // Button/action options open dedicated panels or fire one-off actions — nothing to persist here.
  const opt = getOptionById(optionId)?.option;
  if (!opt || opt.type === 'button') return 'noop';
  // Every remaining toggle/select display preference persists verbatim into the blob.
  return 'preferences';
}

// Maps consumer setting ID to AccountSettings DB field name
function getAccountField(optionId: string): string {
  const fieldMap: Record<string, string> = {
    post_default_audience:   'postPrivacy',
    sec_profile_visibility:  'privacyProfileVisitors',
    sec_activity_status:     'showOnlineStatus',
    sec_email_privacy:       'privacyEmail',
    sec_phone_privacy:       'privacyPhone',
    sec_search_visibility:   'profileDiscoverable',
    post_comment_privacy:    'commentPrivacy',
    msg_read_receipts:       'readReceipts',
    msg_typing_indicator:    'typingIndicator',
    msg_who_can_message:     'whoCanMessage',
    msg_last_seen:           'lastSeenPrivacy',
    sec_view_activity_privacy: 'viewActivityPrivacy',
    acc_academic_privacy:    'privacyAcademic',
    notif_push_enabled:      'pushEnabled',
    media_autoplay_mode:     'mediaAutoplayMode',
    media_autoplay_scope:    'mediaAutoplayScope',
    media_loop_videos:       'mediaLoopVideos',
    media_preview_length:    'mediaPreviewLength',
    media_pause_on_scroll:   'mediaPauseOnScroll',
    media_sound_default:     'mediaSoundDefault',
    media_upload_quality:    'mediaUploadQuality',
    media_live_streaming:    'mediaLiveStreaming',
    app_data_saver:          'dataSaverMode',
  };
  return fieldMap[optionId] || optionId;
}

// Maps notification consumer ID to NotificationPreference DB field
function getNotifField(optionId: string): string {
  const fieldMap: Record<string, string> = {
    notif_push_all:        'priority',
    notif_silent:          'silent',
    notif_mentions:        'mentions',
    notif_friend_requests: 'friendRequests',
    notif_marketplace:     'marketplace',
    notif_stories:         'stories',
    notif_live:            'live',
    notif_email_digests:   'digest',
  };
  return fieldMap[optionId] || optionId.replace('notif_', '');
}

// ─────────────────────────────────────────────────────────────────────────────
// THE HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useSettings() {
  const token = useStore(state => state.token);
  const storeTheme = useStore(state => state.theme);
  const storeSetTheme = useStore(state => state.setTheme);
  const storeSetAccentTheme = useStore(state => state.setAccentTheme);
  const storeSetGlassEffects = useStore(state => state.setGlassEffects);
  const storeSetShowDesktopHeader = useStore(state => state.setShowDesktopHeader);
  const storeSetShowWevAssistant = useStore(state => state.setShowWevAssistant);
  const storeSetDesktopHeaderNavFloating = useStore(state => state.setDesktopHeaderNavFloating);
  const storeSetDesktopHeaderNavIds = useStore(state => state.setDesktopHeaderNavIds);
  const storeSetMobileNavItems = useStore(state => state.setMobileNavItems);
  const storeSetMobileNavTransparent = useStore(state => state.setMobileNavTransparent);
  const storeSetMobileBottomNavStyle = useStore(state => state.setMobileBottomNavStyle);
  const storeSetReelsBottomNav = useStore(state => state.setReelsBottomNav);
  const storeSetShowMobileTopHeader = useStore(state => state.setShowMobileTopHeader);
  const storeSetMobileTopHeaderChrome = useStore(state => state.setMobileTopHeaderChrome);
  const storeSetMobileTopHeaderStyle = useStore(state => state.setMobileTopHeaderStyle);
  const storeSetFontScale = useStore(state => state.setFontScale);
  const brandColor = useStore(state => state.systemSettings?.brandColor);
  const { i18n } = useTranslation();

  const [valuesMap, setValuesMap] = useState<Record<string, any>>(buildDefaults);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Track if initial load is done to avoid overwriting user's immediate interactions
  const loadedRef = useRef(false);

  // ─── Load settings from backend on mount ────────────────────────────────
  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setIsLoading(false);
      return;
    }

    const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    Promise.all([
      fetch('/api/settings/account', { headers: authHeaders }).then(r => r.ok ? r.json() : null),
      fetch('/api/notifications/preferences', { headers: authHeaders }).then(r => r.ok ? r.json() : null),
      fetch('/api/profile', { headers: authHeaders }).then(r => r.ok ? r.json() : null),
      fetch('/api/reels/settings', { headers: authHeaders }).then(r => r.ok ? r.json() : null),
      fetch('/api/governance/me/student-mode', { headers: authHeaders }).then(r => r.ok ? r.json() : null),
    ])
      .then(([accountSettings, notifPrefs, profile, reelsSettings, studentMode]) => {
        const merged: Record<string, any> = {};

        if (accountSettings) {
          // Long-tail preferences blob first, then typed mappings on top so a
          // dedicated typed column always wins on any key overlap.
          if (accountSettings.preferences) {
            try {
              const blob = JSON.parse(accountSettings.preferences);
              if (blob && typeof blob === 'object') Object.assign(merged, blob);
            } catch { /* ignore malformed blob */ }
          }
          Object.assign(merged, mapAccountSettingsToValues(accountSettings));
            for (const [id, e] of Object.entries(ENFORCED_OPTIONS)) {
              if (accountSettings[e.field] !== undefined) merged[id] = e.fromApi(accountSettings[e.field]);
            }
          if (isAllowedAccentName(accountSettings.accentColor)) {
            merged[ACCENT_PREF_KEY] = accountSettings.accentColor;
          }
        }
        if (notifPrefs) {
          Object.assign(merged, mapNotifPrefsToValues(notifPrefs));
        }
        if (profile?.profileTheme) {
          merged['app_profile_theme'] = getProfileThemeById(profile.profileTheme).name;
        }
        if (profile?.translationLanguage) {
          merged['msg_translation_language'] = profile.translationLanguage;
        }
        if (reelsSettings) {
          Object.assign(merged, mapReelsSettingsToValues(reelsSettings));
        }
        for (const id of Object.values(REELS_UI_PREF_IDS)) {
          if (merged[id] !== undefined) {
            const mode = parseReelsUiMode(merged[id]);
            merged[id] = reelsUiModeLabel(mode);
            syncReelsUiPref(id, mode);
          }
        }
        if (studentMode && typeof studentMode.isEnabled === 'boolean') {
          merged['student_mode'] = studentMode.isEnabled;
          merged['student_mode_locked'] = !!studentMode.enforcedByGuardian;
        }

        // Retired Plush Tactile app themes — map leftover saved values to light/dark.
        if (typeof merged['app_theme_mode'] === 'string' && /plush/i.test(merged['app_theme_mode'])) {
          merged['app_theme_mode'] = /dark/i.test(merged['app_theme_mode']) ? 'Dark mode' : 'Light mode';
        }

        // Sync theme from account settings (overrides store default if DB has a value)
        if (merged['app_theme_mode'] && merged['app_theme_mode'] !== storeTheme) {
          storeSetTheme(merged['app_theme_mode']);
        }

        if (typeof merged[ACCENT_PREF_KEY] === 'string' && isAllowedAccentName(merged[ACCENT_PREF_KEY])) {
          // A legacy name stored server-side still resolves, but only the canonical
          // name is offered in the select — normalize before it reaches the UI.
          merged[ACCENT_PREF_KEY] = normalizeAccentName(merged[ACCENT_PREF_KEY]);
          storeSetAccentTheme(merged[ACCENT_PREF_KEY]);
          applyAccentToDocument(merged[ACCENT_PREF_KEY], brandColor || null);
        }

        if (merged[GLASS_PREF_KEY] !== undefined) {
          const enabled = parseGlassEnabled(merged[GLASS_PREF_KEY]);
          merged[GLASS_PREF_KEY] = enabled;
          storeSetGlassEffects(enabled);
          applyGlassEffectsToDocument(enabled);
        }

        if (merged[DESKTOP_HEADER_PREF_KEY] !== undefined) {
          const enabled = parseDesktopHeaderEnabled(merged[DESKTOP_HEADER_PREF_KEY]);
          merged[DESKTOP_HEADER_PREF_KEY] = enabled;
          storeSetShowDesktopHeader(enabled);
        }

        if (merged[DESKTOP_AI_FAB_PREF_KEY] !== undefined) {
          const enabled = parseDesktopAiFabEnabled(merged[DESKTOP_AI_FAB_PREF_KEY]);
          merged[DESKTOP_AI_FAB_PREF_KEY] = enabled;
          storeSetShowWevAssistant(enabled);
        } else {
          merged[DESKTOP_AI_FAB_PREF_KEY] = useStore.getState().showWevAssistant;
        }

        if (merged[DESKTOP_HEADER_NAV_FLOATING_PREF_KEY] !== undefined) {
          const enabled = parseDesktopHeaderNavFloating(merged[DESKTOP_HEADER_NAV_FLOATING_PREF_KEY]);
          merged[DESKTOP_HEADER_NAV_FLOATING_PREF_KEY] = enabled;
          storeSetDesktopHeaderNavFloating(enabled);
        }

        if (merged[DESKTOP_HEADER_NAV_PREF_KEY] !== undefined) {
          const ids = normalizeDesktopHeaderNavIds(merged[DESKTOP_HEADER_NAV_PREF_KEY]);
          merged[DESKTOP_HEADER_NAV_PREF_KEY] = ids;
          storeSetDesktopHeaderNavIds(ids);
        }

        if (merged[MOBILE_BOTTOM_NAV_PREF_KEY] !== undefined) {
          const ids = normalizeMobileBottomNavIds(merged[MOBILE_BOTTOM_NAV_PREF_KEY]);
          merged[MOBILE_BOTTOM_NAV_PREF_KEY] = mobileBottomNavSummary(ids);
          storeSetMobileNavItems(ids);
        }

        if (merged[MOBILE_BOTTOM_NAV_STYLE_PREF_KEY] !== undefined) {
          const style = parseMobileBottomNavStyle(merged[MOBILE_BOTTOM_NAV_STYLE_PREF_KEY]);
          merged[MOBILE_BOTTOM_NAV_STYLE_PREF_KEY] = mobileBottomNavStyleLabel(style);
          storeSetMobileBottomNavStyle(style);
          merged[MOBILE_NAV_TRANSPARENT_PREF_KEY] = style === 'transparent';
        } else if (merged[MOBILE_NAV_TRANSPARENT_PREF_KEY] !== undefined) {
          const enabled = parseMobileNavTransparent(merged[MOBILE_NAV_TRANSPARENT_PREF_KEY]);
          merged[MOBILE_NAV_TRANSPARENT_PREF_KEY] = enabled;
          storeSetMobileNavTransparent(enabled);
          const style = styleFromLegacyTransparent(enabled);
          merged[MOBILE_BOTTOM_NAV_STYLE_PREF_KEY] = mobileBottomNavStyleLabel(style);
          storeSetMobileBottomNavStyle(style);
        }

        if (merged[REELS_BOTTOM_NAV_PREF_KEY] !== undefined) {
          const mode = parseReelsBottomNavMode(merged[REELS_BOTTOM_NAV_PREF_KEY]);
          merged[REELS_BOTTOM_NAV_PREF_KEY] = reelsBottomNavLabel(mode);
          storeSetReelsBottomNav(mode);
        }

        if (merged[MOBILE_TOP_HEADER_PREF_KEY] !== undefined) {
          const enabled = parseMobileTopHeaderEnabled(merged[MOBILE_TOP_HEADER_PREF_KEY]);
          merged[MOBILE_TOP_HEADER_PREF_KEY] = enabled;
          storeSetShowMobileTopHeader(enabled);
        }

        if (merged[MOBILE_TOP_HEADER_CHROME_PREF_KEY] !== undefined) {
          const chrome = parseMobileTopHeaderChrome(merged[MOBILE_TOP_HEADER_CHROME_PREF_KEY]);
          merged[MOBILE_TOP_HEADER_CHROME_PREF_KEY] = mobileTopHeaderChromeLabel(chrome);
          storeSetMobileTopHeaderChrome(chrome);
        }

        if (merged[MOBILE_TOP_HEADER_STYLE_PREF_KEY] !== undefined) {
          const style = parseMobileTopHeaderStyle(merged[MOBILE_TOP_HEADER_STYLE_PREF_KEY]);
          merged[MOBILE_TOP_HEADER_STYLE_PREF_KEY] = style;
          storeSetMobileTopHeaderStyle(style);
        }

        if (typeof merged[FONT_SCALE_PREF_KEY] === 'string' && isAllowedFontScale(merged[FONT_SCALE_PREF_KEY])) {
          storeSetFontScale(merged[FONT_SCALE_PREF_KEY]);
          applyFontScaleToDocument(merged[FONT_SCALE_PREF_KEY]);
        }
        if (merged[REDUCED_MOTION_PREF_KEY] !== undefined) {
          applyReducedMotionToDocument(parseReducedMotion(merged[REDUCED_MOTION_PREF_KEY]));
        }

        // Language is device-only (localStorage, default English) - never taken from the account.
        merged['acc_regional_settings'] = languageCodeToSettingsLabel(
          resolveLanguageCode(String(i18n.language || localStorage.getItem('language') || 'en')),
        );

        hydrateNavIconUserPrefs(
          {
            light: merged[NAV_ICON_STYLE_LIGHT_PREF_KEY],
            dark: merged[NAV_ICON_STYLE_DARK_PREF_KEY],
          },
          { replaceMissing: true },
        );

        setValuesMap(prev => ({ ...prev, ...merged }));
        loadedRef.current = true;
      })
      .catch(err => {
        console.error('[useSettings] Failed to load settings:', err);
        setError('Failed to load settings');
      })
      .finally(() => {
        setIsLoading(false);
      });
   
  }, [token]);

  // ─── saveSetting: routes to correct API ─────────────────────────────────
  const saveSetting = useCallback(
    async (optionId: string, newValue: any): Promise<boolean> => {
      // Optimistic UI update
      let previousValue: any;
      setValuesMap(prev => {
        previousValue = prev[optionId];
        return { ...prev, [optionId]: newValue };
      });
      setIsSaving(prev => ({ ...prev, [optionId]: true }));

      const previousAccent = useStore.getState().accentTheme;
      const previousGlass = useStore.getState().glassEffects;
      const previousDesktopHeader = useStore.getState().showDesktopHeader;
      const previousDesktopAiFab = useStore.getState().showWevAssistant;
      const previousDesktopHeaderNavFloating = useStore.getState().desktopHeaderNavFloating;
      const previousMobileNavTransparent = useStore.getState().mobileNavTransparent;
      const previousMobileBottomNavStyle = useStore.getState().mobileBottomNavStyle;
      const previousReelsBottomNav = useStore.getState().reelsBottomNav;
      const previousMobileTopHeader = useStore.getState().showMobileTopHeader;
      const previousMobileTopHeaderChrome = useStore.getState().mobileTopHeaderChrome;
      const previousFont = useStore.getState().fontScale;
      const previousReducedMotion = isReducedMotionApplied();
      if (optionId === REDUCED_MOTION_PREF_KEY) applyReducedMotionToDocument(parseReducedMotion(newValue));
      const target = getApiTarget(optionId);
      const authHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      try {
        if (target === 'noop') {
          // Button/action type settings — no save needed here
          return true;
        }

        if (target === 'preferences') {
          // Reels UI visibility: apply live (localStorage + event) before the server round-trip.
          syncReelsUiPref(optionId, newValue);
          // Long-tail display preferences: persist verbatim into the JSON blob.
          // Backend merges by key, so a single-option PUT never clobbers others.
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [optionId]: newValue } }),
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save');
          }
          // Composer reads these with a short TTL; drop it so the next publish sees the toggle.
          if (optionId.startsWith('post_default_')) invalidatePostDefaultsCache();
          if (optionId === NAV_ICON_STYLE_LIGHT_PREF_KEY) setNavIconUserPref('light', newValue);
          if (optionId === NAV_ICON_STYLE_DARK_PREF_KEY) setNavIconUserPref('dark', newValue);
          return true;
        }

        if (target === 'glass') {
          const enabled = parseGlassEnabled(newValue);
          storeSetGlassEffects(enabled);
          applyGlassEffectsToDocument(enabled);
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [GLASS_PREF_KEY]: enabled } }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save glass effects');
          }
          return true;
        }

        if (target === 'desktop_header') {
          const enabled = parseDesktopHeaderEnabled(newValue);
          storeSetShowDesktopHeader(enabled);
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [DESKTOP_HEADER_PREF_KEY]: enabled } }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save header setting');
          }
          return true;
        }

        if (target === 'desktop_ai_fab') {
          const enabled = parseDesktopAiFabEnabled(newValue);
          storeSetShowWevAssistant(enabled);
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [DESKTOP_AI_FAB_PREF_KEY]: enabled } }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save AI button setting');
          }
          return true;
        }

        if (target === 'desktop_header_nav_floating') {
          const enabled = parseDesktopHeaderNavFloating(newValue);
          storeSetDesktopHeaderNavFloating(enabled);
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [DESKTOP_HEADER_NAV_FLOATING_PREF_KEY]: enabled } }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save header shortcuts setting');
          }
          return true;
        }

        if (target === 'mobile_nav_transparent') {
          const enabled = parseMobileNavTransparent(newValue);
          storeSetMobileNavTransparent(enabled);
          const style = styleFromLegacyTransparent(enabled);
          setValuesMap((prev) => ({
            ...prev,
            [MOBILE_BOTTOM_NAV_STYLE_PREF_KEY]: mobileBottomNavStyleLabel(style),
          }));
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              preferences: {
                [MOBILE_NAV_TRANSPARENT_PREF_KEY]: enabled,
                [MOBILE_BOTTOM_NAV_STYLE_PREF_KEY]: style,
              },
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save navbar setting');
          }
          return true;
        }

        if (target === 'mobile_bottom_nav_style') {
          const style = parseMobileBottomNavStyle(newValue);
          storeSetMobileBottomNavStyle(style);
          const label = mobileBottomNavStyleLabel(style);
          setValuesMap((prev) => ({
            ...prev,
            [MOBILE_BOTTOM_NAV_STYLE_PREF_KEY]: label,
            [MOBILE_NAV_TRANSPARENT_PREF_KEY]: style === 'transparent',
          }));
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              preferences: {
                [MOBILE_BOTTOM_NAV_STYLE_PREF_KEY]: style,
                [MOBILE_NAV_TRANSPARENT_PREF_KEY]: style === 'transparent',
              },
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save bottom nav style');
          }
          return true;
        }

        if (target === 'reels_bottom_nav') {
          const mode = parseReelsBottomNavMode(newValue);
          storeSetReelsBottomNav(mode);
          const label = reelsBottomNavLabel(mode);
          setValuesMap((prev) => ({ ...prev, [REELS_BOTTOM_NAV_PREF_KEY]: label }));
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [REELS_BOTTOM_NAV_PREF_KEY]: mode } }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save Reels navbar setting');
          }
          return true;
        }

        if (target === 'mobile_top_header') {
          const enabled = parseMobileTopHeaderEnabled(newValue);
          storeSetShowMobileTopHeader(enabled);
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [MOBILE_TOP_HEADER_PREF_KEY]: enabled } }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save mobile header setting');
          }
          return true;
        }

        if (target === 'mobile_top_header_chrome') {
          const chrome = parseMobileTopHeaderChrome(newValue);
          storeSetMobileTopHeaderChrome(chrome);
          const label = mobileTopHeaderChromeLabel(chrome);
          setValuesMap((prev) => ({
            ...prev,
            [MOBILE_TOP_HEADER_CHROME_PREF_KEY]: label,
          }));
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              preferences: { [MOBILE_TOP_HEADER_CHROME_PREF_KEY]: chrome },
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save top header style');
          }
          return true;
        }

        if (target === 'font') {
          if (!isAllowedFontScale(newValue)) throw new Error('Invalid text size');
          storeSetFontScale(newValue);
          applyFontScaleToDocument(newValue);
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ preferences: { [FONT_SCALE_PREF_KEY]: newValue } }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save text size');
          }
          return true;
        }

        if (target === 'accent') {
          if (!isAllowedAccentName(newValue)) throw new Error('Invalid accent color');
          storeSetAccentTheme(newValue);
          applyAccentToDocument(newValue, brandColor || null);
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({
              accentColor: newValue,
              preferences: { [ACCENT_PREF_KEY]: newValue },
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save accent color');
          }
          return true;
        }

        if (target === 'theme') {
          // 1. Update Zustand store (triggers App.tsx DOM class change immediately)
          storeSetTheme(newValue);
          // 2. Persist to DB via profile/theme endpoint
          await fetch('/api/profile/theme', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ theme: newValue }),
          });
          // 3. Also sync to account settings
          await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ theme: newValue }),
          });
          return true;
        }

        if (target === 'profile_theme') {
          const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ profileTheme: getProfileThemeByName(newValue).id }),
          });
          if (!response.ok) throw new Error('Failed to save profile theme');
          return true;
        }

        if (target === 'profile_translation') {
          const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ translationLanguage: newValue }),
          });
          if (!response.ok) throw new Error('Failed to save translation language');
          return true;
        }

        if (target === 'language') {
          // Settings UI uses display labels; i18n + DB need language codes (en, bn, …).
          const langCode = resolveLanguageCode(String(newValue));
          if (!getLanguageByCode(langCode)) {
            throw new Error('Unsupported language');
          }
          // 1. Change i18n language immediately
          await i18n.changeLanguage(langCode);
          // 2. Persist to localStorage (for next reload detection)
          try { localStorage.setItem('language', langCode); } catch { /* ignore */ }
          saveRecentLanguage(langCode);
          // Device-only preference: not saved to the account/database.
          return true;
        }

        if (target === 'account') {
          const fieldName = getAccountField(optionId);
          let payloadValue = newValue;
          if (optionId === 'sec_view_activity_privacy') {
            const v = String(newValue).toLowerCase();
            payloadValue = v === 'public' ? 'public' : v === 'private' ? 'private' : 'limited';
          }
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ [fieldName]: payloadValue }),
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save');
          }
          return true;
        }

        if (target === 'enforced') {
          const e = ENFORCED_OPTIONS[optionId];
          const response = await fetch('/api/settings/account', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ [e.field]: e.toApi(newValue) }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save');
          }
          return true;
        }

        if (target === 'reels') {
          const field = REELS_FIELD[optionId];
          const mapped = REELS_UI_TO_API[optionId]?.[newValue] ?? newValue;
          const response = await fetch('/api/reels/settings', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ [field]: mapped }),
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save');
          }
          saveReelsSettings(token, { [field]: mapped } as any);
          return true;
        }

        if (target === 'student_mode') {
          const response = await fetch('/api/governance/me/student-mode', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ isEnabled: Boolean(newValue) }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            // 403 = guardian-locked; message surfaces via the catch toast + revert.
            throw new Error(err.error || 'Failed to update Student Mode');
          }
          return true;
        }

        if (target === 'notif') {
          const fieldName = getNotifField(optionId);
          const response = await fetch('/api/notifications/preferences', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ [fieldName]: newValue }),
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to save');
          }
          return true;
        }

        return true;
      } catch (err: any) {
        console.error(`[useSettings] Failed to save ${optionId}:`, err);
        // Revert optimistic update on failure
        setValuesMap(prev => ({ ...prev, [optionId]: previousValue }));
        if (optionId === ACCENT_PREF_KEY) {
          storeSetAccentTheme(previousAccent);
          applyAccentToDocument(previousAccent, brandColor || null);
        }
        if (optionId === GLASS_PREF_KEY) {
          storeSetGlassEffects(previousGlass);
          applyGlassEffectsToDocument(previousGlass);
        }
        if (optionId === DESKTOP_HEADER_PREF_KEY) {
          storeSetShowDesktopHeader(previousDesktopHeader);
        }
        if (optionId === DESKTOP_AI_FAB_PREF_KEY) {
          storeSetShowWevAssistant(previousDesktopAiFab);
        }
        if (optionId === DESKTOP_HEADER_NAV_FLOATING_PREF_KEY) {
          storeSetDesktopHeaderNavFloating(previousDesktopHeaderNavFloating);
        }
        if (optionId === MOBILE_NAV_TRANSPARENT_PREF_KEY) {
          storeSetMobileNavTransparent(previousMobileNavTransparent);
        }
        if (optionId === MOBILE_BOTTOM_NAV_STYLE_PREF_KEY) {
          storeSetMobileBottomNavStyle(previousMobileBottomNavStyle);
        }
        if (optionId === REELS_BOTTOM_NAV_PREF_KEY) {
          storeSetReelsBottomNav(previousReelsBottomNav);
        }
        if (optionId === MOBILE_TOP_HEADER_PREF_KEY) {
          storeSetShowMobileTopHeader(previousMobileTopHeader);
        }
        if (optionId === MOBILE_TOP_HEADER_CHROME_PREF_KEY) {
          storeSetMobileTopHeaderChrome(previousMobileTopHeaderChrome);
        }
        if (optionId === FONT_SCALE_PREF_KEY) {
          storeSetFontScale(previousFont);
          applyFontScaleToDocument(previousFont);
        }
        if (optionId === REDUCED_MOTION_PREF_KEY) applyReducedMotionToDocument(previousReducedMotion);
        toast.error(err.message || 'Failed to save setting. Please try again.');
        return false;
      } finally {
        setIsSaving(prev => ({ ...prev, [optionId]: false }));
      }
    },
    [token, storeSetTheme, storeSetAccentTheme, storeSetGlassEffects, storeSetShowDesktopHeader, storeSetShowWevAssistant, storeSetDesktopHeaderNavFloating, storeSetDesktopHeaderNavIds, storeSetMobileNavItems, storeSetMobileNavTransparent, storeSetMobileBottomNavStyle, storeSetReelsBottomNav, storeSetShowMobileTopHeader, storeSetMobileTopHeaderChrome, storeSetMobileTopHeaderStyle, storeSetFontScale, brandColor, i18n]
  );

  return {
    valuesMap,
    isLoading,
    isSaving,
    error,
    saveSetting,
    // Expose setter for action-type settings that handle their own logic
    setLocalValue: (optionId: string, value: any) =>
      setValuesMap(prev => ({ ...prev, [optionId]: value })),
  };
}
