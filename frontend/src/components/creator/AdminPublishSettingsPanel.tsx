import React, { useEffect, useState } from 'react';
import { Eye, Filter, History, Loader2, Save, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { CreatorPublishSettingsForm } from './CreatorPublishSettingsForm';
import {
  CONTENT_CATEGORIES,
  DEFAULT_PUBLISH_SETTINGS,
  mergePublishSettings,
  VISIBILITY_TYPES,
  type CreatorPublishSettings,
} from '../../lib/creatorPublish';

function rowToForm(row: any): CreatorPublishSettings {
  return mergePublishSettings({
    contentCategory: row.contentCategory || '',
    visibilityType: row.visibilityType || 'public',
    enableComments: row.enableComments !== false,
    allowRemix: row.allowRemix !== false,
    allowDuets: row.allowDuets !== false,
    allowDownloads: row.allowDownloads !== false,
    allowSharing: row.allowSharing !== false,
    allowEmbeds: row.allowEmbeds !== false,
    contentDisclosureType: row.contentDisclosureType || 'none',
    isAiGenerated: !!row.isAiGenerated,
    isAiAssisted: !!row.isAiAssisted,
    isSponsoredContent: !!row.isSponsoredContent,
    isPaidPartnership: !!row.isPaidPartnership,
    isBrandCollaboration: !!row.isBrandCollaboration,
    isSensitiveContent: !!row.isSensitiveContent,
    isAgeRestricted: !!row.isAgeRestricted,
    uploadQuality: row.uploadQuality || 'hd',
    autoCaptionsEnabled: row.autoCaptionsEnabled !== false,
    captionText: row.captionText || '',
    altText: row.altText || '',
    audioDescriptionEnabled: !!row.audioDescriptionEnabled,
    title: row.title || '',
    description: row.description || '',
    hashtags: row.hashtags || '',
    tags: row.tags || '',
    language: row.language || 'en',
    location: row.location || '',
    monetizationEnabled: !!row.monetizationEnabled,
    revenueShareEligible: !!row.revenueShareEligible,
    copyrightType: row.copyrightType || 'original',
    copyrightNotes: row.copyrightNotes || '',
    scheduledPublishAt: row.scheduledPublishAt
      ? new Date(row.scheduledPublishAt).toISOString().slice(0, 16)
      : '',
    pinToProfile: !!row.pinToProfile,
    featuredContent: !!row.featuredContent,
  });
}

export function AdminPublishSettingsPanel() {
  const token = useStore((s) => s.token);
  const [items, setItems] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('');
  const [contentType, setContentType] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<CreatorPublishSettings>(DEFAULT_PUBLISH_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'settings' | 'audit'>('settings');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (visibility) params.set('visibility', visibility);
      if (contentType) params.set('contentType', contentType);
      const res = await fetch(`/api/admin/publish-settings?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      toast.error('Failed to load publish settings');
    } finally {
      setLoading(false);
    }
  };

  const loadAudit = async () => {
    try {
      const res = await fetch('/api/admin/publish-settings/audit', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAudit(data.items || []);
      }
    } catch {
      toast.error('Failed to load audit log');
    }
  };

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (tab === 'settings') load();
    else loadAudit();
  }, [token, tab]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/publish-settings/${editing.contentType}/${editing.contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Save failed');
        return;
      }
      toast.success('Publish settings updated');
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('settings')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'settings' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          <Shield size={12} className="inline mr-1" /> Publish Settings
        </button>
        <button
          onClick={() => setTab('audit')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'audit' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          <History size={12} className="inline mr-1" /> Audit Log
        </button>
      </div>

      {tab === 'settings' ? (
        <>
          <div className="flex flex-col md:flex-row gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, tags, location…"
              className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm"
            />
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="bg-muted border border-border rounded-xl px-3 py-2 text-sm">
              <option value="">All types</option>
              <option value="post">Posts</option>
              <option value="reel">Reels</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-muted border border-border rounded-xl px-3 py-2 text-sm">
              <option value="">All categories</option>
              {CONTENT_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="bg-muted border border-border rounded-xl px-3 py-2 text-sm">
              <option value="">All visibility</option>
              {VISIBILITY_TYPES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            <button onClick={load} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-1">
              <Filter size={14} /> Filter
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No publish settings yet. New uploads store them automatically.</p>
          ) : (
            <div className="space-y-2">
              {items.map((row) => (
                <button
                  key={row.id}
                  onClick={() => { setEditing(row); setForm(rowToForm(row)); }}
                  className="w-full text-left p-4 rounded-2xl border border-border hover:bg-muted/40 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{row.title || row.contentId}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.contentType} · {row.user?.username || row.user?.name || 'user'} · {row.visibilityType} · {row.contentCategory || 'uncategorized'}
                    </p>
                  </div>
                  <Eye size={16} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {editing && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
              <div className="bg-card w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto p-5 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold">Edit publish settings</h3>
                  <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground">Close</button>
                </div>
                <CreatorPublishSettingsForm value={form} onChange={setForm} />
                <button
                  onClick={save}
                  disabled={saving}
                  className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save settings
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-2">
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No setting changes logged yet.</p>
          ) : audit.map((a) => (
            <div key={a.id} className="p-3 rounded-xl border border-border text-xs">
              <p className="font-bold">{a.action} · {a.settings?.contentType}/{a.settings?.contentId}</p>
              <p className="text-muted-foreground">{a.user?.username || a.userId} · {new Date(a.createdAt).toLocaleString()}</p>
              <p className="mt-1 text-muted-foreground truncate">Changed: {a.changedFields}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CreatorPublishLibraryPanel() {
  const token = useStore((s) => s.token);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<CreatorPublishSettings>(DEFAULT_PUBLISH_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/creator/publish/mine', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/creator/publish/content/${editing.contentType}/${editing.contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        toast.error('Could not save settings');
        return;
      }
      toast.success('Settings saved');
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-sm">Published settings</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Uploads will appear here with their saved creator settings.</p>
      ) : items.map((row) => (
        <button
          key={row.id}
          onClick={() => { setEditing(row); setForm(rowToForm(row)); }}
          className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted/40"
        >
          <p className="text-sm font-bold truncate">{row.title || row.contentId}</p>
          <p className="text-[11px] text-muted-foreground">{row.contentType} · {row.visibilityType} · {row.contentCategory || 'uncategorized'}</p>
        </button>
      ))}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-card w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto p-5 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold">Edit publishing</h3>
              <button onClick={() => setEditing(null)} className="text-sm text-muted-foreground">Close</button>
            </div>
            <CreatorPublishSettingsForm value={form} onChange={setForm} />
            <button onClick={save} disabled={saving} className="mt-4 w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
