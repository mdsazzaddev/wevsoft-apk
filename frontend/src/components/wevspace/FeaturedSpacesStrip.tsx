import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BadgeCheck, ChevronRight, Flame, Star } from 'lucide-react';
import { formatFollowerCount, resolveSpaceAccent, spaceInitials, spacePublicPath } from '@wevsoft/shared/wevspace';
import { discoverSpaces } from '../../lib/wevspaceApi';
import { resolveAvatarUrl } from '../UserAvatar';
import { useMarketplaceLang } from '../marketplace/commerce/useMarketplaceLang';

/** "Featured & trending" strip from the real trending sort; hidden when there is too little to show. */
export default function FeaturedSpacesStrip({ onSeeAll }: { onSeeAll: () => void }) {
  const { t, formatNum } = useMarketplaceLang();
  const q = useQuery({ queryKey: ['spaces', 'discover', 'trending-strip'], queryFn: () => discoverSpaces({ sort: 'trending', limit: 4 }), staleTime: 60_000 });
  const list = q.data?.spaces || [];
  if (list.length < 2) return null;
  return (
    <section className="mt-5" aria-label={t('Featured and trending Space', 'ফিচার্ড ও ট্রেন্ডিং স্পেস')}>
      <div className="flex items-baseline justify-between mb-2.5">
        <h2 className="text-[15px] font-bold">{t('Featured & trending', 'ফিচার্ড ও ট্রেন্ডিং')}</h2>
        <button type="button" onClick={onSeeAll} className="inline-flex items-center text-[12.5px] font-semibold text-primary">
          {t('See all', 'সব দেখুন')} <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex sm:grid gap-3 overflow-x-auto no-scrollbar sm:overflow-visible sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))] snap-x">
        {list.map((s) => {
          const accent = resolveSpaceAccent(s);
          const cover = resolveAvatarUrl(s.cover);
          const avatar = resolveAvatarUrl(s.avatar);
          const featured = (s as any).isFeatured;
          return (
            <Link
              key={s.id}
              to={spacePublicPath(s.handle)}
              className="snap-start shrink-0 w-[78%] sm:w-auto bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="relative h-14"
                style={
                  cover
                    ? undefined
                    : { background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 85%, white), color-mix(in srgb, ${accent} 70%, black))` }
                }
              >
                {cover && <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur text-[10px] font-semibold text-white">
                  {featured ? <Star size={10} /> : <Flame size={10} />} {featured ? t('Featured', 'ফিচার্ড') : t('Trending', 'ট্রেন্ডিং')}
                </span>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <span className="w-9 h-9 rounded-[10px] overflow-hidden grid place-items-center text-white text-[12px] font-bold shrink-0" style={avatar ? undefined : { background: accent }}>
                  {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : spaceInitials(s.name)}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[13px] font-semibold">
                    <span className="truncate">{s.name}</span>
                    {(s.verificationStatus === 'VERIFIED' || s.verificationStatus === 'OFFICIAL') && <BadgeCheck size={13} className="shrink-0 text-primary" />}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground truncate">
                    {typeof s.followersCount === 'number' ? t(`${formatFollowerCount(s.followersCount)} followers`, `${formatNum(s.followersCount)} ফলোয়ার`) : '@' + s.handle}
                    {s.category ? ` · ${s.category}` : ''}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
