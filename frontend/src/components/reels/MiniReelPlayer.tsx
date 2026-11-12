import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import UniversalVideoPlayer from '../video/UniversalVideoPlayer';

type MiniClip = { id: string; videoUrl: string; thumbnailUrl?: string | null };

export default function MiniReelPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const [clip, setClip] = useState<MiniClip | null>(null);
  const [tabActive, setTabActive] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const load = () => {
      try {
        const raw = sessionStorage.getItem('wev_reel_mini');
        setClip(raw ? JSON.parse(raw) : null);
      } catch {
        setClip(null);
      }
    };
    load();
    window.addEventListener('wev:reel-mini', load);
    return () => window.removeEventListener('wev:reel-mini', load);
  }, []);

  useEffect(() => {
    const sync = () => setTabActive(!document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  if (!clip || location.pathname.startsWith('/reels')) return null;

  const close = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    sessionStorage.removeItem('wev_reel_mini');
    setClip(null);
  };

  return (
    <button
      type="button"
      onClick={() => navigate(`/reels/${clip.id}`)}
      className="fixed bottom-20 right-3 z-[80] w-28 h-48 rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black md:bottom-6"
      aria-label="Continue watching Reel"
    >
      <UniversalVideoPlayer
        src={clip.videoUrl}
        poster={clip.thumbnailUrl || undefined}
        context="reels-mobile"
        muted
        autoplay
        loop
        isActive={tabActive}
        preload="metadata"
        className="w-full h-full"
      />
      <span
        role="button"
        tabIndex={0}
        onClick={close}
        onKeyDown={(e) => { if (e.key === 'Enter') close(); }}
        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white z-10"
        aria-label="Close mini player"
      >
        <X size={12} />
      </span>
    </button>
  );
}
