import { useMemo } from 'react';
import { Clock, Play } from 'lucide-react';
import { AuthorAvatar } from '../social/ContentAuthor';
import { resolveContentAuthor } from '@wevsoft/shared/content-author';
import { formatReelTime } from './ReelFullscreenControls';

type HistoryReel = {
  id: string;
  videoUrl?: string;
  thumbnailUrl?: string | null;
  caption?: string;
  description?: string;
  durationSec?: number | null;
  watchPercent?: number;
  watchPosition?: number;
  watchedAt?: string;
  createdAt?: string;
  user?: { name?: string; username?: string; avatar?: string | null };
};

function durationOf(reel: HistoryReel) {
  if (Number.isFinite(reel.durationSec) && (reel.durationSec || 0) > 0) return Number(reel.durationSec);
  if (reel.watchPosition && reel.watchPercent && reel.watchPercent > 0) {
    return reel.watchPosition / (reel.watchPercent / 100);
  }
  return 0;
}

function watchedDate(reel: HistoryReel) {
  const raw = reel.watchedAt || reel.createdAt;
  const d = raw ? new Date(raw) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayHeading(key: string) {
  const d = new Date(`${key}T12:00:00`);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function ReelsHistoryPlaylist({
  reels,
  loading,
  onPlay,
}: {
  reels: HistoryReel[];
  loading?: boolean;
  onPlay: (index: number) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Array<{ reel: HistoryReel; index: number }>>();
    reels.forEach((reel, index) => {
      const key = dayKey(watchedDate(reel));
      const list = map.get(key) || [];
      list.push({ reel, index });
      map.set(key, list);
    });
    return [...map.entries()];
  }, [reels]);

  return (
    <div className="h-full w-full overflow-y-auto bg-background text-foreground px-4 py-5 md:px-8 md:py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-5">
          <Clock size={20} className="text-muted-foreground" />
          <h2 className="text-foreground text-xl font-extrabold">Watch History</h2>
          <span className="text-muted-foreground text-sm font-semibold ml-1">{reels.length}</span>
        </div>

        {loading && reels.length === 0 && (
          <p className="text-muted-foreground text-sm font-semibold py-16 text-center">Loading history…</p>
        )}

        {!loading && reels.length === 0 && (
          <p className="text-muted-foreground text-sm font-semibold py-16 text-center">
            No watch history yet. Watch a reel and it will show up here.
          </p>
        )}

        <div className="flex flex-col gap-7">
          {groups.map(([key, items]) => (
            <section key={key}>
              <div className="sticky top-0 z-10 -mx-1 mb-2 bg-background/95 backdrop-blur-sm px-1 py-2">
                <h3 className="text-foreground text-[15px] font-extrabold">{dayHeading(key)}</h3>
                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                  {new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {items.length} {items.length === 1 ? 'video' : 'videos'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {items.map(({ reel, index }) => {
                  const duration = durationOf(reel);
                  const percent = Math.min(100, Math.max(0, Number(reel.watchPercent) || 0));
                  const title = reel.caption || reel.description || 'Reel';
                  // Space-published reels carry no `user`; the resolver names the Space.
                  const author = resolveContentAuthor(reel);
                  const creator = author.kind === 'space' ? author.name : author.at || author.name;
                  const when = watchedDate(reel);
                  return (
                    <button
                      key={`${reel.id}-${index}`}
                      type="button"
                      onClick={() => onPlay(index)}
                      className="w-full flex items-center gap-3 rounded-xl p-1.5 pr-3 text-left hover:bg-foreground/6 transition-colors group"
                    >
                      <span className="relative shrink-0 w-[148px] sm:w-[168px] aspect-video rounded-lg overflow-hidden bg-black">
                        {reel.thumbnailUrl ? (
                          <img src={reel.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : reel.videoUrl ? (
                          <video src={reel.videoUrl} muted playsInline preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 bg-muted" />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/35">
                          <Play size={22} fill="white" className="text-white ml-0.5" />
                        </span>
                        {duration > 0 && (
                          <span className="absolute bottom-1.5 right-1.5 rounded px-1 py-px bg-black/80 text-white text-[10px] font-bold tabular-nums">
                            {formatReelTime(duration)}
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                          <span className="block h-full bg-red-500" style={{ width: `${percent}%` }} />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 py-1">
                        <span className="block text-foreground text-[14px] font-semibold leading-snug line-clamp-2">
                          {title}
                        </span>
                        <span className="mt-1.5 flex items-center gap-1.5 min-w-0">
                          <AuthorAvatar author={author} className="w-5 h-5 text-[8px]" radius="rounded-md" />
                          <span className="truncate text-[12px] text-muted-foreground font-medium">{creator}</span>
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-medium">
                          <span>{timeLabel(when)}</span>
                          <span className="text-foreground/25">·</span>
                          <span>{when.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {percent > 0 && (
                            <>
                              <span className="text-foreground/25">·</span>
                              <span>{percent >= 95 ? 'Watched' : `${Math.round(percent)}% watched`}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
