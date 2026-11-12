import { useEffect, useState } from 'react';

/**
 * Admin-controlled WevMall storefront config (Admin → Marketplace → Storefront Settings).
 * Fetched once per page load from the public endpoint and shared across components.
 * Returns null until loaded (or when the request fails) — callers must fall back to built-in defaults.
 */
export type StorefrontHeroSlide = {
  title: string; titleBn?: string; subtitle: string; subtitleBn?: string; cta: string; ctaBn?: string; link: string; image: string;
};

export type StorefrontConfig = {
  heroSlides: StorefrontHeroSlide[];
  promoBanner: { enabled: boolean; text: string; textBn: string; link: string; bgColor: string };
  sectionOrder: string[];
  categoryPins: string[];
  appDownload: { enabled: boolean; qrUrl: string; appStoreUrl: string; playStoreUrl: string; huaweiUrl: string; voucherText: string; voucherTextBn: string };
  widgets: { voucherPillEnabled: boolean; voucherCoins: number; voucherText: string; voucherTextBn: string; dailyCheckInEnabled: boolean; liftDockEnabled: boolean; hoverCartEnabled: boolean };
};

let cached: StorefrontConfig | null = null;
let inflight: Promise<StorefrontConfig | null> | null = null;
const listeners = new Set<(c: StorefrontConfig | null) => void>();

function loadStorefrontConfig(): Promise<StorefrontConfig | null> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch('/api/marketplace/storefront-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        cached = data && typeof data === 'object' ? (data as StorefrontConfig) : null;
        listeners.forEach((fn) => fn(cached));
        return cached;
      })
      .catch(() => null)
      .finally(() => {
        if (!cached) inflight = null;
      });
  }
  return inflight;
}

export function useStorefrontConfig(): StorefrontConfig | null {
  const [cfg, setCfg] = useState<StorefrontConfig | null>(cached);
  useEffect(() => {
    listeners.add(setCfg);
    if (!cached) void loadStorefrontConfig();
    return () => {
      listeners.delete(setCfg);
    };
  }, []);
  return cfg;
}