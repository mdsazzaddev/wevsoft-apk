import React, { useState, useEffect } from 'react';
import { ShieldCheck, Star, Users, CheckCircle, BadgeCheck, ShieldAlert, Award, Store } from 'lucide-react';
import { marketFetch } from './utils';
import { useStore } from '../../../store';

const VerifiedSellers = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useStore((s) => s.token);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSellers = async () => {
      try {
        setLoading(true);
        const data = await marketFetch('/api/marketplace/feed/verified-sellers', token);
        if (isMounted) {
          const results = Array.isArray(data) ? data : data.sellers || [];
          setSellers(results.slice(0, 8)); // Max 8 sellers
        }
      } catch (error) {
        console.error('Error fetching verified sellers:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSellers();
    return () => { isMounted = false; };
  }, [token]);

  if (!loading && sellers.length === 0) {
    return null;
  }

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
    <section className="w-full py-6">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary w-6 h-6" />
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Verified Sellers</h2>
        </div>
        <a href="/wevmall/sellers" className="text-sm font-medium text-primary hover:underline">
          View All
        </a>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex flex-col items-center animate-pulse text-center">
              <div className="w-20 h-20 rounded-full bg-muted mb-3" />
              <div className="h-5 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2 mb-3" />
              <div className="h-6 bg-muted rounded-full w-24" />
            </div>
          ))
        ) : (
          sellers.map((seller) => {
            const badge = getBadgeStyle(seller.verifiedBadge || 'verified');
            
            return (
              <a 
                key={seller.id} 
                href={`/shop/${seller.slug || seller.id}`}
                className="bg-card border border-border rounded-xl p-5 flex flex-col items-center text-center hover:shadow-md hover:border-primary/30 transition-all duration-200 group"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden bg-muted mb-3 border-2 border-border group-hover:border-primary transition-colors flex flex-shrink-0 items-center justify-center">
                  {seller.logo || seller.avatar ? (
                    <img src={seller.logo || seller.avatar} alt={seller.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-10 h-10 text-muted-foreground" />
                  )}
                </div>
                
                <h3 className="font-semibold text-foreground truncate w-full mb-1 group-hover:text-primary transition-colors">{seller.name}</h3>
                
                {seller.category && (
                  <p className="text-xs text-muted-foreground mb-3 truncate w-full">{seller.category}</p>
                )}
                
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium mb-3 ${badge.color}`}>
                  {badge.icon}
                  <span className="uppercase tracking-wider">{String(seller.verifiedBadge || 'VERIFIED').replace('_', ' ')}</span>
                </div>
                
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground w-full mt-auto pt-3 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>{seller.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{seller.followers || 0}</span>
                  </div>
                </div>
              </a>
            );
          })
        )}
      </div>
    </section>
  );
};

export default VerifiedSellers;
