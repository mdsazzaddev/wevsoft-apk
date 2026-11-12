/**
 * Post audience targeting (Facebook Graph `targeting` / `feed_targeting` shape), client helpers.
 * Server rules live in backend social/post-targeting.ts; the server is the gate.
 */
export interface PostTargeting {
  age_min?: number;
  age_max?: number;
  /** 1 = male, 2 = female (FB). */
  genders?: number[];
  geo_locations?: { countries?: string[]; cities?: { name: string }[] };
  /** ISO 639-1 language codes, e.g. 'bn', 'en'. */
  locales?: string[];
}
export type TargetingMode = 'restrict' | 'feed';
export interface TargetingValue { t: PostTargeting | null; mode: TargetingMode }
export const NO_TARGETING: TargetingValue = { t: null, mode: 'restrict' };
export const AGE_MIN = 13;
export const AGE_MAX = 65;

const ISO = 'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'.split(' ');
const LANGS = 'bn en hi ur ar es fr de pt ru zh ja ko id ms tr fa it nl pl ta te mr gu pa ne si th vi sw'.split(' ');

function names(type: 'region' | 'language') {
  try { return new Intl.DisplayNames(['en'], { type }); } catch { return null; }
}
const regionNames = names('region');
const languageNames = names('language');
export const countryName = (c: string) => regionNames?.of(c) || c;
export const languageName = (l: string) => languageNames?.of(l) || l;
export const COUNTRIES = ISO.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));
export const LANGUAGES = LANGS.map((code) => ({ code, name: languageName(code) }));

/** Drops empty / no-op parts. Returns null when nothing restricts. */
export function cleanTargeting(t: PostTargeting | null | undefined): PostTargeting | null {
  if (!t) return null;
  const out: PostTargeting = {};
  if (t.age_min && t.age_min > AGE_MIN) out.age_min = t.age_min;
  if (t.age_max && t.age_max < AGE_MAX) out.age_max = t.age_max;
  if (t.genders?.length === 1) out.genders = [...t.genders];
  const countries = t.geo_locations?.countries?.filter(Boolean) ?? [];
  const cities = t.geo_locations?.cities?.filter((c) => c.name.trim()) ?? [];
  if (countries.length || cities.length) out.geo_locations = { ...(countries.length ? { countries } : {}), ...(cities.length ? { cities } : {}) };
  if (t.locales?.length) out.locales = [...t.locales];
  return Object.keys(out).length ? out : null;
}

/** Server JSON (normalised: genders 'male'/'female', cities as strings) → UI shape. */
export function fromServer(raw: any): PostTargeting | null {
  if (!raw) return null;
  let t = raw;
  if (typeof t === 'string') { try { t = JSON.parse(t); } catch { return null; } }
  const g = (x: any) => (x === 1 || x === '1' || x === 'male' ? 1 : x === 2 || x === '2' || x === 'female' ? 2 : null);
  const place = (x: any) => ({ name: String(x?.name ?? x ?? '').replace(/\b\w/g, (m) => m.toUpperCase()) });
  return cleanTargeting({
    age_min: t.age_min, age_max: t.age_max,
    genders: Array.isArray(t.genders) ? (t.genders.map(g).filter(Boolean) as number[]) : undefined,
    geo_locations: { countries: t.geo_locations?.countries, cities: [...(t.geo_locations?.cities ?? []), ...(t.geo_locations?.regions ?? [])].map(place) },
    locales: t.locales,
  });
}

export function valueFromServer(targeting: any, feedTargeting: any): TargetingValue {
  const t = fromServer(targeting);
  if (t) return { t, mode: 'restrict' };
  const f = fromServer(feedTargeting);
  return f ? { t: f, mode: 'feed' } : NO_TARGETING;
}

/** Body fields for create/update calls (null clears). */
export function targetingPayload(v: TargetingValue): { targeting: PostTargeting | null; feed_targeting: PostTargeting | null } {
  const t = cleanTargeting(v.t);
  return { targeting: v.mode === 'restrict' ? t : null, feed_targeting: v.mode === 'feed' ? t : null };
}

/** "18-35 · BD · Bangla" style chip text. Empty string when nothing is set. */
export function targetingSummary(v: TargetingValue): string {
  const t = cleanTargeting(v.t);
  if (!t) return '';
  const parts: string[] = [];
  if (t.age_min || t.age_max) parts.push(t.age_min && t.age_max ? `${t.age_min}-${t.age_max}` : t.age_min ? `${t.age_min}+` : `${AGE_MIN}-${t.age_max}`);
  const geo = [...(t.geo_locations?.countries ?? []), ...(t.geo_locations?.cities ?? []).map((c) => c.name)];
  if (geo.length) parts.push(geo.length > 2 ? `${geo.slice(0, 2).join(', ')} +${geo.length - 2}` : geo.join(', '));
  if (t.genders?.length === 1) parts.push(t.genders[0] === 1 ? 'Men' : 'Women');
  if (t.locales?.length) parts.push(t.locales.length > 1 ? `${languageName(t.locales[0])} +${t.locales.length - 1}` : languageName(t.locales[0]));
  return parts.join(' · ');
}
