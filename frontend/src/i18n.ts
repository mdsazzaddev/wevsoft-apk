import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './i18n/locales/en';
import { SUPPORTED_LANGUAGES, detectInitialLanguage, applyRtlDOM } from './i18n/languages';

type TranslationDict = typeof en;

const initialLang = detectInitialLanguage();

const initialMeta = SUPPORTED_LANGUAGES.find((m) => m.code === 'en');
const initialResources: Record<string, { translation: TranslationDict }> = {
  en: {
    translation: {
      ...en,
      'Current Language': initialMeta ? `${initialMeta.nativeName} (${initialMeta.name})` : 'English (English)',
    } as TranslationDict,
  },
};

const loadedBundles = new Set<string>(['en']);

async function loadLocaleDict(code: string): Promise<Partial<TranslationDict>> {
  switch (code) {
    case 'en':
      return en;
    case 'bn':
      return (await import('./i18n/locales/bn')).bn;
    case 'hi':
      return (await import('./i18n/locales/hi')).hi;
    case 'ar':
      return (await import('./i18n/locales/ar')).ar;
    case 'ja':
      return (await import('./i18n/locales/ja')).ja;
    case 'es':
      return (await import('./i18n/locales/es')).es;
    case 'fr':
      return (await import('./i18n/locales/fr')).fr;
    case 'de':
      return (await import('./i18n/locales/de')).de;
    case 'zh-CN':
      return (await import('./i18n/locales/zh')).zhCN;
    case 'zh-TW':
      return (await import('./i18n/locales/zh')).zhTW;
    case 'ur':
    case 'ko':
    case 'ru':
    case 'tr':
    case 'pt':
    case 'it':
    case 'fa':
    case 'he': {
      const mod = await import('./i18n/locales/other');
      return (mod as Record<string, Partial<TranslationDict>>)[code] || {};
    }
    default:
      return {};
  }
}

export async function ensureLanguageLoaded(code: string): Promise<void> {
  if (!code || loadedBundles.has(code)) return;
  const meta = SUPPORTED_LANGUAGES.find((m) => m.code === code);
  const custom = await loadLocaleDict(code).catch(() => ({}));
  const merged = {
    ...en,
    ...custom,
    ...(meta ? { 'Current Language': `${meta.nativeName} (${meta.name})` } : {}),
  };
  i18n.addResourceBundle(code, 'translation', merged, true, true);
  loadedBundles.add(code);
}

i18n
  .use(initReactI18next)
  .init({
    resources: initialResources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

const origChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng?: string, callback?: Parameters<typeof i18n.changeLanguage>[1]) => {
  if (lng) {
    await ensureLanguageLoaded(lng);
  }
  return origChangeLanguage(lng, callback);
};

if (initialLang !== 'en') {
  void ensureLanguageLoaded(initialLang).then(() => {
    void origChangeLanguage(initialLang);
  });
}

// Apply RTL and DOM attributes immediately on startup
applyRtlDOM(initialLang);

// Listen to future language changes
i18n.on('languageChanged', (lng) => {
  applyRtlDOM(lng);
});

export default i18n;
