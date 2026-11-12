/**
 * "More" view of the Universal Share modal: search, recent destinations
 * (localStorage, clearable), device share sheet, and every platform with an
 * honest label for how it works in this browser.
 */

import { useMemo, useState } from 'react';
import { Clock, Search, Share2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  AVAILABILITY_LABEL,
  PLATFORMS,
  canUseDeviceShare,
  clearRecentDestinations,
  getRecentDestinations,
  platformAvailability,
  platformByKey,
  searchPlatforms,
  shareWithDevice,
  type SharePlatform,
} from '../../lib/share/shareUtils';
import { platformIconFor, sharePlatform } from './SharePlatformGrid';

const RECOMMENDED = ['wa', 'messenger', 'fb', 'tg', 'email', 'x'];

export default function ShareMorePanel({ url, title, onDone, onWevChat }: { url: string; title: string; onDone?: () => void; onWevChat?: () => void }) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(() => getRecentDestinations());
  const [busy, setBusy] = useState(false);
  const deviceShare = canUseDeviceShare();
  const results = useMemo(() => searchPlatforms(query), [query]);

  const run = async (p: SharePlatform) => {
    const r = await sharePlatform(p, url, title, onWevChat);
    setRecent(getRecentDestinations());
    if (r === 'shared') {
      toast.success(`Shared via ${p.label}`);
      onDone?.();
    }
  };

  const device = async () => {
    if (busy) return;
    setBusy(true);
    const r = await shareWithDevice({ title, text: title, url });
    setBusy(false);
    if (r === 'shared') {
      toast.success('Shared');
      onDone?.();
    } else if (r === 'failed') toast.error('Could not open the share sheet');
    // 'cancelled' is the user closing the sheet: say nothing.
  };

  const tile = (p: SharePlatform) => {
    const Icon = platformIconFor(p.key);
    const a = platformAvailability(p, deviceShare);
    return (
      <li key={p.key}>
        <button
          type="button"
          onClick={() => void run(p)}
          className="w-full flex flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`${p.label}, ${AVAILABILITY_LABEL[a]}`}
        >
          <span className={`w-11 h-11 rounded-full grid place-items-center bg-muted text-foreground ${a === 'unsupported' ? 'opacity-60' : ''}`}>
            <Icon size={20} strokeWidth={2.1} />
          </span>
          <span className="text-[11px] font-semibold leading-tight text-center truncate w-full">{p.label}</span>
          <span className={`text-[9.5px] leading-tight text-center ${a === 'unsupported' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>{AVAILABILITY_LABEL[a]}</span>
        </button>
      </li>
    );
  };

  const recentPlatforms = recent.map(platformByKey).filter(Boolean) as SharePlatform[];
  const recommended = RECOMMENDED.map(platformByKey).filter(Boolean) as SharePlatform[];

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 h-10 px-3 rounded-xl bg-muted/60 border border-border focus-within:ring-2 focus-within:ring-primary/40">
        <Search size={16} className="text-muted-foreground" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps and platforms"
          aria-label="Search share destinations"
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </label>

      <button
        type="button"
        onClick={() => void device()}
        disabled={!deviceShare || busy}
        className="w-full flex items-center gap-3 rounded-2xl border border-border p-3 text-left hover:bg-muted/50 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="w-10 h-10 rounded-full grid place-items-center bg-primary/15 text-primary shrink-0"><Share2 size={18} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold">Share with your device</span>
          <span className="block text-[11.5px] text-muted-foreground">
            {deviceShare ? 'Opens your device share sheet. Apps shown there are chosen by your device.' : 'Your browser does not offer a device share sheet. Use a platform below or Copy link.'}
          </span>
        </span>
      </button>

      {!query && recentPlatforms.length > 0 && (
        <section aria-label="Recent">
          <div className="flex items-center mb-1.5">
            <h4 className="flex-1 text-[12px] font-bold text-muted-foreground flex items-center gap-1.5"><Clock size={12} /> Recent</h4>
            <button
              type="button"
              onClick={() => {
                clearRecentDestinations();
                setRecent([]);
              }}
              className="text-[11.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Trash2 size={12} /> Clear recents
            </button>
          </div>
          <ul className="grid grid-cols-4 sm:grid-cols-5 gap-1">{recentPlatforms.map(tile)}</ul>
        </section>
      )}

      {!query && (
        <section aria-label="Recommended">
          <h4 className="text-[12px] font-bold text-muted-foreground mb-1.5">Recommended</h4>
          <ul className="grid grid-cols-4 sm:grid-cols-5 gap-1">{recommended.map(tile)}</ul>
        </section>
      )}

      <section aria-label={query ? 'Search results' : 'All platforms'}>
        <h4 className="text-[12px] font-bold text-muted-foreground mb-1.5">{query ? 'Results' : 'All platforms'}</h4>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No platform matches “{query}”. Use Copy link to share anywhere.</p>
        ) : (
          <ul className="grid grid-cols-4 sm:grid-cols-5 gap-1">{results.map(tile)}</ul>
        )}
      </section>
      <p className="text-[11px] text-muted-foreground">
        “Web share” opens the platform’s official share page. “Via device share sheet” needs your device to offer it; WebSoft cannot tell which apps you have installed.
      </p>
    </div>
  );
}

export { PLATFORMS };
