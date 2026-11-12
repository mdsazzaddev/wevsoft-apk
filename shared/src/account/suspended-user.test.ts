import assert from 'node:assert/strict';
import test from 'node:test';
import { isUserSuspended } from './suspended-user.js';

test('isUserSuspended is true when isSuspended flag is set', () => {
  assert.equal(isUserSuspended({ isSuspended: true, status: 'active' }), true);
});

test('isUserSuspended is true when status is suspended', () => {
  assert.equal(isUserSuspended({ status: 'suspended' }), true);
});

test('isUserSuspended is false for null or active users', () => {
  assert.equal(isUserSuspended(null), false);
  assert.equal(isUserSuspended({ status: 'active', isSuspended: false }), false);
});
