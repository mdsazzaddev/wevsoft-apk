import {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
  getRecentLanguages,
  type LanguageMeta,
} from '../../i18n/languages';

export type LangTag = 'Recent' | 'Suggested' | null;

export interface ListedLanguage {
  lang: LanguageMeta;
  tag: LangTag;
}

/** i18next returns the key itself when missing — treat that as a miss so fallbacks work. */
export function trLabel(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  return !value || value === key ? fallback : value;
}

export function normalizeLangCode(code: string | null | undefined): string {
  if (!code) return '';
  const meta = getLanguageByCode(code) || getLanguageByCode(String(code).split(/[-_]/)[0]);
  return meta?.code || '';
}

export function buildSuggestedCodes(recentSet: Set<string>, currentCode: string, limit = 12): string[] {
  const preferred = ['bn', 'en', 'hi', 'ar', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'de', 'ur', 'ru'];
  const fromNav: string[] = [];
  try {
    const nav = (typeof navigator !== 'undefined' && navigator.languages?.length
      ? navigator.languages
      : [typeof navigator !== 'undefined' ? navigator.language : 'en']) as string[];
    for (const entry of nav) {
      const code = normalizeLangCode(entry);
      if (code) fromNav.push(code);
    }
  } catch {
    /* ignore */
  }

  const out: string[] = [];
  const seen = new Set<string>();
  for (const code of [...preferred, ...fromNav]) {
    if (!code || seen.has(code) || recentSet.has(code) || code === currentCode) continue;
    if (!getLanguageByCode(code)) continue;
    seen.add(code);
    out.push(code);
    if (out.length >= limit) break;
  }
  return out;
}

/** Current + recent first (Recent), then suggested, then the rest A–Z by nativeName. */
export function buildListedLanguages(
  currentCode: string,
  recentLangCodes: string[] = getRecentLanguages(),
): ListedLanguage[] {
  const recentOrdered: string[] = [];
  const recentSet = new Set<string>();

  const pushRecent = (code: string) => {
    const normalized = normalizeLangCode(code);
    if (!normalized || recentSet.has(normalized) || !getLanguageByCode(normalized)) return;
    recentSet.add(normalized);
    recentOrdered.push(normalized);
  };

  pushRecent(currentCode);
  for (const code of recentLangCodes) pushRecent(code);

  const suggestedCodes = buildSuggestedCodes(recentSet, currentCode);
  const head: ListedLanguage[] = [];
  for (const code of recentOrdered) {
    const lang = getLanguageByCode(code);
    if (lang) head.push({ lang, tag: 'Recent' });
  }
  for (const code of suggestedCodes) {
    const lang = getLanguageByCode(code);
    if (lang) head.push({ lang, tag: 'Suggested' });
  }

  const used = new Set([...recentOrdered, ...suggestedCodes]);
  const rest = SUPPORTED_LANGUAGES
    .filter((lang) => !used.has(lang.code))
    .slice()
    .sort((a, b) => a.nativeName.localeCompare(b.nativeName, undefined, { sensitivity: 'base' }))
    .map((lang) => ({ lang, tag: null as LangTag }));

  return [...head, ...rest];
}

export function filterListedLanguages(listed: ListedLanguage[], query: string): ListedLanguage[] {
  const q = query.trim().toLowerCase();
  if (!q) return listed;
  return listed.filter(
    ({ lang }) =>
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q),
  );
}
