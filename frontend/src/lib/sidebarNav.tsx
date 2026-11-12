import { CREATOR_HUB_NAME, PERSONAL_CREATOR_HUB_PATH } from './creatorHub';
import React from 'react';
import {
  Home,
  UserPlus,
  Film,
  Store,
  BookOpen,
  GraduationCap,
  BrainCircuit,
  Calendar,
  Users,
  Briefcase,
  Sparkles,
  Radio,
  Tv2,
  Crown,
  Trophy,
  Clock,
  Bookmark,
  TrendingUp,
  Headphones,
  Flag,
  RefreshCw,
  Bell,
  PlusSquare,
  Camera,
  Video,
  Ghost
} from 'lucide-react';
import { WevChatIcon } from '../icons/WevChatIcon';

export interface SidebarNavItem {
  to: string;
  labelKey: string;
  fallbackLabel: string;
  icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
  borderColor: string;
  glowShadow: string;
  badge?: React.ReactNode;
  category?: string;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    to: '/home',
    labelKey: 'Home',
    fallbackLabel: 'Home',
    icon: Home,
    iconColor: 'text-sky-400',
    bgGradient: 'from-sky-500/20 via-blue-500/10 to-indigo-500/20',
    borderColor: 'border-sky-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(56,189,248,0.35)]',
    category: 'MAIN',
  },
  {
    to: '/notifications',
    labelKey: 'Notifications',
    fallbackLabel: 'Notifications',
    icon: Bell,
    iconColor: 'text-yellow-400',
    bgGradient: 'from-yellow-500/20 via-amber-500/10 to-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(234,179,8,0.35)]',
  },
  {
    to: '/friends',
    labelKey: 'Friends',
    fallbackLabel: 'Friends',
    icon: UserPlus,
    iconColor: 'text-emerald-400',
    bgGradient: 'from-emerald-500/20 via-teal-500/10 to-green-500/20',
    borderColor: 'border-emerald-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(52,211,153,0.35)]',
  },
  {
    to: '/messages',
    labelKey: 'WevChat',
    fallbackLabel: 'WevChat',
    icon: WevChatIcon,
    iconColor: 'text-cyan-400',
    bgGradient: 'from-cyan-500/20 via-sky-500/10 to-blue-500/20',
    borderColor: 'border-cyan-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(34,211,238,0.35)]',
  },
  {
    to: '/reels',
    labelKey: 'Reels',
    fallbackLabel: 'Reels',
    icon: Film,
    iconColor: 'text-pink-400',
    bgGradient: 'from-pink-500/20 via-rose-500/10 to-purple-500/20',
    borderColor: 'border-pink-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(244,114,182,0.35)]',
    category: 'DISCOVER',
  },
  {
    to: '/wevmall',
    labelKey: 'WevMall',
    fallbackLabel: 'WevMall',
    icon: Store,
    iconColor: 'text-amber-400',
    bgGradient: 'from-amber-500/20 via-orange-500/10 to-yellow-500/20',
    borderColor: 'border-amber-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(251,191,36,0.35)]',
  },
  {
    to: '/live',
    labelKey: 'Live',
    fallbackLabel: 'Live',
    icon: Radio,
    iconColor: 'text-rose-400',
    bgGradient: 'from-rose-500/20 via-red-500/10 to-pink-500/20',
    borderColor: 'border-rose-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(251,113,133,0.35)]',
    badge: (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-widest shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
        LIVE
      </span>
    ),
  },
  {
    to: '/watch-party',
    labelKey: 'Watch Party',
    fallbackLabel: 'Watch Party',
    icon: Tv2,
    iconColor: 'text-violet-400',
    bgGradient: 'from-violet-500/20 via-purple-500/10 to-indigo-500/20',
    borderColor: 'border-violet-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(167,139,250,0.35)]',
  },
  {
    to: '/campus',
    labelKey: 'My Campus',
    fallbackLabel: 'My Campus',
    icon: GraduationCap,
    iconColor: 'text-indigo-300',
    bgGradient: 'from-indigo-500/25 via-sky-500/15 to-cyan-500/20',
    borderColor: 'border-indigo-400/40',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(129,140,248,0.4)]',
    category: 'STUDIO & AI',
  },
  {
    to: '/academic',
    labelKey: 'Academic',
    fallbackLabel: 'Academic',
    icon: BookOpen,
    iconColor: 'text-indigo-400',
    bgGradient: 'from-indigo-500/20 via-blue-500/10 to-violet-500/20',
    borderColor: 'border-indigo-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(129,140,248,0.35)]',
  },
  {
    to: '/study',
    labelKey: 'AI Study',
    fallbackLabel: 'AI Study',
    icon: BrainCircuit,
    iconColor: 'text-fuchsia-400',
    bgGradient: 'from-fuchsia-500/20 via-purple-500/10 to-pink-500/20',
    borderColor: 'border-fuchsia-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(232,121,249,0.35)]',
    badge: (
      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 uppercase tracking-widest shadow-sm">
        AI
      </span>
    ),
  },
  {
    to: PERSONAL_CREATOR_HUB_PATH,
    labelKey: CREATOR_HUB_NAME,
    fallbackLabel: CREATOR_HUB_NAME,
    icon: Sparkles,
    iconColor: 'text-purple-400',
    bgGradient: 'from-purple-500/20 via-violet-500/10 to-fuchsia-500/20',
    borderColor: 'border-purple-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(192,132,252,0.35)]',
  },
  {
    to: '/events',
    labelKey: 'Events',
    fallbackLabel: 'Events',
    icon: Calendar,
    iconColor: 'text-red-400',
    bgGradient: 'from-red-500/20 via-rose-500/10 to-orange-500/20',
    borderColor: 'border-red-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(248,113,113,0.35)]',
    category: 'COMMUNITY',
  },
  {
    to: '/groups',
    labelKey: 'Groups',
    fallbackLabel: 'Groups',
    icon: Users,
    iconColor: 'text-teal-400',
    bgGradient: 'from-teal-500/20 via-cyan-500/10 to-emerald-500/20',
    borderColor: 'border-teal-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(45,212,191,0.35)]',
  },
  {
    to: '/phantom',
    labelKey: 'Phantom',
    fallbackLabel: 'Phantom',
    icon: Ghost,
    iconColor: 'text-red-500',
    bgGradient: 'from-red-600/25 via-rose-900/10 to-black/30',
    borderColor: 'border-red-600/40',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(255,38,56,0.45)]',
  },
  {
    to: '/jobs',
    labelKey: 'Jobs',
    fallbackLabel: 'Jobs',
    icon: Briefcase,
    iconColor: 'text-yellow-400',
    bgGradient: 'from-yellow-500/20 via-amber-500/10 to-orange-500/20',
    borderColor: 'border-yellow-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(250,204,21,0.35)]',
  },
  {
    to: '/subscriptions',
    labelKey: 'Subscriptions',
    fallbackLabel: 'Subscriptions',
    icon: Crown,
    iconColor: 'text-amber-300',
    bgGradient: 'from-amber-400/25 via-yellow-500/20 to-amber-600/25',
    borderColor: 'border-amber-400/40',
    glowShadow: 'group-hover:shadow-[0_0_16px_rgba(251,191,36,0.4)]',
    badge: (
      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-amber-400/30 to-yellow-500/30 text-amber-200 border border-amber-400/40 uppercase tracking-wider shadow-sm">
        VIP
      </span>
    ),
  },
  {
    to: '/rewards',
    labelKey: 'Rewards',
    fallbackLabel: 'Rewards',
    icon: Trophy,
    iconColor: 'text-amber-400',
    bgGradient: 'from-amber-400/25 via-orange-500/20 to-yellow-600/25',
    borderColor: 'border-amber-400/40',
    glowShadow: 'group-hover:shadow-[0_0_16px_rgba(251,191,36,0.4)]',
    badge: (
      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-gradient-to-r from-amber-400/30 to-orange-500/30 text-amber-200 border border-amber-400/40 uppercase tracking-wider shadow-sm">
        XP
      </span>
    ),
  },
  {
    to: '/saved',
    labelKey: 'Saved',
    fallbackLabel: 'Saved',
    icon: Bookmark,
    iconColor: 'text-blue-400',
    bgGradient: 'from-blue-500/20 via-sky-500/10 to-blue-500/20',
    borderColor: 'border-blue-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(59,130,246,0.35)]',
  },
  {
    to: '/trending',
    labelKey: 'Trending',
    fallbackLabel: 'Trending',
    icon: TrendingUp,
    iconColor: 'text-orange-400',
    bgGradient: 'from-orange-500/20 via-red-500/10 to-orange-500/20',
    borderColor: 'border-orange-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(249,115,22,0.35)]',
  },
  {
    to: '/support',
    labelKey: 'Support',
    fallbackLabel: 'Support',
    icon: Headphones,
    iconColor: 'text-green-400',
    bgGradient: 'from-green-500/20 via-emerald-500/10 to-green-500/20',
    borderColor: 'border-green-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(34,197,94,0.35)]',
  },
  {
    to: '/report-problem',
    labelKey: 'Report Problem',
    fallbackLabel: 'Report Problem',
    icon: Flag,
    iconColor: 'text-red-400',
    bgGradient: 'from-red-500/20 via-rose-500/10 to-red-500/20',
    borderColor: 'border-red-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(239,68,68,0.35)]',
  },
  {
    to: '/create-post',
    labelKey: 'Create Post',
    fallbackLabel: 'Create Post',
    icon: PlusSquare,
    iconColor: 'text-sky-400',
    bgGradient: 'from-sky-500/20 via-cyan-500/10 to-sky-500/20',
    borderColor: 'border-sky-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(14,165,233,0.35)]',
    category: 'CREATE',
  },
  {
    to: '/create-story',
    labelKey: 'Create Story',
    fallbackLabel: 'Create Story',
    icon: Camera,
    iconColor: 'text-pink-400',
    bgGradient: 'from-pink-500/20 via-rose-500/10 to-pink-500/20',
    borderColor: 'border-pink-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(236,72,153,0.35)]',
  },
  {
    to: '/reels/create',
    labelKey: 'Upload Reel',
    fallbackLabel: 'Upload Reel',
    icon: Video,
    iconColor: 'text-violet-400',
    bgGradient: 'from-violet-500/20 via-purple-500/10 to-violet-500/20',
    borderColor: 'border-violet-500/30',
    glowShadow: 'group-hover:shadow-[0_0_15px_rgba(139,92,246,0.35)]',
  },
];
