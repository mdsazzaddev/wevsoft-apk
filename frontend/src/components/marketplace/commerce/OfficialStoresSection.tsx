import React, { useState, useEffect } from 'react';
import { Store, ShieldCheck, Award, Star, Users, ArrowRight, CheckCircle2, RotateCcw, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { marketFetch } from './utils';
import { useStore } from '../../../store';
import { useMarketplaceLang } from './useMarketplaceLang';

export interface OfficialBrandStore {
  id: string;
  name: string;
  slug: string;
  categoryEn: string;
  categoryBn: string;
  logo: string;
  banner: string;
  rating: number;
  totalSales: number;
  followers: number;
  featuredProduct: string;
  authenticGuarantee: boolean;
  freeReturnDays: number;
}

const CURATED_OFFICIAL_STORES: OfficialBrandStore[] = [
  {
    id: 'store-walton-flagship',
    name: 'Walton Official Store',
    slug: 'walton-official',
    categoryEn: 'Electronics & Appliances',
    categoryBn: 'ইলেকট্রনিক্স ও হোম অ্যাপ্লায়েন্স',
    logo: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&auto=format&fit=crop&q=80',
    rating: 4.9,
    totalSales: 12450,
    followers: 84200,
    featuredProduct: 'Walton Non-Frost Inverter Refrigerator & 4K Smart TVs',
    authenticGuarantee: true,
    freeReturnDays: 14,
  },
  {
    id: 'store-unilever-bd',
    name: 'Unilever Bangladesh',
    slug: 'unilever-bangladesh',
    categoryEn: 'Beauty & Daily Hygiene',
    categoryBn: 'সৌন্দর্য ও দৈনন্দিন হাইজিন',
    logo: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    rating: 4.9,
    totalSales: 28900,
    followers: 112000,
    featuredProduct: 'Dove, Sunsilk, Lifebuoy & Vaseline Genuine Range',
    authenticGuarantee: true,
    freeReturnDays: 14,
  },
  {
    id: 'store-marico-flagship',
    name: 'Marico Bangladesh Flagship',
    slug: 'marico-bangladesh',
    categoryEn: 'Hair & Skin Wellness',
    categoryBn: 'হেয়ার ও স্কিন ওয়েলনেস',
    logo: 'https://images.unsplash.com/photo-1608248597359-0a672a08fceb?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1519735777090-ec97162dc266?w=600&auto=format&fit=crop&q=80',
    rating: 4.8,
    totalSales: 19400,
    followers: 65400,
    featuredProduct: 'Parachute Coconut Oil & Studio X Men Grooming',
    authenticGuarantee: true,
    freeReturnDays: 14,
  },
  {
    id: 'store-apex-footwear',
    name: 'Apex Footwear Flagship',
    slug: 'apex-footwear',
    categoryEn: 'Premium Leather Shoes',
    categoryBn: 'প্রিমিয়াম লেদার ফুটওয়্যার',
    logo: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
    rating: 4.8,
    totalSales: 15300,
    followers: 78100,
    featuredProduct: 'Venturini, Maverick & Sprint Leather Footwear',
    authenticGuarantee: true,
    freeReturnDays: 14,
  },
  {
    id: 'store-xiaomi-authorized',
    name: 'Xiaomi Authorized Flagship',
    slug: 'xiaomi-authorized',
    categoryEn: 'Smartphones & Smart Devices',
    categoryBn: 'স্মার্টফোন ও স্মার্ট গ্যাজেটস',
    logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
    rating: 4.9,
    totalSales: 34100,
    followers: 145000,
    featuredProduct: 'Redmi Note Series, TWS Buds & Smart Bands',
    authenticGuarantee: true,
    freeReturnDays: 14,
  },
  {
    id: 'store-bata-bangladesh',
    name: 'Bata Bangladesh',
    slug: 'bata-bangladesh',
    categoryEn: 'Family Footwear & Bags',
    categoryBn: 'ফ্যামিলি জুতো ও এক্সেসরিজ',
    logo: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&auto=format&fit=crop&q=80',
    banner: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
    rating: 4.8,
    totalSales: 22000,
    followers: 92300,
    featuredProduct: 'Power Sneakers, Comfit Comfort & Marie Claire',
    authenticGuarantee: true,
    freeReturnDays: 14,
  },
];

export default function OfficialStoresSection() {
  const { t, formatNum } = useMarketplaceLang();
  const [stores, setStores] = useState<OfficialBrandStore[]>(CURATED_OFFICIAL_STORES);
  const token = useStore((s) => s.token);

  useEffect(() => {
    let isMounted = true;
    marketFetch('/api/marketplace/official-stores', token)
      .then((data) => {
        if (!isMounted) return;
        const apiStores = Array.isArray(data) ? data : data.stores || [];
        if (apiStores.length > 0) {
          setStores(apiStores);
        }
      })
      .catch(() => {
        marketFetch('/api/marketplace/feed/popular-stores?limit=8', token)
          .then((data) => {
            if (!isMounted) return;
            const apiStores = Array.isArray(data) ? data : data.stores || [];
            if (apiStores.length > 0) {
              const merged = CURATED_OFFICIAL_STORES.map((c, idx) => {
                const match = apiStores[idx];
                if (!match) return c;
                return {
                  ...c,
                  name: match.shopName || match.name || c.name,
                  slug: match.shopSlug || match.slug || c.slug,
                  rating: Number(match.rating || c.rating),
                  totalSales: Number(match.totalSales || c.totalSales),
                  followers: Number(match.followersCount ?? match.followers ?? c.followers),
                  logo: match.logo || c.logo,
                };
              });
              setStores(merged);
            }
          })
          .catch(() => {});
      });
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section id="js_officialStores" className="w-full py-4">
      {/* Official Mall Banner (DarazMall Parity) */}
      <div className="rounded-2xl border border-amber-500/30 bg-card p-4 sm:p-6 shadow-sm overflow-hidden relative">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 shadow-sm">
                <Award size={18} />
              </span>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                {t('WevMall Official Stores', 'উইভমল অফিসিয়াল স্টোরস')}
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
                  DarazMall Parity
                </span>
              </h2>
            </div>
            {/* Guarantees Pill Strip */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-500">
                <CheckCircle2 size={13} />
                {t('100% Authentic Guaranteed', '১০০% আসল পণ্য গ্যারান্টি')}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                <RotateCcw size={13} />
                {t('14 Days Free Return', '১৪ দিনের সহজ ফ্রি রিটার্ন')}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <Truck size={13} />
                {t('Fast Nation-wide Shipping', 'দ্রুততম দেশব্যাপী ডেলিভারি')}
              </span>
            </div>
          </div>

          <Link
            to="/wevmall/sellers"
            className="self-start sm:self-auto shrink-0 px-4 py-2 rounded-xl border border-primary text-xs sm:text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground flex items-center gap-1.5 group transition-colors whitespace-nowrap"
          >
            {t('SHOP ALL BRAND STORES', 'সকল ব্র্যান্ড স্টোর দেখুন')}
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Brand Stores Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Link
              key={store.id}
              to={`/shop/${store.slug}`}
              className="group rounded-xl border border-border hover:border-amber-500/60 bg-muted/20 hover:bg-muted/40 p-3.5 transition-all duration-300 flex flex-col justify-between hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-card border border-border group-hover:border-amber-500/50 flex items-center justify-center shrink-0 shadow-sm">
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {store.name}
                      </h3>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-500 text-[9px] font-black uppercase shrink-0">
                        Mall
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {t(store.categoryEn, store.categoryBn)}
                    </p>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-card border border-border/60 text-[11px] text-muted-foreground line-clamp-1 mb-3">
                  <span className="font-bold text-foreground">{t('Featured: ', 'সেরা পণ্য: ')}</span>
                  {store.featuredProduct}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 font-bold text-amber-500">
                    <Star size={12} className="fill-amber-500" />
                    {formatNum(store.rating.toFixed(1))}
                  </span>
                  <span>
                    {formatNum(store.followers)} {t('Followers', 'অনুসারী')}
                  </span>
                </div>
                <span className="font-bold text-primary group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 text-xs">
                  {t('Visit Store →', 'স্টোর দেখুন →')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
