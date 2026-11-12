import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { PriceTag, RatingStars } from '../components/marketplace/commerce/primitives';
import { formatPrice, marketFetch, productThumb } from '../components/marketplace/commerce/utils';

export default function MarketplaceWishlistPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [wish, cart] = await Promise.all([
        marketFetch('/api/marketplace/wishlist', token),
        marketFetch('/api/marketplace/cart', token).catch(() => ({ count: 0 })),
      ]);
      setItems(Array.isArray(wish) ? wish : []);
      setCartCount(cart.count || 0);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load wishlist');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load();
  }, [token]);

  const remove = async (productId: string) => {
    setBusyId(productId);
    try {
      await marketFetch('/api/marketplace/wishlist', token, {
        method: 'DELETE',
        body: JSON.stringify({ productId }),
      });
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      toast.success('Removed from wishlist');
    } catch (e: any) {
      toast.error(e.message || 'Remove failed');
    } finally {
      setBusyId(null);
    }
  };

  const addToCart = async (productId: string) => {
    setBusyId(productId);
    try {
      await marketFetch('/api/marketplace/cart', token, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      const cart = await marketFetch('/api/marketplace/cart', token);
      setCartCount(cart.count || 0);
      toast.success('Added to cart');
    } catch (e: any) {
      toast.error(e.message || 'Could not add to cart');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <MarketplaceHeader
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => navigate('/wevmall')}
        category="All"
        onCategory={() => navigate('/wevmall')}
        cartCount={cartCount}
        wishCount={items.length}
      />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Heart className="text-[#F57224] fill-[#F57224]" size={22} />
          My Wishlist
          <span className="text-sm font-medium text-muted-foreground">({items.length})</span>
        </h1>
        <Link to="/wevmall" className="text-xs font-bold text-[#F57224]">
          Continue shopping
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading wishlist…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-16 text-center">
          <Heart className="mx-auto text-muted-foreground/40 mb-3" size={36} />
          <p className="text-sm text-muted-foreground mb-3">No saved items yet</p>
          <Link
            to="/wevmall"
            className="inline-flex px-4 py-2 rounded-md bg-[#F57224] text-white text-xs font-bold"
          >
            Browse products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const p = item.product;
            if (!p) return null;
            return (
              <div
                key={item.id || item.productId}
                className="bg-card border border-border rounded-lg overflow-hidden flex flex-col"
              >
                <Link to={`/wevmall/product/${p.id}`} className="aspect-square bg-muted overflow-hidden">
                  <img
                    src={productThumb(p)}
                    alt={p.title || 'Product'}
                    className="w-full h-full object-cover hover:scale-[1.03] transition-transform"
                  />
                </Link>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <Link
                    to={`/wevmall/product/${p.id}`}
                    className="text-sm font-semibold line-clamp-2 hover:text-[#F57224] min-h-[2.5rem]"
                  >
                    {p.title || 'Untitled'}
                  </Link>
                  <PriceTag price={p.price} discountPrice={p.discountPrice} />
                  <RatingStars value={p.rating || 4.5} count={p.reviewsCount || 0} />
                  {p.sold ? (
                    <p className="text-[11px] font-bold text-rose-500 uppercase">Sold out</p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{formatPrice(p.price)}</p>
                  )}
                  <div className="mt-auto flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!!p.sold || busyId === p.id}
                      onClick={() => addToCart(p.id)}
                      className="flex-1 py-2 rounded-md bg-[#F57224] hover:bg-[#e3651a] text-white text-xs font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <ShoppingCart size={14} /> Add to cart
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => remove(p.id)}
                      className="w-10 py-2 rounded-md border border-border text-rose-500 inline-flex items-center justify-center disabled:opacity-50"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
