import assert from 'node:assert/strict';
import test from 'node:test';
import { TRENDING_GLOBAL_BASE_KEY, TRENDING_GLOBAL_LEGACY_KEY } from '../feed/trending-cache.js';

test('trending global base key is distinct from legacy user-scored key', () => {
  assert.notEqual(TRENDING_GLOBAL_BASE_KEY, TRENDING_GLOBAL_LEGACY_KEY);
  assert.match(TRENDING_GLOBAL_BASE_KEY, /base$/);
});

test('trending global base key is a fixed, viewer-agnostic constant', () => {
  assert.equal(TRENDING_GLOBAL_BASE_KEY, 'trending:global:base');
  // A single global key must never carry a viewer segment: per-user scores are
  // applied after the cache read in `social/feed-ranking.ts`, never cached here.
  assert.doesNotMatch(TRENDING_GLOBAL_BASE_KEY, /user|viewer|:\$\{/);
  assert.equal(TRENDING_GLOBAL_LEGACY_KEY, 'trending:global');
});
