import assert from 'node:assert/strict';
import test from 'node:test';
import { createPresenceTrack } from './presenceClient.js';

test('presence snapshot keeps a peer who just came online', () => {
  const now = 1_000;
  const track = createPresenceTrack(() => now);
  track.note('peer', true);
  const ids = track.applySnapshot([]);
  assert.equal(ids.has('peer'), true);
});

test('presence snapshot keeps a peer who just went offline', () => {
  const now = 1_000;
  const track = createPresenceTrack(() => now);
  track.note('peer', false);
  const ids = track.applySnapshot(['peer', 'other']);
  assert.equal(ids.has('peer'), false);
  assert.equal(ids.has('other'), true);
});

test('stale presence events no longer override the snapshot', () => {
  let now = 1_000;
  const track = createPresenceTrack(() => now);
  track.note('peer', true);
  now = 10_000;
  const ids = track.applySnapshot([]);
  assert.equal(ids.has('peer'), false);
});
