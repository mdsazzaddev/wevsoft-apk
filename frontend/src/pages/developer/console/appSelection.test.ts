import assert from 'node:assert/strict';
import test from 'node:test';
import { ALL_APPS, appSwitchTarget, liveApps, nextOptionIndex, resolveSelectedApp } from './appSelection';
import { appSwitchPath } from './appSwitchPath';

const apps = [{ id: 'a' }, { id: 'b', deletedAt: '2026-10-01T00:00:00Z' }, { id: 'c', status: 'deleted' }, { id: 'd' }];

test('deleted apps are excluded from the switcher', () => {
  assert.deepEqual(liveApps(apps).map((a) => a.id), ['a', 'd']);
});

test('stored selection persists when still live', () => {
  assert.deepEqual(resolveSelectedApp(apps, 'd'), { app: apps[3], stale: false });
});

test('stale stored id (deleted or unknown) falls back to All apps', () => {
  assert.deepEqual(resolveSelectedApp(apps, 'b'), { app: null, stale: true });
  assert.deepEqual(resolveSelectedApp(apps, 'zzz'), { app: null, stale: true });
  // after the caller stores ALL_APPS it stays on All apps (does not jump to the first app)
  assert.deepEqual(resolveSelectedApp(apps, ALL_APPS), { app: null, stale: false });
});

test('no stored id picks the first live app; empty list is not stale', () => {
  assert.equal(resolveSelectedApp(apps, null).app?.id, 'a');
  assert.deepEqual(resolveSelectedApp([], 'a'), { app: null, stale: false });
});

test('switching keeps sub-path, search and hash', () => {
  assert.equal(appSwitchTarget(appSwitchPath('/developer/apps/a/webhooks', 'd'), '?tab=x', '#logs'), '/developer/apps/d/webhooks?tab=x#logs');
  assert.equal(appSwitchTarget(appSwitchPath('/developer/apps/a', 'd'), '', ''), '/developer/apps/d');
  assert.equal(appSwitchTarget(appSwitchPath('/developer/usage', 'd'), '', ''), null);
});

test('keyboard navigation wraps', () => {
  assert.equal(nextOptionIndex('ArrowDown', 1, 2), 0);
  assert.equal(nextOptionIndex('ArrowUp', 0, 2), 1);
  assert.equal(nextOptionIndex('End', 0, 3), 2);
  assert.equal(nextOptionIndex('x', 0, 3), null);
});
