import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAdminAppUrl, resolveAdminAppBase } from './admin-app-url.js';

test('resolveAdminAppBase prefers configured URL', () => {
  assert.equal(resolveAdminAppBase('https://admin.example.com'), 'https://admin.example.com');
  assert.equal(resolveAdminAppBase('https://admin.example.com/'), 'https://admin.example.com');
});

test('resolveAdminAppBase falls back to local admin port', () => {
  assert.equal(resolveAdminAppBase(''), 'http://localhost:3002');
});

test('buildAdminAppUrl joins base and path', () => {
  assert.equal(
    buildAdminAppUrl('/admin/users', 'http://localhost:3002'),
    'http://localhost:3002/admin/users',
  );
  assert.equal(buildAdminAppUrl('admin', 'http://localhost:3002'), 'http://localhost:3002/admin');
});
