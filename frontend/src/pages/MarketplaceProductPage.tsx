import React, { useEffect, useState } from 'react';
import { copyToClipboard } from '../lib/share/shareUtils';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  ShoppingCart,
  Store,
  Flag,
  Share2,
  Bell,
  Ban,
  Gavel,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
  RotateCcw,
  Lock,
} from 'lucide-react';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import { PriceTag, RatingStars, SellerBadge } from '../components/marketplace/commerce/primitives';
import { marketFetch, parseProductGallery, parseProductVideos, productThumb } from '../components/marketplace/commerce/utils';
import { saveAffiliate } from '../lib/affiliate';
import ReportModal from '../components/ReportModal';
import { ProductSocial } from '../components/marketplace/experience/ProductSocial';
import { RecommendRails } from '../components/marketplace/experience/RecommendRails';
import { CompareTray } from '../components/marketplace/experience/CompareTray';
import { formatViews, stockLabel } from '../components/marketplace/experience/stock';
import ImageZoomGallery from '../components/marketplace/commerce/ImageZoomGallery';
import ProductSpecifications from '../components/marketplace/commerce/ProductSpecifications';
import ProductReviewsPanel from '../components/marketplace/commerce/ProductReviewsPanel';
import Breadcrumb from '../components/marketplace/commerce/Breadcrumb';
import DeliveryOptionsCard from '../components/marketplace/commerce/DeliveryOptionsCard';
import MarketplaceFooter from '../components/marketplace/commerce/MarketplaceFooter';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reportTarget, setReportTarget] = useState<{ targetId: string; targetType: string } | null>(null);
  const [variant, setVariant] = useState('');
  const [offerAmt, setOfferAmt] = useState('');
  const [bidAmt, setBidAmt] = useState('');
  const [following, setFollowing] = useState(false);
  const [wished, setWished] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const p = await marketFetch(`/api/marketplace/${id}`, token);
        setProduct(p);
        setActiveImg(0);
        const rev = await marketFetch(`/api/marketplace/${id}/reviews`, token).catch(() => ({ reviews: [] }));
        setReviews(rev.reviews || []);
        if (token) {
          const wish = await marketFetch('/api/marketplace/wishlist', token).catch(() => []);
          const ids = (Array.isArray(wish) ? wish : []).map((w: any) => w.productId || w.id);
          setWished(ids.includes(id));
        }
      } catch (e: any) {
        toast.error(e.message || 'Product not found');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  useEffect(() => {
    const aff = searchParams.get('aff');
    const reel = searchParams.get('reel');
    if (!id || !aff || !reel) return;
    saveAffiliate({ creatorId: aff, reelId: reel, productId: id });
    if (!token) return;
    fetch('/api/reels/affiliate/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reelId: reel, productId: id }),
    }).catch(() => {});
  }, [id, searchParams, token]);

  useEffect(() => {
    if (!token) return;
    marketFetch('/api/marketplace/cart', token)
      .then((c) => setCartCount(c.count || 0))
      .catch(() => {});
  }, [token]);

  const images = product ? parseProductGallery(product) : [];
  if (!images.length && product) images.push(productThumb(product));
  const videos = product ? parseProductVideos(product) : [];

  const addToCart = async () => {
    if (!token) return toast.error('Sign in first');
    if (qty > Number(product.stockQuantity || 0)) return toast.error('Selected quantity is not available');
    try {
      await marketFetch('/api/marketplace/cart', token, {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity: qty }),
      });
      toast.success('Added to cart');
      const c = await marketFetch('/api/marketplace/cart', token);
      setCartCount(c.count || 0);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    }
  };

  const buyNow = async () => {
    await addToCart();
    navigate('/wevmall/checkout');
  };

  const chatSeller = async () => {
    if (!token) {
      toast.error('Please sign in to chat with seller');
      navigate('/auth');
      return;
    }
    if (!product?.sellerId) return;
    if (product.sellerId === user?.id) return toast.error('This is your listing');
    try {
      const res = await fetch('/api/wevchat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          receiverId: product.sellerId,
          text: `Hi! I'm interested in "${product.title}" (৳${Number(product.discountPrice || product.price).toLocaleString('en-BD')}). Is it currently available?\n${window.location.origin}/wevmall/product/${product.id}`,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to start chat');
      }
      const data = await res.json();
      toast.success('Connected with seller in WevChat');
      if (data?.conversationId) {
        navigate(`/messages/${data.conversationId}`);
      } else {
        navigate('/messages');
      }
    } catch (e: any) {
      toast.error(e.message || 'Chat failed');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto py-20 text-center text-sm text-muted-foreground">Loading product…</div>;
  }
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <p className="text-sm text-muted-foreground mb-3">Product not found</p>
        <Link to="/wevmall" className="text-[#F57224] font-bold text-sm">
          Back to WevMall
        </Link>
      </div>
    );
  }

  const shopSlug = product.seller?.sellerProfile?.shopSlug;
  const variants = (() => {
    try {
      const raw = product.variantsJson ? JSON.parse(product.variantsJson) : [];
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  })();
  const stock = stockLabel(product);
  const shareProduct = async (channel: 'copy' | 'whatsapp' | 'wevchat' | 'internal') => {
    const url = `${window.location.origin}/wevmall/product/${product.id}`;
    if (channel === 'copy') {
      if (await copyToClipboard(url)) toast.success('Link copied');
      else toast.error('Could not copy the link');
    } else if (channel === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${product.title} ${url}`)}`, '_blank');
    } else if (channel === 'internal') {
      // Opens the Universal Share modal (GlobalShareHost listens for this event).
      window.dispatchEvent(new CustomEvent('wev:share', { detail: { type: 'product', id: product.id, url, title: product.title } }));
    } else {
      navigate('/messages');
    }
    marketFetch(`/api/marketplace/${product.id}/share`, token, {
      method: 'POST',
      body: JSON.stringify({ channel }),
    }).catch(() => {});
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pb-28 md:pb-14">
      <MarketplaceHeader
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => navigate(`/wevmall?q=${encodeURIComponent(search)}`)}
        category="All"
        onCategory={() => navigate('/wevmall')}
        cartCount={cartCount}
      />

      <div className="mb-2.5 sm:mb-4">
        <Breadcrumb items={[
          { label: 'WevMall', href: '/wevmall' },
          { label: product.category || 'General', href: `/wevmall?category=${encodeURIComponent(product.category || 'General')}` },
          ...(product.subcategory ? [{ label: product.subcategory }] : []),
          { label: product.title }
        ]} />
      </div>

      {/* Main Product Showcase Card (Responsive 2-column showcase on Laptop/PC, stacked on Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 bg-[#141414] border border-[#c9a227]/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-xl mb-6">
        {/* Left Column: Image Zoom Gallery Preview (Sticky on desktop/laptop) */}
        <div className="lg:col-span-6 xl:col-span-5 lg:sticky lg:top-24 self-start">
          <ImageZoomGallery images={images} videos={videos} />
        </div>

        {/* Right Column: Information, Pricing, Seller Box, Options, and Actions */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-4 sm:gap-5">
          {/* Header Info */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              <span className="text-[#d4af37]">{product.category || 'General'}</span>
              {product.subcategory && <span>· {product.subcategory}</span>}
              {product.brand && <span>· {product.brand}</span>}
              <span>· {product.condition || 'New'}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-100 leading-snug tracking-tight">
              {product.title}
            </h1>

            {product.subtitle && (
              <p className="text-sm text-zinc-400 mt-1">{product.subtitle}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <RatingStars value={product.rating} count={product.reviewsCount} />
              <span className="text-xs text-zinc-400">{formatViews(product.viewCount)} Views</span>
              <span className="text-xs text-zinc-400">{formatViews(product.interestedCount)} Interested</span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${stock.className}`}>
                {stock.label}
              </span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-black/40 border border-[#c9a227]/20 flex flex-wrap items-baseline gap-3">
            <PriceTag price={product.price} discountPrice={product.discountPrice} className="text-2xl sm:text-3xl lg:text-4xl text-[#d4af37]" />
            {product.discountPrice && Number(product.discountPrice) < Number(product.price) && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
                {Math.round((1 - Number(product.discountPrice) / Number(product.price)) * 100)}% OFF
              </span>
            )}
          </div>

          {/* Description Snippet */}
          <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto pr-1 scrollbar-thin">
            {product.description || 'No description provided.'}
          </div>

          {/* Seller Card (Responsive on phone and laptop) */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-[#c9a227]/25 bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-black/60 border border-[#c9a227]/40 overflow-hidden shrink-0">
                {product.seller?.avatar ? (
                  <img src={product.seller.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Store className="m-3 text-zinc-400" size={18} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <SellerBadge
                  name={product.seller?.sellerProfile?.shopName || product.seller?.name}
                  verified={!!product.seller?.sellerProfile?.verifiedBadge}
                  phoneVerified={!!product.seller?.phoneVerified}
                  nidVerified={!!product.seller?.verified && product.seller?.verificationType === 'nid'}
                  kycVerified={
                    product.seller?.sellerProfile?.kycStatus === 'approved' ||
                    product.seller?.sellerProfile?.otpVerified
                  }
                />
                {typeof product.seller?.sellerProfile?.rating === 'number' && (
                  <p className="text-[11px] text-zinc-400 truncate">
                    Seller rating {Number(product.seller.sellerProfile.rating).toFixed(1)}
                    {product.seller.sellerProfile.trustScore != null &&
                      ` · Trust ${Number(product.seller.sellerProfile.trustScore).toFixed(0)}`}
                    {product.seller.sellerProfile.totalSales != null &&
                      ` · ${product.seller.sellerProfile.totalSales} sales`}
                  </p>
                )}
                {shopSlug && (
                  <Link to={`/shop/${shopSlug}`} className="text-xs text-[#d4af37] hover:underline font-semibold inline-block mt-0.5">
                    Visit Store →
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={async () => {
                  if (!token || !shopSlug) return;
                  const res = await fetch(`/api/v1/marketplace/seller-system/shop/${shopSlug}/follow`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const json = await res.json();
                  setFollowing(!!json.following);
                  toast.success(json.following ? 'Following seller' : 'Unfollowed');
                }}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                  following ? 'border-[#d4af37] text-[#d4af37] bg-[#d4af37]/10' : 'border-white/15 text-zinc-300 hover:border-white/30'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
              <button
                type="button"
                onClick={chatSeller}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#c9a227]/40 text-[#d4af37] hover:bg-[#c9a227]/10 text-xs font-bold transition-colors"
              >
                <MessageCircle size={14} /> Chat
              </button>
              <button
                type="button"
                onClick={() => setReportTarget({ targetId: product.id, targetType: 'product' })}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-colors"
                title="Report listing"
              >
                <Flag size={14} />
              </button>
            </div>
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Select Variant</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v: any) => {
                  const label = typeof v === 'string' ? v : v.name || v.label || v.value;
                  const isSelected = variant === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setVariant(label)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'border-[#d4af37] bg-[#d4af37]/15 text-[#d4af37] shadow-[0_0_10px_rgba(212,175,55,0.2)]'
                          : 'border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector with Stepper */}
          <div className="flex items-center gap-4 pt-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quantity</label>
            <div className="inline-flex items-center rounded-xl border border-[#c9a227]/30 bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.min(99, Number(product.stockQuantity || 1)))}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(Number(product.stockQuantity || 99), Number(e.target.value) || 1)))}
                className="w-12 text-center text-sm font-bold bg-transparent text-zinc-100 outline-none select-none"
              />
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(Number(product.stockQuantity || 99), q + 1))}
                disabled={qty >= Number(product.stockQuantity || 99)}
                aria-label="Increase quantity"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-300 hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <span className="text-xs text-zinc-400">
              {Number(product.stockQuantity || 0) > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
            </span>
          </div>

          {/* Desktop/Laptop Inline Action Buttons (Hidden on mobile phones, shown md+) */}
          <div className="hidden md:flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={buyNow}
              disabled={product.sold || Number(product.stockQuantity || 0) < 1}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e0c35a] hover:from-[#d4af37] hover:to-[#f0d56a] text-[#141414] font-extrabold text-sm shadow-lg hover:shadow-[0_8px_20px_rgba(201,162,39,0.3)] transition-all disabled:opacity-50"
            >
              Buy Now
            </button>
            <button
              type="button"
              onClick={addToCart}
              disabled={product.sold || Number(product.stockQuantity || 0) < 1}
              className="flex-1 py-3 px-6 rounded-xl border border-[#c9a227] text-[#d4af37] hover:bg-[#c9a227]/10 font-bold text-sm inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <ShoppingCart size={17} /> Add to Cart
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!token) return toast.error('Sign in to save items');
                if (wished) {
                  await marketFetch('/api/marketplace/wishlist', token, {
                    method: 'DELETE',
                    body: JSON.stringify({ productId: product.id }),
                  });
                  setWished(false);
                  toast.success('Removed from wishlist');
                } else {
                  await marketFetch('/api/marketplace/wishlist', token, {
                    method: 'POST',
                    body: JSON.stringify({ productId: product.id }),
                  });
                  setWished(true);
                  toast.success('Saved to wishlist');
                }
              }}
              aria-label="Wishlist"
              className={`py-3 px-4 rounded-xl border text-sm font-bold inline-flex items-center justify-center transition-all ${
                wished ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-white/15 text-zinc-300 hover:border-white/30'
              }`}
            >
              <Heart size={18} className={wished ? 'fill-current' : ''} />
            </button>
          </div>

          {/* Value Propositions / Trust Guarantee Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#d4af37] shrink-0" />
              <span>Buyer Protection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck size={14} className="text-[#d4af37] shrink-0" />
              <span>Verified Dispatch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <RotateCcw size={14} className="text-[#d4af37] shrink-0" />
              <span>Easy Return</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock size={14} className="text-[#d4af37] shrink-0" />
              <span>Escrow Security</span>
            </div>
          </div>

          {/* Nationwide Logistics & Delivery Calculator (Daraz Parity) */}
          <div className="pt-2">
            <DeliveryOptionsCard productPrice={Number(product.discountPrice || product.price || 0)} />
          </div>

          {/* Sharing and Alerts */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="text-zinc-500 font-medium mr-1">Share:</span>
            <button type="button" onClick={() => shareProduct('copy')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white transition-colors">
              <Share2 size={12} /> Copy Link
            </button>
            <button type="button" onClick={() => shareProduct('whatsapp')} className="px-2.5 py-1 rounded-lg border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white transition-colors">
              WhatsApp
            </button>
            <button type="button" onClick={() => shareProduct('wevchat')} className="px-2.5 py-1 rounded-lg border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white transition-colors">
              Wev Chat
            </button>
            <button type="button" onClick={() => shareProduct('internal')} className="px-2.5 py-1 rounded-lg border border-white/15 text-zinc-300 hover:border-white/30 hover:text-white transition-colors">
              Share in Wevsoft
            </button>
            <button
              type="button"
              onClick={async () => {
                await marketFetch('/api/marketplace/price-alerts', token, {
                  method: 'POST',
                  body: JSON.stringify({ productId: product.id }),
                });
                toast.success('Price drop alert active');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#c9a227]/30 text-[#d4af37] hover:bg-[#c9a227]/10 transition-colors ml-auto"
            >
              <Bell size={12} /> Price Alert
            </button>
          </div>

          {/* Auction Option */}
          {product.listingType === 'auction' && (
            <div className="border border-[#c9a227]/30 bg-black/40 rounded-xl p-3.5 space-y-2">
              <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                <Gavel size={14} className="text-[#d4af37]" /> Live Auction Listing
              </p>
              <p className="text-[11px] text-zinc-400">
                Starts ৳{Number(product.startingBid || product.price || 0).toLocaleString('en-BD')}
                {product.auctionEndsAt && ` · Ends ${new Date(product.auctionEndsAt).toLocaleString()}`}
              </p>
              <div className="flex gap-2">
                <input value={bidAmt} onChange={(e) => setBidAmt(e.target.value)} placeholder="Your bid amount (৳)" className="flex-1 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs bg-[#0c0c0c] text-zinc-100 outline-none focus:border-[#d4af37]" />
                <button
                  type="button"
                  onClick={async () => {
                    await marketFetch(`/api/marketplace/${product.id}/bids`, token, {
                      method: 'POST',
                      body: JSON.stringify({ amount: Number(bidAmt) }),
                    });
                    toast.success('Bid placed');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#c9a227] to-[#e0c35a] text-[#141414] text-xs font-bold"
                >
                  Place Bid
                </button>
              </div>
            </div>
          )}

          {/* Make Offer */}
          <div className="flex gap-2 pt-1">
            <input
              value={offerAmt}
              onChange={(e) => setOfferAmt(e.target.value)}
              placeholder="Offer custom price (৳)"
              className="flex-1 border border-white/15 rounded-lg px-3 py-2 text-xs bg-black/40 text-zinc-100 outline-none focus:border-[#d4af37]"
            />
            <button
              type="button"
              onClick={async () => {
                await marketFetch(`/api/marketplace/${product.id}/offers`, token, {
                  method: 'POST',
                  body: JSON.stringify({ amount: Number(offerAmt) }),
                });
                toast.success('Offer sent to seller');
              }}
              className="px-4 py-2 rounded-lg border border-[#c9a227]/40 text-[#d4af37] hover:bg-[#c9a227]/10 text-xs font-bold transition-colors"
            >
              Make Offer
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (iPhone & Android ergonomic shopping bar) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0e0e0e]/95 backdrop-blur-lg border-t border-[#c9a227]/30 px-3 py-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] flex items-center gap-2 md:hidden shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
        <button
          type="button"
          onClick={chatSeller}
          className="flex flex-col items-center justify-center min-w-[46px] py-1 text-zinc-300 hover:text-[#d4af37] transition-colors"
          title="Chat with Seller"
        >
          <MessageCircle size={18} />
          <span className="text-[10px] font-semibold mt-0.5">Chat</span>
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!token) return toast.error('Sign in to save items');
            if (wished) {
              await marketFetch('/api/marketplace/wishlist', token, {
                method: 'DELETE',
                body: JSON.stringify({ productId: product.id }),
              });
              setWished(false);
              toast.success('Removed from wishlist');
            } else {
              await marketFetch('/api/marketplace/wishlist', token, {
                method: 'POST',
                body: JSON.stringify({ productId: product.id }),
              });
              setWished(true);
              toast.success('Saved to wishlist');
            }
          }}
          className={`flex flex-col items-center justify-center min-w-[46px] py-1 transition-colors ${
            wished ? 'text-rose-500' : 'text-zinc-300 hover:text-rose-400'
          }`}
          title="Wishlist"
        >
          <Heart size={18} className={wished ? 'fill-current' : ''} />
          <span className="text-[10px] font-semibold mt-0.5">{wished ? 'Saved' : 'Wishlist'}</span>
        </button>
        <button
          type="button"
          onClick={addToCart}
          disabled={product.sold || Number(product.stockQuantity || 0) < 1}
          className="flex-1 py-2.5 px-3 rounded-xl border border-[#c9a227] text-[#d4af37] hover:bg-[#c9a227]/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
        >
          <ShoppingCart size={15} /> Add to Cart
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={product.sold || Number(product.stockQuantity || 0) < 1}
          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#c9a227] to-[#e0c35a] hover:from-[#d4af37] hover:to-[#f0d56a] text-[#141414] font-bold text-xs sm:text-sm flex items-center justify-center shadow-lg transition-all disabled:opacity-50"
        >
          Buy Now
        </button>
      </div>

      <div className="mb-6">
        <ProductSpecifications product={product} />
      </div>

      <ProductSocial productId={product.id} token={token} isSeller={user?.id === product.sellerId} />

      <RecommendRails token={token} productId={product.id} />
      <CompareTray />

      <ProductReviewsPanel productId={product.id} token={token} initialReviews={reviews} />

      <div className="mt-3 flex gap-3 text-[11px]">
        <button
          type="button"
          onClick={() => setReportTarget({ targetId: product.sellerId, targetType: 'seller' })}
          className="text-muted-foreground hover:text-rose-500"
        >
          Report seller
        </button>
        <button
          type="button"
          onClick={async () => {
            await marketFetch('/api/marketplace/block-seller', token, {
              method: 'POST',
              body: JSON.stringify({ sellerId: product.sellerId }),
            });
            toast.success('Seller blocked');
          }}
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-rose-500"
        >
          <Ban size={11} /> Block seller
        </button>
      </div>

      {reportTarget && (
        <ReportModal
          targetId={reportTarget.targetId}
          targetType={reportTarget.targetType}
          onClose={() => setReportTarget(null)}
        />
      )}

      <div className="mt-8">
        <MarketplaceFooter />
      </div>
    </div>
  );
}
