import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { marketFetch, productThumb } from './utils';
import { useStore } from '../../../store';
import { History, ShoppingBag } from 'lucide-react';
import { PriceTag } from './primitives';
import { useMarketplaceLang } from './useMarketplaceLang';

export function RecentlyViewedTray() {
  const { t } = useMarketplaceLang();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useStore(s => s.token);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    marketFetch('/api/marketplace/feed/recent?limit=12', token)
      .then((d) => {
        if (isMounted) {
          setProducts(d.products || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });
      
    return () => { isMounted = false; };
  }, [token]);

  if (!loading && products.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3 px-1">
        <History size={18} className="text-primary" />
        <h2 className="text-sm font-bold text-foreground">
          {t('Recently Viewed', 'সম্প্রতি দেখা পণ্য')}
        </h2>
      </div>
      
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-1">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[120px] rounded-lg border border-primary/10 bg-card overflow-hidden animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-2 space-y-2">
                <div className="h-2 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))
        ) : (
          products.map((p) => {
            const thumb = productThumb(p);
            return (
              <Link 
                key={p.id} 
                to={`/wevmall/product/${p.id}`}
                className="shrink-0 w-[120px] rounded-lg border border-primary/20 bg-card overflow-hidden hover:border-primary/60 transition-colors group shadow-sm"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted flex items-center justify-center">
                  {thumb ? (
                    <img 
                      src={thumb} 
                      alt={p.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=60';
                      }}
                    />
                  ) : (
                    <ShoppingBag size={24} className="text-muted-foreground" />
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-[11px] text-foreground line-clamp-1 mb-1 font-semibold group-hover:text-primary transition-colors">{p.title}</h3>
                  <PriceTag price={p.price} discountPrice={p.discountPrice} className="text-xs" />
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
