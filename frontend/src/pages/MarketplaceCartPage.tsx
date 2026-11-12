import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { formatPrice, marketFetch, productThumb } from '../components/marketplace/commerce/utils';

export default function MarketplaceCartPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await marketFetch('/api/marketplace/cart', token);
      setItems(data.items || []);
      setSubtotal(data.subtotal || 0);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load();
  }, [token]);

  const setQty = async (productId: string, quantity: number) => {
    try {
      await marketFetch(`/api/marketplace/cart/${productId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    }
  };

  const remove = async (productId: string) => {
    try {
      await marketFetch(`/api/marketplace/cart/${productId}`, token, { method: 'DELETE' });
      await load();
      toast.success('Removed');
    } catch (e: any) {
      toast.error(e.message || 'Remove failed');
    }
  };

  const count = items.reduce((n, i) => n + (i.quantity || 1), 0);

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <MarketplaceHeader
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => navigate('/wevmall')}
        category="All"
        onCategory={() => navigate('/wevmall')}
        cartCount={count}
      />

      <h1 className="text-xl font-bold mb-4">Shopping Cart</h1>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading cart…</div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-16 text-center">
          <p className="text-sm text-muted-foreground mb-3">Your cart is empty</p>
          <Link to="/wevmall" className="text-sm font-bold text-[#F57224]">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <div className="space-y-3">
            {items.map((item) => {
              const p = item.product;
              return (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-card border border-border rounded-lg"
                >
                  <Link to={`/wevmall/product/${p?.id}`} className="w-20 h-20 rounded bg-muted overflow-hidden shrink-0">
                    <img src={productThumb(p)} alt="" className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/wevmall/product/${p?.id}`} className="text-sm font-semibold line-clamp-2 hover:text-[#F57224]">
                      {p?.title}
                    </Link>
                    <p className="text-sm font-bold text-[#F57224] mt-1">{formatPrice(p?.price)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        className="w-7 h-7 border border-border rounded flex items-center justify-center"
                        onClick={() => setQty(p.id, Math.max(0, (item.quantity || 1) - 1))}
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        className="w-7 h-7 border border-border rounded flex items-center justify-center"
                        onClick={() => setQty(p.id, (item.quantity || 1) + 1)}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        className="ml-auto text-rose-500 p-1.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-lg p-4 h-fit space-y-3">
            <h2 className="font-bold text-sm">Order Summary</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({count} items)</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/wevmall/checkout')}
              className="w-full py-2.5 rounded-md bg-[#F57224] hover:bg-[#e3651a] text-white font-bold text-sm"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
