import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Gauge, Volume2, VolumeX, Settings2,
  Languages, Captions, Ban, BellOff, User, Link2, Share2, Bookmark,
  Download, Tag, Flag, UserX, EyeOff, FileText, Music2, Search, Check, ExternalLink,
} from 'lucide-react';
import RepostIcon from '../icons/RepostIcon';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { resolveContentAuthor } from '@wevsoft/shared/content-author';

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const QUALITIES = ['Auto', '144p', '360p', '480p', '720p', '1080p'] as const;
const LANGUAGES = [
  { code: 'auto', label: 'Auto (device)' },
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' },
  { code: 'es', label: 'Español' },
] as const;
const REPORT_REASONS = [
  'Spam',
  'Violence',
  'Harassment',
  'False information',
  'Copyright',
  'Other',
] as const;

type Panel =
  | 'root'
  | 'speed'
  | 'quality'
  | 'language'
  | 'captions'
  | 'report';

export interface ReelOptionsMenuProps {
  reel: any;
  isMuted: boolean;
  onToggleMute: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  quality: string;
  onQualityChange: (q: string) => void;
  captionsOn: boolean;
  onCaptionsToggle: (on: boolean) => void;
  captionLanguage: string;
  onCaptionLanguageChange: (lang: string) => void;
  audioLanguage: string;
  onAudioLanguageChange: (lang: string) => void;
  onShare: () => void;
  onSaved?: () => void;
  onClose: () => void;
  onNotInterested?: () => void;
  isBoosted?: boolean;
  boostsCount?: number;
  allowBoost?: boolean;
  onBoost?: () => void;
}

function Row({
  icon: Icon,
  label,
  hint,
  danger,
  onClick,
  trailing,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5 ${
        danger ? 'text-red-400' : 'text-white'
      }`}
    >
      <Icon size={18} className={danger ? 'text-red-400' : 'text-white/70'} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        {hint ? <p className="text-[11px] text-white/45 truncate mt-0.5">{hint}</p> : null}
      </div>
      {trailing ?? <ChevronRight size={16} className="text-white/35 shrink-0" />}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-white/40">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function ReelOptionsMenu({
  reel,
  isMuted,
  onToggleMute,
  playbackRate,
  onPlaybackRateChange,
  quality,
  onQualityChange,
  captionsOn,
  onCaptionsToggle,
  captionLanguage,
  onCaptionLanguageChange,
  audioLanguage,
  onAudioLanguageChange,
  onShare,
  onSaved,
  onClose,
  onNotInterested,
  isBoosted = false,
  boostsCount = 0,
  allowBoost = false,
  onBoost,
}: ReelOptionsMenuProps) {
  const navigate = useNavigate();
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [panel, setPanel] = useState<Panel>('root');
  const [busy, setBusy] = useState(false);

  const allowDownload = reel?.allowDownload !== false;
  /**
   * A Space-published reel has no `reel.user`, by design. Everything below that used
   * to read it — the profile link, mute, block, hide-creator — was therefore either
   * pointing at whichever team member pressed publish or silently doing nothing.
   */
  const author = resolveContentAuthor(reel, user?.id);
  const isSpaceReel = author.kind === 'space';
  const ownerPath = author.href;
  const reelUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/reels/${encodeURIComponent(reel?.id || '')}`
      : `/reels/${reel?.id || ''}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(reelUrl);
      toast.success('Link copied');
      onClose();
    } catch {
      toast.error('Could not copy link');
    }
  };

  const saveReel = async () => {
    try {
      const key = 'wev_saved_reels';
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(reel.id)) list.push(reel.id);
      localStorage.setItem(key, JSON.stringify(list));
      toast.success('Reel saved');
      onSaved?.();
      onClose();
    } catch {
      toast.error('Could not save reel');
    }
  };

  const downloadReel = async () => {
    if (!allowDownload) {
      toast.error('Creator disabled downloads');
      return;
    }
    if (!reel?.videoUrl) {
      toast.error('No video available');
      return;
    }
    try {
      setBusy(true);
      if (reel?.source !== 'post') {
        await fetch(`/api/reels/${reel.id}/download`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      const res = await fetch(reel.videoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wevsoft-reel-${reel.id || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Download started');
      onClose();
    } catch {
      // Cross-origin fallback: open in new tab
      window.open(reel.videoUrl, '_blank', 'noopener,noreferrer');
      toast.success('Opening video…');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const muteCreator = () => {
    try {
      const key = 'wev_muted_creators';
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      // Person-level list. A Space is not a creator id, so bail rather than report
      // success for a preference that was never written.
      const id = author.kind === 'user' ? author.id : null;
      if (!id) return;
      if (!list.includes(id)) list.push(id);
      localStorage.setItem(key, JSON.stringify(list));
      toast.success(`Muted ${author.name}`);
      onClose();
    } catch {
      toast.error('Could not mute creator');
    }
  };

  const hideCreator = () => {
    try {
      const key = 'wev_hidden_creators';
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const id = author.kind === 'user' ? author.id : null;
      if (!id) return;
      if (!list.includes(id)) list.push(id);
      localStorage.setItem(key, JSON.stringify(list));
      toast.success('Content from this creator will be hidden');
      onNotInterested?.();
      onClose();
    } catch {
      toast.error('Could not hide creator');
    }
  };

  const showLessLikeThis = () => {
    try {
      const key = 'wev_show_less_tags';
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const tag = (reel?.hashtags || reel?.caption || '').slice(0, 80) || reel?.id;
      if (tag && !list.includes(tag)) list.push(String(tag));
      localStorage.setItem(key, JSON.stringify(list));
      toast.success('We will show less like this');
      onNotInterested?.();
      onClose();
    } catch {
      toast.error('Could not update preferences');
    }
  };

  const blockUser = async () => {
    const blockedId = author.kind === 'user' ? author.id : null;
    if (!blockedId || !token) return;
    if (!window.confirm(`Block ${author.name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/settings/blocks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockedId }),
      });
      if (!res.ok) throw new Error('block failed');
      toast.success('User blocked');
      onNotInterested?.();
      onClose();
    } catch {
      toast.error('Failed to block user');
    } finally {
      setBusy(false);
    }
  };

  const submitReport = async (reason: string) => {
    if (!token || !reel?.id) return;
    setBusy(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId: reel.id,
          targetType: reel.source === 'post' ? 'post' : 'reel',
          reason: reason.toLowerCase().replace(/\s+/g, '_'),
          description: `Reel report: ${reason}`,
        }),
      });
      if (!res.ok) throw new Error('report failed');
      toast.success('Report submitted');
      onClose();
    } catch {
      toast.error('Failed to submit report');
    } finally {
      setBusy(false);
    }
  };

  const title =
    panel === 'speed'
      ? 'Playback Speed'
      : panel === 'quality'
        ? 'Quality'
        : panel === 'language'
          ? 'Language'
          : panel === 'captions'
            ? 'Captions'
            : panel === 'report'
              ? 'Report'
              : 'Reel options';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[80] bg-black/55 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Reel options"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] max-h-[78%] rounded-t-3xl bg-zinc-950 border-t border-white/10 flex flex-col shadow-2xl"
      >
        <div className="px-4 pt-3 pb-2 border-b border-white/10 shrink-0 flex items-center gap-2">
          <div className="w-10 h-1 rounded-full bg-white/25 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          {panel !== 'root' ? (
            <button
              type="button"
              onClick={() => setPanel('root')}
              className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
          ) : (
            <span className="w-8" />
          )}
          <p className="flex-1 text-center text-white font-semibold text-sm">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait">
            {panel === 'root' && (
              <motion.div
                key="root"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
              >
                <Section title="Playback">
                  <Row
                    icon={Gauge}
                    label="Playback Speed"
                    hint={`${playbackRate}×`}
                    onClick={() => setPanel('speed')}
                  />
                  <Row
                    icon={isMuted ? VolumeX : Volume2}
                    label={isMuted ? 'Unmute' : 'Mute'}
                    hint="Volume / Mute"
                    onClick={() => {
                      onToggleMute();
                    }}
                    trailing={
                      <span className="text-[11px] text-white/50 font-semibold">
                        {isMuted ? 'Muted' : 'On'}
                      </span>
                    }
                  />
                  <Row
                    icon={Settings2}
                    label="Quality"
                    hint={quality}
                    onClick={() => setPanel('quality')}
                  />
                  <Row
                    icon={Languages}
                    label="Language"
                    hint={`Audio: ${LANGUAGES.find((l) => l.code === audioLanguage)?.label || audioLanguage}`}
                    onClick={() => setPanel('language')}
                  />
                  <Row
                    icon={Captions}
                    label="Captions / Subtitles"
                    hint={captionsOn ? `On · ${captionLanguage}` : 'Off'}
                    onClick={() => setPanel('captions')}
                  />
                </Section>

                <Section title="Content">
                  <Row
                    icon={Ban}
                    label="Not Interested"
                    onClick={() => {
                      onNotInterested?.();
                      toast.success('Got it — fewer like this');
                      onClose();
                    }}
                  />
                  {!isSpaceReel && <Row icon={BellOff} label="Mute this creator" onClick={muteCreator} />}
                  <Row
                    icon={User}
                    label={isSpaceReel ? 'View WevSpace' : 'View Profile'}
                    onClick={() => {
                      if (!ownerPath) return;
                      onClose();
                      navigate(ownerPath);
                    }}
                  />
                  <Row icon={Link2} label="Copy Link" onClick={copyLink} trailing={null} />
                  <Row
                    icon={ExternalLink}
                    label="Open in New Tab"
                    onClick={() => {
                      window.open(reelUrl, '_blank', 'noopener,noreferrer');
                      onClose();
                    }}
                    trailing={null}
                  />
                  <Row
                    icon={Share2}
                    label="Share"
                    onClick={() => {
                      onClose();
                      onShare();
                    }}
                    trailing={null}
                  />
                  {allowBoost && onBoost ? (
                    <Row
                      icon={RepostIcon}
                      label={isBoosted ? 'Remove Repost' : 'Repost'}
                      hint={
                        isBoosted
                          ? 'Stop recommending this Reel to your network'
                          : boostsCount > 0
                            ? `${boostsCount} repost${boostsCount === 1 ? '' : 's'}`
                            : 'Repost this Reel to your network'
                      }
                      onClick={() => {
                        onBoost();
                      }}
                      trailing={null}
                    />
                  ) : null}
                  <Row icon={Bookmark} label="Save Reel" onClick={saveReel} trailing={null} />
                  <Row
                    icon={Download}
                    label="Download"
                    hint={allowDownload ? undefined : 'Disabled by creator'}
                    onClick={downloadReel}
                    trailing={busy ? <span className="text-[11px] text-white/40">…</span> : null}
                  />
                  <Row icon={Tag} label="Show less like this" onClick={showLessLikeThis} />
                </Section>

                <Section title="Safety">
                  <Row icon={Flag} label="Report" danger onClick={() => setPanel('report')} />
                  {!isSpaceReel && <Row icon={UserX} label="Block User" danger onClick={blockUser} />}
                  {!isSpaceReel && (
                    <Row
                      icon={EyeOff}
                      label="Hide content from this creator"
                      danger
                      onClick={hideCreator}
                    />
                  )}
                </Section>

                <Section title="Wevsoft">
                  <Row
                    icon={FileText}
                    label="View Transcript"
                    onClick={() => {
                      const text =
                        reel?.captions?.fullText ||
                        reel?.caption ||
                        reel?.description;
                      if (!text) {
                        toast.error('No transcript available');
                        return;
                      }
                      onClose();
                      toast((t) => (
                        <div className="max-w-xs">
                          <p className="font-bold text-sm mb-1">Transcript</p>
                          <p className="text-xs whitespace-pre-wrap line-clamp-8">{text}</p>
                          <button
                            type="button"
                            className="mt-2 text-xs font-semibold text-primary"
                            onClick={() => toast.dismiss(t.id)}
                          >
                            Close
                          </button>
                        </div>
                      ), { duration: 8000 });
                    }}
                    trailing={null}
                  />
                  <Row
                    icon={Music2}
                    label="View Original Audio"
                    hint={`Original Audio · ${author.name}`}
                    onClick={() => {
                      toast.success(`Original Audio — ${author.name}`);
                      onClose();
                    }}
                    trailing={null}
                  />
                  <Row
                    icon={Search}
                    label="Search this Reel / Find similar"
                    onClick={() => {
                      const q = encodeURIComponent(
                        (reel?.hashtags || reel?.caption || 'reels').toString().slice(0, 60)
                      );
                      onClose();
                      navigate(`/home?q=${q}`);
                    }}
                    trailing={null}
                  />
                </Section>
              </motion.div>
            )}

            {panel === 'speed' && (
              <motion.div key="speed" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      onPlaybackRateChange(s);
                      toast.success(`Speed ${s}×`);
                      setPanel('root');
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-white hover:bg-white/5"
                  >
                    <span className="text-sm font-semibold">{s}×</span>
                    {playbackRate === s ? <Check size={18} className="text-cyan-400" /> : null}
                  </button>
                ))}
              </motion.div>
            )}

            {panel === 'quality' && (
              <motion.div key="quality" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                {QUALITIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      onQualityChange(q);
                      toast.success(`Quality: ${q}`);
                      setPanel('root');
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-white hover:bg-white/5"
                  >
                    <span className="text-sm font-semibold">{q}</span>
                    {quality === q ? <Check size={18} className="text-cyan-400" /> : null}
                  </button>
                ))}
                <p className="px-4 py-3 text-[11px] text-white/40">
                  Preference is saved for this session. Adaptive streams will use it when available.
                </p>
              </motion.div>
            )}

            {panel === 'language' && (
              <motion.div key="language" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                <p className="px-4 py-2 text-[11px] text-white/45">Preferred audio / language</p>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      onAudioLanguageChange(l.code);
                      toast.success(`Language: ${l.label}`);
                      setPanel('root');
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-white hover:bg-white/5"
                  >
                    <span className="text-sm font-semibold">{l.label}</span>
                    {audioLanguage === l.code ? <Check size={18} className="text-cyan-400" /> : null}
                  </button>
                ))}
              </motion.div>
            )}

            {panel === 'captions' && (
              <motion.div key="captions" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                <button
                  type="button"
                  onClick={() => onCaptionsToggle(!captionsOn)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-white hover:bg-white/5"
                >
                  <span className="text-sm font-semibold">{captionsOn ? 'Captions On' : 'Captions Off'}</span>
                  <span
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      captionsOn ? 'bg-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        captionsOn ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
                <p className="px-4 py-2 text-[11px] text-white/45">Caption language</p>
                {LANGUAGES.filter((l) => l.code !== 'auto').map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      onCaptionLanguageChange(l.code);
                      if (!captionsOn) onCaptionsToggle(true);
                      toast.success(`Captions: ${l.label}`);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-white hover:bg-white/5"
                  >
                    <span className="text-sm font-semibold">{l.label}</span>
                    {captionLanguage === l.code ? <Check size={18} className="text-cyan-400" /> : null}
                  </button>
                ))}
              </motion.div>
            )}

            {panel === 'report' && (
              <motion.div key="report" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="py-2">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    disabled={busy}
                    onClick={() => submitReport(reason)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-white hover:bg-white/5 disabled:opacity-50"
                  >
                    <Flag size={16} className="text-red-400" />
                    <span className="text-sm font-semibold">{reason}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
