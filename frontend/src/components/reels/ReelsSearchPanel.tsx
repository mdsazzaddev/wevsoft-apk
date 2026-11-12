import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft, BadgeCheck, Clock, Flame, Hash, Play, Search, Trash2, User, X, Filter, ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import UserAvatar from '../UserAvatar';
import { contentAuthorLabel } from '@wevsoft/shared/content-author';
import ReelSearchThumbnail from './ReelSearchThumbnail';

type Creator = {
  id: string;
  name?: string | null;
  username?: string | null;
  profileSlug?: string | null;
  avatar?: string | null;
  verified?: boolean;
};

type SuggestPayload = {
  queries: string[];
  hashtags: string[];
  creators: Creator[];
  reels: { id: string; title: string; thumbnailUrl?: string | null; views?: number; user?: Creator }[];
};

function formatViews(n?: number) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
}

function reelTitle(item: any) {
  return String(item?.title || item?.caption || item?.description || 'Reel').trim() || 'Reel';
}

function creatorHandle(user?: Creator | null) {
  return user?.username || user?.profileSlug || '';
}

function uploadedAgo(value?: string | Date | null) {
  if (!value) return '';
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return '';
  }
}

const iconBtn =
  'w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/8 hover:text-foreground shrink-0';

function highlightText(text: string, query: string, onMedia = false) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = String(text).split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <strong
            key={i}
            className={
              onMedia
                ? 'text-white bg-white/20 px-[1px] mx-[1px] rounded-[3px]'
                : 'text-foreground bg-primary/20 px-[1px] mx-[1px] rounded-[3px]'
            }
          >
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function ReelsSearchPanel({
  open,
  token,
  onClose,
  onOpenReel,
}: {
  open: boolean;
  token: string | null;
  onClose: () => void;
  onOpenReel: (items: any[], index: number) => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggest, setSuggest] = useState<SuggestPayload | null>(null);
  const [recent, setRecent] = useState<{ id: string; query: string }[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [exactMatch, setExactMatch] = useState(true);
  const [searched, setSearched] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [sort, setSort] = useState('relevance');
  const [time, setTime] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const suggestionRows = useMemo(() => {
    if (!query.trim() || !suggest) return [];
    const rows: { kind: 'query' | 'hashtag' | 'creator' | 'reel'; label: string; value: string; extra?: any }[] = [];
    for (const q of suggest.queries) rows.push({ kind: 'query', label: q, value: q });
    for (const h of suggest.hashtags) rows.push({ kind: 'hashtag', label: `#${h.replace(/^#/, '')}`, value: `#${h.replace(/^#/, '')}` });
    for (const c of suggest.creators) {
      const handle = creatorHandle(c);
      rows.push({ kind: 'creator', label: c.name || handle, value: handle ? `@${handle}` : c.name || '', extra: c });
    }
    for (const r of suggest.reels) rows.push({ kind: 'reel', label: r.title, value: r.id, extra: r });
    return rows.slice(0, 10);
  }, [query, suggest]);

  const loadDiscover = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reels/search/discover', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRecent(Array.isArray(data.recent) ? data.recent : []);
      setTrending(Array.isArray(data.trending) ? data.trending : []);
    } catch {
      /* ignore */
    }
  }, [token]);

  const runSearch = useCallback(async (raw: string, opts?: { save?: boolean; openId?: string; isLive?: boolean }) => {
    const q = raw.trim();
    if (!q || !token) return;
    if (!opts?.isLive) {
      setQuery(q);
      setSuggest(null);
    }
    setLoading(true);
    setSearched(true);
    try {
      const qs = new URLSearchParams({ q, sort, time });
      const res = await fetch(`/api/reels/search?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('search');
      const data = await res.json();
      const nextItems = Array.isArray(data.items) ? data.items : [];
      const nextRelated = Array.isArray(data.related) ? data.related : [];
      setItems(nextItems);
      setRelated(nextRelated);
      setCreators(Array.isArray(data.creators) ? data.creators : []);
      setCreator(data.creator || null);
      setExactMatch(data.exactMatch !== false);
      if (opts?.save !== false) {
        fetch('/api/reels/search/history', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, resultCount: nextItems.length }),
        }).catch(() => {});
      }
      if (opts?.openId) {
        const idx = nextItems.findIndex((i: any) => String(i.id) === String(opts.openId));
        if (idx >= 0) {
          onOpenReel(nextItems, idx);
          return;
        }
      }
      if (data.openPlayer && nextItems.length) {
        onOpenReel(nextItems, 0);
        return;
      }
    } catch {
      setItems([]);
      setRelated([]);
    } finally {
      setLoading(false);
    }
  }, [token, onOpenReel]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setQuery('');
    setItems([]);
    setRelated([]);
    setSuggest(null);
    setCreator(null);
    setCreators([]);
    setSearched(false);
    setHighlight(0);
    setShowFilters(false);
    void loadDiscover();
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open, loadDiscover]);

  useEffect(() => {
    if (!open || !token) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setSuggest(null);
      setSearched(false);
      setItems([]);
      setRelated([]);
      setCreator(null);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      fetch(`/api/reels/search/suggest?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setSuggest(data);
        })
        .catch(() => {});
      
      void runSearch(q, { save: false, isLive: true });
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, sort, time, open, token, runSearch]);

  const pickSuggestion = (row: (typeof suggestionRows)[number]) => {
    if (row.kind === 'reel' && row.extra) {
      void runSearch(row.extra.title || row.label, { openId: row.extra.id });
      return;
    }
    void runSearch(row.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown' && suggestionRows.length) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestionRows.length);
      return;
    }
    if (e.key === 'ArrowUp' && suggestionRows.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestionRows.length) % suggestionRows.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestionRows[highlight] && query.trim()) {
        pickSuggestion(suggestionRows[highlight]);
      } else {
        void runSearch(query);
      }
    }
  };

  const removeRecent = async (id: string) => {
    setRecent((prev) => prev.filter((r) => r.id !== id));
    if (!token) return;
    fetch(`/api/reels/search/history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const clearRecent = async () => {
    setRecent([]);
    if (!token) return;
    fetch('/api/reels/search/history', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  };

  const playFrom = (list: any[], index: number) => {
    const queue = related.length
      ? [...list, ...related.filter((r) => !list.some((i) => i.id === r.id))]
      : list;
    const targetId = list[index]?.id;
    const nextIndex = Math.max(0, queue.findIndex((r) => r.id === targetId));
    onOpenReel(queue, nextIndex);
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed inset-0 z-[190] bg-black/50"
        aria-label="Close search"
        onClick={onClose}
      />
      <div className="h-full shrink-0 w-0 min-w-0 overflow-visible lg:w-[380px] xl:w-[420px]">
        <motion.aside
          className="flex flex-col h-full bg-background text-foreground border-r border-border max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[200] max-lg:w-[min(86vw,380px)] lg:relative lg:w-full"
          initial={{ x: -18, opacity: 0.85 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -18, opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-label="Search reels"
        >
          <div
            className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-xl"
            style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
          >
            <div className="flex items-center gap-2 px-3 pb-3">
              <button type="button" onClick={onClose} title="Back" aria-label="Close search" className={iconBtn}>
                <ArrowLeft size={22} strokeWidth={2.4} />
              </button>
              <div className="relative flex-1">
                <Search
                  size={16}
                  strokeWidth={2.4}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setHighlight(0);
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Search reels, @username, #hashtag"
                  className="w-full h-10 rounded-full bg-foreground/6 hover:bg-foreground/8 focus:bg-foreground/10 border border-border pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSearched(false);
                      setItems([]);
                      setRelated([]);
                      setSuggest(null);
                      inputRef.current?.focus();
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/8"
                    aria-label="Clear search"
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            </div>
            
            {searched && (
              <div className="px-3 pb-3 pt-1 border-b border-border bg-background">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                      showFilters ? 'bg-foreground text-background' : 'bg-foreground/8 text-foreground hover:bg-foreground/12'
                    }`}
                  >
                    <Filter size={14} /> Filters
                    <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </button>
                  {(sort !== 'relevance' || time !== 'all') && (
                    <span className="text-[11px] text-sky-400 font-semibold px-2">Filters active</span>
                  )}
                </div>
                
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5 px-1">Sort By</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['relevance', 'newest', 'popular'].map((s) => (
                            <button
                              key={s}
                              onClick={() => { setSort(s); if (query) runSearch(query); }}
                              className={`px-3 py-1.5 rounded-full text-[12px] capitalize transition-colors ${
                                sort === s ? 'bg-foreground/12 text-foreground font-medium ring-1 ring-foreground/25' : 'bg-transparent text-muted-foreground hover:bg-foreground/8 hover:text-foreground'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5 px-1">Time</span>
                        <div className="flex flex-wrap gap-1.5">
                          {['all', 'today', 'week', 'month'].map((t) => (
                            <button
                              key={t}
                              onClick={() => { setTime(t); if (query) runSearch(query); }}
                              className={`px-3 py-1.5 rounded-full text-[12px] capitalize transition-colors ${
                                time === t ? 'bg-foreground/12 text-foreground font-medium ring-1 ring-foreground/25' : 'bg-transparent text-muted-foreground hover:bg-foreground/8 hover:text-foreground'
                              }`}
                            >
                              {t === 'all' ? 'All Time' : t === 'week' ? 'This Week' : t === 'month' ? 'This Month' : t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {query.trim() && suggestionRows.length > 0 && (
              <div className="px-3 py-2">
                {suggestionRows.map((row, i) => (
                  <button
                    key={`${row.kind}-${row.value}-${i}`}
                    type="button"
                    onClick={() => pickSuggestion(row)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${
                      i === highlight ? 'bg-foreground/10' : 'hover:bg-foreground/6'
                    }`}
                  >
                    <span className="w-9 h-9 rounded-full bg-foreground/8 flex items-center justify-center text-muted-foreground">
                      {row.kind === 'hashtag' && <Hash size={16} strokeWidth={2.2} />}
                      {row.kind === 'query' && <Clock size={16} strokeWidth={2.2} />}
                      {row.kind === 'creator' && <User size={16} strokeWidth={2.2} />}
                      {row.kind === 'reel' && <Play size={16} strokeWidth={2.2} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{highlightText(row.label, query)}</span>
                      <span className="block text-[11px] text-muted-foreground capitalize">{row.kind}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!query.trim() && (
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="px-4 py-4 space-y-7">
                {recent.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Recent searches</h2>
                      <button
                        type="button"
                        onClick={() => void clearRecent()}
                        className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Clear
                      </button>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {recent.map((row) => (
                        <div key={row.id} className="flex items-center group">
                          <button
                            type="button"
                            onClick={() => void runSearch(row.query)}
                            className="flex-1 flex items-center gap-3 px-2 py-2.5 rounded-2xl hover:bg-foreground/6 text-left"
                          >
                            <Clock size={16} className="text-muted-foreground" strokeWidth={2.2} />
                            <span className="text-[15px] font-medium truncate">{row.query}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeRecent(row.id)}
                            className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/8 flex items-center justify-center opacity-80"
                            aria-label="Remove search"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {trending.length > 0 && (
                  <section>
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-3">Trending searches</h2>
                    <div className="flex flex-wrap gap-2">
                      {trending.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => void runSearch(q)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/8 hover:bg-foreground/12 border border-border text-[13px] font-semibold transition-colors"
                        >
                          <Flame size={13} className="text-orange-400" />
                          {q}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {recent.length === 0 && trending.length === 0 && (
                  <div className="pt-16 text-center text-muted-foreground text-sm px-6">
                    Search titles, captions, hashtags, or type @username
                  </div>
                )}
              </motion.div>
            )}

            {searched && (
              <div className="px-3 pb-10">
                {loading && (
                  <div className="py-16 text-center text-muted-foreground text-sm font-semibold">Searching…</div>
                )}
                {!loading && creator && (
                  <button
                    type="button"
                    onClick={() => navigate(`/u/${creatorHandle(creator) || creator.id}`)}
                    className="w-full flex items-center gap-3 px-2 py-4 mb-2 rounded-2xl hover:bg-foreground/6 text-left"
                  >
                    <UserAvatar user={creator} className="w-14 h-14 text-lg" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 text-[16px] font-extrabold">
                        {creator.name || creatorHandle(creator)}
                        {creator.verified && <BadgeCheck size={16} className="text-sky-400" />}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {creatorHandle(creator) ? `@${creatorHandle(creator)}` : 'Creator'}
                        {items.length ? ` · ${items.length} reels` : ''}
                      </span>
                    </span>
                  </button>
                )}
                {!loading && !creator && creators.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 mb-2">
                    {creators.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => void runSearch(`@${creatorHandle(c) || c.name}`)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-2xl bg-foreground/8 hover:bg-foreground/12 shrink-0"
                      >
                        <UserAvatar user={c} className="w-8 h-8 text-xs" />
                        <span className="text-[13px] font-semibold">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!loading && items.length === 0 && related.length === 0 && suggestionRows.length === 0 && (
                  <div className="py-16 text-center text-muted-foreground text-sm px-6">
                    No reels found. Try a hashtag, title, or @username.
                  </div>
                )}
                {!loading && items.length > 0 && (
                  <>
                    {!exactMatch && (
                      <p className="px-1 pb-2 text-[12px] text-muted-foreground">No exact match — showing related reels</p>
                    )}
                    <ReelResultGrid items={items} onPlay={(i) => playFrom(items, i)} query={query} />
                  </>
                )}
                {!loading && related.length > 0 && (
                  <section className="mt-6">
                    <h2 className="px-1 mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Related Reels
                    </h2>
                    <ReelResultGrid items={related} onPlay={(i) => playFrom(related, i)} query={query} />
                  </section>
                )}
              </div>
            )}
          </div>
        </motion.aside>
      </div>
    </>
  );
}

function ReelResultGrid({ items, onPlay, query = '' }: { items: any[]; onPlay: (index: number) => void; query?: string }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, index) => (
        <button
          key={item.id || index}
          type="button"
          onClick={() => onPlay(index)}
          className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-muted ring-1 ring-border text-left transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          <ReelSearchThumbnail key={`${item.id}-${item.thumbnailUrl || item.videoUrl || ''}`} thumbnailUrl={item.thumbnailUrl} videoUrl={item.videoUrl} alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="w-11 h-11 rounded-full bg-black/45 border border-white/20 backdrop-blur-md flex items-center justify-center">
              <Play size={18} fill="white" className="text-white ml-0.5" />
            </span>
          </span>
          <span className="absolute bottom-0 left-0 right-0 p-2.5">
            <span className="block text-[13px] font-bold leading-tight line-clamp-2 text-white">{highlightText(reelTitle(item), query, true)}</span>
            <span className="mt-1 block text-[11px] text-white/70 truncate">
              {highlightText(contentAuthorLabel(item), query, true)}
            </span>
            <span className="mt-0.5 block text-[10px] text-white/50">
              {formatViews(item.views)} views
              {item.createdAt ? ` · ${uploadedAgo(item.createdAt)}` : ''}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
