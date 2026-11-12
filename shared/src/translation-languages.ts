/**
 * Central supported translation languages.
 * Do not hard-code language lists in UI components — import from here.
 */

export type TranslationLanguageCode =
  | 'bn'
  | 'en'
  | 'hi'
  | 'ur'
  | 'ar'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'tr'
  | 'it'
  | 'nl'
  | 'id'
  | 'ms';

export interface TranslationLanguage {
  code: TranslationLanguageCode;
  name: string;
  nativeName: string;
}

export const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { code: 'bn', name: 'Bangla', nativeName: 'বাংলা' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
];

const BY_CODE = new Map(TRANSLATION_LANGUAGES.map((l) => [l.code, l]));
const BY_NAME = new Map(
  TRANSLATION_LANGUAGES.flatMap((l) => [
    [l.name.toLowerCase(), l],
    [l.nativeName.toLowerCase(), l],
    [l.code, l],
  ]),
);

/** Aliases users / legacy settings may send. */
const ALIASES: Record<string, TranslationLanguageCode> = {
  bangla: 'bn',
  bengali: 'bn',
  'বাংলা': 'bn',
  english: 'en',
  hindi: 'hi',
  urdu: 'ur',
  arabic: 'ar',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  portuguese: 'pt',
  russian: 'ru',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  turkish: 'tr',
  italian: 'it',
  dutch: 'nl',
  indonesian: 'id',
  malay: 'ms',
  auto: 'en',
  default: 'en',
};

export function isSupportedLanguageCode(code: string): code is TranslationLanguageCode {
  return BY_CODE.has(code as TranslationLanguageCode);
}

export function resolveLanguageCode(input?: string | null): TranslationLanguageCode | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  if (BY_CODE.has(lower as TranslationLanguageCode)) return lower as TranslationLanguageCode;
  const byName = BY_NAME.get(lower);
  return byName?.code ?? null;
}

export function languageDisplayName(code: string): string {
  const resolved = resolveLanguageCode(code);
  if (!resolved) return code;
  return BY_CODE.get(resolved)?.name || code;
}

export const TRANSLATION_QUALITY_MODES = ['fast', 'balanced', 'natural'] as const;
export type TranslationQualityMode = (typeof TRANSLATION_QUALITY_MODES)[number];

export const TRANSLATION_AUTO_MODES = ['off', 'on', 'ask'] as const;
export type TranslationAutoMode = (typeof TRANSLATION_AUTO_MODES)[number];

export const TRANSLATION_PROVIDER_MODES = ['wevsoft', 'my_api', 'automatic'] as const;
export type TranslationProviderMode = (typeof TRANSLATION_PROVIDER_MODES)[number];

export const TRANSLATION_CONTENT_TYPES = [
  'MESSAGE',
  'POST',
  'COMMENT',
  'REPLY',
  'CAPTION',
  'BIO',
  'OTHER',
] as const;
export type TranslationContentType = (typeof TRANSLATION_CONTENT_TYPES)[number];
