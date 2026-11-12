import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PROFILE_OVERLAY_EVENT, type ProfileOverlayDetail } from '../lib/profileOverlay';
import PublicProfilePage from '../pages/PublicProfilePage';
import { useStore } from '../store';

const normHandle = (v: unknown) =>
  String(v ?? '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();

/** Listens for profile opens from feed/post chrome; keeps Home mounted underneath. */
export default function ProfileOverlayHost() {
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const selfRef = useRef(user);
  // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
  selfRef.current = user;

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<ProfileOverlayDetail>).detail;
      const next = String(detail?.username || '')
        .trim()
        .replace(/^@+/, '');
      if (!next) return;
      // The overlay is visitor-only; the viewer's own profile must open in
      // owner mode on /profile instead.
      const me = selfRef.current as { id?: unknown; username?: unknown } | null;
      const target = normHandle(next);
      if (
        me &&
        ((me.username && normHandle(me.username) === target) ||
          (me.id != null && normHandle(me.id) === target))
      ) {
        setUsername(null);
        navigate('/profile');
        return;
      }
      setUsername(next);
    };
    window.addEventListener(PROFILE_OVERLAY_EVENT, onOpen);
    return () => window.removeEventListener(PROFILE_OVERLAY_EVENT, onOpen);
  }, [navigate]);

  if (!username) return null;

  return (
    <PublicProfilePage
      overlayUsername={username}
      onOverlayClose={() => setUsername(null)}
    />
  );
}
