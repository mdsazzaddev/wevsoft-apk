/**
 * The Space "About" block: description, contact, hours and links.
 *
 * Rendered by the Home tab, the About tab and the wizard preview, so all three
 * stay identical by construction (spec §8). `compact` trims it for the Home
 * sidebar; the About tab uses the full version.
 */

import type { MouseEvent, ReactNode } from 'react';
import {
  WEEK_DAYS,
  formatHourLabel,
  resolveSpaceAccent,
  spaceTypeLabel,
  type SpacePublicPayload,
} from '@wevsoft/shared/wevspace';
import { Clock, Globe, Info, Mail, MapPin, Phone } from 'lucide-react';
import { spaceLinkIcon } from './spaceIcons';

interface Props {
  space: SpacePublicPayload;
  compact?: boolean;
  interactive?: boolean;
  className?: string;
}

function Row({ icon: Icon, children }: { icon: typeof Info; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}

export default function SpaceAboutCard({ space, compact = false, interactive = true, className = '' }: Props) {
  const accent = resolveSpaceAccent(space);
  const hours = space.businessHours;
  const links = space.links || [];
  const hasContact = !!(space.website || space.contactEmail || space.contactPhone || space.location);
  const hasAnything = !!space.description || hasContact || !!hours || links.length > 0;

  if (!hasAnything) {
    return (
      <div className={`bg-card border border-border rounded-3xl p-5 ${className}`}>
        <h2 className="font-black text-base mb-1">About</h2>
        <p className="text-sm text-muted-foreground">
          {spaceTypeLabel(space.spaceType)} on Wevsoft. Nothing added here yet.
        </p>
      </div>
    );
  }

  const linkProps = interactive
    ? { target: '_blank' as const, rel: 'noreferrer noopener' }
    : { onClick: (e: MouseEvent) => e.preventDefault() };

  return (
    <div className={`bg-card border border-border rounded-3xl p-5 space-y-4 ${className}`}>
      <h2 className="font-black text-base">About</h2>

      {space.description && (
        <p className={`text-sm text-muted-foreground whitespace-pre-line ${compact ? 'line-clamp-6' : ''}`}>
          {space.description}
        </p>
      )}

      {hasContact && (
        <div className="space-y-2.5">
          {space.location && (
            <Row icon={MapPin}>
              <span className="font-semibold">{space.location}</span>
              {space.country && <span className="text-muted-foreground">, {space.country}</span>}
            </Row>
          )}
          {space.website && (
            <Row icon={Globe}>
              <a
                href={space.website}
                {...linkProps}
                className="font-semibold hover:underline break-all"
                style={{ color: accent }}
              >
                {space.website.replace(/^https?:\/\//, '')}
              </a>
            </Row>
          )}
          {space.contactEmail && (
            <Row icon={Mail}>
              <a href={`mailto:${space.contactEmail}`} {...linkProps} className="font-semibold hover:underline break-all">
                {space.contactEmail}
              </a>
            </Row>
          )}
          {space.contactPhone && (
            <Row icon={Phone}>
              <a href={`tel:${space.contactPhone}`} {...linkProps} className="font-semibold hover:underline">
                {space.contactPhone}
              </a>
            </Row>
          )}
        </div>
      )}

      {hours && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={15} className="text-muted-foreground" />
            <span className="text-sm font-extrabold">Hours</span>
          </div>
          <dl className="space-y-1">
            {WEEK_DAYS.map((day) => {
              const entry = hours[day.id];
              if (!entry) return null;
              return (
                <div key={day.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <dt className="text-muted-foreground font-semibold">{compact ? day.short : day.label}</dt>
                  <dd className={entry.closed ? 'text-muted-foreground' : 'font-bold'}>
                    {entry.closed ? 'Closed' : `${formatHourLabel(entry.open)} – ${formatHourLabel(entry.close)}`}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {links.map((link) => {
            const Icon = spaceLinkIcon(link.platform);
            return (
              <a
                key={link.id}
                href={link.url}
                {...linkProps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors max-w-full"
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{link.label || link.platform}</span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
