import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Award, BadgeDollarSign, BarChart3, Briefcase, CalendarDays, CalendarHeart, ChevronRight, Compass, Gift,
  Activity, AtSign, GraduationCap, Handshake, Inbox, Layers, LifeBuoy, Link2, ListVideo, Megaphone, MessagesSquare, Plus, Repeat2, ScanSearch, Settings, ShieldCheck, ShieldAlert, ShoppingBag, Sparkles, Split, Star, Ticket, UploadCloud, UserPlus, UserRound, Users, UsersRound,
  Wallet, LibraryBig, type LucideIcon,
} from 'lucide-react';
import type { CreatorTab } from './studio/CreatorSidebar';
import { CREATOR_HUB_NAME, personalCreatorHubUrl, spaceCreatorHubUrl, type CreatorHubMode } from '../../lib/creatorHub';
import { applyBusinessCreatorNav } from '../../lib/creatorBusinessNav';
import { filterHubNav } from '../../lib/creatorHubTools';
import { useCreatorHubMode } from '../../lib/creatorSpaceContext';
import { useSpaceIdentities } from '../../lib/useSpaceIdentities';
import { HubPageHeader, HubRow, HubSection } from './hub/HubUI';

/**
 * Creator Hub "All tools": every working creator tool in one place, grouped.
 * `tab` opens a Creator Hub tab (chevron); `to` opens a page elsewhere in
 * Wevsoft (arrow-out icon). Only tools backed by a live page are listed.
 * Each hub (personal vs Space) only shows its own tools: tab tools follow
 * `creatorHubTools.ts`, `to` tools set `modes` explicitly.
 */
type Tool = {
  name: string; blurb: string; icon: LucideIcon; tile: string;
  tab?: CreatorTab; sub?: string; to?: string;
  modes?: readonly CreatorHubMode[];
};
const PERSONAL: readonly CreatorHubMode[] = ['personal'];
const SPACE: readonly CreatorHubMode[] = ['space'];

const GROUPS: Array<{ title: string; tools: Tool[] }> = [
  {
    title: 'Audience & conversations',
    tools: [
      { name: 'Invite people', blurb: 'Share your invite link and earn XP when friends join', icon: UserPlus, tile: 'from-sky-400 to-blue-600', tab: 'invite' },
      { name: 'Mentions', blurb: 'See posts, reels and stories that tagged you', icon: AtSign, tile: 'from-blue-400 to-indigo-600', tab: 'mentions' },
      { name: 'Activity log', blurb: 'Your recent creator actions in one timeline', icon: Activity, tile: 'from-violet-400 to-purple-600', tab: 'activity' },
      { name: 'Top Fan Badges', blurb: 'Award and manage Top Fan & Rising Fan badges for loyal engagers', icon: Award, tile: 'from-amber-400 to-orange-600', tab: 'community', sub: 'top_fans', modes: PERSONAL },
      { name: 'Comments & replies', blurb: 'Read and answer what people say on your posts', icon: MessagesSquare, tile: 'from-rose-400 to-pink-600', tab: 'community' },
      { name: 'Moderation Assist', blurb: 'Auto-hide spam links, bot comments & phone numbers', icon: ShieldCheck, tile: 'from-violet-500 to-purple-600', tab: 'community', sub: 'moderation_assist' },
      { name: 'Events', blurb: 'Host or find meetups, online or nearby', icon: CalendarHeart, tile: 'from-orange-400 to-red-500', to: '/events', modes: PERSONAL },
      { name: 'Comment filters', blurb: 'Hide comments with words you choose', icon: ShieldCheck, tile: 'from-violet-400 to-purple-600', to: '/settings?opt=cmt_hidden_words', modes: PERSONAL },
      { name: 'Inbox', blurb: 'Messages and comments for this Space in one inbox', icon: Inbox, tile: 'from-sky-400 to-blue-600', to: '/business/inbox', modes: SPACE },
    ],
  },
  {
    title: 'Create & publish',
    tools: [
      { name: 'A/B Testing', blurb: 'Split test captions & thumbnails to find what performs best', icon: Split, tile: 'from-indigo-500 to-purple-600', tab: 'ab_testing' },
      { name: 'Inspiration Hub', blurb: 'Trending audio tracks, breakout hashtags & daily prompts', icon: Sparkles, tile: 'from-pink-500 to-rose-600', tab: 'inspiration' },
      { name: 'Discover ideas', blurb: 'See what is trending for your next post', icon: Compass, tile: 'from-amber-300 to-yellow-500', to: '/explore', modes: PERSONAL },
      { name: 'Your library', blurb: 'Browse, edit or remove what you have published', icon: LibraryBig, tile: 'from-cyan-400 to-sky-600', tab: 'content_library' },
      { name: 'Playlists', blurb: 'Group Reels and videos into ordered collections', icon: ListVideo, tile: 'from-violet-400 to-indigo-600', tab: 'playlists' },
      { name: 'Content Analyze', blurb: 'Score captions and media before you post', icon: ScanSearch, tile: 'from-emerald-400 to-teal-600', tab: 'content_studio' },
      { name: 'Planner', blurb: 'Schedule posts on a calendar', icon: CalendarDays, tile: 'from-indigo-400 to-violet-600', tab: 'calendar' },
      { name: 'Batches', blurb: 'Queue and post many items at once', icon: Layers, tile: 'from-blue-400 to-indigo-600', tab: 'batch' },
      { name: 'Batch Upload', blurb: 'Create and schedule many posts for this Space', icon: UploadCloud, tile: 'from-blue-400 to-indigo-600', to: '/business/batch', modes: SPACE },
      { name: 'Brand Collabs', blurb: 'Brand deals and sponsorship pipeline', icon: Handshake, tile: 'from-fuchsia-400 to-pink-600', tab: 'brand_collab' },
      { name: 'Co-authors', blurb: 'Invite creators to co-author posts and reels', icon: Users, tile: 'from-pink-400 to-rose-600', tab: 'coauthor' },
    ],
  },
  {
    title: 'Earn',
    tools: [
      { name: 'Monetization', blurb: 'Your earning options and payouts', icon: BadgeDollarSign, tile: 'from-green-400 to-emerald-600', tab: 'monetization' },
      { name: 'Stars & Gifting', blurb: 'Star earnings, top supporters and goals', icon: Star, tile: 'from-amber-400 to-yellow-600', tab: 'monetization', sub: 'stars' },
      { name: 'Boost & promote', blurb: 'Soft-boost posts and reels to your network', icon: Megaphone, tile: 'from-amber-400 to-orange-500', tab: 'boost' },
      { name: 'Fan subscriptions', blurb: 'Manage paid memberships', icon: Repeat2, tile: 'from-teal-400 to-cyan-600', to: '/subscriptions', modes: PERSONAL },
      { name: 'Rewards & XP', blurb: 'Track your level, points and perks', icon: Gift, tile: 'from-yellow-400 to-orange-500', to: '/rewards', modes: PERSONAL },
      { name: 'Wallet', blurb: 'Balance, deposits and withdrawals', icon: Wallet, tile: 'from-lime-400 to-green-600', tab: 'monetization' },
      { name: 'Shop', blurb: 'Products and orders for this Space', icon: ShoppingBag, tile: 'from-fuchsia-400 to-pink-600', to: '/business/shop', modes: SPACE },
      { name: 'Ads', blurb: 'Promote this Space with paid campaigns', icon: Megaphone, tile: 'from-amber-400 to-orange-500', to: '/business/ads', modes: SPACE },
    ],
  },
  {
    title: 'Account & team',
    tools: [
      { name: 'Profile Recommendation', blurb: 'Check if your profile & content meet recommendation guidelines', icon: Sparkles, tile: 'from-emerald-400 to-teal-600', tab: 'security', sub: 'recommendation' },
      { name: 'Security & Copyright', blurb: 'Account safety, 2FA & copyright takedown protection', icon: ShieldAlert, tile: 'from-rose-500 to-red-600', tab: 'security', sub: 'security', modes: PERSONAL },
      { name: 'Team & roles', blurb: 'Who can post, reply and manage this Space', icon: UsersRound, tile: 'from-slate-400 to-slate-600', to: '/business/team', modes: SPACE },
      { name: 'Space settings', blurb: 'Business page settings', icon: Settings, tile: 'from-slate-400 to-slate-600', to: '/business/settings', modes: SPACE },
      { name: 'Learn & accounts', blurb: 'Creator tips plus linked social accounts', icon: GraduationCap, tile: 'from-indigo-400 to-violet-600', tab: 'learn' },
      { name: 'Connected accounts', blurb: 'Link your other social profiles', icon: Link2, tile: 'from-sky-400 to-cyan-600', to: '/settings?opt=acc_connected_accounts', modes: PERSONAL },
      { name: 'Insights', blurb: 'Reach, engagement and audience trends', icon: BarChart3, tile: 'from-blue-500 to-violet-600', tab: 'analytics' },
    ],
  },
  {
    title: 'Help',
    tools: [
      { name: 'Support tickets', blurb: 'Open and follow up on help requests', icon: Ticket, tile: 'from-emerald-400 to-green-600', to: '/business/support', modes: SPACE },
      { name: 'Help centre', blurb: 'Contact the Wevsoft team', icon: LifeBuoy, tile: 'from-blue-400 to-sky-600', to: '/support', modes: PERSONAL },
    ],
  },
];

/** Tool groups for one hub (empty groups dropped). Exported for tests. */
export function creatorToolGroupsForMode(mode: CreatorHubMode): Array<{ title: string; tools: Tool[] }> {
  return GROUPS.map((g) => ({
    title: g.title,
    tools: filterHubNav(
      g.tools.map((t) => ({ ...t, target: t.tab ? { tab: t.tab } : { to: t.to! } })),
      mode,
    ).map(({ target: _target, ...t }) => t as Tool),
  })).filter((g) => g.tools.length > 0);
}

function ToolRow({ icon: Icon, name, blurb, tile, external, onClick }: {
  icon: LucideIcon; name: string; blurb: string; tile: string; external: boolean; onClick: () => void;
}) {
  return (
    <HubRow
      icon={Icon}
      iconClassName={`bg-gradient-to-br text-white shadow-sm ${tile}`}
      title={name}
      description={blurb}
      onClick={onClick}
      trailing={external
        ? <ArrowUpRight size={16} className="shrink-0 text-muted-foreground" aria-label="Opens another page" />
        : <ChevronRight size={16} className="shrink-0 text-muted-foreground" />}
    />
  );
}

/** Personal hub: jump to a Space's own Creator Hub (Business Suite), or create a Space. */
function SwitchToSpaceSection() {
  const navigate = useNavigate();
  const { spaces } = useSpaceIdentities();
  return (
    <HubSection title="Business" flush>
      <ul className="divide-y divide-border">
        {spaces.length ? (
          spaces.map((s) => (
            <li key={s.id}>
              <ToolRow
                icon={Briefcase}
                tile="from-indigo-400 to-violet-600"
                name={`Switch to Space: ${s.name}`}
                blurb={`Open the Space ${CREATOR_HUB_NAME} in Business Suite`}
                external
                onClick={() => window.location.assign(spaceCreatorHubUrl(null, null, s.id))}
              />
            </li>
          ))
        ) : (
          <li>
            <ToolRow
              icon={Plus}
              tile="from-emerald-400 to-teal-600"
              name="Create a Space"
              blurb="Run a brand page with its own inbox, ads, team and Creator Hub"
              external
              onClick={() => navigate('/spaces/create')}
            />
          </li>
        )}
      </ul>
    </HubSection>
  );
}

/** Space hub: back to the signed-in person's own Creator Hub on the main app. */
function SwitchToPersonalSection() {
  return (
    <HubSection title="Personal" flush>
      <ul className="divide-y divide-border">
        <li>
          <ToolRow
            icon={UserRound}
            tile="from-sky-400 to-blue-600"
            name={`Personal ${CREATOR_HUB_NAME}`}
            blurb="Your own profile's creator tools, earnings and mentions"
            external
            onClick={() => window.location.assign(personalCreatorHubUrl())}
          />
        </li>
      </ul>
    </HubSection>
  );
}

export function CreatorToolsView({ onSelectTab }: { onSelectTab: (tab: CreatorTab, childId?: string | null) => void }) {
  const navigate = useNavigate();
  const mode = useCreatorHubMode();
  const groups = creatorToolGroupsForMode(mode);
  return (
    <div className="space-y-5">
      <HubPageHeader
        title="All tools"
        description={mode === 'space' ? 'Everything this Space can do, grouped by task.' : 'Everything you can do, grouped by task.'}
      />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <HubSection key={g.title} title={g.title} flush>
            <ul className="divide-y divide-border">
              {g.tools.map((t) => (
                <li key={t.name}>
                  <ToolRow
                    icon={t.icon}
                    tile={t.tile}
                    name={t.name}
                    blurb={t.blurb}
                    external={!t.tab}
                    onClick={() => {
                      if (t.tab) onSelectTab(t.tab, t.sub);
                      else if (!applyBusinessCreatorNav(t.to!, { navigate, selectTab: onSelectTab })) navigate(t.to!);
                    }}
                  />
                </li>
              ))}
            </ul>
          </HubSection>
        ))}
        {mode === 'space' ? <SwitchToPersonalSection /> : <SwitchToSpaceSection />}
      </div>
    </div>
  );
}
