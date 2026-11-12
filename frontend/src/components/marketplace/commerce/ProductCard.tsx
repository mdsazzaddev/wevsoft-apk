import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Trash, Eye, ArrowRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store';
import { PriceTag, RatingStars, SellerBadge } from './primitives';
import { marketFetch, productThumb } from './utils';
import { readCompareIds, stockLabel, writeCompareIds } from '../experience/stock';
import ProductQuickPreviewModal from './ProductQuickPreviewModal';

const CARD_SHELL =
  'group bg-card border border-primary/40 hover:border-primary/80 rounded-xl overflow-hidden hover:shadow-[0_8px_24px_rgba(201,162,39,0.12)] transition-all duration-300 flex flex-col h-full';

type ProductCardProps = {
  product: any;
  wished?: boolean;
  onWishlistChange?: (productId: string, wished: boolean) => void;
  onCartChange?: () => void;
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  wished = false,
  onWishlistChange,
  onCartChange,
}) => {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [showQuickPreview, setShowQuickPreview] = useState(false);
  const thumb = productThumb(product);
  const seller = product.seller;
  const profile = seller?.sellerProfile;
  const stock = stockLabel(product);
  const boosted = product.boostedUntil && new Date(product.boostedUntil) > new Date();

  const toggleWish = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) return toast.error('Sign in to save items');
    try {
      if (wished) {
        await marketFetch('/api/marketplace/wishlist', token, {
          method: 'DELETE',
          body: JSON.stringify({ productId: product.id }),
        });
        onWishlistChange?.(product.id, false);
        toast.success('Removed from wishlist');
      } else {
        await marketFetch('/api/marketplace/wishlist', token, {
          method: 'POST',
          body: JSON.stringify({ productId: product.id }),
        });
        onWishlistChange?.(product.id, true);
        toast.success('Saved to wishlist');
      }
    } catch (err: any) {
      toast.error(err.message || 'Wishlist failed');
    }
  };

  const deleteProduct = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Product deleted by admin');
        window.location.reload();
      } else {
        toast.error('Failed to delete product');
      }
    } catch {
      toast.error('Error deleting product');
    }
  };

  return (
    <>
      <Link to={`/wevmall/product/${product.id}`} className={CARD_SHELL}>
        <div className="relative bg-[#0e0e0e] overflow-hidden">
          <div className="aspect-square w-full">
            <img
              src={thumb}
              alt={product.title || 'Product'}
              className="w-full h-full object-cover object-center group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
            />
          </div>
          <button
            type="button"
            onClick={toggleWish}
            className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 border border-primary/30 flex items-center justify-center ${
              wished ? 'text-rose-500' : 'text-zinc-300 hover:text-rose-400'
            }`}
            aria-label="Wishlist"
          >
            <Heart size={13} className={wished ? 'fill-current' : ''} />
          </button>
          {product.sold && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wide">
              Sold
            </div>
          )}
          <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${stock.className}`}>
            {stock.label}
          </span>
          {boosted && (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-primary text-black text-[8px] font-bold">
              Boosted
            </span>
          )}
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={deleteProduct}
              className="absolute top-1.5 left-12 px-1.5 py-0.5 rounded bg-red-500 text-white text-[8px] font-bold flex items-center gap-0.5 hover:bg-red-600"
            >
              <Trash size={9} /> Delete
            </button>
          )}

          {/* Quick Preview Hover Button (Laptop/Desktop) */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowQuickPreview(true);
            }}
            className="absolute inset-x-2.5 bottom-2 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-primary/40 text-primary text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1 shadow-md hover:bg-black hover:border-primary"
            title="Quick Preview"
          >
            <Eye size={12} /> Quick View
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const ids = readCompareIds();
              writeCompareIds(ids.includes(product.id) ? ids.filter((id) => id !== product.id) : [...ids, product.id]);
            }}
            className="absolute top-1.5 right-9 px-1.5 py-0.5 rounded bg-black/70 border border-primary/30 text-[8px] font-bold text-zinc-200"
          >
            Compare
          </button>
        </div>
        <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1 flex-1 min-h-0">
          <h3 className="text-[11px] sm:text-xs font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {product.title || 'Untitled listing'}
          </h3>
          <PriceTag price={product.price} discountPrice={product.discountPrice} className="text-sm" />
          <RatingStars value={product.rating || 4.5} count={product.reviewsCount || 0} size={11} />
          <SellerBadge
            name={profile?.shopName || seller?.name}
            verified={!!profile?.verifiedBadge}
          />
          {/* Feed Card Clean Standard: No direct Buy Now or Add to Cart on feed/browse cards. Navigates cleanly to product profile */}
          <div className="mt-auto pt-1.5 flex items-center justify-between text-[10px] text-muted-foreground font-semibold group-hover:text-primary transition-colors border-t border-border/40">
            <span>View Details</span>
            <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>

      {/* Quick View Modal */}
      {showQuickPreview && (
        <ProductQuickPreviewModal
          product={product}
          isOpen={showQuickPreview}
          onClose={() => setShowQuickPreview(false)}
          wished={wished}
          onWishlistChange={onWishlistChange}
          onCartChange={onCartChange}
        />
      )}
    </>
  );
};

export const PRODUCT_GRID_CLASS = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 sm:gap-3';

export function ProductGrid({
  products,
  loading,
  wishlistIds,
  onWishlistChange,
  onCartChange,
}: {
  products: any[];
  loading?: boolean;
  wishlistIds?: Set<string>;
  onWishlistChange?: (productId: string, wished: boolean) => void;
  onCartChange?: () => void;
}) {
  if (loading) {
    return (
      <div className={PRODUCT_GRID_CLASS}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-primary/25 bg-card overflow-hidden animate-pulse">
            <div className="aspect-square bg-[#1c1c1c]" />
            <div className="p-2 space-y-1.5">
              <div className="h-3 bg-[#1c1c1c] rounded w-4/5" />
              <div className="h-4 bg-[#1c1c1c] rounded w-1/3" />
              <div className="h-7 bg-[#1c1c1c] rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="border border-dashed border-primary/30 rounded-2xl py-14 text-center text-sm text-muted-foreground">
        No products found. Try another category or search.
      </div>
    );
  }

  return (
    <div className={PRODUCT_GRID_CLASS}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          wished={!!wishlistIds?.has(p.id)}
          onWishlistChange={onWishlistChange}
          onCartChange={onCartChange}
        />
      ))}
    </div>
  );
}

export function SellCtaButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/seller/onboarding')}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary text-[var(--card)] text-sm font-bold hover:from-primary hover:to-primary"
    >
      <Plus size={15} /> Sell
    </button>
  );
}
