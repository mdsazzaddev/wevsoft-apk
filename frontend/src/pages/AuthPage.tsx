import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useStore } from '../store';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PublicAppealForm } from '../components/settings/AccountCenterPhase3';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  User,
  QrCode,
  Fingerprint,
  ChevronRight,
} from 'lucide-react';
import SignedOutAccountsList from '../components/account/SignedOutAccountsList';
import { getSavedAccounts, getSignedOutAccounts, upsertSavedAccount, type SavedAccount } from '../lib/savedAccounts';
import { withCaptchaBody } from '../components/captcha/CaptchaField';
import { CaptchaField } from '../components/captcha/CaptchaField';
import { useSystemSettings } from '../hooks/useSystemSettings';
import UserAvatar from '../components/UserAvatar';
import AuthBackground from '../components/auth/AuthBackground';
import AuthCalligraphy from '../components/auth/AuthCalligraphy';
import AuthOverflowMenu from '../components/auth/AuthOverflowMenu';
import WevsoftMark from '../components/auth/WevsoftMark';
import AuthField from '../components/auth/AuthField';
import AuthSubmitButton from '../components/auth/AuthSubmitButton';
import OtpDigitBoxes from '../components/auth/OtpDigitBoxes';
import { isRealToken } from '@wevsoft/shared/api/cookie-auth';
// Lazy so phones (where the mascot is hidden) never download its SVG/animation code.
const WevMascot = lazy(() => import('../components/auth/mascot/WevMascot'));
import QrLoginCard from '../components/auth/QrLoginCard';
import { useMascotDirector } from '../components/auth/mascot/useMascotDirector';
import { useLiteAuthScene, useNarrowAuthViewport } from '../components/auth/useSceneActivity';
import { resolveWebsiteName } from '@wevsoft/shared/brand';
import { followAuthNext, resolveAuthNext, shouldFollowAuthNext } from '@wevsoft/shared/api/auth-handoff';
import { redirectWithHandoffCode } from '@wevsoft/shared/api/auth-handoff-code';
import { rejectAdminConsumerUser } from '../lib/consumerAuthGuards';
import { dismissWevSplash } from '../lib/wevSplash';
import BiometricPrompt from '../components/auth/BiometricPrompt';
import RecoveryCodePrompt from '../components/auth/RecoveryCodePrompt';
import { getDeveloperAppOrigin } from '../lib/developerAppUrl';
import { getBusinessAppOrigin } from '../lib/businessAppUrl';
import './auth-page.css';

/** Same built-in marks the home header ignores, so a custom upload is the only replacement. */
function isBuiltInHomeLogo(url: string | null | undefined) {
  if (!url) return true;
  return (
    url === '/logo.png' ||
    url === '/logo.svg' ||
    url.endsWith('/logo.png') ||
    url.endsWith('/logo.svg') ||
    url.endsWith('/logo-wevsoft.png') ||
    url.endsWith('/logo-wevsoft.jpg')
  );
}

const ADMIN_APP_URL = String(import.meta.env.VITE_ADMIN_URL || '');

function goAfterAuth(
  next: string | null | undefined,
  navigate: (path: string) => void,
  auth?: { token: string; user: Record<string, unknown> } | null,
) {
  const dest = resolveAuthNext(next, '/feed');
  const role = auth?.user ? String(auth.user.role || '') : '';
  if (!shouldFollowAuthNext(dest, role, ADMIN_APP_URL)) {
    toast.error('This account cannot open the admin dashboard.');
  }
  followAuthNext(next, navigate, auth, '/feed', {
    adminBase: ADMIN_APP_URL,
    trustedHandoffOrigins: [getDeveloperAppOrigin(), getBusinessAppOrigin(), window.location.origin].filter(Boolean),
    // WS7c: one-time code bound to the target origin + its PKCE challenge (no token in URL).
    handoff: (dest, session) => { void redirectWithHandoffCode(dest, session.token); },
  });
}

const RegisterWizard = lazy(() => import('../components/registration/RegisterWizard'));

type AuthView = 'login' | 'register' | 'forgot' | 'oauth_setup' | '2fa';

/**
 * Deliberately generic: saying *which* half of the pair was wrong would let
 * anyone enumerate accounts one guess at a time.
 */
const GENERIC_LOGIN_ERROR = 'That login didn’t work. Please check your credentials and try again.';
/** Long enough for Wevsoft's celebration to land, short enough not to feel slow. */
const CELEBRATION_MS = 950;

/** Login accepts an email, a phone number or a username, so judge all three. */
function identifierVerdict(raw: string): 'unknown' | 'valid' | 'invalid' {
  const value = raw.trim();
  if (!value) return 'unknown';
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? 'valid' : 'invalid';
  }
  if (/^\+?[\d\s-]+$/.test(value)) {
    const digits = value.replace(/[\s-]/g, '').replace(/^\+/, '');
    return digits.length >= 7 && digits.length <= 15 ? 'valid' : 'invalid';
  }
  return value.length >= 3 ? 'valid' : 'invalid';
}

function firstNameOf(name?: string | null) {
  const first = (name || '').trim().split(/\s+/)[0];
  return first || 'friend';
}

/** Never surfaces the server's own message — that is where details leak. */
function loginFailureMessage(status: number): string {
  if (status === 429) return 'Too many attempts. Please wait a moment, then try again.';
  if (status >= 500) return 'We couldn’t reach the login service. Please try again shortly.';
  return GENERIC_LOGIN_ERROR;
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<AuthView>(() => {
    if (typeof window === 'undefined') return 'login';
    const v = new URLSearchParams(window.location.search).get('view');
    if (v === 'forgot' || v === 'register') return v;
    return 'login';
  });
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const systemSettings = useSystemSettings();
  /** Admin → Auth providers: only enabled social buttons appear on login. */
  const [socialProviders, setSocialProviders] = useState<
    { id: 'google' | 'facebook' | 'github' | 'microsoft'; enabled: boolean }[]
  >([]);
  useEffect(() => {
    dismissWevSplash();
  }, []);
  useEffect(() => {
    if (systemSettings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setSettings(systemSettings);
    }
  }, [systemSettings]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/social-providers');
        const data = await res.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data.providers)) {
          setSocialProviders(
            data.providers.filter(
              (p: any) =>
                p &&
                (p.id === 'google' || p.id === 'facebook' || p.id === 'github' || p.id === 'microsoft'),
            ),
          );
        }
      } catch {
        if (!cancelled) setSocialProviders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const enabledSocial = new Set(
    socialProviders.filter((p) => p.enabled).map((p) => p.id),
  );
  const showSocialRow = enabledSocial.size > 0;

  const [showPassword, setShowPassword] = useState(false);
  const [challengeToken, setChallengeToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());
  const [signedOutCount, setSignedOutCount] = useState(() => getSignedOutAccounts().length);
  const [deviceAccountsRevision, setDeviceAccountsRevision] = useState(0);
  const refreshDeviceAccounts = () => {
    setSavedAccounts(getSavedAccounts());
    setSignedOutCount(getSignedOutAccounts().length);
    setDeviceAccountsRevision((n) => n + 1);
  };
  const hasDeviceAccounts = savedAccounts.length > 0 || signedOutCount > 0;
  const addingAccount = searchParams.get('add_account') === '1';
  const [isBiometricPromptOpen, setIsBiometricPromptOpen] = useState(false);
  const [biometricMode, setBiometricMode] = useState<'login' | 'register' | 'intercept-register'>('login');
  const [isRecoveryPromptOpen, setIsRecoveryPromptOpen] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{token: string, user: any} | null>(null);
  const [suspension, setSuspension] = useState<any>(null);
  const [banned, setBanned] = useState(false);
  const [unsuspendLoading, setUnsuspendLoading] = useState(false);
  const [oauthPrefill, setOauthPrefill] = useState<{
    provider: string;
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
  } | null>(null);

  const token = useStore((state) => state.token);
  const setAuth = useStore((state) => state.setAuth);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  // Mascot is desktop-only: hidden on mobile/narrow screens (<=1023px) to spare the device.
  const isNarrowViewport = useNarrowAuthViewport();
  const showMascot = !isNarrowViewport;
  const [showQrForm, setShowQrForm] = useState(false);

  const flagFailedLogin = () => {
    setFormError(GENERIC_LOGIN_ERROR);
    setFailureNonce((n) => n + 1);
    setShakeNonce((n) => n + 1);
  };

  // ?login_hint= prefills the identifier once (initializer; was a mount effect).
  const [formData, setFormData] = useState(() => ({
    email: searchParams.get('login_hint') || '', password: '', name: '', mobile: '', phone: '', gender: 'Male', hscBatch: '', department: 'Science', rollNo: '', provider: '', providerId: '', description: ''
  }));

  // ── UI-only signals for the mascot ───────────────────────────────────────
  // Booleans and counters exclusively. No credential value crosses this line.
  const [identifierFocused, setIdentifierFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [identifierNonce, setIdentifierNonce] = useState(0);
  const [passwordNonce, setPasswordNonce] = useState(0);
  const [hover, setHover] = useState<'forgot' | 'signup' | null>(null);

  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; code?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [failureNonce, setFailureNonce] = useState(0);
  const [shakeNonce, setShakeNonce] = useState(0);
  const [success, setSuccess] = useState(false);
  const [welcomeName, setWelcomeName] = useState('friend');

  // Forgot password OTP flow state (90s security cooldown)
  const [forgotStep, setForgotStep] = useState<'email' | 'otp'>('email');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  // Lets the celebration finish before the token-watching effect below jumps away.
  const celebratingRef = useRef(false);
  const celebrationTimer = useRef<number | null>(null);
  // The card scrolls internally on short viewports, and the success curtain is
  // absolutely positioned inside it — so return to the top before showing it,
  // otherwise the curtain would sit above whatever the user is looking at.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
    },
    [],
  );

  // Auth is a fixed viewport — no document scroll, and no body bounce behind it.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  const mascot = useMascotDirector({
    view,
    identifierFocused,
    identifierValidity: view === 'login' ? identifierVerdict(formData.email) : 'unknown',
    identifierTypingNonce: identifierNonce,
    passwordFocused,
    passwordTypingNonce: passwordNonce,
    passwordVisible: showPassword && (view === 'login' || view === 'register'),
    submitting: loading,
    failureNonce,
    success,
    hover,
  });

  useEffect(() => {
    // Check for oauth success or setup
    const oauthToken = searchParams.get('token');
    const userStr = searchParams.get('user');
    const oauthSetup = searchParams.get('oauth_setup');
    const provider = searchParams.get('provider');
    const providerId = searchParams.get('providerId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const ref = (searchParams.get('ref') || '').trim().toUpperCase();
    if (ref) {
      try { localStorage.setItem('wev_ref', ref); } catch { /* ignore */ }
    }

    const oauthError = searchParams.get('error');
    if (oauthError === 'ACCOUNT_SUSPENDED') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setSuspension({
        reason: searchParams.get('reason'),
        endsAtLabel: searchParams.get('endsAt'),
        type: searchParams.get('type'),
        canSelfUnsuspend: searchParams.get('type') === 'SELF',
      });
    }
    if (oauthError === 'ACCOUNT_BANNED') {
      setBanned(true);
    }
    if (oauthError === 'invalid') {
      flagFailedLogin();
    }

    if (oauthToken && userStr) {
      try {
        const oauthUser = JSON.parse(userStr);
        if (rejectAdminConsumerUser(oauthUser)) {
          flagFailedLogin();
        } else {
          setAuth(oauthToken, oauthUser);
          toast.success('Logged in successfully');
          const next = searchParams.get('next');
          goAfterAuth(next, navigate, { token: oauthToken, user: oauthUser });
        }
      } catch (e) { /* ignore */ }
    } else if (oauthSetup === 'true' && provider && providerId) {
      setView('oauth_setup');
      setOauthPrefill({
        provider,
        providerId,
        email: email || undefined,
        name: name || undefined,
        avatar: searchParams.get('avatar') || undefined,
      });
      toast('Complete the same signup steps to finish your account.');
    } else if (token && !addingAccount && !celebratingRef.current && searchParams.get('view') !== 'forgot') {
      // Skipped mid-celebration: handleSubmit owns the redirect in that case.
      const next = searchParams.get('next');
      fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (!res.ok) {
            if (res.status === 401) useStore.getState().logout();
            return;
          }
          return res.json().then((profile) => {
            if (rejectAdminConsumerUser(profile)) {
              useStore.getState().logout();
              flagFailedLogin();
              return;
            }
            const state = useStore.getState();
            setAuth(token, { ...(state.user || {}), ...profile });
            goAfterAuth(next, navigate, { token, user: { ...(state.user || {}), ...profile } });
          });
        })
        .catch(() => {});
    }

  }, [searchParams, token, navigate, setAuth]);

  /** Any edit clears the failure, which is what walks Wevsoft back to normal. */
  const clearErrors = (field?: 'email' | 'password' | 'code') => {
    if (field) setFieldErrors(prev => (prev[field] ? { ...prev, [field]: undefined } : prev));
    setFormError(null);
    setFailureNonce(0);
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    clearErrors(name === 'password' ? 'password' : name === 'email' ? 'email' : undefined);
    if (name === 'phone') {
      setFormData(prev => ({ ...prev, phone: value, mobile: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const goToView = (next: AuthView) => {
    setView(next);
    setFieldErrors({});
    setFormError(null);
    setFailureNonce(0);
    setHover(null);
    if (next !== 'forgot') {
      setForgotStep('email');
      setForgotOtp('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    }
  };

  const handleResendForgotOtp = async () => {
    if (forgotCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const body = await withCaptchaBody(
        { email: formData.email.trim() },
        { action: 'forgot_password', turnstileToken: captchaToken },
      );
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'A new verification code has been sent to your email');
        setForgotCooldown(data.cooldown || 90);
      } else {
        if (data.remainingSeconds) setForgotCooldown(data.remainingSeconds);
        toast.error(data.error || 'Could not resend code');
      }
      setCaptchaToken(null);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Login runs its own validation so the messaging matches the rest of the card.
    if (view === 'login') {
      const errors: { email?: string; password?: string } = {};
      if (!formData.email.trim()) errors.email = 'Please enter your email, phone, or username.';
      if (!formData.password) errors.password = 'Please enter your password.';
      if (errors.email || errors.password) {
        setFieldErrors(errors);
        setShakeNonce(n => n + 1);
        return;
      }
    }

    setLoading(true);

    if (view === 'forgot') {
      if (forgotStep === 'email') {
        const email = formData.email.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          setFieldErrors({ email: 'Please enter a valid email address' });
          setShakeNonce(n => n + 1);
          setLoading(false);
          return;
        }
        try {
          const body = await withCaptchaBody(
            { email },
            { action: 'forgot_password', turnstileToken: captchaToken },
          );
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success(data.message || 'Verification code sent to your email');
            setForgotStep('otp');
            setForgotCooldown(data.cooldown || 90);
          } else {
            if (res.status === 429 && data.remainingSeconds) {
              setForgotCooldown(data.remainingSeconds);
            }
            toast.error(data.error || 'Failed to send verification code');
            setShakeNonce(n => n + 1);
          }
          setCaptchaToken(null);
        } catch {
          toast.error('Network error. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (forgotStep === 'otp') {
        const code = forgotOtp.trim();
        const newPassword = forgotNewPassword;
        const confirmPassword = forgotConfirmPassword;

        if (!/^\d{6}$/.test(code)) {
          toast.error('Please enter the 6-digit verification code');
          setShakeNonce(n => n + 1);
          setLoading(false);
          return;
        }
        if (newPassword.length < 8) {
          toast.error('Password must be at least 8 characters long');
          setShakeNonce(n => n + 1);
          setLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          toast.error('Passwords do not match');
          setShakeNonce(n => n + 1);
          setLoading(false);
          return;
        }

        try {
          const res = await fetch('/api/auth/forgot-password/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: formData.email.trim(),
              code,
              newPassword,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success(data.message || 'Password reset successfully! Please sign in.');
            goToView('login');
            setForgotStep('email');
            setForgotOtp('');
            setForgotNewPassword('');
            setForgotConfirmPassword('');
          } else {
            toast.error(data.error || 'Failed to reset password');
            setShakeNonce(n => n + 1);
          }
        } catch {
          toast.error('Network error. Please try again.');
        }
        setLoading(false);
        return;
      }
    }

    if (view === '2fa') {
      try {
        const res = await fetch('/api/auth/login/2fa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeToken,
            code: otpCode.trim(),
            trustDevice: true,
            deviceId: localStorage.getItem('wev_device_id') || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok && data.token) {
          if (rejectAdminConsumerUser(data.user)) {
            flagFailedLogin();
          } else {
            setAuth(data.token, data.user);
            toast.success(data.usedBackupCode ? 'Logged in with backup code' : 'Logged in successfully');
            celebrate(data.user, searchParams.get('next'));
          }
        } else if (data.code === 'ACCOUNT_BANNED') {
          setSuspension(null);
          setBanned(true);
        } else if (data.code === 'ACCOUNT_SUSPENDED' || data.suspension) {
          setSuspension(data.suspension || { reason: data.reason, endsAtLabel: data.endsAt, type: data.type, canSelfUnsuspend: data.suspension?.canSelfUnsuspend });
          toast.error('This account is currently suspended');
        } else {
          setFieldErrors({ code: data.error || 'Invalid verification code' });
          setShakeNonce(n => n + 1);
        }
      } catch {
        toast.error('Network error. Please try again.');
      }
      setLoading(false);
      return;
    }

    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      let deviceId = localStorage.getItem('wev_device_id');
      if (!deviceId) {
        // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
        deviceId = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        localStorage.setItem('wev_device_id', deviceId);
      }
      const referralCode = (searchParams.get('ref') || localStorage.getItem('wev_ref') || '').trim().toUpperCase();
      const captchaAction = view === 'login' ? 'login' : 'register';
      const body = await withCaptchaBody(
        { ...formData, deviceId, referralCode },
        { action: captchaAction, turnstileToken: captchaToken },
      );
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      // Single-use Turnstile token — clear so the widget can quietly auto-pass again.
      // Wrong-password retries also rely on the short-lived `wev_cf_ok` pass cookie.
      setCaptchaToken(null);
      if (res.ok) {
        if (data.status === 'pending') {
          toast.success(data.message);
        } else if (data.requires2fa && data.challengeToken) {
          setChallengeToken(data.challengeToken);
          setOtpCode('');
          goToView('2fa');
          toast('Enter your authenticator code', { icon: '🔐' });
        } else if (rejectAdminConsumerUser(data.user)) {
          flagFailedLogin();
        } else {
          setAuth(data.token, data.user);
          toast.success(view === 'login' ? 'Logged in successfully' : 'Registration complete');
          try { if (view !== 'login') localStorage.removeItem('wev_ref'); } catch { /* ignore */ }
          const next = searchParams.get('next');
          if (view === 'login') {
            celebrate(data.user, next);
          } else {
            navigate('/welcome');
          }
        }
      } else if (data.code === 'ACCOUNT_BANNED') {
        setSuspension(null);
        setBanned(true);
      } else if (data.code === 'ACCOUNT_SUSPENDED' || data.suspension) {
        setBanned(false);
        setSuspension(data.suspension || { reason: data.reason, endsAtLabel: data.endsAt, type: data.type });
        toast.error('This account is currently suspended');
      } else if (view === 'login') {
        // Wevsoft reacts first; useMascotDirector releases the message afterwards.
        setFormError(loginFailureMessage(res.status));
        setFailureNonce(n => n + 1);
        setShakeNonce(n => n + 1);
      } else {
        toast.error(data.error || 'An error occurred');
      }
    } catch (err) {
      if (view === 'login') {
        setFormError('No connection. Check your network and try again.');
        setFailureNonce(n => n + 1);
        setShakeNonce(n => n + 1);
      } else {
        toast.error('Network error. Please try again.');
      }
    }
    setLoading(false);
  };

  /** Hold the screen just long enough for Wevsoft to wave, then continue. */
  const celebrate = (user: any, next: string | null) => {
    celebratingRef.current = true;
    setWelcomeName(firstNameOf(user?.name));
    cardRef.current?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    setSuccess(true);
    celebrationTimer.current = window.setTimeout(() => {
      const state = useStore.getState();
      goAfterAuth(next, navigate, state.token && state.user ? { token: state.token, user: state.user } : null);
    }, reduceMotion ? 0 : CELEBRATION_MS);
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `/api/auth/${provider}`;
  };

  /** `loginPageName` overrides the site-wide name for this page only. */
  const brandName = resolveWebsiteName(settings?.loginPageName || settings?.websiteName);
  const homeLogoUrl = settings?.sidebarLogo || settings?.websiteLogo || '';
  const [homeLogoFailed, setHomeLogoFailed] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setHomeLogoFailed(false);
  }, [homeLogoUrl]);
  const customHomeLogo = !homeLogoFailed && !!homeLogoUrl && !isBuiltInHomeLogo(homeLogoUrl);

  const heading = addingAccount
    ? 'Add another account'
    : view === 'register' ? 'Join WevSpace'
    : view === 'oauth_setup' ? 'Finish your WevSpace signup'
    : view === '2fa' ? 'Two-factor authentication'
    : view === 'forgot'
      ? forgotStep === 'otp'
        ? 'Set New Password'
        : 'Reset Your Password'
    : 'Sign in to WevSpace';
  const subheading = view === 'login' ? ''
    : view === 'register' ? 'Create your main account in a few clear steps.'
    : view === 'oauth_setup' ? 'Same steps as a new account — email or phone, whichever you prefer.'
    : view === '2fa' ? 'One more step to keep your account safe.'
    : view === 'forgot'
      ? forgotStep === 'otp'
        ? `Enter the 6-digit code sent to ${formData.email} and choose a new password.`
        : 'Enter your registered email address and we’ll send you a verification code.'
    : '';
  const submitLabel = view === '2fa' ? 'Verify & Login'
    : view === 'login' ? 'Sign in'
    : view === 'register' ? 'Create Account'
    : view === 'forgot'
      ? forgotStep === 'otp'
        ? 'Update Password'
        : 'Send Verification Code'
    : 'Submit';

  // Wraps the password group so the visibility toggle still counts as "focused".
  const passwordFocusProps = {
    onFocus: () => setPasswordFocused(true),
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPasswordFocused(false);
    },
  };

  const visibilityToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(v => !v)}
      aria-pressed={showPassword}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      className="grid size-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  // Avoid refresh FOUC: never assume calligraphy ON while settings are still null
  // (null !== false used to paint art, then API false yanked it). Prefer last-known
  // session cache so an enabled flag still appears instantly on reload.
  const resolvedSettings = settings ?? systemSettings;
  const settingsReady = Boolean(resolvedSettings);
  const calligraphyEnabled = resolvedSettings?.loginCalligraphyEnabled !== false;
  /** Missing/false = OFF (admin must enable Face ID / Passkey on login). */
  const loginPasskeyEnabled = resolvedSettings?.loginPasskeyEnabled === true;
  useEffect(() => {
    if (!settingsReady) return;
    try {
      sessionStorage.setItem('wev_login_calligraphy', calligraphyEnabled ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [settingsReady, calligraphyEnabled]);
  const cachedCalligraphyOn = (() => {
    try {
      return sessionStorage.getItem('wev_login_calligraphy') === '1';
    } catch {
      return false;
    }
  })();
  const showCalligraphy =
    view === 'login' && (settingsReady ? calligraphyEnabled : cachedCalligraphyOn);

  /** One-tap restore for a device-saved session — no separate Sign in click. */
  const continueAsSavedAccount = (account: SavedAccount) => {
    if (rejectAdminConsumerUser(account)) {
      flagFailedLogin();
      return;
    }
    if (!isRealToken(account.token)) {
      // Cookie-only / stale entry: prefill identity and ask for password.
      setFormData((f) => ({ ...f, email: account.email || account.username || '' }));
      toast(`Enter the password for ${account.name}`);
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLInputElement>('input[name="password"]');
        el?.focus();
      });
      return;
    }
    const user = {
      id: account.id,
      name: account.name,
      email: account.email || '',
      username: account.username || undefined,
      avatar: account.avatar || undefined,
      role: account.role || undefined,
      theme: account.theme || 'dark',
    };
    setAuth(account.token, user);
    toast.success(`Welcome back, ${account.name}`);
    goAfterAuth(searchParams.get('next'), navigate, { token: account.token, user });
  };

  return (
    <div className={`auth-screen fixed inset-0${showCalligraphy ? ' auth-screen--calligraphy' : ''}`}>
      <AuthBackground />
      {showCalligraphy ? <AuthCalligraphy /> : null}

      <div className="auth-brand-corner">
        {customHomeLogo ? (
          <img
            src={homeLogoUrl}
            alt=""
            className="auth-brand-logo"
            onError={() => setHomeLogoFailed(true)}
          />
        ) : (
          <WevsoftMark className="auth-brand-logo" />
        )}
        <p className="auth-brand-name">{brandName}</p>
      </div>

      <AuthOverflowMenu onAccountsChanged={refreshDeviceAccounts} />

      <div className="auth-shell relative z-10">
        <aside className="auth-split-left auth-brand-stage" aria-label="Wevsoft">
          {showMascot ? (
            <div className="auth-mascot-slot block" aria-hidden="true">
              <Suspense fallback={null}>
                <WevMascot
                  state={mascot.state}
                  blinking={mascot.blinking}
                  className="wev-mascot--auth mx-auto"
                />
              </Suspense>
            </div>
          ) : null}
          {showMascot && !showCalligraphy ? (
            <p className="auth-brand-tagline auth-brand-tagline--desktop block mt-4">
              {brandName} keeps your batch, your seniors and your juniors in one place — reels,
              jobs, events and everything in between.
            </p>
          ) : null}
        </aside>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          className={`auth-split-right auth-card ${view === 'register' || view === 'oauth_setup' ? 'auth-card--wide' : ''}`}
        >
          <div ref={cardRef} className="auth-card-inner">
          {view === 'login' && showQrForm ? (
            <div className="flex flex-col items-center justify-center gap-6 py-4 w-full">
              <QrLoginCard onSuccess={(qrToken, qrUser) => {
                if (rejectAdminConsumerUser(qrUser)) { flagFailedLogin(); return; }
                setAuth(qrToken, qrUser as any);
                toast.success('লগইন সফল হয়েছে');
                goAfterAuth(searchParams.get('next'), navigate, { token: qrToken, user: qrUser as any });
              }} />
              <button
                type="button"
                onClick={() => setShowQrForm(false)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Log in with password instead
              </button>
            </div>
          ) : (
            <>
          {view !== 'register' && view !== 'oauth_setup' && !(view === 'login' && !addingAccount) && (
          <header className="auth-card-heading">
            <h1>{heading}</h1>
            {subheading ? <p>{subheading}</p> : null}
          </header>
          )}

          {/* Announced without stealing focus. */}
          <p role="status" className="sr-only">
            {loading ? 'Checking your credentials' : success ? `Signed in. Welcome back, ${welcomeName}.` : ''}
          </p>

          {banned && !suspension && (
            <div className="mb-5 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm" role="alert" data-testid="auth-banned-card">
              <p className="font-bold text-red-700 dark:text-red-300">This account has been banned.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                If you believe this was a mistake, send an appeal. Keep your sign-in details filled in above so we can confirm it is your account.
              </p>
              <div className="mt-3 border-t border-red-500/30 pt-3">
                <PublicAppealForm identifier={formData.email} password={formData.password} />
              </div>
              <button type="button" onClick={() => setBanned(false)} className="mt-3 text-xs font-semibold text-muted-foreground hover:underline">
                Use a different account
              </button>
            </div>
          )}

          {suspension && (
            <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              <p className="font-bold text-amber-700 dark:text-amber-300">Your account is currently suspended.</p>
              {suspension.reason && <p className="mt-2 whitespace-pre-wrap"><span className="font-semibold">Reason:</span> {suspension.reason}</p>}
              {suspension.endsAtLabel && <p className="mt-2"><span className="font-semibold">Suspension ends:</span> {suspension.endsAtLabel}</p>}
              {suspension.remaining && <p className="text-xs text-muted-foreground mt-1">{suspension.remaining}</p>}
              {suspension.canSelfUnsuspend && (
                <button
                  type="button"
                  disabled={unsuspendLoading}
                  onClick={async () => {
                    setUnsuspendLoading(true);
                    try {
                      const res = await fetch('/api/account/self-unsuspend', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: formData.email, password: formData.password }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Could not restore account');
                      setSuspension(null);
                      toast.success('Account restored. You can log in now.');
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setUnsuspendLoading(false);
                    }
                  }}
                  className="mt-3 w-full rounded-xl bg-amber-600 text-white font-bold py-2"
                >
                  {unsuspendLoading ? 'Restoring…' : 'Restore my account'}
                </button>
              )}
              {!suspension.canSelfUnsuspend && (
                <div className="mt-3 border-t border-amber-500/30 pt-3">
                  <PublicAppealForm identifier={formData.email} password={formData.password} />
                </div>
              )}
            </div>
          )}

          {view === 'login' && hasDeviceAccounts && (
            <div className="auth-accounts-block">
              <div className="auth-accounts-scroller" data-testid="auth-accounts-scroller">
                {savedAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => continueAsSavedAccount(account)}
                    aria-label={`Continue as ${account.name}`}
                    className="auth-account-row flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-background/40 p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <UserAvatar user={account} className="w-10 h-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{account.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {account.username ? `@${account.username}` : account.email || 'Tap to continue'}
                      </div>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
                <SignedOutAccountsList
                  allowRemove={false}
                  continueArrow
                  refreshKey={deviceAccountsRevision}
                  onPick={(a) => {
                    setFormData((f) => ({ ...f, email: a.email || a.username || '' }));
                    toast(`Enter the password for ${a.name}`);
                    requestAnimationFrame(() => {
                      const el = document.querySelector<HTMLInputElement>('input[name="password"]');
                      el?.focus();
                    });
                  }}
                />
              </div>
              <div className="auth-accounts-divider relative py-2 shrink-0">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-medium">Or log in with password</span>
                </div>
              </div>
            </div>
          )}

          {/* Generic message only, and only once Wevsoft has had its reaction. */}
          <AnimatePresence initial={false}>
            {formError && mascot.errorVisible && (
              <motion.div
                role="alert"
                initial={reduceMotion ? undefined : { opacity: 0, height: 0, marginBottom: 0 }}
                animate={reduceMotion ? undefined : { opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/40 bg-red-500/10 p-3.5 text-sm font-medium text-red-600 dark:text-red-300">
                  <AlertCircle size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
                  {formError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {view === 'register' || view === 'oauth_setup' ? (
            <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}>
              <RegisterWizard
                referralCode={(searchParams.get('ref') || localStorage.getItem('wev_ref') || '').trim().toUpperCase()}
                oauthPrefill={view === 'oauth_setup' ? oauthPrefill || undefined : undefined}
                onCancel={() => {
                  setOauthPrefill(null);
                  navigate('/auth', { replace: true });
                  goToView('login');
                }}
                onSuccess={({ token, user }) => {
                  setAuth(token, user);
                  setOauthPrefill(null);
                  try { localStorage.removeItem('wev_ref'); } catch { /* ignore */ }
                  toast.success(view === 'oauth_setup' ? 'Account linked — welcome!' : 'Welcome to WevSpace');
                  navigate('/home', { replace: true });
                }}
              />
            </Suspense>
          ) : (
          <form onSubmit={handleSubmit} noValidate={view === 'login'} className="auth-form space-y-4">
            <AnimatePresence mode="popLayout">
              {view === '2fa' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="auth-form-stack space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code from your authenticator app, or a one-time backup code.
                  </p>
                  <div {...passwordFocusProps}>
                    <AuthField
                      label="Verification code"
                      name="otpCode"
                      value={otpCode}
                      onChange={(e) => { setOtpCode(e.target.value); clearErrors('code'); }}
                      onTyped={() => setPasswordNonce(n => n + 1)}
                      icon={ShieldCheck}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456 or XXXX-XXXX"
                      error={fieldErrors.code}
                      shakeNonce={shakeNonce}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { goToView('login'); setChallengeToken(''); setOtpCode(''); }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    ← Back to login
                  </button>
                </motion.div>
              )}

              {view === 'login' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="auth-form-stack space-y-4 -mb-2"
                >
                  <AuthField
                    label="Email, phone or username"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocusChange={setIdentifierFocused}
                    onTyped={() => setIdentifierNonce(n => n + 1)}
                    icon={User}
                    autoComplete="username"
                    error={fieldErrors.email}
                    shakeNonce={shakeNonce}
                    required
                  />

                  <div {...passwordFocusProps}>
                    <AuthField
                      label="Password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      onTyped={() => setPasswordNonce(n => n + 1)}
                      icon={Lock}
                      autoComplete="current-password"
                      error={fieldErrors.password}
                      shakeNonce={shakeNonce}
                      trailing={visibilityToggle}
                      required
                    />
                  </div>

                  <div className="flex justify-end !-mt-2">
                    <button
                      type="button"
                      onClick={() => goToView('forgot')}
                      onMouseEnter={() => setHover('forgot')}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover('forgot')}
                      onBlur={() => setHover(null)}
                      className="rounded-lg text-xs font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                      Forgot password?
                    </button>
                  </div>
                </motion.div>
              )}

              {view === 'forgot' && forgotStep === 'email' && (
                <motion.div
                  key="forgot-email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="auth-form-stack space-y-4"
                >
                  <AuthField
                    label="Account Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onFocusChange={setIdentifierFocused}
                    onTyped={() => setIdentifierNonce(n => n + 1)}
                    icon={Mail}
                    autoComplete="email"
                    error={fieldErrors.email}
                    placeholder="name@example.com"
                    required
                  />
                </motion.div>
              )}

              {view === 'forgot' && forgotStep === 'otp' && (
                <motion.div
                  key="forgot-otp"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="auth-form-stack space-y-4"
                >
                  <OtpDigitBoxes
                    label="6-Digit Verification Code"
                    name="forgotOtp"
                    value={forgotOtp}
                    onChange={setForgotOtp}
                    autoFocus
                  />

                  <div {...passwordFocusProps}>
                    <AuthField
                      label="New Password"
                      name="forgotNewPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={forgotNewPassword}
                      onChange={(e: any) => setForgotNewPassword(e.target.value)}
                      icon={Lock}
                      autoComplete="new-password"
                      trailing={visibilityToggle}
                      placeholder="At least 8 characters"
                      required
                    />
                  </div>

                  <div {...passwordFocusProps}>
                    <AuthField
                      label="Confirm New Password"
                      name="forgotConfirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={forgotConfirmPassword}
                      onChange={(e: any) => setForgotConfirmPassword(e.target.value)}
                      icon={Lock}
                      autoComplete="new-password"
                      placeholder="Repeat new password"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep('email')}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendForgotOtp}
                      disabled={forgotCooldown > 0 || loading}
                      className={`text-xs font-semibold transition-colors ${
                        forgotCooldown > 0
                          ? 'text-muted-foreground/60 cursor-not-allowed'
                          : 'text-primary hover:underline cursor-pointer'
                      }`}
                    >
                      {forgotCooldown > 0 ? `Resend code in ${forgotCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {(['login', 'register', 'forgot'] as string[]).includes(view) && (
              <CaptchaField
                action={view === 'forgot' ? 'forgot_password' : view === 'login' ? 'login' : 'register'}
                token={captchaToken}
                onToken={setCaptchaToken}
              />
            )}

            <AuthSubmitButton
              label={submitLabel}
              loadingLabel={view === 'login' || view === '2fa' ? 'Signing in…' : 'Processing…'}
              loading={loading}
              done={success}
            />

            {view === 'login' && (
              <div className="auth-alt-signin mt-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setShowQrForm(true)}
                  className="auth-oauth-btn w-full"
                >
                  <QrCode size={16} />
                  <span className="auth-alt-signin__label">Sign in with QR Code</span>
                </button>
                {loginPasskeyEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setBiometricMode('login');
                      setIsBiometricPromptOpen(true);
                    }}
                    className="auth-oauth-btn w-full"
                  >
                    <Fingerprint size={16} />
                    <span className="auth-alt-signin__label">Sign in with Face ID / Passkey</span>
                  </button>
                )}
              </div>
            )}
          </form>
          )}

          {view === 'login' && !showQrForm && showSocialRow && (
            <div className="auth-oauth flex flex-col items-center mt-2 border-none">
              <span className="text-xs text-muted-foreground mb-1">Or continue with</span>
              <div className="flex items-center justify-center gap-4 sm:gap-5">
                {enabledSocial.has('google') && (
                  <button type="button" onClick={() => handleOAuthLogin('google')} aria-label="Continue with Google" className="auth-oauth-icon">
                    <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                    </svg>
                  </button>
                )}
                {enabledSocial.has('facebook') && (
                  <button type="button" onClick={() => handleOAuthLogin('facebook')} aria-label="Continue with Facebook" className="auth-oauth-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="12" fill="#1877F2" />
                      <path fill="#fff" d="M13.5 8.5h1.75V6.1c-.3-.04-.94-.1-1.8-.1-1.78 0-3 1.12-3 3.18V11H8.25v2.7H10.45V22h2.7v-8.3h1.8l.35-2.7h-2.15V9.35c0-.78.21-1.35 1.35-1.35z" />
                    </svg>
                  </button>
                )}
                {enabledSocial.has('github') && (
                  <button type="button" onClick={() => handleOAuthLogin('github')} aria-label="Continue with GitHub" className="auth-oauth-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#6e40c9" d="M12 .5C5.37.5 0 5.78 0 12.292c0 5.211 3.438 9.63 8.205 11.188.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.335-1.725-1.335-1.725-1.087-.731.084-.716.084-.716 1.205.082 1.838 1.215 1.838 1.215 1.07 1.803 2.809 1.282 3.495.981.108-.763.417-1.282.76-1.577-2.665-.295-5.466-1.309-5.466-5.827 0-1.287.465-2.339 1.235-3.164-.135-.298-.54-1.497.105-3.121 0 0 1.005-.316 3.3 1.209.96-.262 1.98-.392 3-.398 1.02.006 2.04.136 3 .398 2.28-1.525 3.285-1.209 3.285-1.209.645 1.624.24 2.823.12 3.121.765.825 1.23 1.877 1.23 3.164 0 4.53-2.805 5.527-5.475 5.817.42.354.81 1.077.81 2.182 0 1.575-.015 2.845-.015 3.232 0 .309.21.678.825.56C20.565 21.917 24 17.495 24 12.292 24 5.78 18.627.5 12 .5z" />
                    </svg>
                  </button>
                )}
                {enabledSocial.has('microsoft') && (
                  <button type="button" onClick={() => handleOAuthLogin('microsoft')} aria-label="Continue with Microsoft" className="auth-oauth-icon">
                    <svg width="22" height="22" viewBox="0 0 23 23" aria-hidden="true">
                      <path fill="#f25022" d="M1 1h9.5v9.5H1z" />
                      <path fill="#00a4ef" d="M12.5 1H22v9.5H12.5z" />
                      <path fill="#7fba00" d="M1 12.5h9.5V22H1z" />
                      <path fill="#ffb900" d="M12.5 12.5H22V22H12.5z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {view !== 'login' && view !== 'register' && view !== 'oauth_setup' && (
            <div className="mt-6 text-center">
              <button onClick={() => goToView('login')} type="button" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                Back to login
              </button>
            </div>
          )}

          {/* Success curtain — the form stays mounted underneath, untouched. */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="auth-success-curtain"
              >
                <motion.div
                  initial={reduceMotion ? undefined : { scale: 0.94, y: 8 }}
                  animate={reduceMotion ? undefined : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                  className="px-6 text-center"
                >
                  <p className="text-2xl font-black tracking-tight">
                    Welcome back, {welcomeName}! 👋
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">Taking you to your feed…</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
            </>
          )}
          {view === 'login' && !showQrForm && (
            <p className="auth-login-create text-center text-sm">
              <button
                type="button"
                onClick={() => goToView('register')}
                onMouseEnter={() => setHover('signup')}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover('signup')}
                onBlur={() => setHover(null)}
                className="font-semibold text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Create account
              </button>
            </p>
          )}
          </div>
        </motion.div>
      </div>

      <BiometricPrompt
        isOpen={isBiometricPromptOpen}
        mode={biometricMode}
        username={formData.email}
        onSuccess={(token, user) => {
          setIsBiometricPromptOpen(false);
          if (biometricMode === 'intercept-register') {
            // Already logged in, just proceed
            if (pendingAuth) {
              goAfterAuth(searchParams.get('next'), navigate, pendingAuth);
              setPendingAuth(null);
            }
          } else if (token && user) {
            const setAuth = useStore.getState().setAuth;
            if (rejectAdminConsumerUser(user)) {
              setFailureNonce(n => n + 1);
              setShakeNonce(n => n + 1);
              return;
            }
            setAuth(token, user);
            toast.success('Logged in with passkey');
            goAfterAuth(searchParams.get('next'), navigate, { token, user });
          }
        }}
        onClose={() => {
          setIsBiometricPromptOpen(false);
          if (biometricMode === 'intercept-register' && pendingAuth) {
            goAfterAuth(searchParams.get('next'), navigate, pendingAuth);
            setPendingAuth(null);
          }
        }}
        onFallback={() => {
          setIsBiometricPromptOpen(false);
          setIsRecoveryPromptOpen(true);
        }}
      />

      <RecoveryCodePrompt
        isOpen={isRecoveryPromptOpen}
        onSuccess={(token, user) => {
          setIsRecoveryPromptOpen(false);
          const setAuth = useStore.getState().setAuth;
          if (rejectAdminConsumerUser(user)) {
            setFailureNonce(n => n + 1);
            setShakeNonce(n => n + 1);
            return;
          }
          setAuth(token, user);
          toast.success('Logged in with recovery code');
          
          // Trigger interceptor only when login passkey is enabled in admin.
          setPendingAuth({ token, user });
          if (loginPasskeyEnabled) {
            setBiometricMode('intercept-register');
            setIsBiometricPromptOpen(true);
          }
        }}
        onCancel={() => setIsRecoveryPromptOpen(false)}
      />
    </div>
  );
}
