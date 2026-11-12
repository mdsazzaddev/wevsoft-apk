import { useTranslation } from 'react-i18next';
import { trLabel } from '../settings/languagePickerShared';
import React, { useEffect, useRef, useState } from 'react';
import { Ellipsis, Heart, MessageCircle, Send, Bookmark } from 'lucide-react';
import { AD_CTAS } from '@wevsoft/shared/wevspace';
import { resolveAvatarUrl } from '../UserAvatar';
import { authHeaders } from '../../lib/wevspaceApi';

function ctaLabel(cta: string) {
  return AD_CTAS.find((item) => item.id === cta)?.label || 'Learn more';
}

function newEventId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

async function postEvent(body: Record<string, unknown>) {
  const res = await fetch('/api/ads/events', {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

export default function SponsoredAdCard({
  ad,
}: { ad: any }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const impressed = useRef(false);
  const [menu, setMenu] = useState(false);
  const [why, setWhy] = useState<string | null>(null);
  const accent = 'var(--primary)';
  const avatar = resolveAvatarUrl(ad?.space?.avatar);
  const media = ad?.creative?.mediaUrls?.[0] || ad?.creative?.thumbnailUrl;

  useEffect(() => {
    const el = ref.current;
    if (!el || impressed.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.5) return;
        window.setTimeout(() => {
          if (impressed.current) return;
          impressed.current = true;
          void postEvent({
            kind: 'impression',
            eventId: newEventId(),
            adId: ad.adId,
            campaignId: ad.campaignId,
            placement: ad.placement || 'FEED',
          });
        }, 1000);
      },
      { threshold: [0.5] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ad]);

  async function onCta() {
    const result = await postEvent({
      kind: 'click',
      eventId: newEventId(),
      adId: ad.adId,
      campaignId: ad.campaignId,
      placement: ad.placement || 'FEED',
    });
    const url = result?.redirectUrl || ad?.space?.path;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function prefer(action: 'HIDE' | 'NOT_RELEVANT') {
    await fetch('/api/ads/preferences', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ adId: ad.adId, action }),
    });
    setMenu(false);
    elHide();
  }

  function elHide() {
    if (ref.current) ref.current.style.display = 'none';
  }

  async function report() {
    const reason = window.prompt('Reason: MISLEADING, SPAM, SCAM, OFFENSIVE, IRRELEVANT, UNSAFE, OTHER', 'IRRELEVANT');
    if (!reason) return;
    await fetch('/api/ads/reports', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ adId: ad.adId, reason: reason.toUpperCase() }),
    });
    setMenu(false);
    elHide();
  }

  async function loadWhy() {
    const res = await fetch(`/api/ads/why?adId=${encodeURIComponent(ad.adId)}`, { headers: authHeaders() });
    const body = await res.json().catch(() => ({}));
    setWhy(body.explanation || 'This is a sponsored placement.');
    setMenu(false);
  }

  return (
    <div ref={ref} className="rounded-3xl border border-border bg-card overflow-hidden text-left relative">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <span className="w-9 h-9 rounded-full overflow-hidden bg-muted shrink-0">
          {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold truncate">{ad?.space?.name || trLabel(t, 'Sponsored', 'Sponsored')}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{trLabel(t, 'Sponsored', 'Sponsored')}</p>
        </div>
        <button type="button" className="p-2 rounded-full hover:bg-muted" onClick={() => setMenu((v) => !v)} aria-label="Ad options">
          <Ellipsis size={18} />
        </button>
      </div>
      {menu && (
        <div className="absolute right-3 top-12 z-10 w-52 rounded-2xl border border-border bg-card shadow-lg p-1 text-sm font-semibold">
          <button type="button" className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted" onClick={() => void prefer('HIDE')}>
            Hide ad
          </button>
          <button type="button" className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted" onClick={() => void prefer('NOT_RELEVANT')}>
            Not relevant
          </button>
          <button type="button" className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted" onClick={() => void report()}>
            Report ad
          </button>
          <button type="button" className="w-full text-left px-3 py-2 rounded-xl hover:bg-muted" onClick={() => void loadWhy()}>
            Why am I seeing this ad?
          </button>
        </div>
      )}
      {why && <p className="px-3 pb-2 text-xs text-muted-foreground">{why}</p>}
      {ad?.creative?.primaryText && <p className="px-3 pb-2 text-sm whitespace-pre-wrap">{ad.creative.primaryText}</p>}
      <div className="bg-muted aspect-[4/5] max-h-72 overflow-hidden">
        {media ? <img src={media} alt="" className="w-full h-full object-cover" /> : null}
      </div>
      <button type="button" className="w-full py-2.5 text-sm font-extrabold text-primary-foreground" style={{ background: accent }} onClick={() => void onCta()}>
        {ctaLabel(ad?.creative?.cta || 'LEARN_MORE')}
      </button>
      <div className="flex items-center gap-4 px-3 py-2.5 text-muted-foreground">
        <Heart size={18} />
        <MessageCircle size={18} />
        <Send size={18} />
        <Bookmark size={18} className="ml-auto" />
      </div>
    </div>
  );
}
