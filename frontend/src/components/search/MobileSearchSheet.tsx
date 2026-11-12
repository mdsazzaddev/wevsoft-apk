import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Loader2, Play, Search, Store, Users, X, LayoutGrid, Building2 } from 'lucide-react';
import { useStore } from '../../store';
import { searchSpaces, type SpaceCardPayload } from '../../lib/wevspaceApi';

/**
 * Facebook-style mobile search screen (mobile only - opened from MobileBottomNav).
 * Fans out to existing endpoints:
 *  - People      -> GET /api/users/search
 *  - Reels       -> GET /api/reels/search
 *  - Spaces      -> GET /api/spaces/search
 *  - Marketplace -> GET /api/marketplace?q=
 * Recent searches are stored client-side (localStorage).
 */

type TabId = 'all' | 'people' | 'reels' | 'spaces' | 'marketplace';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'people', label: 'People' },
  { id: 'reels', label: 'Reels' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'marketplace', label: 'Marketplace' },
];

const RECENT_KEY = 'wevsoft.mobileSearch.recent';
const MAX_RECENT = 10;

interface PersonHit { id: string; name?: string | null; username?: string | null; avatar?: string | null }
interface ReelHit { id: string; thumbnailUrl?: string | null; caption?: string | null; author?: { name?: string | null; username?: string | null } | null }
interface ProductHit { id: string; title: string; price?: number | null; images?: unknown; location?: string | null }

interface Results {
  people: PersonHit[];
  reels: ReelHit[];
  spaces: SpaceCardPayload[];
  products: ProductHit[];
}

const EMPTY: Results = { people: [], reels: [], spaces: [], products: [] };

function loadRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((s) => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* ignore quota */
  }
}

function firstImage(images: unknown): string | null {
  if (Array.isArray(images)) {
    const f = images[0];
    if (typeof f === 'string') return f;
    if (f && typeof f === 'object' && 'url' in f) return String((f as { url: unknown }).url);
  }
  if (typeof images === 'string') {
    try {
      return firstImage(JSON.parse(images));
    } catch {
      return images || null;
    }
  }
  return null;
}

async function getJson(url: string, token: string | null): Promise<any> {
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function Avatar({ src, name, rounded = 'rounded-full' }: { src?: string | null; name?: string | null; rounded?: string }) {
  return src ? (
    <img src={src} alt="" className={`w-10 h-10 ${rounded} object-cover bg-muted shrink-0`} />
  ) : (
    <div className={`w-10 h-10 ${rounded} bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0`}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

interface MobileSearchSheetProps {
  open: boolean;
  onClose: () => void;
}

export const MobileSearchSheet: React.FC<MobileSearchSheetProps> = ({ open, onClose }) => {
  const token = useStore((s) => s.token);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabId>('all');
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [suggestions, setSuggestions] = useState<PersonHit[]>([]);
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Live people suggestions while typing (before submitting).
  useEffect(() => {
    const q = input.trim();
    if (!open || !q || q === query) return;
    const t = setTimeout(() => {
      getJson(`/api/users/search?q=${encodeURIComponent(q)}&limit=5`, token)
        .then((d) => setSuggestions(Array.isArray(d?.users) ? d.users : []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [input, open, query, token]);

  const runSearch = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      setInput(q);
      setQuery(q);
      setTab('all');
      setSuggestions([]);
      inputRef.current?.blur();
      const next = [q, ...loadRecent().filter((r) => r.toLowerCase() !== q.toLowerCase())];
      saveRecent(next);
      setRecent(next.slice(0, MAX_RECENT));

      const id = ++requestId.current;
      setLoading(true);
      const enc = encodeURIComponent(q);
      const [people, reels, spaces, products] = await Promise.allSettled([
        getJson(`/api/users/search?q=${enc}&limit=20`, token),
        getJson(`/api/reels/search?q=${enc}`, token),
        searchSpaces(q, 20),
        getJson(`/api/marketplace?q=${enc}`, token),
      ]);
      if (id !== requestId.current) return;
      setResults({
        people: people.status === 'fulfilled' && Array.isArray(people.value?.users) ? people.value.users : [],
        reels: reels.status === 'fulfilled' && Array.isArray(reels.value?.items) ? reels.value.items : [],
        spaces: spaces.status === 'fulfilled' && Array.isArray(spaces.value?.spaces) ? spaces.value.spaces : [],
        products:
          products.status === 'fulfilled' && Array.isArray(products.value) ? products.value.slice(0, 40) : [],
      });
      setLoading(false);
    },
    [token],
  );

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const removeRecent = (term: string) => {
    const next = recent.filter((r) => r !== term);
    saveRecent(next);
    setRecent(next);
  };

  const clearRecent = () => {
    saveRecent([]);
    setRecent([]);
  };

  const total = useMemo(
    () => results.people.length + results.reels.length + results.spaces.length + results.products.length,
    [results],
  );

  if (!open) return null;

  const showResults = Boolean(query) && input.trim() === query;

  const sectionHeader = (title: string, target: TabId, count: number) => (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {tab === 'all' && count > 3 && (
        <button type="button" onClick={() => setTab(target)} className="text-sm font-medium text-primary">
          See all
        </button>
      )}
    </div>
  );

  const limitFor = (n: number) => (tab === 'all' ? Math.min(n, 3) : n);

  const peopleList = (
    <div>
      {results.people.slice(0, limitFor(results.people.length)).map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => p.username && go(`/u/${p.username}`)}
          className="w-full flex items-center gap-3 px-4 py-2 active:bg-muted/60 text-left"
        >
          <Avatar src={p.avatar} name={p.name || p.username} />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{p.name || p.username}</div>
            {p.username && <div className="text-xs text-muted-foreground truncate">@{p.username}</div>}
          </div>
        </button>
      ))}
    </div>
  );

  const spacesList = (
    <div>
      {results.spaces.slice(0, limitFor(results.spaces.length)).map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => go(`/space/${s.handle}`)}
          className="w-full flex items-center gap-3 px-4 py-2 active:bg-muted/60 text-left"
        >
          <Avatar src={s.avatar} name={s.name} rounded="rounded-xl" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{s.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {[s.category, s.followersCount != null ? `${s.followersCount} followers` : null].filter(Boolean).join(' \u00B7 ') ||
                `@${s.handle}`}
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const reelsGrid = (
    <div className="grid grid-cols-3 gap-1 px-4">
      {results.reels.slice(0, tab === 'all' ? 6 : results.reels.length).map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => go(`/reels/${r.id}`)}
          className="relative aspect-[9/16] rounded-lg overflow-hidden bg-muted"
        >
          {r.thumbnailUrl && <img src={r.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <Play size={16} className="absolute top-1.5 right-1.5 text-white drop-shadow" fill="currentColor" />
          {r.caption && (
            <span className="absolute bottom-0 inset-x-0 p-1.5 text-[11px] leading-tight text-white bg-gradient-to-t from-black/70 to-transparent line-clamp-2 text-left">
              {r.caption}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const productsGrid = (
    <div className="grid grid-cols-2 gap-2 px-4">
      {results.products.slice(0, tab === 'all' ? 4 : results.products.length).map((p) => {
        const img = firstImage(p.images);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => go(`/wevmall/product/${p.id}`)}
            className="text-left rounded-xl overflow-hidden border border-border/50 bg-card"
          >
            <div className="aspect-square bg-muted">
              {img && <img src={img} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="p-2">
              {p.price != null && <div className="text-sm font-semibold text-foreground">{'\u09F3'}{p.price}</div>}
              <div className="text-xs text-foreground/80 line-clamp-2">{p.title}</div>
              {p.location && <div className="text-[11px] text-muted-foreground truncate">{p.location}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );

  const empty = (label: string) => (
    <div className="px-6 py-16 text-center text-sm text-muted-foreground">No {label} found for &quot;{query}&quot;.</div>
  );

  const renderResults = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="animate-spin" size={24} />
        </div>
      );
    }
    switch (tab) {
      case 'people':
        return results.people.length ? peopleList : empty('people');
      case 'reels':
        return results.reels.length ? <div className="pt-3">{reelsGrid}</div> : empty('reels');
      case 'spaces':
        return results.spaces.length ? spacesList : empty('spaces');
      case 'marketplace':
        return results.products.length ? <div className="pt-3">{productsGrid}</div> : empty('listings');
      default:
        if (!total) return empty('results');
        return (
          <div className="pb-6">
            {results.people.length > 0 && (
              <section>{sectionHeader('People', 'people', results.people.length)}{peopleList}</section>
            )}
            {results.reels.length > 0 && (
              <section>{sectionHeader('Reels', 'reels', results.reels.length > 6 ? 4 : 0)}{reelsGrid}</section>
            )}
            {results.spaces.length > 0 && (
              <section>{sectionHeader('Spaces', 'spaces', results.spaces.length)}{spacesList}</section>
            )}
            {results.products.length > 0 && (
              <section>
                {sectionHeader('Marketplace', 'marketplace', results.products.length > 4 ? 4 : 0)}
                {productsGrid}
              </section>
            )}
          </div>
        );
    }
  };

  const tabIcon: Record<TabId, React.ReactNode> = {
    all: <LayoutGrid size={14} />,
    people: <Users size={14} />,
    reels: <Play size={14} />,
    spaces: <Building2 size={14} />,
    marketplace: <Store size={14} />,
  };

  return createPortal(
    <div className="md:hidden fixed inset-0 z-[70] bg-background flex flex-col pt-[env(safe-area-inset-top,0px)]" role="dialog" aria-modal="true" aria-label="Search">
      <form
        className="flex items-center gap-2 px-2 py-2 border-b border-border/40"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(input);
        }}
      >
        <button type="button" onClick={onClose} className="p-2 rounded-full active:bg-muted text-foreground" aria-label="Close search">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1 flex items-center gap-2 h-10 px-3 rounded-full bg-muted">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search Wevsoft"
            className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground"
          />
          {input && (
            <button type="button" onClick={() => { setInput(''); inputRef.current?.focus(); }} className="text-muted-foreground" aria-label="Clear">
              <X size={18} />
            </button>
          )}
        </div>
      </form>

      {showResults && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto no-scrollbar border-b border-border/40">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 shrink-0 px-3.5 h-8 rounded-full text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}
            >
              {tabIcon[t.id]}
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {showResults ? (
          renderResults()
        ) : input.trim() ? (
          <div className="py-2">
            <button
              type="button"
              onClick={() => void runSearch(input)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/60 text-left"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Search size={18} className="text-foreground" />
              </div>
              <span className="text-sm text-foreground truncate">Search for &quot;{input.trim()}&quot;</span>
            </button>
            {suggestions.filter(() => input.trim() !== query).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => p.username && go(`/u/${p.username}`)}
                className="w-full flex items-center gap-3 px-4 py-2 active:bg-muted/60 text-left"
              >
                <Avatar src={p.avatar} name={p.name || p.username} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{p.name || p.username}</div>
                  {p.username && <div className="text-xs text-muted-foreground truncate">@{p.username}</div>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-2">
            <div className="flex items-center justify-between px-4 py-2">
              <h3 className="text-base font-semibold text-foreground">Recent</h3>
              {recent.length > 0 && (
                <button type="button" onClick={clearRecent} className="text-sm font-medium text-primary">
                  Clear all
                </button>
              )}
            </div>
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Search for people, reels, Spaces and Marketplace listings.
              </p>
            ) : (
              recent.map((term) => (
                <div key={term} className="flex items-center gap-3 px-4 py-1.5">
                  <button type="button" onClick={() => void runSearch(term)} className="flex-1 flex items-center gap-3 min-w-0 text-left py-1">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Clock size={18} className="text-muted-foreground" />
                    </div>
                    <span className="text-sm text-foreground truncate">{term}</span>
                  </button>
                  <button type="button" onClick={() => removeRecent(term)} className="p-2 text-muted-foreground" aria-label={`Remove ${term}`}>
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default MobileSearchSheet;
