import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTACT_LAST_NATIVE_SYNC_KEY,
  CONTACT_SYNC_DUE_MS,
  isNativeSyncDue,
  markNativeSyncDone,
  setLocalSyncEnabled,
  isLocalSyncEnabled,
  CONTACT_SYNC_ENABLED_LOCAL_KEY,
} from './contactDiscoveryNative.js';

test('isNativeSyncDue is true when never synced', () => {
  try {
    localStorage.removeItem(CONTACT_LAST_NATIVE_SYNC_KEY);
  } catch {
    /* node without localStorage — skip storage assertions */
    return;
  }
  assert.equal(isNativeSyncDue(), true);
});

test('markNativeSyncDone makes sync not due until window passes', () => {
  if (typeof localStorage === 'undefined') return;
  const now = Date.now();
  markNativeSyncDone(now);
  assert.equal(isNativeSyncDue(now + 1000), false);
  assert.equal(isNativeSyncDue(now + CONTACT_SYNC_DUE_MS + 1), true);
});

test('setLocalSyncEnabled round-trips', () => {
  if (typeof localStorage === 'undefined') return;
  setLocalSyncEnabled(true);
  assert.equal(isLocalSyncEnabled(), true);
  assert.equal(localStorage.getItem(CONTACT_SYNC_ENABLED_LOCAL_KEY), '1');
  setLocalSyncEnabled(false);
  assert.equal(isLocalSyncEnabled(), false);
});
