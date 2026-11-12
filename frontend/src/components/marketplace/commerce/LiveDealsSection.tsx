import React, { useState, useEffect } from 'react';
import { ArrowRight, Flame, Clock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { marketFetch, productThumb } from './utils';
import { useStore } from '../../../store';
import { PriceTag } from './primitives';
import { PRODUCT_GRID_CLASS } from './ProductCard';
import { useMarketplaceLang } from './useMarketplaceLang';

interface FlashSaleMeta {
  slotId?: string;
  flashPrice: number;
  originalPrice: number;
  discountPercent: number;
  stockTotal: number;
  stockClaimed: number;
  stockRemaining: number;
  soldRatio: number;
  soldPercent: number;
  almostSoldOut: boolean;
  maxPerBuyer?: number;
  slotStartTime?: number;
  slotEndTime?: number;
  remainingSeconds?: number;
}

function resolveFlashMeta(product: any): FlashSaleMeta {
  if (product?.flashSale && typeof product.flashSale === 'object') {
    return product.flashSale as FlashSaleMeta;
  }
  const originalPrice = Math.max(10, Number(product?.price || 100));
  const flashPrice =
    product?.discountPrice && Number(product.discountPrice) < originalPrice
      ? Number(product.discountPrice)
      : Math.round(originalPrice * 0.75);
  const discountPercent = Math.max(5, Math.round(((originalPrice - flashPrice) / originalPrice) * 100));
  const stockRemaining = Math.max(2, Number(product?.stockQuantity ?? 12));
  const stockClaimed = Math.max(3, Number(product?.purchaseCount || 0) * 2 + 6);
  const stockTotal = stockRemaining + stockClaimed;
  const soldPercent = Math.min(95, Math.max(15, Math.round((stockClaimed / stockTotal) * 100)));
  return {
    flashPrice,
    originalPrice,
    discountPercent,
    stockTotal,
    stockClaimed,
    stockRemaining,
    soldRatio: stockClaimed / stockTotal,
    soldPercent,
    almostSoldOut: soldPercent >= 82 || stockRemaining <= 5,
    maxPerBuyer: 3,
  };
}

const LiveDealCard = ({ product }: { product: any }) => {
  const { t, formatNum } = useMarketplaceLang();
  const meta = resolveFlashMeta(product);
  const thumb = productThumb(product);

  return (
    <Link
      to={`/wevmall/product/${product.id}`}
      className="group bg-card border border-red-500/30 hover:border-red-500/80 rounded-xl overflow-hidden hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)] transition-all duration-300 flex flex-col h-full relative"
    >
      <div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1">
        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider rounded flex items-center gap-1 shadow-md">
          <Flame size={10} /> -{formatNum(meta.discountPercent)}%
        </span>
        {meta.almostSoldOut && (
          <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-extrabold uppercase tracking-tight rounded shadow-sm">
            {t('Hot', 'হট ডিল')}
          </span>
        )}
      </div>

      <div className="relative bg-muted overflow-hidden aspect-square">
        <img
          src={thumb}
          alt={product.title || 'Product'}
          className="w-full h-full object-cover object-center group-hover:scale-[1.04] transition-transform duration-500"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
          }}
        />
      </div>

      <div className="px-2.5 pt-2.5 pb-3 flex flex-col gap-2 flex-1 min-h-0 bg-card">
        <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-red-500 transition-colors">
          {product.title || t('Untitled listing', 'নামবিহীন পণ্য')}
        </h3>

        <div className="mt-auto space-y-2">
          <PriceTag
            price={meta.originalPrice}
            discountPrice={meta.flashPrice}
            className="text-base text-red-500"
          />

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>
                {formatNum(meta.stockClaimed)} {t('Sold', 'বিক্রি হয়েছে')}
              </span>
              <span>{formatNum(meta.soldPercent)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  meta.almostSoldOut
                    ? 'bg-red-600'
                    : 'bg-gradient-to-r from-orange-500 to-red-500'
                }`}
                style={{ width: `${meta.soldPercent}%` }}
              />
            </div>
            {meta.almostSoldOut ? (
              <p className="text-[10px] text-red-500 font-bold animate-pulse text-center mt-0.5">
                {t(
                  `Only ${meta.stockRemaining} left!`,
                  `মাত্র ${formatNum(meta.stockRemaining)}টি বাকি!`,
                )}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground font-medium text-center mt-0.5">
                {t(
                  `${meta.stockRemaining} in stock`,
                  `${formatNum(meta.stockRemaining)}টি স্টকে আছে`,
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default function LiveDealsSection({
  title,
  subtitle,
  viewAllLink = '/wevmall/flash-deals',
}: {
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
}) {
  const { t, formatNum } = useMarketplaceLang();
  const [products, setProducts] = useState<any[]>([]);
  const [slotEndTime, setSlotEndTime] = useState<number>(() => Date.now() + 3 * 3600 * 1000);
  const [remainingSec, setRemainingSec] = useState<number>(3 * 3600);
  const [loading, setLoading] = useState(true);
  const token = useStore((s) => s.token);

  useEffect(() => {
    let isMounted = true;
    const fetchFlashSlot = async () => {
      try {
        setLoading(true);
        const data = await marketFetch('/api/marketplace/flash-sale/current?limit=6', token);
        if (!isMounted) return;
        if (data && Array.isArray(data.items)) {
          setProducts(data.items);
          const serverNow = Number(data.serverTime || Date.now());
          const serverEnd = Number(data.slotEndTime || serverNow + 3 * 3600 * 1000);
          const skewMs = Date.now() - serverNow;
          const localTargetEnd = serverEnd + skewMs;
          setSlotEndTime(localTargetEnd);
          setRemainingSec(Math.max(0, Math.floor((localTargetEnd - Date.now()) / 1000)));
        } else if (Array.isArray(data)) {
          setProducts(data);
        }
      } catch {
        // Fallback to /api/marketplace/feed/flash-deals
        try {
          const fallback = await marketFetch('/api/marketplace/feed/flash-deals?limit=6', token);
          if (isMounted) {
            const list = Array.isArray(fallback) ? fallback : fallback?.products || [];
            setProducts(list);
            const firstSlotEnd = list[0]?.flashSale?.slotEndTime;
            if (firstSlotEnd) {
              setSlotEndTime(Number(firstSlotEnd));
              setRemainingSec(Math.max(0, Math.floor((Number(firstSlotEnd) - Date.now()) / 1000)));
            }
          }
        } catch (err) {
          console.error('Error fetching Flash Sale:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchFlashSlot();
    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, Math.floor((slotEndTime - Date.now()) / 1000));
      setRemainingSec(diff);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [slotEndTime]);

  if (!loading && products.length === 0) return null;

  const hours = String(Math.floor(remainingSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((remainingSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(remainingSec % 60).padStart(2, '0');

  const resolvedTitle = title || t('Flash Sale', 'ফ্ল্যাশ সেল');
  const resolvedSubtitle =
    subtitle ||
    t(
      'Server-verified limited-time flash deals — updated every 6 hours',
      'সার্ভার-ভেরিফায়েড সীমিত সময়ের ফ্ল্যাশ ডিল — প্রতি ৬ ঘণ্টায় নতুন স্লট',
    );

  return (
    <section id="js_flashSale" className="w-full py-4">
      {/* Daraz-style Flash Sale Header Bar + Synchronized Countdown */}
      <div className="rounded-2xl border border-red-500/30 bg-card p-3.5 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/15 text-red-500">
                  <Zap size={16} className="fill-red-500" />
                </span>
                <h2 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                  {resolvedTitle}
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  {t('On Sale Now', 'এখন বিক্রি চলছে')}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{resolvedSubtitle}</p>
            </div>

            {/* Live Slot Countdown Bar */}
            <div className="flex items-center gap-2 sm:pl-4 sm:border-l border-border">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Clock size={13} className="text-red-500" />
                {t('Ending in', 'শেষ হচ্ছে')}
              </span>
              <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-black">
                <span className="min-w-[30px] h-7 px-1.5 rounded-md bg-red-600 text-white flex items-center justify-center shadow-sm">
                  {formatNum(hours)}
                </span>
                <span className="text-red-500 font-bold">:</span>
                <span className="min-w-[30px] h-7 px-1.5 rounded-md bg-red-600 text-white flex items-center justify-center shadow-sm">
                  {formatNum(minutes)}
                </span>
                <span className="text-red-500 font-bold">:</span>
                <span className="min-w-[30px] h-7 px-1.5 rounded-md bg-red-600 text-white flex items-center justify-center shadow-sm">
                  {formatNum(seconds)}
                </span>
              </div>
            </div>
          </div>

          <Link
            to={viewAllLink}
            className="self-start sm:self-auto shrink-0 px-3.5 py-2 rounded-lg border border-red-500 text-xs sm:text-sm font-bold text-red-500 hover:bg-red-500 hover:text-white flex items-center gap-1.5 group transition-colors whitespace-nowrap"
          >
            {t('SHOP ALL PRODUCTS', 'সব পণ্য কিনুন')}
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="relative">
          <div className={PRODUCT_GRID_CLASS}>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-red-500/20 bg-card overflow-hidden animate-pulse h-[280px]"
                >
                  <div className="aspect-square bg-muted" />
                  <div className="p-3 space-y-2 mt-2">
                    <div className="h-3 bg-muted rounded w-4/5" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-2 bg-muted rounded-full w-full mt-4" />
                  </div>
                </div>
              ))
            ) : (
              products.slice(0, 6).map((product) => (
                <LiveDealCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
