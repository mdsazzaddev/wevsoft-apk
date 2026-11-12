import { useSettingsTr } from '../../i18n/settingsBn';
import React, { useState, useEffect } from 'react';
import { Key, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../../store';

export default function ConsumerAIProviderSettings() {
  const tr = useSettingsTr();
  const token = useStore((s) => s.token);
  const [providerType, setProviderType] = useState('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [maskedKey, setMaskedKey] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/ai/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.defaultProvider) setProviderType(data.defaultProvider);
        if (data.maskedKey) setMaskedKey(data.maskedKey);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ providerType, apiKey: apiKey || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: 'AI Provider settings saved successfully.' });
        setApiKey('');
        if (data.maskedKey) setMaskedKey(data.maskedKey);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to save settings.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', message: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 space-y-4 max-w-xl">
      <div className="flex items-center gap-2 mb-2">
        <Key className="w-5 h-5 text-violet-500" />
        <h2 className="text-lg font-semibold">{tr('AI Provider Configuration')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Bring your own API key to unlock AI features like Post Generation and Content Translation.
      </p>

      {status && (
        <div className={`p-3 rounded-lg flex items-start gap-2 text-sm ${
          status.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          <div>{status.message}</div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">{tr('Select Provider')}</label>
          <select 
            value={providerType}
            onChange={(e) => setProviderType(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="GEMINI">Google Gemini</option>
            <option value="OPENAI">OpenAI</option>
            <option value="GROQ">Groq</option>
            <option value="MOCK">Mock Provider (Local Testing)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            API Key {maskedKey && <span className="text-green-500 ml-2">(Currently set: {maskedKey})</span>}
          </label>
          <input 
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={maskedKey ? "Enter new key to replace existing" : "sk-..."}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || (!apiKey && !maskedKey && providerType !== 'MOCK')}
          className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
