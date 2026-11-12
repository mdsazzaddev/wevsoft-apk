import assert from 'node:assert/strict';
import test from 'node:test';
import { reauthChallengeOf } from './wevspaceApi.js';

/**
 * `reauthChallengeOf` decides whether a rejected call is asking "prove it is you"
 * or failing for some other reason. Getting that wrong in either direction is
 * costly: read a plain 401 as a challenge and the UI collects a password it cannot
 * use, read a real challenge as an ordinary error and a dangerous action becomes
 * impossible to complete at all.
 */

/** The shape `SpaceApiError` presents to callers. */
function apiError(status: number, message: string, data: any) {
  return { name: 'SpaceApiError', status, message, data };
}

function challenge(reauth: any, code = 'REAUTH_REQUIRED', message = 'Confirm it is you.') {
  return apiError(403, message, { code, reauth });
}

test('a first refusal asks for confirmation and can be retried', () => {
  const result = reauthChallengeOf(
    challenge({ reason: 'required', methods: ['twofactor', 'password'], action: 'space.delete' }),
  );
  assert.ok(result);
  assert.equal(result.reason, 'required');
  assert.deepEqual(result.methods, ['twofactor', 'password']);
  assert.equal(result.action, 'space.delete');
  assert.equal(result.retryable, true);
});

test('a wrong credential is still retryable, so a typo costs one attempt not the action', () => {
  const result = reauthChallengeOf(
    challenge({ reason: 'invalid', methods: ['password'], action: 'member.removed' }, 'REAUTH_REQUIRED', 'That password did not match.'),
  );
  assert.ok(result);
  assert.equal(result.reason, 'invalid');
  assert.equal(result.retryable, true);
  assert.equal(result.message, 'That password did not match.');
});

test('an account with nothing to confirm with is terminal, not retryable', () => {
  const result = reauthChallengeOf(
    apiError(403, 'This account has no password or authenticator set up.', {
      code: 'REAUTH_UNAVAILABLE',
      reauth: { reason: 'unavailable', methods: [], action: 'space.transfer_ownership' },
    }),
  );
  assert.ok(result);
  assert.equal(result.reason, 'unavailable');
  assert.equal(result.retryable, false);
  assert.deepEqual(result.methods, []);
});

test('an expired session is not a confirmation prompt', () => {
  // The case that matters most: a bare 401 must not raise a password box, because
  // the credential would be collected for a request that can never be authorized.
  assert.equal(reauthChallengeOf(apiError(401, 'Invalid or expired token', {})), null);
  assert.equal(reauthChallengeOf(apiError(401, 'Authentication required', null)), null);
});

test('a permission refusal is not a confirmation prompt', () => {
  assert.equal(reauthChallengeOf(apiError(403, 'Only the owner can do that', { code: 'FORBIDDEN' })), null);
});

test('ordinary failures pass straight through', () => {
  assert.equal(reauthChallengeOf(null), null);
  assert.equal(reauthChallengeOf(undefined), null);
  assert.equal(reauthChallengeOf(new Error('Network request failed')), null);
  assert.equal(reauthChallengeOf(apiError(409, 'Already answered', { code: 'CONFLICT' })), null);
  assert.equal(reauthChallengeOf('nope'), null);
});

test('an unrecognised reason is treated as a first refusal', () => {
  const result = reauthChallengeOf(challenge({ reason: 'banana', methods: ['password'], action: 'space.archive' }));
  assert.ok(result);
  assert.equal(result.reason, 'required');
  assert.equal(result.retryable, true);
});

test('a challenge is identified by its code, not by its status', () => {
  // The status a challenge arrives with is not this function's business, and it has
  // already moved once: sending 401 tripped the global sign-out-on-401 wrapper in
  // src/main.tsx and ended the session instead of opening the prompt. Keying on the
  // code means the server can pick whichever status does not collide.
  for (const status of [400, 401, 403, 409, 422]) {
    const result = reauthChallengeOf(
      apiError(status, 'Confirm it is you.', {
        code: 'REAUTH_REQUIRED',
        reauth: { reason: 'required', methods: ['password'], action: 'space.archive' },
      }),
    );
    assert.ok(result, `status ${status} should still read as a challenge`);
    assert.equal(result.retryable, true);
  }
});

test('a malformed challenge body still produces a usable prompt', () => {
  // A missing method list must not crash the prompt into rendering nothing — the
  // sheet falls back to asking for a password.
  const result = reauthChallengeOf(challenge({ reason: 'required' }));
  assert.ok(result);
  assert.deepEqual(result.methods, []);
  assert.equal(result.action, '');

  const noReauth = reauthChallengeOf(apiError(403, 'Confirm it is you.', { code: 'REAUTH_REQUIRED' }));
  assert.ok(noReauth);
  assert.deepEqual(noReauth.methods, []);
  assert.equal(noReauth.retryable, true);
});

test('a challenge with no message of its own still says something', () => {
  const result = reauthChallengeOf({ status: 403, data: { code: 'REAUTH_REQUIRED', reauth: { reason: 'required' } } });
  assert.ok(result);
  assert.equal(result.message, 'Confirm it is you to continue.');
});

test('methods arriving as a non-array are discarded rather than trusted', () => {
  const result = reauthChallengeOf(challenge({ reason: 'required', methods: 'password', action: 5 }));
  assert.ok(result);
  assert.deepEqual(result.methods, []);
  assert.equal(result.action, '');
});
