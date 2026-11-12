import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Smartphone, Gift } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import QRCode from 'react-qr-code';
import { useMarketplaceLang } from './useMarketplaceLang';
import { useStorefrontConfig, type StorefrontConfig } from './useStorefrontConfig';

const DEFAULT_SLIDES = [
  {
    id: 1,
    title: "Verified Sellers",
    titleBn: "ভেরিফাইড সেলার",
    subtitle: "Shop with Confidence from Trusted Sellers",
    subtitleBn: "বিশ্বস্ত সেলারদের কাছ থেকে নিশ্চিন্তে কেনাকাটা করুন",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&auto=format&fit=crop",
    cta: "Browse Sellers",
    ctaBn: "সেলার দেখুন",
    link: "/wevmall/sellers",
  },
  {
    id: 2,
    title: "Flash Deals",
    titleBn: "ফ্ল্যাশ ডিল",
    subtitle: "Up to 70% OFF on Top Brands",
    subtitleBn: "সেরা ব্র্যান্ডে ৭০% পর্যন্ত ছাড়",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&auto=format&fit=crop",
    cta: "Shop Now",
    ctaBn: "এখনই কিনুন",
    link: "/wevmall/flash-deals",
  },
  {
    id: 3,
    title: "Free Delivery",
    titleBn: "ফ্রি ডেলিভারি",
    subtitle: "On millions of items across WevMall",
    subtitleBn: "WevMall-এর লক্ষ লক্ষ পণ্যে ফ্রি ডেলিভারি",
    image: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=900&auto=format&fit=crop",
    cta: "Explore",
    ctaBn: "ঘুরে দেখুন",
    link: "/wevmall",
  },
  {
    id: 4,
    title: "WevMall Rewards",
    titleBn: "WevMall রিওয়ার্ড",
    subtitle: "Earn points on every purchase",
    subtitleBn: "প্রতিটি কেনাকাটায় পয়েন্ট অর্জন করুন",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=900&auto=format&fit=crop",
    cta: "View Rewards",
    ctaBn: "রিওয়ার্ড দেখুন",
    link: "/wevmall/rewards",
  },
  {
    id: 5,
    title: "Become a Seller",
    titleBn: "সেলার হিসেবে যোগ দিন",
    subtitle: "Start Your Business on WevMall",
    subtitleBn: "WevMall-এ আপনার ব্যবসা শুরু করুন",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=900&auto=format&fit=crop",
    cta: "Join Now",
    ctaBn: "এখনই যোগ দিন",
    link: "/seller/onboarding",
  }
];

const APP_URL = 'https://wevsoft.com/app';

function getAppLinks(cfg: StorefrontConfig | null) {
  const a = cfg?.appDownload;
  return [
    { label: 'App Store', shortLabel: 'App Store', href: a?.appStoreUrl || 'https://apps.apple.com' },
    { label: 'Google Play', shortLabel: 'Play Store', href: a?.playStoreUrl || 'https://play.google.com' },
    { label: 'AppGallery', shortLabel: 'Huawei', href: a?.huaweiUrl || 'https://appgallery.huawei.com' },
  ];
}

function AppDownloadWidget({ cfg }: { cfg: StorefrontConfig | null }) {
  const { t } = useMarketplaceLang();
  const APP_LINKS = getAppLinks(cfg);
  const voucherEn = cfg?.appDownload?.voucherText || '৳100 Welcome Voucher';
  const voucherBn = cfg?.appDownload?.voucherTextBn || '৳১০০ ওয়েলকাম ভাউচার';
  return (
    <div className="hidden md:flex col-span-1 h-56 lg:h-60 flex-col items-center justify-between rounded-2xl bg-card border border-border p-4 text-center">
      <div>
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-foreground">
          <Smartphone size={16} className="text-primary" />
          {t('WevMall App', 'WevMall অ্যাপ')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{t('Scan to download', 'ডাউনলোড করতে স্ক্যান করুন')}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-lg shrink-0">
          <QRCode value={cfg?.appDownload?.qrUrl || APP_URL} size={96} />
        </div>
        <div className="flex flex-col items-start gap-1 text-left">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-bold">
            <Gift size={12} /> {t(voucherEn, voucherBn)}
          </span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {t('on your first app order', 'অ্যাপে আপনার প্রথম অর্ডারে')}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {APP_LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-foreground text-background px-2.5 py-1 text-[11px] font-semibold hover:opacity-90 transition-opacity"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}

const MarketplaceHero = () => {
  const { t } = useMarketplaceLang();
  const cfg = useStorefrontConfig();
  const slides = cfg?.heroSlides?.length
    ? cfg.heroSlides.map((s) => ({ ...s, titleBn: s.titleBn || s.title, subtitleBn: s.subtitleBn || s.subtitle, ctaBn: s.ctaBn || s.cta }))
    : DEFAULT_SLIDES;
  const showApp = cfg?.appDownload?.enabled !== false;
  const APP_LINKS = getAppLinks(cfg);
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Fewer slides than the current index → back to the first (adjusted during render).
  if (current !== 0 && current >= slides.length) setCurrent(0);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isHovered, slides.length]);

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
        <div
          className={`relative ${showApp ? 'md:col-span-2' : 'md:col-span-3'} w-full h-44 md:h-56 lg:h-60 md:rounded-2xl overflow-hidden bg-card border border-primary/25`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slides[current % slides.length].image})` }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative h-full flex flex-col items-center justify-center text-white p-6 text-center">
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight mb-2">
                  {t(slides[current % slides.length].title, slides[current % slides.length].titleBn)}
                </h2>
                <p className="text-sm md:text-base mb-4 max-w-xl text-white/90">
                  {t(slides[current % slides.length].subtitle, slides[current % slides.length].subtitleBn)}
                </p>
                <a
                  href={slides[current % slides.length].link}
                  className="bg-white text-gray-900 hover:bg-gray-100 px-6 py-2 md:px-7 md:py-2.5 rounded-full text-sm font-semibold transition-colors duration-200"
                >
                  {t(slides[current % slides.length].cta, slides[current % slides.length].ctaBn)}
                </a>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-sm transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-sm transition-all"
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === current ? 'w-6 bg-white' : 'bg-white/50'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {showApp && <AppDownloadWidget cfg={cfg} />}
      </div>

      {/* Mobile: compact app download strip (no QR on mobile) */}
      {showApp && <div className="flex md:hidden items-center justify-between gap-3 px-4 py-2 bg-card border-t border-border">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Smartphone size={14} className="text-primary" />
          {t('Download App', 'অ্যাপ ডাউনলোড করুন')}
        </span>
        <div className="flex items-center gap-1.5">
          {APP_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-primary text-primary-foreground rounded px-2 py-1"
            >
              {l.shortLabel}
            </a>
          ))}
        </div>
      </div>}
    </div>
  );
};

export default MarketplaceHero;
