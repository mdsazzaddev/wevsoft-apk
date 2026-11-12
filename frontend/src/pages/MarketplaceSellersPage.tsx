import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/commerce/MarketplaceFooter';
import Breadcrumb from '../components/marketplace/commerce/Breadcrumb';
import { marketFetch } from '../components/marketplace/commerce/utils';
import { ShieldCheck, CheckCircle, BadgeCheck, Award, ShieldAlert, Star, Users, Store } from 'lucide-react';

export default function MarketplaceSellersPage() {
  const token = useStore((s) => s.token);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchSellers = async () => {
      try {
        setLoading(true);
        const data = await marketFetch('/api/marketplace/feed/verified-sellers', token);
        if (isMounted) {
          setSellers(Array.isArray(data) ? data : data.sellers || []);
        }
      } catch (error) {
        console.error('Error fetching verified sellers:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSellers();
    return () => { isMounted = false; };
  }, [token]);

  const getBadgeStyle = (badge: string) => {
    switch (String(badge).toLowerCase()) {
      case 'verified': return { icon: <CheckCircle className="w-3 h-3" />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' };
      case 'trusted': return { icon: <BadgeCheck className="w-3 h-3" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' };
      case 'premium': return { icon: <Award className="w-3 h-3" />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30' };
      case 'top_seller': return { icon: <ShieldAlert className="w-3 h-3" />, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' };
      default: return { icon: <CheckCircle className="w-3 h-3" />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' };
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <MarketplaceHeader search="" onSearchChange={() => {}} onSearchSubmit={() => {}} category="All" onCategory={() => {}} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="mb-6">
          <Breadcrumb items={[
            { label: 'WevMall', href: '/wevmall' },
            { label: 'Verified Sellers' }
          ]} />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="text-[#F57224] w-5 h-5" />
          <h1 className="text-lg font-bold text-foreground">Verified Sellers</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sellers.map((seller) => {
              const badge = getBadgeStyle(seller.verifiedBadge);
              return (
                <Link 
                  key={seller.id} 
                  to={`/shop/${seller.slug || seller.id}`}
                  className="flex flex-col items-center p-5 bg-card border border-border rounded-xl hover:shadow-lg transition-all duration-200 group hover:-translate-y-1"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-muted mb-4 border-2 border-border group-hover:border-[#F57224] transition-colors flex items-center justify-center">
                    {seller.logo || seller.avatar ? (
                      <img src={seller.logo || seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-base text-foreground truncate w-full text-center mb-1 group-hover:text-[#F57224] transition-colors">
                    {seller.name}
                  </h3>
                  
                  {seller.category && (
                    <p className="text-xs text-muted-foreground mb-3 truncate w-full text-center">{seller.category}</p>
                  )}
                  
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold mb-4 ${badge.color}`}>
                    {badge.icon}
                    <span className="uppercase tracking-wider">{String(seller.verifiedBadge || 'VERIFIED').replace('_', ' ')}</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground w-full mt-auto pt-3 border-t border-border">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-medium">{seller.rating?.toFixed(1) || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span className="font-medium">{seller.followers || 0}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <MarketplaceFooter />
    </div>
  );
}
