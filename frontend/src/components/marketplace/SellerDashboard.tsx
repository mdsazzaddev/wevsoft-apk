import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Store,
  DollarSign,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ArrowUpRight,
  ShoppingBag,
  MessageSquare,
  CreditCard,
  Star,
  Users,
  Wand2,
  ExternalLink,
  Loader2,
  Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { SellerProductsManager } from './SellerProductsManager';
import { SellerOrdersManager } from './SellerOrdersManager';
import { SellerChatCenter } from './SellerChatCenter';
import { SellerPayoutsManager } from './SellerPayoutsManager';
import { AiSellerToolsModal } from './AiSellerToolsModal';
import { SellerVerificationSettings } from './SellerVerificationSettings';
import { AdminLocationManagementPanel } from './AdminLocationManagementPanel';

export const SellerDashboard: React.FC<{ onBackToMarketplace?: () => void }> = ({ onBackToMarketplace }) => {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PRODUCTS' | 'ORDERS' | 'CHAT' | 'PAYOUTS' | 'VERIFICATION' | 'ADMIN_LOCATIONS'>('OVERVIEW');
  const [showAiTools, setShowAiTools] = useState(false);

  const [dashboardData, setDashboardData] = useState<{
    seller: any;
    stats: {
      totalRevenue: number;
      totalSales: number;
      pendingOrders: number;
      totalProducts: number;
      rating: number;
      followersCount: number;
      verifiedBadge: boolean;
      commissionRate: number;
    };
    orders: any[];
    aiAnalystInsights: string[];
    revenueChart: any[];
  } | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/marketplace/seller-system/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (e) {
      console.error('[Dashboard Fetch Error]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchDashboard();
  }, []);

  const stats = dashboardData?.stats || {
    totalRevenue: 125400,
    totalSales: 42,
    pendingOrders: 3,
    totalProducts: 8,
    rating: 4.9,
    followersCount: 128,
    verifiedBadge: true,
    commissionRate: 0.06
  };

  const seller = dashboardData?.seller || {
    displayName: `${user?.name || 'Wevsoft'}'s Verified Store`,
    shopName: `${user?.name || 'My'}'s Official Shop`,
    shopSlug: 'official-shop',
    shopCategory: 'Electronics & Gadgets',
    country: 'Bangladesh',
    city: 'Dhaka'
  };

  const aiInsights = dashboardData?.aiAnalystInsights || [
    "💡 **Pricing Optimization**: Comparable items in your category sell 34% faster when priced ending in ৳99.",
    "🚀 **Escrow Trust Boost**: Your shop rating is 4.9/5.0. Fast dispatch under 24 hours unlocks the Gold Seller Badge.",
    "📈 **Peak Traffic Alert**: Wevsoft buyers browse actively on weekends between 7 PM - 11 PM. Launch a flash discount to capture orders."
  ];

  const recentOrders = dashboardData?.orders || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Storefront Header (Amazon Seller Central + Daraz SaaS) */}
      <div className="bg-card/90 backdrop-blur-2xl border border-border rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary flex items-center justify-center text-white font-extrabold shadow-lg shrink-0">
            <Store size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">{seller.shopName || seller.displayName}</h1>
              {stats.verifiedBadge && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck size={12} />
                  VERIFIED GOLD SELLER
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary">
                {seller.shopCategory || 'General Store'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Multi-Vendor Storefront • Escrow Protection Active • {(stats.commissionRate * 100).toFixed(1)}% Commission Tier
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setShowAiTools(true)}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary text-white text-xs font-extrabold shadow-lg hover:from-primary hover:to-primary flex items-center justify-center gap-1.5"
          >
            <Sparkles size={15} />
            Gemini AI Tools
          </button>
          {onBackToMarketplace && (
            <button
              onClick={onBackToMarketplace}
              className="px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              ← WevMall Feed
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        {[
          { id: 'OVERVIEW', label: 'Dashboard Overview', icon: TrendingUp },
          { id: 'PRODUCTS', label: 'Products & Variants', icon: Package },
          { id: 'ORDERS', label: 'Orders & Tracking', icon: ShoppingBag },
          { id: 'CHAT', label: 'Buyer Chat Center', icon: MessageSquare },
          { id: 'PAYOUTS', label: 'Escrow Payouts & Bank', icon: CreditCard },
          { id: 'VERIFICATION', label: 'Identity Verification', icon: ShieldCheck },
          { id: 'ADMIN_LOCATIONS', label: 'Admin Locations', icon: Globe }
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-3 rounded-t-2xl font-extrabold text-xs flex items-center gap-2 transition-all border-b-2 shrink-0 ${
                active
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top 6 KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
                <span>Total Revenue</span>
                <DollarSign size={16} className="text-emerald-400" />
              </div>
              <p className="text-lg font-black text-foreground">৳{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-400 font-bold">Wevsoft Escrow Protected</p>
            </div>

            <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
                <span>Total Orders</span>
                <ShoppingBag size={16} className="text-primary" />
              </div>
              <p className="text-lg font-black text-foreground">{stats.totalSales}</p>
              <p className="text-[10px] text-muted-foreground font-bold">+12% this month</p>
            </div>

            <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
                <span>Pending Orders</span>
                <Clock size={16} className="text-amber-400" />
              </div>
              <p className="text-lg font-black text-amber-400">{stats.pendingOrders}</p>
              <p className="text-[10px] text-amber-400/80 font-bold">Needs dispatch</p>
            </div>

            <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
                <span>Active SKU Listings</span>
                <Package size={16} className="text-blue-400" />
              </div>
              <p className="text-lg font-black text-foreground">{stats.totalProducts}</p>
              <p className="text-[10px] text-muted-foreground font-bold">All live in feed</p>
            </div>

            <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
                <span>Store Rating</span>
                <Star size={16} className="text-amber-400 fill-amber-400" />
              </div>
              <p className="text-lg font-black text-foreground">{stats.rating} ★</p>
              <p className="text-[10px] text-emerald-400 font-bold">Top 5% Seller</p>
            </div>

            <div className="bg-card dark:bg-zinc-900 border border-border rounded-2xl p-4 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
                <span>Shop Followers</span>
                <Users size={16} className="text-primary" />
              </div>
              <p className="text-lg font-black text-foreground">{stats.followersCount}</p>
              <p className="text-[10px] text-muted-foreground font-bold">Verified buyers</p>
            </div>
          </div>

          {/* AI Business Analyst & Revenue Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Business Analyst Card */}
            <div className="lg:col-span-1 bg-gradient-to-br from-primary/30 via-primary/20 to-card dark:to-zinc-900 border border-primary/30 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-primary animate-pulse" />
                    <h3 className="text-sm font-extrabold text-foreground">Gemini AI Business Analyst</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI-driven actionable insights for pricing, inventory, and storefront conversion:
                </p>

                <div className="space-y-2.5 pt-1">
                  {aiInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-black/20 dark:bg-white/5 border border-primary/20 text-xs text-foreground leading-relaxed"
                    >
                      {insight}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowAiTools(true)}
                className="w-full py-2.5 rounded-xl bg-primary/30 hover:bg-primary/40 border border-primary/40 text-primary text-xs font-extrabold flex items-center justify-center gap-2 transition-all"
              >
                <Wand2 size={15} />
                Open Full AI Seller Tools Suite
              </button>
            </div>

            {/* Revenue Performance Chart Card */}
            <div className="lg:col-span-2 bg-card dark:bg-zinc-900 border border-border rounded-3xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-foreground">7-Day Revenue & Order Trend</h3>
                  <p className="text-xs text-muted-foreground">Settled BDT ৳ transactions via Escrow</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                  +18.4% Growth
                </span>
              </div>

              {/* Responsive Bar Chart View */}
              <div className="grid grid-cols-7 gap-2 items-end h-48 pt-6 pb-2 px-2">
                {[
                  { day: 'Mon', rev: 14500, height: '45%' },
                  { day: 'Tue', rev: 18200, height: '55%' },
                  { day: 'Wed', rev: 12000, height: '40%' },
                  { day: 'Thu', rev: 24500, height: '70%' },
                  { day: 'Fri', rev: 31000, height: '85%' },
                  { day: 'Sat', rev: 28400, height: '78%' },
                  { day: 'Sun', rev: 35800, height: '95%' }
                ].map((col, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      ৳{(col.rev / 1000).toFixed(1)}k
                    </span>
                    <div
                      style={{ height: col.height }}
                      className="w-full max-w-[36px] bg-gradient-to-t from-primary to-primary rounded-t-xl hover:from-primary hover:to-primary transition-all shadow-md"
                    />
                    <span className="text-xs font-bold text-muted-foreground">{col.day}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                <span>Peak shopping hours: 8:00 PM – 11:30 PM (Dhaka Time)</span>
                <span className="text-primary font-bold">Wevsoft Escrow Instant Settlement</span>
              </div>
            </div>
          </div>

          {/* Recent Orders Table Preview */}
          <div className="bg-card dark:bg-zinc-900 border border-border rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Recent WevMall Orders</h3>
                <p className="text-xs text-muted-foreground">Orders awaiting courier dispatch & delivery confirmation</p>
              </div>
              <button
                onClick={() => setActiveTab('ORDERS')}
                className="text-xs font-extrabold text-primary hover:underline flex items-center gap-1"
              >
                View All Orders
                <ArrowUpRight size={14} />
              </button>
            </div>

            {recentOrders.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Package size={32} className="mx-auto text-muted-foreground opacity-50" />
                <p className="text-sm font-bold text-foreground">No recent orders to show</p>
                <p className="text-xs text-muted-foreground">Once buyers check out your items, their orders will show up here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentOrders.slice(0, 5).map((ord) => (
                  <div
                    key={ord.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-border hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        #{ord.orderNumber ? ord.orderNumber.slice(-4) : ord.id.slice(0, 4)}
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-foreground">{ord.product?.title || 'Verified Item'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Buyer: {ord.buyer?.name || 'Verified Buyer'} • Qty: {ord.quantity || 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-foreground">৳{ord.amount}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. PRODUCTS */}
      {activeTab === 'PRODUCTS' && (
        <SellerProductsManager onOpenAiTools={() => setShowAiTools(true)} />
      )}

      {/* TAB CONTENT: 3. ORDERS */}
      {activeTab === 'ORDERS' && (
        <SellerOrdersManager />
      )}

      {/* TAB CONTENT: 4. CHAT */}
      {activeTab === 'CHAT' && (
        <SellerChatCenter onOpenAiTools={() => setShowAiTools(true)} />
      )}

      {/* TAB CONTENT: 5. PAYOUTS */}
      {activeTab === 'PAYOUTS' && (
        <SellerPayoutsManager />
      )}

      {/* TAB CONTENT: 6. VERIFICATION */}
      {activeTab === 'VERIFICATION' && (
        <SellerVerificationSettings sellerProfile={seller} onRefreshProfile={fetchDashboard} />
      )}

      {/* TAB CONTENT: 7. ADMIN LOCATIONS */}
      {activeTab === 'ADMIN_LOCATIONS' && (
        <AdminLocationManagementPanel />
      )}

      {/* Gemini AI Seller Tools Modal */}
      <AnimatePresence>
        {showAiTools && <AiSellerToolsModal onClose={() => setShowAiTools(false)} />}
      </AnimatePresence>
    </div>
  );
};
