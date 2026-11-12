import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  getLanguageByCode, 
  isRtlLanguage, 
  getCountry, 
  setCountry as saveCountry, 
  applyRtlDOM, 
  saveRecentLanguage,
  SUPPORTED_COUNTRIES
} from '../i18n/languages';
import { useStore } from '../store';

export function getLocaleForLang(langCode?: string): string {
  const code = langCode || localStorage.getItem('language') || 'en';
  const meta = getLanguageByCode(code);
  return meta?.locale || 'en-US';
}

export function formatDate(
  dateInput: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  langCode?: string
): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    const locale = getLocaleForLang(langCode);
    const defaultOptions: Intl.DateTimeFormatOptions = options || {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch (err) {
    console.error('Error formatting date:', err);
    return String(dateInput);
  }
}

export function formatRelativeTime(
  dateInput: Date | string | number,
  langCode?: string
): string {
  try {
    const now = Date.now();
    const target = new Date(dateInput).getTime();
    if (isNaN(target)) return String(dateInput);
    const diffSec = Math.round((target - now) / 1000);
    const locale = getLocaleForLang(langCode);

    if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
      const absDiff = Math.abs(diffSec);
      if (absDiff < 60) {
        return rtf.format(diffSec, 'second');
      } else if (absDiff < 3600) {
        return rtf.format(Math.round(diffSec / 60), 'minute');
      } else if (absDiff < 86400) {
        return rtf.format(Math.round(diffSec / 3600), 'hour');
      } else if (absDiff < 2592000) {
        return rtf.format(Math.round(diffSec / 86400), 'day');
      } else if (absDiff < 31536000) {
        return rtf.format(Math.round(diffSec / 2592000), 'month');
      } else {
        return rtf.format(Math.round(diffSec / 31536000), 'year');
      }
    }
  } catch (err) {
    console.error('Error formatting relative time:', err);
  }
  return formatDate(dateInput, undefined, langCode);
}

export function formatNumber(
  value: number,
  langCode?: string,
  options?: Intl.NumberFormatOptions
): string {
  try {
    const locale = getLocaleForLang(langCode);
    return new Intl.NumberFormat(locale, options).format(value);
  } catch (err) {
    console.error('Error formatting number:', err);
    return String(value);
  }
}

export function formatCurrency(
  value: number,
  currencyCode?: string,
  langCode?: string
): string {
  try {
    const locale = getLocaleForLang(langCode);
    const country = getCountry();
    const matchedCountry = SUPPORTED_COUNTRIES.find(c => c.code === country);
    const currency = currencyCode || matchedCountry?.currency || 'USD';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(value);
  } catch (err) {
    console.error('Error formatting currency:', err);
    return `${currencyCode || '$'}${value}`;
  }
}

export function useL10n() {
  const { t, i18n } = useTranslation();
  const token = useStore(state => state.token);
  const user = useStore(state => state.user);

  const currentLang = i18n.language || localStorage.getItem('language') || 'en';
  const isRTL = isRtlLanguage(currentLang);

  const [countryState, setCountryState] = useState(() => getCountry());

  const changeLanguage = useCallback(async (code: string) => {
    try {
      const meta = getLanguageByCode(code);
      if (!meta) return;
      await i18n.changeLanguage(meta.code);
      applyRtlDOM(meta.code);
      localStorage.setItem('language', meta.code);
      saveRecentLanguage(meta.code);

      // Device-only preference: not saved to the account/database.
    } catch (err) {
      console.error('Error switching language:', err);
    }
  }, [i18n, token, user]);

  const changeCountry = useCallback((countryCode: string) => {
    saveCountry(countryCode);
    setCountryState(countryCode);
  }, []);

  return {
    t,
    currentLang,
    currentCountry: countryState,
    isRTL,
    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => formatDate(date, options, currentLang),
    formatRelativeTime: (date: Date | string | number) => formatRelativeTime(date, currentLang),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => formatNumber(value, currentLang, options),
    formatCurrency: (value: number, currency?: string) => formatCurrency(value, currency, currentLang),
    changeLanguage,
    changeCountry
  };
}
