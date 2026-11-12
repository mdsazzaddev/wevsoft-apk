import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { X, ImagePlus, Camera, Globe2, Lock, EyeOff, Loader2, Check } from 'lucide-react';
import { useStore } from '../../store';
import { resolveAvatarUrl } from '../UserAvatar';
import { hubFetch, uploadHubMedia, CATEGORY_META, type HubGroup } from './groupsApi';

const PRIVACY = [
  { key: 'public', label: 'Public', sub: 'Anyone can see the group and its posts', icon: Globe2 },
  { key: 'private', label: 'Private', sub: 'Anyone can find it; only members see posts', icon: Lock },
  { key: 'secret', label: 'Secret', sub: 'Only members can find and see it', icon: EyeOff },
] as const;

export function CreateGroupModal({ onClose, onCreated, defaultCategory }: { onClose: () => void; onCreated: (g: HubGroup) => void; defaultCategory?: string | null }) {
  const token = useStore((s) => s.token);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(defaultCategory && CATEGORY_META[defaultCategory] ? defaultCategory : 'technology');
  const [privacy, setPrivacy] = useState<'public' | 'private' | 'secret'>('public');
  const [cover, setCover] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'cover' | 'avatar' | null>(null);
  const [saving, setSaving] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const upload = async (file: File | undefined, kind: 'cover' | 'avatar') => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image'); return; }
    setUploading(kind);
    try {
      const r = await uploadHubMedia(token, file);
      if (kind === 'cover') setCover(r.url); else setAvatar(r.url);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 3) { toast.error('Group name needs at least 3 characters'); return; }
    setSaving(true);
    try {
      const { group } = await hubFetch<{ group: HubGroup }>(token, '/groups', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), category, privacy, coverPhoto: cover, avatar }),
      });
      toast.success('Group created');
      onCreated(group);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Could not create group');
    } finally {
      setSaving(false);
    }
  };

  const coverUrl = resolveAvatarUrl(cover);
  const avatarUrl = resolveAvatarUrl(avatar);
  const field = 'w-full rounded-xl border border-border bg-muted/60 px-3.5 py-2.5 text-[14px] text-foreground outline-none transition focus:border-primary/60 focus:bg-card focus:ring-2 focus:ring-primary/15 ';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create group">
      <motion.button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="relative flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-lg sm:max-h-[92vh] sm:max-w-[560px] sm:rounded-3xl"
      >
        <div className="relative flex items-center justify-center border-b border-border px-5 py-4 ">
          <h2 className="text-[16px] font-bold text-foreground ">Create a group</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted ">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Cover + avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              className={`group relative block h-36 w-full overflow-hidden ${CATEGORY_META[category]?.grad || 'bg-muted'}`}
            >
              {coverUrl && <img src={coverUrl} alt="" className="h-full w-full object-cover" />}
              <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-90 transition group-hover:bg-black/30">
                <span className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-[12.5px] font-semibold ">
                  {uploading === 'cover' ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />} {cover ? 'Change cover' : 'Add cover photo'}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              aria-label="Upload group icon"
              className="absolute -bottom-8 left-5 grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-xl border-4 border-card bg-muted text-muted-foreground shadow-sm "
            >
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : uploading === 'avatar' ? <Loader2 size={20} className="animate-spin" /> : <Camera size={22} />}
            </button>
            <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0], 'cover'); e.target.value = ''; }} />
            <input ref={avatarRef} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0], 'avatar'); e.target.value = ''; }} />
          </div>

          <div className="space-y-4 px-5 pb-5 pt-12">
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80 ">Group name *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required autoFocus placeholder="e.g. React Developers Dhaka" className={field} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80 ">Description</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={3} placeholder="What is this group about?" className={`${field} resize-none`} />
            </label>
            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80 ">Category</span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(CATEGORY_META).map(([key, m]) => {
                  const on = key === category;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(key)}
                      aria-pressed={on}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${on ? 'border-primary bg-primary/10 text-primary ' : 'border-border text-foreground/70 hover:border-foreground/25 '}`}
                    >
                      <m.icon size={13} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[12.5px] font-semibold text-foreground/80 ">Privacy</span>
              <div className="grid gap-2 sm:grid-cols-3">
                {PRIVACY.map((p) => {
                  const on = p.key === privacy;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPrivacy(p.key)}
                      aria-pressed={on}
                      className={`relative rounded-xl border p-3 text-left transition ${on ? 'border-primary bg-primary/10 ' : 'border-border hover:border-foreground/25 '}`}
                    >
                      <p.icon size={17} className={on ? 'text-primary ' : 'text-muted-foreground'} />
                      <p className="mt-1.5 text-[13px] font-semibold text-foreground ">{p.label}</p>
                      <p className="text-[11.5px] leading-snug text-muted-foreground ">{p.sub}</p>
                      {on && <Check size={14} className="absolute right-2.5 top-2.5 text-primary " />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3 ">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-[13.5px] font-semibold text-foreground/70 hover:bg-muted ">Cancel</button>
          <button type="submit" disabled={saving || !!uploading || name.trim().length < 3} className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />} Create group
          </button>
        </div>
      </motion.form>
    </div>,
    document.body,
  );
}
