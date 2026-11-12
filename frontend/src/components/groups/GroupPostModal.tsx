import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { X, Image as ImageIcon, BarChart3, Smile, Search, Check, ChevronDown, Loader2, Plus, Trash2, Film, Users, AlertCircle, Globe2, Lock } from 'lucide-react';
import { useStore } from '../../store';
import CreatePostUnsavedBar, { useBeforeUnloadGuard } from '../create-post/CreatePostUnsavedBar';
import { hubFetch, uploadHubMedia, GroupAvatar, PersonAvatar, FEELINGS, fmtCount, type HubGroup, type HubPost } from './groupsApi';

export type ComposerMode = 'text' | 'media' | 'poll' | 'feeling';
const MAX_GROUPS = 10;

interface MediaDraft { key: string; url: string | null; type: 'image' | 'video'; preview: string; uploading: boolean }

/**
 * Group post composer. A post MUST target at least one group (up to 10). One Post row is
 * created and linked to every selected group through GroupPost (backend: POST /api/groups-hub/posts).
 */
export function GroupPostModal({
  myGroups,
  initialGroupIds,
  mode,
  onClose,
  onPosted,
}: {
  myGroups: HubGroup[];
  initialGroupIds: string[];
  mode: ComposerMode;
  onClose: () => void;
  onPosted: (post: HubPost) => void;
}) {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user) as any;
  const [selected, setSelected] = useState<string[]>(() => {
    const pre = initialGroupIds.filter((id) => myGroups.some((g) => g.id === id)).slice(0, MAX_GROUPS);
    if (!pre.length && myGroups.length === 1) return [myGroups[0].id];
    return pre;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickQ, setPickQ] = useState('');
  const [text, setText] = useState('');
  const [media, setMedia] = useState<MediaDraft[]>([]);
  const [pollOn, setPollOn] = useState(mode === 'poll');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollDays, setPollDays] = useState(7);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [feelingOpen, setFeelingOpen] = useState(mode === 'feeling');
  const [submitting, setSubmitting] = useState(false);
  const [shareToFeed, setShareToFeed] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  // Group posts never keep drafts: leaving with changes asks Discard / Continue editing.
  const inflightFilesRef = useRef(new Map<string, File>());
  const [confirmLeave, setConfirmLeave] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmLeave) return;
      if (pickerOpen) setPickerOpen(false);
      else requestCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen, confirmLeave]);

  useEffect(() => {
    if (mode === 'media') setTimeout(() => fileRef.current?.click(), 80);
    // Nothing chosen yet -> open the group picker right away so the requirement is obvious.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!selected.length && myGroups.length > 1) setPickerOpen(true);
     
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => { if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pickerOpen]);

  const hasDraft =
    !!text.trim() || media.length > 0 || !!feeling || (pollOn && pollOptions.some((o) => o.trim()));

  useBeforeUnloadGuard(hasDraft && !finishedRef.current);
  const requestClose = () => {
    if (hasDraft && !finishedRef.current) setConfirmLeave(true);
    else onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;
  const discardAndClose = () => {
    finishedRef.current = true;
    setConfirmLeave(false);
    setText(''); setMedia([]); setFeeling(null); setPollOn(false); setPollOptions(['', '']);
    onClose();
  };

  const filtered = useMemo(() => {
    const q = pickQ.trim().toLowerCase();
    return q ? myGroups.filter((g) => g.name.toLowerCase().includes(q)) : myGroups;
  }, [myGroups, pickQ]);

  const toggle = (id: string) =>
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= MAX_GROUPS) { toast.error(`You can post to at most ${MAX_GROUPS} groups at once`); return cur; }
      return [...cur, id];
    });

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const room = 6 - media.length;
    if (room <= 0) { toast.error('Up to 6 photos or videos per post'); return; }
    Array.from(files).slice(0, room).forEach((file) => {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const type: 'image' | 'video' = file.type.startsWith('video') ? 'video' : 'image';
      setMedia((m) => [...m, { key, url: null, type, preview: URL.createObjectURL(file), uploading: true }]);
      startUpload(key, file);
    });
  };

  const startUpload = (key: string, file: File) => {
    inflightFilesRef.current.set(key, file);
    uploadHubMedia(token, file)
      .then((up) => {
        inflightFilesRef.current.delete(key);
        setMedia((m) => m.map((x) => (x.key === key ? { ...x, url: up.url, type: up.type, uploading: false } : x)));
      })
      .catch((e) => {
        inflightFilesRef.current.delete(key);
        toast.error(e.message || 'Upload failed');
        setMedia((m) => m.filter((x) => x.key !== key));
      });
  };

  const filledOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const pollValid = !pollOn || (filledOptions.length >= 2 && !!text.trim());
  const hasBody = !!text.trim() || media.some((m) => m.url);
  const uploading = media.some((m) => m.uploading);
  const canSubmit = selected.length > 0 && hasBody && pollValid && !uploading && !submitting;

  const submit = async () => {
    setTouched(true);
    if (!selected.length) { setPickerOpen(true); return; }
    if (pollOn && !text.trim()) { toast.error('Write your poll question in the text box'); return; }
    if (pollOn && filledOptions.length < 2) { toast.error('A poll needs at least 2 options'); return; }
    if (!hasBody) { toast.error('Write something or add a photo/video'); return; }
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { post } = await hubFetch<{ post: HubPost }>(token, '/posts', {
        method: 'POST',
        body: JSON.stringify({
          groupIds: selected,
          content: text.trim(),
          feeling,
          media: media.filter((m) => m.url).map((m) => ({ url: m.url, type: m.type })),
          poll: pollOn ? { question: text.trim(), options: filledOptions, durationHours: pollDays * 24 } : undefined,
        }),
      });
      toast.success(
        shareToFeed
          ? (selected.length > 1 ? `Posted to ${selected.length} groups + main feed` : 'Posted to group + main feed')
          : (selected.length > 1 ? `Posted to ${selected.length} groups` : 'Posted to the group'),
      );
      finishedRef.current = true;
      onPosted(post);
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Could not post');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedGroups = selected.map((id) => myGroups.find((g) => g.id === id)).filter(Boolean) as HubGroup[];
  const feelingRow = FEELINGS.find((f) => f.key === feeling);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create group post">
      <motion.button type="button" aria-label="Close" className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px]" onClick={requestClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="relative flex max-h-[100dvh] w-full flex-col rounded-t-3xl border border-border bg-card shadow-lg sm:max-h-[90vh] sm:max-w-[600px] sm:rounded-3xl"
      >
        <div className="relative flex items-center justify-center border-b border-border px-5 py-4 ">
          <h2 className="text-[16px] font-bold text-foreground ">Create group post</h2>
          <button type="button" onClick={requestClose} aria-label="Close" className="absolute right-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-muted ">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Author + required group picker */}
          <div className="flex items-start gap-3">
            <PersonAvatar user={user} size={42} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foreground ">{user?.name || 'You'}</p>
              <div className="relative mt-1" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  aria-expanded={pickerOpen}
                  aria-haspopup="listbox"
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold transition ${
                    touched && !selected.length
                      ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-300 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/40'
                      : 'bg-primary/10 text-primary hover:bg-primary/15 '
                  }`}
                >
                  <Users size={13} />
                  {selected.length ? `Posting to ${selected.length} group${selected.length === 1 ? '' : 's'}` : 'Choose groups (required)'}
                  <ChevronDown size={13} className={`transition ${pickerOpen ? 'rotate-180' : ''}`} />
                </button>

                {pickerOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="absolute left-0 z-20 mt-1.5 w-[min(340px,calc(100vw-5.5rem))] overflow-hidden rounded-xl border border-border bg-card shadow-lg "
                  >
                    <div className="border-b border-border p-2 ">
                      <label className="relative block">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          autoFocus
                          value={pickQ}
                          onChange={(e) => setPickQ(e.target.value)}
                          placeholder="Search your groups..."
                          aria-label="Search your groups"
                          className="w-full rounded-lg bg-muted py-2 pl-8 pr-3 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground "
                        />
                      </label>
                      <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-muted-foreground ">
                        <span>{selected.length}/{Math.min(MAX_GROUPS, myGroups.length)} selected</span>
                        <span className="flex gap-2">
                          <button type="button" className="font-semibold text-primary hover:underline " onClick={() => setSelected(myGroups.slice(0, MAX_GROUPS).map((g) => g.id))}>Select all</button>
                          {selected.length > 0 && <button type="button" className="font-semibold hover:underline" onClick={() => setSelected([])}>Clear</button>}
                        </span>
                      </div>
                    </div>
                    <div className="max-h-[260px] overflow-y-auto p-1.5" role="listbox" aria-multiselectable="true">
                      {filtered.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">No groups match "{pickQ}"</p>}
                      {filtered.map((g) => {
                        const on = selected.includes(g.id);
                        return (
                          <button
                            key={g.id}
                            type="button"
                            role="option"
                            aria-selected={on}
                            onClick={() => toggle(g.id)}
                            className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition ${on ? 'bg-primary/10 ' : 'hover:bg-muted/60 '}`}
                          >
                            <GroupAvatar group={g} size={32} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-semibold text-foreground ">{g.name}</span>
                              <span className="block text-[11px] capitalize text-muted-foreground ">{g.privacy} · {fmtCount(g.memberCount)} member{g.memberCount === 1 ? '' : 's'}</span>
                            </span>
                            <span className={`grid h-5 w-5 place-items-center rounded-md border transition ${on ? 'border-primary bg-primary text-white' : 'border-border '}`}>
                              {on && <Check size={13} strokeWidth={3} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={() => setAudienceOpen((o) => !o)}
                  aria-expanded={audienceOpen}
                  aria-haspopup="listbox"
                  className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-[12px] font-semibold text-foreground/80 transition hover:bg-muted "
                >
                  {shareToFeed ? <Globe2 size={13} className="text-primary" /> : <Lock size={13} className="text-muted-foreground" />}
                  {shareToFeed ? 'Also on main feed' : 'Group only'}
                  <ChevronDown size={13} className={`transition ${audienceOpen ? 'rotate-180' : ''}`} />
                </button>
                {audienceOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 z-20 mt-1.5 w-[min(320px,calc(100vw-5.5rem))] overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-sm "
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={!shareToFeed}
                      onClick={() => { setShareToFeed(false); setAudienceOpen(false); }}
                      className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${!shareToFeed ? 'bg-primary/10 ' : 'hover:bg-muted/60 '}`}
                    >
                      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-muted text-foreground/70 "><Lock size={15} /></span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground ">Group only {!shareToFeed && <Check size={14} className="text-primary" />}</span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground ">Only members of the selected group(s) see this. It will not appear on the main home feed.</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      role="option"
                      aria-selected={shareToFeed}
                      disabled
                      aria-disabled="true"
                      title="Coming soon"
                      onClick={() => undefined}
                      className="flex w-full cursor-not-allowed items-start gap-3 rounded-xl px-2.5 py-2.5 text-left opacity-55"
                    >
                      <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary "><Globe2 size={15} /></span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground ">Also on main feed <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Soon</span></span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground ">Coming soon. For now group posts stay inside their groups.</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Selected chips */}
          {(selectedGroups.length > 0 || (touched && !selected.length)) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {selectedGroups.map((g) => (
                <span key={g.id} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 py-0.5 pl-0.5 pr-1.5 text-[12px] font-medium text-foreground/80 ">
                  <GroupAvatar group={g} size={20} className="!rounded-full" />
                  <span className="max-w-[150px] truncate">{g.name}</span>
                  <button type="button" onClick={() => toggle(g.id)} aria-label={`Remove ${g.name}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground ">
                    <X size={12} />
                  </button>
                </span>
              ))}
              {touched && !selected.length && (
                <span className="flex items-center gap-1 text-[12px] font-medium text-rose-600 dark:text-rose-300"><AlertCircle size={13} /> Pick at least one group</span>
              )}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={pollOn ? 'Ask a question...' : 'Share something with your group...'}
            rows={media.length ? 3 : 5}
            maxLength={10000}
            className="mt-3 w-full resize-none bg-transparent text-[16px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground "
          />
          {feelingRow && (
            <p className="mb-2 flex items-center gap-1.5 text-[13px] text-foreground/70 ">
              {feelingRow.emoji} feeling <b className="capitalize">{feelingRow.key}</b>
              <button type="button" onClick={() => setFeeling(null)} className="rounded-full p-0.5 text-muted-foreground hover:text-foreground" aria-label="Remove feeling"><X size={12} /></button>
            </p>
          )}

          {media.length > 0 && (
            <div className={`grid gap-2 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {media.map((m) => (
                <div key={m.key} className={`relative overflow-hidden rounded-xl bg-muted ${media.length === 1 ? 'aspect-video' : 'aspect-square'}`}>
                  {m.type === 'video' ? <video src={m.preview} muted className="h-full w-full object-cover" /> : <img src={m.preview} alt="" className="h-full w-full object-cover" />}
                  {m.type === 'video' && <Film size={14} className="absolute bottom-2 left-2 text-white drop-shadow" />}
                  {m.uploading && <span className="absolute inset-0 grid place-items-center bg-black/40 text-white"><Loader2 className="animate-spin" size={20} /></span>}
                  <button type="button" onClick={() => setMedia((l) => l.filter((x) => x.key !== m.key))} aria-label="Remove media" className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white hover:bg-black/75">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pollOn && (
            <div className="mt-2 rounded-xl border border-border p-3 ">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground/80 "><BarChart3 size={14} className="text-amber-500" /> Poll options</span>
                <button type="button" onClick={() => setPollOn(false)} className="text-[12px] font-medium text-muted-foreground hover:text-rose-500">Remove poll</button>
              </div>
              <div className="space-y-2">
                {pollOptions.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={o}
                      maxLength={80}
                      onChange={(e) => setPollOptions((l) => l.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1 rounded-xl border border-border bg-muted/60 px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary/60 "
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => setPollOptions((l) => l.filter((_, j) => j !== i))} aria-label={`Remove option ${i + 1}`} className="p-1.5 text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                {pollOptions.length < 4 ? (
                  <button type="button" onClick={() => setPollOptions((l) => [...l, ''])} className="flex items-center gap-1 text-[12px] font-semibold text-primary "><Plus size={13} /> Add option</button>
                ) : <span />}
                <select value={pollDays} onChange={(e) => setPollDays(Number(e.target.value))} aria-label="Poll duration" className="rounded-lg border border-border bg-card px-2 py-1 text-[12px] text-foreground/80 ">
                  <option value={1}>Ends in 1 day</option>
                  <option value={3}>Ends in 3 days</option>
                  <option value={7}>Ends in 7 days</option>
                  <option value={14}>Ends in 14 days</option>
                </select>
              </div>
            </div>
          )}

          {feelingOpen && (
            <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl border border-border p-2 sm:grid-cols-4">
              {FEELINGS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => { setFeeling(f.key === feeling ? null : f.key); setFeelingOpen(false); }}
                  className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-left text-[12.5px] capitalize transition ${feeling === f.key ? 'bg-primary/10 font-semibold text-primary ' : 'text-foreground/80 hover:bg-muted/60 '}`}
                >
                  <span className="text-[16px]">{f.emoji}</span> {f.key}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 ">
          <div className="mb-3 flex items-center justify-between rounded-xl border border-border px-3 py-2 ">
            <span className="text-[13px] font-semibold text-foreground/80 ">Add to your post</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => fileRef.current?.click()} title="Photo/Video" aria-label="Add photo or video" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"><ImageIcon size={20} /></button>
              <button type="button" onClick={() => setPollOn((v) => !v)} title="Poll" aria-label="Add poll" className={`grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground ${pollOn ? 'bg-primary/10 text-primary' : ''}`}><BarChart3 size={20} /></button>
              <button type="button" onClick={() => setFeelingOpen((v) => !v)} title="Feeling" aria-label="Add feeling" className={`grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground ${feelingOpen || feeling ? 'bg-primary/10 text-primary' : ''}`}><Smile size={20} /></button>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || uploading}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-primary-foreground transition ${canSubmit ? 'bg-primary shadow-sm hover:bg-primary/90' : 'bg-primary/50 '}`}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {uploading ? 'Uploading media...' : selected.length > 1 ? `Post to ${selected.length} groups` : 'Post'}
          </button>
        </div>
      </motion.div>
      <CreatePostUnsavedBar open={confirmLeave} onContinue={() => setConfirmLeave(false)} onDiscard={discardAndClose} />
    </div>,
    document.body,
  );
}
