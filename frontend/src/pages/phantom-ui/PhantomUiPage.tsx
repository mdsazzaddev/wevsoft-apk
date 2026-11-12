/**
 * Phantom — anonymous board inside Wevsoft. Layout follows /workspace/phantom/reference-feed.png.
 * Privacy (v3): the server stores nothing about who posts. Every post is owned only by its PIN.
 * Saved posts and "I reacted" marks live on this device (localStorage) only.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Bell, Bookmark, ChevronRight, Clapperboard, Clock, EyeOff, FileText, Flame, Gauge, Hash, Heart, HelpCircle, Image as ImageIcon, Info, KeyRound, Lock, MessageCircle,
  Mic, Moon, MoreHorizontal, Music, PenSquare, Search, Settings, Share2, Shield, ShieldAlert, ShieldCheck, Sun, TrendingUp, Video, Volume2, X, Zap,
} from 'lucide-react';
import './phantom-ui.css';
import { useStore } from '../../store';
import { ArtImage, GhostAvatar, HoodedFigure, Skyline } from './PhantomArt';
import { dismissWevSplash } from '../../lib/wevSplash';

type Post = { id: string; alias: string; content: string; hashtags: string[]; media: { url: string; type: string } | null; createdAt: string; editedAt: string | null; commentsOff: boolean; counts: { reactions: number; comments: number; shares: number } };
type Tab = 'latest' | 'popular' | 'saved';
type Panel = null | 'privacy' | 'safety' | 'help' | 'settings';
type ApiError = Error & { data?: any };

async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useStore.getState().token;
  const isForm = init.body instanceof FormData;
  const r = await fetch(`/api/phantom${path}`, { ...init, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isForm || !init.body ? {} : { 'Content-Type': 'application/json' }) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j?.error || `http_${r.status}`) as ApiError; e.data = j; throw e; }
  return j;
}
const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });
function errText(e: any) {
  const d = e?.data || {};
  if (e?.message === 'pin_locked') return `Too many wrong PINs. This item is locked for ${Math.ceil((d.retryAfterSec || 900) / 60)} min.`;
  if (e?.message === 'bad_pin') return `Wrong PIN. ${d.remaining ?? ''} ${d.remaining === 1 ? 'try' : 'tries'} left before a 15-minute lock.`;
  return ({ rate_limited: 'Slow down a little and try again shortly.', empty_post: 'Write something or attach a file.', pin_required: 'Set a PIN of at least 4 characters.', bad_image: 'That image could not be read.', comments_off: 'Comments are turned off for this post.', no_pin: 'This comment was posted without a PIN, so it cannot be deleted.', bad_pin_format: 'PIN must be 4–128 characters.' } as Record<string, string>)[e?.message] || 'Something went wrong. Please try again.';
}
function ago(iso: string) {
  const s = Math.max(0, (Date.now() - +new Date(iso)) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : s < 2592000 ? `${Math.floor(s / 86400)}d ago` : new Date(iso).toLocaleDateString();
}
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n));
const SETTINGS_KEY = 'phantom.settings', SAVED_KEY = 'phantom.saved', REACTED_KEY = 'phantom.reacted';
const DEFAULTS = { sound: false, animations: true, reducedMotion: false, lightMode: false };
const readSet = (k: string) => { try { return new Set<string>(JSON.parse(localStorage.getItem(k) || '[]')); } catch { return new Set<string>(); } };
const writeSet = (k: string, s: Set<string>) => localStorage.setItem(k, JSON.stringify([...s].slice(-500)));
function blip(on: boolean) {
  if (!on) return;
  try { const C = (window as any).AudioContext || (window as any).webkitAudioContext; const c = new C(); const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = 520; g.gain.value = 0.04; o.connect(g); g.connect(c.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18); o.stop(c.currentTime + 0.2); } catch { /* ignore */ }
}

function Modal({ title, icon, onClose, children }: { title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="ph-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ph-card ph-modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="ph-icon-btn x" onClick={onClose} aria-label="Close"><X size={16} /></button>
        <h2>{icon}{title}</h2>{children}
      </div>
    </div>
  );
}

/** Asks for a PIN and runs `run(pin)`; shows wrong-PIN / lockout messages from the server. */
function PinModal({ title, hint, action, run, onClose }: { title: string; hint: string; action: string; run: (pin: string) => Promise<void>; onClose: () => void }) {
  const [pin, setPin] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => { if (pin.length < 4) return setErr('PIN is at least 4 characters.'); setBusy(true); setErr(''); try { await run(pin); } catch (e) { setErr(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title={title} icon={<KeyRound size={18} />} onClose={onClose}>
      <p style={{ marginTop: 0 }}>{hint}</p>
      <input className="ph-input" type="password" autoFocus autoComplete="off" value={pin} maxLength={128} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Phantom PIN" aria-label="Phantom PIN" />
      {err && <div className="ph-pin-err" role="alert">{err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}><button className="ph-small-btn" onClick={onClose}>Cancel</button><button className="ph-btn-red" style={{ padding: '7px 18px' }} disabled={busy} onClick={go}><Lock size={13} /> {busy ? 'Checking…' : action}</button></div>
    </Modal>
  );
}

function ReportModal({ type, id, onClose, toast }: { type: 'post' | 'comment'; id: string; onClose: () => void; toast: (s: string) => void }) {
  const [preset, setPreset] = useState(''); const [details, setDetails] = useState('');
  const presets = ['Harassment', 'Hate or threats', 'Private information', 'Spam or scam', 'Sexual or violent content', 'Other'];
  const submit = async () => { try { await api('/reports', json('POST', { targetType: type, targetId: id, reason: details.trim() ? `${preset}: ${details.trim()}` : preset })); toast('Report sent to moderators'); onClose(); } catch (e) { toast(errText(e)); } };
  return (
    <Modal title={`Report ${type}`} icon={<ShieldAlert size={18} />} onClose={onClose}>
      <div className="ph-seg">{presets.map((p) => <button key={p} className={`ph-tab${preset === p ? ' on' : ''}`} onClick={() => setPreset(p)}>{p}</button>)}</div>
      <textarea className="ph-input" rows={3} maxLength={400} placeholder="Details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><button className="ph-btn-red" style={{ padding: '8px 18px' }} disabled={!preset} onClick={submit}>Send report</button></div>
    </Modal>
  );
}

function Comments({ post, toast, onCount }: { post: Post; toast: (s: string) => void; onCount: (n: number) => void }) {
  const [rows, setRows] = useState<Array<{ id: string; alias: string; content: string; createdAt: string; hasPin: boolean }> | null>(null);
  const [text, setText] = useState(''); const [pin, setPin] = useState(''); const [usePin, setUsePin] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null); const [deleting, setDeleting] = useState<string | null>(null);
  useEffect(() => { void api(`/posts/${post.id}/comments`).then((r) => setRows(r.comments)).catch(() => setRows([])); }, [post.id]);
  const send = async () => {
    if (!text.trim()) return; if (usePin && pin.length < 4) return toast('Comment PIN must be at least 4 characters.');
    try { const r = await api(`/posts/${post.id}/comments`, json('POST', { content: text, pin: usePin ? pin : undefined })); const n = [...(rows || []), r.comment]; setRows(n); onCount(n.length); setText(''); setPin(''); } catch (e) { toast(errText(e)); }
  };
  return (
    <div className="ph-comments">
      {rows?.length === 0 && <div className="ph-muted" style={{ fontSize: 11, marginBottom: 8 }}>No comments yet.</div>}
      {rows?.map((c) => (
        <div key={c.id} className="ph-comment"><GhostAvatar size={24} ring={false} /><div className="bubble"><b>{c.alias}</b> <small className="ph-muted">{ago(c.createdAt)}</small><div>{c.content}</div></div>
          {c.hasPin && <button className="ph-icon-btn" aria-label="Delete comment with PIN" title="Delete with PIN" onClick={() => setDeleting(c.id)}><KeyRound size={12} /></button>}
          <button className="ph-icon-btn" aria-label="Report comment" onClick={() => setReporting(c.id)}><ShieldAlert size={12} /></button>
        </div>
      ))}
      {post.commentsOff ? <div className="ph-muted" style={{ fontSize: 11 }}>Comments are turned off for this post.</div> : <>
        <div className="ph-comment-form"><input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Write an anonymous comment…" aria-label="Comment" /><button className="ph-small-btn" onClick={send}>Reply</button></div>
        <label className="ph-pin-opt"><input type="checkbox" checked={usePin} onChange={(e) => setUsePin(e.target.checked)} /> Add a PIN so I can delete this comment later</label>
        {usePin && <input className="ph-input" type="password" autoComplete="new-password" style={{ marginTop: 6 }} value={pin} maxLength={128} onChange={(e) => setPin(e.target.value)} placeholder="Comment PIN (min 4)" aria-label="Comment PIN" />}
      </>}
      {reporting && <ReportModal type="comment" id={reporting} onClose={() => setReporting(null)} toast={toast} />}
      {deleting && <PinModal title="Delete comment" hint="Enter the PIN you set when you wrote this comment." action="Delete" onClose={() => setDeleting(null)} run={async (p) => { await api(`/comments/${deleting}`, json('DELETE', { pin: p })); const n = (rows || []).filter((c) => c.id !== deleting); setRows(n); onCount(n.length); setDeleting(null); toast('Comment deleted'); }} />}
    </div>
  );
}

function PostCard({ post, onChange, onRemove, toast, onTag, sound, saved, reacted, onSave, onReact, open: openInit, onOpenPost }: { post: Post; onChange: (p: Post) => void; onRemove: () => void; toast: (s: string) => void; onTag: (t: string) => void; sound: boolean; saved: boolean; reacted: boolean; onSave: () => void; onReact: (on: boolean) => void; open?: boolean; onOpenPost?: (id: string) => void }) {
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(!!openInit);
  const [report, setReport] = useState(false);
  const [askPin, setAskPin] = useState(false);
  const [pin, setPin] = useState<string | null>(null); // kept in memory only while this card is mounted
  const [editing, setEditing] = useState<string | null>(null);
  const react = async () => { try { blip(sound); const r = await api(`/posts/${post.id}/react`, json('POST', { on: !reacted })); onReact(!reacted); onChange({ ...post, counts: { ...post.counts, reactions: r.reactions } }); } catch (e) { toast(errText(e)); } };
  const share = async () => { try { const r = await api(`/posts/${post.id}/share`, json('POST')); await navigator.clipboard?.writeText(location.origin + (r.path || `/phantom/post/${post.id}`)).catch(() => {}); onChange({ ...post, counts: { ...post.counts, shares: r.shares } }); toast('Phantom link copied'); } catch (e) { toast(errText(e)); } };
  const owner = async (body: object) => { try { const r = await api(`/posts/${post.id}`, json('PATCH', { pin, ...body })); onChange(r.post); return true; } catch (e) { toast(errText(e)); if ((e as any)?.message !== 'rate_limited') setPin(null); return false; } };
  const del = async () => { if (!confirm('Delete this post permanently?')) return; try { await api(`/posts/${post.id}`, json('DELETE', { pin })); onRemove(); toast('Post deleted'); } catch (e) { toast(errText(e)); } };
  const text = post.content.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1').trim();
  return (
    <article className="ph-card ph-post">
      <div className="ph-post-head">
        <GhostAvatar size={34} />
        <div><b>{post.alias}</b><span className="ph-ghost-tag"><Shield size={10} /> Anonymous</span><small>{ago(post.createdAt)}{post.editedAt ? ' · edited' : ''}</small></div>
        <div className="menu">
          {pin && <span className="ph-unlocked"><KeyRound size={11} /> Unlocked</span>}
          <button className="ph-icon-btn" aria-label="Post options" onClick={() => setMenu((m) => !m)}><MoreHorizontal size={16} /></button>
          {menu && <div className="ph-card ph-menu" onMouseLeave={() => setMenu(false)}>
            {!pin ? <button onClick={() => { setMenu(false); setAskPin(true); }}><KeyRound size={13} /> Phantom (enter PIN)</button> : <>
              <button onClick={() => { setMenu(false); setEditing(post.content); }}>Edit post</button>
              <button onClick={() => { setMenu(false); void owner({ commentsOff: !post.commentsOff }).then((ok) => ok && toast(post.commentsOff ? 'Comments turned on' : 'Comments turned off')); }}>{post.commentsOff ? 'Turn comments on' : 'Turn comments off'}</button>
              <button onClick={() => { setMenu(false); void del(); }}>Delete post</button>
              <button onClick={() => { setMenu(false); setPin(null); }}>Lock again</button>
            </>}
            <button onClick={() => { setMenu(false); void share(); }}>Copy Phantom link</button>
            <button onClick={() => { setMenu(false); setReport(true); }}>Report post</button>
          </div>}
        </div>
      </div>
      <div className="ph-post-body">
        {editing !== null ? <div><textarea className="ph-input ph-edit" value={editing} maxLength={5000} onChange={(e) => setEditing(e.target.value)} aria-label="Edit post" /><div style={{ display: 'flex', gap: 8, marginTop: 6 }}><button className="ph-btn-red" style={{ padding: '5px 14px' }} onClick={async () => { if (await owner({ content: editing })) setEditing(null); }}>Save</button><button className="ph-small-btn" onClick={() => setEditing(null)}>Cancel</button></div></div> : <>
          {text && <p className={onOpenPost ? 'ph-post-text-click' : ''} onClick={() => onOpenPost?.(post.id)}>{text}</p>}
          {post.hashtags.length > 0 && <div className="ph-tags">{post.hashtags.map((t) => <button key={t} onClick={(e) => { e.stopPropagation(); onTag(t); }}>#{t}</button>)}</div>}
        </>}
        {post.media && <div className={`ph-media ${onOpenPost ? 'ph-post-clickable' : ''}`} onClick={() => onOpenPost?.(post.id)}>
          {post.media.type === 'image' && <img src={post.media.url} alt="" loading="lazy" />}
          {post.media.type === 'video' && <video src={post.media.url} controls preload="metadata" onClick={(e) => e.stopPropagation()} />}
          {post.media.type === 'audio' && <audio src={post.media.url} controls preload="metadata" onClick={(e) => e.stopPropagation()} />}
          {post.media.type === 'file' && <a className="file" href={post.media.url} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()}><FileText size={16} /> Attached file</a>}
        </div>}
      </div>
      <div className="ph-actions">
        <button className={reacted ? 'liked' : ''} onClick={react} aria-pressed={reacted} aria-label="React"><Heart size={15} fill={reacted ? 'currentColor' : 'none'} /> {compact(post.counts.reactions)}</button>
        <button onClick={() => (onOpenPost ? onOpenPost(post.id) : setOpen((o) => !o))} aria-expanded={open} aria-label="Comments"><MessageCircle size={15} /> {compact(post.counts.comments)}</button>
        <button onClick={share} aria-label="Share"><Share2 size={15} /> {compact(post.counts.shares)}</button>
        <button onClick={() => setReport(true)} aria-label="Report"><ShieldAlert size={14} /></button>
        <button className={`save${saved ? ' liked' : ''}`} onClick={() => { onSave(); toast(saved ? 'Removed from saved' : 'Saved on this device'); }} aria-pressed={saved} aria-label="Save"><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /></button>
      </div>
      {open && <Comments post={post} toast={toast} onCount={(n) => onChange({ ...post, counts: { ...post.counts, comments: n } })} />}
      {report && <ReportModal type="post" id={post.id} onClose={() => setReport(false)} toast={toast} />}
      {askPin && <PinModal title="Phantom PIN" hint="Enter the PIN you set when you published this post to edit, delete or turn comments off. Nobody, including Wevsoft, can recover a lost PIN." action="Unlock" onClose={() => setAskPin(false)} run={async (p) => { await api(`/posts/${post.id}/unlock`, json('POST', { pin: p })); setPin(p); setAskPin(false); setMenu(true); toast('Post unlocked'); }} />}
    </article>
  );
}

function PhantomPostOverlay({
  postId,
  post: initialPost,
  onClose,
  onChange,
  onRemove,
  toast,
  onTag,
  sound,
  saved,
  reacted,
  onSave,
  onReact,
}: {
  postId: string;
  post: Post | null;
  onClose: () => void;
  onChange: (p: Post) => void;
  onRemove: (id: string) => void;
  toast: (s: string) => void;
  onTag: (t: string) => void;
  sound: boolean;
  saved: boolean;
  reacted: boolean;
  onSave: () => void;
  onReact: (on: boolean) => void;
}) {
  const [post, setPost] = useState<Post | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost || initialPost.id !== postId);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [askPin, setAskPin] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (initialPost && initialPost.id === postId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPost(initialPost);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    api(`/posts/${postId}`)
      .then((r) => {
        if (!active) return;
        setPost(r.post);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.data?.error === 'not_found' ? 'This Phantom post was deleted or does not exist.' : errText(e));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [postId, initialPost]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const react = async () => {
    if (!post) return;
    try {
      blip(sound);
      const r = await api(`/posts/${post.id}/react`, json('POST', { on: !reacted }));
      onReact(!reacted);
      const updated = { ...post, counts: { ...post.counts, reactions: r.reactions } };
      setPost(updated);
      onChange(updated);
    } catch (e) {
      toast(errText(e));
    }
  };

  const share = async () => {
    if (!post) return;
    try {
      const r = await api(`/posts/${post.id}/share`, json('POST'));
      await navigator.clipboard?.writeText(location.origin + (r.path || `/phantom/post/${post.id}`)).catch(() => {});
      const updated = { ...post, counts: { ...post.counts, shares: r.shares } };
      setPost(updated);
      onChange(updated);
      toast('Phantom link copied');
    } catch (e) {
      toast(errText(e));
    }
  };

  const owner = async (body: object) => {
    if (!post) return false;
    try {
      const r = await api(`/posts/${post.id}`, json('PATCH', { pin, ...body }));
      setPost(r.post);
      onChange(r.post);
      return true;
    } catch (e) {
      toast(errText(e));
      if ((e as any)?.message !== 'rate_limited') setPin(null);
      return false;
    }
  };

  const del = async () => {
    if (!post || !confirm('Delete this post permanently?')) return;
    try {
      await api(`/posts/${post.id}`, json('DELETE', { pin }));
      onRemove(post.id);
      onClose();
      toast('Post deleted');
    } catch (e) {
      toast(errText(e));
    }
  };

  const text = post ? post.content.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1').trim() : '';

  return (
    <div className="ph-post-overlay-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ph-post-overlay" role="dialog" aria-modal="true" aria-label="Phantom Post Page">
        <div className="ph-post-overlay-top">
          <button className="ph-post-overlay-back" onClick={onClose} aria-label="Back to Phantom feed">
            <ArrowLeft size={15} /> Back to feed
          </button>
          <div className="ph-post-overlay-top-title">
            <Shield size={14} /> Phantom Post
          </div>
          <button className="ph-icon-btn" onClick={onClose} aria-label="Close post overlay">
            <X size={16} />
          </button>
        </div>

        <div className="ph-post-overlay-scroll">
          {loading && <div className="ph-empty" style={{ padding: '60px 0' }}>Loading post details…</div>}
          {error && !loading && (
            <div className="ph-card ph-empty" style={{ padding: '40px 20px', lineHeight: 1.6 }}>
              <ShieldAlert size={28} className="ph-red" style={{ marginBottom: 10 }} />
              <div>{error}</div>
              <button className="ph-btn-red" style={{ marginTop: 16, padding: '7px 18px' }} onClick={onClose}>
                Back to Phantom Feed
              </button>
            </div>
          )}

          {post && !loading && (
            <article>
              <div className="ph-post-head">
                <GhostAvatar size={40} />
                <div>
                  <b>{post.alias}</b>
                  <span className="ph-ghost-tag"><Shield size={10} /> Anonymous</span>
                  <small>{ago(post.createdAt)}{post.editedAt ? ' · edited' : ''}</small>
                </div>
                <div className="menu" style={{ marginLeft: 'auto' }}>
                  {pin && <span className="ph-unlocked"><KeyRound size={11} /> Unlocked</span>}
                  <button className="ph-icon-btn" aria-label="Post options" onClick={() => setMenu((m) => !m)}>
                    <MoreHorizontal size={16} />
                  </button>
                  {menu && (
                    <div className="ph-card ph-menu" onMouseLeave={() => setMenu(false)}>
                      {!pin ? (
                        <button onClick={() => { setMenu(false); setAskPin(true); }}>
                          <KeyRound size={13} /> Phantom (enter PIN)
                        </button>
                      ) : (
                        <>
                          <button onClick={() => { setMenu(false); setEditing(post.content); }}>Edit post</button>
                          <button onClick={() => { setMenu(false); void owner({ commentsOff: !post.commentsOff }).then((ok) => ok && toast(post.commentsOff ? 'Comments turned on' : 'Comments turned off')); }}>
                            {post.commentsOff ? 'Turn comments on' : 'Turn comments off'}
                          </button>
                          <button onClick={() => { setMenu(false); void del(); }}>Delete post</button>
                          <button onClick={() => { setMenu(false); setPin(null); }}>Lock again</button>
                        </>
                      )}
                      <button onClick={() => { setMenu(false); void share(); }}>Copy Phantom link</button>
                      <button onClick={() => { setMenu(false); setReport(true); }}>Report post</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="ph-post-body">
                {editing !== null ? (
                  <div>
                    <textarea
                      className="ph-input ph-edit"
                      value={editing}
                      maxLength={5000}
                      onChange={(e) => setEditing(e.target.value)}
                      aria-label="Edit post content"
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="ph-btn-red" style={{ padding: '6px 16px' }} onClick={async () => { if (await owner({ content: editing })) setEditing(null); }}>
                        Save
                      </button>
                      <button className="ph-small-btn" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {text && <p>{text}</p>}
                    {post.hashtags.length > 0 && (
                      <div className="ph-tags">
                        {post.hashtags.map((t) => (
                          <button key={t} onClick={() => { onTag(t); onClose(); }}>#{t}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {post.media && (
                  <div className="ph-media">
                    {post.media.type === 'image' && <img src={post.media.url} alt="Attached phantom photo" loading="lazy" />}
                    {post.media.type === 'video' && <video src={post.media.url} controls preload="metadata" />}
                    {post.media.type === 'audio' && <audio src={post.media.url} controls preload="metadata" />}
                    {post.media.type === 'file' && (
                      <a className="file" href={post.media.url} target="_blank" rel="noreferrer noopener">
                        <FileText size={16} /> Attached file
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="ph-actions">
                <button className={reacted ? 'liked' : ''} onClick={react} aria-pressed={reacted} aria-label="React">
                  <Heart size={16} fill={reacted ? 'currentColor' : 'none'} /> {compact(post.counts.reactions)}
                </button>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--muted)' }}>
                  <MessageCircle size={16} /> {compact(post.counts.comments)}
                </div>
                <button onClick={share} aria-label="Share">
                  <Share2 size={16} /> {compact(post.counts.shares)}
                </button>
                <button onClick={() => setReport(true)} aria-label="Report">
                  <ShieldAlert size={15} />
                </button>
                <button className={`save${saved ? ' liked' : ''}`} onClick={() => { onSave(); toast(saved ? 'Removed from saved' : 'Saved on this device'); }} aria-pressed={saved} aria-label="Save">
                  <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>

              <div className="ph-post-overlay-comments-title">
                <MessageCircle size={16} /> Comments ({post.counts.comments})
              </div>

              <Comments
                post={post}
                toast={toast}
                onCount={(n) => {
                  const updated = { ...post, counts: { ...post.counts, comments: n } };
                  setPost(updated);
                  onChange(updated);
                }}
              />

              {report && <ReportModal type="post" id={post.id} onClose={() => setReport(false)} toast={toast} />}
              {askPin && (
                <PinModal
                  title="Phantom PIN"
                  hint="Enter the PIN you set when you published this post to edit, delete or turn comments off."
                  action="Unlock"
                  onClose={() => setAskPin(false)}
                  run={async (p) => {
                    await api(`/posts/${post.id}/unlock`, json('POST', { pin: p }));
                    setPin(p);
                    setAskPin(false);
                    setMenu(true);
                    toast('Post unlocked');
                  }}
                />
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PhantomUiPage() {
  useEffect(() => {
    dismissWevSplash();
  }, []);
  const nav = useNavigate();
  const { id: routePostId } = useParams<{ id?: string }>();
  const [params] = useSearchParams();
  const queryPostId = params.get('post');
  const activePostId = routePostId || queryPostId;
  const [tab, setTab] = useState<Tab>('latest');
  const [tag, setTag] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [offset, setOffset] = useState<number | null>(null);
  const [trending, setTrending] = useState<Array<{ tag: string; display: string; posts: number }> | null>(null);
  const [saved, setSaved] = useState(() => readSet(SAVED_KEY));
  const [reacted, setReacted] = useState(() => readSet(REACTED_KEY));
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<any>(null);
  const [bell, setBell] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [toastMsg, setToast] = useState<string | null>(null);
  const [set, setSet] = useState<Record<string, boolean>>(() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return DEFAULTS; } });
  const toast = useCallback((s: string) => { setToast(s); setTimeout(() => setToast(null), 2800); }, []);
  const flip = (k: string) => setSet((s) => { const n = { ...s, [k]: !s[k] }; localStorage.setItem(SETTINGS_KEY, JSON.stringify(n)); return n; });
  const toggleIn = (k: string, s: Set<string>, setS: (x: Set<string>) => void, id: string, on?: boolean) => { const n = new Set(s); if (on ?? !n.has(id)) n.add(id); else n.delete(id); writeSet(k, n); setS(n); };
  const openCreate = () => nav('/phantom/create');

  const load = useCallback(async (reset: boolean) => {
    const qs = new URLSearchParams({ tab, limit: '15' });
    if (tab === 'saved') { if (saved.size === 0) { setPosts([]); setOffset(null); return; } qs.set('ids', [...saved].join(',')); }
    if (tag) qs.set('tag', tag);
    if (!reset && offset) qs.set('offset', String(offset));
    try { const r = await api(`/feed?${qs}`); setPosts((p) => (reset ? r.posts : [...(p || []), ...r.posts])); setOffset(r.nextOffset); } catch { setPosts([]); }
  }, [tab, tag, offset, saved]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => { void load(true);   }, [tab, tag]);
  useEffect(() => { void api('/trending').then((r) => setTrending(r.topics)).catch(() => setTrending([])); }, [posts?.length]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (q.trim().length < 2) { setHits(null); return; }
    const t = setTimeout(() => void api(`/search?q=${encodeURIComponent(q.trim())}`).then(setHits).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q]);
  const cls = ['ph-root', set.lightMode ? 'ph-light' : '', !set.animations || set.reducedMotion ? 'ph-still' : ''].filter(Boolean).join(' ');
  const TABS: Array<[Tab, string, React.ReactNode]> = [['latest', 'Latest', <Clock size={13} />], ['popular', 'Popular', <Flame size={13} />], ['saved', 'Saved', <Bookmark size={13} />]];

  return (
    <div className={cls}>
      <div className="ph-feed">
        <header className="ph-ftop">
          <div className="ph-ftop-left">
            <button className="ph-icon-btn" aria-label="Back to Wevsoft" title="Back to Wevsoft" onClick={() => nav('/')}><ArrowLeft size={16} /></button>
            <button className="ph-flogo" onClick={() => nav('/')} aria-label="Phantom home"><div className="sub"><b>Phantom</b><small>ANONYMOUS MODE</small></div></button>
          </div>
          <div className="ph-search"><Search size={14} />
            <input id="phantomSearch" name="phantomSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in Phantom..." aria-label="Search Phantom posts and hashtags" />
            {hits && <div className="ph-card ph-search-pop" onMouseLeave={() => setHits(null)}>
              {hits.tags.length + hits.posts.length === 0 && <div className="ph-empty">No results</div>}
              {hits.tags.map((t: any) => <button key={t.tag} onClick={() => { setTag(t.tag); setQ(''); }}><Hash size={14} className="ph-red" />#{t.display} <small className="ph-muted">{t.posts} posts</small></button>)}
              {hits.posts.map((p: any) => <button key={p.id} onClick={() => { setQ(''); nav(`/phantom/post/${p.id}`); }}><MessageCircle size={14} /><b>{p.alias}</b>&nbsp;{p.content.slice(0, 60)}</button>)}
            </div>}
          </div>
          <div className="ph-ftop-right">
            <div className="ph-rel">
              <button className="ph-icon-btn" aria-label="Notifications" onClick={() => setBell((b) => !b)}><Bell size={16} /></button>
              {bell && <div className="ph-card ph-pop" onMouseLeave={() => setBell(false)}><div className="ph-empty" style={{ padding: 12, lineHeight: 1.5 }}>Phantom has no notifications. Wevsoft doesn't know which posts are yours, so it can't alert you about them.</div></div>}
            </div>
            <button type="button" className="ph-user" onClick={() => nav('/phantom/profile')} aria-label="Anonymous profile" title="Anonymous profile">
              <GhostAvatar size={28} />
              <div className="ph-user-info">
                <b>Phantom</b>
                <span className="ph-muted" style={{ fontSize: 9.5, display: 'block' }}>Incognito Mode</span>
              </div>
            </button>
            <button className="ph-icon-btn" aria-label="Settings" onClick={() => setPanel('settings')}><Settings size={16} /></button>
            <button className="ph-icon-btn" aria-label="Toggle light mode" onClick={() => flip('lightMode')}>{set.lightMode ? <Sun size={16} /> : <Moon size={16} />}</button>
          </div>
        </header>

        <aside className="ph-right">
          <div className="ph-card ph-rcard">
            <h5><Zap size={12} /> Phantom Mode <span className="ph-active-badge">Active</span></h5>
            <div className="ph-id-row"><GhostAvatar size={36} /><div><b>Phantom</b><small>Posts are owned only by their PIN</small></div></div>
            <div className="ph-id-stats"><div><b>{saved.size}</b><small>Saved here</small></div><div><b>{reacted.size}</b><small>Reacted here</small></div><div><b>0</b><small>Author data</small></div></div>
            <button className="ph-wide-btn" onClick={() => setPanel('privacy')}><Info size={13} /> How anonymity works →</button>
          </div>
          <div className="ph-card ph-rcard">
            <h5><Gauge size={12} /> Quick Actions</h5>
            <div className="ph-qa">
              <button onClick={openCreate}><span className="qi"><PenSquare size={13} /></span>Create Post<ChevronRight size={13} className="chev" /></button>
              <button onClick={() => setTab('saved')}><span className="qi"><Bookmark size={13} /></span>Saved<ChevronRight size={13} className="chev" /></button>
              <button onClick={() => setPanel('privacy')}><span className="qi"><Shield size={13} /></span>Privacy Info<ChevronRight size={13} className="chev" /></button>
              <button onClick={() => setPanel('safety')}><span className="qi"><ShieldAlert size={13} /></span>Report &amp; Safety<ChevronRight size={13} className="chev" /></button>
              <button onClick={() => setPanel('help')}><span className="qi"><KeyRound size={13} /></span>PIN &amp; Rules<ChevronRight size={13} className="chev" /></button>
            </div>
          </div>
          <div className="ph-card ph-rcard ph-trend">
            <h5><Flame size={12} /> Trending Topics</h5>
            {trending?.length === 0 && <div className="ph-muted" style={{ fontSize: 11 }}>No hashtags used in the last 30 days.</div>}
            {trending?.map((t) => <button key={t.tag} onClick={() => setTag(t.tag)}><span className="ti"><TrendingUp size={10} /></span><span><b>#{t.display}</b><small>{compact(t.posts)} {t.posts === 1 ? 'post' : 'posts'}</small></span></button>)}
          </div>
          <div className="ph-card ph-rcard">
            <h5><Settings size={12} /> Phantom Settings</h5>
            {([['sound', 'Sound', <Volume2 size={13} />], ['animations', 'Animations', <Clapperboard size={13} />], ['reducedMotion', 'Reduced Motion', <Gauge size={13} />], ['lightMode', 'Light Mode', <Sun size={13} />]] as const).map(([k, l, ic]) => (
              <div key={k} className="ph-set-row">{ic}{l}<button role="switch" aria-checked={!!set[k]} aria-label={l} className={`ph-toggle${set[k] ? ' on' : ''}`} onClick={() => flip(k)} /></div>
            ))}
            <button className="ph-set-row" onClick={() => setPanel('help')}><HelpCircle size={13} />Help &amp; Rules<ChevronRight size={13} style={{ marginLeft: 'auto' }} /></button>
          </div>
        </aside>

        <main className="ph-center">
          <div className="ph-card ph-anon-hero">
            <div className="ph-anon-hero-head">
              <div className="ph-anon-hero-badge">
                <ShieldCheck size={14} />
                <span>ZERO-KNOWLEDGE ANONYMOUS BOARD</span>
              </div>
              <span className="ph-anon-status"><span className="ph-status-dot" /> 100% Incognito</span>
            </div>
            <div className="ph-anon-features">
              <div className="ph-anon-feat">
                <EyeOff size={15} className="ph-red" />
                <div>
                  <b>Zero Identity Logs</b>
                  <span>No user ID, IP address, or session stored.</span>
                </div>
              </div>
              <div className="ph-anon-feat">
                <KeyRound size={15} className="ph-red" />
                <div>
                  <b>PIN Cryptographic Ownership</b>
                  <span>Only your secret PIN can edit or delete your post.</span>
                </div>
              </div>
              <div className="ph-anon-feat">
                <ShieldAlert size={15} className="ph-red" />
                <div>
                  <b>Auto Metadata Stripping</b>
                  <span>EXIF, GPS, and device traces wiped on upload.</span>
                </div>
              </div>
            </div>
          </div>

          <button type="button" className="ph-card ph-composer ph-composer-launch" onClick={openCreate}>
            <div className="ph-composer-row">
              <GhostAvatar size={38} />
              <div className="ph-composer-teaser" aria-label="Write an anonymous post">What's on your mind? Share anonymously...</div>
            </div>
            <div className="ph-composer-tools">
              <span className="tool"><ImageIcon size={14} /> Photo</span>
              <span className="tool"><Video size={14} /> Video</span>
              <span className="tool"><Mic size={14} /> Voice</span>
              <span className="tool"><Music size={14} /> Audio</span>
              <span className="tool"><FileText size={14} /> File</span>
              <span className="ph-aud ph-muted" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Shield size={13} /> Anonymous Post</span>
            </div>
          </button>
          <div className="ph-tabs" role="tablist">{TABS.map(([id, l, ic]) => <button key={id} role="tab" aria-selected={tab === id} className={`ph-tab${tab === id ? ' on' : ''}`} onClick={() => { setTab(id); setTag(null); if (activePostId) nav('/phantom'); }}>{ic}{l}</button>)}</div>
          {tag && <div className="ph-banner" style={{ display: 'flex', alignItems: 'center' }}>Showing #{trending?.find((t) => t.tag === tag)?.display || tag}<button className="ph-icon-btn" style={{ marginLeft: 'auto' }} aria-label="Clear filter" onClick={() => setTag(null)}><X size={13} /></button></div>}
          {posts === null && <div className="ph-empty">Loading…</div>}
          {posts?.length === 0 && <div className="ph-card ph-empty" style={{ padding: 30 }}>{tab === 'saved' ? 'Nothing saved on this device yet. Tap the bookmark on a post to keep it here.' : 'No Phantom posts yet. Write the first one above.'}</div>}
          {posts?.map((p) => <PostCard key={p.id} post={p} sound={set.sound} toast={toast} open={false} saved={saved.has(p.id)} reacted={reacted.has(p.id)}
            onOpenPost={(id) => nav(`/phantom/post/${id}`)}
            onSave={() => toggleIn(SAVED_KEY, saved, setSaved, p.id)} onReact={(on) => toggleIn(REACTED_KEY, reacted, setReacted, p.id, on)}
            onTag={(t) => setTag(t.toLowerCase())} onChange={(n) => setPosts((all) => (all || []).map((x) => (x.id === n.id ? n : x)))} onRemove={() => { setPosts((all) => (all || []).filter((x) => x.id !== p.id)); toggleIn(SAVED_KEY, saved, setSaved, p.id, false); }} />)}
          {offset !== null && <div style={{ textAlign: 'center' }}><button className="ph-small-btn" onClick={() => load(false)}>Load more</button></div>}
        </main>

        <aside className="ph-side-art" aria-hidden>
          <ArtImage name="feed-left" className="ph-art-img" fallback={<div className="ph-scene"><div className="ph-scene-sky" /><div className="ph-scene-city" style={{ height: '40%' }}><Skyline seed={4} height={300} width={400} /></div><div className="ph-figure-left"><HoodedFigure className="ph-scene-figure" /></div></div>} />
          <div className="ph-side-overlay" />
          <div className="ph-side-copy">
            <span className="ph-side-eyebrow"><Shield size={11} /> ZERO IDENTITY</span>
            <div className="ph-side-quote">Some words are only safe<br />when left untraced.</div>
            <div className="ph-side-sub"><i /><span>PHANTOM BOARD</span></div>
          </div>
          <div className="ph-card ph-mode-card"><GhostAvatar size={28} /><div><b>Phantom Network</b><small>100% Zero-Knowledge</small></div><ShieldCheck size={15} className="sh" /></div>
        </aside>
      </div>

      {panel === 'privacy' && <Modal title="Privacy Info" icon={<Shield size={18} />} onClose={() => setPanel(null)}>
        <p>Posts are published only as "Phantom" with a random alias that changes on every post and comment. Wevsoft stores <b>no author</b> for Phantom posts, comments, reactions or reports: no user id, no owner token, no IP address, no history. Phantom requests are not written to the server's request logs.</p>
        <p>You must be signed in to Wevsoft to open Phantom. The server checks your session to let you in and briefly counts requests in memory to stop spam. That count is never saved and is wiped when the server restarts.</p>
        <p><b>Your PIN is the only proof a post is yours.</b> Only a one-way hash of it is stored. If you lose the PIN you cannot edit or delete the post, and nobody (including Wevsoft) can recover it or tell you which posts were yours. Five wrong PINs lock that post for 15 minutes.</p>
        <p>Moderators can still remove any post or comment that breaks the rules. They see only the content, its alias and reports. Saved posts and "reacted" marks are kept on this device only. Photos have location/EXIF removed; videos, audio and files are stored as uploaded, so check them first. Because there is no author, Phantom cannot send you notifications or messages.</p>
      </Modal>}
      {panel === 'safety' && <Modal title="Report & Safety" icon={<ShieldAlert size={18} />} onClose={() => setPanel(null)}>
        <p>Use the shield icon or the ⋯ menu on any post or comment to report it. Reports go to the Wevsoft moderation team and don't record who sent them.</p>
        <p>If someone is in danger, contact local emergency services. Don't share personal details in posts; anonymity also depends on what you write.</p>
      </Modal>}
      {panel === 'help' && <Modal title="PIN & Rules" icon={<HelpCircle size={18} />} onClose={() => setPanel(null)}>
        <ul><li>Every post needs a PIN (min 4 characters). Use a different one per post if you want posts to be unlinkable even to you.</li><li>To edit, delete or turn comments off: ⋯ → Phantom → enter the PIN.</li><li>Comments can have an optional PIN so you can delete them later.</li><li>Wevsoft community rules apply: no harassment, threats, hate, doxxing, illegal content, spam or impersonation. Moderators can remove anything that breaks them.</li><li>Tabs: Latest (newest first), Popular (most reactions, 30 days), Saved (this device only).</li></ul>
      </Modal>}
      {panel === 'settings' && <Modal title="Phantom Settings" icon={<Settings size={18} />} onClose={() => setPanel(null)}>
        {([['sound', 'Sound'], ['animations', 'Animations'], ['reducedMotion', 'Reduced Motion'], ['lightMode', 'Light Mode']] as const).map(([k, l]) => <div key={k} className="ph-set-row" style={{ fontSize: 12, padding: '8px 0' }}>{l}<button role="switch" aria-checked={!!set[k]} aria-label={l} className={`ph-toggle${set[k] ? ' on' : ''}`} onClick={() => flip(k)} /></div>)}
        <p>Settings, saved posts and reactions are stored on this device only. <button className="ph-small-btn" onClick={() => { localStorage.removeItem(SAVED_KEY); localStorage.removeItem(REACTED_KEY); setSaved(new Set()); setReacted(new Set()); toast('Device Phantom data cleared'); }}>Clear device data</button></p>
      </Modal>}
      {activePostId && (
        <PhantomPostOverlay
          postId={activePostId}
          post={posts?.find((p) => p.id === activePostId) || null}
          sound={set.sound}
          toast={toast}
          saved={saved.has(activePostId)}
          reacted={reacted.has(activePostId)}
          onClose={() => nav('/phantom')}
          onSave={() => toggleIn(SAVED_KEY, saved, setSaved, activePostId)}
          onReact={(on) => toggleIn(REACTED_KEY, reacted, setReacted, activePostId, on)}
          onTag={(t) => {
            setTag(t.toLowerCase());
            nav('/phantom');
          }}
          onChange={(n) => setPosts((all) => (all || []).map((x) => (x.id === n.id ? n : x)))}
          onRemove={(id) => {
            setPosts((all) => (all || []).filter((x) => x.id !== id));
            toggleIn(SAVED_KEY, saved, setSaved, id, false);
          }}
        />
      )}
      {toastMsg && <div className="ph-toast" role="status">{toastMsg}</div>}
    </div>
  );
}
