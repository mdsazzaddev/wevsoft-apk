import { useCallback, useEffect, useState } from 'react';

export type MarketplaceLang = 'en' | 'bn';

const STORAGE_KEY = 'wevmall_lang';
const EVENT_NAME = 'wevmall-lang-change';

const CATEGORY_BN_MAP: Record<string, string> = {
  all: 'সকল বিভাগ',
  books: 'বই ও স্টেশনারি',
  electronics: 'ইলেকট্রনিক্স',
  clothing: 'পোশাক ও গার্মেন্টস',
  fashion: 'ফ্যাশন ও স্টাইল',
  accessories: 'এক্সেসরিজ ও ঘড়ি',
  services: 'পেশাদার সার্ভিস',
  digital: 'ডিজিটাল পণ্য',
  vehicles: 'যানবাহন ও বাইক',
  property: 'প্রপার্টি ও ফ্ল্যাট',
  gaming: 'গেমিং ও কনসোল',
  education: 'শিক্ষা ও কোর্স',
  jobs: 'চাকরি ও ক্যারিয়ার',
  'home-living': 'হোম ও লাইফস্টাইল',
  home: 'হোম ও লাইফস্টাইল',
  sports: 'স্পোর্টস ও ফিটনেস',
  agriculture: 'কৃষি ও যন্ত্রপাতি',
  animals: 'পোষা প্রাণী ও পাখি',
  others: 'অন্যান্য',
  phones: 'স্মার্টফোন',
  beauty: 'বিউটি ও স্কিনকেয়ার',
  wearables: 'স্মার্টওয়াচ',
  audio: 'অডিও ও হেডফোন',
};

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function readStoredMarketplaceLang(): MarketplaceLang {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}

export function writeStoredMarketplaceLang(lang: MarketplaceLang): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent<MarketplaceLang>(EVENT_NAME, { detail: lang }));
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export function useMarketplaceLang() {
  const [lang, setLangState] = useState<MarketplaceLang>(() => readStoredMarketplaceLang());

  useEffect(() => {
    const handleLangEvent = (e: Event) => {
      const custom = e as CustomEvent<MarketplaceLang>;
      if (custom.detail === 'en' || custom.detail === 'bn') {
        setLangState(custom.detail);
      } else {
        setLangState(readStoredMarketplaceLang());
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setLangState(readStoredMarketplaceLang());
      }
    };
    window.addEventListener(EVENT_NAME, handleLangEvent);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleLangEvent);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setLang = useCallback((next: MarketplaceLang) => {
    setLangState(next);
    writeStoredMarketplaceLang(next);
  }, []);

  const toggleLang = useCallback(() => {
    const next: MarketplaceLang = lang === 'en' ? 'bn' : 'en';
    setLang(next);
  }, [lang, setLang]);

  const t = useCallback(
    (en: string, bn: string): string => (lang === 'bn' ? bn : en),
    [lang],
  );

  const tCategory = useCallback(
    (nameOrSlug: string): string => {
      if (lang !== 'bn') return nameOrSlug;
      const key = String(nameOrSlug || '').trim().toLowerCase();
      return CATEGORY_BN_MAP[key] || nameOrSlug;
    },
    [lang],
  );

  const formatNum = useCallback(
    (value: string | number): string => (lang === 'bn' ? toBanglaDigits(value) : String(value)),
    [lang],
  );

  return {
    lang,
    isBn: lang === 'bn',
    setLang,
    toggleLang,
    t,
    tCategory,
    formatNum,
  };
}
