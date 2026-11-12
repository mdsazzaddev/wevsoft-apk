import React, { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchAdsAnalytics } from '../../../../lib/wevspaceManageApi';
import { useManage } from '../ManageContext';
import { Card, PanelError, PanelSkeleton, SegmentedTabs, StatTile, usePanelData } from '../manageUi';

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  fontSize: '11px',
} as const;

export default function AdsAnalytics({ accent }: { accent?: string }) {
  const { spaceId } = useManage();
  const [range, setRange] = useState('30d');
  const data = usePanelData(() => fetchAdsAnalytics(spaceId, { range }), [spaceId, range]);

  const series = useMemo(() => data.data?.series || [], [data.data]);
  const placements = useMemo(
    () =>
      Object.entries(data.data?.placements || {}).map(([name, v]: [string, any]) => ({
        name,
        impressions: v.impressions,
        clicks: v.clicks,
        spend: v.spend,
      })),
    [data.data],
  );
  const campaigns = useMemo(() => data.data?.campaigns || [], [data.data]);
  const variants = useMemo(
    () =>
      Object.entries(data.data?.variants || {}).map(([name, v]: [string, any]) => ({
        name,
        impressions: v.impressions,
        clicks: v.clicks,
        ctr: v.ctr,
        insight: v.insight,
      })),
    [data.data],
  );

  if (data.loading) return <PanelSkeleton />;
  if (data.error) return <PanelError message={data.error} onRetry={data.reload} />;
  const ov = data.data?.overview;
  const color = accent || 'var(--primary)';
  const unavailable = ov?.unavailable || {};

  return (
    <div className="space-y-4">
      <SegmentedTabs
        options={[
          { id: '7d', label: '7 days' },
          { id: '30d', label: '30 days' },
          { id: '90d', label: '90 days' },
        ]}
        value={range}
        onChange={setRange}
        accent={accent}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatTile label="Spend" value={ov?.spend ?? 0} accent={accent} />
        <StatTile label="Impressions" value={ov?.impressions ?? 0} />
        <StatTile label="Clicks" value={ov?.clicks ?? 0} />
        <StatTile label="CTR" value={`${ov?.ctr ?? 0}%`} />
        <StatTile label="CPC" value={(ov as any)?.cpc == null ? 'Unavailable' : (ov as any).cpc} />
        <StatTile label="CPM" value={(ov as any)?.cpm == null ? 'Unavailable' : (ov as any).cpm} />
        <StatTile label="CPV" value={(unavailable as any).cpv || (ov as any)?.cpv == null ? 'Unavailable' : (ov as any).cpv} />
        <StatTile
          label="Conversions"
          value={ov?.conversions ?? 0}
          hint={unavailable.roas ? 'ROAS unavailable until verified conversions exist' : `ROAS ${ov?.roas ?? '—'}`}
        />
      </div>
      {data.data?.abInsight === 'insufficient_data' && (
        <p className="text-[11px] text-muted-foreground">
          A/B comparison needs more impressions before a winner can be suggested.
        </p>
      )}
      <Card>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-3">Delivery</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="impressions" stroke={color} fill={color} fillOpacity={0.15} />
              <Area type="monotone" dataKey="clicks" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
              <Area type="monotone" dataKey="spend" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {campaigns.length > 1 && (
        <Card>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-3">Campaigns</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaigns}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="impressions" fill={color} radius={6} />
                <Bar dataKey="clicks" fill="#94a3b8" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      {placements.length > 0 && (
        <Card>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-3">Placements</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={placements}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="impressions" fill={color} radius={6} />
                <Bar dataKey="clicks" fill="#94a3b8" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
      {variants.length > 0 && (
        <Card>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-3">Creative variants</p>
          <ul className="space-y-2">
            {variants.map((v) => (
              <li key={v.name} className="flex justify-between text-sm">
                <span className="font-bold">Variant {v.name}</span>
                <span className="text-muted-foreground">
                  {v.impressions} imps · {v.clicks} clicks · {v.ctr}% CTR
                  {v.insight === 'insufficient_data' ? ' · insufficient data' : ''}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
