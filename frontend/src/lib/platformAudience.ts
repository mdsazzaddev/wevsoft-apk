/**
 * Audience fields each destination actually accepts.
 * Facebook Page posts: age, gender, country (Graph `targeting`).
 * LinkedIn text posts: Public or Connections.
 * YouTube audience (privacy + made for kids) stays on the YouTube options object.
 */
import { AGE_MAX, AGE_MIN, countryName } from './postTargeting';

export interface FacebookAudience {
  age_min?: number;
  age_max?: number;
  /** 1 = men, 2 = women. */
  genders?: number[];
  countries?: string[];
}
export interface LinkedInAudience { visibility: 'PUBLIC' | 'CONNECTIONS' }
export type LinkedInVisibility = LinkedInAudience['visibility'];

export function cleanFacebook(t: FacebookAudience | null | undefined): FacebookAudience | null {
  if (!t) return null;
  const out: FacebookAudience = {};
  const min = Number(t.age_min);
  const max = Number(t.age_max);
  if (Number.isInteger(min) && min > AGE_MIN && min <= AGE_MAX) out.age_min = min;
  if (Number.isInteger(max) && max >= AGE_MIN && max < AGE_MAX) out.age_max = max;
  if (out.age_min && out.age_max && out.age_min > out.age_max) out.age_max = out.age_min;
  if (t.genders?.length === 1 && (t.genders[0] === 1 || t.genders[0] === 2)) out.genders = [t.genders[0]];
  const countries = [...new Set((t.countries ?? []).map((c) => String(c || '').trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c)))].slice(0, 25);
  if (countries.length) out.countries = countries;
  return Object.keys(out).length ? out : null;
}

export function cleanLinkedIn(t: LinkedInAudience | null | undefined): LinkedInAudience | null {
  if (!t) return null;
  return t.visibility === 'CONNECTIONS' || t.visibility === 'PUBLIC' ? { visibility: t.visibility } : null;
}

export function facebookSummary(a: FacebookAudience | null | undefined): string {
  const t = cleanFacebook(a);
  if (!t) return '';
  const parts: string[] = [];
  if (t.age_min || t.age_max) parts.push(t.age_min && t.age_max ? `${t.age_min}-${t.age_max}` : t.age_min ? `${t.age_min}+` : `${AGE_MIN}-${t.age_max}`);
  if (t.countries?.length) {
    const names = t.countries.map(countryName);
    parts.push(names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', '));
  }
  if (t.genders?.length === 1) parts.push(t.genders[0] === 1 ? 'Men' : 'Women');
  return parts.join(' · ');
}

export const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
