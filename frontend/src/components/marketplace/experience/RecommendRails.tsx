import React, { useEffect, useState } from 'react';
import { ProductGrid } from '../commerce/ProductCard';
import { marketFetch } from '../commerce/utils';

export function RecommendRails({
  token,
  productId,
  wishlistIds,
  onWishlistChange,
  onCartChange,
}: {
  token: string | null;
  productId?: string;
  wishlistIds?: Set<string>;
  onWishlistChange?: (id: string, wished: boolean) => void;
  onCartChange?: () => void;
}) {
  const [recommended, setRecommended] = useState<any[]>([]);
  const [similar, setSimilar] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [together, setTogether] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    marketFetch('/api/marketplace/feed/recommended', token).then((d) => setRecommended(d.products || [])).catch(() => {});
    marketFetch('/api/marketplace/feed/recent', token).then((d) => setRecent(d.products || [])).catch(() => {});
    if (!productId) return;
    marketFetch(`/api/marketplace/similar/${productId}`, token).then((d) => setSimilar(d.products || [])).catch(() => {});
    marketFetch(`/api/marketplace/related/${productId}`, token).then((d) => setRelated(d.products || [])).catch(() => {});
    marketFetch(`/api/marketplace/together/${productId}`, token).then((d) => setTogether(d.products || [])).catch(() => {});
  }, [token, productId]);

  const rail = (title: string, products: any[]) =>
    products.length ? (
      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground mb-5">{title}</h2>
        <ProductGrid
          products={products}
          wishlistIds={wishlistIds}
          onWishlistChange={onWishlistChange}
          onCartChange={onCartChange}
        />
      </section>
    ) : null;

  return (
    <>
      {rail('Recommended for you', recommended)}
      {productId && rail('Similar products', similar)}
      {productId && rail('Related products', related)}
      {productId && rail('Frequently viewed together', together)}
      {!productId && rail('Recently viewed', recent)}
    </>
  );
}
