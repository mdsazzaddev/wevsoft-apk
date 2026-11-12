import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { formatPrice, marketFetch, productThumb } from '../components/marketplace/commerce/utils';
import { readAffiliate } from '../lib/affiliate';

export default function MarketplaceCheckoutPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bKash');
  const [phone, setPhone] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(
    null
  );
  const [couponBusy, setCouponBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const data = await marketFetch('/api/marketplace/cart', token);
        setItems(data.items || []);
        setSubtotal(data.subtotal || 0);
        if (!(data.items || []).length) {
          toast.error('Cart is empty');
          navigate('/wevmall/cart');
        }
      } catch (e: any) {
        toast.error(e.message || 'Failed to load cart');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return toast.error('Enter a coupon code');
    setCouponBusy(true);
    try {
      const data = await marketFetch('/api/marketplace/coupons/validate', token, {
        method: 'POST',
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      setCoupon({
        code: data.code,
        discountAmount: data.discountAmount,
        finalAmount: data.finalAmount,
      });
      toast.success(`Coupon ${data.code} applied (−${formatPrice(data.discountAmount)})`);
    } catch (e: any) {
      setCoupon(null);
      toast.error(e.message || 'Invalid coupon');
    } finally {
      setCouponBusy(false);
    }
  };

  const placeOrder = async () => {
    if (!address.trim()) return toast.error('Enter shipping address');
    setSubmitting(true);
    try {
      const created: any[] = [];
      let couponUsed = false;
      for (const item of items) {
        const res = await fetch('/api/v1/marketplace/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: item.productId,
            quantity: item.quantity || 1,
            paymentMethod,
            shippingAddress: `${address}${phone ? ` | Phone: ${phone}` : ''}`,
            couponCode: !couponUsed && coupon?.code ? coupon.code : undefined,
            affiliateCreatorId: readAffiliate(item.productId)?.creatorId,
            affiliateReelId: readAffiliate(item.productId)?.reelId,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Order failed');
        if (data.discount?.code) couponUsed = true;
        created.push(data);
        await marketFetch(`/api/marketplace/cart/${item.productId}`, token, { method: 'DELETE' }).catch(() => {});
      }

      if (paymentMethod === 'COD') {
        toast.success(`${created.length} COD order(s) confirmed`);
        navigate('/wevmall/orders');
        return;
      }

      // Prefer provider checkout URL (live gateway / sandbox deep-link)
      const firstPay = created[0]?.payment;
      const providerUrl = firstPay?.providerCheckoutUrl;
      if (providerUrl && /^https?:\/\//i.test(providerUrl) && !/\/wevmall\/orders\?/.test(providerUrl)) {
        toast.success('Redirecting to payment…');
        window.location.href = providerUrl;
        return;
      }

      // Sandbox / in-app settle via return URL or pay endpoint
      for (const row of created) {
        const orderId = row.order?.id;
        const sessionId = row.payment?.sessionId;
        const url = row.payment?.providerCheckoutUrl || row.payment?.checkoutUrl;
        if (url && String(url).startsWith('/')) {
          navigate(url);
          return;
        }
        if (!orderId) continue;
        await marketFetch(`/api/marketplace/orders/${orderId}/pay`, token, {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        });
      }
      toast.success(`${created.length} order(s) paid & confirmed`);
      navigate('/wevmall/orders');
    } catch (e: any) {
      toast.error(e.message || 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  const payable = coupon ? coupon.finalAmount : subtotal;

  if (loading) {
    return <div className="max-w-7xl mx-auto py-20 text-center text-sm text-muted-foreground">Preparing checkout…</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <MarketplaceHeader
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => navigate('/wevmall')}
        category="All"
        onCategory={() => navigate('/wevmall')}
        cartCount={items.reduce((n, i) => n + (i.quantity || 1), 0)}
      />

      <h1 className="text-xl font-bold mb-4">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="font-bold text-sm">Shipping address</h2>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="House, road, area, city"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background outline-none focus:border-[#F57224]"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background outline-none focus:border-[#F57224]"
            />
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h2 className="font-bold text-sm">Payment method</h2>
            {['bKash', 'Nagad', 'Stripe', 'COD'].map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === m}
                  onChange={() => setPaymentMethod(m)}
                  className="accent-[#F57224]"
                />
                {m === 'COD' ? 'Cash on Delivery' : m}
              </label>
            ))}
            <p className="text-[11px] text-muted-foreground">
              {paymentMethod === 'COD'
                ? 'Pay when the parcel arrives. Order confirms immediately.'
                : 'Live keys settle via gateway redirect + webhook; sandbox settles in-app.'}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <h2 className="font-bold text-sm">Coupon</h2>
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="WEV10 / WELCOME100"
                className="flex-1 border border-border rounded-md px-3 py-2 text-sm bg-background outline-none focus:border-[#F57224]"
              />
              <button
                type="button"
                disabled={couponBusy}
                onClick={applyCoupon}
                className="px-3 py-2 rounded-md border border-border text-xs font-bold disabled:opacity-60"
              >
                Apply
              </button>
            </div>
            {coupon && (
              <p className="text-[11px] text-emerald-600 font-semibold">
                {coupon.code} applied — save {formatPrice(coupon.discountAmount)}
              </p>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg p-4 space-y-2">
            <h2 className="font-bold text-sm mb-2">Items</h2>
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <img src={productThumb(item.product)} alt="" className="w-12 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{item.product?.title}</p>
                  <p className="text-[11px] text-muted-foreground">Qty {item.quantity}</p>
                </div>
                <p className="text-xs font-bold">{formatPrice((item.product?.price || 0) * (item.quantity || 1))}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4 h-fit space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatPrice(subtotal)}</span>
          </div>
          {coupon && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount</span>
              <span>−{formatPrice(coupon.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm border-t border-border pt-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-extrabold text-[#F57224] text-lg">{formatPrice(payable)}</span>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={placeOrder}
            className="w-full py-2.5 rounded-md bg-[#F57224] hover:bg-[#e3651a] text-white font-bold text-sm disabled:opacity-60"
          >
            {submitting
              ? 'Processing…'
              : paymentMethod === 'COD'
                ? 'Place COD Order'
                : `Pay with ${paymentMethod}`}
          </button>
        </div>
      </div>
    </div>
  );
}
