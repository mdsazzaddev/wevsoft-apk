/** WevDesk Home — the reference dashboard, every tile wired to real Space data or an honest empty value. */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { resolveSpaceAccent, spaceTypeLabel } from '@wevsoft/shared/wevspace';
import { useConnectedPlatforms } from '../developer/console/consoleData';
import { useDeveloperApps, useDeveloperMe } from '../developer/devApi';
import { fetchInboxAutomation } from '../../lib/wevspaceManageApi';
import { useStore } from '../../store';
import { useDesk } from './deskContext';
import { money, useDeskData, weekCalendar } from './deskData';
import { Chip, DeskButton, DeskCard, Hint, Num, Pill, Row, SOON, Toggle, cx, fmtNum } from './deskUi';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PLATFORMS: Array<{ id: string; label: string }> = [
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'x', label: 'X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'tiktok', label: 'TikTok' },
];

export default function WevDeskHome() {
  const desk = useDesk();
  const { space, overview, deskPath, managePath, spaceId } = desk;
  const navigate = useNavigate();
  const user = useStore((s) => s.user) as any;
  const counts = overview.counts || {};
  const data = useDeskData();
  const automation = useQuery({
    queryKey: ['wevdesk', 'automation', spaceId],
    queryFn: () => fetchInboxAutomation(spaceId),
    enabled: Boolean(spaceId),
    staleTime: 60_000,
  });
  const autoCfg = automation.data?.config;
  const autoOn = autoCfg
    ? [autoCfg.instantReply.enabled, autoCfg.welcome.enabled, autoCfg.away.enabled, autoCfg.keywords.enabled].filter(Boolean).length
    : 0;
  const autoRules = automation.data?.rules?.length || 0;
  const connected = useConnectedPlatforms();
  const devMe = useDeveloperMe();
  const devApps = useDeveloperApps(Boolean(devMe.data?.registered));
  const [insightTab, setInsightTab] = useState<'reach' | 'engagement' | 'sales'>('reach');

  const totals = data.insights.data?.totals || null;
  const reach = totals ? totals.uniqueViewers || totals.views || 0 : 0;
  const engagement = totals ? totals.engagements || 0 : 0;
  const openThreads = counts.openThreads || 0;
  const unread = counts.unreadThreads || 0;
  const calendar = useMemo(() => weekCalendar(data.content.data?.posts), [data.content.data]);
  const statusCounts = data.inbox.data?.statusCounts || null;
  const contacts = statusCounts ? Object.values(statusCounts).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0;
  const products = (data.offerings.data?.offerings || []).filter((o) => o.kind === 'PRODUCT').length || (data.offerings.data?.offerings || []).length;
  const services = (data.offerings.data?.offerings || []).filter((o) => o.kind === 'SERVICE' || o.kind === 'PACKAGE').length;
  const teammates = (data.team.data?.members || []).filter((m: any) => m.status === 'ACTIVE').length;
  const earnings = data.money.data?.earnings;
  const payouts = data.money.data?.payouts || [];
  const subscribers = (data.money.data?.tiers || []).reduce((a: number, t: any) => a + (Number(t.subscriberCount ?? t.subscribers ?? t.activeSubscribers) || 0), 0);
  const reviewAvg = data.reviews.data?.average || 0;
  const reviewTotal = data.reviews.data?.total || 0;
  const accent = resolveSpaceAccent(space);
  const platformsBy = new Map((connected.data || []).map((p) => [String(p.platform).toLowerCase(), p]));
  const isConnected = (id: string) => Boolean(platformsBy.get(id)?.isConnected || (id === 'x' && platformsBy.get('twitter')?.isConnected));
  const oauthApps = devApps.data?.length || 0;
  const series: any[] = data.insights.data?.series || [];
  const chartKey = insightTab === 'reach' ? 'uniqueViewers' : 'engagements';
  const chartValues = insightTab === 'sales' ? [] : series.map((d) => Number(d[chartKey] ?? (insightTab === 'reach' ? d.views : 0)) || 0);
  const chartMax = Math.max(0, ...chartValues);
  const today = (new Date().getDay() + 6) % 7;

  const category = space.category || spaceTypeLabel(space.spaceType);
  const location = space.location || space.address || null;
  const contact = space.website || space.contactEmail || space.contactPhone || null;
  const hasHours = Boolean(space.businessHours && typeof space.businessHours === 'object');
  const languages: string[] = Array.isArray(space.languages) ? space.languages : space.language ? [String(space.language)] : [];

  const stat = (label: string, value: number, sub: string, to?: string) => (
    <Link to={to || '#'} onClick={(e) => !to && e.preventDefault()} className={cx('wd-card px-[18px] py-4 block', to && 'hover:border-[#d6dbe2]')}>
      <p className="text-[12px] text-[var(--wd-text-2)]">{label}</p>
      <p className="mt-1.5 text-[26px] leading-none font-bold text-[var(--wd-text)] tabular-nums">{fmtNum(value)}</p>
      <p className="mt-1.5 text-[11.5px] text-[var(--wd-muted)]">{sub}</p>
    </Link>
  );

  return (
    <div className="px-3 sm:px-5 pb-8 pt-2 space-y-4 max-w-[1600px]">
      {/* Welcome */}
      <section className="wd-card p-[18px] sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.01em] text-[var(--wd-text)]">Welcome back, {space.name}</h1>
            <p className="text-[12px] text-[var(--wd-muted)]">
              WevSpace · Followers: {fmtNum(counts.followers || 0)} · Your desk is ready
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span title={user?.name ? `Signed in as ${user.name}` : undefined} className="hidden sm:inline-flex items-center gap-2 h-[38px] min-w-[96px] px-3 rounded-[10px] border border-[var(--wd-btn-border)] bg-white text-[12px] text-[var(--wd-muted)]">
              <span className="w-2 h-2 rounded-full" style={{ background: accent }} />@{space.handle}
            </span>
            <DeskButton to={deskPath('content-studio')} className="h-[38px]">Create Reel</DeskButton>
            <DeskButton to={deskPath('workflows')} className="h-[38px]">Automations</DeskButton>
          </div>
        </div>
        <div className="mt-3 rounded-[12px] bg-[var(--wd-ai-soft)] px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--wd-ai-text)]">
            <Sparkles size={15} /> Ask Wev AI to do it for you
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 pl-[22px]">
            {[
              { label: "Write this week's posts", to: '/ai/post' },
              { label: 'Reply to open messages', to: deskPath('inbox') },
              { label: 'Set away & keyword replies', to: deskPath('workflows') },
              { label: 'Summarize my insights', to: deskPath('insights') },
            ].map((s) => (
              <Link key={s.label} to={s.to} className="text-[11.5px] text-[var(--wd-ai-text)] hover:underline underline-offset-2">
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {stat('Reach', reach, reach > 0 ? 'Unique viewers · 28 days' : data.canInsights ? 'No data yet' : 'No access to insights', data.canInsights ? deskPath('insights') : undefined)}
        {stat('Engagement', engagement, engagement > 0 ? 'Interactions · 28 days' : data.canInsights ? 'No data yet' : 'No access to insights', data.canInsights ? deskPath('insights') : undefined)}
        {stat('Open conversations', openThreads, unread > 0 ? `${fmtNum(unread)} unread` : "You're up to date", deskPath('inbox'))}
        {stat('Orders', 0, 'No data yet')}
      </div>

      {/* Content calendar */}
      <section className="wd-card p-[18px]">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={deskPath('planner')} className="flex-1 text-[15px] font-semibold text-[var(--wd-text)] hover:underline underline-offset-2">
            Content calendar
          </Link>
          <Pill>Best time: set by AI after your first posts</Pill>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2 overflow-x-auto">
          {DAYS.map((d, i) => (
            <div key={d} className={cx('min-w-[96px] min-h-[104px] rounded-[10px] p-2', i === today ? 'bg-[#eef6f4] ring-1 ring-[#cfe7e1]' : 'bg-[#f3f5f8]')}>
              <p className="text-[11px] text-[var(--wd-muted)]">{d}</p>
              <div className="mt-1.5 space-y-1">
                {calendar[i].slice(0, 3).map((it) => (
                  <Link key={it.id} to={managePath('content')} className="block rounded-[8px] bg-white px-2 py-1.5 text-[11px] text-[var(--wd-text)] truncate shadow-[0_1px_0_rgba(13,20,33,0.04)]">
                    {it.label}
                  </Link>
                ))}
                {calendar[i].length > 3 && <p className="text-[10.5px] text-[var(--wd-muted)]">+{calendar[i].length - 3} more</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tile grid */}
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DeskCard title="Unified inbox" to={deskPath('inbox')}>
          <div className="flex flex-wrap gap-1.5">
            <Chip active onClick={() => navigate(deskPath('inbox'))}>All</Chip>
            <Chip onClick={() => navigate(deskPath('inbox'))}>WevChat</Chip>
            <Chip onClick={() => window.open('/developer/integrations/social', '_blank', 'noopener')} title="Facebook inbox are not merged into Chat yet. Connect the account in Social platforms">Facebook</Chip>
            <Chip onClick={() => window.open('/developer/integrations/social', '_blank', 'noopener')} title="Instagram DMs are not merged into Chat yet. Connect the account in Social platforms">Instagram</Chip>
            <Chip onClick={() => window.open('/developer/integrations/social', '_blank', 'noopener')} title="YouTube comments are not merged into Chat yet. Connect the account in Social platforms">YouTube</Chip>
          </div>
          <div className="mt-2">
            <Row label={<Link to={deskPath('ai-agents')} className="hover:underline underline-offset-2">AI auto-reply for common questions</Link>} tall>
              <Toggle disabled title={`${SOON}. Welcome / away auto-replies already work from Automations + Saved replies.`} />
            </Row>
            <Row label={<Link to={deskPath('ai-agents')} className="hover:underline underline-offset-2">Hand over to a teammate when unsure</Link>} tall>
              <Toggle disabled title={SOON} />
            </Row>
          </div>
          {(data.inbox.data?.threads || []).length > 0 && (
            <ul className="mt-1 mb-1 space-y-1">
              {(data.inbox.data?.threads || []).map((t: any) => (
                <li key={t.id}>
                  <Link to={`${deskPath('inbox')}?c=${t.id}`} className="flex items-center gap-2 rounded-[8px] px-1.5 py-1 hover:bg-[#f5f6f8]">
                    <span className="flex-1 min-w-0 truncate text-[12px] text-[var(--wd-text-2)]">
                      <b className="font-semibold">{t.customer?.name || t.customer?.username || 'Someone'}</b>
                      {t.preview?.text ? ` · ${t.preview.text}` : ''}
                    </span>
                    {(t.unreadCount || 0) > 0 && <span className="w-2 h-2 rounded-full bg-[var(--wd-teal)]" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto pt-2 flex items-center justify-between">
            <Hint to={deskPath('inbox')}>{unread > 0 ? `${fmtNum(unread)} unread conversation${unread === 1 ? '' : 's'}` : 'No new messages'}</Hint>
            {unread > 0 ? <Pill tone="grey">{fmtNum(unread)} new</Pill> : <Pill>Up to date</Pill>}
          </div>
        </DeskCard>

        <DeskCard title="Inbox automations" subtitle="Instant, welcome/FAQ, away & keyword replies" to={deskPath('workflows')}>
          <Row label="Features on"><Num value={autoOn} /> <span className="text-[11px] text-[var(--wd-muted)]">/ 4</span></Row>
          <Row label="Keyword rules"><Num value={autoRules} /></Row>
          <Row label="Away message">
            {autoCfg?.away.enabled ? (
              <Pill tone={autoCfg.away.manualAway ? 'green' : 'grey'}>
                {autoCfg.away.manualAway ? 'Manual away' : 'On'}
              </Pill>
            ) : (
              <Hint to={deskPath('workflows')}>Off — set up</Hint>
            )}
          </Row>
          <div className="pt-2"><DeskButton to={deskPath('workflows')}>Open automations</DeskButton></div>
        </DeskCard>

        <DeskCard title="Commerce" to={deskPath('commerce')}>
          <Row label="Products"><Num value={fmtNum(products)} /></Row>
          <Row label={<Link to="/seller/dashboard" className="hover:underline underline-offset-2">Pending orders</Link>}><Num value={0} /></Row>
          <Row label="Low stock alerts"><Num value={0} /></Row>
          <div className="pt-2"><DeskButton to={deskPath('commerce')}>Add product</DeskButton></div>
        </DeskCard>

        <DeskCard title="Team & hiring" to={deskPath('team')}>
          <Row label="Owner">{overview.isOwner ? <Pill>You</Pill> : <Hint>{data.team.data?.owner?.name || '—'}</Hint>}</Row>
          <Row label="Editors & moderators">{teammates > 0 ? <Num value={teammates} /> : <Hint to={deskPath('team')}>Invite teammates</Hint>}</Row>
          <Row label={<Link to="/jobs" className="hover:underline underline-offset-2">Open roles</Link>}><Num value={0} /></Row>
          <div className="pt-2"><DeskButton to="/jobs/create">Post a job</DeskButton></div>
        </DeskCard>

        <DeskCard title="Creator hub" to={deskPath('creator-hub')}>
          <Row label="Courses"><Hint to={deskPath('creator-hub')}>Start a course</Hint></Row>
          <Row label="Events & tickets">{(counts.upcomingEvents || 0) > 0 ? <Num value={counts.upcomingEvents} /> : <Hint to={managePath('events')}>Create an event</Hint>}</Row>
          <Row label="Subscribers"><Num value={fmtNum(subscribers)} /></Row>
        </DeskCard>

        <DeskCard title="Connected platforms" subtitle="Sign in once, post everywhere" to="/developer/integrations/social">
          <div className="flex flex-wrap gap-2 pt-1">
            {PLATFORMS.map((p) =>
              isConnected(p.id) ? (
                <DeskButton key={p.id} to="/developer/integrations/social" title={`${p.label} is connected`} className="border-[#bfe3d3] bg-[#f1faf6] text-[var(--wd-green)]">
                  ✓ {p.label}
                </DeskButton>
              ) : (
                <DeskButton key={p.id} to="/developer/integrations/social">Connect {p.label}</DeskButton>
              ),
            )}
          </div>
        </DeskCard>

        <DeskCard title="Insights" to={data.canInsights ? deskPath('insights') : undefined}>
          <div className="flex gap-1.5">
            <Chip active={insightTab === 'reach'} onClick={() => setInsightTab('reach')}>Reach</Chip>
            <Chip active={insightTab === 'engagement'} onClick={() => setInsightTab('engagement')}>Engagement</Chip>
            <Chip active={insightTab === 'sales'} onClick={() => setInsightTab('sales')}>Sales</Chip>
          </div>
          {chartMax > 0 ? (
            <div className="mt-3 h-[72px] flex items-end gap-[3px]">
              {chartValues.slice(-28).map((v, i) => (
                <span key={i} title={String(v)} className="flex-1 rounded-t-[3px] bg-[var(--wd-teal)]" style={{ height: `${Math.max(4, (v / chartMax) * 100)}%`, opacity: 0.35 + 0.65 * (v / chartMax) }} />
              ))}
            </div>
          ) : (
            <div className="mt-auto pt-10 flex gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="flex-1 h-[5px] rounded-full bg-[#e6e9ee]" />
              ))}
            </div>
          )}
          <p className="mt-2.5 text-[11.5px] text-[var(--wd-muted)]">
            {!data.canInsights
              ? 'Your role does not include insights.'
              : chartMax > 0
                ? `Last 28 days · ${insightTab === 'reach' ? `${fmtNum(reach)} unique viewers` : `${fmtNum(engagement)} interactions`}`
                : insightTab === 'sales'
                  ? 'Sales charts appear once orders come in.'
                  : 'Charts appear after your first posts. AI writes the summary.'}
          </p>
        </DeskCard>

        <DeskCard title="Ads & promotions" to={deskPath('ads')}>
          <Row label={(counts.activeCampaigns || 0) > 0 ? `Boost a post · ${counts.activeCampaigns} active` : 'Boost a post'}>
            <DeskButton to={deskPath('ads')}>Boost</DeskButton>
          </Row>
          <Row label="Audience builder"><Hint to={deskPath('ads')}>Location, age, interests</Hint></Row>
          <Row label="Daily budget"><Hint to={deskPath('ads')}>Set limit</Hint></Row>
          <Row label="Coupons & offers"><DeskButton to="/seller/dashboard" title="Coupons are managed in the Seller dashboard">Create</DeskButton></Row>
        </DeskCard>

        <DeskCard title="Customers (CRM)" to={deskPath('crm')}>
          <Row label="Contacts"><Num value={fmtNum(contacts)} /></Row>
          <Row label="Segments & tags"><Hint to={deskPath('crm')}>Create segment</Hint></Row>
          <Row label="Support tickets"><Hint to="/business/support">Open tickets</Hint></Row>
          <Row label="Broadcast message"><DeskButton to={deskPath('broadcast')}>Compose</DeskButton></Row>
          <Row label="Import contacts (CSV)"><DeskButton to={deskPath('crm')}>Import</DeskButton></Row>
        </DeskCard>

        <DeskCard title="Payments & invoices" to={data.canMoney ? deskPath('payments') : undefined}>
          <p className="text-[24px] font-bold leading-tight text-[var(--wd-text)] tabular-nums">{money(earnings?.availableBalance, earnings?.currency)}</p>
          <p className="text-[11.5px] text-[var(--wd-muted)] mb-1">{data.canMoney ? 'Available balance' : 'Available balance · no access'}</p>
          <Row label="Payment methods"><Hint>bKash · Nagad · Card</Hint></Row>
          <Row label="Invoices"><DeskButton to={deskPath('invoices')}>New invoice</DeskButton></Row>
          <Row label="Payouts"><Hint to={data.canMoney ? deskPath('payments') : undefined}>{payouts.length > 0 ? `${payouts.length} payout${payouts.length === 1 ? '' : 's'}` : 'None yet'}</Hint></Row>
        </DeskCard>

        <DeskCard title="Bookings" to={deskPath('bookings')}>
          <Row label="Today"><Num value={0} /></Row>
          <Row label={services > 0 ? `Services & pricing · ${services}` : 'Services & pricing'}><DeskButton to={deskPath('commerce')}>Add service</DeskButton></Row>
          <Row label="Availability"><Hint to={deskPath('bookings')} title="Business hours from Space settings">{hasHours ? 'Weekly hours set' : 'Set weekly hours'}</Hint></Row>
          <Row label={<Link to={deskPath('bookings')} className="hover:underline underline-offset-2">Reminders by WevChat</Link>} tall><Toggle disabled title={SOON} /></Row>
        </DeskCard>

        <DeskCard title="Reviews & reputation" to={deskPath('reviews')}>
          <Row label="Average rating"><Num value={reviewTotal > 0 && reviewAvg > 0 ? `${reviewAvg.toFixed(1)} ★` : '–'} /></Row>
          <Row label="New reviews"><Num value={fmtNum(counts.unansweredReviews || 0)} /></Row>
          <Row label={<Link to={deskPath('ai-agents')} className="hover:underline underline-offset-2">AI drafts replies</Link>} tall><Toggle disabled title={SOON} /></Row>
          <Row label="Ask customers for a review"><DeskButton to={`${deskPath('broadcast')}?template=review`}>Send request</DeskButton></Row>
        </DeskCard>

        <DeskCard title="AI agents" subtitle="Model: Auto · Bring your own key" to={deskPath('ai-agents')}>
          <Row label="Model & your own API key"><Hint to="/developer/integrations/ai">AI providers</Hint></Row>
          <Row label="Support agent" tall><Toggle disabled title={`${SOON}. Configure agents in Business → AI agents.`} /></Row>
          <Row label="Sales agent" tall><Toggle disabled title={SOON} /></Row>
          <Row label="Content agent" tall><Toggle disabled title={SOON} /></Row>
          <Row label="Knowledge base (RAG)"><DeskButton to={deskPath('ai-agents')}>Set up</DeskButton></Row>
        </DeskCard>

        <DeskCard title="Business profile" to={deskPath('settings')}>
          <Row label="Name & category"><Hint>{[space.name, category].filter(Boolean).join(' · ')}</Hint></Row>
          <Row label="Opening hours">{hasHours ? <Hint to={deskPath('settings')}>Set ✓</Hint> : <Hint to={deskPath('settings')}>Set hours</Hint>}</Row>
          <Row label="Location & service area"><Hint to={deskPath('settings')}>{location ? String(location) : 'Add address'}</Hint></Row>
          <Row label="Contact & website"><Hint to={deskPath('settings')}>{contact ? String(contact) : 'Add details'}</Hint></Row>
        </DeskCard>

        <DeskCard title="Brand kit" to={deskPath('brand-kit')}>
          <div className="flex gap-2 pb-2.5">
            <span title={`Space accent ${accent}`} className="w-[34px] h-[34px] rounded-[9px]" style={{ background: accent }} />
            {['#5b4fd6', '#0d1421', '#eef0f4'].map((c) => (
              <span key={c} title="Brand palette slot — editable in the next phase" className="w-[34px] h-[34px] rounded-[9px] border border-[var(--wd-border)]" style={{ background: c }} />
            ))}
          </div>
          <Row label="Logo & fonts"><DeskButton to={deskPath('brand-kit')}>Upload</DeskButton></Row>
          <Row label="Tone of voice"><Hint>{languages.length ? languages.join(' · ') : 'Bangla · English'}</Hint></Row>
        </DeskCard>

        <DeskCard title="Integrations & API" to={deskPath('integrations')}>
          <Row label="n8n & webhooks"><Link to="/developer/webhooks" target="_blank" rel="noopener noreferrer"><Pill>Ready</Pill></Link></Row>
          <Row label="API keys"><DeskButton to="/developer/credentials">Create key</DeskButton></Row>
          <Row label={`OAuth apps (Developer Portal)${oauthApps ? ` · ${oauthApps}` : ''}`}><DeskButton to="/developer/oauth/clients">Open</DeskButton></Row>
        </DeskCard>

        <DeskCard title="Security & roles" to={managePath('security')}>
          <Row label={<Link to="/settings" className="hover:underline underline-offset-2">Two-step login</Link>} tall><Toggle disabled title="Turn on two-step login in Settings → Security" /></Row>
          <Row label="Roles & permissions"><DeskButton to={deskPath('team')}>Manage</DeskButton></Row>
          <Row label="Activity log"><DeskButton to={managePath('activity')}>View</DeskButton></Row>
        </DeskCard>

        <DeskCard title="Billing & plan" to={deskPath('billing')}>
          <Row label="Current plan"><Pill>Free</Pill></Row>
          <Row label="AI credits"><Num value={0} /></Row>
          <Row label="Upgrade for more agents"><DeskButton to={deskPath('billing')} className="min-w-[96px]">See plans</DeskButton></Row>
        </DeskCard>
      </div>
    </div>
  );
}
