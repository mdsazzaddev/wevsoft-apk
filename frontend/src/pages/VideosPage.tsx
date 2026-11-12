import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Video, Play, TrendingUp, Clock, Bookmark, Trash, Heart, MessageSquare, ArrowLeft, Plus } from 'lucide-react';
import { useStore } from '../store';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { resolveVideoUrl } from '../lib/postMedia';
import UserAvatar from '../components/UserAvatar';
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

function getVideoSrc(vid: any): string {
  return vid?.videoUrl || resolveVideoUrl(vid) || '';
}

export default function VideosPage() {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<'trending' | 'later' | 'history'>('trending');
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchVideos();
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchWatchLater();
  }, [activeTab]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      let endpoint = '/api/videos';
      if (activeTab === 'later') endpoint = '/api/videos/later';
      else if (activeTab === 'history') endpoint = '/api/videos/history';

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setVideos(await res.json());
      } else {
        toast.error('Failed to load videos');
      }
    } catch (err) {
      toast.error('Error connecting to video service');
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchLater = async () => {
    try {
      const res = await fetch('/api/videos/later', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedIds(saved.map((v: any) => v.id));
      }
    } catch (err) {
      // Ignore background errors
    }
  };

  const handleToggleLater = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/videos/${id}/later`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        if (result.status === 'added') {
          setSavedIds([...savedIds, id]);
          toast.success('Added to Watch Later');
        } else {
          setSavedIds(savedIds.filter(val => val !== id));
          toast.success('Removed from Watch Later');
          if (activeTab === 'later') {
            setVideos(videos.filter(v => v.id !== id));
          }
        }
      }
    } catch (err) {
      toast.error('Failed to update Watch Later status');
    }
  };

  const handlePlayVideo = async (video: any) => {
    setActiveVideo(video);
    try {
      // Log watch history
      await fetch(`/api/videos/${video.id}/watch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ duration: 30 })
      });
    } catch (err) {
      // Silent error
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your entire watch history?')) return;
    try {
      const res = await fetch('/api/videos/history', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setVideos([]);
        toast.success('Watch history cleared');
      }
    } catch (err) {
      toast.error('Failed to clear watch history');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
          <Video className="text-red-500" size={32} /> Video Library
        </h1>
        {activeTab === 'history' && videos.length > 0 && (
          <button 
            onClick={handleClearHistory}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-bold rounded-xl text-xs transition-all flex items-center gap-2 self-end sm:self-auto"
          >
            <Trash size={14} /> Clear History
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="space-y-2 bg-card p-4 border border-border rounded-2xl shadow-sm">
          <button 
            onClick={() => setActiveTab('trending')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${
              activeTab === 'trending' 
                ? 'bg-red-500/15 text-red-500 border-l-4 border-red-500' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground font-medium'
            }`}
          >
            <TrendingUp size={18} /> Trending Videos
          </button>
          
          <button 
            onClick={() => setActiveTab('later')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${
              activeTab === 'later' 
                ? 'bg-red-500/15 text-red-500 border-l-4 border-red-500' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground font-medium'
            }`}
          >
            <Clock size={18} /> Watch Later
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 font-semibold rounded-xl transition-all ${
              activeTab === 'history' 
                ? 'bg-red-500/15 text-red-500 border-l-4 border-red-500' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground font-medium'
            }`}
          >
            <Bookmark size={18} /> Watch History
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-muted-foreground font-medium">Loading video shelf...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-3xl space-y-4 max-w-md mx-auto p-8">
              <Video size={48} className="mx-auto text-muted-foreground opacity-50" />
              <h3 className="text-lg font-bold">No Videos Available</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'later' 
                  ? "You haven't saved any videos to watch later yet!" 
                  : activeTab === 'history' 
                    ? "Your playback history is clean." 
                    : "No uploaded video posts available right now."}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {videos.map((vid) => {
                const isSaved = savedIds.includes(vid.id);
                const mediaUrl = getVideoSrc(vid);

                return (
                  <div 
                    key={vid.id} 
                    onClick={() => handlePlayVideo(vid)}
                    className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-150 motion-reduce:transition-none group cursor-pointer flex flex-col h-full"
                  >
                    <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                      {mediaUrl ? (
                        <video 
                          src={mediaUrl} 
                          className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-500" 
                          preload="metadata"
                        />
                      ) : (
                        <img 
                          src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800" 
                          alt="Video Thumbnail" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                      )}
                      
                      {/* Play Hover overlay */}
                      <div className="absolute inset-0 bg-black/5 dark:bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                        <div className="w-14 h-14 bg-red-600/90 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="fill-white text-foreground dark:text-white ml-1" size={24} />
                        </div>
                      </div>

                      {/* Watch Later quick toggle icon */}
                      <button 
                        onClick={(e) => handleToggleLater(vid.id, e)}
                        className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all shadow-sm ${
                          isSaved 
                            ? 'bg-red-500 text-white' 
                            : 'bg-black/10 dark:bg-black/50 hover:bg-black/30 dark:bg-black/80 text-white'
                        }`}
                        title="Watch Later"
                      >
                        <Clock size={16} />
                      </button>
                    </div>

                    <div className="p-4 flex gap-3 flex-1">
                      <UserAvatar user={vid.user} alt="Channel Avatar" className="w-10 h-10 flex-shrink-0 text-xs" />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-extrabold text-base leading-snug line-clamp-2 text-foreground group-hover:text-red-500 transition-colors mb-1">
                            {vid.content || 'Video Post'}
                          </h3>
                          <p className="text-xs text-muted-foreground font-semibold">
                            {vid.user?.name || 'Wevsoft Member'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground font-medium border-t border-border pt-2">
                          <span className="flex items-center gap-1"><Heart size={14} /> {vid._count?.likes || 0}</span>
                          <span className="flex items-center gap-1"><MessageSquare size={14} /> {vid._count?.comments || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modern Fullscreen Video Player Modal Overlay */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/95 flex flex-col backdrop-blur-md"
          >
            {/* Header controls */}
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent text-white z-10">
              <button 
                onClick={() => setActiveVideo(null)}
                className="flex items-center gap-2 px-4 py-2 hover:bg-black/10 dark:bg-white/10 rounded-xl transition-all font-bold text-sm"
              >
                <ArrowLeft size={20} /> Back to Library
              </button>
              
              <button 
                onClick={(e) => { handleToggleLater(activeVideo.id, e); }}
                className={`px-4 py-2 rounded-xl transition-all font-bold text-xs flex items-center gap-2 ${
                  savedIds.includes(activeVideo.id) 
                    ? 'bg-red-600 text-white' 
                    : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:bg-white/20'
                }`}
              >
                <Clock size={15} /> {savedIds.includes(activeVideo.id) ? 'Saved to Watch Later' : 'Watch Later'}
              </button>
            </div>

            {/* Main Cinema Screen */}
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border border-border relative">
                {getVideoSrc(activeVideo) ? (
                  <video 
                    ref={videoElementRef}
                    src={getVideoSrc(activeVideo)} 
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6">
                    <Video size={48} className="text-red-500 animate-pulse mb-3" />
                    <p className="font-semibold text-foreground dark:text-white">This video does not have a streamable media source.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video metadata drawer */}
            <div className="bg-neutral-900 border-t border-border p-6 md:p-8 text-foreground dark:text-white">
              <div className="max-w-4xl mx-auto flex items-start gap-4">
                <img 
                  src={activeVideo.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeVideo.userId}`} 
                  alt="Uploader" 
                  className="w-12 h-12 rounded-full border border-border"
                />
                <div>
                  <h2 className="text-xl font-black mb-1 leading-tight">{activeVideo.content || 'Video Post'}</h2>
                  <p className="text-sm text-neutral-400 font-semibold mb-2">
                    Published by <span className="text-red-400">{activeVideo.user?.name || 'Wevsoft Member'}</span>
                  </p>
                  {activeVideo.hashtags && (
                    <div className="flex gap-2 flex-wrap">
                      {activeVideo.hashtags.split(',').map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-black/5 dark:bg-white/5 text-neutral-300 px-2 py-1 rounded-md font-medium">#{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
