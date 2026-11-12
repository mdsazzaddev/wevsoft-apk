import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, RotateCcw, Undo2, Redo2, Monitor, Smartphone, Plus, GripVertical, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PROFILE_THEMES } from '../../lib/profileThemes';
import { CURATED_BACKGROUNDS, DEFAULT_LAYOUT, DENSITIES, HEX_COLOR_RE, STATUS_TTL_OPTIONS, WALL_PERMISSIONS, WIDGET_SIZES, contrastRatio, type Density, type WidgetInstance, type WidgetSize } from '../shared';
import { applyThemeConfig, type AppliedTheme } from '../theme/apply';
import { legacySocialApi } from '../api';
import { MOODS, WIDGET_META, WIDGET_TYPE_LIST, type CanvasPayload } from '../widgets/registry';

interface HistoryState {
  layout: WidgetInstance[];
  theme: any;
}

export default function ProfileCustomizer({
  canvas,
  theme: _initialTheme,
  onClose,
  onSaved,
}: {
  canvas: CanvasPayload;
  theme: AppliedTheme;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<'theme' | 'widgets' | 'circle' | 'status' | 'media' | 'privacy'>('theme');
  const [preview, setPreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [layout, setLayout] = useState<WidgetInstance[]>(canvas.layout?.length ? canvas.layout : DEFAULT_LAYOUT.map((w) => ({ ...w })));
  const [presetId, setPresetId] = useState(canvas.theme?.presetId || 'classic');
  const [accent, setAccent] = useState(canvas.theme?.accentColor || '');
  const [density, setDensity] = useState<Density>(canvas.theme?.density === 'compact' ? 'compact' : 'comfortable');
  const [background, setBackground] = useState(canvas.theme?.background || { kind: 'solid' });
  const [avatarShape, setAvatarShape] = useState(canvas.theme?.avatarShape || 'circle');
  const [avatarFrameId, setAvatarFrameId] = useState(canvas.theme?.avatarFrameId || '');
  const [customAccentColor, setCustomAccentColor] = useState(canvas.theme?.customAccentColor || '');
  const [glassEnabled, setGlassEnabled] = useState(!!canvas.theme?.glassEnabled);
  const [glassOpacity, setGlassOpacity] = useState(canvas.theme?.glassOpacity ?? 0.8);
  const [glassBlur, setGlassBlur] = useState(canvas.theme?.glassBlur ?? 10.0);
  const [themeMode, setThemeMode] = useState(canvas.theme?.themeMode || 'system');
  const [statusText, setStatusText] = useState(canvas.status?.text || '');
  const [statusEmoji, setStatusEmoji] = useState(canvas.status?.emoji || '');
  const [ttl, setTtl] = useState<number>(canvas.settings?.statusTtlHours ?? 48);
  const [wallPermission, setWallPermission] = useState(canvas.settings?.wallPermission || 'friends');
  const [viewOptIn, setViewOptIn] = useState(canvas.settings?.viewCountOptIn !== false);
  const [whoOptIn, setWhoOptIn] = useState(!!canvas.settings?.whoViewedOptIn);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [picked, setPicked] = useState<string[]>(canvas.topFriends?.map((t) => t.user.id) || []);
  const [vanity, setVanity] = useState('');
  const [vanityMeta, setVanityMeta] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const past = useRef<HistoryState[]>([]);
  const future = useRef<HistoryState[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewTheme = useMemo(
    () => applyThemeConfig({ presetId, accentColor: accent || null, density, background, avatarShape, avatarFrameId, customAccentColor, glassEnabled, glassOpacity, glassBlur, themeMode }),
    [presetId, accent, density, background, avatarShape, avatarFrameId, customAccentColor, glassEnabled, glassOpacity, glassBlur, themeMode]
  );
  const contrastWarn = accent && HEX_COLOR_RE.test(accent) ? contrastRatio(accent, '#f4f4f5') < 3 : false;

  const snapshot = useCallback(() => {
    past.current.push({ layout: structuredClone(layout), theme: { presetId, accent, density, background, avatarShape, avatarFrameId, customAccentColor, glassEnabled, glassOpacity, glassBlur, themeMode } });
    if (past.current.length > 30) past.current.shift();
    future.current = [];
  }, [layout, presetId, accent, density, background, avatarShape, avatarFrameId, customAccentColor, glassEnabled, glassOpacity, glassBlur, themeMode]);

  const persistThemeLayout = useCallback(async (nextLayout = layout) => {
    await Promise.all([
      legacySocialApi.saveTheme({ presetId, accentColor: accent || null, density, background, avatarShape, avatarFrameId, customAccentColor, glassEnabled, glassOpacity, glassBlur, themeMode }),
      legacySocialApi.saveLayout(nextLayout),
    ]);
  }, [layout, presetId, accent, density, background, avatarShape, avatarFrameId, customAccentColor, glassEnabled, glassOpacity, glassBlur, themeMode]);

  const scheduleSave = useCallback((nextLayout?: WidgetInstance[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persistThemeLayout(nextLayout).catch(() => {});
    }, 700);
  }, [persistThemeLayout]);

  useEffect(() => {
    legacySocialApi.friendCandidates().then(setCandidates).catch(() => {});
    legacySocialApi.vanity().then((v) => { setVanityMeta(v); setVanity(v.username || ''); }).catch(() => {});
  }, []);

  const move = (index: number, dir: -1 | 1) => {
    snapshot();
    const next = [...layout];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    next.forEach((w, i) => { w.position = i; });
    setLayout(next);
    scheduleSave(next);
  };

  const removeAt = (index: number) => {
    snapshot();
    const next = layout.filter((_, i) => i !== index).map((w, i) => ({ ...w, position: i }));
    setLayout(next);
    scheduleSave(next);
  };

  const addWidget = (type: WidgetInstance['type']) => {
    snapshot();
    // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
    const next = [...layout, { id: `w-${type}-${Date.now().toString(36)}`, type, position: layout.length, size: 'half' as WidgetSize, settings: {} }];
    setLayout(next);
    scheduleSave(next);
  };

  const setSize = (index: number, size: WidgetSize) => {
    snapshot();
    const next = layout.map((w, i) => (i === index ? { ...w, size } : w));
    setLayout(next);
    scheduleSave(next);
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ layout, theme: { presetId, accent, density, background } });
    setLayout(prev.layout);
    setPresetId(prev.theme.presetId);
    setAccent(prev.theme.accent);
    setDensity(prev.theme.density);
    setBackground(prev.theme.background);
  };

  const redo = () => {
    const nxt = future.current.pop();
    if (!nxt) return;
    past.current.push({ layout, theme: { presetId, accent, density, background } });
    setLayout(nxt.layout);
    setPresetId(nxt.theme.presetId);
    setAccent(nxt.theme.accent);
    setDensity(nxt.theme.density);
    setBackground(nxt.theme.background);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await persistThemeLayout();
      await legacySocialApi.saveSettings({
        wallPermission,
        viewCountOptIn: viewOptIn,
        whoViewedOptIn: whoOptIn,
        statusTtlHours: ttl,
      });
      await legacySocialApi.saveTopFriends(picked);
      if (statusText || statusEmoji) await legacySocialApi.saveStatus({ text: statusText, emoji: statusEmoji, ttlHours: ttl });
      toast.success('Profile saved');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(from) || from === index) return;
    snapshot();
    const next = [...layout];
    const [item] = next.splice(from, 1);
    next.splice(index, 0, item);
    next.forEach((w, i) => { w.position = i; });
    setLayout(next);
    scheduleSave(next);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="customizer-title">
      <div className="bg-background w-full max-w-5xl max-h-[94vh] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-border">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <h2 id="customizer-title" className="font-bold text-sm">Customize profile</h2>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Undo" onClick={undo} className="p-2 rounded-full hover:bg-muted"><Undo2 size={16} /></button>
            <button type="button" aria-label="Redo" onClick={redo} className="p-2 rounded-full hover:bg-muted"><Redo2 size={16} /></button>
            <button
              type="button"
              onClick={() => setPreview('desktop')}
              className={`p-2 rounded-xl transition-colors ${preview === 'desktop' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
              aria-label="Desktop preview"
            >
              <Monitor size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPreview('tablet')}
              className={`p-2 rounded-xl transition-colors ${preview === 'tablet' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
              aria-label="Tablet preview"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </button>
            <button
              type="button"
              onClick={() => setPreview('mobile')}
              className={`p-2 rounded-xl transition-colors ${preview === 'mobile' ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
              aria-label="Mobile preview"
            >
              <Smartphone size={16} />
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted" aria-label="Close"><X size={18} /></button>
          </div>
        </header>

        <nav className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar border-b border-border text-xs font-semibold">
          {(['theme', 'widgets', 'circle', 'status', 'media', 'privacy'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-full capitalize ${tab === id ? 'text-white' : 'text-muted-foreground hover:bg-muted'}`}
              style={tab === id ? { background: previewTheme.accent } : {}}
            >
              {id}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4 grid md:grid-cols-2 gap-4">
          <div className="space-y-4">
            {tab === 'theme' && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {PROFILE_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { snapshot(); setPresetId(t.id); scheduleSave(); }}
                      className={`rounded-2xl p-2 text-left border ${presetId === t.id ? 'ring-2' : 'border-border'}`}
                      style={{ ringColor: t.accent } as any}
                    >
                      <div className="h-8 rounded-lg mb-1" style={{ background: `linear-gradient(135deg, ${t.swatchFrom}, ${t.swatchTo})` }} />
                      <p className="text-[10px] font-semibold truncate">{t.name.replace(/^[^\s]+\s/, '')}</p>
                    </button>
                  ))}
                </div>
                <label className="block text-xs font-semibold">Accent
                  <input type="color" value={HEX_COLOR_RE.test(accent) ? accent : previewTheme.accent} onChange={(e) => { snapshot(); setAccent(e.target.value); scheduleSave(); }} className="ml-2 h-8 w-12 rounded cursor-pointer" />
                </label>
                {contrastWarn && <p className="text-[11px] text-amber-600">Low contrast — visitors may struggle to read this accent.</p>}

                <div className="pt-2 pb-2 border-t mt-4 border-border/50">
                  <p className="text-xs font-semibold mb-2">Background</p>
                  <div className="flex flex-wrap gap-2">
                    {CURATED_BACKGROUNDS.map((b) => (
                      <button key={b.id} type="button" onClick={() => { snapshot(); setBackground({ kind: 'image', curatedId: b.id }); scheduleSave(); }} className="px-3 py-1.5 rounded-full text-[11px] bg-muted">{b.label}</button>
                    ))}
                  </div>
                </div>

              </>
            )}

            {tab === 'widgets' && (
              <>
                <div className="space-y-2">
                  {layout.map((w, i) => (
                    <div
                      key={w.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onDrop(e, i)}
                      className="flex items-center gap-2 p-2 rounded-xl border border-border bg-card"
                    >
                      <span className="cursor-grab text-muted-foreground" aria-hidden><GripVertical size={14} /></span>
                      <span className="flex-1 text-sm font-medium">{WIDGET_META[w.type]?.label}</span>
                      <select value={w.size} onChange={(e) => setSize(i, e.target.value as WidgetSize)} className="text-xs bg-muted rounded-lg px-2 py-1" aria-label="Size">
                        {WIDGET_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select 
                        value={w.visibility || 'public'} 
                        onChange={(e) => { 
                          snapshot(); 
                          const next = [...layout]; 
                          next[i].visibility = e.target.value as any; 
                          setLayout(next); 
                          scheduleSave(next); 
                        }} 
                        className="text-[11px] bg-muted rounded-lg px-2 py-1 max-w-[80px]" aria-label="Visibility">
                        <option value="public">Public</option>
                        <option value="friends">Friends</option>
                        <option value="private">Private</option>
                      </select>
                      <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="p-1 hover:bg-muted rounded"><ChevronUp size={14} /></button>
                      <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="p-1 hover:bg-muted rounded"><ChevronDown size={14} /></button>
                      <button type="button" aria-label="Remove widget" onClick={() => removeAt(i)} className="p-1 hover:bg-muted rounded text-red-500"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {WIDGET_TYPE_LIST.map((type) => (
                    <button key={type} type="button" onClick={() => addWidget(type)} className="px-3 py-1.5 rounded-full text-xs bg-muted inline-flex items-center gap-1">
                      <Plus size={12} /> {WIDGET_META[type].label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={async () => { const def = await legacySocialApi.resetLayout(); setLayout(def); toast.success('Reset to default'); }} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <RotateCcw size={12} /> Reset layout
                </button>
              </>
            )}

            {tab === 'circle' && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <p className="text-xs text-muted-foreground">Pin up to {canvas.settings?.maxTopFriends || 8} connections. They are not notified.</p>
                {candidates.map((u) => {
                  const on = picked.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setPicked((prev) => on ? prev.filter((id) => id !== u.id) : [...prev, u.id].slice(0, canvas.settings?.maxTopFriends || 8))}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl border ${on ? 'border-transparent text-white' : 'border-border'}`}
                      style={on ? { background: previewTheme.accent } : {}}
                    >
                      <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} alt="" className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm font-medium">{u.name}</span>
                    </button>
                  );
                })}
                {!candidates.length && <p className="text-sm text-muted-foreground">Add friends first, then pin them here.</p>}
              </div>
            )}

            {tab === 'status' && (
              <>
                <div className="flex flex-wrap gap-1">
                  {MOODS.map((m) => (
                    <button key={m} type="button" onClick={() => setStatusEmoji(m)} className={`text-xl p-1 rounded-lg ${statusEmoji === m ? 'bg-muted' : ''}`}>{m}</button>
                  ))}
                </div>
                <input value={statusText} onChange={(e) => setStatusText(e.target.value.slice(0, 80))} maxLength={80} placeholder="building something new" className="w-full bg-muted/50 rounded-xl px-3 py-2 text-sm" />
                <select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} className="text-sm bg-muted rounded-xl px-3 py-2">
                  {STATUS_TTL_OPTIONS.map((h) => <option key={h} value={h}>{h ? `Clears after ${h}h` : 'Never expires'}</option>)}
                </select>
              </>
            )}

            {tab === 'media' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold mb-2">Background Image</h3>
                  <p className="text-xs text-muted-foreground mb-3">Set a custom background image for your entire profile canvas.</p>
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:bg-muted/30 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span className="text-sm font-semibold">Upload Background Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          toast.loading('Uploading background...', { id: 'bg' });
                          const { url } = await legacySocialApi.uploadBackground(file);
                          snapshot();
                          setBackground({ kind: 'image', imageUrl: url });
                          scheduleSave();
                          toast.success('Background updated!', { id: 'bg' });
                        } catch (err: any) {
                          toast.error(err.message, { id: 'bg' });
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="border-t border-border/50 pt-4">
                  <h3 className="text-sm font-bold mb-2">Intro Video/Audio</h3>
                  <p className="text-xs text-muted-foreground mb-3">Short audio or video intro. Playback is click-only — never autoplay.</p>
                  <label className="flex items-center justify-center gap-2 border border-border rounded-xl p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    <span className="text-sm font-semibold">Upload Media Intro</span>
                    <input
                      type="file"
                      accept="audio/*,video/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          toast.loading('Uploading intro...', { id: 'intro' });
                          await legacySocialApi.uploadIntro(file);
                          toast.success('Intro uploaded', { id: 'intro' });
                        } catch (err: any) {
                          toast.error(err.message, { id: 'intro' });
                        }
                      }}
                    />
                  </label>
                  <button type="button" onClick={async () => { await legacySocialApi.clearIntro(); toast.success('Intro removed'); }} className="text-xs text-red-500 mt-3 inline-block">Remove intro</button>
                </div>
              </div>
            )}

            {tab === 'privacy' && (
              <div className="space-y-4 text-sm">
                <label className="block">Who can post on your wall
                  <select value={wallPermission} onChange={(e) => setWallPermission(e.target.value)} className="mt-1 w-full bg-muted rounded-xl px-3 py-2">
                    {WALL_PERMISSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={viewOptIn} onChange={(e) => setViewOptIn(e.target.checked)} />
                  Count profile views (visible only to you)
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={whoOptIn} onChange={(e) => setWhoOptIn(e.target.checked)} />
                  Show who viewed (creator / verified)
                </label>
                <div>
                  <label className="block text-xs font-semibold mb-1">Vanity URL</label>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground self-center text-xs">/u/</span>
                    <input value={vanity} onChange={(e) => setVanity(e.target.value.toLowerCase())} className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm" />
                    <button
                      type="button"
                      disabled={vanityMeta && vanityMeta.canChange === false}
                      onClick={async () => {
                        try {
                          await legacySocialApi.saveVanity(vanity);
                          toast.success('Username updated');
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: previewTheme.accent }}
                    >
                      Claim
                    </button>
                  </div>
                  {vanityMeta?.canChange === false && (
                    <p className="text-[11px] text-muted-foreground mt-1">You can change this again after {new Date(vanityMeta.nextAllowedAt).toLocaleDateString()}.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={`hidden md:block rounded-2xl border border-border p-3 bg-muted/20 ${preview === 'mobile' ? 'max-w-sm mx-auto' : preview === 'tablet' ? 'max-w-2xl mx-auto' : ''}`}>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{preview} preview</p>
            <div className="space-y-2" style={{ background: previewTheme.background || undefined, borderRadius: previewTheme.radius, padding: 8 }}>
              {layout.map((w) => (
                <div key={w.id} className="text-xs p-3 bg-card/80 border border-border" style={{ borderRadius: previewTheme.radius }}>
                  {WIDGET_META[w.type]?.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-sm bg-muted">Cancel</button>
          <button type="button" disabled={saving} onClick={saveAll} className="px-4 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-60" style={{ background: previewTheme.accent }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );
}
