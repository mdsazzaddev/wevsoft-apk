import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Zap, Pin, Star, MoreHorizontal, Download, CheckCheck, Check, Clock, Smile,
  AlertTriangle, RotateCw, Sparkles, Calendar, BarChart2, Lock, Play, Pause, MapPin, Forward,
} from 'lucide-react';
import toast from 'react-hot-toast';
import UserAvatar from '../UserAvatar';
import { AITextTools } from '../ai/AITextTools';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import {
  MessageActionSheet,
  RichMessageText,
  extractFirstUrl,
  QUICK_REACTIONS,
  type MessageActionId,
} from './MessageActionSheet';
import { AuthenticatedMedia, useAuthenticatedSrc } from './AuthenticatedMedia';

const LONG_PRESS_MS = 420;

function safeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function isStoryReply(m: MessageData): boolean {
  return m.mediaType === 'story_reply' || (!!m.fileName && m.fileName.startsWith('story:'));
}

function isPollMessage(m: MessageData): boolean {
  return m.mediaType === 'poll' || (!!m.fileName && m.fileName.startsWith('poll:'));
}

function isEventMessage(m: MessageData): boolean {
  return m.mediaType === 'event' || (!!m.fileName && m.fileName.startsWith('event:'));
}

function isLocationMessage(m: MessageData): boolean {
  return m.mediaType === 'location' || (!!m.fileName && m.fileName.startsWith('location:'));
}

function parseLocation(m: MessageData): { lat: number; lng: number; mapsUrl: string } | null {
  const fromName = m.fileName?.match(/^location:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const lat = fromName ? Number(fromName[1]) : NaN;
  const lng = fromName ? Number(fromName[2]) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, mapsUrl: m.fileUrl || `https://www.google.com/maps?q=${lat},${lng}` };
}

const WAVEFORM_BARS = [8, 14, 20, 12, 24, 16, 28, 18, 10, 22, 30, 16, 12, 26, 18, 10, 22, 14, 28, 18, 12, 24, 16, 9];


const TranscribeVoice: React.FC<{ messageId: string, initialTranscript?: string }> = ({ messageId, initialTranscript }) => {
  const [transcript, setTranscript] = useState(initialTranscript || '');
  const [loading, setLoading] = useState(false);
  const handleTranscribe = async () => {
    setLoading(true);
    try {
      const { wevchatApi, authHeaders } = await import('../../lib/wevchatApi');
      const res = await fetch(`/api/wevchat/messages/${messageId}/transcribe`, {
        method: 'POST',
        headers: authHeaders()
      }).then(r => r.json());
      if (res.transcript) setTranscript(res.transcript);
      else toast.error(res.error || 'Failed to transcribe');
    } catch (e) {
      toast.error('Failed to transcribe');
    } finally {
      setLoading(false);
    }
  };
  if (transcript) {
    return <div className="mt-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg text-xs italic opacity-90"><span className="font-semibold block mb-1">Transcript:</span>{transcript}</div>;
  }
  return <button onClick={handleTranscribe} disabled={loading} className="text-[10px] mt-1 font-bold underline opacity-70 hover:opacity-100">{loading ? 'Transcribing...' : 'Aa Transcribe'}</button>;
};

const VoicePlayback: React.FC<{ src: string; isMine: boolean }> = ({ src, isMine }) => {
  const { resolved: authSrc, loading: authLoading } = useAuthenticatedSrc(src);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setRate(1);
  }, [authSrc]);

  if (authLoading || !authSrc) {
    return (
      <div className={`mb-1.5 rounded-xl px-3 py-2 text-[10px] ${isMine ? 'bg-white/10 text-white/70' : 'bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
        {authLoading ? 'Loading voice…' : 'Voice unavailable'}
      </div>
    );
  }

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const changeRate = () => {
    const next = rate >= 2 ? 1 : rate + 0.5;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  };

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  return (
    <div className={`mb-1.5 flex items-center gap-2 rounded-xl px-2.5 py-2 w-full min-w-0 max-w-full sm:max-w-[min(280px,100%)] ${isMine ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5'}`}>
      <audio
        ref={audioRef}
        src={authSrc}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onEnded={() => { setPlaying(false); setCurrent(0); }}
      />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause voice note' : 'Play voice note'} className={`shrink-0 rounded-full p-2 ${isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/15 hover:bg-primary/25 text-primary'}`}>
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative h-8 flex items-center gap-0.5 overflow-hidden" aria-hidden="true">
          {WAVEFORM_BARS.map((height, index) => (
            <span key={index} className={`w-1 rounded-full transition-colors ${index / WAVEFORM_BARS.length * 100 < progress ? (isMine ? 'bg-white' : 'bg-primary') : (isMine ? 'bg-white/35' : 'bg-muted-foreground/40')}`} style={{ height }} />
          ))}
          <input type="range" min="0" max={duration || 0} step="0.01" value={Math.min(current, duration || 0)} onChange={(event) => { const value = Number(event.target.value); setCurrent(value); if (audioRef.current) audioRef.current.currentTime = value; }} disabled={!duration} aria-label="Voice note progress" className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default" />
        </div>
        <div className={`flex items-center justify-between text-[9px] ${isMine ? 'text-white/65' : 'text-muted-foreground'}`}>
          <span>{formatTime(current || duration)}</span>
          <button type="button" onClick={changeRate} className="font-extrabold hover:text-foreground" aria-label={`Playback speed ${rate}x`}>{rate}x</button>
        </div>
      </div>
    </div>
  );
};

export interface MessageData {
  id: string;
  text?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  mediaType?: string | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  isAiGenerated?: boolean;
  /** Sent by Space inbox automations (instant/away/keyword/FAQ). */
  isAutomated?: boolean;
  /** sending | sent | delivered | read | failed (client-augmented) */
  status?: string;
  createdAt: string;
  senderId: string;
  sender?: { id: string; name: string; avatar?: string };
  replyTo?: MessageData | null;
  forwardId?: string | null;
  reactions?: { userId: string; emoji: string; user?: { id: string; name?: string } }[];
  starredBy?: { userId: string }[];
  read?: boolean;
  delivered?: boolean;
  /** Present only on optimistic messages awaiting server ack. */
  clientId?: string;
  /** Original send payload, retained so a failed send can be retried verbatim. */
  sendPayload?: Record<string, unknown>;
  poll?: {
    id: string;
    question: string;
    totalVotes: number;
    userVotes: string[];
    options: { id: string; text: string; voteCount: number; percentage: number }[];
  } | null;
  isEncrypted?: boolean;
  privateSessionId?: string | null;
  expiresAt?: string | null;
  readAt?: string | null;
}

interface MessageBubbleProps {
  message: MessageData;
  isMine: boolean;
  isGroup: boolean;
  currentUserId: string;
  peerId?: string;
  showAvatar?: boolean;
  /** First message in a consecutive same-sender run — gets the name/full top spacing. */
  isGroupStart?: boolean;
  /** Last message in a consecutive same-sender run — gets the tail corner + timestamp/status. */
  isGroupEnd?: boolean;
  /** Briefly highlighted after a jump-to-message navigation. */
  highlighted?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (m: MessageData) => void;
  onEnterSelection?: (m: MessageData) => void;
  onReply: (m: MessageData) => void;
  onEdit: (m: MessageData) => void;
  onDelete: (m: MessageData) => void;
  onDeleteForMe: (m: MessageData) => void;
  onForward: (m: MessageData) => void;
  onPin: (m: MessageData) => void;
  onStar: (m: MessageData) => void;
  onReact: (m: MessageData, emoji: string) => void;
  onReport: (m: MessageData) => void;
  onShare?: (m: MessageData) => void;
  /** Retry a failed optimistic send. */
  onRetry?: (m: MessageData) => void;
  /** Jump to and highlight a replied-to message. */
  onJumpToMessage?: (messageId: string) => void;
  showInlineTime?: boolean;
  /** When true, skip entrance fade (Virtuoso remounts must not flash). */
  skipEnterAnimation?: boolean;
}

export const MessageBubble = React.memo<MessageBubbleProps>(({
  message: m,
  isMine,
  isGroup,
  currentUserId,
  peerId,
  showAvatar,
  isGroupStart = true,
  isGroupEnd = true,
  highlighted = false,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  onEnterSelection,
  onReply,
  onEdit,
  onDelete,
  onDeleteForMe,
  onForward,
  onPin,
  onStar,
  onReact,
  onReport,
  onShare,
  onRetry,
  onJumpToMessage,
  showInlineTime = true,
  skipEnterAnimation = false,
}) => {
  
  const [decryptedText, setDecryptedText] = useState<string>(m.isEncrypted ? '...' : (m.text || ''));

  useEffect(() => {
    if (!m.isEncrypted || !m.text || !m.text.includes(':')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setDecryptedText(m.text || '');
      return;
    }
    let mounted = true;
    const decrypt = async () => {
      try {
        const { decryptMessage, importPrivateKey, importPublicKey, deriveSharedSecret } = await import('../../lib/wevchatCrypto');
        const { wevchatApi } = await import('../../lib/wevchatApi');
        const privB64 = localStorage.getItem('wevchat_e2ee_private');
        if (!privB64) {
          if (mounted) setDecryptedText(' Locked (No Key)');
          return;
        }
        const otherId = peerId || m.senderId;
        if (!otherId) return;

        let peerB64 = localStorage.getItem(`wevchat_e2ee_peer_${otherId}`);
        if (!peerB64) {
          const res = await wevchatApi.getPublicKey(otherId);
          if (res && res.publicKey) {
            peerB64 = res.publicKey;
            localStorage.setItem(`wevchat_e2ee_peer_${otherId}`, peerB64);
          }
        }
        
        if (peerB64 && privB64) {
          const privKey = await importPrivateKey(privB64);
          const pubKey = await importPublicKey(peerB64);
          const sharedSecret = await deriveSharedSecret(privKey, pubKey);
          
          const parts = (m.text || '').split(':');
          if (parts.length === 2) {
            const cleartext = await decryptMessage(parts[1], parts[0], sharedSecret);
            if (mounted) setDecryptedText(cleartext);
          }
        }
      } catch (err) {
        if (mounted) setDecryptedText(' Decryption failed');
      }
    };
    decrypt();
    return () => { mounted = false; };
  }, [m.isEncrypted, m.text, peerId, m.senderId]);

  const displayText = decryptedText;

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMode, setMenuMode] = useState<'sheet' | 'menu'>('sheet');
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showReactionPeople, setShowReactionPeople] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressMoved = useRef(false);
  const reduceMotion = useReducedMotion();
  const isFailed = m.status === 'failed';
  const isSending = m.status === 'sending';
  const navigate = useNavigate();
  const [poll, setPoll] = useState(m.poll || null);
  const isPrivate = !!m.privateSessionId;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    setPoll(m.poll || null);
  }, [m.poll]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowEmojiBar(false);
        setShowReactionPeople(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const openSheet = useCallback((mode: 'sheet' | 'menu', anchor?: { x: number; y: number }) => {
    if (isSending || isFailed || selectionMode) return;
    setMenuMode(mode);
    setMenuAnchor(anchor || null);
    setShowEmojiBar(false);
    setMenuOpen(true);
  }, [isSending, isFailed, selectionMode]);

  const isStarred = m.starredBy?.some((s) => s?.userId === currentUserId);
  const myReaction = m.reactions?.find((r) => r?.userId === currentUserId)?.emoji || null;
  const reactionCounts: Record<string, number> = m.reactions?.reduce((acc, r) => {
    if (!r || !r.emoji) return acc;
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  const time = safeTime(m.createdAt);
  const storyReply = isStoryReply(m);
  const pollMsg = isPollMessage(m);
  const eventMsg = isEventMessage(m);
  const locationMsg = isLocationMessage(m);
  const location = locationMsg ? parseLocation(m) : null;
  const firstUrl = extractFirstUrl(displayText);
  const hasMedia = !!(m.imageUrl || m.videoUrl || m.audioUrl || m.fileUrl);

  const handleCopy = (linkOnly = false) => {
    const value = linkOnly ? firstUrl : displayText;
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast.success(linkOnly ? 'Link copied' : 'Message copied');
  };

  const handleDownload = () => {
    const url = m.imageUrl || m.videoUrl || m.audioUrl || m.fileUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = m.fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success('Download started');
  };

  const handleAction = (id: MessageActionId) => {
    switch (id) {
      case 'reply': onReply(m); break;
      case 'copy': handleCopy(false); break;
      case 'copyLink': handleCopy(true); break;
      case 'forward': onForward(m); break;
      case 'share': onShare?.(m); break;
      case 'edit': if (displayText) onEdit(m); break;
      case 'star': onStar(m); break;
      case 'pin': onPin(m); break;
      case 'deleteMe': onDeleteForMe(m); break;
      case 'deleteEveryone': onDelete(m); break;
      case 'report': onReport(m); break;
      case 'select': onEnterSelection?.(m); break;
      case 'download': handleDownload(); break;
      case 'react': setShowEmojiBar(true); break;
      case 'translate':
        if (m.id && displayText) {
          window.dispatchEvent(
            new CustomEvent('wev:request-translate', {
              detail: { sourceId: m.id, sourceType: 'MESSAGE' },
            }),
          );
        }
        break;
      default: break;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (selectionMode) return;
    longPressMoved.current = false;
    const t = e.touches[0];
    const x = t?.clientX ?? 0;
    const y = t?.clientY ?? 0;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      openSheet('sheet', { x, y });
    }, LONG_PRESS_MS);
  };

  const onTouchMove = () => {
    longPressMoved.current = true;
    clearLongPress();
  };

  const onTouchEnd = () => clearLongPress();

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openSheet('menu', { x: e.clientX, y: e.clientY });
  };

  const onBubbleClick = () => {
    if (selectionMode) onToggleSelect?.(m);
  };

  const handleVote = async (optionId: string) => {
    if (!poll || isSending) return;
    const token = useStore.getState().token;
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ optionIds: [optionId] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Vote failed');
        return;
      }
      const fresh = await fetch(`/api/polls/${poll.id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      }).then((r) => r.json());
      setPoll({
        id: fresh.id,
        question: fresh.question,
        totalVotes: fresh.totalVotes,
        userVotes: fresh.userVotes || [],
        options: (fresh.options || []).map((opt: any) => ({
          id: opt.id,
          text: opt.text,
          voteCount: opt.voteCount ?? opt._count?.votes ?? 0,
          percentage: opt.percentage ?? 0,
        })),
      });
    } catch {
      toast.error('Vote failed');
    }
  };

  // Facebook WevChat–style stacking: ~18px pill corners; shared edge flattens to 4px.
  const cornerClass = (() => {
    if (isMine) {
      if (isGroupStart && isGroupEnd) return 'rounded-[18px]';
      if (isGroupStart) return 'rounded-[18px] rounded-br-[4px]';
      if (isGroupEnd) return 'rounded-[18px] rounded-tr-[4px]';
      return 'rounded-[18px] rounded-tr-[4px] rounded-br-[4px]';
    }
    if (isGroupStart && isGroupEnd) return 'rounded-[18px]';
    if (isGroupStart) return 'rounded-[18px] rounded-bl-[4px]';
    if (isGroupEnd) return 'rounded-[18px] rounded-tl-[4px]';
    return 'rounded-[18px] rounded-tl-[4px] rounded-bl-[4px]';
  })();

  const renderStatusTick = (onDarkBubble = true) => {
    if (!isMine) return null;
    if (isFailed) return <AlertTriangle size={12} className={onDarkBubble ? 'text-red-200' : 'text-red-500'} aria-label="Failed to send" />;
    if (isSending) return <Clock size={12} className={onDarkBubble ? 'text-white/70' : undefined} aria-label="Sending" />;
    if (m.status === 'read' || m.read) {
      return <CheckCheck size={13} className={onDarkBubble ? 'text-white' : 'text-[#0084ff]'} aria-label="Read" />;
    }
    if (m.status === 'delivered' || m.delivered) {
      return <CheckCheck size={13} className={onDarkBubble ? 'text-white/80' : undefined} aria-label="Delivered" />;
    }
    return <Check size={13} className={onDarkBubble ? 'text-white/80' : undefined} aria-label="Sent" />;
  };

  
  const showMetaInside = isFailed
    || (!!m.isEdited && !m.isDeleted)
    || (showInlineTime && !isFailed && !!time);
  // One status line per run of my messages (the last one), or while a message is still in flight.
  const showTicksOutside = isMine && !showMetaInside && !m.isDeleted && (isGroupEnd || isSending);

  return (
    <motion.div
      data-message-id={m.id}
      initial={reduceMotion || skipEnterAnimation ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onContextMenu={onContextMenu}
      onClick={onBubbleClick}
      className={`flex flex-col w-full ${isMine ? 'items-end' : 'items-start'} group relative select-none ${isGroupStart ? 'mt-3' : 'mt-[2px]'} ${
        highlighted || selected ? 'rounded-[18px] ring-2 ring-blue-500/50 bg-blue-500/5 -mx-1 px-1 py-0.5 transition-all' : ''
      } ${selectionMode ? 'cursor-pointer' : ''}`}
    >
      {isGroup && !isMine && isGroupStart && (
        <span className="text-[10px] font-bold text-muted-foreground ml-9 mb-0.5">{m.sender?.name}</span>
      )}

      {(m.isPinned || isStarred) && (
        <span className="flex items-center gap-2 text-[9px] font-bold mb-0.5">
          {m.isPinned && <span className="flex items-center gap-1 text-amber-500"><Pin size={10} /> Pinned</span>}
          {isStarred && <span className="flex items-center gap-1 text-amber-400"><Star size={10} className="fill-amber-400" /> Saved</span>}
        </span>
      )}

      <div className={`flex items-end gap-1 w-full max-w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
        {selectionMode && (
          <span className={`mb-1 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
            {selected && <Check size={12} strokeWidth={3} />}
          </span>
        )}
        {isGroup && !isMine && (
          showAvatar
            ? <UserAvatar user={m.sender} className="w-7 h-7 text-[9px] mb-1" />
            : <span className="w-7 shrink-0" aria-hidden="true" />
        )}
        {isMine && !selectionMode && (
          <div className="relative hidden md:flex items-center opacity-0 group-hover:opacity-100 transition-all" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowEmojiBar((v) => !v); }}
              disabled={isSending || isFailed}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground transition-all disabled:hidden"
              aria-label="React"
            >
              <Smile size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openSheet('menu', { x: e.clientX, y: e.clientY }); }}
              disabled={isSending || isFailed}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground transition-all disabled:hidden"
              aria-label="Message actions"
            >
              <MoreHorizontal size={14} />
            </button>
            {showEmojiBar && (
              <div className="absolute z-20 bottom-full mb-1 right-0 flex items-center gap-1 bg-card border border-border rounded-2xl p-1.5 shadow-xl">
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); onReact(m, e); setShowEmojiBar(false); }}
                    className={`text-base hover:scale-125 transition-transform p-0.5 ${myReaction === e ? 'scale-110' : ''}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`wevchat-bubble-col flex flex-col max-w-[min(75%,420px)] min-w-0 ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`wevchat-bubble w-fit max-w-full flex flex-col text-[15px] leading-[1.35] relative transition-opacity group ${showMetaInside ? 'px-3 pt-2 pb-1.5' : 'px-3 py-[7px]'} ${cornerClass} ${
            isSending ? 'opacity-70' : ''
          } ${
            m.isDeleted
              ? 'bg-black/5 dark:bg-white/5 text-muted-foreground italic border border-border'
              : isFailed
              ? 'bg-red-500/10 border border-red-500/40 text-foreground'
              : isPrivate
              ? isMine
                ? 'bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-700 text-white'
                : 'bg-amber-500/10 border border-amber-500/30 text-foreground'
              : isMine
              ? 'bg-gradient-to-br from-primary to-primary/80 shadow-sm text-primary-foreground'
              : 'bg-card/90 md:bg-card/80 md:backdrop-blur-md border border-border/50 text-foreground shadow-sm'
          }`}
        >
          {!!m.forwardId && !m.isDeleted && (
            <div className={`flex items-center gap-1 mb-1 text-[10px] font-bold opacity-80 ${isMine ? 'text-white/80' : 'text-muted-foreground'}`}>
              <Forward size={10} /> Forwarded
            </div>
          )}
          {m.replyTo && !m.isDeleted && (
            <button
              type="button"
              onClick={() => m.replyTo && onJumpToMessage?.(m.replyTo.id)}
              className={`w-full text-left mb-1.5 pl-2 border-l-2 text-[11px] opacity-80 truncate max-w-full rounded-sm transition-opacity hover:opacity-100 ${isMine ? 'border-white/50' : 'border-primary/50'}`}
            >
              <span className="font-bold">{m.replyTo.sender?.name || 'Message'}: </span>
              {m.replyTo.mediaType === 'story_reply' || (m.replyTo.fileName && m.replyTo.fileName.startsWith('story:'))
                ? (m.replyTo.text || 'Story reply')
                : (m.replyTo.text || '[media]')}
            </button>
          )}

          {m.isDeleted ? (
            <span>This message was deleted</span>
          ) : (
            <>
              {isFailed && m.sendPayload && (
                <button
                  type="button"
                  onClick={() => onRetry?.(m)}
                  className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-extrabold hover:bg-red-500/25 transition-all"
                >
                  <RotateCw size={11} /> Retry send
                </button>
              )}
              {storyReply && (
                <div className={`mb-2 rounded-xl overflow-hidden border ${isMine ? 'border-white/25 bg-white/10' : 'border-border bg-black/5 dark:bg-white/5'}`}>
                  <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                    Replied to story
                  </div>
                  {(m.imageUrl || m.videoUrl) && (
                    <div className="max-h-36 overflow-hidden">
                      {m.imageUrl && (
                        <AuthenticatedMedia src={m.imageUrl} alt="story" className="w-full max-w-full object-cover" />
                      )}
                      {m.videoUrl && !m.imageUrl && (
                        <AuthenticatedMedia as="video" src={m.videoUrl} className="w-full max-w-full object-cover" muted playsInline />
                      )}
                    </div>
                  )}
                  {!m.imageUrl && !m.videoUrl && (
                    <div className={`px-2.5 py-3 text-[11px] italic ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                      Story preview unavailable
                    </div>
                  )}
                </div>
              )}
              {!storyReply && !eventMsg && m.imageUrl && (
                <AuthenticatedMedia
                  src={m.imageUrl}
                  alt="attachment"
                  className="rounded-xl w-full max-w-full sm:max-w-[min(280px,100%)] mb-1.5 cursor-pointer object-contain"
                  onClick={() => window.open(m.imageUrl!, '_blank')}
                />
              )}
              {!storyReply && m.videoUrl && (
                <AuthenticatedMedia as="video" src={m.videoUrl} controls className="rounded-xl w-full max-w-full sm:max-w-[min(280px,100%)] mb-1.5" />
              )}
              {m.audioUrl && <div className="flex flex-col"><VoicePlayback src={m.audioUrl} isMine={isMine} />{m.id && !m.isDeleted && <TranscribeVoice messageId={m.id} initialTranscript={displayText?.includes('[Transcript]:') ? displayText.split('[Transcript]:')[1] : ''} />}</div>}
              {pollMsg && poll && (
                <div className={`mb-1.5 w-full min-w-0 max-w-full rounded-xl p-2.5 ${isMine ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5'}`}>
                  <div className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide mb-1.5 ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                    <BarChart2 size={12} /> Poll
                  </div>
                  <p className="text-sm font-bold mb-2">{poll.question}</p>
                  <div className="space-y-1.5">
                    {poll.options.map((opt) => {
                      const voted = poll.userVotes.includes(opt.id);
                      const showBar = poll.totalVotes > 0 || poll.userVotes.length > 0;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={isSending}
                          onClick={() => handleVote(opt.id)}
                          className={`relative w-full text-left overflow-hidden rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border ${
                            voted
                              ? isMine ? 'border-white/70 bg-white/15' : 'border-primary bg-primary/10'
                              : isMine ? 'border-white/20 hover:bg-white/10' : 'border-border hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                        >
                          {showBar && (
                            <span
                              className={`absolute inset-y-0 left-0 ${isMine ? 'bg-white/20' : 'bg-primary/15'}`}
                              style={{ width: `${opt.percentage}%` }}
                            />
                          )}
                          <span className="relative flex items-center justify-between gap-2">
                            <span>{opt.text}</span>
                            {showBar && <span className="opacity-70">{opt.percentage}%</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className={`mt-1.5 text-[10px] ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                    {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}
                  </p>
                </div>
              )}
              {eventMsg && (
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className={`mb-1.5 w-full min-w-0 max-w-full text-left overflow-hidden rounded-xl border ${isMine ? 'border-white/25 bg-white/10' : 'border-border bg-black/5 dark:bg-white/5'}`}
                >
                  {m.imageUrl && <AuthenticatedMedia src={m.imageUrl} alt="" className="w-full h-24 object-cover" />}
                  <div className="px-2.5 py-2">
                    <div className={`flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                      <Calendar size={11} /> Campus event
                    </div>
                    <p className="text-sm font-bold mt-0.5 break-words">{displayText || 'Event'}</p>
                    <span className={`text-[10px] font-bold ${isMine ? 'text-white/70' : 'text-primary'}`}>Open events →</span>
                  </div>
                </button>
              )}
              {locationMsg && (
                <a
                  href={location?.mapsUrl || m.fileUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mb-1.5 w-full min-w-0 max-w-full sm:max-w-[min(280px,100%)] text-left overflow-hidden rounded-xl border block ${isMine ? 'border-white/25 bg-white/10' : 'border-border bg-black/5 dark:bg-white/5'}`}
                >
                  <div className={`px-3 py-2.5 flex items-start gap-2.5 ${isMine ? 'text-white' : 'text-foreground'}`}>
                    <span className={`mt-0.5 p-2 rounded-full shrink-0 ${isMine ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>
                      <MapPin size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[10px] font-extrabold uppercase tracking-wide ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>Location</span>
                      <span className="block text-sm font-bold mt-0.5 break-words">{displayText || 'Shared location'}</span>
                      {location && (
                        <span className={`block text-[10px] mt-1 font-medium ${isMine ? 'text-white/60' : 'text-muted-foreground'}`}>
                          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </span>
                      )}
                      <span className={`block text-[10px] font-bold mt-1 ${isMine ? 'text-white/80' : 'text-primary'}`}>Open in Maps →</span>
                    </span>
                  </div>
                </a>
              )}
              {m.fileUrl && !eventMsg && !locationMsg && (
                <AuthenticatedMedia
                  as="link"
                  src={m.fileUrl}
                  download={m.fileName || undefined}
                  className={`flex items-center gap-2 mb-1.5 px-3 py-2 rounded-xl ${isMine ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5'} text-xs font-semibold underline-offset-2 hover:underline`}
                >
                  <Download size={14} /> {m.fileName || 'Download file'}
                </AuthenticatedMedia>
              )}
              {displayText && !pollMsg && !eventMsg && !locationMsg && (
                firstUrl ? (
                  <RichMessageText text={displayText} className={isMine ? 'text-white' : 'text-foreground'} />
                ) : (
                  <AITextTools
                    sourceId={m.id}
                    sourceType="MESSAGE"
                    originalText={displayText}
                    compact
                    disabled={isSending || isFailed}
                    absoluteActions
                    hideTranslateButton
                    textClassName={`whitespace-pre-wrap break-words ${isMine ? 'text-white' : 'text-foreground'}`}
                  />
                )
              )}
              {firstUrl && !m.isDeleted && (
                <a
                  href={firstUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`mt-1.5 block rounded-xl border overflow-hidden text-left ${isMine ? 'border-white/20 bg-white/10' : 'border-border bg-black/5 dark:bg-white/5'}`}
                >
                  <div className={`px-2.5 py-2 text-[10px] font-bold truncate ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {(() => { try { return new URL(firstUrl).hostname; } catch { return 'Link'; } })()}
                  </div>
                  <div className={`px-2.5 pb-2 text-[11px] font-semibold truncate ${isMine ? 'text-white' : 'text-foreground'}`}>{firstUrl}</div>
                </a>
              )}
              {m.isAutomated && (
                <span className={`ml-1 inline-flex items-center gap-0.5 align-middle text-[10px] font-bold opacity-80 ${isMine ? 'text-white/80' : 'text-muted-foreground'}`} title="Sent automatically by this Space">
                  <Zap size={9} /> Automated
                </span>
              )}
              {m.isAiGenerated && (
                <span className={`ml-1 inline-flex items-center gap-0.5 align-middle text-[10px] font-bold opacity-80 ${isMine ? 'text-white/80' : 'text-primary'}`}>
                  <Sparkles size={9} /> AI
                </span>
              )}
              {isPrivate && (
                <span className={`absolute -top-2 ${isMine ? '-left-2' : '-right-2'} w-5 h-5 rounded-full bg-card border border-amber-500/50 text-amber-600 dark:text-amber-300 flex items-center justify-center shadow`} title="Private Chat">
                  <Lock size={10} />
                </span>
              )}
            </>
          )}

          {showMetaInside && (
            <div className={`flex items-center justify-end gap-1 mt-0.5 w-fit ml-auto shrink-0 whitespace-nowrap text-[11px] font-medium leading-none ${isFailed ? 'text-red-500 dark:text-red-300' : isMine ? 'text-white/70' : 'wevchat-msg-time text-black/45 dark:text-white/55'}`}>
              {isFailed && <span className="font-bold">Failed</span>}
              {m.isEdited && !m.isDeleted && !isFailed && <span>edited</span>}
              {showInlineTime && !isFailed && time && <span>{time}</span>}
              {renderStatusTick(true)}
            </div>
          )}

          {Object.keys(reactionCounts).length > 0 && (
            <div className="absolute -bottom-3 right-2 z-[1]">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowReactionPeople((v) => !v); }}
                className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm hover:bg-muted/80 transition-colors"
              >
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <span key={emoji} className="text-[11px]">
                    {emoji}{count > 1 ? count : ''}
                  </span>
                ))}
              </button>
              {showReactionPeople && (
                <div className="absolute bottom-full right-0 mb-1 w-44 rounded-2xl border border-border bg-card shadow-xl p-2 z-20">
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase mb-1 px-1">Reactions</p>
                  {(m.reactions || []).map((r, idx) => (
                    <button
                      key={`${r.userId}-${r.emoji}-${idx}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (r.userId === currentUserId) onReact(m, r.emoji);
                        setShowReactionPeople(false);
                      }}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl text-xs hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <span className="truncate font-semibold">{r.userId === currentUserId ? 'You' : (r.user?.name || 'Someone')}</span>
                      <span>{r.emoji}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showTicksOutside && (
          <div className="flex items-center justify-end gap-1 mt-1 pr-1 h-3.5 text-[10px] leading-none text-muted-foreground dark:text-white/50">
            {renderStatusTick(false)}
          </div>
        )}
        </div>

        {!isMine && !selectionMode && (
          <div className="relative hidden md:block" ref={menuRef}>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowEmojiBar(!showEmojiBar); }}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground"
                aria-label="React"
              >
                <Smile size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openSheet('menu', { x: e.clientX, y: e.clientY }); }}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground"
                aria-label="Message actions"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
            {showEmojiBar && (
              <div className="absolute z-20 bottom-full mb-1 left-0 flex items-center gap-1 bg-card border border-border rounded-2xl p-1.5 shadow-xl">
                {QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={(ev) => { ev.stopPropagation(); onReact(m, e); setShowEmojiBar(false); }}
                    className={`text-base hover:scale-125 transition-transform ${myReaction === e ? 'scale-110' : ''}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <MessageActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        mode={menuMode}
        anchor={menuAnchor}
        isMine={isMine}
        isDeleted={!!m.isDeleted}
        isStarred={!!isStarred}
        isPinned={!!m.isPinned}
        hasText={!!displayText}
        hasLink={!!firstUrl}
        hasMedia={hasMedia}
        sentAt={time}
        myReaction={myReaction}
        onAction={handleAction}
        onReact={(emoji) => onReact(m, emoji)}
      />
    </motion.div>
  );
});

MessageBubble.displayName = 'MessageBubble';
