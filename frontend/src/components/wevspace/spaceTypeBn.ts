import { spaceTypeLabel } from '@wevsoft/shared/wevspace';

const TYPE_BN: Record<string, string> = {
  CREATOR: 'ক্রিয়েটর',
  BUSINESS: 'বিজনেস',
  BRAND: 'ব্র্যান্ড',
  COMMUNITY: 'কমিউনিটি',
  ORGANIZATION: 'প্রতিষ্ঠান',
  STORE: 'স্টোর',
  PROJECT: 'প্রজেক্ট',
  MEDIA: 'মিডিয়া ও নিউজ',
  EDUCATION: 'শিক্ষামূলক',
  GAMING: 'গেমিং ও বিনোদন',
  PUBLIC_FIGURE: 'ব্যক্তিগত / পাবলিক পরিচিতি',
  OTHER: 'অন্যান্য',
};

/** Bangla Space type label; falls back to the shared English label. */
export function spaceTypeLabelBn(value: unknown): string {
  return TYPE_BN[String(value || '').toUpperCase()] || spaceTypeLabel(value);
}
