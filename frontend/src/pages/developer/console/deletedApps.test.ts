import assert from 'node:assert/strict';
import test from 'node:test';
import { daysLeft, purgeAt, restoreErrorMessage } from './deletedApps';

test('purge date is deletedAt + window', () => {
  assert.equal(purgeAt('2026-10-01T00:00:00.000Z', 30)?.toISOString(), '2026-10-31T00:00:00.000Z');
  assert.equal(purgeAt('nope', 30), null);
});

test('days left counts down and floors at zero', () => {
  const now = Date.parse('2026-10-11T00:00:00.000Z');
  assert.equal(daysLeft('2026-10-01T00:00:00.000Z', 30, now), 20);
  assert.equal(daysLeft('2026-08-01T00:00:00.000Z', 30, now), 0);
});

test('restore errors map to safe messages', () => {
  assert.match(restoreErrorMessage(410), /window/);
  assert.match(restoreErrorMessage(409), /not deleted/);
  assert.match(restoreErrorMessage(undefined), /Try again/);
});
