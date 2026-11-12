/**
 * The QR code and share card for a WevSpace (MP3 §13).
 *
 * Deliberately *not* another link-sharing dialog: `ShareModal` already does copy
 * links, native share and the social targets, and `shareSpace()` is the one-tap
 * path from the header. What was missing is the two printable artifacts, so this
 * sheet is only those — with the URL and a copy button for context, and a way
 * back out to ordinary sharing so it never dead-ends.
 *
 * Both images are built on demand, one tab at a time: opening the sheet costs
 * nothing until a tab asks for a picture (§28). Each finished PNG is kept for as
 * long as the sheet is open, so switching tabs or themes back and forth does not
 * redraw anything already drawn.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Loader2,
  Printer,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { copySpaceLink, shareSpace, spaceShareUrl } from './shareSpace';
import {
  buildSpaceCardPng,
  buildSpaceQrPng,
  downloadImage,
  printImage,
  shareFileName,
  shareImageFile,
  shareSubjectAccent,
  type ShareCardTheme,
  type SpaceShareSubject,
} from './spaceShareCard';

type Tab = 'qr' | 'card';

interface Props {
  space: SpaceShareSubject;
  /** Which artifact to show first — the manage panel opens straight on the card. */
  initialTab?: Tab;
  onClose: () => void;
}

const THEME_LABELS: Record<ShareCardTheme, string> = { dark: 'Dark', light: 'Light' };

export default function SpaceShareSheet({ space, initialTab = 'qr', onClose }: Props) {
  const url = spaceShareUrl(space.handle);
  const accent = shareSubjectAccent(space);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [theme, setTheme] = useState<ShareCardTheme>('dark');
  const [copied, setCopied] = useState(false);

  const [qr, setQr] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  const [cards, setCards] = useState<Partial<Record<ShareCardTheme, string>>>({});
  const [cardBusy, setCardBusy] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // Refs, not state, so the build effects can guard against re-entry without
  // listing the results in their own dependencies.
  const qrRef = useRef<string | null>(null);
  const cardsRef = useRef<Partial<Record<ShareCardTheme, string>>>({});
  const buildingRef = useRef<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const buildQr = useCallback(async () => {
    if (qrRef.current || buildingRef.current === 'qr') return;
    buildingRef.current = 'qr';
    setQrBusy(true);
    setQrError(null);
    try {
      const png = await buildSpaceQrPng(url, { width: 1024, margin: 2 });
      qrRef.current = png;
      setQr(png);
    } catch (err: any) {
      setQrError(err?.message || 'Could not build the QR code.');
    } finally {
      buildingRef.current = null;
      setQrBusy(false);
    }
  }, [url]);

  const buildCard = useCallback(
    async (which: ShareCardTheme) => {
      if (cardsRef.current[which] || buildingRef.current === `card:${which}`) return;
      buildingRef.current = `card:${which}`;
      setCardBusy(true);
      setCardError(null);
      try {
        const png = await buildSpaceCardPng(space, which, url);
        cardsRef.current = { ...cardsRef.current, [which]: png };
        setCards(cardsRef.current);
      } catch (err: any) {
        setCardError(err?.message || 'Could not build the card image.');
      } finally {
        buildingRef.current = null;
        setCardBusy(false);
      }
    },
    [space, url],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (tab === 'qr') void buildQr();
    else void buildCard(theme);
  }, [tab, theme, buildQr, buildCard]);

  const copy = async () => {
    await copySpaceLink(space.handle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const current = tab === 'qr' ? qr : cards[theme] || null;
  const busy = tab === 'qr' ? qrBusy : cardBusy;
  const failure = tab === 'qr' ? qrError : cardError;
  const kind: 'qr' | 'card' = tab === 'qr' ? 'qr' : 'card';

  const retry = () => {
    if (tab === 'qr') {
      setQrError(null);
      void buildQr();
    } else {
      setCardError(null);
      void buildCard(theme);
    }
  };

  const save = () => {
    if (!current) return;
    downloadImage(current, shareFileName(space.handle, kind));
    toast.success(kind === 'qr' ? 'QR code saved' : 'Card saved');
  };

  const print = () => {
    if (!current) return;
    try {
      printImage(current, `${space.name} — @${space.handle}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not open the print view.');
    }
  };

  /** Shares the picture itself where the OS allows it, saves it where it does not. */
  const sendImage = async () => {
    if (!current) return;
    const shared = await shareImageFile(current, shareFileName(space.handle, kind), {
      title: space.name,
      text: `${space.name} on Wevsoft · ${url}`,
    });
    if (shared) return;
    downloadImage(current, shareFileName(space.handle, kind));
    toast('Saved to your device — this browser cannot share image files.', { duration: 5000 });
  };

  const tabButton = (id: Tab, label: string, Icon: typeof QrCode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold transition-colors ${
        tab === id ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
      style={tab === id ? { color: accent } : undefined}
    >
      <Icon size={14} /> {label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${space.name}`}
        onClick={(event) => event.stopPropagation()}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-black truncate">Share {space.name}</h2>
            <p className="text-[11px] font-extrabold text-muted-foreground">
              A code to scan and a card to post or print.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-xl bg-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* The link, for the many cases where a person just wants to paste it. */}
        <div className="mt-3 flex items-center gap-2 p-2 pl-3 rounded-2xl bg-muted">
          <span className="min-w-0 flex-1 text-xs font-bold truncate" title={url}>
            {url.replace(/^https?:\/\//i, '')}
          </span>
          <button
            type="button"
            onClick={() => void copy()}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-card border border-border text-[11px] font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1 p-1 rounded-2xl bg-muted">
          {tabButton('qr', 'QR code', QrCode)}
          {tabButton('card', 'Share card', Sparkles)}
        </div>

        {tab === 'card' && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
              Style
            </span>
            {(['dark', 'light'] as ShareCardTheme[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                aria-pressed={theme === option}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border transition-colors ${
                  theme === option
                    ? 'border-transparent text-white'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                style={theme === option ? { background: accent } : undefined}
              >
                {THEME_LABELS[option]}
              </button>
            ))}
            <span className="ml-auto text-[10px] font-bold text-muted-foreground">Light prints best</span>
          </div>
        )}

        {/* Preview. The QR sits on white whatever the app theme is, or it will
            not scan on a dark screen. */}
        <div
          className={`mt-3 grid place-items-center rounded-3xl border border-border overflow-hidden ${
            tab === 'qr' ? 'bg-white p-4' : 'bg-muted'
          }`}
          style={{ minHeight: 220 }}
        >
          {busy && !current && <Loader2 size={22} className="animate-spin text-muted-foreground" />}

          {!busy && failure && !current && (
            <div className="p-6 text-center">
              <p className="text-xs font-bold text-muted-foreground">{failure}</p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card border border-border text-[11px] font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          )}

          {current && (
            <img
              src={current}
              alt={
                tab === 'qr'
                  ? `QR code linking to ${url}`
                  : `Share card for ${space.name}, @${space.handle}`
              }
              className={tab === 'qr' ? 'w-full max-w-[240px] h-auto' : 'w-full h-auto'}
            />
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!current}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: accent }}
          >
            <Download size={14} /> Save
          </button>
          <button
            type="button"
            onClick={() => void sendImage()}
            disabled={!current}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <Share2 size={14} /> Send
          </button>
          <button
            type="button"
            onClick={print}
            disabled={!current}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl bg-muted text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <Printer size={14} /> Print
          </button>
        </div>

        <button
          type="button"
          onClick={() => void shareSpace(space)}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl border border-border text-xs font-extrabold text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 size={13} /> Share the link instead
        </button>
      </div>
    </div>
  );
}
