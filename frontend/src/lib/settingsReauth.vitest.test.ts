import { describe, it, expect, vi, afterEach } from 'vitest';
import { settingsReauthBlobFetch, settingsReauthFetch, withSettingsConfirmation } from './settingsReauth';
import { reauthChallengeOf } from './wevspaceApi';

afterEach(() => vi.unstubAllGlobals());

describe('settingsReauth', () => {
  it('blob fetch: 403 challenge is readable, success returns blob + file name', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Confirm it is you to continue.', code: 'REAUTH_REQUIRED', reauth: { reason: 'required', methods: ['password'], action: 'settings.data_export' } }), { status: 403 })));
    const err = await settingsReauthBlobFetch('/api/account-center/export', { method: 'POST' }).catch((e) => e);
    expect(reauthChallengeOf(err)?.action).toBe('settings.data_export');
    const f = vi.fn(async (_u: string, init: any) => new Response('zipdata', { status: 200, headers: { 'Content-Disposition': 'attachment; filename=x.zip', 'X-Echo': init.body } }));
    vi.stubGlobal('fetch', f);
    const out = await settingsReauthBlobFetch('/api/account-center/export', { method: 'POST' }, { confirmPassword: 'pw' });
    expect(out.filename).toBe('x.zip');
    expect(await out.blob.text()).toBe('zipdata');
    expect(JSON.parse((f.mock.calls[0][1] as any).body)).toEqual({ confirmPassword: 'pw' });
  });

  it('adds only non-empty confirmation fields', () => {
    expect(withSettingsConfirmation({ a: 1 }, { confirmPassword: 'pw' })).toEqual({ a: 1, confirmPassword: 'pw' });
    expect(withSettingsConfirmation(undefined, { confirmCode: ' 123456 ' })).toEqual({ confirmCode: '123456' });
    expect(withSettingsConfirmation(undefined)).toEqual({});
  });

  it('turns a 403 REAUTH_REQUIRED into a challenge the shared prompt understands', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Confirm it is you to continue.', code: 'REAUTH_REQUIRED', reauth: { reason: 'required', methods: ['password'], action: 'settings.sessions_revoke_all' } }), { status: 403 })));
    const err = await settingsReauthFetch('/api/settings/sessions', { method: 'DELETE' }).catch((e) => e);
    const ch = reauthChallengeOf(err);
    expect(ch?.methods).toEqual(['password']);
    expect(ch?.action).toBe('settings.sessions_revoke_all');
    expect(ch?.retryable).toBe(true);
  });

  it('sends the credential in the body on retry and returns JSON', async () => {
    const f = vi.fn(async (_u: string, init: any) => new Response(JSON.stringify({ success: true, revoked: 2, echo: JSON.parse(init.body) }), { status: 200 }));
    vi.stubGlobal('fetch', f);
    const d: any = await settingsReauthFetch('/api/settings/sessions', { method: 'DELETE' }, { confirmPassword: 'pw' });
    expect(d.revoked).toBe(2);
    expect(d.echo).toEqual({ confirmPassword: 'pw' });
  });
});
