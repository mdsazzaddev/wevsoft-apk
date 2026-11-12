import assert from 'node:assert/strict';
import test from 'node:test';
import en from './en';
import bn from './bn';

const vars = (s: string) => (s.match(/{{\s*\w+\s*}}/g) || []).map((v) => v.replace(/\s/g, '')).sort();

test('bn has exactly the en keys', () => {
  assert.deepEqual(Object.keys(bn).sort(), Object.keys(en).sort());
});

test('bn keeps every interpolation variable and is not empty', () => {
  for (const k of Object.keys(en) as (keyof typeof en)[]) {
    assert.ok(bn[k].trim(), k);
    assert.deepEqual(vars(bn[k]), vars(en[k]), k);
  }
});
