import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../../../store';
import { marketFetch, productThumb, formatPrice } from './utils';
import { useMarketplaceLang } from './useMarketplaceLang';

type CartPreviewItem = {
  id: string;
  quantity: number;
  product?: { title?: string; price?: number; discountPrice?: number | null; images?: unknown } | null;
};

type CartPreview = { items: CartPreviewItem[]; count: number; subtotal: number };

function isDesktop() {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
}

/**
 * Wraps the header cart button. On desktop hover it fetches the cart and shows a
 * mini tray; mobile keeps the existing tap-to-navigate behavior untouched.
 */
export function CartHoverPreview({ children, cartCount = 0, disabled = false }: { children: React.ReactNode; cartCount?: number; disabled?: boolean }) {
  const token = useStore((s) => s.token);
  const { t, formatNum } = useMarketplaceLang();
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);

  function handleEnter() {
    if (disabled || !isDesktop()) return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOpen(true);
    if (!token) return;
    setLoading(true);
    marketFetch('/api/marketplace/cart', token)
      .then((data) => setCart(data && Array.isArray(data.items) ? data : { items: [], count: 0, subtotal: 0 }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function handleLeave() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setOpen(false), 200);
  }

  const items = cart?.items ?? [];
  const shown = items.slice(0, 3);
  const extra = Math.max(0, items.length - shown.length);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="hidden md:block absolute right-0 top-full mt-2 w-80 z-50 rounded-2xl border border-border bg-card shadow-xl p-3"
          >
            <p className="text-sm font-bold text-foreground mb-2">
              {t('My Cart', 'আমার কার্ট')}
              {cartCount > 0 && <span className="text-muted-foreground font-medium"> ({formatNum(cartCount)})</span>}
            </p>
            {!token ? (
              <p className="text-xs text-muted-foreground py-4 text-center">{t('Sign in to view your cart', 'কার্ট দেখতে সাইন ইন করুন')}</p>
            ) : loading && !cart ? (
              <p className="text-xs text-muted-foreground py-4 text-center">{t('Loading...', 'লোড হচ্ছে...')}</p>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
                <ShoppingCart size={24} />
                <p className="text-xs">{t('Your cart is empty', 'আপনার কার্ট খালি')}</p>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {shown.map((item) => {
                    const p = item.product || {};
                    const unit = Number(p.discountPrice || p.price || 0);
                    const img = productThumb(p);
                    return (
                      <li key={item.id} className="flex items-center gap-2">
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                          {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{p.title || t('Product', 'পণ্য')}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatNum(item.quantity)} × {formatPrice(unit)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {extra > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {t(`+${extra} more items`, `আরও ${formatNum(extra)}টি পণ্য`)}
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-border mt-3 pt-2 text-sm">
                  <span className="text-muted-foreground">{t('Subtotal', 'সাবটোটাল')}</span>
                  <span className="font-bold text-foreground">{formatPrice(Number(cart?.subtotal || 0))}</span>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Link
                to="/wevmall/cart"
                onClick={() => setOpen(false)}
                className="text-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                {t('View Cart', 'কার্ট দেখুন')}
              </Link>
              <Link
                to="/wevmall/checkout"
                onClick={() => setOpen(false)}
                className="text-center rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                {t('Checkout', 'চেকআউট')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CartHoverPreview;
