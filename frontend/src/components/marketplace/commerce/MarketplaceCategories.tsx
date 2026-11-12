import React from 'react';
import { useMarketplaceCategories } from './utils';
import { useMarketplaceLang } from './useMarketplaceLang';
import { useStorefrontConfig } from './useStorefrontConfig';
import {
  BookOpen,
  Briefcase,
  Car,
  Download,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Headphones,
  Heart,
  Home,
  Laptop,
  LayoutGrid,
  Monitor,
  MoreHorizontal,
  PawPrint,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Tag,
  Tractor,
  Trophy,
  Watch,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Briefcase,
  Car,
  Download,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  Headphones,
  Heart,
  Home,
  Laptop,
  LayoutGrid,
  Monitor,
  MoreHorizontal,
  PawPrint,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sofa,
  Tag,
  Tractor,
  Trophy,
  Watch,
};

const ICONS_BY_SLUG: Record<string, LucideIcon> = {
  all: LayoutGrid,
  books: BookOpen,
  electronics: Monitor,
  clothing: Shirt,
  fashion: ShoppingBag,
  accessories: Watch,
  services: Briefcase,
  digital: Download,
  vehicles: Car,
  property: Home,
  gaming: Gamepad2,
  education: GraduationCap,
  jobs: Briefcase,
  'home-living': Sofa,
  home: Sofa,
  sports: Trophy,
  agriculture: Tractor,
  animals: PawPrint,
  others: MoreHorizontal,
  phones: Smartphone,
  beauty: Heart,
  wearables: Watch,
  audio: Headphones,
};

function iconFor(cat: { name: string; slug?: string; icon?: string | null }): LucideIcon {
  const slug = String(cat.slug || cat.name || '').trim().toLowerCase();
  if (ICONS_BY_SLUG[slug]) return ICONS_BY_SLUG[slug];
  const named = cat.icon && cat.icon !== 'Tag' ? ICONS[cat.icon] : undefined;
  return named || Tag;
}

export function CircularCategories({ 
  selected, 
  onSelect 
}: { 
  selected: string, 
  onSelect: (c: string) => void 
}) {
  const categories = useMarketplaceCategories();
  const { tCategory } = useMarketplaceLang();
  const pins = useStorefrontConfig()?.categoryPins ?? [];

  // Admin-pinned categories (Storefront Settings) first; otherwise top 8 by sort order
  const pinned = pins
    .map((slug) => categories.find((c: any) => c?.slug === slug))
    .filter(Boolean) as typeof categories;
  const quickCats = pinned.length ? pinned.slice(0, 8) : categories.slice(0, 8);

  return (
    <div id="js_categories" className="w-full overflow-x-auto no-scrollbar pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2.5 md:grid md:grid-cols-8 md:gap-3 min-w-max md:min-w-0">
        {quickCats.map((cat) => {
          const isSelected = selected.toLowerCase() === cat.name.toLowerCase();
          const Icon = iconFor(cat);
          return (
            <button
              key={cat.name}
              onClick={() => onSelect(cat.name)}
              className="flex flex-col items-center gap-1.5 group shrink-0"
            >
              <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center border transition-all duration-300 ${
                isSelected 
                  ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20' 
                  : 'bg-card border-border text-foreground group-hover:border-primary/50 group-hover:text-primary group-hover:bg-primary/5'
              }`}>
                <Icon size={16} />
              </div>
              <span className={`text-[10px] font-semibold tracking-tight transition-colors ${
                isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'
              }`}>
                {tCategory(cat.slug || cat.name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
