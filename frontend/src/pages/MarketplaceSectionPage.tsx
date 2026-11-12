import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store';
import { MarketplaceHeader } from '../components/marketplace/commerce/MarketplaceHeader';
import AllProductsBrowser from '../components/marketplace/commerce/AllProductsBrowser';
import MarketplaceFooter from '../components/marketplace/commerce/MarketplaceFooter';
import { CompareTray } from '../components/marketplace/experience/CompareTray';
import { ArrowLeft } from 'lucide-react';
import { marketFetch } from '../components/marketplace/commerce/utils';

const SECTION_MAP: Record<string, { title: string; subtitle: string; collection: string }> = {
  'all-products': {
    title: 'All Products',
    subtitle: 'Browse all products from every category',
    collection: 'all',
  },
  'flash-deals': {
    title: 'Flash Deals',
    subtitle: 'Discounted listings while stock lasts',
    collection: 'flash-deals',
  },
  'featured-products': {
    title: 'Featured Products',
    subtitle: 'Hand-picked listings from trusted sellers',
    collection: 'featured',
  },
  'trending-products': {
    title: 'Trending Products',
    subtitle: 'What buyers are viewing most right now',
    collection: 'trending',
  },
  'recommended-products': {
    title: 'Recommended For You',
    subtitle: 'Picked from what you have browsed and saved',
    collection: 'recommended',
  },
  'new-arrivals': {
    title: 'Recently Added',
    subtitle: 'Fresh listings from the last seven days',
    collection: 'new-arrivals',
  },
  'best-sellers': {
    title: 'Best Sellers',
    subtitle: 'The listings buyers order most',
    collection: 'best-sellers',
  },
  'top-rated': {
    title: 'Top Rated Products',
    subtitle: 'Highest rated listings with real reviews',
    collection: 'top-rated',
  },
  nearby: {
    title: 'Nearby Products',
    subtitle: 'Listings close to you',
    collection: 'all',
  },
};

export default function MarketplaceSectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);

  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const currentSection = SECTION_MAP[sectionId || 'all-products'] || SECTION_MAP['all-products'];

  useEffect(() => {
    if (!token) return;
    marketFetch('/api/marketplace/cart', token)
      .then((c) => setCartCount(c.count || 0))
      .catch(() => {});
  }, [token]);

  return (
    <div className="w-full max-w-7xl mx-auto pb-10">
      <MarketplaceHeader
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() => {}}
        onNlpSearch={() => {}}
        category="All"
        onCategory={() => {}}
        cartCount={cartCount}
      />

      <div className="flex items-center gap-4 mb-6 px-4 md:px-0 mt-4 md:mt-0">
        <Link
          to="/wevmall"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-foreground">{currentSection.title}</h1>
          <p className="text-xs text-muted-foreground font-medium">{currentSection.subtitle}</p>
        </div>
      </div>

      <div className="px-4 md:px-0">
        <AllProductsBrowser
          title={currentSection.title}
          subtitle={currentSection.subtitle}
          collection={currentSection.collection}
          searchQuery={search}
          showHeading={false}
        />
      </div>

      <CompareTray />
      <div className="mt-12 px-4 md:px-0">
        <MarketplaceFooter />
      </div>
    </div>
  );
}
