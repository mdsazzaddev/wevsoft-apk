import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeftRight, Check, ChevronDown, ExternalLink, Globe, Loader2, Lock, Mail, ShieldCheck, ShieldX, UserRound } from 'lucide-react';

const SCOPE_ICONS: Record<string, React.ElementType> = { profile: UserRound, email: Mail, openid: ShieldCheck };
import api from '../../lib/api';
import { useStore } from '../../store';
import UserAvatar from '../../components/UserAvatar';
import WevsoftMark from '../../components/auth/WevsoftMark';
import { OAUTH_SCOPES } from './devApi';
import { AppAvatar, Skeleton, btnPrimary, btnSecondary, cx } from './devUi';
import { getSavedAccounts, getSignedOutAccounts } from '../../lib/savedAccounts';
import { useSystemSettings } from '../../hooks/useSystemSettings';

const WevMascot = lazy(() => import('../../components/auth/mascot/WevMascot'));

/** True only on desktop-sized viewports with a fine pointer (PC preview). */
function useIsDesktop() {
  const query = '(min-width: 1024px) and (pointer: fine)';
  const [ok, setOk] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setOk(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ok;
}

type ChooserAccount = { id: string; name: string; email?: string | null; username?: string | null; avatar?: string | null; token?: string; role?: string | null; theme?: string | null; signedOut?: boolean };

function listDeviceAccounts(current: any): ChooserAccount[] {
  const saved: ChooserAccount[] = getSavedAccounts();
  const list = [...saved];
  if (current?.id && !list.some((a) => a.id === current.id)) list.unshift({ ...current });
  const out = getSignedOutAccounts().map((a) => ({ ...a, signedOut: true }));
  return [...list, ...out];
}

function goAddAccount(_email?: string | null) {
  // Return to this exact consent request (same client_id, state, PKCE) after signing in.
  const next = window.location.pathname + window.location.search;
  useStore.getState().beginAddAccount();
  const qs = new URLSearchParams({ add_account: '1', next });
  window.location.assign(`/auth?${qs.toString()}`);
}

/** Small chip on the consent card; clicking it reopens the account chooser. */
function AccountChip({ user, onClick, disabled }: { user: any; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="relative mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background pl-1 pr-2.5 py-1 shadow-sm hover:bg-muted/60 transition-colors"
      title="Switch account"
    >
      <UserAvatar user={user} className="w-6 h-6 text-[10px]" />
      <span className="text-sm font-medium truncate max-w-[180px]">{user.name || user.username}</span>
      {user.username && <span className="text-xs text-muted-foreground truncate max-w-[110px]">@{user.username}</span>}
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

/** Google-style "Choose an account" step listing every Wevsoft account used on this device. */
function AccountChooser({ appName, user, onChosen }: { appName: string; user: any; onChosen: () => void }) {
  const setAuth = useStore((s) => s.setAuth);
  const [accounts] = useState(() => listDeviceAccounts(user));

  const pick = (a: ChooserAccount) => {
    if (a.signedOut || !a.token) {
      if (a.id === user?.id) return onChosen();
      return goAddAccount(a.email);
    }
    if (a.id !== user?.id) {
      setAuth(a.token, { id: a.id, name: a.name, email: a.email || '', username: a.username || undefined, avatar: a.avatar || undefined, role: a.role || undefined, theme: a.theme || 'dark' } as any);
    }
    onChosen();
  };

  return (
    <div className="bg-card sm:border sm:border-border/70 rounded-[28px] sm:shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] overflow-hidden">
      <div className="px-6 sm:px-8 pt-8 pb-5 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center">
          <WevsoftMark className="w-9 h-auto" />
        </div>
        <h1 className="mt-5 text-xl sm:text-2xl font-semibold tracking-tight">Choose an account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">to continue to <span className="font-medium text-primary">{appName}</span></p>
      </div>
      <ul className="border-t border-border divide-y divide-border">
        {accounts.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => pick(a)} className="w-full flex items-center gap-3.5 px-6 sm:px-8 py-3.5 text-left hover:bg-muted/50 transition-colors">
              <UserAvatar user={a} className={cx('w-10 h-10 text-sm', a.signedOut && 'opacity-60')} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium truncate">{a.name}</span>
                <span className="block text-xs text-muted-foreground truncate">{a.username ? `@${a.username}` : a.email || 'Wevsoft account'}</span>
              </span>
              {a.signedOut ? (
                <span className="text-[11px] font-medium text-muted-foreground shrink-0">Signed out</span>
              ) : a.id === user?.id ? (
                <span className="text-[11px] font-medium text-primary shrink-0">Current</span>
              ) : null}
            </button>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => goAddAccount()} className="w-full flex items-center gap-3.5 px-6 sm:px-8 py-3.5 text-left hover:bg-muted/50 transition-colors">
            <span className="w-10 h-10 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground"><UserRound className="w-5 h-5" /></span>
            <span className="text-sm font-medium">Use another account</span>
          </button>
        </li>
      </ul>
      <p className="px-6 sm:px-8 py-4 border-t border-border text-xs text-muted-foreground text-center">
        {appName} will only get access to the account you choose.
      </p>
    </div>
  );
}

interface AuthorizeInfo {
  app: {
    id: string;
    name: string;
    logoUrl: string | null;
    privacyPolicyUrl: string | null;
    termsUrl: string | null;
    mode?: string;
    status?: string;
  };
  scopes?: string[];
}

const ERROR_TEXT: Record<string, string> = {
  invalid_client: "This app isn't registered with Wevsoft.",
  invalid_redirect_uri: "The app sent you to an address it hasn't registered. For your safety we stopped here.",
  unsupported_response_type: 'The app made an unsupported request.',
  invalid_scope: 'The app asked for a permission that does not exist.',
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-start sm:justify-center overflow-hidden bg-background sm:bg-[radial-gradient(1200px_600px_at_50%_-10%,rgb(37_99_235/0.14),transparent_60%),radial-gradient(800px_400px_at_100%_110%,rgb(16_185_129/0.12),transparent_60%)] px-4 py-8 sm:py-14">
      <div className="relative w-full max-w-[440px]">{children}</div>
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5" /> Secured by Wevsoft
      </p>
    </div>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  const navigate = useNavigate();
  return (
    <Shell>
      <div className="bg-card border border-border rounded-3xl shadow-xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
          <ShieldX className="w-7 h-7" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button type="button" onClick={() => navigate('/home')} className={cx(btnSecondary, 'mt-6 w-full')}>
          Back to Wevsoft
        </button>
      </div>
    </Shell>
  );
}

export default function OAuthConsentPage() {
  const [searchParams] = useSearchParams();
  const user = useStore((s) => s.user) as any;
  const client_id = searchParams.get('client_id');
  const redirect_uri = searchParams.get('redirect_uri');
  const response_type = searchParams.get('response_type');
  const scope = searchParams.get('scope') || '';
  const state = searchParams.get('state');
  const nonce = searchParams.get('nonce');
  const code_challenge = searchParams.get('code_challenge');
  const code_challenge_method = searchParams.get('code_challenge_method');
  const [leaving, setLeaving] = useState(false);
  const settings = useSystemSettings();
  const isDesktop = useIsDesktop();
  const showMascot = isDesktop && settings?.oauthConsentMascotEnabled === true;
  const [choosing, setChoosing] = useState(() => listDeviceAccounts(user).length > 1);

  const { data, isLoading, error } = useQuery<AuthorizeInfo>({
    queryKey: ['oauthAuthorize', client_id, redirect_uri, response_type, scope, user?.id],
    queryFn: async () => {
      const qs = new URLSearchParams({
        client_id: client_id || '',
        redirect_uri: redirect_uri || '',
        response_type: response_type || '',
        scope,
      });
      return (await api.get(`/api/oauth/authorize?${qs.toString()}`)).data;
    },
    enabled: !!client_id && !!redirect_uri && !!response_type,
    retry: false,
  });

  const consent = useMutation({
    mutationFn: async () =>
      (
        await api.post('/api/oauth/authorize', {
          client_id,
          redirect_uri,
          scopes: scope,
          state,
          nonce,
          code_challenge,
          code_challenge_method,
        })
      ).data as { redirectUrl: string },
    onSuccess: (res) => {
      setLeaving(true);
      window.location.assign(res.redirectUrl);
    },
  });

  if (!client_id || !redirect_uri || !response_type) {
    return <ErrorCard title="Invalid request" message="This sign-in link is missing required information. Go back to the app and try again." />;
  }

  if (isLoading) {
    return (
      <Shell>
        <div className="bg-card border border-border rounded-3xl shadow-xl p-8">
          <div className="flex justify-center items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <Skeleton className="w-6 h-6 rounded-full" />
            <Skeleton className="w-16 h-16 rounded-2xl" />
          </div>
          <Skeleton className="h-6 w-3/4 mx-auto mt-6" />
          <Skeleton className="h-4 w-1/2 mx-auto mt-3" />
          <div className="mt-8 space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
          <Skeleton className="h-11 rounded-xl mt-8" />
        </div>
      </Shell>
    );
  }

  if (error || !data?.app) {
    const code = (error as Error)?.message || '';
    return <ErrorCard title="Can't connect this app" message={ERROR_TEXT[code] || code || 'Something went wrong. Please try again.'} />;
  }

  const app = data.app;
  const granted = data.scopes?.length ? data.scopes : ['profile'];
  const scopeRows = OAUTH_SCOPES.filter((s) => granted.includes(s.scope));
  let redirectHost: string;
  try {
    redirectHost = new URL(redirect_uri).host || new URL(redirect_uri).protocol;
  } catch {
    redirectHost = redirect_uri;
  }

  const cancel = () => {
    // The redirect URI was validated by the server, so tell the app the user declined.
    try {
      const u = new URL(redirect_uri);
      u.searchParams.set('error', 'access_denied');
      if (state) u.searchParams.set('state', state);
      setLeaving(true);
      window.location.assign(u.toString());
    } catch {
      window.history.back();
    }
  };

  if (choosing) {
    return (
      <Shell>
        <AccountChooser appName={app.name} user={user} onChosen={() => setChoosing(false)} />
      </Shell>
    );
  }

  return (
    <Shell>
      {showMascot && (
        <div aria-hidden className="pointer-events-none absolute -left-[260px] top-1/2 -translate-y-1/2 w-[230px] hidden lg:block">
          <Suspense fallback={null}>
            <WevMascot state={consent.isPending || leaving ? 'SUCCESS' : 'IDLE'} className="w-full h-auto" />
          </Suspense>
        </div>
      )}
      <div className="bg-card sm:border sm:border-border/70 rounded-[28px] sm:shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] overflow-hidden">
        <div className="relative px-6 sm:px-8 pt-8 pb-6 text-center">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/[0.07] to-transparent" />
          <div className="relative flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center">
              <WevsoftMark className="w-10 h-auto" />
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="w-6 border-t-2 border-dotted border-border" />
              <span className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </span>
              <span className="w-6 border-t-2 border-dotted border-border" />
            </div>
            <AppAvatar name={app.name} logoUrl={app.logoUrl} size="lg" className="shadow-sm" />
          </div>

          <h1 className="relative mt-6 text-xl sm:text-2xl font-semibold tracking-tight text-balance">
            <span className="text-primary">{app.name}</span> wants to access your Wevsoft account
          </h1>

          {user && <AccountChip user={user} onClick={() => setChoosing(true)} disabled={consent.isPending || leaving} />}
        </div>

        {app.mode !== 'production' && app.status !== 'live' && (
          <div className="mx-6 sm:mx-8 mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            <span>Unverified app. Continue only if you trust the developer.</span>
          </div>
        )}

        <div className="px-6 sm:px-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This will allow {app.name} to</h2>
          <ul className="mt-3 rounded-2xl border border-border divide-y divide-border overflow-hidden">
            {scopeRows.map((s) => {
              const Icon = SCOPE_ICONS[s.scope] || Check;
              return (
              <li key={s.scope} className="flex items-center gap-3.5 px-4 py-3.5 bg-background/50 hover:bg-muted/40 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.title}</p>
                </div>
              </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Your password is never shared.</span>
          </p>
        </div>

        <div className="px-6 sm:px-8 pt-6 pb-8">
          {consent.isError && (
            <p className="mb-4 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm px-3.5 py-2.5">
              {(consent.error as Error)?.message || 'Could not complete authorization. Try again.'}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <button type="button" onClick={cancel} disabled={consent.isPending || leaving} className={cx(btnSecondary, 'flex-1 py-3')}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => consent.mutate()}
              disabled={consent.isPending || leaving}
              className={cx(btnPrimary, 'flex-1 py-3')}
              autoFocus
            >
              {consent.isPending || leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Allow
            </button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground text-center leading-relaxed">
            Redirects to{' '}<span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground break-all"><Globe className="w-3 h-3" />{redirectHost}</span>
          </p>
        </div>
      </div>
    </Shell>
  );
}
