import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_PORTAL_REQUIRED_CODE,
  isAdminAppUrl,
  isExternalAuthNext,
  resolveAuthNext,
  shouldFollowAuthNext,
} from './auth-handoff.js';

test('ADMIN_PORTAL_REQUIRED_CODE is stable for API clients', () => {
  assert.equal(ADMIN_PORTAL_REQUIRED_CODE, 'ADMIN_PORTAL_REQUIRED');
});

test('isExternalAuthNext only matches absolute http(s) URLs', () => {
  assert.equal(isExternalAuthNext('http://localhost:3002/admin'), true);
  assert.equal(isExternalAuthNext('https://admin.example.com/admin'), true);
  assert.equal(isExternalAuthNext('/admin'), false);
  assert.equal(isExternalAuthNext(null), false);
});

test('resolveAuthNext keeps external URLs and rooted paths', () => {
  assert.equal(resolveAuthNext('http://localhost:3002/admin'), 'http://localhost:3002/admin');
  assert.equal(resolveAuthNext('/messages'), '/messages');
  assert.equal(resolveAuthNext('not-a-path'), '/feed');
  assert.equal(resolveAuthNext(null), '/feed');
});

test('isAdminAppUrl matches the admin origin, not the consumer app', () => {
  assert.equal(isAdminAppUrl('http://localhost:3002/admin'), true);
  assert.equal(isAdminAppUrl('http://localhost:3002/admin?tab=users'), true);
  assert.equal(isAdminAppUrl('http://127.0.0.1:3002/admin'), true);
  assert.equal(isAdminAppUrl('http://localhost:3000/auth'), false);
  assert.equal(
    isAdminAppUrl('https://admin.example.com/admin', 'https://admin.example.com'),
    true,
  );
  assert.equal(
    isAdminAppUrl('https://www.example.com/auth', 'https://admin.example.com'),
    false,
  );
});

test('shouldFollowAuthNext blocks a non-admin bouncing back to the admin SPA', () => {
  const adminNext = 'http://localhost:3002/admin';
  assert.equal(shouldFollowAuthNext(adminNext, 'user'), false);
  assert.equal(shouldFollowAuthNext(adminNext, 'moderator'), false);
  assert.equal(shouldFollowAuthNext(adminNext, 'admin'), true);
  assert.equal(shouldFollowAuthNext(adminNext, 'superadmin'), true);
  assert.equal(shouldFollowAuthNext('/feed', 'user'), true);
  assert.equal(shouldFollowAuthNext('http://localhost:3000/home', 'user'), true);
});
