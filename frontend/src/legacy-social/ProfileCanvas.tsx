import React, { useCallback, useEffect, useState } from 'react';
import { applyThemeConfig, widgetColClass, widgetMinH } from './theme/apply';
import { WIDGET_META, type CanvasPayload } from './widgets/registry';
import { legacySocialApi } from './api';
import { DEFAULT_LAYOUT, type WidgetInstance } from './shared';

function fallbackCanvas(handle: string): CanvasPayload {
  return {
    profileId: handle,
    handle,
    isOwner: true,
    isFriend: true,
    canPostWall: false,
    flags: { legacy_social: true },
    theme: { presetId: 'classic', accentColor: null, background: { kind: 'solid' }, density: 'comfortable' },
    layout: DEFAULT_LAYOUT.map((w) => ({ ...w })),
    status: null,
    intro: null,
    topFriends: [],
    wall: [],
    widgetData: {},
    settings: {
      wallPermission: 'friends',
      viewCountOptIn: true,
      whoViewedOptIn: false,
      maxTopFriends: 8,
      statusTtlHours: 48,
    },
  };
}

export default function ProfileCanvas({
  handle,
  isOwnerFallback = false,
}: {
  handle: string;
  isOwnerFallback?: boolean;
}) {
  const [canvas, setCanvas] = useState<CanvasPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!handle) return;
    try {
      setError(null);
      const data = await legacySocialApi.canvas(handle);
      setCanvas(data);
    } catch (err: any) {
      setError(err.message || 'Unavailable');
      if (isOwnerFallback) setCanvas(fallbackCanvas(handle));
    } finally {
      setLoading(false);
    }
  }, [handle, isOwnerFallback]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="grid grid-cols-6 gap-4 mt-4" aria-busy="true">
        <div className="col-span-6 h-24 rounded-3xl bg-muted/40 animate-pulse" />
        <div className="col-span-6 sm:col-span-3 h-36 rounded-3xl bg-muted/40 animate-pulse" />
        <div className="col-span-6 sm:col-span-3 h-36 rounded-3xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  const isOwner = !!(canvas?.isOwner || isOwnerFallback);
  if (!isOwner && (error || !canvas || canvas.flags?.legacy_social === false)) return null;

  const active = canvas || fallbackCanvas(handle);
  const theme = applyThemeConfig(active.theme as any);
  const layout: WidgetInstance[] = active.layout?.length ? active.layout : DEFAULT_LAYOUT.map((w) => ({ ...w }));

  return (
    <div
      className="mt-5 relative overflow-hidden"
      style={{
        borderRadius: theme.radius,
        background: theme.glassEnabled ? 'rgba(255,255,255,0.1)' : (theme.background || undefined),
        backdropFilter: theme.glassEnabled ? `blur(${theme.glassBlur || 10}px)` : undefined,
        WebkitBackdropFilter: theme.glassEnabled ? `blur(${theme.glassBlur || 10}px)` : undefined,
        padding: theme.background || theme.glassEnabled ? '0.75rem' : 0,
        opacity: theme.glassEnabled ? (theme.glassOpacity || 0.8) : undefined,
      }}
    >
      <div className="grid grid-cols-6 gap-4">
        {layout.map((w) => {
          if (!isOwner) {
            if (w.visibility === 'private') return null;
            if (w.visibility === 'friends' && !active.isFriend) return null;
          }
          const meta = WIDGET_META[w.type];
          if (!meta) return null;
          const Cmp = meta.Component;
          return (
            <div key={w.id} className={`${widgetColClass(w.size)} ${widgetMinH(w.size)}`}>
              <Cmp canvas={active} theme={theme} onRefresh={load} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
