import assert from 'node:assert/strict';
import test from 'node:test';
import { installApiFetchInterceptor, jwtSubject } from './fetch-interceptor.js';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const past = () => Math.floor(Date.now() / 1000) - 60;
const future = () => Math.floor(Date.now() / 1000) + 3600;
const jwt = (id: string, n = 0, exp = past()) => `${b64({ alg: 'HS256' })}.${b64({ id, n, exp })}.sig${n}`;

type Call = { url: string; auth: string | null; credentials?: string };

function setup(handler: (c: Call, n: number) => Response, startToken: string | null) {
  const calls: Call[] = [];
  const g = globalThis as any;
  const prevWindow = g.window;
  const fakeFetch = async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    const c = { url, auth: new Headers(init?.headers).get('authorization'), credentials: init?.credentials };
    calls.push(c);
    return handler(c, calls.length);
  };
  g.window = { fetch: fakeFetch, location: { hostname: 'localhost' } };
  let token = startToken;
  let loggedOut = 0;
  const restore = installApiFetchInterceptor({
    resolveBackendUrl: (p) => p,
    cookieAuth: false,
    onUnauthorized: () => { loggedOut++; },
    bearerRefresh: { getToken: () => token, setToken: (t) => { token = t; } },
  });
  return {
    calls,
    fetch: (u: string, i?: RequestInit) => g.window.fetch(u, i),
    token: () => token,
    loggedOut: () => loggedOut,
    done: () => { restore(); g.window = prevWindow; },
  };
}

const wait = () => new Promise((r) => setTimeout(r, 30));

test('jwtSubject reads the id claim and rejects non-JWTs', () => {
  assert.equal(jwtSubject(jwt('u1')), 'u1');
  assert.equal(jwtSubject('cookie-session'), null);
  assert.equal(jwtSubject(null), null);
});

test('expired access token: refresh once, store the new token, retry, no logout', async () => {
  const old = jwt('u1', 1), fresh = jwt('u1', 2, future());
  const s = setup((c) => {
    if (c.url === '/api/auth/refresh') return new Response(JSON.stringify({ token: fresh }), { status: 200 });
    return new Response('{}', { status: c.auth === `Bearer ${fresh}` ? 200 : 401 });
  }, old);
  const res = await s.fetch('/api/posts', { method: 'POST', body: '{}', headers: { Authorization: `Bearer ${old}` } });
  await wait();
  assert.equal(res.status, 200);
  assert.equal(s.token(), fresh);
  assert.equal(s.loggedOut(), 0);
  const refresh = s.calls.filter((c) => c.url === '/api/auth/refresh');
  assert.equal(refresh.length, 1);
  assert.equal(refresh[0].credentials, 'include');
  s.done();
});

test('refresh fails: old behaviour (logout) is kept', async () => {
  const old = jwt('u1', 1);
  const s = setup((c) => new Response('{}', { status: c.url === '/api/auth/refresh' ? 403 : 401 }), old);
  const res = await s.fetch('/api/feed', { headers: { Authorization: `Bearer ${old}` } });
  await wait();
  assert.equal(res.status, 401);
  assert.equal(s.token(), old);
  assert.equal(s.loggedOut(), 1);
  s.done();
});

test('refresh returning another user is ignored (no account mixing)', async () => {
  const old = jwt('u1', 1);
  const s = setup((c) => c.url === '/api/auth/refresh' ? new Response(JSON.stringify({ token: jwt('u2', 9) }), { status: 200 }) : new Response('{}', { status: 401 }), old);
  await s.fetch('/api/feed', { headers: { Authorization: `Bearer ${old}` } });
  await wait();
  assert.equal(s.token(), old);
  assert.equal(s.loggedOut(), 1);
  s.done();
});

test('concurrent 401s share one refresh call', async () => {
  const old = jwt('u1', 1), fresh = jwt('u1', 2, future());
  const s = setup((c) => {
    if (c.url === '/api/auth/refresh') return new Response(JSON.stringify({ token: fresh }), { status: 200 });
    return new Response('{}', { status: c.auth === `Bearer ${fresh}` ? 200 : 401 });
  }, old);
  const rs = await Promise.all([1, 2, 3].map((i) => s.fetch(`/api/x${i}`, { headers: { Authorization: `Bearer ${old}` } })));
  assert.deepEqual(rs.map((r) => r.status), [200, 200, 200]);
  assert.equal(s.calls.filter((c) => c.url === '/api/auth/refresh').length, 1);
  s.done();
});

test('auth endpoints and requests without a Bearer never trigger refresh', async () => {
  const s = setup(() => new Response('{}', { status: 401 }), jwt('u1'));
  await s.fetch('/api/auth/login', { method: 'POST', body: '{}' });
  await s.fetch('/api/feed');
  await wait();
  assert.equal(s.calls.filter((c) => c.url === '/api/auth/refresh').length, 0);
  s.done();
});

test('401 for a token that has not expired does not refresh (revoked / forbidden)', async () => {
  const live = jwt('u1', 1, future());
  const s = setup(() => new Response('{}', { status: 401 }), live);
  await s.fetch('/api/feed', { headers: { Authorization: `Bearer ${live}` } });
  await wait();
  assert.equal(s.calls.filter((c) => c.url === '/api/auth/refresh').length, 0);
  assert.equal(s.loggedOut(), 1);
  s.done();
});
