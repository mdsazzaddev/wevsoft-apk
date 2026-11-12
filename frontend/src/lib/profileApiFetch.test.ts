import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrapProfileApiPayload, unwrapProfileListItems } from './profileApiFetch.js';

test('unwrapProfileApiPayload returns inner data from success envelope', () => {
  const inner = { items: [{ id: '1' }], nextCursor: null };
  assert.deepEqual(unwrapProfileApiPayload({ success: true, data: inner }), inner);
});

test('unwrapProfileApiPayload passes through already-unwrapped objects', () => {
  const plain = { items: [{ id: '2' }], total: 1 };
  assert.deepEqual(unwrapProfileApiPayload(plain), plain);
});

test('unwrapProfileListItems maps envelope to items array', () => {
  assert.deepEqual(
    unwrapProfileListItems({ success: true, data: { items: [{ id: '1' }] } }),
    [{ id: '1' }],
  );
});

test('unwrapProfileListItems maps missing items and empty objects to []', () => {
  assert.deepEqual(unwrapProfileListItems({}), []);
  assert.deepEqual(unwrapProfileListItems({ success: true, data: {} }), []);
  assert.deepEqual(unwrapProfileListItems(null), []);
  assert.deepEqual(unwrapProfileListItems(undefined), []);
});

test('unwrapProfileListItems accepts bare arrays and unwrapped items', () => {
  assert.deepEqual(unwrapProfileListItems([{ id: 'a' }]), [{ id: 'a' }]);
  assert.deepEqual(unwrapProfileListItems({ items: [{ id: 'b' }] }), [{ id: 'b' }]);
});
