import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Star, Image as ImageIcon, Video, Mic, ThumbsUp } from 'lucide-react';
import { RatingStars } from './primitives';
import { marketFetch, uploadMarketplaceMedia } from './utils';

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.startsWith('/') || value.startsWith('http') ? [value] : [];
    }
  }
  return [];
}

export default function ProductReviewsPanel({
  productId,
  token,
  initialReviews = [],
}: {
  productId: string;
  token: string | null;
  initialReviews?: any[];
}) {
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [summary, setSummary] = useState<any>(null);
  const [sort, setSort] = useState('newest');
  const [filter, setFilter] = useState('all');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [voiceUrl, setVoiceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  const load = async () => {
    if (!token) return;
    const q = new URLSearchParams({ sort, type: filter });
    const data = await marketFetch(`/api/marketplace/${productId}/reviews?${q}`, token).catch(() => ({ reviews: [] }));
    setReviews(data.reviews || []);
    setSummary(data.summary || null);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    load().catch(() => {});
  }, [productId, token, sort, filter]);

  const submit = async () => {
    if (!token) return toast.error('Sign in to review');
    setSubmitting(true);
    try {
      await marketFetch(`/api/marketplace/${productId}/reviews`, token, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: text, photos, videos, voiceUrl }),
      });
      toast.success('Review published');
      setText('');
      setPhotos([]);
      setVideos([]);
      setVoiceUrl('');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Could not post review');
    } finally {
      setSubmitting(false);
    }
  };

  const addFiles = async (files: FileList | null, kind: 'photo' | 'video') => {
    if (!files || !token) return;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadMarketplaceMedia(file, token);
        if (kind === 'photo') setPhotos((p) => [...p, url].slice(0, 8));
        else setVideos((p) => [...p, url].slice(0, 3));
      } catch (e: any) {
        toast.error(e.message || 'Upload failed');
      }
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      recRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `review-voice-${Date.now()}.webm`, { type: 'audio/webm' });
        try {
          const url = await uploadMarketplaceMedia(file, token);
          setVoiceUrl(url);
          toast.success('Voice review attached');
        } catch (e: any) {
          toast.error(e.message || 'Voice upload failed');
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error('Microphone permission is required');
    }
  };

  const helpful = async (id: string) => {
    if (!token) return toast.error('Sign in first');
    const res = await marketFetch(`/api/marketplace/reviews/${id}/helpful`, token, { method: 'POST' });
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, helpfulCount: res.helpfulCount } : r)));
  };

  const avg = summary?.average || 0;
  const count = summary?.count || reviews.length;
  const breakdown = summary?.breakdown || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  return (
    <div className="mt-6 bg-card border border-border rounded-lg p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Customer reviews</h2>
          <div className="mt-1 flex items-center gap-2">
            <RatingStars value={avg} count={count} />
            <span className="text-xs text-muted-foreground">{avg ? avg.toFixed(1) : '—'} average</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', 'photos', 'videos', 'voice', 'verified'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded text-[11px] font-bold border ${filter === f ? 'border-primary text-primary' : 'border-border'}`}
            >
              {f === 'all' ? 'All' : f === 'photos' ? `Photos ${summary?.photo || ''}` : f === 'videos' ? `Videos ${summary?.video || ''}` : f === 'voice' ? `Voice ${summary?.voice || ''}` : `Verified ${summary?.verified || ''}`}
            </button>
          ))}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-2 py-1 rounded border border-border bg-background text-[11px]">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
            <option value="helpful">Most helpful</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = breakdown[star] || 0;
            const pct = count ? Math.round((n / count) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-[11px]">
                <span className="w-8">{star}★</span>
                <div className="flex-1 h-1.5 rounded bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-muted-foreground">{n}</span>
              </div>
            );
          })}
        </div>
        <div className="md:col-span-3 border border-border rounded-md p-3 space-y-2">
          <p className="text-xs font-bold">Write a review</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? 'text-primary' : 'text-muted-foreground'}>
                <Star size={16} fill={n <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience…"
            className="w-full border border-border rounded-md px-2 py-2 text-sm bg-background min-h-[72px]"
          />
          <div className="flex flex-wrap gap-2 text-[11px]">
            <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border cursor-pointer">
              <ImageIcon size={12} /> Photos
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files, 'photo')} />
            </label>
            <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border cursor-pointer">
              <Video size={12} /> Videos
              <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files, 'video')} />
            </label>
            <button type="button" onClick={toggleRecord} className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${recording ? 'border-rose-500 text-rose-500' : 'border-border'}`}>
              <Mic size={12} /> {recording ? 'Stop' : 'Voice'}
            </button>
            <button type="button" disabled={submitting} onClick={submit} className="ml-auto px-3 py-1 rounded bg-primary text-white font-bold disabled:opacity-50">
              {submitting ? 'Posting…' : 'Post review'}
            </button>
          </div>
          {(photos.length > 0 || videos.length > 0 || voiceUrl) && (
            <p className="text-[10px] text-muted-foreground">
              {photos.length} photos · {videos.length} videos {voiceUrl ? '· voice attached' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet for this product.</p>
        ) : (
          reviews.map((r) => {
            const imgs = [...parseList(r.photosJson), ...parseList(r.images)];
            const vids = [...parseList(r.videosJson), ...(r.videoUrl ? [r.videoUrl] : [])];
            return (
              <div key={r.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{r.user?.name || 'Buyer'}</span>
                  <div className="flex items-center gap-2">
                    {r.verifiedPurchase && <span className="text-[10px] font-bold text-emerald-600">Verified purchase</span>}
                    <RatingStars value={r.rating} />
                  </div>
                </div>
                {r.comment && <p className="text-sm text-muted-foreground mt-1.5">{r.comment}</p>}
                {imgs.length > 0 && (
                  <div className="flex gap-1.5 mt-2 overflow-x-auto">
                    {imgs.map((src) => (
                      <img key={src} src={src} alt="" className="w-16 h-16 object-cover rounded border border-border" />
                    ))}
                  </div>
                )}
                {vids.map((src) => (
                  <video key={src} src={src} controls className="mt-2 w-full max-h-56 rounded bg-black" />
                ))}
                {r.voiceUrl && <audio src={r.voiceUrl} controls className="mt-2 w-full" />}
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                  <button type="button" onClick={() => helpful(r.id)} className="inline-flex items-center gap-1 font-bold">
                    <ThumbsUp size={11} /> Helpful {r.helpfulCount || 0}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
