import assert from 'node:assert/strict';
import test from 'node:test';
import { COOKIE_SESSION_MARKER, migrateStoredToken, readCookie, setCookieOnlyOverride, storableToken } from './cookie-auth.js';
import { allowHandoffBounce, buildHandoffLoginUrl, challengeOf, redirectWithHandoffCode, resetHandoffBounces } from './auth-handoff-code.js';
import { applyCookieAuth, isOwnApiUrl } from './fetch-interceptor.js';

function mem() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, m };
}

test('cookie-auth: flag off keeps tokens; flag on swaps stored JWT for the marker', () => {
  try {
    setCookieOnlyOverride(false);
    const s = mem(); s.setItem('token', 'jwt.a.b');
    assert.equal(storableToken('jwt.a.b'), 'jwt.a.b');
    assert.equal(migrateStoredToken('token', s), 'jwt.a.b');
    s.setItem('token', COOKIE_SESSION_MARKER);
    assert.equal(migrateStoredToken('token', s), null);
    setCookieOnlyOverride(true);
    s.setItem('token', 'jwt.a.b');
    assert.equal(storableToken('jwt.a.b'), COOKIE_SESSION_MARKER);
    assert.equal(migrateStoredToken('token', s), COOKIE_SESSION_MARKER);
    assert.equal(s.getItem('token'), COOKIE_SESSION_MARKER);
  } finally { setCookieOnlyOverride(null); }
});

test('cookie-auth: readCookie', () => {
  assert.equal(readCookie('wev_csrf', 'a=1; wev_csrf=xyz'), 'xyz');
  assert.equal(readCookie('wev_csrf', 'a=1'), undefined);
});

test('interceptor cookie mode: strips marker bearer, includes credentials, CSRF only on writes', () => {
  const post = applyCookieAuth({ headers: { Authorization: `Bearer ${COOKIE_SESSION_MARKER}` } }, 'POST', 'tok');
  const h = new Headers(post.headers);
  assert.equal(post.credentials, 'include');
  assert.equal(h.get('authorization'), null);
  assert.equal(h.get('x-csrf-token'), 'tok');
  assert.equal(h.get('x-auth-mode'), 'cookie');
  const real = new Headers(applyCookieAuth({ headers: { Authorization: 'Bearer real.jwt' } }, 'GET', 'tok').headers);
  assert.equal(real.get('authorization'), 'Bearer real.jwt');
  assert.equal(real.get('x-csrf-token'), null);
  assert.equal(isOwnApiUrl('/api/x', () => '/api/'), true);
  assert.equal(isOwnApiUrl('https://api.wevsoft.com/api/x', (p) => `https://api.wevsoft.com${p}`), true);
  assert.equal(isOwnApiUrl('https://evil.example/api/x', (p) => `https://api.wevsoft.com${p}`), false);
});

test('handoff code: login URL carries a challenge of the stored verifier, never a token', async () => {
  const s = mem();
  const url = await buildHandoffLoginUrl((r) => `https://wevsoft.com/auth?next=${encodeURIComponent(r)}`, 'https://developer.wevsoft.com/apps', s);
  const next = decodeURIComponent(new URL(url).searchParams.get('next')!);
  const hc = new URLSearchParams(new URL(next).hash.slice(1)).get('wev_hc');
  const verifier = s.getItem('wev_handoff_verifier')!;
  assert.ok(verifier.length >= 43);
  assert.equal(hc, await challengeOf(verifier));
  assert.ok(!/token|eyJ/.test(url));
});

test('handoff code: main app requests a code bound to target origin + challenge', async () => {
  const challenge = 'c'.repeat(43);
  let sent: any; let assigned = '';
  const fetchImpl = (async (_u: string, init: RequestInit) => { sent = JSON.parse(String(init.body)); return new Response(JSON.stringify({ code: 'k'.repeat(43) }), { status: 200 }); }) as typeof fetch;
  await redirectWithHandoffCode(`https://developer.wevsoft.com/apps#wev_hc=${challenge}`, 'jwt', (u) => { assigned = u; }, fetchImpl);
  assert.deepEqual(sent, { targetOrigin: 'https://developer.wevsoft.com', challenge });
  assert.equal(assigned, `https://developer.wevsoft.com/apps#wev_code=${'k'.repeat(43)}`);
  await redirectWithHandoffCode('https://developer.wevsoft.com/apps', 'jwt', (u) => { assigned = u; }, (async () => { throw new Error('no call'); }) as any);
  assert.equal(assigned, 'https://developer.wevsoft.com/apps');
});

test('handoff code: bounce guard allows 3 per window', () => {
  const s = mem(); const t = 1_000_000;
  assert.equal(allowHandoffBounce(s, t), true);
  assert.equal(allowHandoffBounce(s, t), true);
  assert.equal(allowHandoffBounce(s, t), true);
  assert.equal(allowHandoffBounce(s, t), false);
  assert.equal(allowHandoffBounce(s, t + 121_000), true);
  resetHandoffBounces(s);
  assert.equal(s.getItem('wev_handoff_tries'), null);
});
