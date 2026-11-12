export interface LanguageMeta {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
  locale: string;
}

export interface CountryMeta {
  code: string;
  name: string;
  flag: string;
  currency: string;
  defaultLanguage: string;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', locale: 'en-US' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧', locale: 'en-GB' },
  { code: 'bn', name: 'Bangla', nativeName: 'বাংলা', flag: '🇧🇩', locale: 'bn-BD' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', locale: 'hi-IN' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', rtl: true, locale: 'ur-PK' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true, locale: 'ar-SA' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '中文 (简体)', flag: '🇨🇳', locale: 'zh-CN' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文 (台灣)', flag: '🇹🇼', locale: 'zh-TW' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', locale: 'ja-JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', locale: 'ko-KR' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', locale: 'es-ES' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', locale: 'pt-PT' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', locale: 'ru-RU' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', locale: 'tr-TR' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', locale: 'nl-NL' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', locale: 'pl-PL' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', locale: 'uk-UA' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', rtl: true, locale: 'fa-IR' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', locale: 'th-TH' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', locale: 'vi-VN' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', locale: 'id-ID' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', locale: 'ms-MY' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', locale: 'ne-NP' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', flag: '🇲🇲', locale: 'my-MM' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', locale: 'si-LK' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', locale: 'ta-IN' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', locale: 'te-IN' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', locale: 'gu-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', locale: 'mr-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', locale: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', locale: 'ml-IN' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', locale: 'as-IN' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', locale: 'pa-IN' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', flag: '🇮🇳', locale: 'or-IN' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', flag: '🇵🇰', rtl: true, locale: 'sd-PK' },
  { code: 'ks', name: 'Kashmiri', nativeName: 'کٲشُر', flag: '🇮🇳', rtl: true, locale: 'ks-IN' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', flag: '🇮🇩', locale: 'jv-ID' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', flag: '🇮🇩', locale: 'su-ID' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', flag: '🇵🇭', locale: 'fil-PH' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', flag: '🇰🇭', locale: 'km-KH' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', flag: '🇱🇦', locale: 'lo-LA' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', locale: 'af-ZA' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', flag: '🇸🇴', locale: 'so-SO' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', locale: 'sw-KE' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', locale: 'am-ET' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', flag: '🇳🇬', locale: 'ha-NG' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', flag: '🇳🇬', locale: 'yo-NG' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', flag: '🇳🇬', locale: 'ig-NG' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', locale: 'zu-ZA' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', locale: 'xh-ZA' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', locale: 'ro-RO' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', locale: 'cs-CZ' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', locale: 'hu-HU' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', locale: 'sv-SE' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', locale: 'no-NO' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', locale: 'da-DK' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', locale: 'fi-FI' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', locale: 'el-GR' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', rtl: true, locale: 'he-IL' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', flag: '🇦🇿', locale: 'az-AZ' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', flag: '🇪🇸', locale: 'ca-ES' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', flag: '🇪🇪', locale: 'et-EE' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', flag: '🇮🇸', locale: 'is-IS' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', flag: '🇮🇪', locale: 'ga-IE' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', flag: '🇱🇻', locale: 'lv-LV' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', flag: '🇱🇹', locale: 'lt-LT' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', flag: '🇲🇰', locale: 'mk-MK' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', locale: 'sr-RS' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', flag: '🇸🇰', locale: 'sk-SK' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', flag: '🇸🇮', locale: 'sl-SI' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', flag: '🇦🇱', locale: 'sq-AL' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', flag: '🇧🇾', locale: 'be-BY' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', flag: '🇧🇬', locale: 'bg-BG' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', locale: 'hr-HR' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', flag: '🇧🇦', locale: 'bs-BA' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', flag: '🇬🇪', locale: 'ka-GE' },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', flag: '🇦🇲', locale: 'hy-AM' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақ тілі', flag: '🇰🇿', locale: 'kk-KZ' },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbek', flag: '🇺🇿', locale: 'uz-UZ' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', flag: '🇰🇬', locale: 'ky-KG' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', flag: '🇲🇳', locale: 'mn-MN' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', flag: '🇹🇯', locale: 'tg-TJ' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmen', flag: '🇹🇲', locale: 'tk-TM' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', flag: '🇦🇫', rtl: true, locale: 'ps-AF' },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', flag: '🇨🇳', rtl: true, locale: 'ug-CN' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', flag: '🇮🇱', rtl: true, locale: 'yi-001' },
  { code: 'ckb', name: 'Central Kurdish', nativeName: 'کوردیی ناوەندی', flag: '🇮🇶', rtl: true, locale: 'ckb-IQ' },
  { code: 'dv', name: 'Dhivehi', nativeName: 'ދިވެހި', flag: '🇲🇻', rtl: true, locale: 'dv-MV' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', flag: '🇪🇸', locale: 'eu-ES' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', flag: '🇪🇸', locale: 'gl-ES' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', flag: '🇬🇧', locale: 'cy-GB' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', flag: '🇲🇹', locale: 'mt-MT' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl ayisyen', flag: '🇭🇹', locale: 'ht-HT' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', flag: '🇷🇼', locale: 'rw-RW' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', flag: '🇵🇭', locale: 'ceb-PH' },
];

export const SUPPORTED_COUNTRIES: CountryMeta[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', defaultLanguage: 'en' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', defaultLanguage: 'bn' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', defaultLanguage: 'hi' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', defaultLanguage: 'ur' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', currency: 'SAR', defaultLanguage: 'ar' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', defaultLanguage: 'ar' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', currency: 'QAR', defaultLanguage: 'ar' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', currency: 'JOD', defaultLanguage: 'ar' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', defaultLanguage: 'ja' },
  { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', defaultLanguage: 'zh-CN' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', defaultLanguage: 'ko' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', defaultLanguage: 'en' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', defaultLanguage: 'en' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', defaultLanguage: 'en' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', currency: 'EUR', defaultLanguage: 'es' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', currency: 'EUR', defaultLanguage: 'it' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', defaultLanguage: 'de' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', defaultLanguage: 'fr' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', currency: 'NPR', defaultLanguage: 'ne' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', currency: 'MMK', defaultLanguage: 'my' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', defaultLanguage: 'en' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', currency: 'MYR', defaultLanguage: 'ms' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', currency: 'IDR', defaultLanguage: 'id' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', currency: 'THB', defaultLanguage: 'th' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', defaultLanguage: 'vi' },
];

export function getLanguageByCode(code: string): LanguageMeta | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code || lang.code.toLowerCase() === code.toLowerCase());
}

export function isRtlLanguage(code: string): boolean {
  const lang = getLanguageByCode(code);
  return Boolean(lang?.rtl);
}

export function detectInitialLanguage(): string {
  try {
    const stored = localStorage.getItem('language');
    if (stored && getLanguageByCode(stored)) {
      return stored;
    }
    // No browser/phone detection: default is English until the user picks a language on this device.
  } catch (err) {
    console.error('Error detecting initial language:', err);
  }
  return 'en';
}

export function getRecentLanguages(): string[] {
  try {
    const raw = localStorage.getItem('wev_recent_languages');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(c => Boolean(getLanguageByCode(c)));
      }
    }
  } catch (err) {
    console.error('Error parsing recent languages:', err);
  }
  return ['en', 'bn', 'hi', 'ar'];
}

export function saveRecentLanguage(code: string): void {
  try {
    if (!getLanguageByCode(code)) return;
    const current = getRecentLanguages();
    const updated = [code, ...current.filter(c => c !== code)].slice(0, 5);
    localStorage.setItem('wev_recent_languages', JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving recent language:', err);
  }
}

export function getCountry(): string {
  try {
    const stored = localStorage.getItem('wev_user_country');
    if (stored && SUPPORTED_COUNTRIES.some(c => c.code === stored)) {
      return stored;
    }
  } catch (err) {
    console.error('Error checking user country:', err);
  }
  return 'BD';
}

export function setCountry(countryCode: string): void {
  try {
    localStorage.setItem('wev_user_country', countryCode);
  } catch (err) {
    console.error('Error saving user country:', err);
  }
}


/** Display labels used by Settings > Language (must stay in sync with consumerSettingsData). */
export const SETTINGS_LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English (US)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'ar', label: 'Arabic (العربية)' },
];


/** Resolve a settings label, locale tag, or code into a supported language code. */
export function resolveLanguageCode(value: string | null | undefined): string {
  if (!value) return 'en';
  const raw = String(value).trim();
  if (!raw) return 'en';
  const fromLabel = SETTINGS_LANGUAGE_OPTIONS.find(
    (o) => o.label === raw || o.label.toLowerCase() === raw.toLowerCase()
  );
  if (fromLabel) return fromLabel.code;
  const exact = getLanguageByCode(raw);
  if (exact) return exact.code;
  const primary = raw.split(/[-_]/)[0];
  const match = getLanguageByCode(primary);
  return match?.code || 'en';
}

/** Map a language code to the Settings select label when one exists. */
export function languageCodeToSettingsLabel(code: string): string {
  const resolved = resolveLanguageCode(code);
  const opt = SETTINGS_LANGUAGE_OPTIONS.find((o) => o.code === resolved);
  if (opt) return opt.label;
  const meta = getLanguageByCode(resolved);
  return meta ? `${meta.name} (${meta.nativeName})` : resolved;
}

export function applyRtlDOM(code: string): void {
  try {
    const isRtl = isRtlLanguage(code);
    const docEl = document.documentElement;
    docEl.dir = isRtl ? 'rtl' : 'ltr';
    docEl.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    docEl.lang = code;
    if (isRtl) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  } catch (err) {
    console.error('Error applying RTL DOM attributes:', err);
  }
}
