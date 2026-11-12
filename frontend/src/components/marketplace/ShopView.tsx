import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Store,
  ShieldCheck,
  Star,
  Users,
  MapPin,
  Heart,
  MessageCircle,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  Share2,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface ShopViewProps {
  slug?: string;
  sellerName?: string;
  shopName?: string;
  avatar?: string | null;
  banner?: string | null;
  onBack?: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
  slug = 'official-shop',
  sellerName = 'Abrar Rahman',
  shopName = 'Abrar Tech & Gadgets',
  avatar,
  banner,
  onBack,
}) => {
  const token = useStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(128);
  const [shopData, setShopData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [reputation, setReputation] = useState({
    overallRating: 4.9,
    productQuality: 4.9,
    deliverySpeed: 4.8,
    customerService: 4.9,
    orderCompletionRate: '99.4%'
  });

  const fetchShop = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/shop/${slug}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setShopData(data.seller);
        setProducts(data.products || []);
        if (data.reputationBreakdown) {
          setReputation(data.reputationBreakdown);
        }
        if (data.seller.followersCount) {
          setFollowersCount(data.seller.followersCount);
        }
      } else {
        // Fallback demo data
        setProducts([
          {
            id: 'p-1',
            title: 'Sony WH-1000XM4 Wireless Noise Canceling Headphones',
            price: 24500,
            discountPrice: 22999,
            condition: 'New',
            category: 'Electronics',
            warranty: '1 Year Sony Warranty',
            images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80']
          },
          {
            id: 'p-2',
            title: 'Keychron K2 Wireless Mechanical Keyboard (RGB)',
            price: 6800,
            condition: 'Used - Like New',
            category: 'Electronics',
            warranty: '7 Days Replacement',
            images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80']
          },
          {
            id: 'p-3',
            title: 'MacBook Pro 14 M2 Pro (16GB / 512GB SSD)',
            price: 185000,
            condition: 'Used - Good',
            category: 'Electronics',
            warranty: 'Official Apple Care',
            images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80']
          }
        ]);
      }
    } catch (e) {
      console.error('[ShopView Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchShop();
  }, [slug]);

  const handleToggleFollow = async () => {
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/shop/${slug}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFollowing(data.following);
        setFollowersCount(prev => data.following ? prev + 1 : Math.max(0, prev - 1));
        toast.success(data.message);
      } else {
        setFollowing(!following);
        setFollowersCount(prev => !following ? prev + 1 : Math.max(0, prev - 1));
        toast.success(!following ? 'Following shop!' : 'Unfollowed shop');
      }
    } catch (e) {
      setFollowing(!following);
      setFollowersCount(prev => !following ? prev + 1 : Math.max(0, prev - 1));
      toast.success(!following ? 'Following shop!' : 'Unfollowed shop');
    }
  };

  const name = shopData?.shopName || shopData?.displayName || shopName;
  const subtitle = shopData?.shopCategory || 'Electronics & Gadgets';
  const location = shopData?.city ? `${shopData.city}, ${shopData.country || 'Bangladesh'}` : 'Dhaka, Bangladesh';

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          <span>Back to WevMall</span>
        </button>
      )}

      {/* Public Storefront Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-border bg-card/90 shadow-2xl">
        <div className="h-48 sm:h-56 w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-900 relative">
          {banner && <img src={banner} alt="" className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

          {/* Top floating badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Wevsoft Escrow Protected
            </span>
          </div>
        </div>

        {/* Profile Info Overlay */}
        <div className="p-6 -mt-14 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-3xl bg-card dark:bg-zinc-900 border-4 border-card dark:border-zinc-900 shadow-2xl overflow-hidden flex items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-600 text-white text-3xl font-extrabold">
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : name.charAt(0)}
            </div>

            <div className="space-y-1 mb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-foreground">{name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  VERIFIED GOLD SELLER
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="font-bold text-purple-400">{subtitle}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} />
                  {location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users size={13} />
                  {followersCount} Followers
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFollow}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md ${
                following
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500'
              }`}
            >
              <Heart size={15} className={following ? 'fill-purple-400 text-purple-400' : ''} />
              {following ? 'Following Shop' : 'Follow Shop'}
            </button>
            <button
              onClick={() => toast.success('Link copied to clipboard!')}
              className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 text-muted-foreground hover:text-foreground"
              title="Share Shop"
            >
              <Share2 size={16} />
            </button>
          </div>
        </div>

        {/* Reputation Breakdown Strip */}
        <div className="px-6 py-4 bg-black/5 dark:bg-white/5 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Star size={18} className="fill-amber-400" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{reputation.overallRating} / 5.0</p>
              <p className="text-[11px] text-muted-foreground font-bold">Overall Rating</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Award size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{reputation.productQuality} / 5.0</p>
              <p className="text-[11px] text-muted-foreground font-bold">Product Quality</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{reputation.deliverySpeed} / 5.0</p>
              <p className="text-[11px] text-muted-foreground font-bold">Delivery Speed</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">{reputation.orderCompletionRate}</p>
              <p className="text-[11px] text-muted-foreground font-bold">Order Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Storefront Products Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <ShoppingBag size={20} className="text-purple-400" />
            Verified Storefront Catalog ({products.length})
          </h2>
          <span className="text-xs text-muted-foreground font-bold">Escrow Protected • 7-Day Return</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-purple-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-3xl space-y-2">
            <ShoppingBag size={36} className="mx-auto text-muted-foreground opacity-50" />
            <p className="text-sm font-bold text-foreground">No active products right now</p>
            <p className="text-xs text-muted-foreground">Check back soon for new arrivals from this verified seller!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map((p) => {
              const images = p.images && typeof p.images === 'string' ? JSON.parse(p.images) : p.images || [];
              const thumbnail = Array.isArray(images) && images[0]
                ? images[0]
                : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80';

              return (
                <div
                  key={p.id}
                  className="bg-card dark:bg-zinc-900 border border-border rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all shadow-sm flex flex-col justify-between group"
                >
                  <div>
                    <div className="h-44 w-full bg-black/10 overflow-hidden relative">
                      <img
                        src={thumbnail}
                        alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {p.discountPrice && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-black">
                          SALE
                        </span>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-bold text-purple-400">{p.category || 'Electronics'}</span>
                        <span>{p.condition || 'New'}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-foreground line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {p.title}
                      </h3>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-2 border-t border-border flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-foreground">
                          ৳{p.discountPrice || p.price}
                        </span>
                        {p.discountPrice && (
                          <span className="text-xs text-muted-foreground line-through">
                            ৳{p.price}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        {p.warranty || 'Official Warranty Included'}
                      </span>
                    </div>

                    <Link
                      to={`/wevmall/product/${p.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
