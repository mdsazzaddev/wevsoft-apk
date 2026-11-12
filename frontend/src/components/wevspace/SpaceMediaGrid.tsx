/**
 * Photos / Videos tab content, backed by GET /api/spaces/:id/media.
 *
 * Space media is a real Media row that carries spaceId + uploaderUserId, so
 * this reads the Space's own library rather than filtering the owner's personal
 * uploads (spec §10/§11).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Play, ShieldAlert, Upload, Video as VideoIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSpaceMedia, uploadSpaceImage } from '../../lib/wevspaceApi';
import { resolveAvatarUrl } from '../UserAvatar';

interface MediaItem {
  id: string;
  path: string;
  type: string;
  mimetype?: string | null;
  createdAt: string;
  moderationStatus?: string | null;
  privacy?: string | null;
}

interface Props {
  spaceId: string;
  mediaType: 'image' | 'video';
  /** Enables the uploader; the server still re-checks the permission. */
  canUpload?: boolean;
  className?: string;
}

const PAGE_SIZE = 24;

export default function SpaceMediaGrid({ spaceId, mediaType, canUpload = false, className = '' }: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (offset: number) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await fetchSpaceMedia(spaceId, mediaType, PAGE_SIZE, offset);
        setItems((current) => (offset === 0 ? res.items : [...current, ...res.items]));
        setTotal(res.total || 0);
      } catch (err: any) {
        setError(err?.message || 'Could not load media');
        if (offset === 0) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [spaceId, mediaType],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    void load(0);
  }, [load]);

  const onPick = async (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    setUploading(true);
    try {
      await uploadSpaceImage(spaceId, file);
      toast.success('Added to this WevSpace');
      await load(0);
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const Icon = mediaType === 'video' ? VideoIcon : ImageIcon;
  const hasMore = items.length > 0 && items.length < total;

  return (
    <div className={className}>
      {canUpload && mediaType === 'image' && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-muted-foreground">
            {total} {total === 1 ? 'photo' : 'photos'}
          </p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-primary text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Add photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-card border border-border rounded-3xl p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => void load(0)}
            className="mt-3 px-4 py-2 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-3xl p-10 text-center">
          <span className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
            <Icon size={20} />
          </span>
          <p className="mt-3 font-black text-sm">No {mediaType === 'video' ? 'videos' : 'photos'} yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canUpload
              ? 'Anything you upload to this WevSpace stays owned by the Space, not by your personal account.'
              : 'Nothing has been shared here yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-4">
            {items.map((item) => {
              const url = resolveAvatarUrl(item.path);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLightbox(item)}
                  className="relative group aspect-square rounded-2xl overflow-hidden bg-muted"
                >
                  {mediaType === 'video' ? (
                    <>
                      <video src={url || undefined} className="w-full h-full object-cover" preload="metadata" muted />
                      <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                        <Play size={22} />
                      </span>
                    </>
                  ) : (
                    <img
                      src={url || undefined}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                    />
                  )}
                  {item.moderationStatus && item.moderationStatus !== 'approved' && (
                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/70 text-white text-[10px] font-black">
                      <ShieldAlert size={10} /> {item.moderationStatus}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void load(items.length)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-card border border-border text-sm font-extrabold hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
              >
                {loadingMore && <Loader2 size={15} className="animate-spin" />}
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
          {lightbox.type === 'video' ? (
            <video
              src={resolveAvatarUrl(lightbox.path) || undefined}
              controls
              autoPlay
              className="max-h-[85vh] max-w-full rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={resolveAvatarUrl(lightbox.path) || undefined}
              alt=""
              className="max-h-[85vh] max-w-full rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
