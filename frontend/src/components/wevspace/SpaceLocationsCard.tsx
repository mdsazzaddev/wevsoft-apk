/**
 * Store locations on the public Space About tab (Feature 9). Data: GET /api/business-suite/public/spaces/:id/locations
 * (managed in the business app → Shop → Locations). Renders nothing when the Space has no locations.
 */
import { useEffect, useState } from 'react';
import { Clock, ExternalLink, MapPin, Phone } from 'lucide-react';

type Loc = { id: string; name: string; address: string; city?: string | null; country?: string | null; phone?: string | null; isPrimary?: boolean; mapLink?: string | null; hours?: Record<string, Array<{ start: string; end: string }>> | null };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SpaceLocationsCard({ spaceId, className = '' }: { spaceId: string; className?: string }) {
  const [locs, setLocs] = useState<Loc[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/business-suite/public/spaces/${encodeURIComponent(spaceId)}/locations`)
      .then((r) => (r.ok ? r.json() : { locations: [] }))
      .then((d) => { if (alive) setLocs(Array.isArray(d?.locations) ? d.locations : []); })
      .catch(() => { /* optional block */ });
    return () => { alive = false; };
  }, [spaceId]);
  if (!locs.length) return null;
  return (
    <div className={`bg-card border border-border rounded-3xl p-5 space-y-4 mt-4 ${className}`}>
      <h2 className="font-black text-base">{locs.length > 1 ? 'Locations' : 'Location'}</h2>
      {locs.map((l) => (
        <div key={l.id} className="space-y-1.5 text-sm">
          <div className="flex items-start gap-2.5"><MapPin size={15} className="mt-0.5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="font-semibold">{l.name}</p><p className="text-muted-foreground">{[l.address, l.city, l.country].filter(Boolean).join(', ')}</p></div>
            {l.mapLink && <a href={l.mapLink} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-bold hover:underline">Map <ExternalLink size={12} /></a>}</div>
          {l.phone && <div className="flex items-center gap-2.5 pl-0.5"><Phone size={14} className="text-muted-foreground" /><a href={`tel:${l.phone}`} className="font-semibold hover:underline">{l.phone}</a></div>}
          {l.hours && (
            <div className="flex items-start gap-2.5"><Clock size={14} className="mt-0.5 text-muted-foreground" />
              <div className="grid grid-cols-[auto_1fr] gap-x-3 text-[13px]">
                {DAYS.map((d, i) => <div key={d} className="contents"><span className="text-muted-foreground">{d}</span><span className={l.hours?.[i]?.length ? 'font-bold' : 'text-muted-foreground'}>{l.hours?.[i]?.length ? l.hours[i].map((r) => `${r.start}–${r.end}`).join(', ') : 'Closed'}</span></div>)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
