import React from 'react';
import {
  Cpu, Shirt, Car, Building2, Sofa, BookOpen,
  Gamepad2, GraduationCap, Wrench, Briefcase, Leaf,
  PawPrint, Heart, Trophy, UtensilsCrossed, MoreHorizontal, Tag,
  Monitor, Watch, Download, Home, Tractor, LayoutGrid, ShoppingBag, Sparkles, Activity,
} from 'lucide-react';
import { useMarketplaceCategories } from './utils';

const ICON_MAP: Record<string, any> = {
  Cpu, Shirt, Car, Building2, Sofa, BookOpen, Gamepad2, GraduationCap, Wrench,
  Briefcase, Leaf, PawPrint, Heart, Trophy, UtensilsCrossed, MoreHorizontal, Tag,
  Monitor, Watch, Download, Home, Tractor, LayoutGrid, ShoppingBag, Sparkles, Activity,
};

const TILE_STYLES: Record<string, { color: string; bg: string }> = {
  electronics: { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  'electronics-gadgets': { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  fashion: { color: 'text-pink-500', bg: 'bg-pink-500/10' },
  'fashion-apparel': { color: 'text-pink-500', bg: 'bg-pink-500/10' },
  clothing: { color: 'text-pink-500', bg: 'bg-pink-500/10' },
  vehicles: { color: 'text-gray-500', bg: 'bg-gray-500/10' },
  'automotive-gadgets': { color: 'text-gray-500', bg: 'bg-gray-500/10' },
  property: { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  'home-living': { color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'home-and-living': { color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'home-kitchen': { color: 'text-amber-500', bg: 'bg-amber-500/10' },
  'health-and-beauty': { color: 'text-rose-500', bg: 'bg-rose-500/10' },
  'beauty-personal-care': { color: 'text-rose-500', bg: 'bg-rose-500/10' },
  sports: { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  'sports-fitness': { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  'groceries-daily': { color: 'text-red-500', bg: 'bg-red-500/10' },
  food: { color: 'text-red-500', bg: 'bg-red-500/10' },
  education: { color: 'text-violet-500', bg: 'bg-violet-500/10' },
  books: { color: 'text-teal-500', bg: 'bg-teal-500/10' },
  'books-stationery': { color: 'text-teal-500', bg: 'bg-teal-500/10' },
  gaming: { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  animals: { color: 'text-amber-700', bg: 'bg-amber-700/10' },
  pets: { color: 'text-amber-700', bg: 'bg-amber-700/10' },
  agriculture: { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  jobs: { color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  services: { color: 'text-slate-500', bg: 'bg-slate-500/10' },
  others: { color: 'text-primary', bg: 'bg-primary/10' },
};

const FALLBACK_TILES = [
  { id: 'electronics', name: 'Electronics', icon: Cpu, slug: 'electronics', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'fashion', name: 'Fashion', icon: Shirt, slug: 'fashion', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'vehicles', name: 'Vehicles', icon: Car, slug: 'vehicles', color: 'text-gray-500', bg: 'bg-gray-500/10' },
  { id: 'property', name: 'Property', icon: Building2, slug: 'property', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { id: 'home', name: 'Home & Living', icon: Sofa, slug: 'home-and-living', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'health', name: 'Health & Beauty', icon: Heart, slug: 'health-and-beauty', color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { id: 'sports', name: 'Sports', icon: Trophy, slug: 'sports', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'food', name: 'Food', icon: UtensilsCrossed, slug: 'food', color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'education', name: 'Education', icon: GraduationCap, slug: 'education', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { id: 'books', name: 'Books', icon: BookOpen, slug: 'books', color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, slug: 'gaming', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'pets', name: 'Animals', icon: PawPrint, slug: 'animals', color: 'text-amber-700', bg: 'bg-amber-700/10' },
  { id: 'agriculture', name: 'Agriculture', icon: Leaf, slug: 'agriculture', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'jobs', name: 'Jobs', icon: Briefcase, slug: 'jobs', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { id: 'services', name: 'Services', icon: Wrench, slug: 'services', color: 'text-slate-500', bg: 'bg-slate-500/10' },
  { id: 'others', name: 'Others', icon: MoreHorizontal, slug: 'others', color: 'text-primary', bg: 'bg-primary/10' },
];

const FeaturedCategories = () => {
  const live = useMarketplaceCategories();
  const tiles = live
    .filter((c) => c.slug !== 'all' && c.name !== 'All')
    .map((c) => {
      const style = TILE_STYLES[c.slug] || TILE_STYLES[c.name.toLowerCase()] || { color: 'text-primary', bg: 'bg-primary/10' };
      return {
        id: c.id || c.slug,
        name: c.name,
        slug: c.slug,
        icon: ICON_MAP[c.icon || ''] || Tag,
        ...style,
      };
    });
  const categories = (tiles.length ? tiles : FALLBACK_TILES).slice(0, 16);

  return (
    <section className="w-full py-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100">Categories</h2>
        <a href="/wevmall/categories" className="text-sm font-medium text-primary hover:text-primary">
          View All
        </a>
      </div>
      
      <div className="bg-card border border-primary/30 rounded-2xl px-4 py-5 md:px-6 md:py-6">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-y-5 gap-x-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <a 
                key={category.id} 
                href={`/wevmall/category/${category.slug}`}
                className="flex flex-col items-center justify-start group cursor-pointer"
              >
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${category.bg} border border-primary/20 flex items-center justify-center mb-2 group-hover:scale-110 group-hover:border-primary/50 transition-all duration-200`}>
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 ${category.color}`} strokeWidth={1.5} />
                </div>
                <span className="text-[11px] md:text-xs font-medium text-center text-zinc-300 group-hover:text-primary transition-colors leading-tight px-0.5 line-clamp-2">
                  {category.name}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
