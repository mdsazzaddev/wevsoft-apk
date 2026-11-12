import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function authHeaders(): Record<string, string> {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return t && t !== 'null' && t !== 'undefined' ? { Authorization: `Bearer ${t}` } : {};
}

/**
 * Widget surfaces loaded by /sdk/wevsoft.js on third-party sites.
 * They only ever postMessage to the origin bound into the signed embed token
 * (verified by the backend), never to '*'.
 */

function useEmbedOrigin(token: string | null) {
  const [state, setState] = useState<{ origin: string | null; error: string | null; loading: boolean }>({ origin: null, error: null, loading: true });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!token) { setState({ origin: null, error: 'Missing embed token', loading: false }); return; }
    fetch(`/api/embed/verify?token=${encodeURIComponent(token)}`, { credentials: 'omit' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => setState(ok && j.valid ? { origin: j.origin, error: null, loading: false } : { origin: null, error: 'This widget is not allowed on this site', loading: false }))
      .catch(() => setState({ origin: null, error: 'Network error', loading: false }));
  }, [token]);
  return state;
}

const card: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#fff', border: '1px solid #e3e8ef', borderRadius: 12,
  padding: 16, color: '#101828', boxSizing: 'border-box',
};

interface EmbedPost {
  id: string;
  content: string | null;
  type: string;
  createdAt: string;
  user: { id: string; name: string; username: string | null; avatar: string | null } | null;
}

export function EmbedPostPage() {
  const { postId = '' } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token');
  const { origin, error: originError } = useEmbedOrigin(token);
  const [post, setPost] = useState<EmbedPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/embed/post/${encodeURIComponent(postId)}?token=${encodeURIComponent(token)}`, { credentials: 'omit' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setPost(j.data) : setError(j.error || 'Post unavailable')))
      .catch(() => setError('Network error'));
  }, [postId, token]);

  useEffect(() => {
    if (!origin || !ref.current || window.parent === window) return;
    const send = () => window.parent.postMessage({ type: 'wevsoft:resize', height: Math.ceil(ref.current!.getBoundingClientRect().height) + 2 }, origin);
    send();
    const ro = new ResizeObserver(send);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [origin, post, error]);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }, []);

  const err = originError || error;
  return (
    <div ref={ref} style={{ ...card, margin: 0 }} data-testid="embed-post">
      {err ? (
        <div style={{ fontSize: 13, color: '#b42318' }}>{err}</div>
      ) : !post ? (
        <div style={{ fontSize: 13, color: '#667085' }}>Loading post...</div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {post.user?.avatar ? (
              <img src={post.user.avatar} alt="" width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e8effe', color: '#1663f2', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                {(post.user?.name || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{post.user?.name || 'Wevsoft user'}</div>
              <div style={{ fontSize: 12, color: '#667085' }}>
                {post.user?.username ? `@${post.user.username} · ` : ''}
                {new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            </div>
          </div>
          {post.content && <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.content}</div>}
          {post.type !== 'text' && <div style={{ fontSize: 12, color: '#667085', marginTop: 8 }}>This post has {post.type} media. View it on Wevsoft.</div>}
          <a href={`/posts/${post.id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, color: '#1663f2', fontWeight: 600, textDecoration: 'none' }}>
            View on Wevsoft
          </a>
        </>
      )}
    </div>
  );
}

export function EmbedFollowPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const username = (params.get('username') || '').replace(/^@/, '');
  const { origin, error: originError, loading } = useEmbedOrigin(token);
  const [profile, setProfile] = useState<{ data: { id: string; name: string; username: string; avatar: string | null }; following: boolean | null; self: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signedIn = typeof window !== 'undefined' && Boolean(localStorage.getItem('token'));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (!username) { setError('Missing username'); return; }
    fetch(`/api/embed/profile/${encodeURIComponent(username)}`, { headers: authHeaders(), credentials: 'omit' })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => (ok ? setProfile(j) : setError(j.error || 'User not found')))
      .catch(() => setError('Network error'));
  }, [username]);

  const toggle = async () => {
    if (!profile || !origin) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(profile.data.id)}/follow`, { method: 'POST', headers: authHeaders(), credentials: 'omit' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not update follow');
      const following = Boolean(j.following);
      setProfile({ ...profile, following });
      if (window.opener && !window.opener.closed) window.opener.postMessage({ type: 'wevsoft:follow', following }, origin);
    } catch (e: any) {
      setError(e?.message || 'Could not update follow');
    } finally {
      setBusy(false);
    }
  };

  const next = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
  const btnStyle: React.CSSProperties = { width: '100%', height: 38, border: 0, borderRadius: 8, background: '#1663f2', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f7fb', padding: 16 }}>
      <div style={{ ...card, width: 340, textAlign: 'center' }} data-testid="embed-follow">
        {originError || (error && !profile) ? (
          <div style={{ fontSize: 13, color: '#b42318' }}>{originError || error}</div>
        ) : loading || !profile ? (
          <div style={{ fontSize: 13, color: '#667085' }}>Loading...</div>
        ) : (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 10px', overflow: 'hidden', background: '#e8effe', display: 'grid', placeItems: 'center', color: '#1663f2', fontWeight: 700, fontSize: 24 }}>
              {profile.data.avatar ? <img src={profile.data.avatar} alt="" width={64} height={64} style={{ objectFit: 'cover' }} /> : profile.data.name.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.data.name}</div>
            <div style={{ fontSize: 13, color: '#667085', marginBottom: 6 }}>@{profile.data.username}</div>
            <div style={{ fontSize: 12, color: '#667085', marginBottom: 14 }}>Requested from {origin}</div>
            {!signedIn ? (
              <a href={`/auth?next=${encodeURIComponent(next)}`} style={{ ...btnStyle, display: 'grid', placeItems: 'center', textDecoration: 'none' }}>Log in to follow</a>
            ) : profile.self ? (
              <div style={{ fontSize: 13, color: '#667085' }}>This is you.</div>
            ) : (
              <button type="button" style={{ ...btnStyle, ...(profile.following ? { background: '#fff', color: '#1663f2', border: '1px solid #c9d8fb' } : {}) }} disabled={busy} onClick={toggle}>
                {busy ? '...' : profile.following ? 'Following (click to unfollow)' : `Follow @${profile.data.username}`}
              </button>
            )}
            {error && <div style={{ fontSize: 12, color: '#b42318', marginTop: 8 }}>{error}</div>}
            <button type="button" onClick={() => window.close()} style={{ marginTop: 12, border: 0, background: 'none', color: '#667085', fontSize: 12, cursor: 'pointer' }}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
