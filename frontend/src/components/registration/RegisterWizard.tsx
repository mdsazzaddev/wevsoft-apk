import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff, Search } from 'lucide-react';
import { useL10n } from '../../utils/l10n';
import { CaptchaField, withCaptchaBody } from '../captcha/CaptchaField';
import {
  GENDER_OPTIONS,
  INTEREST_CATALOG,
  OCCUPATION_STATUS_OPTIONS,
  PASSWORD_MAX_LEN,
  REGISTRATION_COUNTRIES,
  REGISTRATION_STEPS,
  RELIGION_OPTIONS,
  calcAgeFromDob,
  countryByCode,
  passwordStrength,
  validateContactPair,
  validateDob,
  validateNamePart,
  validatePassword,
  suggestRegistrationUsername,
} from '@wevsoft/shared/registration';
import {
  REG_DRAFT_KEY,
  draftFromStorage,
  draftToStorage,
  emptyRegistrationDraft,
  type RegistrationDraft,
} from '../../lib/registrationDraft';
import OtpDigitBoxes from '../auth/OtpDigitBoxes';

type Props = {
  onSuccess: (payload: { token: string; user: any; username: string; passwordForConfirm: string }) => void;
  onCancel: () => void;
  referralCode?: string;
  oauthPrefill?: {
    provider: string;
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
};

function seedDraftFromOauth(oauth: NonNullable<Props['oauthPrefill']>): Partial<RegistrationDraft> {
  const parts = (oauth.name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
    email: oauth.email || '',
    emailVerified: false,
    avatarUrl: oauth.avatar || '',
    oauthProvider: oauth.provider,
    oauthProviderId: oauth.providerId,
  };
}

export default function RegisterWizard({ onSuccess, onCancel, referralCode, oauthPrefill }: Props) {
  const { t, currentLang } = useL10n();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<RegistrationDraft>(() => {
    const stored = draftFromStorage(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(REG_DRAFT_KEY) : null, currentLang || 'en');
    if (referralCode) stored.referralCode = referralCode;
    if (oauthPrefill) Object.assign(stored, seedDraftFromOauth(oauthPrefill));
    if (!stored.language) stored.language = currentLang || 'en';
    return stored;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved'>('idle');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpConfirming, setOtpConfirming] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSmsAvailable, setOtpSmsAvailable] = useState<boolean | null>(null);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const [otpCooldownUntil, setOtpCooldownUntil] = useState(0);
  const [otpCooldownLeft, setOtpCooldownLeft] = useState(0);
  const [emailOtpHint, setEmailOtpHint] = useState('');
  const [phoneOtpHint, setPhoneOtpHint] = useState('');
  /** OTP screen opened only via Contact “Verify” — not part of the linear wizard. */
  const [verifyChannel, setVerifyChannel] = useState<'email' | 'phone' | null>(null);
  const [interestQuery, setInterestQuery] = useState('');
  const [interests, setInterests] = useState(INTEREST_CATALOG.map((i) => ({ slug: i.slug, name: i.name, category: i.category })));
  const [divisions, setDivisions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [done, setDone] = useState<{
    username: string;
    password: string;
    token: string;
    user: any;
  } | null>(null);
  const [showDonePassword, setShowDonePassword] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitLock = useRef(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const stepId = REGISTRATION_STEPS[step];

  // Phone OTP resend countdown
  useEffect(() => {
    if (otpCooldownUntil <= Date.now()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- timer-driven countdown: initial value set before the interval starts
      setOtpCooldownLeft(0);
      return;
    }
    const tick = () => setOtpCooldownLeft(Math.max(0, Math.ceil((otpCooldownUntil - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [otpCooldownUntil]);

  // SMS availability for signup (honest messaging when sender not configured)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/registration/meta');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.smsDelivery === 'boolean') setOtpSmsAvailable(data.smsDelivery);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, []);


  useEffect(() => {
    try {
      sessionStorage.setItem(REG_DRAFT_KEY, draftToStorage(draft));
    } catch {
      /* ignore */
    }
  }, [draft]);

  useEffect(() => {
    fetch('/api/registration/interests')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.interests) && d.interests.length) setInterests(d.interests);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!draft.location.countryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setDivisions([]);
      setDistricts([]);
      return;
    }
    fetch(`/api/divisions?countryId=${encodeURIComponent(draft.location.countryId)}`)
      .then((r) => r.json())
      .then((d) => setDivisions(d.divisions || []))
      .catch(() => setDivisions([]));
  }, [draft.location.countryId]);

  useEffect(() => {
    if (!draft.location.divisionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setDistricts([]);
      return;
    }
    fetch(`/api/districts?divisionId=${encodeURIComponent(draft.location.divisionId)}`)
      .then((r) => r.json())
      .then((d) => setDistricts(d.districts || []))
      .catch(() => setDistricts([]));
  }, [draft.location.divisionId]);

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const u = draft.username.trim();
    if (!u || stepId !== 'contact_username') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/registration/check-username?username=${encodeURIComponent(u)}`);
        const data = await res.json();
        setUsernameStatus(data.status || 'invalid');
        setUsernameSuggestions(data.suggestions || []);
        if (data.error) setErrors((e) => ({ ...e, username: data.error }));
        else setErrors((e) => ({ ...e, username: '' }));
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);
    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
    };
  }, [draft.username, stepId]);

  const patch = (partial: Partial<RegistrationDraft>) => setDraft((d) => ({ ...d, ...partial }));

  useEffect(() => {
    if (stepId !== 'contact_username' || usernameTouched) return;
    const suggested = suggestRegistrationUsername({
      firstName: draft.firstName,
      lastName: draft.lastName,
      preferredName: draft.preferredName,
    });
    if (!suggested) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setDraft((d) => (d.username === suggested ? d : { ...d, username: suggested }));
  }, [stepId, usernameTouched, draft.firstName, draft.lastName, draft.preferredName]);

  const age = draft.dob ? calcAgeFromDob(draft.dob) : null;
  const countryMeta = countryByCode(draft.location.countryCode) || REGISTRATION_COUNTRIES[0];


  const hasPhone = Boolean(String(draft.phoneNational || '').trim());
  const hasEmail = Boolean(String(draft.email || '').trim());
  // contact_verify is a side-trip from Contact “Verify”, not a linear progress step.
  const visibleSteps = REGISTRATION_STEPS.filter((id) => id !== 'contact_verify');
  const progressAnchorId = stepId === 'contact_verify' ? 'contact_username' : stepId;
  const visibleStepIndex = Math.max(0, (visibleSteps as readonly string[]).indexOf(progressAnchorId));
  const progress = ((visibleStepIndex + 1) / Math.max(1, visibleSteps.length)) * 100;
  const registrationDisplayName =
    (draft.preferredName || [draft.firstName, draft.lastName].filter(Boolean).join(' ')).trim() || undefined;

  const resetOtpUi = () => {
    setEmailOtpCode('');
    setPhoneOtpCode('');
    setOtpError('');
    setEmailOtpHint('');
    setPhoneOtpHint('');
    setOtpDevCode(null);
    setOtpCooldownUntil(0);
  };

  const returnToContact = () => {
    resetOtpUi();
    setVerifyChannel(null);
    const idx = REGISTRATION_STEPS.indexOf('contact_username');
    if (idx >= 0) setStep(idx);
  };

  const nextStepIndex = (from: number, dir: 1 | -1) => {
    let i = from + dir;
    while (i >= 0 && i < REGISTRATION_STEPS.length) {
      const id = REGISTRATION_STEPS[i];
      // Never walk into OTP via Continue/Back — only via Verify buttons.
      if (id === 'contact_verify') {
        i += dir;
        continue;
      }
      return i;
    }
    return Math.max(0, Math.min(REGISTRATION_STEPS.length - 1, from));
  };

  const requestEmailOtp = async () => {
    if (!hasEmail) return;
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch('/api/registration/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          email: draft.email,
          preferredName: draft.preferredName || undefined,
          firstName: draft.firstName || undefined,
          lastName: draft.lastName || undefined,
          name: registrationDisplayName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOtpError(data.error || t('reg.otp.sendFailed'));
        return;
      }
      if (data.mailed) {
        setEmailOtpHint(t('reg.otp.sentHint', { target: data.targetHint || draft.email }));
      }
      if (data.devCode) setOtpDevCode(String(data.devCode));
      setOtpCooldownUntil(Date.now() + 60_000);
    } catch {
      setOtpError(t('reg.otp.sendFailed'));
    } finally {
      setOtpSending(false);
    }
  };

  const requestPhoneOtp = async () => {
    if (!hasPhone) return;
    setOtpSending(true);
    setOtpError('');
    try {
      const res = await fetch('/api/registration/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'phone',
          phoneNational: draft.phoneNational,
          phoneCode: draft.location.phoneCode,
          email: draft.email || undefined,
          preferredName: draft.preferredName || undefined,
          firstName: draft.firstName || undefined,
          lastName: draft.lastName || undefined,
          name: registrationDisplayName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || t('reg.otp.sendFailed');
        setOtpError(msg);
        if (res.status === 503 || /sms/i.test(String(msg))) setOtpSmsAvailable(false);
        return;
      }
      if (typeof data.smsAvailable === 'boolean') setOtpSmsAvailable(data.smsAvailable);
      if (data.smsSent) {
        setPhoneOtpHint(t('reg.otp.sentHint', { target: data.targetHint || draft.phoneNational }));
      } else if (data.smsAvailable === false || data.smsError) {
        setOtpSmsAvailable(false);
        setPhoneOtpHint(t('reg.otp.smsUnavailable'));
        setOtpError(data.smsError || t('reg.otp.smsUnavailable'));
      } else if (data.mailed) {
        setPhoneOtpHint(t('reg.otp.emailedFallback'));
      }
      if (data.devCode) setOtpDevCode(String(data.devCode));
      setOtpCooldownUntil(Date.now() + 60_000);
    } catch {
      setOtpError(t('reg.otp.sendFailed'));
    } finally {
      setOtpSending(false);
    }
  };

  const confirmEmailOtp = async (): Promise<boolean> => {
    const code = emailOtpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setOtpError(t('reg.otp.invalidCode'));
      return false;
    }
    setOtpConfirming(true);
    setOtpError('');
    try {
      const res = await fetch('/api/registration/otp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          email: draft.email,
          code,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOtpError(data.error || t('reg.otp.confirmFailed'));
        return false;
      }
      patch({ emailVerified: true, emailChallengeId: String(data.challengeId || '') });
      setEmailOtpHint(t('reg.otp.emailVerified'));
      return true;
    } catch {
      setOtpError(t('reg.otp.confirmFailed'));
      return false;
    } finally {
      setOtpConfirming(false);
    }
  };

  const confirmPhoneOtp = async (): Promise<boolean> => {
    const code = phoneOtpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setOtpError(t('reg.otp.invalidCode'));
      return false;
    }
    setOtpConfirming(true);
    setOtpError('');
    try {
      const res = await fetch('/api/registration/otp/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'phone',
          phoneNational: draft.phoneNational,
          phoneCode: draft.location.phoneCode,
          code,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOtpError(data.error || t('reg.otp.confirmFailed'));
        return false;
      }
      patch({ phoneVerified: true, phoneChallengeId: String(data.challengeId || '') });
      setPhoneOtpHint(t('reg.otp.verified'));
      return true;
    } catch {
      setOtpError(t('reg.otp.confirmFailed'));
      return false;
    } finally {
      setOtpConfirming(false);
    }
  };

  const skipContactVerify = () => {
    returnToContact();
  };

  const startVerify = (channel: 'email' | 'phone') => {
    setOtpError('');
    if (channel === 'email') {
      const email = String(draft.email || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)) {
        setErrors((e) => ({ ...e, email: t('reg.err.email') || 'Enter a valid email' }));
        return;
      }
    } else {
      const national = String(draft.phoneNational || '').replace(/\D/g, '');
      if (national.length < 6) {
        setErrors((e) => ({ ...e, phone: t('reg.err.phone') || 'Enter a valid phone number' }));
        return;
      }
    }
    resetOtpUi();
    setVerifyChannel(channel);
    const idx = REGISTRATION_STEPS.indexOf('contact_verify');
    if (idx >= 0) setStep(idx);
    // Send OTP only after the user explicitly taps Verify.
    window.setTimeout(() => {
      if (channel === 'email') void requestEmailOtp();
      else void requestPhoneOtp();
    }, 0);
  };

  const validateStep = (): boolean => {
    const next: Record<string, string> = {};
    if (stepId === 'name_age') {
      const f = validateNamePart(draft.firstName, t('reg.firstName'));
      const l = validateNamePart(draft.lastName, t('reg.lastName'));
      if (f.ok === false) next.firstName = f.error;
      if (l.ok === false) next.lastName = l.error;
      if (!draft.gender) next.gender = t('reg.err.gender');
      const d = validateDob(draft.dob);
      if (d.ok === false) next.dob = d.error;
    }
    if (stepId === 'education_occupation' && !draft.occupationStatus) next.occupationStatus = t('reg.err.occupation');
    if (stepId === 'location' && !draft.location.countryCode) next.country = t('reg.err.country');
    if (stepId === 'contact_username' || stepId === 'review') {
      const c = validateContactPair({
        email: draft.email,
        phoneNational: draft.phoneNational,
        phoneCode: draft.location.phoneCode,
      });
      if (c.ok === false) next.contact = c.error;
      if (stepId === 'contact_username' && usernameStatus !== 'available') next.username = t('reg.err.username');
    }
    if (stepId === 'password') {
      const p = validatePassword(draft.password);
      if (p.ok === false) next.password = p.error;
      if (draft.password !== draft.confirmPassword) next.confirmPassword = t('reg.err.passwordMatch');
    }
    if (stepId === 'review') {
      if (!draft.acceptedTerms) next.terms = t('reg.err.terms');
      if (!draft.acceptedPrivacy) next.privacy = t('reg.err.privacy');
      if (!draft.acceptedGuidelines) next.guidelines = t('reg.err.guidelines');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = async () => {
    if (stepId === 'contact_verify') {
      const channel = verifyChannel;
      if (channel === 'email') {
        if (draft.emailVerified) {
          returnToContact();
          return;
        }
        const ok = await confirmEmailOtp();
        if (!ok) return;
      } else if (channel === 'phone') {
        if (draft.phoneVerified) {
          returnToContact();
          return;
        }
        const ok = await confirmPhoneOtp();
        if (!ok) return;
      }
      returnToContact();
      return;
    }
    if (!validateStep()) return;
    if (stepId === 'contact_username' || stepId === 'password') {
      resetOtpUi();
      setVerifyChannel(null);
    }
    setStep((s) => nextStepIndex(s, 1));
  };
  const goBack = () => {
    if (stepId === 'contact_verify') {
      returnToContact();
      return;
    }
    setStep((s) => nextStepIndex(s, -1));
  };
  const goToStep = (id: (typeof REGISTRATION_STEPS)[number]) => {
    const idx = REGISTRATION_STEPS.indexOf(id);
    if (idx >= 0) setStep(idx);
  };

  const uploadPhoto = async (file: File, kind: 'avatar' | 'cover') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    const res = await fetch('/api/registration/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    if (kind === 'avatar') patch({ avatarUrl: data.path });
    else patch({ coverUrl: data.path });
  };

  const submit = async () => {
    if (!validateStep() || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const body = await withCaptchaBody(
        {
          language: draft.language,
          firstName: draft.firstName,
          lastName: draft.lastName,
          preferredName: draft.preferredName || null,
          dob: draft.dob,
          gender: draft.gender,
          religion: draft.religion || null,
          occupationStatus: draft.occupationStatus,
          education: draft.education,
          occupation: draft.occupation,
          location: draft.location,
          email: draft.email || null,
          phoneNational: draft.phoneNational || null,
          phoneChallengeId: draft.phoneChallengeId || null,
          emailChallengeId: draft.emailChallengeId || null,
          oauthSetup: Boolean(oauthPrefill),
          username: draft.username,
          interestSlugs: draft.interestSlugs,
          password: draft.password,
          avatarUrl: draft.avatarUrl || null,
          coverUrl: draft.coverUrl || null,
          acceptedTerms: draft.acceptedTerms,
          acceptedPrivacy: draft.acceptedPrivacy,
          acceptedGuidelines: draft.acceptedGuidelines,
          consentPersonalizedRecs: draft.consentPersonalizedRecs,
          consentPersonalizedAds: draft.consentPersonalizedAds,
          consentMarketing: draft.consentMarketing,
          referralCode: draft.referralCode || undefined,
        },
        { action: 'register', turnstileToken: captchaToken },
      );
      const res = await fetch('/api/registration/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setCaptchaToken(null);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      if (data.status === 'pending') {
        toast.success(data.message || t('reg.pending'));
        try {
          sessionStorage.removeItem(REG_DRAFT_KEY);
        } catch {
          /* ignore */
        }
        onCancel();
        return;
      }
      const passwordForConfirm = draft.password;
      try {
        sessionStorage.removeItem(REG_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setDraft(emptyRegistrationDraft(draft.language));
      setDone({
        username: data.username || data.user?.username,
        password: passwordForConfirm,
        token: data.token,
        user: data.user,
      });
    } catch (err: any) {
      toast.error(err.message || t('reg.err.create'));
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  const filteredCountries = REGISTRATION_COUNTRIES.filter((c) => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phoneCode.includes(q);
  });

  const filteredInterests = interests.filter((i) => {
    const q = interestQuery.trim().toLowerCase();
    if (!q) return true;
    return i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q);
  });

  if (done) {
    return (
      <div className="space-y-5 px-0.5" role="status">
        <h2 className="text-2xl font-black tracking-tight">{t('reg.welcomeTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('reg.welcomeBody')}</p>
        <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('reg.yourUsername')}</p>
            <p className="text-lg font-bold">@{done.username}</p>
            <button
              type="button"
              className="mt-1 text-xs font-semibold text-primary"
              onClick={() => navigator.clipboard?.writeText(`@${done.username}`).then(() => toast.success(t('reg.copied')))}
            >
              {t('reg.copyUsername')}
            </button>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('reg.yourPassword')}</p>
            <p className="font-mono text-lg tracking-widest">{showDonePassword ? done.password : '••••••••'}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <button type="button" className="text-xs font-semibold text-primary" onClick={() => setShowDonePassword((v) => !v)}>
                {showDonePassword ? t('reg.hidePassword') : t('reg.showPassword')}
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-primary"
                onClick={() => navigator.clipboard?.writeText(done.password).then(() => toast.success(t('reg.copied')))}
              >
                {t('reg.copyPassword')}
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t('reg.keepPrivate')}</p>
          </div>
        </div>
        <button
          type="button"
          className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          onClick={() => {
            onSuccess({
              token: done.token,
              user: done.user,
              username: done.username,
              passwordForConfirm: done.password,
            });
          }}
        >
          {t('reg.completeEnter')}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-reg">
      <div className="auth-reg-header">
        <div className="auth-reg-header-row">
          <div>
            <p className="auth-reg-step">
              {t('reg.stepOf', { current: visibleStepIndex + 1, total: visibleSteps.length })}
            </p>
            <h2 className="auth-reg-step-title">
              {stepId === 'contact_verify'
                ? verifyChannel === 'email'
                  ? t('reg.step.email_otp')
                  : t('reg.step.phone_otp')
                : t(`reg.step.${stepId}`)}
            </h2>
          </div>
          <button type="button" onClick={onCancel} className="auth-reg-signin-link">
            {t('reg.haveAccount')}
          </button>
        </div>
        <div className="auth-reg-progress" aria-hidden>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="auth-reg-body">
      {stepId === 'name_age' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('reg.firstName')} error={errors.firstName}>
              <input className={inputClass} value={draft.firstName} onChange={(e) => patch({ firstName: e.target.value })} autoComplete="given-name" required />
            </Field>
            <Field label={t('reg.lastName')} error={errors.lastName}>
              <input className={inputClass} value={draft.lastName} onChange={(e) => patch({ lastName: e.target.value })} autoComplete="family-name" required />
            </Field>
          </div>
          <Field label={t('reg.preferredName')} hint={t('reg.optional')}>
            <input className={inputClass} value={draft.preferredName} onChange={(e) => patch({ preferredName: e.target.value })} autoComplete="nickname" />
          </Field>
          <GenderField
            label={t('reg.gender')}
            placeholder={t('reg.err.gender')}
            value={draft.gender}
            error={errors.gender}
            options={GENDER_OPTIONS.map((g) => ({ value: g, label: t(`reg.gender.${g}`) }))}
            onChange={(gender) => {
              patch({ gender });
              setErrors((e) => ({ ...e, gender: '' }));
            }}
          />
          <Field label={t('reg.dob')} error={errors.dob}>
            <input className={inputClass} type="date" value={draft.dob} onChange={(e) => patch({ dob: e.target.value })} required />
          </Field>
          {age !== null && (
            <p className="text-xs text-muted-foreground">
              {t('reg.calculatedAge')}: <strong>{age}</strong>
            </p>
          )}
          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t('reg.religion')} <span className="font-normal normal-case">({t('reg.optional')})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {RELIGION_OPTIONS.map((r) => (
                <ChoiceChip key={r} active={draft.religion === r} onClick={() => patch({ religion: r })} label={t(`reg.religion.${r}`)} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{t('reg.religionPrivate')}</p>
          </fieldset>
        </div>
      )}

      {stepId === 'education_occupation' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t('reg.whatDescribes')}</p>
            <div className="flex flex-wrap gap-2">
              {OCCUPATION_STATUS_OPTIONS.map((o) => (
                <ChoiceChip key={o} active={draft.occupationStatus === o} onClick={() => patch({ occupationStatus: o })} label={t(`reg.occ.${o}`)} />
              ))}
            </div>
            {errors.occupationStatus && <p className="text-xs text-destructive">{errors.occupationStatus}</p>}

            {draft.occupationStatus === 'student' && (
            <div className="auth-reg-sub rounded-2xl border border-border p-3">
              <Field label={t('reg.school')}>
                <input className={inputClass} value={draft.education.school} onChange={(e) => patch({ education: { ...draft.education, school: e.target.value } })} />
              </Field>
              <Field label={t('reg.department')}>
                <input className={inputClass} value={draft.education.field} onChange={(e) => patch({ education: { ...draft.education, field: e.target.value } })} />
              </Field>
              <Field label={t('reg.level')}>
                <input className={inputClass} value={draft.education.level} onChange={(e) => patch({ education: { ...draft.education, level: e.target.value } })} />
              </Field>
              <Field label={t('reg.gradYear')}>
                <input className={inputClass} inputMode="numeric" value={draft.education.gradYear} onChange={(e) => patch({ education: { ...draft.education, gradYear: e.target.value } })} />
              </Field>
            </div>
          )}

          {['employed', 'professional', 'teacher'].includes(draft.occupationStatus) && (
            <div className="auth-reg-sub rounded-2xl border border-border p-3">
              <Field label={t('reg.profession')}>
                <input className={inputClass} value={draft.occupation.profession} onChange={(e) => patch({ occupation: { ...draft.occupation, profession: e.target.value } })} />
              </Field>
              <Field label={t('reg.workplace')}>
                <input className={inputClass} value={draft.occupation.workplace} onChange={(e) => patch({ occupation: { ...draft.occupation, workplace: e.target.value } })} />
              </Field>
              <Field label={t('reg.jobTitle')}>
                <input className={inputClass} value={draft.occupation.title} onChange={(e) => patch({ occupation: { ...draft.occupation, title: e.target.value } })} />
              </Field>
            </div>
          )}

          {draft.occupationStatus === 'business_owner' && (
            <div className="auth-reg-sub rounded-2xl border border-border p-3">
              <Field label={t('reg.businessName')}>
                <input className={inputClass} value={draft.occupation.businessName} onChange={(e) => patch({ occupation: { ...draft.occupation, businessName: e.target.value } })} />
              </Field>
              <Field label={t('reg.businessType')}>
                <input className={inputClass} value={draft.occupation.businessType} onChange={(e) => patch({ occupation: { ...draft.occupation, businessType: e.target.value } })} />
              </Field>
            </div>
          )}

          {['freelancer', 'self_employed'].includes(draft.occupationStatus) && (
            <div className="auth-reg-sub rounded-2xl border border-border p-3">
              <Field label={t('reg.profession')}>
                <input className={inputClass} value={draft.occupation.profession} onChange={(e) => patch({ occupation: { ...draft.occupation, profession: e.target.value } })} />
              </Field>
              <Field label={t('reg.skill')}>
                <input className={inputClass} value={draft.occupation.skill} onChange={(e) => patch({ occupation: { ...draft.occupation, skill: e.target.value } })} />
              </Field>
              <Field label={t('reg.workCategory')}>
                <input className={inputClass} value={draft.occupation.workCategory} onChange={(e) => patch({ occupation: { ...draft.occupation, workCategory: e.target.value } })} />
              </Field>
            </div>
          )}
          </div>
        </div>
      )}

      {stepId === 'location' && (
<div className="auth-reg-loc">
<div className="auth-reg-loc-top">
<div className="auth-reg-col">
<p className="text-sm font-semibold">{t('reg.country')}</p>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputClass} auth-input--prefix`}
                placeholder={t('reg.searchCountry')}
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
              />
            </div>
          <div className="auth-reg-country-list max-h-40 space-y-1 overflow-y-auto rounded-2xl border border-border p-2" role="listbox" aria-label={t('reg.country')}>
            {filteredCountries.map((c) => (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={draft.location.countryCode === c.code}
                className={`flex w-full min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm ${
                  draft.location.countryCode === c.code ? 'bg-primary/10 font-semibold' : 'hover:bg-muted/40'
                }`}
                onClick={() => {
                  const changing = draft.location.countryCode && draft.location.countryCode !== c.code && draft.phoneNational;
                  if (changing && !window.confirm(t('reg.countryChangeWarn'))) return;
                  patch({
                    location: {
                      ...draft.location,
                      countryCode: c.code,
                      countryName: c.name,
                      phoneCode: c.phoneCode,
                      countryId: '',
                      divisionId: '',
                      districtId: '',
                      regionName: '',
                      districtName: '',
                    },
                    phoneVerified: false,
                  });
                  fetch(`/api/countries?search=${encodeURIComponent(c.name)}`)
                    .then((r) => r.json())
                    .then((d) => {
                      const match = (d.countries || []).find((row: any) => String(row.code || row.iso_code || '').toUpperCase() === c.code);
                      if (match) {
                        setDraft((prev) => ({
                          ...prev,
                          location: { ...prev.location, countryId: match.id },
                        }));
                      }
                    })
                    .catch(() => {});
                }}
              >
                <CountryFlag code={c.code} name={c.name} />
                <span className="flex-1">{c.name}</span>
              </button>
            ))}
          </div>
          {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
</div>
</div>
<div className="auth-reg-grid">

          {divisions.length > 0 && (
            <Field label={countryMeta.regionLabel}>
              <select
                className={inputClass}
                value={draft.location.divisionId}
                onChange={(e) => {
                  const row = divisions.find((d) => d.id === e.target.value);
                  patch({
                    location: {
                      ...draft.location,
                      divisionId: e.target.value,
                      regionName: row?.name || '',
                      districtId: '',
                      districtName: '',
                    },
                  });
                }}
              >
                <option value="">{t('reg.select')}</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {divisions.length === 0 && (
            <Field label={countryMeta.regionLabel}>
              <input
                className={inputClass}
                value={draft.location.regionName}
                onChange={(e) => patch({ location: { ...draft.location, regionName: e.target.value } })}
              />
            </Field>
          )}

          {districts.length > 0 ? (
            <Field label={countryMeta.districtLabel}>
              <select
                className={inputClass}
                value={draft.location.districtId}
                onChange={(e) => {
                  const row = districts.find((d) => d.id === e.target.value);
                  patch({ location: { ...draft.location, districtId: e.target.value, districtName: row?.name || '' } });
                }}
              >
                <option value="">{t('reg.select')}</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label={countryMeta.districtLabel}>
              <input
                className={inputClass}
                value={draft.location.districtName}
                onChange={(e) => patch({ location: { ...draft.location, districtName: e.target.value } })}
              />
            </Field>
          )}

          <Field label={countryMeta.cityLabel}>
            <input className={inputClass} value={draft.location.cityName} onChange={(e) => patch({ location: { ...draft.location, cityName: e.target.value } })} />
          </Field>
          <Field label={t('reg.hometown')} hint={t('reg.optional')}>
            <input className={inputClass} value={draft.location.hometown} onChange={(e) => patch({ location: { ...draft.location, hometown: e.target.value } })} />
          </Field>
          </div>
        </div>
      )}

      {stepId === 'contact_username' && (
        <div className="space-y-3">
          <Field label={t('reg.countryCallingCode')} hint={t('reg.optional')}>
            <select
              className={inputClass}
              value={draft.location.countryCode || 'BD'}
              onChange={(e) => {
                const c = countryByCode(e.target.value) || REGISTRATION_COUNTRIES[0];
                resetOtpUi();
                patch({
                  location: {
                    ...draft.location,
                    countryCode: c.code,
                    countryName: c.name,
                    phoneCode: c.phoneCode,
                  },
                  phoneVerified: false,
                  phoneChallengeId: '',
                });
              }}
            >
              {REGISTRATION_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name} ({c.phoneCode})
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('reg.phone')} hint={t('reg.atLeastOne')} error={errors.phone || errors.contact}>
            <div className="flex gap-2">
              <span className="inline-flex min-h-11 items-center rounded-xl border border-border bg-muted/40 px-3 text-sm font-semibold">{draft.location.phoneCode}</span>
              <input
                className={`${inputClass} flex-1`}
                type="tel"
                inputMode="tel"
                value={draft.phoneNational}
                onChange={(e) => {
                  resetOtpUi();
                  setVerifyChannel(null);
                  patch({
                    phoneNational: e.target.value.replace(/\D/g, ''),
                    phoneVerified: false,
                    phoneChallengeId: '',
                  });
                }}
                placeholder="1XXXXXXXXX"
              />
              {draft.phoneVerified ? (
                <span className="inline-flex min-h-11 items-center rounded-xl bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {t('reg.otp.verifiedShort')}
                </span>
              ) : hasPhone ? (
                <button
                  type="button"
                  onClick={() => startVerify('phone')}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  {t('reg.otp.verifyBtn')}
                </button>
              ) : null}
            </div>
          </Field>

          <Field label={t('Email')} error={errors.email}>
            <div className="flex gap-2">
              <input
                className={`${inputClass} flex-1`}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={draft.email}
                onChange={(e) => {
                  resetOtpUi();
                  setVerifyChannel(null);
                  patch({
                    email: e.target.value,
                    emailVerified: false,
                    emailChallengeId: '',
                  });
                }}
              />
              {draft.emailVerified ? (
                <span className="inline-flex min-h-11 items-center rounded-xl bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {t('reg.otp.verifiedShort')}
                </span>
              ) : hasEmail ? (
                <button
                  type="button"
                  onClick={() => startVerify('email')}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  {t('reg.otp.verifyBtn')}
                </button>
              ) : null}
            </div>
          </Field>

          <Field label={t('reg.username')} error={errors.username}>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 select-none text-muted-foreground">@</span>
              <input
                className={`${inputClass} auth-input--prefix`}
                value={draft.username}
                onChange={(e) => {
                  setUsernameTouched(true);
                  patch({ username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') });
                }}
                autoComplete="username"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {usernameStatus === 'checking' && t('reg.usernameChecking')}
              {usernameStatus === 'available' && t('reg.usernameAvailable')}
              {usernameStatus === 'taken' && t('reg.usernameTaken')}
              {usernameStatus === 'invalid' && t('reg.usernameInvalid')}
              {usernameStatus === 'reserved' && t('reg.usernameReserved')}
            </p>
            {usernameSuggestions.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {usernameSuggestions.map((s) => (
                  <button key={s} type="button" className="rounded-lg bg-muted px-2 py-1 text-[11px] font-semibold" onClick={() => { setUsernameTouched(true); patch({ username: s }); }}>
                    @{s}
                  </button>
                ))}
              </div>
            )}
          </Field>
        </div>
      )}

      {stepId === 'contact_verify' && !verifyChannel ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('reg.otp.pickFromContact')}</p>
          <button type="button" className="auth-reg-btn auth-reg-btn--primary" onClick={returnToContact}>
            {t('reg.back')}
          </button>
        </div>
      ) : null}

      {stepId === 'contact_verify' && verifyChannel && (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {verifyChannel === 'email'
              ? t('reg.otp.introEmail', { email: draft.email })
              : t('reg.otp.intro', { phone: `${draft.location.phoneCode} ${draft.phoneNational}`.trim() })}
          </p>
          {otpError ? (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500" role="alert">
              {otpError}
            </p>
          ) : null}
          {otpDevCode ? (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              {t('reg.otp.devCode')}: <b className="font-mono tracking-widest">{otpDevCode}</b>
            </p>
          ) : null}

          {verifyChannel === 'email' ? (
            <div className="space-y-3">
              {emailOtpHint ? <p className="text-xs font-medium text-primary">{emailOtpHint}</p> : null}
              <OtpDigitBoxes
                label={t('reg.otp.codeLabel')}
                value={emailOtpCode}
                onChange={(next) => {
                  setEmailOtpCode(next);
                  setOtpError('');
                }}
                autoFocus
              />
              <button
                type="button"
                disabled={otpSending || otpCooldownLeft > 0 || otpConfirming}
                onClick={() => void requestEmailOtp()}
                className="text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpSending
                  ? t('reg.otp.sending')
                  : otpCooldownLeft > 0
                    ? t('reg.otp.resendIn', { seconds: otpCooldownLeft })
                    : t('reg.otp.resend')}
              </button>
            </div>
          ) : null}

          {verifyChannel === 'phone' ? (
            <div className="space-y-3">
              {otpSmsAvailable === false ? (
                <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  {t('reg.otp.smsUnavailable')}
                </p>
              ) : null}
              {phoneOtpHint ? <p className="text-xs font-medium text-primary">{phoneOtpHint}</p> : null}
              <OtpDigitBoxes
                label={t('reg.otp.codeLabel')}
                value={phoneOtpCode}
                onChange={(next) => {
                  setPhoneOtpCode(next);
                  setOtpError('');
                }}
                autoFocus
              />
              <button
                type="button"
                disabled={otpSending || otpCooldownLeft > 0 || otpConfirming}
                onClick={() => void requestPhoneOtp()}
                className="text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpSending
                  ? t('reg.otp.sending')
                  : otpCooldownLeft > 0
                    ? t('reg.otp.resendIn', { seconds: otpCooldownLeft })
                    : t('reg.otp.resend')}
              </button>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">{t('reg.otp.expires')}</p>
        </div>
      )}

      {stepId === 'interests' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground" />
            <input className={`${inputClass} auth-input--prefix`} value={interestQuery} onChange={(e) => setInterestQuery(e.target.value)} placeholder={t('reg.searchInterests')} />
          </div>
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
            {filteredInterests.map((i) => {
              const active = draft.interestSlugs.includes(i.slug);
              return (
                <ChoiceChip
                  key={i.slug}
                  active={active}
                  label={i.name}
                  onClick={() =>
                    patch({
                      interestSlugs: active ? draft.interestSlugs.filter((s) => s !== i.slug) : [...draft.interestSlugs, i.slug],
                    })
                  }
                />
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">{t('reg.interestsOptional')}</p>
        </div>
      )}

      {stepId === 'password' && (
        <div className="space-y-3">
          <Field label={t('Password')} error={errors.password}>
            <div className="relative">
              <input
                className={`${inputClass} pr-10`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={draft.password}
                onChange={(e) => patch({ password: e.target.value })}
                maxLength={PASSWORD_MAX_LEN}
              />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground" onClick={() => setShowPassword((v) => !v)} aria-label="Toggle password">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <StrengthBar value={passwordStrength(draft.password)} labels={{ weak: t('reg.strength.weak'), fair: t('reg.strength.fair'), good: t('reg.strength.good'), strong: t('reg.strength.strong') }} />
          <Field label={t('reg.confirmPassword')} error={errors.confirmPassword}>
            <input
              className={inputClass}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={draft.confirmPassword}
              onChange={(e) => patch({ confirmPassword: e.target.value })}
              maxLength={PASSWORD_MAX_LEN}
            />
          </Field>
        </div>
      )}

      {stepId === 'photos' && (
        <div className="auth-reg-photos">
          <PhotoPicker
            label={t('reg.profilePhoto')}
            url={draft.avatarUrl}
            onPick={(f) => uploadPhoto(f, 'avatar').catch((e) => toast.error(e.message))}
            onClear={() => patch({ avatarUrl: '' })}
          />
          <PhotoPicker
            label={t('reg.coverPhoto')}
            url={draft.coverUrl}
            onPick={(f) => uploadPhoto(f, 'cover').catch((e) => toast.error(e.message))}
            onClear={() => patch({ coverUrl: '' })}
            wide
          />
          <p className="text-xs text-muted-foreground">{t('reg.photosOptional')}</p>
        </div>
      )}

      {stepId === 'review' && (
        <div className="auth-reg-review text-sm">
          <ReviewBlock title={t('reg.section.personal')} onEdit={() => goToStep('name_age')}>
            <Row k={t('reg.firstName')} v={draft.firstName} />
            <Row k={t('reg.lastName')} v={draft.lastName} />
            {draft.preferredName && <Row k={t('reg.preferredName')} v={draft.preferredName} />}
            <Row k={t('reg.dob')} v={draft.dob} />
            {age !== null && <Row k={t('reg.calculatedAge')} v={String(age)} />}
            <Row k={t('reg.gender')} v={t(`reg.gender.${draft.gender}`)} />
          </ReviewBlock>
          <ReviewBlock title={t('reg.section.work')} onEdit={() => goToStep('education_occupation')}>
            <Row k={t('reg.status')} v={t(`reg.occ.${draft.occupationStatus}`)} />
            {draft.education.school && <Row k={t('reg.school')} v={draft.education.school} />}
            {draft.occupation.profession && <Row k={t('reg.profession')} v={draft.occupation.profession} />}
            {draft.occupation.workplace && <Row k={t('reg.workplace')} v={draft.occupation.workplace} />}
            {draft.occupation.title && <Row k={t('reg.jobTitle')} v={draft.occupation.title} />}
            {draft.occupation.businessName && <Row k={t('reg.businessName')} v={draft.occupation.businessName} />}
          </ReviewBlock>
          <ReviewBlock title={t('reg.section.location')} onEdit={() => goToStep('location')}>
            <Row k={t('reg.country')} v={`${countryMeta.flag} ${draft.location.countryName || draft.location.countryCode}`} />
            {draft.religion && draft.religion !== 'prefer_not_to_say' && <Row k={t('reg.religion')} v={t(`reg.religion.${draft.religion}`)} />}
            {draft.location.regionName && <Row k={countryMeta.regionLabel} v={draft.location.regionName} />}
            {draft.location.districtName && <Row k={countryMeta.districtLabel} v={draft.location.districtName} />}
            {draft.location.cityName && <Row k={countryMeta.cityLabel} v={draft.location.cityName} />}
            {draft.location.hometown && <Row k={t('reg.hometown')} v={draft.location.hometown} />}
          </ReviewBlock>
          <ReviewBlock title={t('reg.section.contact')} onEdit={() => goToStep('contact_username')}>
            {draft.phoneNational && <Row k={t('reg.phone')} v={`${draft.location.phoneCode} ${draft.phoneNational}`} />}
            {draft.email && <Row k={t('Email')} v={draft.email} />}
            <Row k={t('reg.username')} v={`@${draft.username}`} />
          </ReviewBlock>
          <ReviewBlock title={t('reg.section.account')} onEdit={() => goToStep('password')}>
            <Row k={t('Password')} v="••••••••" />
          </ReviewBlock>
          <ReviewBlock title={t('reg.section.profile')} onEdit={() => goToStep('photos')}>
            <Row k={t('reg.profilePhoto')} v={draft.avatarUrl ? t('reg.uploaded') : t('reg.skipped')} />
            <Row k={t('reg.coverPhoto')} v={draft.coverUrl ? t('reg.uploaded') : t('reg.skipped')} />
          </ReviewBlock>

          <div><label className="flex items-start gap-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={draft.acceptedTerms} onChange={(e) => patch({ acceptedTerms: e.target.checked })} />
            <span>{t('reg.acceptTerms')}</span>
          </label>
          {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}</div>
          <div><label className="flex items-start gap-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={draft.acceptedPrivacy} onChange={(e) => patch({ acceptedPrivacy: e.target.checked })} />
            <span>{t('reg.acceptPrivacy')}</span>
          </label>
          {errors.privacy && <p className="text-xs text-destructive">{errors.privacy}</p>}</div>
          <div><label className="flex items-start gap-2 text-xs">
            <input type="checkbox" className="mt-0.5" checked={draft.acceptedGuidelines} onChange={(e) => patch({ acceptedGuidelines: e.target.checked })} />
            <span>{t('reg.acceptGuidelines')}</span>
          </label>
          {errors.guidelines && <p className="text-xs text-destructive">{errors.guidelines}</p>}</div>
          <p className="text-[11px] text-muted-foreground">
            Read the{' '}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">
              Privacy Policy
            </a>
            .
          </p>

          <div><label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={draft.consentPersonalizedRecs} onChange={(e) => patch({ consentPersonalizedRecs: e.target.checked })} />
            <span>{t('reg.consentRecs')}</span>
          </label></div>
          <div><label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={draft.consentPersonalizedAds} onChange={(e) => patch({ consentPersonalizedAds: e.target.checked })} />
            <span>{t('reg.consentAds')}</span>
          </label></div>
          <div><label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" className="mt-0.5" checked={draft.consentMarketing} onChange={(e) => patch({ consentMarketing: e.target.checked })} />
            <span>{t('reg.consentMarketing')}</span>
          </label></div>
        </div>
      )}

      </div>

      {stepId === 'review' && (
        <CaptchaField action="register" token={captchaToken} onToken={setCaptchaToken} />
      )}

      <div className="auth-reg-actions">
        {step > 0 ? (
          <button type="button" onClick={goBack} className="auth-reg-btn">
            <ArrowLeft size={16} /> {t('reg.back')}
          </button>
        ) : (
          <button type="button" onClick={onCancel} className="auth-reg-btn">
            {t('reg.back')}
          </button>
        )}
        {(stepId === 'photos' || stepId === 'interests' || stepId === 'education_occupation') && (
          <button
            type="button"
            onClick={() => {
              if (stepId === 'education_occupation' && !draft.occupationStatus) {
                patch({ occupationStatus: 'other' });
              }
              setStep((s) => nextStepIndex(s, 1));
            }}
            className="auth-reg-btn auth-reg-btn--ghost"
          >
            {t('reg.skipForNow')}
          </button>
        )}
        {stepId === 'contact_verify' && (
          <button
            type="button"
            onClick={skipContactVerify}
            className="auth-reg-btn auth-reg-btn--ghost min-h-11"
            disabled={otpConfirming}
          >
            {t('reg.otp.skip')}
          </button>
        )}
        {stepId !== 'review' ? (
          <button
            type="button"
            onClick={() => void goNext()}
            className="auth-reg-btn auth-reg-btn--primary min-h-11"
            disabled={otpConfirming}
          >
            {stepId === 'contact_verify'
              ? (otpConfirming ? t('reg.otp.verifying') : t('reg.otp.verifyContinue'))
              : (<>{t('reg.continue')} <ArrowRight size={16} /></>)}
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="auth-reg-btn auth-reg-btn--primary"
          >
            {submitting ? t('reg.creating') : t('reg.createAccount')}
          </button>
        )}
      </div>
    </div>
  );
}

const inputClass = 'auth-input';

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="auth-input-label">
        {label}
        {hint ? <span className="ml-1 font-normal opacity-80">({hint})</span> : null}
      </span>
      {children}
      {error ? <span className="auth-input-error">{error}</span> : null}
    </label>
  );
}

function GenderField({
  label,
  placeholder,
  value,
  error,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <span className="auth-input-label" id="reg-gender-label">{label}</span>
      <button
        type="button"
        className="auth-input flex w-full items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="reg-gender-label"
        aria-invalid={error ? true : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? 'text-[var(--auth-input-fg)]' : 'text-[var(--auth-placeholder)]'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-[var(--auth-fg-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-labelledby="reg-gender-label"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-[var(--auth-input-border)] bg-[var(--auth-card-bg,#fff)] py-1 shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={`flex w-full px-3 py-2.5 text-left text-sm ${
                value === option.value ? 'bg-primary/10 font-semibold text-primary' : 'text-[var(--auth-fg)] hover:bg-black/[0.04]'
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {error ? <span className="auth-input-error">{error}</span> : null}
    </div>
  );
}

function ChoiceChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`auth-choice-chip ${active ? 'is-active' : ''}`}
    >
      {label}
    </button>
  );
}

function StrengthBar({
  value,
  labels,
}: {
  value: 'weak' | 'fair' | 'good' | 'strong';
  labels: Record<string, string>;
}) {
  const map = { weak: 1, fair: 2, good: 3, strong: 4 } as const;
  const n = map[value];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= n ? 'bg-primary' : 'bg-border'}`} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{labels[value]}</p>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-wide">{title}</h3>
        <button type="button" onClick={onEdit} className="text-[11px] font-bold text-primary">
          Edit
        </button>
      </div>
      <dl className="space-y-1">{children}</dl>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold text-right">{v}</dd>
    </div>
  );
}

function CountryFlag({ code }: { code: string; name: string }) {
  const iso = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/24x18/${iso}.png`}
      srcSet={`https://flagcdn.com/48x36/${iso}.png 2x`}
      width={24}
      height={18}
      alt=""
      aria-hidden="true"
      className="h-[18px] w-6 shrink-0 rounded-[3px] border border-border/50 object-cover"
      loading="lazy"
    />
  );
}

function PhotoPicker({
  label,
  url,
  onPick,
  onClear,
  wide,
}: {
  label: string;
  url: string;
  onPick: (f: File) => void;
  onClear: () => void;
  wide?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <div className={`overflow-hidden rounded-2xl border border-dashed border-border bg-muted/20 ${wide ? 'aspect-[16/6]' : 'aspect-square max-w-[9rem]'}`}>
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">—</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-xl border border-border px-3 py-2 text-xs font-bold">
          Upload
          <input
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPick(f);
              e.target.value = '';
            }}
          />
        </label>
        {url && (
          <button type="button" className="rounded-xl px-3 py-2 text-xs font-bold text-destructive" onClick={onClear}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
