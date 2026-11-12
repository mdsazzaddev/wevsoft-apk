import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Check,
  Copy,
  Link as LinkIcon,
  Share2,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useOverlayBack } from '../../hooks/useOverlayBack';
import SharePlatformGrid, { canUseSystemShare, shareViaSystem } from '../share/SharePlatformGrid';

/**
 * Premium Share panel aligned with Create Post studio chrome.
 */
export default function ShareStudio({
  open,
  onClose,
  url,
  title = 'Share',
  mode = 'overlay',
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  mode?: 'overlay' | 'page';
}) {
  useOverlayBack(open && mode === 'overlay', onClose);
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : true),
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  const fullUrl = useMemo(
    () => (url.startsWith('http') ? url : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`),
    [url],
  );

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const body = (
    <div
      className={
        mode === 'page'
          ? 'flex h-full min-h-0 w-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-lg'
          : 'relative z-[1] flex h-full w-full max-w-lg flex-col overflow-hidden rounded-none border-0 bg-card shadow-2xl md:h-auto md:max-h-[min(88dvh,720px)] md:rounded-3xl md:border md:border-border'
      }
      role="dialog"
      aria-modal={mode === 'overlay' ? true : undefined}
      aria-label="Share"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-border/60 px-4 py-3.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
          <Share2 size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[16px] font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-[11px] text-muted-foreground">Send anywhere — WevChat, feed, or other apps</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          {mode === 'page' ? <ArrowLeft size={18} /> : <X size={18} />}
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <LinkIcon size={14} /> Link preview
          </div>
          <p className="break-all text-sm leading-snug text-foreground">{fullUrl}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div>
          <h2 className="mb-3 text-[13px] font-bold text-foreground">Share to platforms</h2>
          <SharePlatformGrid url={fullUrl} title={title} isMobile={isMobile} showAll />
        </div>

        {canUseSystemShare() ? (
          <button
            type="button"
            onClick={() => void shareViaSystem(fullUrl, title)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-muted py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted/80"
          >
            <Share2 size={16} /> System share sheet
          </button>
        ) : null}
      </div>
    </div>
  );

  if (mode === 'page') return body;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] flex items-stretch justify-center md:items-center md:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        type="button"
        aria-label="Close share"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm dark:bg-black/65"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative z-[1] flex h-full w-full justify-center md:h-auto"
      >
        {body}
      </motion.div>
    </motion.div>,
    document.body,
  );
}