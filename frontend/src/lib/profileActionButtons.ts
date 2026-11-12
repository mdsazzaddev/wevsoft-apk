/**
 * Profile action-button presets — labels, icons keys, and URL hints for the editor + chrome.
 */

export const PROFILE_ACTION_TYPES = [
  'WEVCHAT',
  'CALL',
  'EMAIL',
  'CONTACT',
  'SIGNUP',
  'WATCH',
  'MESSAGE',
  'WEBSITE',
  'SHOP',
  'BOOK',
  'SUBSCRIBE',
  'CUSTOM',
] as const;

export type ProfileActionType = (typeof PROFILE_ACTION_TYPES)[number];

export type ProfileActionPreset = {
  type: ProfileActionType;
  label: string;
  hint: string;
  /** Lucide icon name used by UI maps. */
  icon: 'MessageCircle' | 'Phone' | 'Mail' | 'UserRound' | 'UserPlus' | 'Play' | 'Globe' | 'ShoppingBag' | 'Calendar' | 'Bell' | 'Sparkles';
  /** Soft accent for chrome chips. */
  accent: string;
  urlKind: 'none' | 'tel' | 'mailto' | 'https';
  urlPlaceholder?: string;
};

export const PROFILE_ACTION_PRESETS: ProfileActionPreset[] = [
  {
    type: 'WEVCHAT',
    label: 'WevChat',
    hint: 'Open a chat with you',
    icon: 'MessageCircle',
    accent: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25',
    urlKind: 'none',
  },
  {
    type: 'CALL',
    label: 'Call',
    hint: 'Phone number for visitors',
    icon: 'Phone',
    accent: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    urlKind: 'tel',
    urlPlaceholder: '+8801XXXXXXXXX',
  },
  {
    type: 'EMAIL',
    label: 'Email',
    hint: 'Open their mail app',
    icon: 'Mail',
    accent: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/25',
    urlKind: 'mailto',
    urlPlaceholder: 'you@example.com',
  },
  {
    type: 'CONTACT',
    label: 'Contact me',
    hint: 'Contact form or page',
    icon: 'UserRound',
    accent: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/25',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
  {
    type: 'SIGNUP',
    label: 'Sign up',
    hint: 'Registration or waitlist link',
    icon: 'UserPlus',
    accent: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/25',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
  {
    type: 'WATCH',
    label: 'Watch now',
    hint: 'Live, reel, or video link',
    icon: 'Play',
    accent: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
  {
    type: 'MESSAGE',
    label: 'Message',
    hint: 'Same as WevChat',
    icon: 'MessageCircle',
    accent: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25',
    urlKind: 'none',
  },
  {
    type: 'WEBSITE',
    label: 'Visit website',
    hint: 'Your site or portfolio',
    icon: 'Globe',
    accent: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-500/25',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
  {
    type: 'SHOP',
    label: 'View shop',
    hint: 'Store or product page',
    icon: 'ShoppingBag',
    accent: 'bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/25',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
  {
    type: 'BOOK',
    label: 'Book',
    hint: 'Booking or calendar link',
    icon: 'Calendar',
    accent: 'bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/25',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
  {
    type: 'SUBSCRIBE',
    label: 'Subscribe',
    hint: 'Newsletter or channel',
    icon: 'Bell',
    accent: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/25',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
  {
    type: 'CUSTOM',
    label: 'Custom',
    hint: 'Your own label + link',
    icon: 'Sparkles',
    accent: 'bg-muted text-foreground border-border',
    urlKind: 'https',
    urlPlaceholder: 'https://…',
  },
];

export function presetForType(type: string): ProfileActionPreset {
  return (
    PROFILE_ACTION_PRESETS.find((p) => p.type === type) ||
    PROFILE_ACTION_PRESETS[PROFILE_ACTION_PRESETS.length - 1]
  );
}

/** Build API url field from editor inputs. */
export function buildActionUrl(
  type: ProfileActionType,
  raw: string,
): string | null {
  const v = raw.trim();
  const preset = presetForType(type);
  if (preset.urlKind === 'none') return null;
  if (!v) return null;
  if (preset.urlKind === 'tel') {
    const digits = v.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
  }
  if (preset.urlKind === 'mailto') {
    const email = v.replace(/^mailto:/i, '').trim();
    return email.includes('@') ? `mailto:${email}` : null;
  }
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}
