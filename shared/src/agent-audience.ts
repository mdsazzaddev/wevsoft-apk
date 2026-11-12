/** Agent auto-reply audience flags. Safe to import from the browser and Express. */

export const AUDIENCE_TYPES = ['PRIVATE', 'CUSTOM', 'ONLY_FRIENDS', 'ONLY_FOLLOWERS', 'ALL_PUBLIC'] as const;
export type AgentAudienceType = (typeof AUDIENCE_TYPES)[number];

export const COMBINABLE_AUDIENCE = ['CUSTOM', 'ONLY_FRIENDS', 'ONLY_FOLLOWERS', 'ALL_PUBLIC'] as const;
export type CombinableAudienceType = (typeof COMBINABLE_AUDIENCE)[number];

export const EXCLUSIVE_AUDIENCE_TIERS = ['ALL_PUBLIC', 'ONLY_FRIENDS', 'ONLY_FOLLOWERS'] as const;

export const AUDIENCE_LABEL: Record<AgentAudienceType, string> = {
  PRIVATE: 'Off',
  CUSTOM: 'Custom',
  ONLY_FRIENDS: 'Friends',
  ONLY_FOLLOWERS: 'Followers',
  ALL_PUBLIC: 'Public',
};

const KNOWN = new Set<string>(AUDIENCE_TYPES);

export function isAudienceType(value: string): value is AgentAudienceType {
  return KNOWN.has(value);
}

export function parseAudienceTypes(raw: string | null | undefined): AgentAudienceType[] {
  if (!raw || !raw.trim()) return ['PRIVATE'];
  const parsed = raw
    .split(',')
    .map((part) => part.trim())
    .filter(isAudienceType);
  if (parsed.length === 0) return ['PRIVATE'];
  if (parsed.includes('PRIVATE') && parsed.every((t) => t === 'PRIVATE')) return ['PRIVATE'];
  const withoutOff = parsed.filter((t) => t !== 'PRIVATE');
  if (withoutOff.length === 0) return ['PRIVATE'];
  return [...new Set(withoutOff)].sort();
}

export function serializeAudienceTypes(types: AgentAudienceType[]): string {
  return parseAudienceTypes(types.join(',')).join(',');
}

export function hasAudience(raw: string | null | undefined, type: AgentAudienceType): boolean {
  return parseAudienceTypes(raw).includes(type);
}

export function isCombinableAudience(type: AgentAudienceType): type is CombinableAudienceType {
  return (COMBINABLE_AUDIENCE as readonly string[]).includes(type);
}

/** Toggle one flag. Off is exclusive; Custom / Friends / Followers / Public combine. */
export function toggleAudienceSelection(current: AgentAudienceType[], clicked: AgentAudienceType): AgentAudienceType[] {
  if (clicked === 'PRIVATE') return ['PRIVATE'];

  const withoutOff = current.filter(isCombinableAudience);
  const next = withoutOff.includes(clicked)
    ? withoutOff.filter((t) => t !== clicked)
    : [...withoutOff, clicked];

  return next.length === 0 ? ['PRIVATE'] : [...new Set(next)].sort();
}

export function formatAudienceLabel(raw: string | null | undefined): string {
  return parseAudienceTypes(raw)
    .map((t) => AUDIENCE_LABEL[t])
    .join(' + ');
}

export function exclusiveTiersIn(raw: string | null | undefined): AgentAudienceType[] {
  return parseAudienceTypes(raw).filter((t) => (EXCLUSIVE_AUDIENCE_TIERS as readonly string[]).includes(t));
}
