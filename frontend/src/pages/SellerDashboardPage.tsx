import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  Package,
  ShoppingBag,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  Clock,
  Star,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../store';
import { SellerProductsManager } from '../components/marketplace/SellerProductsManager';
import { SellerOrdersManager } from '../components/marketplace/SellerOrdersManager';
import { SellerChatCenter } from '../components/marketplace/SellerChatCenter';
import { SellerPayoutsManager } from '../components/marketplace/SellerPayoutsManager';
import { SellerVerificationSettings } from '../components/marketplace/SellerVerificationSettings';
import { AiSellerToolsModal } from '../components/marketplace/AiSellerToolsModal';
import { SellerGrowthPanel } from '../components/marketplace/SellerGrowthPanel';
import { SellerShopSettings } from '../components/marketplace/SellerShopSettings';
import SellerCouponManager from '../components/marketplace/commerce/SellerCouponManager';
import SellerPromotionManager from '../components/marketplace/commerce/SellerPromotionManager';
import { Ticket, Zap } from 'lucide-react';

type Tab = 'overview' | 'products' | 'orders' | 'chat' | 'payouts' | 'verification' | 'growth' | 'shop' | 'coupons' | 'promotions';

export default function SellerDashboardPage() {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showAiTools, setShowAiTools] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/v1/marketplace/seller-system/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        navigate('/seller/onboarding');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load seller dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchDashboard();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">
        Loading seller console…
      </div>
    );
  }
  if (!data) return null;

  if (data.seller?.status === 'pending') {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold mb-2">Pending Approval</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your seller account is under review. You can browse the mall while waiting.
          </p>
          <Link
            to="/wevmall"
            className="inline-flex px-5 py-2.5 rounded-md bg-[#F57224] text-white text-sm font-bold"
          >
            Back to WevMall
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'coupons', label: 'Coupons', icon: Ticket },
    { id: 'promotions', label: 'Promotions', icon: Zap },
    { id: 'payouts', label: 'Payouts', icon: CreditCard },
    { id: 'verification', label: 'KYC', icon: ShieldCheck },
    { id: 'growth', label: 'Growth', icon: Star },
    { id: 'shop', label: 'Shop', icon: Package },
  ];

  const seller = data.seller;
  const stats = data.stats || {};
  const shopSlug = seller.shopSlug;

  return (
    <div className="w-full max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Seller Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage listings, orders, and payouts for {seller.shopName || 'your shop'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/wevmall"
            className="px-3 py-2 rounded-md border border-border text-xs font-bold hover:bg-muted"
          >
            Mall
          </Link>
          {shopSlug && (
            <Link
              to={`/shop/${shopSlug}`}
              className="px-3 py-2 rounded-md bg-[#F57224] text-white text-xs font-bold inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> View shop
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
        <aside className="bg-card border border-border rounded-lg p-3 h-fit">
          <div className="flex items-center gap-2 p-2 mb-2 rounded-md bg-[#F57224]/10 border border-[#F57224]/20">
            <div className="w-9 h-9 rounded-md bg-[#F57224] text-white flex items-center justify-center font-bold">
              {(seller.shopName || 'S').charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{seller.shopName || 'Shop'}</div>
              <div className="text-[10px] text-[#F57224] font-semibold">Seller account</div>
            </div>
          </div>
          <nav className="space-y-0.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs font-semibold ${
                  activeTab === t.id
                    ? 'bg-[#F57224] text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {activeTab === 'coupons' && <SellerCouponManager />}
          {activeTab === 'promotions' && <SellerPromotionManager />}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Revenue', value: `৳${Number(stats.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp },
                  { label: 'Pending orders', value: stats.pendingOrders ?? 0, icon: Clock },
                  { label: 'Products', value: stats.totalProducts ?? 0, icon: Package },
                  { label: 'Rating', value: `${stats.rating ?? 0} / 5`, icon: Star },
                ].map((s) => (
                  <div key={s.label} className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-[11px] font-bold uppercase">
                      <s.icon size={14} className="text-[#F57224]" /> {s.label}
                    </div>
                    <div className="text-xl font-extrabold mt-2">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-bold text-sm mb-3">Recent orders</h3>
                {(data.orders || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No orders yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="pb-2 font-semibold">Order</th>
                          <th className="pb-2 font-semibold">Product</th>
                          <th className="pb-2 font-semibold">Amount</th>
                          <th className="pb-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.orders || []).slice(0, 8).map((order: any) => (
                          <tr key={order.id} className="border-b border-border/50">
                            <td className="py-2.5">#{String(order.id).slice(-6).toUpperCase()}</td>
                            <td className="py-2.5">{order.product?.title || 'Product'}</td>
                            <td className="py-2.5 font-bold">৳{order.amount}</td>
                            <td className="py-2.5 uppercase text-[10px] font-bold text-muted-foreground">
                              {order.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'products' && <SellerProductsManager onOpenAiTools={() => setShowAiTools(true)} />}
          {activeTab === 'orders' && <SellerOrdersManager />}
          {activeTab === 'chat' && (
            <SellerChatCenter onOpenAiTools={() => setShowAiTools(true)} />
          )}
          {activeTab === 'payouts' && <SellerPayoutsManager />}
          {activeTab === 'verification' && (
            <SellerVerificationSettings
              sellerProfile={seller}
              onRefreshProfile={fetchDashboard}
            />
          )}
          {activeTab === 'growth' && <SellerGrowthPanel />}
          {activeTab === 'shop' && (
            <SellerShopSettings sellerProfile={seller} onRefreshProfile={fetchDashboard} />
          )}
        </main>
      </div>
      {showAiTools && <AiSellerToolsModal onClose={() => setShowAiTools(false)} />}
    </div>
  );
}
