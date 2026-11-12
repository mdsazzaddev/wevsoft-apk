import React, { useState, useEffect } from 'react';
import { Key, Save, Loader2, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';

interface ProviderModel {
  id: string;
  modelId: string;
  name: string;
}

interface Provider {
  id: string;
  providerType: string;
  models: ProviderModel[];
  apiKeyMasked?: string;
}

export default function AIProviderSettings() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({ providerType: 'GROQ', apiKey: '' });
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const supportedProviders = ['GROQ', 'GEMINI', 'OPENAI', 'CLAUDE'];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/wev-enterprise-ai/providers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProviders(await res.json());
    } catch (error) {
      console.error('Failed to fetch providers', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setStatus(null);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/wev-enterprise-ai/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formState),
      });

      if (res.ok) {
        setStatus({ type: 'success', message: 'Connection saved' });
        setFormState((prev) => ({ ...prev, apiKey: '' }));
        fetchProviders();
      } else {
        const data = await res.json();
        setStatus({ type: 'error', message: data.error || 'Failed to save' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncModels = async (providerId: string) => {
    try {
      setSyncingId(providerId);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/wev-enterprise-ai/providers/${providerId}/sync-models`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchProviders();
    } catch (error) {
      console.error('Failed to sync models', error);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (providerId: string) => {
    if (!window.confirm('Delete this provider connection?')) return;
    try {
      setDeletingId(providerId);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/wev-enterprise-ai/providers/${providerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchProviders();
      } else {
        const data = await res.json();
        setStatus({ type: 'error', message: data.error || 'Failed to delete' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Network error during deletion' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground leading-snug">
        Add your own LLM keys, then sync models for agents to use.
      </p>

      <div className="rounded-xl border border-border bg-card/40 p-3 space-y-2.5">
        <p className="text-xs font-semibold text-foreground">Add connection</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">Provider</label>
            <select
              value={formState.providerType}
              onChange={(e) => setFormState({ ...formState, providerType: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            >
              {supportedProviders.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1">API key</label>
            <input
              type="password"
              value={formState.apiKey}
              onChange={(e) => setFormState({ ...formState, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-background border border-border rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {status && (
          <div
            className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-1.5 ${
              status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            {status.message}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !formState.apiKey}
          className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save connection
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Your connections</p>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : providers.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-muted-foreground rounded-xl border border-dashed border-border">
            No API keys yet — add one above.
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card/40 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Key className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{p.providerType}</p>
                    <p className="text-[10px] text-emerald-500 flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                      {p.apiKeyMasked ? <span className="text-muted-foreground ml-1 truncate">· {p.apiKeyMasked}</span> : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSyncModels(p.id)}
                    disabled={syncingId === p.id}
                    className="px-2 py-1 text-[10px] font-semibold bg-muted rounded-md hover:bg-muted/80 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${syncingId === p.id ? 'animate-spin' : ''}`} />
                    Sync
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    title="Delete connection"
                  >
                    {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {p.models && p.models.length > 0 ? (
                  <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap gap-1">
                    {p.models.slice(0, 8).map((m) => (
                      <span key={m.id} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">
                        {m.name}
                      </span>
                    ))}
                    {p.models.length > 8 && (
                      <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">+{p.models.length - 8} more</span>
                    )}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[10px] text-muted-foreground">No models yet — tap Sync.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
