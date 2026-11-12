import assert from 'node:assert/strict';
import test from 'node:test';
import { devQueryKeys, errorStatus, shouldRetryQuery } from './queryPolicy';

const axiosErr = (status: number) => ({ response: { status } });

test('no retry on auth / not-found / step-up errors', () => {
  for (const s of [400, 401, 403, 404, 409, 410, 422, 428]) assert.equal(shouldRetryQuery(0, axiosErr(s)), false, String(s));
  assert.equal(shouldRetryQuery(0, { status: 428 }), false);
});

test('network, 5xx, 408 and 429 retry once', () => {
  for (const e of [new Error('network'), axiosErr(500), axiosErr(503), axiosErr(408), axiosErr(429)]) {
    assert.equal(shouldRetryQuery(0, e), true);
    assert.equal(shouldRetryQuery(1, e), false);
  }
});

test('errorStatus reads axios and fetch-style errors', () => {
  assert.equal(errorStatus(axiosErr(404)), 404);
  assert.equal(errorStatus({ status: 401 }), 401);
  assert.equal(errorStatus(null), undefined);
});

test('query keys are namespaced under developer', () => {
  assert.deepEqual(devQueryKeys.status(), ['developer', 'status']);
  assert.deepEqual(devQueryKeys.deletedApps(), ['developer', 'apps', 'deleted']);
});
