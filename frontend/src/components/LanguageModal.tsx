import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Search as SearchIcon, Check, X } from 'lucide-react';
import { useL10n } from '../utils/l10n';
import {
  SUPPORTED_COUNTRIES,
  getRecentLanguages,
  type LanguageMeta,
} from '../i18n/languages';
import toast from 'react-hot-toast';
import { useOverlayBack } from '../hooks/useOverlayBack';
import {
  buildListedLanguages,
  filterListedLanguages,
  normalizeLangCode,
  trLabel,
} from './settings/languagePickerShared';
import { useValueChanged } from '../hooks/useValueChanged';

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ isOpen, onClose }) => {
  useOverlayBack(isOpen, onClose);
  const { currentLang, currentCountry, changeLanguage, changeCountry, t } = useL10n();
  const [langSearch, setLangSearch] = useState('');
  const [recentLangCodes, setRecentLangCodes] = useState<string[]>(() => getRecentLanguages());

  const currentCode = normalizeLangCode(currentLang) || 'en';

  // Opening the modal → fresh recents + empty search (adjusted during render).
  const openChanged = useValueChanged(isOpen);
  if (openChanged && isOpen) {
    setRecentLangCodes(getRecentLanguages());
    setLangSearch('');
  }

  const handleLanguageSelect = async (lang: LanguageMeta) => {
    await changeLanguage(lang.code);
    setRecentLangCodes(getRecentLanguages());
    toast.success(
      `${trLabel(t, 'LanguageChangedSuccess', 'Language updated successfully to')} ${lang.nativeName}`,
    );
    onClose();
  };

  const listed = useMemo(
    () => buildListedLanguages(currentCode, recentLangCodes),
    [recentLangCodes, currentCode],
  );

  const filtered = useMemo(
    () => filterListedLanguages(listed, langSearch),
    [listed, langSearch],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/25"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={trLabel(t, 'Select Language', 'Wevsoft language')}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed z-10 top-14 right-3 max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2 max-sm:top-16 w-[min(92vw,360px)] max-h-[80vh] bg-card text-card-foreground rounded-2xl shadow-xl border border-border/60 flex flex-col overflow-hidden"
          >
            <div className="flex items-center gap-1 px-2 pt-2.5 pb-1.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-foreground hover:bg-muted transition-colors"
                aria-label={trLabel(t, 'Back', 'Back')}
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-bold text-[17px] text-foreground leading-tight pr-2">
                {trLabel(t, 'Select Language', 'Wevsoft language')}
              </h3>
            </div>

            <div className="px-3 pb-2 shrink-0">
              <div className="relative">
                <SearchIcon
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="search"
                  placeholder={trLabel(t, 'SearchLanguages', 'Search languages')}
                  value={langSearch}
                  onChange={(e) => setLangSearch(e.target.value)}
                  className="w-full bg-muted rounded-full border-0 pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                {langSearch && (
                  <button
                    type="button"
                    onClick={() => setLangSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60"
                    aria-label={trLabel(t, 'Clear', 'Clear')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1">
              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground px-4">
                  {trLabel(t, 'NoMatchingLanguage', `No matching language found for "${langSearch}".`)}
                </div>
              )}
              {filtered.map(({ lang, tag }) => {
                const isCurrent = lang.code === currentCode;
                const mid = '\u00b7';
                const sub =
                  tag === 'Recent'
                    ? `${lang.name} ${mid} ${trLabel(t, 'Recent', 'Recent')}`
                    : tag === 'Suggested'
                      ? `${lang.name} ${mid} ${trLabel(t, 'Suggested', 'Suggested')}`
                      : lang.name;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => void handleLanguageSelect(lang)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-foreground truncate leading-snug">
                        {lang.nativeName}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate leading-snug mt-0.5">
                        {sub}
                      </div>
                    </div>
                    {isCurrent && (
                      <Check size={18} className="shrink-0 text-[#0866FF]" strokeWidth={2.75} aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="shrink-0 border-t border-border/70 px-3 py-2 bg-muted/20">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="shrink-0 font-medium">{trLabel(t, 'Country & Region', 'Region')}</span>
                <select
                  value={currentCountry}
                  onChange={(e) => changeCountry(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent border-0 text-xs text-foreground font-medium focus:outline-none focus:ring-0 py-1 cursor-pointer"
                >
                  {SUPPORTED_COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
