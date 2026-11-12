import assert from 'node:assert/strict';
import test from 'node:test';
import { bearerAuthHeaders } from '../api/client.js';

test('bearerAuthHeaders adds Authorization when token present', () => {
  const headers = bearerAuthHeaders('abc123', { json: true });
  assert.equal(headers.Authorization, 'Bearer abc123');
  assert.equal(headers['Content-Type'], 'application/json');
});

test('bearerAuthHeaders omits Authorization when token missing', () => {
  const headers = bearerAuthHeaders(null);
  assert.equal(headers.Authorization, undefined);
});
