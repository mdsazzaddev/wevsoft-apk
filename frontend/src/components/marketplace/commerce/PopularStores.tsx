import React, { useState, useEffect } from 'react';
import { Store, Star, Users, CheckCircle, BadgeCheck, ShieldAlert, Award } from 'lucide-react';
import { marketFetch } from './utils';
import { useStore } from '../../../store';
import { useMarketplaceLang } from './useMarketplaceLang';

const PopularStores = () => {
  const { t, formatNum } = useMarketplaceLang();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useStore((s) => s.token);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStores = async () => {
      try {
        setLoading(true);
        const data = await marketFetch('/api/marketplace/feed/popular-stores', token);
        if (isMounted) {
          setStores(Array.isArray(data) ? data : data.stores || []);
        }
      } catch (error) {
        console.error('Error fetching popular stores:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStores();
    return () => { isMounted = false; };
  }, [token]);

  if (!loading && stores.length === 0) {
    return null;
  }

  const getBadgeIcon = (badge: string) => {
    switch (String(badge).toLowerCase()) {
      case 'verified': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'trusted': return <BadgeCheck className="w-4 h-4 text-blue-500" />;
      case 'premium': return <Award className="w-4 h-4 text-amber-500" />;
      case 'top_seller': return <ShieldAlert className="w-4 h-4 text-purple-500" />;
      default: return null;
    }
  };

  return (
    <section className="w-full py-6">
      <div className="flex items-center gap-2.5 mb-5">
        <Store className="text-primary w-5 h-5" />
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          {t('Popular Stores', 'জনপ্রিয় স্টোরসমূহ')}
        </h2>
      </div>
      
      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 pb-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-none w-64 md:w-72 snap-start">
              <div className="bg-card border border-primary/30 rounded-2xl p-4 animate-pulse flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1c1c1c]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-[#1c1c1c] rounded w-3/4" />
                  <div className="h-3 bg-[#1c1c1c] rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : (
          stores.map((store) => (
            <a 
              key={store.id} 
              href={`/shop/${store.shopSlug || store.slug || store.id}`}
              className="flex-none w-64 md:w-72 snap-start bg-card border border-primary/35 hover:border-primary/70 rounded-2xl p-4 hover:shadow-[0_8px_24px_rgba(201,162,39,0.12)] transition-all duration-200 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1c1c1c] flex items-center justify-center flex-shrink-0 border border-primary/30 group-hover:border-primary/60 transition-colors">
                  {store.logo ? (
                    <img src={store.logo} alt={store.shopName || store.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{store.shopName || store.name || store.user?.name}</h3>
                    {store.verifiedBadge && getBadgeIcon(String(store.verifiedBadge === true ? 'verified' : store.verifiedBadge))}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{formatNum(store.rating?.toFixed(1) || '4.8')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{formatNum(store.followersCount ?? store.followers ?? 0)}</span>
                    </div>
                  </div>
                  
                  {store.totalSales !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      {formatNum(store.totalSales)} {t('total sales', 'টি বিক্রি')}
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))
        )}
      </div>
    </section>
  );
};

export default PopularStores;
