import React from 'react';
import { CAMPAIGN_OWNER_TRANSITIONS, CAMPAIGN_STATUS_LABELS, type CampaignStatus } from '@wevsoft/shared/wevspace';
import { ActionButton, Pill, money, num, statusTone } from '../manageUi';

function ctrLabel(clicks: unknown, impressions: unknown) {
  const c = Number(clicks) || 0;
  const i = Number(impressions) || 0;
  if (i <= 0) return '—';
  return `${((c / i) * 100).toFixed(2)}%`;
}

function canToggleServing(status: CampaignStatus) {
  return status === 'ACTIVE' || status === 'PAUSED';
}

export default function AdsCampaignsTable({
  campaigns,
  accent,
  canManage,
  busyId,
  onToggle,
  onEdit,
}: {
  campaigns: any[];
  accent?: string;
  canManage: boolean;
  busyId?: string | null;
  onToggle: (campaign: any, next: CampaignStatus) => void;
  onEdit?: (campaign: any) => void;
}) {
  if (!campaigns.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">
        No campaigns yet. Create one to promote this WevSpace.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted/60 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2.5 w-14">On</th>
            <th className="px-3 py-2.5">Campaign</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Dates</th>
            <th className="px-3 py-2.5">Spent</th>
            <th className="px-3 py-2.5">Clicks</th>
            <th className="px-3 py-2.5">CTR</th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const status = campaign.status as CampaignStatus;
            const serving = canToggleServing(status);
            const on = status === 'ACTIVE';
            const nextOff: CampaignStatus = 'PAUSED';
            const nextOn: CampaignStatus = 'ACTIVE';
            const ownerMoves = CAMPAIGN_OWNER_TRANSITIONS[status] || [];
            return (
              <tr key={campaign.id} className="border-t border-border">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    disabled={!canManage || !serving || busyId === campaign.id || (on ? !ownerMoves.includes(nextOff) : !ownerMoves.includes(nextOn))}
                    onClick={() => onToggle(campaign, on ? nextOff : nextOn)}
                    className={`relative w-10 h-6 rounded-full transition-colors disabled:opacity-40 ${on ? '' : 'bg-muted'}`}
                    style={on ? { background: accent || 'var(--primary)' } : undefined}
                    title={serving ? (on ? 'Pause' : 'Resume') : 'On/off is only for approved campaigns that can serve'}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow ${on ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                </td>
                <td className="px-3 py-3">
                  <p className="font-extrabold">{campaign.name}</p>
                  <p className="text-[11px] text-muted-foreground">{campaign.objective}</p>
                </td>
                <td className="px-3 py-3">
                  <Pill tone={statusTone(status)}>{CAMPAIGN_STATUS_LABELS[status] || status}</Pill>
                </td>
                <td className="px-3 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                  {campaign.startsAt ? new Date(campaign.startsAt).toLocaleDateString() : '—'}
                  {' → '}
                  {campaign.endsAt ? new Date(campaign.endsAt).toLocaleDateString() : `${campaign.durationDays || '—'}d`}
                </td>
                <td className="px-3 py-3 tabular-nums font-bold">{money(campaign.spent, campaign.currency)}</td>
                <td className="px-3 py-3 tabular-nums">{num(campaign.clicks)}</td>
                <td className="px-3 py-3 tabular-nums">{ctrLabel(campaign.clicks, campaign.impressions)}</td>
                <td className="px-3 py-3 text-right">
                  {canManage && campaign.editable && onEdit ? (
                    <ActionButton size="sm" onClick={() => onEdit(campaign)}>
                      Edit
                    </ActionButton>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
