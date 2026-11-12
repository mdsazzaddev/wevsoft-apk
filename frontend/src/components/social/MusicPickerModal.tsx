import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  HardDrive,
  Loader2,
  Music2,
  Pause,
  Play,
  Search,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import MusicSegmentEditor from './MusicSegmentEditor';
import {
  DEFAULT_POST_MUSIC_MAX_SEC,
  DEFAULT_POST_MUSIC_MIN_SEC,
  formatMusicClock,
  normalizeMusicSegment,
  type MusicSegmentLimits,
} from '../../lib/musicSegment';

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string | null;
  coverImage?: string | null;
  audioUrl: string;
  duration: number;
  category?: string | null;
  moodTags?: string[];
  playsCount?: number;
  saved?: boolean;
}

export interface PostMusicSelection {
  musicId: string;
  startTime: number;
  endTime: number | null;
  volume: number;
  originalAudioMuted: boolean;
  title: string;
  artist?: string | null;
  coverImage?: string | null;
  audioUrl: string;
  duration: number;
}

interface MusicPickerModalProps {
  open: boolean;
  onClose: () => void;
  value: PostMusicSelection | null;
  onApply: (selection: PostMusicSelection | null) => void;
}

type TabId = 'trending' | 'saved' | 'category' | 'device';

function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    const done = (v: number) => {
      audio.src = '';
      resolve(v);
    };
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => reject(new Error('Could not read audio duration'));
    audio.src = url;
  });
}

export default function MusicPickerModal({ open, onClose, value, onApply }: MusicPickerModalProps) {
  const token = useStore((s) => s.token);
  const [tab, setTab] = useState<TabId>('trending');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Array<{ category: string; count: number }>>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const deviceInputRef = useRef<HTMLInputElement>(null);
  const [limits, setLimits] = useState<MusicSegmentLimits>({
    minSec: DEFAULT_POST_MUSIC_MIN_SEC,
    maxSec: DEFAULT_POST_MUSIC_MAX_SEC,
  });

  const [selected, setSelected] = useState<MusicTrack | null>(null);
  const [draft, setDraft] = useState({
    startTime: 0,
    endTime: 15,
    volume: 1,
    originalAudioMuted: false,
  });

  useEffect(() => {
    if (!open || !token) return;
    fetch('/api/music/clip-limits', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setLimits({
          minSec: Number(data.minSec) || DEFAULT_POST_MUSIC_MIN_SEC,
          maxSec: Number(data.maxSec) || DEFAULT_POST_MUSIC_MAX_SEC,
        });
      })
      .catch(() => {});
  }, [open, token]);

  useEffect(() => {
    if (!open || !token) return;
    fetch('/api/music/categories', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCategories(data?.categories || []))
      .catch(() => {});
  }, [open, token]);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        if (tab === 'device') {
          const res = await fetch('/api/music/device', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!cancelled) setTracks(Array.isArray(data.tracks) ? data.tracks : []);
          return;
        }
        const params = new URLSearchParams();
        params.set('tab', tab === 'category' ? 'trending' : tab);
        if (tab === 'category' && category) params.set('category', category);
        if (q.trim()) params.set('q', q.trim());
        const res = await fetch(`/api/music?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setTracks(Array.isArray(data.tracks) ? data.tracks : []);
      } catch {
        if (!cancelled) setTracks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = window.setTimeout(run, tab !== 'device' && q ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, token, tab, category, q]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setSelected(null);
      audioRef.current?.pause();
      setPlayingId(null);
    }
  }, [open]);

  const previewTrack = async (track: MusicTrack) => {
    try {
      if (playingId === track.id) {
        audioRef.current?.pause();
        setPlayingId(null);
        return;
      }
      audioRef.current?.pause();
      const audio = new Audio(track.audioUrl);
      audioRef.current = audio;
      audio.volume = 1;
      await audio.play();
      setPlayingId(track.id);
      if (tab !== 'device') {
        fetch(`/api/music/${track.id}/play`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      audio.onended = () => setPlayingId(null);
    } catch {
      toast.error('Could not preview audio');
    }
  };

  const toggleSave = async (track: MusicTrack) => {
    try {
      const res = await fetch(`/api/music/${track.id}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, saved: !!data.saved } : t)));
      if (selected?.id === track.id) setSelected({ ...track, saved: !!data.saved });
      toast.success(data.saved ? 'Saved to your sounds' : 'Removed from saved');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update saved list');
    }
  };

  const beginTrim = (track: MusicTrack) => {
    audioRef.current?.pause();
    setPlayingId(null);
    setSelected(track);
    const dur = track.duration || 30;
    const reuse = value?.musicId === track.id;
    const start = reuse ? value!.startTime : 0;
    const preferredEnd = reuse
      ? value!.endTime ?? Math.min(dur, start + limits.maxSec)
      : Math.min(dur, limits.maxSec);
    const seg = normalizeMusicSegment(start, preferredEnd, dur, limits);
    setDraft({
      startTime: seg.startTime,
      endTime: seg.endTime,
      volume: reuse ? value!.volume : 1,
      originalAudioMuted: reuse ? value!.originalAudioMuted : false,
    });
  };

  const uploadFromDevice = async (file: File | null | undefined) => {
    if (!file || !token) return;
    const name = file.name || 'audio';
    const type = (file.type || '').toLowerCase();
    const looksAudio =
      type.startsWith('audio/') ||
      type === 'application/octet-stream' ||
      type === '' ||
      /\.(mp3|wav|m4a|aac|ogg|oga|opus|flac|webm|mp4)$/i.test(name);
    if (!looksAudio) {
      toast.error('Please choose an audio file (mp3, m4a, wav…)');
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      toast.error('Audio file must be 40MB or smaller');
      return;
    }
    setUploading(true);
    audioRef.current?.pause();
    setPlayingId(null);
    try {
      const fd = new FormData();
      // Keep a usable filename for metadata extraction when the OS omits one.
      const named =
        name && name.includes('.')
          ? file
          : new File([file], `device-audio${type.includes('mpeg') ? '.mp3' : type.includes('mp4') || type.includes('m4a') ? '.m4a' : '.mp3'}`, {
              type: type || 'audio/mpeg',
              lastModified: file.lastModified,
            });
      fd.append('audio', named);
      const res = await fetch('/api/music/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      let track = data.track as MusicTrack;
      if (!track?.id || !track.audioUrl) throw new Error('Invalid upload response');

      // Probe duration in the browser when the server could not read it.
      if (!track.duration || track.duration < 1) {
        const dur = await probeAudioDuration(track.audioUrl).catch(() => 0);
        if (dur > 0) track = { ...track, duration: Math.round(dur) };
      }

      setTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
      setTab('device');
      toast.success('Audio ready — choose a segment');
      beginTrim(track);
    } catch (err: any) {
      toast.error(err?.message || 'Could not upload audio');
    } finally {
      setUploading(false);
      if (deviceInputRef.current) deviceInputRef.current.value = '';
    }
  };

  const tabs = useMemo(
    () =>
      [
        { id: 'trending' as const, label: 'Trending' },
        { id: 'saved' as const, label: 'Saved' },
        { id: 'category' as const, label: 'Categories' },
        { id: 'device' as const, label: 'Device' },
      ] as const,
    [],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {!selected ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Music2 size={16} className="text-primary" />
                  Add Music
                </div>
                <p className="text-[11px] text-muted-foreground">Pick a track, then choose a segment</p>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted" aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="px-4 pt-3 flex gap-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 text-[11px] sm:text-xs font-bold py-2 rounded-xl transition-colors ${
                    tab === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab !== 'device' && (
              <div className="px-4 py-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search title, artist, mood…"
                    className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            )}

            {tab === 'device' && (
              <div className="px-4 py-3">
                <label
                  className={`w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 text-primary px-4 py-5 transition-colors cursor-pointer ${
                    uploading ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  <input
                    ref={deviceInputRef}
                    type="file"
                    accept="audio/*,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm,.mp3,.m4a,.aac,.wav,.ogg,.flac,.webm,.mp4"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => void uploadFromDevice(e.target.files?.[0])}
                  />
                  {uploading ? (
                    <>
                      <Loader2 size={22} className="animate-spin" />
                      <span className="text-sm font-bold">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <Upload size={22} />
                      <span className="text-sm font-bold">Select from device</span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Tap to browse music files
                      </span>
                    </>
                  )}
                </label>
                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                  MP3, M4A, WAV and other audio · max 40MB
                </p>
              </div>
            )}

            {tab === 'category' && (
              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto">
                {categories.length === 0 && (
                  <span className="text-xs text-muted-foreground py-1">No categories yet</span>
                )}
                {categories.map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() => setCategory(c.category === category ? '' : c.category)}
                    className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border ${
                      category === c.category
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {c.category} · {c.count}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-[280px]">
              {tab === 'device' && !loading && tracks.length > 0 && (
                <p className="px-2 pb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <HardDrive size={12} /> Recent from this device
                </p>
              )}
              {loading && (
                <div className="flex justify-center py-10 text-muted-foreground">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              )}
              {!loading && tracks.length === 0 && tab !== 'device' && (
                <p className="text-center text-sm text-muted-foreground py-10">No tracks found</p>
              )}
              {!loading && tracks.length === 0 && tab === 'device' && !uploading && (
                <p className="text-center text-sm text-muted-foreground py-6 px-4">
                  No device uploads yet. Tap Select from device to add a song.
                </p>
              )}
              {!loading &&
                tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-muted/50"
                  >
                    <button
                      type="button"
                      onClick={() => previewTrack(track)}
                      className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0"
                    >
                      {track.coverImage ? (
                        <img src={track.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 size={16} className="text-muted-foreground" />
                        </div>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                        {playingId === track.id ? <Pause size={14} /> : <Play size={14} />}
                      </span>
                    </button>
                    <button type="button" className="flex-1 min-w-0 text-left" onClick={() => beginTrim(track)}>
                      <div className="font-bold text-sm truncate">{track.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {track.artist || 'Unknown'} · {formatMusicClock(track.duration)}
                      </div>
                    </button>
                    {tab !== 'device' && (
                      <button
                        type="button"
                        onClick={() => toggleSave(track)}
                        className="p-2 rounded-full hover:bg-muted text-muted-foreground"
                        title={track.saved ? 'Unsave' : 'Save'}
                      >
                        {track.saved ? (
                          <BookmarkCheck size={16} className="text-primary" />
                        ) : (
                          <Bookmark size={16} />
                        )}
                      </button>
                    )}
                  </div>
                ))}
            </div>

            {value && (
              <div className="border-t border-border px-4 py-3 flex justify-between items-center gap-2">
                <div className="text-xs text-muted-foreground truncate">
                  Current: <span className="font-semibold text-foreground">{value.title}</span>
                  {value.endTime != null && (
                    <span className="tabular-nums">
                      {' '}
                      · {formatMusicClock(value.startTime)}–{formatMusicClock(value.endTime)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const track: MusicTrack = {
                        id: value.musicId,
                        title: value.title,
                        artist: value.artist,
                        coverImage: value.coverImage,
                        audioUrl: value.audioUrl,
                        duration: value.duration,
                      };
                      beginTrim(track);
                    }}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Edit segment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onApply(null);
                      onClose();
                    }}
                    className="text-xs font-bold text-rose-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <MusicSegmentEditor
            track={selected}
            limits={limits}
            initial={draft}
            onBack={() => setSelected(null)}
            onCancel={onClose}
            onRemove={
              value
                ? () => {
                    onApply(null);
                    onClose();
                  }
                : undefined
            }
            onSave={(seg) => {
              onApply({
                musicId: selected.id,
                startTime: seg.startTime,
                endTime: seg.endTime,
                volume: seg.volume,
                originalAudioMuted: seg.originalAudioMuted,
                title: selected.title,
                artist: selected.artist,
                coverImage: selected.coverImage,
                audioUrl: selected.audioUrl,
                duration: selected.duration,
              });
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
