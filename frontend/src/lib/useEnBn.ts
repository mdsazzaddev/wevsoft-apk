import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/** Bilingual helper: t(en, bn) picks the string for the current app language. */
export function useEnBn() {
  const { i18n } = useTranslation();
  const lang = String(i18n?.resolvedLanguage || i18n?.language || 'en');
  const isBn = lang.startsWith('bn');
  const t = useCallback((en: string, bn: string) => (isBn ? bn : en), [isBn]);
  return { t, isBn };
}