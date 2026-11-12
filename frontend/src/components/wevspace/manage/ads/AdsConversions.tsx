import React, { useMemo, useState } from 'react';
import { AD_CONVERSION_KINDS, AD_CONVERSION_KIND_LABELS, type AdConversionKind } from '@wevsoft/shared/wevspace';
import toast from 'react-hot-toast';
import { fetchAdsConversions, saveAdsConversionPixel } from '../../../../lib/wevspaceManageApi';
import { useManage } from '../ManageContext';
import { ActionButton, Card, PanelError, PanelSkeleton, Pill, ToggleRow, statusTone, usePanelData } from '../manageUi';

export default function AdsConversions({ accent }: { accent?: string }) {
  const { spaceId, can } = useManage();
  const canManage = can('promotion.manage');
  const data = usePanelData(() => fetchAdsConversions(spaceId), [spaceId]);
  const [busy, setBusy] = useState(false);
  const [kinds, setKinds] = useState<AdConversionKind[] | null>(null);

  const enabled = kinds ?? (data.data?.pixel.enabledKinds as AdConversionKind[] | undefined) ?? [];
  const events = data.data?.events || [];
  const pixel = data.data?.pixel;

  const snippet = useMemo(() => {
    const kind = enabled[0] || 'PAGE_VIEW';
    return [
      'POST /api/ads/conversions',
      'Authorization: Bearer <converting-user-session>',
      '{',
      '  "eventId": "<unique-id>",',
      '  "campaignId": "<campaign-id>",',
      `  "kind": "${kind}",`,
      '  "value": 0,',
      '  "currency": "BDT",',
      '  "source": "pixel"',
      '}',
    ].join('\n');
  }, [enabled]);

  function toggle(kind: AdConversionKind, on: boolean) {
    const next = on ? [...enabled.filter((k) => k !== kind), kind] : enabled.filter((k) => k !== kind);
    setKinds(AD_CONVERSION_KINDS.filter((k) => next.includes(k)));
  }

  async function save() {
    setBusy(true);
    try {
      await saveAdsConversionPixel(spaceId, { enabledKinds: enabled });
      toast.success('Conversion events saved');
      setKinds(null);
      await data.reload();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save conversion events');
    } finally {
      setBusy(false);
    }
  }

  if (data.loading) return <PanelSkeleton />;
  if (data.error) return <PanelError message={data.error} onRetry={data.reload} />;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-1">Conversion pixel</p>
        <p className="text-sm text-muted-foreground mb-4">
          Register which events you want to receive. Conversions are recorded only from a real viewer who already
          clicked or saw the ad. This screen cannot create sales, leads, or other outcomes.
        </p>
        {pixel?.pixelId && (
          <p className="text-xs mb-4">
            Pixel id <span className="font-mono font-bold">{pixel.pixelId}</span>
          </p>
        )}
        <div className="space-y-2">
          {AD_CONVERSION_KINDS.map((kind) => (
            <ToggleRow
              key={kind}
              label={AD_CONVERSION_KIND_LABELS[kind]}
              blurb={kind}
              checked={enabled.includes(kind)}
              disabled={!canManage}
              onChange={(on) => toggle(kind, on)}
              accent={accent}
            />
          ))}
        </div>
        {canManage && (
          <div className="mt-4">
            <ActionButton tone="accent" accent={accent} busy={busy} onClick={() => void save()}>
              Save conversion events
            </ActionButton>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-2">Server event API</p>
        <p className="text-xs text-muted-foreground mb-3">
          Fire this from your site or backend after the converting person interacted with the ad. Duplicate event ids
          are ignored. Paid kinds still require a prior click or view.
        </p>
        <pre className="rounded-2xl bg-muted/40 p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">{snippet}</pre>
      </Card>

      <Card>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground mb-3">Recorded events</p>
        {events.length === 0 && (
          <p className="text-sm text-muted-foreground">No verified conversion events yet.</p>
        )}
        {events.length > 0 && (
          <ul className="divide-y divide-border">
            {events.map((row: any) => (
              <li key={row.id} className="py-3 flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {AD_CONVERSION_KIND_LABELS[row.kind as AdConversionKind] || row.kind}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {row.campaignName || row.campaignId} · {row.createdAt ? new Date(row.createdAt).toLocaleString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.value != null && (
                    <span className="text-xs font-bold">
                      {row.value} {row.currency}
                    </span>
                  )}
                  <Pill tone={statusTone(row.verified ? 'APPROVED' : 'PENDING')}>
                    {row.verified ? 'Verified' : 'Unverified'}
                  </Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
