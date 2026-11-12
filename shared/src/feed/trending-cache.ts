/**
 * Trending feed cache keys — global pool is public posts only;
 * per-user scoring runs after cache hit (see feed-ranking.ts).
 */

/** Cached payload: public posts + hashtag list (no user-specific scores). */
export const TRENDING_GLOBAL_BASE_KEY = 'trending:global:base';

/** Legacy key — do not reuse; it stored user-scored results under one global key. */
export const TRENDING_GLOBAL_LEGACY_KEY = 'trending:global';
