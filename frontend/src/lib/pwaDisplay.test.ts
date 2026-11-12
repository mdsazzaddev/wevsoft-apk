import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isLocalOrLanHost,
  isTunnelHost,
  shouldRegisterServiceWorker,
} from './pwaDisplay.ts';

test('isTunnelHost recognizes ngrok and Cloudflare', () => {
  assert.equal(isTunnelHost('abc.ngrok-free.app'), true);
  assert.equal(isTunnelHost('xyz.trycloudflare.com'), true);
  assert.equal(isTunnelHost('wevsoft.com'), false);
  assert.equal(isTunnelHost('192.168.1.10'), false);
});

test('isLocalOrLanHost covers private IPs but not tunnels or public domains', () => {
  assert.equal(isLocalOrLanHost('localhost'), true);
  assert.equal(isLocalOrLanHost('127.0.0.1'), true);
  assert.equal(isLocalOrLanHost('192.168.0.5'), true);
  assert.equal(isLocalOrLanHost('10.0.0.2'), true);
  assert.equal(isLocalOrLanHost('172.16.4.1'), true);
  // Tunnels must stay installable — never fold into "local".
  assert.equal(isLocalOrLanHost('abc.ngrok-free.app'), false);
  assert.equal(isLocalOrLanHost('xyz.trycloudflare.com'), false);
  assert.equal(isLocalOrLanHost('app.wevsoft.com'), false);
});

test('shouldRegisterServiceWorker only on PROD HTTPS public/tunnel hosts', () => {
  assert.equal(
    shouldRegisterServiceWorker({
      prod: true,
      hostname: 'abc.ngrok-free.app',
      protocol: 'https:',
      hasServiceWorker: true,
    }),
    true,
  );
  assert.equal(
    shouldRegisterServiceWorker({
      prod: true,
      hostname: 'app.wevsoft.com',
      protocol: 'https:',
      hasServiceWorker: true,
    }),
    true,
  );
  // LAN HTTP — never (ghost shell + Chrome will not install).
  assert.equal(
    shouldRegisterServiceWorker({
      prod: true,
      hostname: '192.168.1.20',
      protocol: 'http:',
      hasServiceWorker: true,
    }),
    false,
  );
  // Vite DEV even on a tunnel — no (would cache HMR modules).
  assert.equal(
    shouldRegisterServiceWorker({
      prod: false,
      hostname: 'abc.ngrok-free.app',
      protocol: 'https:',
      hasServiceWorker: true,
    }),
    false,
  );
  // localhost — never.
  assert.equal(
    shouldRegisterServiceWorker({
      prod: true,
      hostname: 'localhost',
      protocol: 'https:',
      hasServiceWorker: true,
    }),
    false,
  );
});
