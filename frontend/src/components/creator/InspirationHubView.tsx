import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music, Play, Pause, TrendingUp, Hash, Lightbulb,
  ArrowRight, Heart, Volume2, Copy, Check, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { creatorHubPath } from '../../lib/creatorHub';

interface TrendingTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  coverImage?: string | null;
  duration: number;
  category: string;
  playsCount: number;
  rank: number;
  momentum: string;
  reelsCount: number;
  isHot?: boolean;
}

interface TrendingTopic {
  tag: string;
  postsCount: number;
  velocity: string;
  category: string;
}

interface DailyPrompt {
  id: string;
  title: string;
  category: string;
  hookText: string;
  concept: string;
  durationTip: string;
  suggestedFormat: string;
  tags: string[];
}

export const InspirationHubView = () => {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();

  // Tab mode
  const [activeTab, setActiveTab] = useState<'audio' | 'topics' | 'prompts'>('audio');

  // Audio State
  const [tracks, setTracks] = useState<TrendingTrack[]>([]);
  const [audioLoading, setAudioLoading] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [savedTracks, setSavedTracks] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Topics & Prompts State
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [prompts, setPrompts] = useState<DailyPrompt[]>([]);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Fetch Trending Audio
  const fetchAudio = useCallback(async () => {
    if (!token) return;
    setAudioLoading(true);
    try {
      const res = await fetch('/api/v1/jobs-creator/creator/inspiration/trending-audio', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      }
    } catch (err) {
      console.error('Error fetching trending audio', err);
    } finally {
      setAudioLoading(false);
    }
  }, [token]);

  // Fetch Topics & Prompts
  const fetchTopicsAndPrompts = useCallback(async () => {
    if (!token) return;
    try {
      const [topicsRes, promptsRes] = await Promise.all([
        fetch('/api/v1/jobs-creator/creator/inspiration/trending-topics', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/jobs-creator/creator/inspiration/daily-prompts', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (topicsRes.ok) {
        const data = await topicsRes.json();
        setTopics(data.topics || []);
      }
      if (promptsRes.ok) {
        const data = await promptsRes.json();
        setPrompts(data.prompts || []);
      }
    } catch (err) {
      console.error('Error fetching inspiration topics/prompts', err);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchAudio();
    fetchTopicsAndPrompts();
  }, [fetchAudio, fetchTopicsAndPrompts]);

  // Audio Player Toggle
  const togglePlayAudio = (track: TrendingTrack) => {
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = track.audioUrl;
      audioRef.current.play().catch(() => {
        toast.error('Preview not playable');
      });
      audioRef.current.onended = () => setPlayingTrackId(null);
      setPlayingTrackId(track.id);
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleSaveTrack = (trackId: string) => {
    setSavedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
        toast.success('Removed from saved audio');
      } else {
        next.add(trackId);
        toast.success('Saved to your creator audio library!');
      }
      return next;
    });
  };

  const handleUseAudio = (track: TrendingTrack) => {
    toast.success(`Opening Studio with "${track.title}"`);
    navigate(`${creatorHubPath('content_studio')}&audioId=${track.id}`);
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.success(`Copied ${tag} to clipboard`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">Inspiration</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Trending audio, hashtags and daily prompts for your next post.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/60 p-1 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
              activeTab === 'audio'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Music className="h-4 w-4" />
            Trending Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('topics')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
              activeTab === 'topics'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Hash className="h-4 w-4" />
            Topics & Tags
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${
              activeTab === 'prompts'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lightbulb className="h-4 w-4" />
            Daily Prompts
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: Trending Audio Tracks (Facebook Parity) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'audio' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Trending Audio for Reels & Videos</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Using trending sounds increases algorithmic distribution in Suggested Reels by up to 2.4x.</p>
          </div>

          {audioLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] bg-card rounded-2xl border border-border p-8">
              <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-xs text-muted-foreground">Loading viral music charts...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-xs">
              No active audio tracks found in library.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {tracks.map((track) => {
                const isPlaying = playingTrackId === track.id;
                const isSaved = savedTracks.has(track.id);

                return (
                  <div
                    key={track.id}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isPlaying
                        ? 'bg-primary/10 border-border'
                        : 'bg-card border-border/70 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Play/Pause Button */}
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(track)}
                        className={`h-11 w-11 rounded-lg grid place-items-center shrink-0 transition-all ${
                          isPlaying
                            ? 'bg-primary text-primary-foreground animate-pulse'
                            : 'bg-muted text-foreground hover:bg-primary hover:text-primary-foreground'
                        }`}
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                      </button>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary">#{track.rank}</span>
                          <h4 className="text-sm font-bold text-foreground truncate">{track.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{track.momentum}</span>
                          <span>•</span>
                          <span>{track.playsCount} plays</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleSaveTrack(track.id)}
                        className={`p-2 rounded-lg border border-border transition ${
                          isSaved ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title="Save to audio library"
                      >
                        <Heart className={`h-4 w-4 ${isSaved ? 'fill-pink-500' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUseAudio(track)}
                        className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        Use in Reel
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: Trending Topics & Hashtags */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Trending Hashtags & Discovery Topics</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Hashtags with surging 24-hour engagement volume across Wevsoft feeds.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {topics.map((t, idx) => {
              const isCopied = copiedTag === t.tag;
              return (
                <div
                  key={t.tag}
                  className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between gap-3 hover:border-primary/40 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {t.category}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {t.velocity}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-foreground">{t.tag}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.postsCount} posts this week</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => handleCopyTag(t.tag)}
                      className="flex-1 py-1.5 px-3 rounded-lg border border-border hover:bg-surface-hover text-xs font-bold text-foreground transition flex items-center justify-center gap-1.5"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {isCopied ? 'Copied' : 'Copy Tag'}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`${creatorHubPath('content_studio')}&tag=${encodeURIComponent(t.tag)}`)}
                      className="py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition flex items-center gap-1"
                    >
                      Post
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: Daily Creative Prompts (Facebook Parity) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === 'prompts' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">AI Daily Content Prompts & Hooks</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Handpicked viral formats designed to break creative block and drive high comments.</p>
          </div>

          <div className="space-y-3">
            {prompts.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-card border border-border space-y-3 hover:border-primary/40 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {p.category}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">{p.title}</h4>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Duration: <span className="font-semibold text-foreground">{p.durationTip}</span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border">
                    <span className="text-[10px] uppercase font-bold text-primary block mb-1">Recommended Opening Hook:</span>
                    <p className="text-xs sm:text-sm font-bold text-foreground italic">
                      {p.hookText}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                    {p.concept}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {p.tags.map((tag) => (
                      <span key={tag} className="text-[11px] text-primary font-medium hover:underline cursor-pointer" onClick={() => handleCopyTag(tag)}>
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      void import('../../lib/creatorBusinessNav').then(({ applyBusinessCreatorNav }) => {
                        if (!applyBusinessCreatorNav('/ai/post', { navigate })) navigate('/ai/post');
                      });
                    }}
                    className="self-end sm:self-auto px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    Write with AI Assistant
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
