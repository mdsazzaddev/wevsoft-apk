export type RegistrationDraft = {
  language: string;
  firstName: string;
  lastName: string;
  preferredName: string;
  dob: string;
  gender: string;
  religion: string;
  occupationStatus: string;
  education: {
    school: string;
    degree: string;
    field: string;
    level: string;
    academicYear: string;
    gradYear: string;
  };
  occupation: {
    profession: string;
    workplace: string;
    title: string;
    businessName: string;
    businessType: string;
    skill: string;
    workCategory: string;
  };
  location: {
    countryCode: string;
    countryName: string;
    countryId: string;
    divisionId: string;
    districtId: string;
    regionName: string;
    districtName: string;
    cityName: string;
    hometown: string;
    phoneCode: string;
  };
  email: string;
  phoneNational: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  /** Set after OTP confirm — used on final create so stale client flags cannot bypass server checks. */
  emailChallengeId: string;
  phoneChallengeId: string;
  username: string;
  interestSlugs: string[];
  /** Password stays in memory only — never written to storage. */
  password: string;
  confirmPassword: string;
  avatarUrl: string;
  coverUrl: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedGuidelines: boolean;
  consentPersonalizedRecs: boolean;
  consentPersonalizedAds: boolean;
  consentMarketing: boolean;
  referralCode: string;
  oauthProvider: string;
  oauthProviderId: string;
  oauthTrustedEmail: string;
};

export function emptyRegistrationDraft(language = 'en'): RegistrationDraft {
  return {
    language,
    firstName: '',
    lastName: '',
    preferredName: '',
    dob: '',
    gender: '',
    religion: 'prefer_not_to_say',
    occupationStatus: '',
    education: {
      school: '',
      degree: '',
      field: '',
      level: '',
      academicYear: '',
      gradYear: '',
    },
    occupation: {
      profession: '',
      workplace: '',
      title: '',
      businessName: '',
      businessType: '',
      skill: '',
      workCategory: '',
    },
    location: {
      countryCode: 'BD',
      countryName: 'Bangladesh',
      countryId: '',
      divisionId: '',
      districtId: '',
      regionName: '',
      districtName: '',
      cityName: '',
      hometown: '',
      phoneCode: '+880',
    },
    email: '',
    phoneNational: '',
    emailVerified: false,
    phoneVerified: false,
    emailChallengeId: '',
    phoneChallengeId: '',
    username: '',
    interestSlugs: [],
    password: '',
    confirmPassword: '',
    avatarUrl: '',
    coverUrl: '',
    acceptedTerms: false,
    acceptedPrivacy: false,
    acceptedGuidelines: false,
    consentPersonalizedRecs: false,
    consentPersonalizedAds: false,
    consentMarketing: false,
    referralCode: '',
    oauthProvider: '',
    oauthProviderId: '',
    oauthTrustedEmail: '',
  };
}

/** Persist non-sensitive draft fields only. */
export function draftToStorage(draft: RegistrationDraft): string {
  const { password: _p, confirmPassword: _c, ...safe } = draft;
  return JSON.stringify(safe);
}

export function draftFromStorage(raw: string | null, language = 'en'): RegistrationDraft {
  const base = emptyRegistrationDraft(language);
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      education: { ...base.education, ...(parsed.education || {}) },
      occupation: { ...base.occupation, ...(parsed.occupation || {}) },
      location: { ...base.location, ...(parsed.location || {}) },
      password: '',
      confirmPassword: '',
    };
  } catch {
    return base;
  }
}

export const REG_DRAFT_KEY = 'wev_reg_draft_v1';
