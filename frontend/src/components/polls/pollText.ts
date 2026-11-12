import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/** Bilingual helper for poll UI: t(en, bn). Follows the app language. */
export function usePollT() {
  const { i18n } = useTranslation();
  const lang = String(i18n?.resolvedLanguage || i18n?.language || 'en');
  const isBn = lang.startsWith('bn');
  const t = useCallback((en: string, bn: string) => (isBn ? bn : en), [isBn]);
  return { t, isBn };
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export function localNum(n: number, isBn: boolean): string {
  const s = String(n);
  return isBn ? s.replace(/\d/g, d => BN_DIGITS[Number(d)]) : s;
}