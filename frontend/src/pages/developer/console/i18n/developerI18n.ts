import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../../../i18n';
import en from './en';

/**
 * Lazy "developer" i18n namespace (Phase 2 P2-7, A11). English ships with the console;
 * other languages load on demand and follow the global language setting (i18n.language).
 */
export const DEVELOPER_NS = 'developer';

const LOADERS: Record<string, () => Promise<{ default: Record<string, string> }>> = {
  bn: () => import('./bn'),
};

export function baseLanguage(lng: string | undefined): string {
  return (lng || 'en').toLowerCase().split(/[-_]/)[0] || 'en';
}

export async function loadDeveloperStrings(lng: string | undefined): Promise<void> {
  const code = baseLanguage(lng);
  if (!i18n.hasResourceBundle('en', DEVELOPER_NS)) i18n.addResourceBundle('en', DEVELOPER_NS, en, true, false);
  const load = LOADERS[code];
  if (!load || i18n.hasResourceBundle(code, DEVELOPER_NS)) return;
  const mod = await load();
  i18n.addResourceBundle(code, DEVELOPER_NS, mod.default, true, false);
}

/** useTranslation for console strings; ensures the bundle for the current language is loaded. */
export function useDevT() {
  const { t, i18n: inst } = useTranslation(DEVELOPER_NS);
  useEffect(() => {
    void loadDeveloperStrings(inst.language);
  }, [inst.language]);
  return t;
}

void loadDeveloperStrings(i18n.language);
