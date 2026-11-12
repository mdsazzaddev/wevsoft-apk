import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  automationApi,
  PlatformProviderOption,
  WevAgent,
  WevProviderConnection,
} from '../../../../lib/automationApi';

interface AgentModelTabProps {
  draft: Partial<WevAgent>;
  onChange: (patch: Partial<WevAgent>) => void;
  onOpenProviders: () => void;
}

export const AgentModelTab: React.FC<AgentModelTabProps> = ({ draft, onChange, onOpenProviders }) => {
  const [byokProviders, setByokProviders] = useState<WevProviderConnection[]>([]);
  const [platformProviders, setPlatformProviders] = useState<PlatformProviderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [mode, setMode] = useState<'default' | 'byok'>(() => (draft.providerConnectionId ? 'byok' : 'default'));

  const useByok = mode === 'byok';
  const selectedConnection = byokProviders.find((p) => p.id === draft.providerConnectionId) || null;

  const selectedPlatform = useMemo(() => {
    if (!platformProviders.length) return null;
    const byType = platformProviders.find((p) => p.providerType === draft.aiProvider);
    if (byType) return byType;
    return platformProviders.find((p) => p.isDefault) || platformProviders[0];
  }, [platformProviders, draft.aiProvider]);

  const platformModels = selectedPlatform?.allowedModels || [];
  const byokModels = selectedConnection?.models || [];

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      automationApi.getProviders().catch(() => [] as WevProviderConnection[]),
      automationApi.getPlatformProviders().catch(() => [] as PlatformProviderOption[]),
    ])
      .then(([byok, platform]) => {
        if (cancelled) return;
        setByokProviders(byok);
        setPlatformProviders(platform);
        if (draft.providerConnectionId && byok.some((p) => p.id === draft.providerConnectionId)) {
          setMode('byok');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
     
  }, []);

  // Keep Platform Default selection valid when admin provider list loads.
  useEffect(() => {
    if (useByok || loading || !platformProviders.length) return;
    const match = platformProviders.find((p) => p.providerType === draft.aiProvider);
    if (match) {
      if (draft.aiModel && match.allowedModels.includes(draft.aiModel)) return;
      if (match.allowedModels[0] && match.allowedModels[0] !== draft.aiModel) {
        onChange({ aiModel: match.allowedModels[0] });
      }
      return;
    }
    const fallback = platformProviders.find((p) => p.isDefault) || platformProviders[0];
    if (fallback) {
      onChange({
        aiProvider: fallback.providerType,
        aiModel: fallback.allowedModels[0] || draft.aiModel,
        providerConnectionId: null,
      });
    }
     
  }, [loading, platformProviders, useByok]);

  const handleModeChange = (next: 'default' | 'byok') => {
    setMode(next);
    if (next === 'default') {
      const fallback = platformProviders.find((p) => p.isDefault) || platformProviders[0];
      onChange({
        providerConnectionId: null,
        ...(fallback
          ? {
              aiProvider: fallback.providerType,
              aiModel: fallback.allowedModels[0] || draft.aiModel,
            }
          : {}),
      });
      return;
    }
    const first = byokProviders[0];
    if (first) {
      onChange({
        providerConnectionId: first.id,
        aiProvider: first.providerType || draft.aiProvider,
        aiModel: first.models[0]?.modelId || draft.aiModel,
      });
    }
  };

  const handleSync = async () => {
    if (!selectedConnection) return;
    setSyncing(true);
    try {
      await automationApi.syncModels(selectedConnection.id);
      const refreshed = await automationApi.getProviders();
      setByokProviders(refreshed);
      toast.success('Models synced');
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync models');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="animate-spin" size={18} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 p-1 bg-muted/40 rounded-xl">
        <button
          type="button"
          onClick={() => handleModeChange('default')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            !useByok ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Platform Default
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('byok')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            useByok ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Own Key (BYOK)
        </button>
      </div>

      {!useByok && (
        <>
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground">
            Uses keys your admin added in AI Studio — you only pick provider and model.
          </div>

          {platformProviders.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
              No platform providers are configured yet. Ask an admin to add one in AI Studio → Providers.
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Provider</label>
                <select
                  value={selectedPlatform?.id || ''}
                  onChange={(e) => {
                    const next = platformProviders.find((p) => p.id === e.target.value);
                    if (!next) return;
                    onChange({
                      aiProvider: next.providerType,
                      aiModel: next.allowedModels[0] || draft.aiModel,
                      providerConnectionId: null,
                    });
                  }}
                  className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  {platformProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName || p.label}
                      {p.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Model</label>
                {platformModels.length === 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground p-3 rounded-xl bg-muted/30 border border-border">
                    This provider has no allowed models. Ask an admin to enable models on the key.
                  </p>
                ) : (
                  <select
                    value={
                      draft.aiModel && platformModels.includes(draft.aiModel)
                        ? draft.aiModel
                        : platformModels[0] || ''
                    }
                    onChange={(e) => onChange({ aiModel: e.target.value })}
                    className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    {platformModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}
        </>
      )}

      {useByok && (
        <>
          {byokProviders.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
              <p className="text-sm text-muted-foreground">You haven&apos;t connected any providers yet.</p>
              <button
                type="button"
                onClick={onOpenProviders}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Add a connection <ExternalLink size={13} />
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Connection</label>
                <select
                  value={draft.providerConnectionId || selectedConnection?.id || byokProviders[0]?.id || ''}
                  onChange={(e) => {
                    const conn = byokProviders.find((p) => p.id === e.target.value);
                    onChange({
                      providerConnectionId: e.target.value,
                      aiProvider: conn?.providerType || draft.aiProvider,
                      aiModel: conn?.models[0]?.modelId || draft.aiModel,
                    });
                  }}
                  className="mt-1.5 w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  {byokProviders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.providerType} — {p.apiKeyMasked}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                  {selectedConnection?.status === 'ACTIVE' ? (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : selectedConnection?.status === 'INVALID' ? (
                    <span className="flex items-center gap-1 text-red-500">
                      <XCircle size={12} /> Key rejected — check it in Providers
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not yet verified</span>
                  )}
                  <button type="button" onClick={onOpenProviders} className="text-primary hover:underline ml-auto">
                    Manage connections
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Model</label>
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing || !selectedConnection}
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  >
                    {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sync models
                  </button>
                </div>
                {byokModels.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 rounded-xl bg-muted/30 border border-border">
                    No models detected yet — click &quot;Sync models&quot; to pull the real list from this provider.
                  </p>
                ) : (
                  <select
                    value={draft.aiModel || byokModels[0]?.modelId || ''}
                    onChange={(e) => onChange({ aiModel: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    {byokModels.map((m) => (
                      <option key={m.modelId} value={m.modelId}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
