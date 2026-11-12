/**
 * Shared WevSpace main-user registration constants & pure validators.
 * No Prisma / React — safe for client and server (import with .js from server).
 */

/**
 * Signup order: identity → contact → password → soft profile → review.
 * `contact_verify` is a side-trip from Contact “Verify” (per email/phone), not linear.
 */
export const REGISTRATION_STEPS = [
  'name_age',
  'contact_username',
  'password',
  'contact_verify',
  'location',
  'education_occupation',
  'interests',
  'photos',
  'review',
] as const;

export type RegistrationStepId = (typeof REGISTRATION_STEPS)[number];

export const REGISTRATION_STEP_COUNT = REGISTRATION_STEPS.length;

/** Configurable minimum age (years). Override via REGISTRATION_MIN_AGE on server. */
export const DEFAULT_REGISTRATION_MIN_AGE = 13;

export const PASSWORD_MIN_LEN = 6;
export const PASSWORD_MAX_LEN = 64;

export const NAME_MAX_LEN = 80;
export const PREFERRED_NAME_MAX_LEN = 80;

export const GENDER_OPTIONS = [
  'male',
  'female',
  'non_binary',
  'other',
  'prefer_not_to_say',
] as const;

export type GenderOption = (typeof GENDER_OPTIONS)[number];

export const RELIGION_OPTIONS = [
  'islam',
  'hinduism',
  'christianity',
  'buddhism',
  'judaism',
  'other',
  'prefer_not_to_say',
] as const;

export type ReligionOption = (typeof RELIGION_OPTIONS)[number];

export const OCCUPATION_STATUS_OPTIONS = [
  'student',
  'employed',
  'business_owner',
  'freelancer',
  'self_employed',
  'teacher',
  'professional',
  'unemployed',
  'retired',
  'other',
] as const;

export type OccupationStatus = (typeof OCCUPATION_STATUS_OPTIONS)[number];

export const COMMON_PASSWORDS = new Set(
  [
    'password',
    'password1',
    '123456',
    '12345678',
    '123456789',
    'qwerty',
    'abc123',
    '111111',
    '123123',
    'admin',
    'letmein',
    'welcome',
    'wevsoft',
    'wevspace',
  ].map((s) => s.toLowerCase()),
);

/** Explicit interest catalog seed (slug → display). Seeded into Interest table on first use. */
export const INTEREST_CATALOG: Array<{
  slug: string;
  name: string;
  category: string;
  sortOrder: number;
}> = [
  { slug: 'technology', name: 'Technology', category: 'tech', sortOrder: 1 },
  { slug: 'programming', name: 'Programming', category: 'tech', sortOrder: 2 },
  { slug: 'gaming', name: 'Gaming', category: 'entertainment', sortOrder: 3 },
  { slug: 'sports', name: 'Sports', category: 'sports', sortOrder: 4 },
  { slug: 'football', name: 'Football', category: 'sports', sortOrder: 5 },
  { slug: 'cricket', name: 'Cricket', category: 'sports', sortOrder: 6 },
  { slug: 'music', name: 'Music', category: 'entertainment', sortOrder: 7 },
  { slug: 'movies', name: 'Movies', category: 'entertainment', sortOrder: 8 },
  { slug: 'education', name: 'Education', category: 'learning', sortOrder: 9 },
  { slug: 'business', name: 'Business', category: 'career', sortOrder: 10 },
  { slug: 'travel', name: 'Travel', category: 'lifestyle', sortOrder: 11 },
  { slug: 'photography', name: 'Photography', category: 'arts', sortOrder: 12 },
  { slug: 'fashion', name: 'Fashion', category: 'lifestyle', sortOrder: 13 },
  { slug: 'science', name: 'Science', category: 'learning', sortOrder: 14 },
  { slug: 'art', name: 'Art', category: 'arts', sortOrder: 15 },
  { slug: 'news', name: 'News', category: 'media', sortOrder: 16 },
  { slug: 'lifestyle', name: 'Lifestyle', category: 'lifestyle', sortOrder: 17 },
  { slug: 'food', name: 'Food', category: 'lifestyle', sortOrder: 18 },
  { slug: 'health', name: 'Health & Fitness', category: 'lifestyle', sortOrder: 19 },
  { slug: 'finance', name: 'Finance', category: 'career', sortOrder: 20 },
];

export type CallingCodeCountry = {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
  regionLabel: string;
  districtLabel: string;
  cityLabel: string;
};

/** Centralized country + calling-code config (UI + phone step). DB Country tree used when seeded. */
export const REGISTRATION_COUNTRIES: CallingCodeCountry[] = [
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', phoneCode: '+880', regionLabel: 'Division', districtLabel: 'District', cityLabel: 'City' },
  { code: 'IN', name: 'India', flag: '🇮🇳', phoneCode: '+91', regionLabel: 'State', districtLabel: 'District', cityLabel: 'City' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', phoneCode: '+92', regionLabel: 'Province', districtLabel: 'District', cityLabel: 'City' },
  { code: 'US', name: 'United States', flag: '🇺🇸', phoneCode: '+1', regionLabel: 'State', districtLabel: 'County', cityLabel: 'City' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44', regionLabel: 'Region', districtLabel: 'County', cityLabel: 'City' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', phoneCode: '+966', regionLabel: 'Province', districtLabel: 'Governorate', cityLabel: 'City' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', phoneCode: '+971', regionLabel: 'Emirate', districtLabel: 'Area', cityLabel: 'City' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', phoneCode: '+1', regionLabel: 'Province', districtLabel: 'Region', cityLabel: 'City' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', phoneCode: '+61', regionLabel: 'State', districtLabel: 'Region', cityLabel: 'City' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', phoneCode: '+49', regionLabel: 'State', districtLabel: 'District', cityLabel: 'City' },
  { code: 'FR', name: 'France', flag: '🇫🇷', phoneCode: '+33', regionLabel: 'Region', districtLabel: 'Department', cityLabel: 'City' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', phoneCode: '+34', regionLabel: 'Autonomous community', districtLabel: 'Province', cityLabel: 'City' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', phoneCode: '+39', regionLabel: 'Region', districtLabel: 'Province', cityLabel: 'City' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', phoneCode: '+81', regionLabel: 'Prefecture', districtLabel: 'District', cityLabel: 'City' },
  { code: 'CN', name: 'China', flag: '🇨🇳', phoneCode: '+86', regionLabel: 'Province', districtLabel: 'Prefecture', cityLabel: 'City' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', phoneCode: '+82', regionLabel: 'Province', districtLabel: 'District', cityLabel: 'City' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', phoneCode: '+60', regionLabel: 'State', districtLabel: 'District', cityLabel: 'City' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', phoneCode: '+65', regionLabel: 'Region', districtLabel: 'District', cityLabel: 'City' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', phoneCode: '+977', regionLabel: 'Province', districtLabel: 'District', cityLabel: 'City' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', phoneCode: '+94', regionLabel: 'Province', districtLabel: 'District', cityLabel: 'City' },
];

export function countryByCode(code: string): CallingCodeCountry | undefined {
  return REGISTRATION_COUNTRIES.find((c) => c.code === String(code || '').toUpperCase());
}

export function calcAgeFromDob(dob: Date | string, now = new Date()): number | null {
  const d = dob instanceof Date ? dob : new Date(dob);
  if (Number.isNaN(d.getTime()) || d.getTime() > now.getTime()) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function validateNamePart(raw: unknown, label: string, max = NAME_MAX_LEN): { ok: true; value: string } | { ok: false; error: string } {
  const value = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!value) return { ok: false, error: `${label} is required` };
  if (value.length > max) return { ok: false, error: `${label} is too long` };
  if (!/^[\p{L}\p{M}' .\-]+$/u.test(value)) return { ok: false, error: `${label} contains invalid characters` };
  return { ok: true, value };
}

export function validateDob(
  raw: unknown,
  minAge = DEFAULT_REGISTRATION_MIN_AGE,
  now = new Date(),
): { ok: true; dob: Date; age: number } | { ok: false; error: string } {
  const s = String(raw || '').trim();
  if (!s) return { ok: false, error: 'Date of birth is required' };
  const dob = new Date(s);
  if (Number.isNaN(dob.getTime())) return { ok: false, error: 'Enter a valid date of birth' };
  if (dob.getTime() > now.getTime()) return { ok: false, error: 'Date of birth cannot be in the future' };
  const age = calcAgeFromDob(dob, now);
  if (age === null) return { ok: false, error: 'Enter a valid date of birth' };
  if (age < minAge) return { ok: false, error: `You must be at least ${minAge} years old` };
  if (age > 120) return { ok: false, error: 'Enter a valid date of birth' };
  return { ok: true, dob, age };
}

export function validatePassword(raw: unknown): { ok: true; password: string } | { ok: false; error: string } {
  const password = String(raw || '');
  if (password.length < PASSWORD_MIN_LEN) {
    return { ok: false, error: `Password must be at least ${PASSWORD_MIN_LEN} characters` };
  }
  if (password.length > PASSWORD_MAX_LEN) {
    return { ok: false, error: `Password must be at most ${PASSWORD_MAX_LEN} characters` };
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, error: 'Choose a stronger password' };
  }
  return { ok: true, password };
}

export function passwordStrength(raw: string): 'weak' | 'fair' | 'good' | 'strong' {
  const p = String(raw || '');
  if (p.length < PASSWORD_MIN_LEN) return 'weak';
  let score = 0;
  if (p.length >= 8) score += 1;
  if (p.length >= 12) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;
  if (COMMON_PASSWORDS.has(p.toLowerCase())) return 'weak';
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'good';
  return 'strong';
}

export function normalizeEmail(raw: unknown): string {
  return String(raw || '').trim().toLowerCase();
}

export function isValidEmail(raw: unknown): boolean {
  const e = normalizeEmail(raw);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** Digits-only national number (no calling code). */
export function normalizeNationalPhone(raw: unknown): string {
  return String(raw || '').replace(/\D/g, '');
}

export function composeE164(phoneCode: string, national: string): string {
  const code = String(phoneCode || '').replace(/[^\d+]/g, '');
  const digits = normalizeNationalPhone(national);
  const cc = code.startsWith('+') ? code : `+${code}`;
  return `${cc}${digits}`;
}

export function validateContactPair(input: {
  email?: string | null;
  phoneNational?: string | null;
  phoneCode?: string | null;
}): { ok: true; email: string | null; phoneE164: string | null } | { ok: false; error: string } {
  const emailRaw = String(input.email || '').trim();
  const national = normalizeNationalPhone(input.phoneNational);
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (email && !isValidEmail(email)) return { ok: false, error: 'Enter a valid email address' };
  let phoneE164: string | null = null;
  if (national) {
    if (national.length < 6 || national.length > 15) {
      return { ok: false, error: 'Enter a valid phone number' };
    }
    phoneE164 = composeE164(input.phoneCode || '', national);
  }
  if (!email && !phoneE164) {
    return { ok: false, error: 'Provide at least a phone number or an email address' };
  }
  return { ok: true, email, phoneE164 };
}

export function fullNameFromParts(first: string, last: string, preferred?: string | null): string {
  const base = `${first} ${last}`.trim();
  return preferred && preferred.trim() ? preferred.trim() : base;
}

const USERNAME_SUGGEST_MIN = 3;
const USERNAME_SUGGEST_MAX = 30;

function usernameSlugPart(raw: unknown): string {
  return String(raw ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function usernameCandidate(raw: string): string {
  return raw.replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, USERNAME_SUGGEST_MAX);
}

/** Suggest a vanity username from registration name fields, e.g. "Sazzad Rahman" → "sazzad_rahman". */
export function suggestRegistrationUsername(parts: {
  firstName?: string;
  lastName?: string;
  preferredName?: string;
}): string {
  const first = usernameSlugPart(parts.firstName);
  const last = usernameSlugPart(parts.lastName);
  const preferred = usernameSlugPart(parts.preferredName);

  const join = (...bits: string[]) => {
    const handle = usernameCandidate(bits.filter(Boolean).join('_'));
    return handle.length >= USERNAME_SUGGEST_MIN ? handle : '';
  };

  const candidates = [
    join(first, last),
    first && last ? usernameCandidate(`${first}${last}`) : '',
    join(preferred),
    usernameCandidate(first),
    usernameCandidate(last),
  ].filter((c) => c.length >= USERNAME_SUGGEST_MIN);

  if (candidates.length > 0) return candidates[0];

  const seed = preferred || first || last || 'user';
  const padded = usernameCandidate(`${seed}01`);
  return padded.length >= USERNAME_SUGGEST_MIN ? padded : 'user01';
}
