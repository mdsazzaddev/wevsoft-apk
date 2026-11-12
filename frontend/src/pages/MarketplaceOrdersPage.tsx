import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { formatPrice, marketFetch, productThumb } from '../components/marketplace/commerce/utils';

export default function MarketplaceOrdersPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  type ReviewDraft = {
    rating: number;
    comment: string;
    quality?: number;
    packaging?: number;
    communication?: number;
    delivery?: number;
    images?: string;
    videoUrl?: string;
  };
  const [reviewDraft, setReviewDraft] = useState<Record<string, ReviewDraft>>({});

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [data, cart] = await Promise.all([
        marketFetch('/api/marketplace/orders/me', token),
        marketFetch('/api/marketplace/cart', token).catch(() => ({ count: 0 })),
      ]);
      setOrders(data.orders || []);
      setCartCount(cart.count || 0);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load();
  }, [token]);

  // Deep-link pay=? from payment session
  useEffect(() => {
    const orderId = params.get('orderId');
    const sessionId = params.get('pay');
    if (!token || !orderId || !sessionId) return;
    (async () => {
      try {
        await marketFetch(`/api/marketplace/orders/${orderId}/pay`, token, {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        });
        toast.success('Payment confirmed');
        navigate('/wevmall/orders', { replace: true });
        load();
      } catch (e: any) {
        toast.error(e.message || 'Payment failed');
      }
    })();
  }, [token]);

  const payNow = async (order: any) => {
    setBusyId(order.id);
    try {
      await marketFetch(`/api/marketplace/orders/${order.id}/pay`, token, {
        method: 'POST',
        body: JSON.stringify({ sessionId: order.paymentSessionId }),
      });
      toast.success('Payment confirmed');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReceipt = async (orderId: string) => {
    setBusyId(orderId);
    try {
      await marketFetch(`/api/marketplace/orders/${orderId}/confirm-receipt`, token, {
        method: 'POST',
        body: '{}',
      });
      toast.success('Marked as delivered — you can leave a review');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  const requestReturn = async (orderId: string) => {
    const reason = window.prompt('Why are you returning this order?');
    if (!reason?.trim()) return;
    setBusyId(orderId);
    try {
      await marketFetch(`/api/marketplace/orders/${orderId}/return`, token, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      toast.success('Return requested');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Return failed');
    } finally {
      setBusyId(null);
    }
  };

  const submitReview = async (orderId: string) => {
    const draft = reviewDraft[orderId] || { rating: 5, comment: '' };
    setBusyId(orderId);
    try {
      await marketFetch(`/api/marketplace/orders/${orderId}/review`, token, {
        method: 'POST',
        body: JSON.stringify({
          rating: draft.rating,
          comment: draft.comment,
          productQuality: draft.quality ?? draft.rating,
          deliverySpeed: draft.delivery ?? draft.rating,
          customerService: draft.communication ?? draft.rating,
          packaging: draft.packaging ?? draft.rating,
          communication: draft.communication ?? draft.rating,
          images: (draft.images || '')
            .split(',')
            .map((u) => u.trim())
            .filter(Boolean),
          videoUrl: draft.videoUrl || null,
        }),
      });
      toast.success('Review submitted');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Review failed');
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
      />

      <h1 className="text-xl font-bold mb-4">My Orders</h1>

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Loading orders…</div>
      ) : orders.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-16 text-center">
          <p className="text-sm text-muted-foreground mb-3">No orders yet</p>
          <Link to="/wevmall" className="text-sm font-bold text-[#F57224]">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const status = String(o.status || '').toUpperCase();
            const pay = String(o.paymentStatus || '').toUpperCase();
            const draft = reviewDraft[o.id] || { rating: 5, comment: '' };
            return (
              <div key={o.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex gap-3">
                  <img
                    src={productThumb(o.product)}
                    alt=""
                    className="w-16 h-16 rounded object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to={`/wevmall/product/${o.productId}`}
                          className="text-sm font-semibold hover:text-[#F57224] line-clamp-1"
                        >
                          {o.product?.title || 'Product'}
                        </Link>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Seller: {o.seller?.name || '—'} · Qty {o.quantity}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {status}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            pay === 'PAID' || pay === 'COD'
                              ? 'bg-emerald-500/15 text-emerald-600'
                              : 'bg-amber-500/15 text-amber-600'
                          }`}
                        >
                          {pay}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-[#F57224]">{formatPrice(o.amount)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pay method: {o.paymentMethod || '—'}
                      {o.orderNumber ? ` · #${o.orderNumber}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pay === 'PENDING' || pay === 'UNPAID' || pay === 'FAILED' ? (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => {
                        if (o.providerCheckoutUrl && /^https?:\/\//i.test(o.providerCheckoutUrl)) {
                          window.location.href = o.providerCheckoutUrl;
                          return;
                        }
                        payNow(o);
                      }}
                      className="px-3 py-1.5 rounded-md bg-[#F57224] text-white text-xs font-bold disabled:opacity-60"
                    >
                      {busyId === o.id ? 'Paying…' : 'Complete payment'}
                    </button>
                  ) : null}

                  {['CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(status) && (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => confirmReceipt(o.id)}
                      className="px-3 py-1.5 rounded-md border border-border text-xs font-bold disabled:opacity-60"
                    >
                      Confirm delivery
                    </button>
                  )}

                  {['DELIVERED', 'SHIPPED', 'CONFIRMED'].includes(status) && (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => requestReturn(o.id)}
                      className="px-3 py-1.5 rounded-md border border-rose-300 text-rose-600 text-xs font-bold disabled:opacity-60"
                    >
                      Request return
                    </button>
                  )}

                  {status === 'RETURN_REQUESTED' && (
                    <span className="text-[11px] text-amber-600 font-semibold self-center">
                      Return pending{o.returnReason ? `: ${o.returnReason}` : ''}
                    </span>
                  )}

                  {status === 'REFUNDED' && (
                    <span className="text-[11px] text-emerald-600 font-semibold self-center">Refunded</span>
                  )}
                </div>

                {status === 'DELIVERED' && !o.hasReview && (
                  <div className="border border-border rounded-md p-3 space-y-2 bg-muted/20">
                    <p className="text-xs font-bold">Leave a review</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() =>
                            setReviewDraft((prev) => ({
                              ...prev,
                              [o.id]: { ...draft, rating: n },
                            }))
                          }
                          className={n <= draft.rating ? 'text-[#F57224]' : 'text-muted-foreground/40'}
                        >
                          <Star size={18} className={n <= draft.rating ? 'fill-current' : ''} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={draft.comment}
                      onChange={(e) =>
                        setReviewDraft((prev) => ({
                          ...prev,
                          [o.id]: { ...draft, comment: e.target.value },
                        }))
                      }
                      rows={2}
                      placeholder="How was the product and delivery?"
                      className="w-full border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-[#F57224]"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([
                        ['Quality', 'quality'],
                        ['Packaging', 'packaging'],
                        ['Communication', 'communication'],
                        ['Delivery', 'delivery'],
                      ] as const).map(([label, key]) => (
                        <div key={key}>
                          <div className="text-[10px] font-bold text-muted-foreground mb-0.5">{label}</div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() =>
                                  setReviewDraft((prev) => ({ ...prev, [o.id]: { ...draft, [key]: n } }))
                                }
                                className={
                                  n <= ((draft as any)[key] ?? draft.rating)
                                    ? 'text-[#F57224]'
                                    : 'text-muted-foreground/40'
                                }
                              >
                                <Star size={12} className={n <= ((draft as any)[key] ?? draft.rating) ? 'fill-current' : ''} />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        value={draft.images || ''}
                        onChange={(e) => setReviewDraft((prev) => ({ ...prev, [o.id]: { ...draft, images: e.target.value } }))}
                        placeholder="Photo URLs (comma separated)"
                        className="border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-[#F57224]"
                      />
                      <input
                        value={draft.videoUrl || ''}
                        onChange={(e) => setReviewDraft((prev) => ({ ...prev, [o.id]: { ...draft, videoUrl: e.target.value } }))}
                        placeholder="Video URL (optional)"
                        className="border border-border rounded-md px-2 py-1.5 text-xs bg-background outline-none focus:border-[#F57224]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => submitReview(o.id)}
                      className="px-3 py-1.5 rounded-md bg-[#F57224] text-white text-xs font-bold disabled:opacity-60"
                    >
                      Submit review
                    </button>
                  </div>
                )}

                {o.hasReview && o.review && (
                  <div className="text-xs text-muted-foreground border border-border rounded-md p-2">
                    Your review: {o.review.rating}/5
                    {o.review.comment ? ` — ${o.review.comment}` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
