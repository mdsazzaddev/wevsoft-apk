import React from 'react';
import { Cloud, Mail, MessageCircle, Phone, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { platformIcon } from './platformIcons';
import {
  AVAILABILITY_LABEL,
  PLATFORMS,
  canUseDeviceShare,
  copyToClipboard,
  platformAvailability,
  platformShareUrl,
  pushRecentDestination,
  shareWithDevice,
  type SharePlatform,
} from '../../lib/share/shareUtils';

/** True when the OS/browser can show installed apps via Web Share API. */
export function canUseSystemShare(): boolean {
  return canUseDeviceShare();
}

/** Opens the device share sheet. Kept for existing callers (ShareStudio). */
export async function shareViaSystem(url: string, title: string): Promise<'shared' | 'cancelled' | 'unsupported' | 'failed'> {
  return shareWithDevice({ title, text: title, url });
}

/** Brand colours per platform (icon chip). Unknown keys use the muted chip. */
const BRAND: Record<string, { color: string; bg: string }> = {
  fb: { color: 'text-[#1877F2]', bg: 'bg-[#1877F2]/10' },
  ig: { color: 'text-[#E4405F]', bg: 'bg-[#E4405F]/10' },
  tt: { color: 'text-foreground', bg: 'bg-foreground/10' },
  tg: { color: 'text-[#26A5E4]', bg: 'bg-[#26A5E4]/10' },
  wa: { color: 'text-[#25D366]', bg: 'bg-[#25D366]/15' },
  msg: { color: 'text-[#0084FF]', bg: 'bg-[#0084FF]/10' },
  messenger: { color: 'text-[#0084FF]', bg: 'bg-[#0084FF]/10' },
  x: { color: 'text-foreground', bg: 'bg-foreground/10' },
  yt: { color: 'text-[#FF0000]', bg: 'bg-[#FF0000]/10' },
  snap: { color: 'text-neutral-900', bg: 'bg-[#FFFC00]' },
  threads: { color: 'text-foreground', bg: 'bg-foreground/10' },
  pin: { color: 'text-[#E60023]', bg: 'bg-[#E60023]/10' },
  in: { color: 'text-[#0A66C2]', bg: 'bg-[#0A66C2]/10' },
  rd: { color: 'text-[#FF4500]', bg: 'bg-[#FF4500]/10' },
  dc: { color: 'text-[#5865F2]', bg: 'bg-[#5865F2]/10' },
  email: { color: 'text-foreground', bg: 'bg-muted' },
  gmail: { color: 'text-[#EA4335]', bg: 'bg-[#EA4335]/10' },
  bsky: { color: 'text-[#1185FE]', bg: 'bg-[#1185FE]/10' },
  viber: { color: 'text-[#7360F2]', bg: 'bg-[#7360F2]/10' },
};

/** Legacy export: same platform list with brand colours. */
export const SHARE_PLATFORMS = PLATFORMS.map((p) => ({ key: p.key, label: p.label, ...(BRAND[p.key] || { color: 'text-foreground', bg: 'bg-muted' }), native: p.mode === 'device' }));

export function platformIconFor(key: string): React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> {
  switch (key) {
    case 'messenger':
      return MessageCircle;
    case 'email':
    case 'gmail':
      return Mail;
    case 'bsky':
      return Cloud;
    case 'viber':
      return Phone;
    default:
      return platformIcon(key) as any;
  }
}

/** Compact default row (rest live under More). */
const COMPACT_KEYS = ['fb', 'wa', 'tg', 'x', 'messenger'] as const;

/**
 * Runs one platform: documented web URL → new tab; device-only app → OS share
 * sheet (success only when the sheet resolves); unsupported here → copy the link
 * and say so. Returns what actually happened.
 */
export async function sharePlatform(p: SharePlatform, url: string, title: string, onInternal?: () => void): Promise<'opened' | 'shared' | 'cancelled' | 'copied' | 'failed'> {
  pushRecentDestination(p.key);
  if (p.mode === 'internal') {
    if (onInternal) {
      onInternal();
      return 'opened';
    }
  }
  const href = platformShareUrl(p.key, url, title);
  if (href) {
    if (href.startsWith('mailto:')) window.location.href = href;
    else window.open(href, '_blank', 'noopener,noreferrer');
    return 'opened';
  }
  const res = await shareWithDevice({ title, text: title, url });
  if (res === 'shared') return 'shared';
  if (res === 'cancelled') return 'cancelled';
  if (res === 'unsupported') {
    const copied = await copyToClipboard(url);
    if (copied) toast(`${p.label} sharing isn't supported in this browser — link copied, paste it in ${p.label}.`);
    else toast.error(`${p.label} sharing isn't supported here`);
    return copied ? 'copied' : 'failed';
  }
  toast.error('Could not open the share sheet');
  return 'failed';
}

export default function SharePlatformGrid({
  url,
  title,
  onMoreClick,
  isMobile: _isMobile,
  showAll = false,
  inline = false,
  onInternal,
}: {
  url: string;
  title: string;
  onMoreClick?: () => void;
  isMobile: boolean;
  showAll?: boolean;
  /** When true, render buttons only (no wrapping flex) for embedding in another row. */
  inline?: boolean;
  /** WevChat entry: handled inside the modal instead of navigating away. */
  onInternal?: () => void;
}) {
  const deviceShare = canUseDeviceShare();
  const platformsToShow = showAll ? PLATFORMS : PLATFORMS.filter((p) => (COMPACT_KEYS as readonly string[]).includes(p.key));

  const chipBtn =
    'flex flex-col items-center gap-1 shrink-0 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const chipW = showAll ? '' : 'w-[56px] md:w-[60px]';

  const items = (
    <>
      {showAll && deviceShare && (
        <button type="button" role="listitem" onClick={() => void shareWithDevice({ title, text: title, url })} className={`${chipBtn} ${chipW}`} aria-label="Share with your device">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-transform group-active:scale-95 bg-primary/15 text-primary">
            <Share2 size={20} strokeWidth={2.1} />
          </div>
          <span className="text-[10px] md:text-[11px] font-semibold truncate w-full text-center leading-tight">Your device</span>
        </button>
      )}
      {platformsToShow.map((p) => {
        const Icon = platformIconFor(p.key);
        const brand = BRAND[p.key] || { color: 'text-foreground', bg: 'bg-muted' };
        const availability = platformAvailability(p, deviceShare);
        return (
          <button
            key={p.key}
            type="button"
            role="listitem"
            onClick={() => void sharePlatform(p, url, title, onInternal)}
            className={`${chipBtn} ${chipW}`}
            aria-label={`Share to ${p.label} (${AVAILABILITY_LABEL[availability]})`}
            title={AVAILABILITY_LABEL[availability]}
          >
            <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-transform group-active:scale-95 ${brand.bg} ${brand.color} ${availability === 'unsupported' ? 'opacity-60' : ''}`}>
              <Icon size={20} strokeWidth={2.1} />
            </div>
            <span className="text-[10px] md:text-[11px] font-semibold truncate w-full text-center leading-tight">{p.label}</span>
          </button>
        );
      })}
      {!showAll && onMoreClick && (
        <button type="button" role="listitem" onClick={onMoreClick} className={`${chipBtn} w-[56px] md:w-[60px]`} aria-label="More share options">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors bg-muted text-foreground group-hover:bg-muted/80">
            <div className="flex gap-0.5" aria-hidden>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
            </div>
          </div>
          <span className="text-[10px] md:text-[11px] font-semibold truncate w-full text-center">More</span>
        </button>
      )}
    </>
  );

  if (inline && !showAll) return items;
  return (
    <div className={showAll ? 'grid grid-cols-4 sm:grid-cols-5 gap-y-4 gap-x-2 px-0.5' : 'flex gap-3 overflow-x-auto no-scrollbar pb-0.5 px-0.5'} role="list" aria-label="Share destinations">
      {items}
    </div>
  );
}
