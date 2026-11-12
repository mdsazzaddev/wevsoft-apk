import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MessageCircle, Store, Users, Star, MapPin, X, Edit, Share2 } from 'lucide-react';
import { useStore } from '../store';
import { ProductGrid } from '../components/marketplace/commerce/ProductCard';
import { RatingStars } from '../components/marketplace/commerce/primitives';
import { marketFetch } from '../components/marketplace/commerce/utils';
import Breadcrumb from '../components/marketplace/commerce/Breadcrumb';

type Tab = 'products' | 'reviews' | 'about' | 'followers';

export default function PublicShopPage() {
  const { slug } = useParams();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('products');
  const [following, setFollowing] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [showAdminEdit, setShowAdminEdit] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState({ shopName: '', description: '', shopCategory: '', contactEmail: '', contactPhone: '' });

  const openAdminEdit = () => {
    setAdminEditForm({
      shopName: data?.seller?.shopName || '',
      description: data?.seller?.description || '',
      shopCategory: data?.seller?.shopCategory || '',
      contactEmail: data?.seller?.contactEmail || '',
      contactPhone: data?.seller?.contactPhone || ''
    });
    setShowAdminEdit(true);
  };

  const saveAdminEdit = async () => {
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/admin/sellers/${data.seller.id}/shop`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(adminEditForm)
      });
      if (res.ok) {
        toast.success('Shop updated by admin');
        setShowAdminEdit(false);
        load();
      } else {
        toast.error('Failed to update shop');
      }
    } catch {
      toast.error('Error updating shop');
    }
  };


  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/shop/${slug}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Shop not found');
      setData(json);
      if (user && json.seller?.followers) {
        setFollowing(json.seller.followers.some((f: any) => f.userId === user.id));
      }
    } catch (e: any) {
      toast.error(e.message || 'Shop not found');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug, user?.id]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      marketFetch('/api/marketplace/cart', token).catch(() => ({ count: 0 })),
      marketFetch('/api/marketplace/wishlist', token).catch(() => []),
    ]).then(([cart, wish]) => {
      setCartCount(cart.count || 0);
      setWishlistIds(new Set((Array.isArray(wish) ? wish : []).map((w: any) => w.productId)));
    });
  }, [token]);

  const handleChat = async () => {
    if (!token) return toast.error('Please sign in to chat');
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/chat-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sellerId: data.seller.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      navigate(`/messages?chat=${json.conversationId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start chat');
    }
  };

  const handleFollow = async () => {
    if (!token) return toast.error('Please sign in');
    try {
      const res = await fetch(`/api/v1/marketplace/seller-system/shop/${slug}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setFollowing(!!json.following);
      toast.success(json.message || (json.following ? 'Following' : 'Unfollowed'));
      load();
    } catch (e: any) {
      toast.error(e.message || 'Follow failed');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto py-20 text-center text-sm text-muted-foreground">Loading shop…</div>;
  }
  if (!data) {
    return (
      <div className="max-w-7xl mx-auto py-20 text-center">
        <p className="text-sm text-muted-foreground mb-3">Shop not found</p>
        <Link to="/wevmall" className="text-[#F57224] font-bold text-sm">
          Back to WevMall
        </Link>
      </div>
    );
  }

  const { seller, isVerified, products, reviews, reputationBreakdown } = data;
  const shopTitle = seller.shopName || seller.displayName || seller.user?.name || 'Shop';

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="mb-4">
        <Breadcrumb items={[
          { label: 'WevMall', href: '/wevmall' },
          { label: 'Shops' },
          { label: shopTitle }
        ]} />
      </div>
      <div className="relative h-40 md:h-52 rounded-lg overflow-hidden bg-muted border border-border mb-4">
        {seller.banner ? (
          <img src={seller.banner} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#F57224]/30 to-[#F57224]/5" />
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 md:p-5 -mt-10 relative z-10 mb-4 flex flex-col md:flex-row gap-4 md:items-center">
        <div className="w-20 h-20 rounded-lg border-4 border-card bg-muted overflow-hidden shrink-0 -mt-8 md:mt-0 shadow">
          {seller.logo || seller.user?.avatar ? (
            <img src={seller.logo || seller.user?.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <Store className="m-6 text-muted-foreground" size={28} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{shopTitle}</h1>
            {isVerified && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600">
                Verified
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            <RatingStars value={reputationBreakdown?.overallRating || seller.rating} />
            <span className="inline-flex items-center gap-1">
              <Users size={12} /> {seller.followersCount || 0} followers
            </span>
            <span>{products?.length || 0} products</span>
            <span>{seller.totalSales || 0} sales</span>
            {seller.createdAt && <span>Joined {new Date(seller.createdAt).toLocaleDateString()}</span>}
            {seller.responseTimeMins != null && <span>Replies in {seller.responseTimeMins}m</span>}
            {seller.trustScore != null && <span>Trust {Number(seller.trustScore).toFixed(0)}</span>}
            {seller.buyerProtection && (
              <span className="text-emerald-600 font-bold">Buyer Protection</span>
            )}
            {(seller.city || seller.country) && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {[seller.city, seller.country].filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {user?.role === 'admin' && (
            <button
              type="button"
              onClick={openAdminEdit}
              className="px-4 py-2 rounded-md text-xs font-bold bg-blue-500 text-white inline-flex items-center gap-1 hover:bg-blue-600"
            >
              <Edit size={14} /> Admin Edit
            </button>
          )}
          {user?.id !== seller.userId && (
            <>
              <button
                type="button"
                onClick={handleFollow}
                className={`px-4 py-2 rounded-md text-xs font-bold border ${
                  following
                    ? 'border-border bg-muted text-foreground'
                    : 'border-[#F57224] bg-[#F57224] text-white'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
              <button
                type="button"
                onClick={handleChat}
                className="px-4 py-2 rounded-md text-xs font-bold border border-border inline-flex items-center gap-1"
              >
                <MessageCircle size={14} /> Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied!');
                }}
                className="px-3 py-2 rounded-md border border-border text-xs font-bold"
                title="Share"
              >
                <Share2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-4">
        {([
          ['products', `Products (${products?.length || 0})`],
          ['reviews', `Reviews (${reviews?.length || 0})`],
          ['about', 'About'],
          ['followers', 'Followers'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${
              tab === id
                ? 'border-[#F57224] text-[#F57224]'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <ProductGrid
          products={products || []}
          wishlistIds={wishlistIds}
          onWishlistChange={(id, wished) => {
            setWishlistIds((prev) => {
              const next = new Set(prev);
              if (wished) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onCartChange={async () => {
            if (!token) return;
            const c = await marketFetch('/api/marketplace/cart', token).catch(() => ({ count: 0 }));
            setCartCount(c.count || 0);
          }}
        />
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {(reviews || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No reviews yet</p>
          ) : (
            reviews.map((r: any) => (
              <div key={r.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star size={14} className="text-[#F57224] fill-current" />
                  <span className="text-xs font-bold">{r.user?.name || 'Buyer'}</span>
                </div>
                <p className="text-sm text-muted-foreground">{r.comment || r.reviewText || 'Great seller.'}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'about' && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-3 text-sm">
          <p className="text-muted-foreground whitespace-pre-wrap">
            {seller.description || 'This seller has not added a shop description yet.'}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {[
              ['Quality', reputationBreakdown?.productQuality],
              ['Delivery', reputationBreakdown?.deliverySpeed],
              ['Service', reputationBreakdown?.customerService],
              ['Completion', reputationBreakdown?.orderCompletionRate],
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-md bg-muted/40 border border-border p-3">
                <div className="text-[10px] uppercase font-bold text-muted-foreground">{label}</div>
                <div className="text-base font-bold mt-1">{val ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'followers' && (
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-sm text-muted-foreground text-center py-8">
            Followers list is private for verified stores.
          </p>
        </div>
      )}

      {showAdminEdit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="font-bold text-lg flex items-center gap-2"><Edit size={18} className="text-primary"/> Edit Shop (Admin)</h2>
              <button onClick={() => setShowAdminEdit(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Shop Name</label>
                <input type="text" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary" value={adminEditForm.shopName} onChange={e => setAdminEditForm({...adminEditForm, shopName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Description</label>
                <textarea className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary" rows={3} value={adminEditForm.description} onChange={e => setAdminEditForm({...adminEditForm, description: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Category</label>
                <input type="text" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary" value={adminEditForm.shopCategory} onChange={e => setAdminEditForm({...adminEditForm, shopCategory: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Contact Email</label>
                <input type="email" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary" value={adminEditForm.contactEmail} onChange={e => setAdminEditForm({...adminEditForm, contactEmail: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Contact Phone</label>
                <input type="text" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary" value={adminEditForm.contactPhone} onChange={e => setAdminEditForm({...adminEditForm, contactPhone: e.target.value})} />
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/10 flex justify-end gap-3 mt-auto">
              <button onClick={() => setShowAdminEdit(false)} className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveAdminEdit} className="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

