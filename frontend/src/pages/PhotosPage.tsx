import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Image as ImageIcon, Video, Calendar, Sparkles } from 'lucide-react';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { useSpaceIdentities } from '../lib/useSpaceIdentities';

interface MediaItem {
  id: string;
  filename: string;
  path: string;
  type: string;
  createdAt: string;
  tags: { name: string }[];
  labels: { name: string }[];
  caption: string | null;
}

export default function PhotosPage() {
  const { isSpaceMode } = useSpaceIdentities();
  if (isSpaceMode) {
    return <Navigate to="/home" replace />;
  }
  const { t } = useTranslation();
  const token = useStore(state => state.token);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const url = new URL(window.location.origin + '/api/media');
      if (search) url.searchParams.append('search', search);
      
      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setMedia(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    fetchMedia();
    
    const onUpload = () => fetchMedia();
    window.addEventListener('media-uploaded', onUpload);
    return () => window.removeEventListener('media-uploaded', onUpload);
  }, [search]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Group media by month-year
  const groupedMedia = media.reduce((acc, item) => {
    const date = new Date(item.createdAt);
    const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, MediaItem[]>);

  const slides = media.map(m => ({ src: m.path }));

  return (
    <div className="space-y-10 pb-20">
      {/* Search Bar */}
      <div className="relative max-w-2xl">
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search')}
          className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-full py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-foreground"
        />
        <Search className="w-5 h-5 absolute left-4 top-3 text-muted-foreground" />
      </div>

      {/* Memories Carousel */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
          Memories | স্মৃতিসমূহ
        </h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          <div className="w-48 h-64 flex-none rounded-3xl bg-gradient-to-b from-indigo-500/20 to-purple-900/40 border border-border p-4 flex flex-col justify-end relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e')] bg-cover bg-center mix-blend-overlay opacity-60 transition-transform duration-700 group-hover:scale-105"></div>
            <p className="text-xs text-foreground dark:text-white/60 mb-1 relative z-10">1 Year Ago Today</p>
            <h3 className="font-bold text-lg leading-tight relative z-10 italic text-foreground dark:text-white">Beach Trip 2K25</h3>
          </div>
          <div className="w-48 h-64 flex-none rounded-3xl bg-gradient-to-b from-emerald-500/20 to-teal-900/40 border border-border p-4 flex flex-col justify-end relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b')] bg-cover bg-center mix-blend-overlay opacity-60 transition-transform duration-700 group-hover:scale-105"></div>
            <p className="text-xs text-foreground dark:text-white/60 mb-1 relative z-10">May 2026</p>
            <h3 className="font-bold text-lg leading-tight relative z-10 italic text-foreground dark:text-white">Mountain Peaks</h3>
          </div>
          <div className="w-48 h-64 flex-none rounded-3xl bg-gradient-to-b from-orange-500/20 to-red-900/40 border border-border p-4 flex flex-col justify-end relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4')] bg-cover bg-center mix-blend-overlay opacity-60 transition-transform duration-700 group-hover:scale-105"></div>
            <p className="text-xs text-foreground dark:text-white/60 mb-1 relative z-10">Recent Event</p>
            <h3 className="font-bold text-lg leading-tight relative z-10 italic text-foreground dark:text-white">Office Dinner</h3>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="aspect-square bg-muted rounded-2xl border border-border" />
          ))}
        </div>
      ) : Object.keys(groupedMedia).length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border border-border rounded-3xl bg-black/5 dark:bg-white/5">
          <ImageIcon size={64} className="mx-auto mb-4 opacity-50 text-slate-500" />
          <p className="text-xl">No media found</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedMedia).map(([date, items]) => (
            <section key={date}>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold italic tracking-tight">{date}</h3>
                  <p className="text-muted-foreground text-sm">Wevsoft Library</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {}} className="px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-xs font-medium border border-border text-foreground">All Media</button>
                  <button onClick={() => {}} className="px-3 py-1.5 hover:bg-black/5 dark:bg-white/5 rounded-lg text-xs font-medium border border-transparent text-muted-foreground hover:text-foreground transition-colors">Favorites</button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                <AnimatePresence>
                  {(items as any[]).map((item, _i) => {
                    const globalIndex = media.findIndex(m => m.id === item.id);
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={item.id}
                        className="group relative aspect-square rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-border cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10"
                        onClick={() => setLightboxIndex(globalIndex)}
                      >
                        {item.type === 'image' ? (
                          <img src={item.path} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        ) : (
                          <div className="w-full h-full relative">
                            <video src={item.path} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-blue-500/20 mix-blend-overlay group-hover:bg-blue-500/40 transition-colors"></div>
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[10px] border border-border text-white font-medium flex items-center gap-1">
                              <Video size={12} /> Video
                            </div>
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 2).map((t: any) => (
                                <span key={t.id} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-black/20 dark:bg-white/20 backdrop-blur-md text-white rounded-full border border-border">
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
      />
    </div>
  );
}
