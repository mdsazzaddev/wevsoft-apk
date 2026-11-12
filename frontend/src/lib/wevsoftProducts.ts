import type { LucideIcon } from 'lucide-react';
import type { DeveloperProductId } from '@wevsoft/shared/developer-products';

export { DEVELOPER_PRODUCT_IDS } from '@wevsoft/shared/developer-products';
import {
  Briefcase,
  Building2,
  CalendarDays,
  Clapperboard,
  GraduationCap,
  Headphones,
  House,
  MessageCircle,
  Radio,
  School,
  ShoppingBag,
  Sparkles,
  Tv,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';

/**
 * Catalog of Wevsoft products a developer app can connect to.
 * Source of truth for names/routes: lib/sidebarNav.tsx (main app navigation) plus
 * WevSpaces / WevDesk / Wallet pages. Keep in sync when a product is added or renamed.
 */
export type WevsoftProductId = DeveloperProductId;

export interface WevsoftProduct {
  id: WevsoftProductId;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile. */
  tile: string;
  /** Where the product lives in the consumer app. */
  path: string;
  category: 'Communication' | 'Content' | 'Commerce' | 'Community' | 'Learning' | 'Business';
}

export const WEVSOFT_PRODUCTS: WevsoftProduct[] = [
  { id: 'wevchat', name: 'WevChat', description: 'Messages, group chats and calls.', icon: MessageCircle, tile: 'bg-sky-500/12 text-sky-600 dark:text-sky-400', path: '/messages', category: 'Communication' },
  { id: 'feed', name: 'Feed', description: 'Posts, comments and reactions on the home feed.', icon: House, tile: 'bg-blue-500/12 text-blue-600 dark:text-blue-400', path: '/home', category: 'Content' },
  { id: 'reels', name: 'Reels', description: 'Short-form vertical videos.', icon: Clapperboard, tile: 'bg-pink-500/12 text-pink-600 dark:text-pink-400', path: '/reels', category: 'Content' },
  { id: 'live', name: 'Live', description: 'Live streams and live chat.', icon: Radio, tile: 'bg-red-500/12 text-red-600 dark:text-red-400', path: '/live', category: 'Content' },
  { id: 'watch-party', name: 'Watch Party', description: 'Watch videos together in real time.', icon: Tv, tile: 'bg-violet-500/12 text-violet-600 dark:text-violet-400', path: '/watch-party', category: 'Content' },
  { id: 'wevmall', name: 'WevMall', description: 'Marketplace products, shops and orders.', icon: ShoppingBag, tile: 'bg-amber-500/12 text-amber-600 dark:text-amber-400', path: '/wevmall', category: 'Commerce' },
  { id: 'wallet', name: 'Wallet', description: 'Wevsoft digital wallet and payments.', icon: Wallet, tile: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400', path: '/wallet', category: 'Commerce' },
  { id: 'wevspaces', name: 'WevSpaces', description: 'Brand and business pages.', icon: Building2, tile: 'bg-indigo-500/12 text-indigo-600 dark:text-indigo-400', path: '/spaces', category: 'Business' },
  { id: 'wevdesk', name: 'WevDesk', description: 'Shared inbox and workflows for Spaces.', icon: Headphones, tile: 'bg-purple-500/12 text-purple-600 dark:text-purple-400', path: '/wevdesk', category: 'Business' },
  { id: 'creator-hub', name: 'Creator Hub', description: 'Creator tools, analytics and monetization.', icon: Wand2, tile: 'bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400', path: '/creator-hub', category: 'Business' },
  { id: 'jobs', name: 'Jobs', description: 'Job posts and applications.', icon: Briefcase, tile: 'bg-slate-500/12 text-slate-600 dark:text-slate-300', path: '/jobs', category: 'Business' },
  { id: 'groups', name: 'Groups', description: 'Communities and group posts.', icon: Users, tile: 'bg-teal-500/12 text-teal-600 dark:text-teal-400', path: '/groups', category: 'Community' },
  { id: 'events', name: 'Events', description: 'Events and RSVPs.', icon: CalendarDays, tile: 'bg-orange-500/12 text-orange-600 dark:text-orange-400', path: '/events', category: 'Community' },
  { id: 'campus', name: 'My Campus', description: 'Campus communities for students.', icon: School, tile: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-400', path: '/campus', category: 'Learning' },
  { id: 'academic', name: 'Academic', description: 'Courses, lessons and teachers.', icon: GraduationCap, tile: 'bg-lime-500/12 text-lime-700 dark:text-lime-400', path: '/academic', category: 'Learning' },
  { id: 'ai-study', name: 'AI Study', description: 'AI tutor, notes and quizzes.', icon: Sparkles, tile: 'bg-yellow-500/12 text-yellow-700 dark:text-yellow-400', path: '/study', category: 'Learning' },
];