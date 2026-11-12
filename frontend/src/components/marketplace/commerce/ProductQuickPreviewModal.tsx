import React, { useState } from 'react';
import { openShare } from '../../../lib/share/openShare';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingCart, ExternalLink, Share2, MessageCircle, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store';
import { PriceTag, RatingStars } from './primitives';
import { marketFetch, parseProductGallery, productThumb } from './utils';
import { stockLabel } from '../experience/stock';

interface ProductQuickPreviewModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  wished?: boolean;
  onWishlistChange?: (productId: string, wished: boolean) => void;
  onCartChange?: () => void;
}

export default function ProductQuickPreviewModal({
  product,
  isOpen,
  onClose,
  wished = false,
  onWishlistChange,
  onCartChange,
}: ProductQuickPreviewModalProps) {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);

  if (!isOpen || !product) return null;

  const images = parseProductGallery(product);
  if (!images.length) images.push(productThumb(product));
  const stock = stockLabel(product);

  const addToCart = async () => {
    if (!token) return toast.error('Sign in first');
    try {
      await marketFetch('/api/marketplace/cart', token, {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity: qty }),
      });
      toast.success('Added to cart');
      onCartChange?.();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Could not add to cart');
    }
  };

  const buyNow = async () => {
    await addToCart();
    navigate('/wevmall/checkout');
  };

  // Both buttons open the Universal Share modal (it has WevChat friends and Share to feed);
  // the old handlers only showed a success toast without sharing anything.
  const openProductShare = () =>
    openShare({ url: `/wevmall/product/${product.id}`, title: product.title || 'Product', targetType: 'marketplace', targetId: product.id });
  const handleShare = openProductShare;
  const handleAskFriend = openProductShare;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-card border border-primary/30 rounded-2xl overflow-hidden shadow-2xl my-auto text-zinc-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="absolute top-3.5 right-3.5 z-10 p-2 rounded-full bg-black/60 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Left: Gallery */}
            <div className="flex flex-col gap-2.5">
              <div className="relative aspect-square w-full rounded-xl bg-black/50 border border-white/10 overflow-hidden">
                <img
                  src={images[activeImg] || productThumb(product)}
                  alt={product.title}
                  className="w-full h-full object-contain p-2"
                />
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${stock.className}`}>
                  {stock.label}
                </span>
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImg(idx)}
                      className={`relative w-12 h-12 rounded-lg border-2 overflow-hidden shrink-0 transition-all ${
                        activeImg === idx ? 'border-primary scale-105' : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="flex flex-col justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase font-bold text-primary tracking-wider mb-1">
                  {product.category || 'General'} {product.brand ? `· ${product.brand}` : ''}
                </p>
                <h2 className="text-base sm:text-lg font-bold leading-snug line-clamp-2">
                  {product.title}
                </h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <RatingStars value={product.rating || 4.5} count={product.reviewsCount || 0} size={12} />
                  <span className="text-[11px] text-zinc-400">({product.reviewsCount || 0} reviews)</span>
                </div>
                <div className="mt-2.5">
                  <PriceTag price={product.price} discountPrice={product.discountPrice} className="text-xl sm:text-2xl text-primary" />
                </div>
                {product.description && (
                  <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2.5 pt-2 border-t border-white/10 mt-auto">
                {/* Social Proof */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border border-card bg-primary/20 flex items-center justify-center overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${product.id}${i}`} alt="Friend" className="w-full h-full" />
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    3 mutual friends bought this
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={!!product.sold}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-primary text-primary hover:bg-primary/10 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <ShoppingCart size={14} /> Add to Cart
                  </button>
                  <button
                    type="button"
                    onClick={buyNow}
                    disabled={!!product.sold}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-[var(--card)] font-bold text-[11px] sm:text-xs flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    Buy Now
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Share2 size={12} /> Share to Feed
                  </button>
                  <button
                    type="button"
                    onClick={handleAskFriend}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <MessageCircle size={12} /> Ask a Friend
                  </button>
                </div>

                <Link
                  to={`/wevmall/product/${product.id}`}
                  onClick={onClose}
                  className="w-full py-2 mt-1 rounded-xl text-center text-xs font-semibold text-zinc-400 hover:text-zinc-100 flex items-center justify-center gap-1.5 hover:bg-white/5 transition-colors"
                >
                  View Full Product Details <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
