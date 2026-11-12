/**
 * Ads Manager — WevSpace Manage section `promotion` (label: Ads).
 *
 * Hybrid layout: Overview tiles, a Meta-style campaigns table, an ads list, and
 * a create wizard with a live sponsored preview. Owners still cannot move a
 * campaign to ACTIVE; submit stops at PENDING_REVIEW. Nothing is charged.
 */

import React, { useState } from 'react';
import { Plus, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from '@wevsoft/shared/wevspace';
import {
  fetchAdsOverview,
  fetchCampaigns,
  fetchSpaceAds,
  transitionCampaign,
} from '../../../lib/wevspaceManageApi';
import { useManage } from './ManageContext';
import {
  ActionButton,
  EmptyState,
  PanelError,
  PanelHeader,
  PanelSkeleton,
  Pill,
  SegmentedTabs,
  statusTone,
  usePanelData,
} from './manageUi';
import AdsOverview from './ads/AdsOverview';
import AdsCampaignsTable from './ads/AdsCampaignsTable';
import AdsCreateWizard from './ads/AdsCreateWizard';
import AdsBillingPanel from './ads/AdsBillingPanel';
import AdsAnalytics from './ads/AdsAnalytics';
import AdsConversions from './ads/AdsConversions';

type ManagerTab = 'overview' | 'campaigns' | 'ads' | 'analytics' | 'conversions' | 'billing' | 'create';

export default function PromotionPanel() {
  const { space, spaceId, accent, can } = useManage();
  // A payment provider returns to ?billing=1&deposit=...&pay=...; open Billing so the
  // deposit gets confirmed instead of the return landing on Overview.
  const [tab, setTab] = useState<ManagerTab>(() =>
    new URLSearchParams(window.location.search).get('billing') === '1' ? 'billing' : 'overview',
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const canManage = can('promotion.manage');

  const overview = usePanelData(() => fetchAdsOverview(spaceId), [spaceId]);
  const campaigns = usePanelData(() => fetchCampaigns(spaceId, { limit: 50 }), [spaceId, tab]);
  const ads = usePanelData(() => fetchSpaceAds(spaceId, { limit: 50 }), [spaceId, tab]);

  async function toggle(campaign: any, next: CampaignStatus) {
    setBusyId(campaign.id);
    try {
      await transitionCampaign(campaign.id, next);
      toast.success(`“${campaign.name}” is now ${CAMPAIGN_STATUS_LABELS[next].toLowerCase()}`);
      await campaigns.reload();
      await overview.reload();
    } catch (err: any) {
      toast.error(err?.message || 'Could not change that campaign');
    } finally {
      setBusyId(null);
    }
  }

  function afterCreate() {
    setTab('campaigns');
    void campaigns.reload();
    void overview.reload();
    void ads.reload();
  }

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Ads"
        blurb="Create sponsored placements, fund your Ads wallet, and submit campaigns for review. Delivery starts after approval and budget reservation."
        actions={
          canManage ? (
            <ActionButton tone="accent" accent={accent} onClick={() => setTab('create')}>
              <Plus size={14} /> Create
            </ActionButton>
          ) : undefined
        }
      />

      <SegmentedTabs
        options={[
          { id: 'overview', label: 'Overview' },
          { id: 'campaigns', label: 'Campaigns' },
          { id: 'ads', label: 'Ads' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'conversions', label: 'Conversions' },
          { id: 'billing', label: 'Billing' },
          { id: 'create', label: 'Create' },
        ]}
        value={tab}
        onChange={setTab}
        accent={accent}
      />

      {tab === 'overview' && (
        <>
          {overview.loading && <PanelSkeleton />}
          {overview.error && <PanelError message={overview.error} onRetry={overview.reload} />}
          {overview.data && (
            <AdsOverview overview={overview.data} accent={accent} onCreate={() => setTab('create')} />
          )}
        </>
      )}

      {tab === 'campaigns' && (
        <>
          {campaigns.loading && <PanelSkeleton />}
          {campaigns.error && <PanelError message={campaigns.error} onRetry={campaigns.reload} />}
          {campaigns.data && (
            <AdsCampaignsTable
              campaigns={campaigns.data.campaigns || []}
              accent={accent}
              canManage={campaigns.data.canManage ?? canManage}
              busyId={busyId}
              onToggle={toggle}
              onEdit={() => setTab('create')}
            />
          )}
        </>
      )}

      {tab === 'ads' && (
        <>
          {ads.loading && <PanelSkeleton />}
          {ads.error && <PanelError message={ads.error} onRetry={ads.reload} />}
          {ads.data && (ads.data.ads || []).length === 0 && (
            <EmptyState icon={<Megaphone size={18} />} title="No ads yet" blurb="Create a campaign and its first ad will show up here." />
          )}
          {ads.data && (ads.data.ads || []).length > 0 && (
            <div className="space-y-2">
              {ads.data.ads.map((ad: any) => (
                <div key={ad.id} className="rounded-3xl border border-border bg-card px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold truncate">{ad.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {ad.placement} · {ad.campaign?.name || 'Campaign'}
                    </p>
                  </div>
                  <Pill tone={statusTone(ad.status)}>{ad.status}</Pill>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'analytics' && <AdsAnalytics accent={accent} />}

      {tab === 'conversions' && <AdsConversions accent={accent} />}

      {tab === 'billing' && <AdsBillingPanel accent={accent} />}

      {tab === 'create' && (
        <AdsCreateWizard
          spaceId={spaceId}
          accent={accent}
          spaceName={space?.name || 'WevSpace'}
          spaceAvatar={space?.avatar}
          canManage={canManage}
          onDone={afterCreate}
        />
      )}
    </div>
  );
}
