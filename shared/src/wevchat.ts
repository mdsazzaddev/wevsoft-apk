export type ChatThemeJson = {
  color: string;
  defaultReaction: string;
  aiStyleProfile: string;
  bubbleDensity: 'compact' | 'comfortable';
  /** Optional chat wallpaper (gallery upload — mobile UI). Empty = solid/theme color only. */
  wallpaperUrl: string;
};

export type GenerationSettingsJson = {
  enabled: boolean;
  safetyLevel: 'standard' | 'strict';
  groupCreditPool: boolean;
  autoWatermark: boolean;
  defaultAspect: string;
  defaultSecs: number;
  notifyOnAi: boolean;
  notifySoundAi: boolean;
  worldBible: string;
  allowCrossPosting: boolean;
  autoArchiveDrafts: boolean;
};

export type ConversationPermissions = {
  canInvite: boolean;
  canRemoveMember: boolean;
  canPinMessage: boolean;
  canRename: boolean;
  canChangeTheme: boolean;
  canGenerateAi: boolean;
  canDeleteOthersMsg: boolean;
  canApproveMembers: boolean;
};

export type ConversationTopic = {
  id: string;
  label: string;
  color: string;
  isAi: boolean;
};

export type InfoJson = {
  approveNewMembers: boolean;
  autoTranslateLang: string;
  isVaultLocked: boolean;
  topics: ConversationTopic[];
};

export type MemberPrefsJson = {
  permissions: ConversationPermissions;
  mutualGroupsVisible: boolean;
  contributionStatsOptIn: boolean;
  receiptVisibility: 'all' | 'none';
};

export const DEFAULT_CHAT_THEME: ChatThemeJson = {
  color: '#2563eb',
  defaultReaction: '👍',
  aiStyleProfile: '',
  bubbleDensity: 'comfortable',
  wallpaperUrl: '',
};

export const DEFAULT_GENERATION_SETTINGS: GenerationSettingsJson = {
  enabled: true,
  safetyLevel: 'standard',
  groupCreditPool: false,
  autoWatermark: true,
  defaultAspect: '16:9',
  defaultSecs: 5,
  notifyOnAi: true,
  notifySoundAi: true,
  worldBible: '',
  allowCrossPosting: false,
  autoArchiveDrafts: true,
};

export const DEFAULT_INFO_JSON: InfoJson = {
  approveNewMembers: false,
  autoTranslateLang: '',
  isVaultLocked: false,
  topics: [],
};

export const PERMISSION_LABELS: { key: keyof ConversationPermissions; label: string }[] = [
  { key: 'canInvite', label: 'Invite' },
  { key: 'canRemoveMember', label: 'Remove member' },
  { key: 'canPinMessage', label: 'Pin message' },
  { key: 'canRename', label: 'Rename' },
  { key: 'canChangeTheme', label: 'Change theme' },
  { key: 'canGenerateAi', label: 'Generate AI' },
  { key: 'canDeleteOthersMsg', label: 'Delete others’ messages' },
  { key: 'canApproveMembers', label: 'Approve members' },
];

export const CHAT_THEME_SWATCHES = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#16a34a',
  '#0f172a',
  '#0891b2',
  '#ca8a04',
] as const;

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'] as const;

export const TRANSLATE_LANGS = [
  { value: '', label: 'Off' },
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'বাংলা' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'ar', label: 'العربية' },
  { value: 'es', label: 'Español' },
] as const;

export function defaultPermissions(role?: string): ConversationPermissions {
  const admin = role === 'admin';
  return {
    canInvite: admin,
    canRemoveMember: admin,
    canPinMessage: true,
    canRename: admin,
    canChangeTheme: true,
    canGenerateAi: true,
    canDeleteOthersMsg: admin,
    canApproveMembers: admin,
  };
}

export function parsePermissions(raw: unknown, role?: string): ConversationPermissions {
  const base = defaultPermissions(role);
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const next = { ...base };
  (Object.keys(base) as (keyof ConversationPermissions)[]).forEach((key) => {
    if (typeof obj[key] === 'boolean') next[key] = obj[key] as boolean;
  });
  return next;
}

export function parseMemberPrefs(raw: unknown, role?: string): MemberPrefsJson {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    permissions: parsePermissions(obj.permissions, role),
    mutualGroupsVisible: obj.mutualGroupsVisible !== false,
    contributionStatsOptIn: obj.contributionStatsOptIn === true,
    receiptVisibility: obj.receiptVisibility === 'none' ? 'none' : 'all',
  };
}

export function parseTopics(raw: unknown): ConversationTopic[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const obj = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
      const label = typeof obj.label === 'string' ? obj.label.trim() : '';
      if (!label) return null;
      return {
        id: typeof obj.id === 'string' && obj.id ? obj.id : `t-${label}`,
        label: label.slice(0, 40),
        color: typeof obj.color === 'string' && obj.color ? obj.color : '#2563eb',
        isAi: obj.isAi === true,
      };
    })
    .filter((t): t is ConversationTopic => !!t)
    .slice(0, 20);
}

export function parseInfoJson(raw: unknown): InfoJson {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    approveNewMembers: obj.approveNewMembers === true,
    autoTranslateLang: typeof obj.autoTranslateLang === 'string' ? obj.autoTranslateLang : '',
    isVaultLocked: obj.isVaultLocked === true,
    topics: parseTopics(obj.topics),
  };
}

export const DEFAULT_MEMBER_PREFS: MemberPrefsJson = parseMemberPrefs({}, 'member');

export function parseChatTheme(raw: unknown): ChatThemeJson {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const wallpaperRaw =
    typeof obj.wallpaperUrl === 'string'
      ? obj.wallpaperUrl
      : typeof obj.backgroundUrl === 'string'
        ? obj.backgroundUrl
        : '';
  return {
    color: typeof obj.color === 'string' && obj.color ? obj.color : DEFAULT_CHAT_THEME.color,
    defaultReaction: typeof obj.defaultReaction === 'string' && obj.defaultReaction
      ? obj.defaultReaction
      : DEFAULT_CHAT_THEME.defaultReaction,
    aiStyleProfile: typeof obj.aiStyleProfile === 'string' ? obj.aiStyleProfile : '',
    bubbleDensity: obj.bubbleDensity === 'compact' ? 'compact' : 'comfortable',
    wallpaperUrl: wallpaperRaw.trim().slice(0, 2048),
  };
}

export function parseGenerationSettings(raw: unknown): GenerationSettingsJson {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    enabled: obj.enabled !== false,
    safetyLevel: obj.safetyLevel === 'strict' ? 'strict' : 'standard',
    groupCreditPool: obj.groupCreditPool === true,
    autoWatermark: obj.autoWatermark !== false,
    defaultAspect: typeof obj.defaultAspect === 'string' && obj.defaultAspect ? obj.defaultAspect : '16:9',
    defaultSecs: Number.isFinite(Number(obj.defaultSecs)) ? Math.max(1, Number(obj.defaultSecs)) : 5,
    notifyOnAi: obj.notifyOnAi !== false,
    notifySoundAi: obj.notifySoundAi !== false,
    worldBible: typeof obj.worldBible === 'string' ? obj.worldBible.slice(0, 4000) : '',
    allowCrossPosting: obj.allowCrossPosting === true,
    autoArchiveDrafts: obj.autoArchiveDrafts !== false,
  };
}

export function extractMessageLinks(text?: string | null): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi);
  return matches ? Array.from(new Set(matches)) : [];
}
