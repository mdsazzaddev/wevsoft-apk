import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useMemo, useState } from 'react';
import { Check, Search as SearchIcon, X, Globe2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useL10n } from '../../utils/l10n';
import { SUPPORTED_COUNTRIES, getRecentLanguages, type LanguageMeta } from '../../i18n/languages';
import {
  buildListedLanguages,
  filterListedLanguages,
  normalizeLangCode,
  trLabel,
  type ListedLanguage,
} from './languagePickerShared';
import { useValueChanged } from '../../hooks/useValueChanged';

/**
 * In-Settings Language page — full pane on desktop, full page on mobile.
 * Selection saves immediately via useL10n.changeLanguage (localStorage + PUT /api/settings/account).
 */
export default function SettingsLanguagePage() {
  const tr = useSettingsTr();
  const { currentLang, currentCountry, changeLanguage, changeCountry, t } = useL10n();
  const [langSearch, setLangSearch] = useState('');
  const [recentLangCodes, setRecentLangCodes] = useState<string[]>(() => getRecentLanguages());
  const [saving, setSaving] = useState(false);

  const currentCode = normalizeLangCode(currentLang) || 'en';

  const codeChanged = useValueChanged(currentCode);
  if (codeChanged) setRecentLangCodes(getRecentLanguages());

  const listed = useMemo(
    () => buildListedLanguages(currentCode, recentLangCodes),
    [currentCode, recentLangCodes],
  );

  const currentMeta = listed.find((x) => x.lang.code === currentCode)?.lang
    ?? listed[0]?.lang;

  const suggestedRows = useMemo(() => {
    const rows: ListedLanguage[] = [];
    const seen = new Set<string>();
    for (const row of listed) {
      if (row.lang.code === currentCode) continue;
      if (row.tag === 'Suggested' || row.tag === 'Recent') {
        if (seen.has(row.lang.code)) continue;
        seen.add(row.lang.code);
        rows.push(row);
      }
    }
    return rows.slice(0, 6);
  }, [listed, currentCode]);

  const allRows = useMemo(() => {
    const q = langSearch.trim();
    if (q) return filterListedLanguages(listed, q);
    return listed
      .filter((x) => x.tag === null)
      .slice()
      .sort((a, b) => a.lang.nativeName.localeCompare(b.lang.nativeName, undefined, { sensitivity: 'base' }));
  }, [listed, langSearch]);

  const handleSelect = async (lang: LanguageMeta) => {
    if (lang.code === currentCode || saving) return;
    setSaving(true);
    try {
      await changeLanguage(lang.code);
      setRecentLangCodes(getRecentLanguages());
      toast.success(
        `${trLabel(t, 'LanguageChangedSuccess', 'Language updated successfully to')} ${lang.nativeName}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (row: ListedLanguage) => {
    const { lang, tag } = row;
    const isCurrent = lang.code === currentCode;
    return (
      <button
        key={lang.code}
        type="button"
        disabled={saving}
        onClick={() => void handleSelect(lang)}
        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-colors ${
          isCurrent ? 'bg-primary/10 ring-1 ring-primary/25' : 'hover:bg-muted/70 active:bg-muted'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm text-foreground truncate">{lang.nativeName}</span>
            {lang.rtl && (
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-300">
                RTL
              </span>
            )}
          </div>
          <div className="text-[12px] text-muted-foreground truncate mt-0.5">
            {lang.name}
            {tag === 'Recent' ? ` · ${trLabel(t, 'Recent', 'Recent')}` : ''}
            {tag === 'Suggested' ? ` · ${trLabel(t, 'Suggested', 'Suggested')}` : ''}
          </div>
        </div>
        {isCurrent && (
          <Check size={18} className="shrink-0 text-[#0866FF]" strokeWidth={2.75} aria-hidden />
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="px-0.5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
            <Globe2 size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {trLabel(t, 'Language', 'Language')}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-snug">
              {trLabel(
                t,
                'LanguagePageSubtitle',
                'Choose how Wevsoft looks and sounds across the app. Changes apply instantly.',
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Current language card */}
      {currentMeta && (
        <section className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            {trLabel(t, 'Current Language', 'Current language')}
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground truncate">{currentMeta.nativeName}</span>
                {currentMeta.rtl && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-300">
                    RTL
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">{currentMeta.name}</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#0866FF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
              <Check size={18} strokeWidth={2.75} />
            </div>
          </div>
        </section>
      )}

      {/* Search */}
      <div className="relative">
        <SearchIcon
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="search"
          value={langSearch}
          onChange={(e) => setLangSearch(e.target.value)}
          placeholder={trLabel(t, 'SearchLanguages', 'Search languages')}
          className="w-full bg-card border border-border rounded-full pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/35"
        />
        {langSearch && (
          <button
            type="button"
            onClick={() => setLangSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label={trLabel(t, 'Clear', 'Clear')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Suggested (hidden while searching) */}
      {!langSearch.trim() && suggestedRows.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-2 shadow-sm">
          <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {trLabel(t, 'Suggested', 'Suggested')}
          </div>
          <div className="space-y-0.5">
            {suggestedRows.map(renderRow)}
          </div>
        </section>
      )}

      {/* All / search results */}
      <section className="bg-card border border-border rounded-2xl p-2 shadow-sm">
        <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {langSearch.trim()
            ? trLabel(t, 'SearchResults', 'Search results')
            : trLabel(t, 'AllLanguages', 'All languages')}
        </div>
        <div className="space-y-0.5 max-h-[min(52vh,520px)] overflow-y-auto overscroll-contain pr-0.5">
          {allRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground px-4">
              {trLabel(t, 'NoMatchingLanguage', `No matching language found for "${langSearch}".`)}
            </div>
          ) : (
            allRows.map(renderRow)
          )}
        </div>
      </section>

      {/* Region */}
      <section className="bg-card border border-border rounded-2xl p-4 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {trLabel(t, 'Country & Region', 'Region & formatting')}
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-snug">
          {trLabel(
            t,
            'RegionFormattingHelp',
            'Used for dates, numbers, and currency formatting — independent of UI language.',
          )}
        </p>
        <select
          value={currentCountry}
          onChange={(e) => changeCountry(e.target.value)}
          className="w-full bg-muted/50 border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/35 cursor-pointer"
        >
          {SUPPORTED_COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag} {country.name} ({country.currency})
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
