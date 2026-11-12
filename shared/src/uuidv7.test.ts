import assert from 'node:assert/strict';
import test from 'node:test';
import { isUuidV7, uuidv7 } from './uuidv7.js';

test('uuidv7 returns version 7 UUID shape', () => {
  const id = uuidv7();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(isUuidV7(id), true);
});

test('uuidv7 encodes timestamp ms in leading bytes', () => {
  const when = new Date('2026-09-01T12:00:00.000Z');
  const id = uuidv7(when);
  const hex = id.replace(/-/g, '').slice(0, 12);
  const ts = parseInt(hex, 16);
  assert.equal(ts, when.getTime());
});

test('uuidv7 is sortable for increasing timestamps', () => {
  const a = uuidv7(new Date('2026-01-01T00:00:00.000Z'));
  const b = uuidv7(new Date('2026-12-31T23:59:59.999Z'));
  assert.ok(a < b);
});
