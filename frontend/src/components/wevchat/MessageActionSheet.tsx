import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  CornerUpLeft, Copy, Forward, Edit3, Star, Pin, Trash2, Flag, CheckSquare,
  Share2, Smile, MoreHorizontal, Link2, Download, X, AlertTriangle, Languages,
} from 'lucide-react';
import { useOverlayBack } from '../../hooks/useOverlayBack';

export const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡'] as const;

export type MessageActionId =
  | 'reply' | 'react' | 'copy' | 'copyLink' | 'forward' | 'edit' | 'star' | 'pin'
  | 'deleteMe' | 'deleteEveryone' | 'select' | 'share' | 'report' | 'download' | 'more' | 'translate';

export interface MessageActionSheetProps {
  open: boolean;
  onClose: () => void;
  /** Desktop context menu: use fixed coords. Mobile: bottom sheet. */
  mode: 'sheet' | 'menu';
  anchor?: { x: number; y: number } | null;
  isMine: boolean;
  isDeleted: boolean;
  isStarred: boolean;
  isPinned: boolean;
  hasText: boolean;
  hasLink: boolean;
  hasMedia: boolean;
  sentAt?: string;
  onAction: (id: MessageActionId) => void;
  onReact: (emoji: string) => void;
  myReaction?: string | null;
}

function haptic() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
  } catch { /* ignore */ }
}

export function MessageActionSheet({
  open,
  onClose,
  mode,
  anchor,
  isMine,
  isDeleted,
  isStarred,
  isPinned,
  hasText,
  hasLink,
  hasMedia,
  sentAt,
  onAction,
  onReact,
  myReaction,
}: MessageActionSheetProps) {
  useOverlayBack(open, onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (open) {
      haptic();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setShowMore(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open || mode !== 'menu' || !anchor || !panelRef.current) return;
    const el = panelRef.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const pad = 8;
    let left = anchor.x;
    let top = anchor.y;
    if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad;
    if (left < pad) left = pad;
    if (top + h > window.innerHeight - pad) top = Math.max(pad, anchor.y - h);
    if (top < pad) top = pad;
    setPos({ top, left });
  }, [open, mode, anchor]);

  const run = (id: MessageActionId) => {
    onAction(id);
    if (id !== 'react' && id !== 'more') onClose();
  };

  const primary: { id: MessageActionId; label: string; icon: React.ReactNode; danger?: boolean }[] = [];
  if (!isDeleted) {
    primary.push({ id: 'reply', label: 'Reply', icon: <CornerUpLeft size={16} /> });
    if (hasText) primary.push({ id: 'copy', label: 'Copy', icon: <Copy size={16} /> });
    if (hasText) primary.push({ id: 'translate', label: 'Translate', icon: <Languages size={16} /> });
    if (hasLink) primary.push({ id: 'copyLink', label: 'Copy link', icon: <Link2 size={16} /> });
    primary.push({ id: 'forward', label: 'Forward', icon: <Forward size={16} /> });
    primary.push({ id: 'share', label: 'Share', icon: <Share2 size={16} /> });
    if (isMine && hasText) primary.push({ id: 'edit', label: 'Edit', icon: <Edit3 size={16} /> });
    primary.push({ id: 'star', label: isStarred ? 'Unstar' : 'Star / Save', icon: <Star size={16} className={isStarred ? 'fill-amber-400 text-amber-400' : undefined} /> });
    primary.push({ id: 'pin', label: isPinned ? 'Unpin' : 'Pin', icon: <Pin size={16} /> });
    if (hasMedia) primary.push({ id: 'download', label: 'Save / Download', icon: <Download size={16} /> });
  }
  primary.push({ id: 'select', label: 'Select', icon: <CheckSquare size={16} /> });
  primary.push({ id: 'deleteMe', label: 'Delete for me', icon: <Trash2 size={16} />, danger: true });
  if (isMine && !isDeleted) primary.push({ id: 'deleteEveryone', label: 'Delete for everyone', icon: <Trash2 size={16} />, danger: true });
  if (!isMine && !isDeleted) primary.push({ id: 'report', label: 'Report', icon: <Flag size={16} />, danger: true });

  const visible = showMore ? primary : primary.slice(0, 8);
  const hasExtra = primary.length > 8;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close message menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[90] ${mode === 'sheet' ? 'bg-black/45' : 'bg-transparent'}`}
            onClick={onClose}
          />
          {mode === 'sheet' ? (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Message actions"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-[91] max-h-[min(78dvh,100%)] overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top,0px)]"
            >
              <div className="flex justify-center pt-2.5 pb-1">
                <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              {sentAt && (
                <p className="px-4 pb-2 text-center text-[11px] font-semibold text-muted-foreground">Sent {sentAt}</p>
              )}
              {!isDeleted && (
                <div className="flex items-center justify-center gap-1.5 px-4 py-2">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onReact(emoji); onClose(); }}
                      className={`text-2xl p-2 rounded-2xl transition-transform active:scale-90 hover:bg-black/5 dark:hover:bg-white/5 ${myReaction === emoji ? 'bg-primary/15 ring-1 ring-primary/40 scale-110' : ''}`}
                      aria-label={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => run('react')}
                    className="p-2.5 rounded-2xl text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="More reactions"
                    title="More"
                  >
                    <Smile size={20} />
                  </button>
                </div>
              )}
              <div className="px-2 pb-2 space-y-0.5">
                {visible.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => run(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${item.danger ? 'text-red-500' : 'text-foreground'}`}
                  >
                    <span className="w-5 flex justify-center opacity-80">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
                {hasExtra && !showMore && (
                  <button
                    type="button"
                    onClick={() => setShowMore(true)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <MoreHorizontal size={16} /> More
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              ref={panelRef}
              role="menu"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[91] w-56 overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl"
            >
              {!isDeleted && (
                <div className="flex items-center justify-between gap-0.5 px-2 py-1.5 border-b border-border">
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { onReact(emoji); onClose(); }}
                      className={`text-lg p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 ${myReaction === emoji ? 'bg-primary/15' : ''}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
              {sentAt && (
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground border-b border-border">
                  Sent {sentAt}
                </div>
              )}
              <div className="p-1.5 max-h-[60vh] overflow-y-auto">
                {visible.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => run(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${item.danger ? 'text-red-500' : 'text-foreground'}`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
                {hasExtra && !showMore && (
                  <button
                    type="button"
                    onClick={() => setShowMore(true)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <MoreHorizontal size={14} /> More
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function MessageReportModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description?: string) => void;
}) {
  useOverlayBack(open, onClose);
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');
  const reasons = [
    { id: 'spam', label: 'Spam' },
    { id: 'scam', label: 'Scam / Fraud' },
    { id: 'harassment', label: 'Harassment' },
    { id: 'hate', label: 'Hate / Abuse' },
    { id: 'sexual', label: 'Sexual content' },
    { id: 'violence', label: 'Violence' },
    { id: 'dangerous', label: 'Dangerous content' },
    { id: 'other', label: 'Other' },
  ];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.button type="button" aria-label="Close" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[95] bg-black/50" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Report message"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="fixed left-1/2 top-1/2 z-[96] w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-sm font-extrabold">Report message</h3>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-1.5 mb-3">
              {reasons.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setReason(r.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                    reason === r.id ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
              rows={3}
              className="w-full rounded-xl border border-border bg-black/5 dark:bg-white/5 px-3 py-2 text-xs outline-none focus:border-primary/50 mb-3 resize-none"
            />
            <button
              type="button"
              onClick={() => onSubmit(reason, description.trim() || undefined)}
              className="w-full py-2.5 rounded-xl bg-red-500 text-white text-xs font-extrabold hover:bg-red-600 transition-colors"
            >
              Submit report
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Detect URLs / emails / phones in plain text and render clickable spans. */
export function RichMessageText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: React.ReactNode[] = [];
  const re = /(https?:\/\/[^\s<]+)|(www\.[^\s<]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(\+?\d[\d\s().-]{7,}\d)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [full, http, www, email, phone] = match;
    if (http || www) {
      const href = http || `https://${www}`;
      parts.push(
        <a key={i++} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 break-all hover:opacity-90" onClick={(e) => e.stopPropagation()}>
          {full}
        </a>,
      );
    } else if (email) {
      parts.push(
        <a key={i++} href={`mailto:${email}`} className="underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
          {email}
        </a>,
      );
    } else if (phone) {
      const digits = phone.replace(/[^\d+]/g, '');
      parts.push(
        <a key={i++} href={`tel:${digits}`} className="underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
          {phone}
        </a>,
      );
    }
    last = match.index + full.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={`whitespace-pre-wrap break-words ${className || ''}`}>{parts.length ? parts : text}</span>;
}

export function extractFirstUrl(text?: string | null): string | null {
  if (!text) return null;
  const m = text.match(/https?:\/\/[^\s<]+|www\.[^\s<]+/);
  if (!m) return null;
  return m[0].startsWith('http') ? m[0] : `https://${m[0]}`;
}
