import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVELOPER_PRODUCT_IDS, parseDeveloperProducts, readStoredDeveloperProducts } from './developer-products.js';

test('parseDeveloperProducts validates and de-duplicates', () => {
  assert.deepEqual(parseDeveloperProducts(['feed', 'wallet', 'feed']), { ok: true, products: ['feed', 'wallet'] });
  assert.equal(parseDeveloperProducts('feed').ok, false);
  assert.equal(parseDeveloperProducts(['feed', 'nope']).ok, false);
  assert.equal(parseDeveloperProducts(new Array(100).fill('feed')).ok, false);
  assert.deepEqual(parseDeveloperProducts([]), { ok: true, products: [] });
  assert.equal(DEVELOPER_PRODUCT_IDS.length, 16);
});

test('readStoredDeveloperProducts tolerates bad data', () => {
  assert.deepEqual(readStoredDeveloperProducts('["reels","x"]'), ['reels']);
  assert.deepEqual(readStoredDeveloperProducts('not json'), []);
  assert.deepEqual(readStoredDeveloperProducts(null), []);
  assert.deepEqual(readStoredDeveloperProducts(['live']), ['live']);
});