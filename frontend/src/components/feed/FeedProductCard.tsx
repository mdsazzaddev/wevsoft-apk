import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import { openShare } from '../../lib/share/openShare';
import { Link } from 'react-router-dom';
import { Bookmark, MapPin, MessageCircle, Share2, ShoppingBag, Star, Tag, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import UserAvatar from '../UserAvatar';
import { observeFeedDwell, trackFeedInteraction } from '../../lib/AnalyticsTracker';
import { marketFetch, productThumb } from '../marketplace/commerce/utils';

function formatPrice(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'BDT',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `৳${Math.round(n)}`;
  }
}

function MarketplaceTile({ product }: { product: any }) {
  const { t } = useTranslation();
  const token = useStore((s) => s.token);
  const ref = useRef<HTMLElement>(null);
  const [saved, setSaved] = useState(false);
  const thumb = productThumb(product);
  const seller = product.seller;
  const price = product.discountPrice ?? product.price;
  const hasDiscount =
    product.discountPrice != null &&
    product.price != null &&
    Number(product.discountPrice) < Number(product.price);
  const discountPct = hasDiscount
    ? Math.round((1 - Number(product.discountPrice) / Number(product.price)) * 100)
    : 0;

  useEffect(() => {
    if (!ref.current) return;
    return observeFeedDwell(ref.current, {
      targetId: product.id,
      targetType: 'PRODUCT',
      categoryId: product.category,
    });
  }, [product.category, product.id]);

  const toggleSave = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return toast.error(trLabel(t, 'SignInToSaveItems', 'Sign in to save items'));
    const next = !saved;
    setSaved(next);
    try {
      await marketFetch('/api/marketplace/wishlist', token, {
        method: next ? 'POST' : 'DELETE',
        body: JSON.stringify({ productId: product.id }),
      });
      toast.success(next ? 'Saved' : 'Removed from saved');
    } catch (err: any) {
      setSaved(!next);
      toast.error(err?.message || 'Could not save');
    }
  };

  const share = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Universal Share modal (WevChat, feed, platforms, copy link).
    openShare({ url: `/wevmall/product/${product.id}`, title: product.title || 'Product', targetType: 'marketplace', targetId: product.id });
  };

  return (
    <article
      ref={ref}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-amber-500/25 bg-card shadow-sm transition-colors hover:border-amber-500/45"
    >
      <Link
        to={`/wevmall/product/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-muted/40"
        onClick={() =>
          trackFeedInteraction({
            targetId: product.id,
            targetType: 'PRODUCT',
            categoryId: product.category,
            actionType: 'CLICK',
          })
        }
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ShoppingBag size={28} aria-hidden />
          </div>
        )}
        {hasDiscount ? (
          <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white">
            −{discountPct}%
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <Link
          to={`/wevmall/product/${product.id}`}
          className="line-clamp-2 text-xs font-extrabold leading-snug text-foreground hover:text-amber-600 dark:hover:text-amber-400"
        >
          {product.title || 'Listing'}
        </Link>

        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-amber-600 dark:text-amber-400">
            {formatPrice(price)}
          </span>
          {hasDiscount ? (
            <span className="text-[10px] text-muted-foreground line-through">
              {formatPrice(product.price)}
            </span>
          ) : null}
        </div>

        {product.rating ? (
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
            <Star size={10} className="fill-amber-400 text-amber-400" />
            <span>{Number(product.rating).toFixed(1)}</span>
            {product.reviewsCount ? (
              <span className="text-muted-foreground font-normal">({product.reviewsCount})</span>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1 text-[9px] text-muted-foreground">
          {product.condition ? (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 px-1.5 py-0.5">
              <Tag size={9} aria-hidden />
              {product.condition}
            </span>
          ) : null}
          {product.availability ? (
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
              {String(product.availability).replace(/_/g, ' ')}
            </span>
          ) : null}
          {product.category ? (
            <span className="rounded-md bg-muted/60 px-1.5 py-0.5">{product.category}</span>
          ) : null}
        </div>

        {product.location ? (
          <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
            <MapPin size={10} className="shrink-0" aria-hidden />
            {product.location}
          </p>
        ) : null}

        {seller?.username ? (
          <Link
            to={`/u/${seller.username}`}
            className="mt-auto flex items-center gap-1.5 pt-1 text-[10px] font-medium text-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <UserAvatar user={seller} className="h-5 w-5 text-[8px]" decorative />
            <span className="truncate">{seller.name || seller.username}</span>
          </Link>
        ) : null}

        <div className="mt-1 flex items-center gap-1 border-t border-border/40 pt-1.5">
          <Link
            to={`/wevmall/product/${product.id}`}
            className="flex-1 rounded-lg bg-amber-500/15 py-1.5 text-center text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 flex items-center justify-center gap-1"
          >
            <span>{trLabel(t, 'ViewDetails', 'View Details')}</span>
            <ArrowRight size={10} />
          </Link>
          <button
            type="button"
            onClick={toggleSave}
            className={`rounded-lg p-1.5 ${saved ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
            aria-label={saved ? 'Unsave product' : 'Save product'}
          >
            <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={share}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
            aria-label={trLabel(t, 'ShareProduct', 'Share product')}
          >
            <Share2 size={14} />
          </button>
          {seller?.username ? (
            <Link
              to={`/messages`}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
              aria-label={trLabel(t, 'ContactSeller', 'Contact seller')}
              title={trLabel(t, 'ContactSeller', 'Contact seller')}
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle size={14} />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Theme-aware WevMall block for the personal Home feed — distinct from social posts. */
export default memo(function FeedProductCard({ products }: { products: any[] }) {
  const { t } = useTranslation();
  if (!products?.length) return null;
  return (
    <section className="rounded-none border-y border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-card to-card px-3 py-3 md:rounded-3xl md:border md:border-amber-500/25 md:px-4 md:py-4 md:shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-amber-600 dark:text-amber-400" aria-hidden />
          <h2 className="text-sm font-extrabold text-foreground truncate">{trLabel(t, 'WevMallForYou', 'WevMall for you')}</h2>
        </div>
        <Link
          to="/wevmall"
          className="text-[11px] font-bold text-amber-700 hover:underline dark:text-amber-300"
        >
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {products.map((product) => (
          <MarketplaceTile key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
});
