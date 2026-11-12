import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchSectionCounts, formatCompact, marketFetch } from './utils';
import { ProductCard, PRODUCT_GRID_CLASS } from './ProductCard';
import { useStore } from '../../../store';
import { useMarketplaceLang } from './useMarketplaceLang';

interface ProductSectionProps {
  title: string;
  endpoint: string;
  viewAllLink: string;
  icon?: React.ReactNode;
  /** Key into /api/marketplace/feed/counts; falls back to the loaded item count. */
  countKey?: string;
  subtitle?: string;
  /** How many cards to show in the first row. Desktop shows 6–8. */
  previewCount?: number;
}

const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  endpoint,
  viewAllLink,
  icon,
  countKey,
  subtitle,
  previewCount = 8,
}) => {
  const { t, formatNum } = useMarketplaceLang();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(previewCount);
  const [isExpanded, setIsExpanded] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const token = useStore((s) => s.token);

  useEffect(() => {
    if (!countKey) return;
    let mounted = true;
    fetchSectionCounts().then((counts) => {
      if (mounted && typeof counts[countKey] === 'number') setTotalCount(counts[countKey]);
    });
    return () => {
      mounted = false;
    };
  }, [countKey]);

  const displayCount = totalCount ?? products.length;

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const url = endpoint.includes('?') ? `${endpoint}&limit=${limit}` : `${endpoint}?limit=${limit}`;
        const data = await marketFetch(url, token);
        if (isMounted) {
          setProducts(Array.isArray(data) ? data : data.products || []);
        }
      } catch (error) {
        console.error(`Error fetching products for ${title}:`, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    return () => { isMounted = false; };
  }, [endpoint, token, title, limit]);

  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-6">
      <div className="flex justify-between items-end gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-primary">{icon}</span>}
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground flex items-baseline gap-2">
              {title}
              <span className="text-sm font-medium text-muted-foreground">
                ({formatNum(formatCompact(displayCount))})
              </span>
            </h2>
          </div>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Link
          to={viewAllLink}
          className="shrink-0 text-sm font-medium text-primary hover:text-primary flex items-center gap-1 group whitespace-nowrap"
        >
          {t('See More', 'আরো দেখুন')} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="relative">
        <div className={PRODUCT_GRID_CLASS}>
          {loading && products.length === 0 ? (
            Array.from({ length: previewCount }).map((_, i) => (
              <div key={i} className="rounded-xl border border-primary/25 bg-card overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#1c1c1c]" />
                <div className="p-2 space-y-1.5">
                  <div className="h-3 bg-[#1c1c1c] rounded w-4/5" />
                  <div className="h-4 bg-[#1c1c1c] rounded w-1/3" />
                  <div className="h-7 bg-[#1c1c1c] rounded-lg" />
                </div>
              </div>
            ))
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>

        {products.length >= limit && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => {
                if (!isExpanded) setIsExpanded(true);
                setLimit((prev) => prev + 8);
              }}
              disabled={loading}
              className="px-6 py-2.5 rounded-full border border-primary/60 text-primary font-semibold text-sm hover:bg-primary hover:text-[var(--card)] transition-all duration-200"
            >
              {loading ? t('Loading...', 'লোড হচ্ছে...') : t('Load More', 'আরো লোড করুন')}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductSection;
