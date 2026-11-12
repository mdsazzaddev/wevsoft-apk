import React from 'react';
import { Eye, MousePointerClick, PauseCircle, PlayCircle, Wallet } from 'lucide-react';
import { Pill, StatTile, money, num, statusTone } from '../manageUi';

export default function AdsOverview({
  overview,
  accent,
  onCreate,
}: {
  overview: {
    account: { status: string; currency: string; timezone: string };
    spend: number;
    currency: string;
    activeCount: number;
    adCount: number;
    impressions: number;
    reach: number;
    clicks: number;
    ctr: number;
    cpc?: number | null;
    cpm?: number | null;
    remainingBudget?: number;
    availableBalance?: number;
    reservedBalance?: number;
    balance: number;
    spendIsSimulated: boolean;
    canManage: boolean;
  };
  accent?: string;
  onCreate?: () => void;
}) {
  const currency = overview.currency || overview.account.currency || 'BDT';
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={statusTone(overview.account.status)}>{overview.account.status}</Pill>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile
          label="Available"
          value={money(overview.availableBalance ?? overview.balance, currency)}
          hint={`Reserved ${money(overview.reservedBalance ?? 0, currency)}`}
          icon={<Wallet size={16} />}
          accent={accent}
        />
        <StatTile label="Spend" value={money(overview.spend, currency)} icon={<MousePointerClick size={16} />} accent={accent} />
        <StatTile
          label="Active campaigns"
          value={num(overview.activeCount)}
          hint={`${num(overview.adCount)} ads · left ${money(overview.remainingBudget ?? 0, currency)}`}
          icon={<PlayCircle size={16} />}
          accent={accent}
        />
        <StatTile
          label="Impressions"
          value={num(overview.impressions)}
          hint={`${num(overview.reach)} reach · ${overview.ctr.toFixed(2)}% CTR`}
          icon={<Eye size={16} />}
          accent={accent}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile label="Clicks" value={num(overview.clicks)} icon={<MousePointerClick size={16} />} />
        <StatTile label="CPC" value={overview.cpc == null ? '—' : money(overview.cpc, currency)} />
        <StatTile
          label="CPM"
          value={overview.cpm == null ? '—' : money(overview.cpm, currency)}
          icon={<PauseCircle size={16} />}
          onClick={onCreate}
        />
      </div>
    </div>
  );
}
