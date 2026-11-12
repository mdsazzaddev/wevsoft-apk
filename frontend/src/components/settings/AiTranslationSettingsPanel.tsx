import { useSettingsTr } from '../../i18n/settingsBn';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Languages,
  Loader2,
  Plug,
  Unplug,
  Shield,
} from 'lucide-react';
import { TRANSLATION_LANGUAGES } from '@wevsoft/shared/translation-languages';

type Connection = {
  id: string;
  providerType: string;
  connectionKey: string;
  displayName: string | null;
  baseUrl: string | null;
  selectedModel: string;
  priority: number;
  isEnabled: boolean;
  status: string;
  connected: boolean;
  keyMasked: string | null;
  lastUsedAt: string | null;
};

type SettingsPayload = {
  settings: {
    preferredLanguage: string;
    autoMode: string;
    qualityMode: string;
    providerMode: string;
    allowSystemFallback: boolean;
    primaryConnectionId: string | null;
    fallbackConnectionId: string | null;
    secondFallbackConnectionId: string | null;
    privacyAcknowledged: boolean;
  };
  builtins: { slug: string; label: string; supportsCustomBaseUrl: boolean }[];
  connections: Connection[];
  flags: Record<string, boolean>;
  usage: {
    last30Days: {
      provider: string;
      isUserOwnedKey: boolean;
      requests: number;
      promptTokens: number;
      completionTokens: number;
    }[];
    lastUsed: { provider: string; model: string | null; createdAt: string; isUserOwnedKey: boolean } | null;
  };
};

const emptyConnect = {
  providerType: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'auto',
  displayName: '',
  confirmBilling: false,
};

export default function AiTranslationSettingsPanel({ token }: { token: string }) {
  const tr = useSettingsTr();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<SettingsPayload | null>(null);
  const [connectForm, setConnectForm] = useState(emptyConnect);
  const [testing, setTesting] = useState(false);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/translation/settings', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load();
  }, [load]);

  const patchSettings = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/translation/settings', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      toast.success('Saved');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/translation/test-provider', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          providerType: connectForm.providerType,
          apiKey: connectForm.apiKey,
          baseUrl: connectForm.baseUrl || undefined,
          model: connectForm.model === 'auto' ? undefined : connectForm.model,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Test failed');
      toast.success(json.message || 'Connected successfully');
    } catch (err: any) {
      toast.error(err.message || 'Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const connectProvider = async () => {
    if (!connectForm.confirmBilling) {
      toast.error('Confirm billing responsibility first');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/translation/providers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...connectForm,
          baseUrl: connectForm.baseUrl || undefined,
          model: connectForm.model === 'auto' ? 'auto' : connectForm.model,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Connect failed');
      toast.success('Provider connected');
      setConnectForm(emptyConnect);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Connect failed');
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async (id: string) => {
    if (!confirm('Remove this provider? Your encrypted API key will be permanently deleted.')) return;
    try {
      const res = await fetch(`/api/translation/providers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Disconnect failed');
      toast.success('Disconnected');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Disconnect failed');
    }
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  const s = data.settings;
  const customSelected = connectForm.providerType === 'custom';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Languages size={18} className="text-primary" />
          <h3 className="font-bold text-sm">{tr('Language & Translation')}</h3>
        </div>

        <label className="block text-xs font-semibold text-muted-foreground">
          Preferred Translation Language
          <select
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={s.preferredLanguage}
            disabled={saving}
            onChange={(e) => void patchSettings({ preferredLanguage: e.target.value })}
          >
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.nativeName})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-semibold text-muted-foreground">
          Automatic Translation
          <select
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={s.autoMode}
            disabled={saving || !data.flags.autoTranslationEnabled}
            onChange={(e) => void patchSettings({ autoMode: e.target.value })}
          >
            <option value="off">{tr('Off')}</option>
            <option value="on">On</option>
            <option value="ask">{tr('Ask Before Translating')}</option>
          </select>
        </label>

        <label className="block text-xs font-semibold text-muted-foreground">
          Translation Quality
          <select
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={s.qualityMode}
            disabled={saving}
            onChange={(e) => void patchSettings({ qualityMode: e.target.value })}
          >
            <option value="fast">Fast — low latency</option>
            <option value="balanced">{tr('Balanced')}</option>
            <option value="natural">Natural — AI context-aware</option>
          </select>
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={18} className="text-primary" />
          <h3 className="font-bold text-sm">{tr('AI Provider Mode')}</h3>
        </div>

        <div className="space-y-2">
          {[
            { id: 'wevsoft', label: 'Wevsoft managed' },
            { id: 'my_api', label: 'My API key' },
            { id: 'automatic', label: 'Automatic' },
          ].map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="providerMode"
                checked={s.providerMode === opt.id}
                onChange={() => void patchSettings({ providerMode: opt.id })}
              />
              {opt.label}
            </label>
          ))}
        </div>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span>{tr('Allow fallback to Wevsoft provider')}</span>
          <input
            type="checkbox"
            className="toggle toggle-sm"
            checked={s.allowSystemFallback}
            onChange={(e) => void patchSettings({ allowSystemFallback: e.target.checked })}
          />
        </label>

        {s.providerMode === 'my_api' && !s.allowSystemFallback && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex gap-2 items-start">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            Use only my API — Wevsoft system keys will not be used if your providers fail.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Plug size={18} className="text-primary" />
          <h3 className="font-bold text-sm">{tr('My AI API Keys')}</h3>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <Shield size={13} /> Using your own API key
          </p>
          <p>
            Translation requests made with your provider use your provider account&apos;s API quota/billing.
            Keys are encrypted at rest and never shown in full after saving.
          </p>
        </div>

        <div className="space-y-2">
          {data.connections.length === 0 && (
            <p className="text-xs text-muted-foreground">{tr('No providers connected yet.')}</p>
          )}
          {data.connections.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{c.displayName || c.providerType}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {c.connected ? (
                    <>
                      <CheckCircle2 size={11} className="text-emerald-500" /> Connected · {c.keyMasked}
                    </>
                  ) : (
                    'Not connected'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void disconnect(c.id)}
                className="text-xs font-semibold text-red-500 hover:underline inline-flex items-center gap-1"
              >
                <Unplug size={12} /> Disconnect
              </button>
            </div>
          ))}
        </div>

        {data.flags.userApiKeysEnabled && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{tr('Connect provider')}</p>
            <select
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={connectForm.providerType}
              onChange={(e) => setConnectForm((f) => ({ ...f, providerType: e.target.value }))}
            >
              {data.builtins.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.label}
                </option>
              ))}
            </select>
            {customSelected && (
              <>
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder={tr('Provider name')}
                  value={connectForm.displayName}
                  onChange={(e) => setConnectForm((f) => ({ ...f, displayName: e.target.value }))}
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder={tr('Base URL (https://example.com/v1)')}
                  value={connectForm.baseUrl}
                  onChange={(e) => setConnectForm((f) => ({ ...f, baseUrl: e.target.value }))}
                />
              </>
            )}
            <input
              type="password"
              autoComplete="off"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={tr('API Key')}
              value={connectForm.apiKey}
              onChange={(e) => setConnectForm((f) => ({ ...f, apiKey: e.target.value }))}
            />
            <input
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={tr('Model (or auto)')}
              value={connectForm.model}
              onChange={(e) => setConnectForm((f) => ({ ...f, model: e.target.value }))}
            />
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={connectForm.confirmBilling}
                onChange={(e) => setConnectForm((f) => ({ ...f, confirmBilling: e.target.checked }))}
              />
              <span>
                Your API key will be encrypted and stored securely. You are responsible for any usage or
                billing generated through your API provider.
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={testing || !connectForm.apiKey}
                onClick={() => void testConnection()}
                className="px-3 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted disabled:opacity-50"
              >
                {testing ? 'Testing…' : 'Test Connection'}
              </button>
              <button
                type="button"
                disabled={saving || !connectForm.apiKey || !connectForm.confirmBilling}
                onClick={() => void connectProvider()}
                className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
        <h3 className="font-bold text-sm">{tr('AI Usage')}</h3>
        <p className="text-[11px] text-muted-foreground">
          Estimated usage only — not actual provider billing.
        </p>
        {data.usage.last30Days.length === 0 ? (
          <p className="text-xs text-muted-foreground">{tr('No translation usage in the last 30 days.')}</p>
        ) : (
          <div className="space-y-2">
            {data.usage.last30Days.map((u, i) => (
              <div key={i} className="flex justify-between text-xs rounded-lg bg-muted/40 px-3 py-2">
                <span className="font-semibold">
                  {u.provider} {u.isUserOwnedKey ? '(your key)' : '(Wevsoft)'}
                </span>
                <span className="text-muted-foreground">
                  {u.requests} req · ~{u.promptTokens + u.completionTokens} tokens
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">{tr('AI Translation Privacy')}</p>
        <p>
          When using third-party AI providers, translated text may be sent to that provider according to
          their API/data handling policies. Private Wev Chat messages are only translated after membership
          checks.
        </p>
      </div>
    </div>
  );
}
