import { en } from './en';
import { bn } from './bn';
import { hi } from './hi';
import { ar } from './ar';
import { ja } from './ja';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { zhCN, zhTW } from './zh';
import { ur, ko, ru, tr, pt, it, fa, he } from './other';
import { SUPPORTED_LANGUAGES } from '../languages';

type TranslationDict = typeof en;

const specificLocales: Record<string, Partial<TranslationDict>> = {
  en,
  bn,
  hi,
  ar,
  ja,
  es,
  fr,
  de,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  ur,
  ko,
  ru,
  tr,
  pt,
  it,
  fa,
  he,
};

// Generate resource map for i18next covering all supported languages
export const resources: Record<string, { translation: TranslationDict }> = {};

SUPPORTED_LANGUAGES.forEach(meta => {
  const custom = specificLocales[meta.code] || {};
  resources[meta.code] = {
    translation: {
      ...en,
      ...custom,
      // Ensure native title appears properly
      "Current Language": `${meta.nativeName} (${meta.name})`,
    } as TranslationDict
  };
});
