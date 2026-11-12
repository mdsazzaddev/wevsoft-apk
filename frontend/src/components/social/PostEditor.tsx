import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Wand2, Image as ImageIcon, Smile, ArrowRight, X, Loader2,
  Globe, Users, Lock, MapPin, Tag, Heart, Check, Plus, Video, Film,
  ChevronDown, Map, Music, Coffee, Award, Zap, Pencil, BarChart2, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';
import { useTranslation } from 'react-i18next';
import { EmojiPicker } from './EmojiPicker';
import AudienceSelectorModal from './AudienceSelectorModal';
import { audienceSummaryLabel } from '../../lib/postVisibility';
import LayoutTemplatePicker from './LayoutTemplatePicker';
import PostMediaLayout from './PostMediaLayout';
import MusicPickerModal, { type PostMusicSelection } from './MusicPickerModal';
import GifPickerModal from './GifPickerModal';
import LinkPreviewCard, {
  firstUrlInText,
  type LinkPreviewData,
} from './LinkPreviewCard';
import MentionAutocomplete, {
  mentionQueryAtCaret,
  type MentionUser,
} from './MentionAutocomplete';
import { formatMusicClock } from '../../lib/musicSegment';
import { stripAiReasoning } from '@wevsoft/shared/ai-text';
import type { PostLayoutTemplate } from '@wevsoft/shared/post-media-layout';
import { defaultLayoutForPhotoCount } from '@wevsoft/shared/post-media-layout';
import type { PostEditPollState } from '@wevsoft/shared/post-edit-state';
import { PollComposerEditor, emptyPollDraft } from '../polls/PollComposerEditor';

/** Map a selected index after moving item `from` → `to`. */
function indexAfterReorder(index: number, from: number, to: number): number {
  if (index === from) return to;
  if (from < to) {
    if (index > from && index <= to) return index - 1;
  } else if (from > to) {
    if (index >= to && index < from) return index + 1;
  }
  return index;
}

interface PostEditorProps {
  content: string;
  onChangeContent: (val: string) => void;
  files: File[];
  filePreviewUrls: string[];
  onAddFiles: (newFiles: File[]) => void;
  onRemoveFile: (index: number) => void;
  onReorderFiles?: (from: number, to: number) => void;
  onClearMedia?: () => void;
  onEditMedia?: (index: number) => void;
  onNextStep: () => void;
  onClose: () => void;
  onOpenAIPanel?: () => void;
  layoutTemplate: PostLayoutTemplate | null;
  onLayoutTemplateChange: (template: PostLayoutTemplate) => void;
  musicSelection: PostMusicSelection | null;
  onMusicSelectionChange: (selection: PostMusicSelection | null) => void;
  feeling: string | null;
  onFeelingChange: (feeling: string | null) => void;
  location: string;
  onLocationChange: (location: string) => void;
  poll: PostEditPollState | null;
  onPollChange: (poll: PostEditPollState | null) => void;
  gifUrl: string | null;
  onGifUrlChange: (url: string | null) => void;
  linkPreview: LinkPreviewData | null;
  onLinkPreviewChange: (preview: LinkPreviewData | null) => void;
  isQuestion: boolean;
  onIsQuestionChange: (value: boolean) => void;
  visibilityFlags: import('../../lib/postVisibility').VisibilityFlags;
  customUsers: import('../../lib/postVisibility').AudienceUser[];
  hideFromUsers: import('../../lib/postVisibility').AudienceUser[];
  onAudienceChange: (payload: {
    flags: import('../../lib/postVisibility').VisibilityFlags;
    customUsers: import('../../lib/postVisibility').AudienceUser[];
    hideFromUsers: import('../../lib/postVisibility').AudienceUser[];
  }) => void;
}

const FEELINGS_LIST = [
  { label: 'Happy', emoji: '😃' },
  { label: 'Excited', emoji: '🤩' },
  { label: 'Blessed', emoji: '😇' },
  { label: 'Loved', emoji: '🥰' },
  { label: 'Relaxed', emoji: '😌' },
  { label: 'Motivated', emoji: '💪' },
  { label: 'Celebrating', emoji: '🎉' },
  { label: 'Listening to Music', emoji: '🎧' },
  { label: 'Drinking Coffee', emoji: '☕' },
  { label: 'Traveling', emoji: '✈️' },
];

function feelingParts(feeling: string | null): { emoji: string; label: string } | null {
  if (!feeling) return null;
  const match = FEELINGS_LIST.find(
    (f) => feeling === `${f.emoji} ${f.label}` || feeling === f.label || feeling.endsWith(f.label),
  );
  if (match) return match;
  const space = feeling.indexOf(' ');
  if (space > 0) return { emoji: feeling.slice(0, space), label: feeling.slice(space + 1) };
  return { emoji: '😊', label: feeling };
}

function emptyPoll(): PostEditPollState {
  return emptyPollDraft();
}

export const PostEditor: React.FC<PostEditorProps> = ({
  content,
  onChangeContent,
  files,
  filePreviewUrls,
  onAddFiles,
  onRemoveFile,
  onReorderFiles,
  onClearMedia,
  onEditMedia,
  onNextStep,
  onClose,
  onOpenAIPanel,
  layoutTemplate,
  onLayoutTemplateChange,
  musicSelection,
  onMusicSelectionChange,
  feeling,
  onFeelingChange,
  location,
  onLocationChange,
  poll,
  onPollChange,
  gifUrl,
  onGifUrlChange,
  linkPreview,
  onLinkPreviewChange,
  isQuestion,
  onIsQuestionChange,
  visibilityFlags,
  customUsers,
  hideFromUsers,
  onAudienceChange,
}) => {
  const user = useStore((s) => s.user);
  const token = useStore((s) => s.token);
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [aiToneLoading, setAiToneLoading] = useState<string | null>(null);
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAudienceModal, setShowAudienceModal] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const linkPreviewDismissedRef = useRef<string | null>(null);
  const linkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const mediaDragRef = useRef<{
    from: number;
    startX: number;
    startY: number;
    pointerId: number;
    active: boolean;
    over: number | null;
  } | null>(null);

  useEffect(() => {
    if (previewIndex >= files.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPreviewIndex(Math.max(0, files.length - 1));
    }
  }, [files.length, previewIndex]);

  const finishMediaReorder = (from: number, to: number) => {
    if (!onReorderFiles || from === to) return;
    onReorderFiles(from, to);
    setPreviewIndex((cur) => indexAfterReorder(cur, from, to));
  };

  const onMediaThumbPointerDown = (e: React.PointerEvent, idx: number) => {
    if (!onReorderFiles || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-media-remove]')) return;

    const target = e.currentTarget as HTMLElement;
    mediaDragRef.current = {
      from: idx,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      active: false,
      over: idx,
    };

    const onMove = (ev: PointerEvent) => {
      const state = mediaDragRef.current;
      if (!state || ev.pointerId !== state.pointerId) return;
      const dx = Math.abs(ev.clientX - state.startX);
      const dy = Math.abs(ev.clientY - state.startY);
      if (!state.active && dx + dy > 8) {
        state.active = true;
        setDragFrom(state.from);
        setDragOver(state.from);
        try {
          target.setPointerCapture(ev.pointerId);
        } catch {
          /* ignore */
        }
      }
      if (!state.active) return;
      ev.preventDefault();
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const thumb = under?.closest('[data-media-index]') as HTMLElement | null;
      if (!thumb) return;
      const to = Number(thumb.dataset.mediaIndex);
      if (Number.isNaN(to)) return;
      state.over = to;
      setDragOver(to);
    };

    const onUp = (ev: PointerEvent) => {
      const state = mediaDragRef.current;
      if (!state || ev.pointerId !== state.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      try {
        if (target.hasPointerCapture(ev.pointerId)) {
          target.releasePointerCapture(ev.pointerId);
        }
      } catch {
        /* ignore */
      }
      const to = state.over ?? state.from;
      const wasDragging = state.active;
      mediaDragRef.current = null;
      setDragFrom(null);
      setDragOver(null);
      if (wasDragging) {
        finishMediaReorder(state.from, to);
      } else {
        setPreviewIndex(idx);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // Grow textarea with typed text; stay compact when empty.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const maxPx = files.length > 0 ? 88 : 160;
    const next = Math.min(Math.max(el.scrollHeight, files.length > 0 ? 40 : 40), maxPx);
    el.style.height = `${next}px`;
  }, [content, files.length]);

  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const feelingView = feelingParts(feeling);
  const pollReady =
    !!poll &&
    !!(poll.question || content).trim() &&
    poll.options.map((o) => o.trim()).filter(Boolean).length >= 2;
  const canContinue =
    !!content.trim() || files.length > 0 || pollReady || !!gifUrl;

  // Debounced link preview from first URL in content
  useEffect(() => {
    const url = firstUrlInText(content);
    if (!url || !token) {
      if (!url && linkPreview) onLinkPreviewChange(null);
      return;
    }
    if (linkPreviewDismissedRef.current === url) return;
    if (linkPreview && (linkPreview.url === url || linkPreview.finalUrl === url)) return;

    if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    linkDebounceRef.current = setTimeout(() => {
      void (async () => {
        setLinkPreviewLoading(true);
        try {
          const res = await fetch('/api/link-preview/preview', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.preview) {
            onLinkPreviewChange(data.preview as LinkPreviewData);
          }
        } catch {
          /* ignore preview failures */
        } finally {
          setLinkPreviewLoading(false);
        }
      })();
    }, 550);
    return () => {
      if (linkDebounceRef.current) clearTimeout(linkDebounceRef.current);
    };
  }, [content, token]);  

  const syncMentionFromCaret = (value: string, caret: number) => {
    const hit = mentionQueryAtCaret(value, caret);
    if (!hit) {
      setMentionOpen(false);
      setMentionQuery('');
      setMentionStart(null);
      return;
    }
    setMentionOpen(true);
    setMentionQuery(hit.query);
    setMentionStart(hit.start);
  };

  const handleContentChange = (value: string) => {
    onChangeContent(value);
    const el = textareaRef.current;
    const caret = el ? el.selectionStart : value.length;
    syncMentionFromCaret(value, caret);
    const nextUrl = firstUrlInText(value);
    if (linkPreviewDismissedRef.current && nextUrl !== linkPreviewDismissedRef.current) {
      linkPreviewDismissedRef.current = null;
    }
  };

  const insertMention = (u: MentionUser) => {
    if (!u.username || mentionStart == null) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? content.length;
    const before = content.slice(0, mentionStart);
    const after = content.slice(caret);
    const inserted = `@${u.username} `;
    const next = before + inserted + after;
    onChangeContent(next);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStart(null);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const pos = before.length + inserted.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(pos, pos);
    });
  };

  // Handle File Input Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onAddFiles(selected);
    }
  };

  // Insert Emoji into Content
  const handleEmojiSelect = (emoji: string) => {
    onChangeContent(content + emoji);
  };

  // AI Tone & Rewrite Handler
  const handleAiToneRewrite = async (tone: string) => {
    if (!content.trim()) {
      toast.error(t('Please write or type a prompt first before rewriting!') || 'Please write or type a prompt first before rewriting!');
      return;
    }

    setAiToneLoading(tone);
    try {
      const res = await fetch('/api/v1/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: `Rewrite this post content to be ${tone}:\n\n"${content}"`,
          mode: 'improve',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.generatedText) {
          onChangeContent(stripAiReasoning(data.generatedText));
          toast.success(`${t('Post updated with')} ${tone} ${t('tone')}! ✨`);
        }
      } else {
        toast.error(t('AI Rewrite failed') || 'AI Rewrite failed');
      }
    } catch (e) {
      toast.error(t('Network error during AI rewrite') || 'Network error during AI rewrite');
    } finally {
      setAiToneLoading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-0 relative overflow-hidden h-full flex-1 max-h-none md:max-h-[min(85dvh,720px)]">
      {/* User Info Header with Audience, Feeling & Location */}
      <div className="flex items-start justify-between p-3 sm:p-4 border-b border-border bg-card/60 backdrop-blur-md rounded-none md:rounded-t-2xl shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=random`} 
            alt="Avatar" 
            className="w-11 h-11 rounded-full object-cover border-2 border-primary/30 shadow-sm"
          />
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="font-bold text-sm text-foreground">{user?.name}</h4>
              {feelingView && (
                <span className="text-xs font-medium text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <span>{feelingView.emoji}</span>
                  <span>is feeling {feelingView.label}</span>
                  <button 
                    onClick={() => onFeelingChange(null)} 
                    className="hover:text-amber-300 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              {location && (
                <span className="text-xs font-medium text-cyan-400 flex items-center gap-1 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  <MapPin size={10} />
                  <span>in {location}</span>
                  <button 
                    onClick={() => onLocationChange('')} 
                    className="hover:text-cyan-300 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              {poll && (
                <span className="text-xs font-medium text-primary flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <BarChart2 size={10} />
                  <span>{t('Poll') || 'Poll'}</span>
                  <button
                    type="button"
                    onClick={() => onPollChange(null)}
                    className="hover:opacity-70 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              {isQuestion && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/25">
                  <HelpCircle size={10} />
                  <span>Question</span>
                  <button
                    type="button"
                    onClick={() => onIsQuestionChange(false)}
                    className="hover:opacity-70 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
              {gifUrl && (
                <span className="text-xs font-medium text-fuchsia-500 flex items-center gap-1 bg-fuchsia-500/10 px-2 py-0.5 rounded-full border border-fuchsia-500/20">
                  <Film size={10} />
                  <span>GIF</span>
                  <button
                    type="button"
                    onClick={() => onGifUrlChange(null)}
                    className="hover:opacity-70 ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )}
            </div>

            {/* Song under display name (composer header) */}
            {musicSelection && (
              <button
                type="button"
                onClick={() => setShowMusicPicker(true)}
                className="mt-0.5 flex items-center gap-1 max-w-[220px] text-left text-[11px] font-semibold text-violet-500 hover:text-violet-400"
                title="Change music"
              >
                <Music size={11} className="shrink-0" />
                <span className="truncate">
                  {musicSelection.title}
                  {musicSelection.artist ? ` · ${musicSelection.artist}` : ''}
                </span>
              </button>
            )}

            {/* Audience Selector Button */}
            <div className="relative mt-1">
              <button
                type="button"
                onClick={() => setShowAudienceModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-full border border-border/50 transition-colors"
              >
                {visibilityFlags.public ? (
                  <Globe size={12} className="text-primary" />
                ) : visibilityFlags.hideFrom ? (
                  <Lock size={12} className="text-rose-400" />
                ) : visibilityFlags.friends || visibilityFlags.followers || visibilityFlags.custom ? (
                  <Users size={12} className="text-emerald-400" />
                ) : (
                  <Lock size={12} className="text-amber-400" />
                )}
                <span className="max-w-[160px] truncate">
                  {audienceSummaryLabel(visibilityFlags, customUsers.length, hideFromUsers.length)}
                </span>
                <ChevronDown size={10} />
              </button>
            </div>
          </div>
        </div>

        {/* AI tone wand + close — keep clear of each other */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowAiToolbar(prev => !prev)}
            className={`p-2 rounded-full transition-all flex items-center justify-center ${
              showAiToolbar
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={t('AI Rewrite & Tone Assistant') || 'AI Rewrite & Tone Assistant'}
          >
            <Wand2 size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={t('Close') || 'Close'}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto overscroll-contain composer-scrollbar pr-0.5 min-h-0 flex-1">
      {/* AI Quick Actions Floating Bar */}
      <AnimatePresence>
        {showAiToolbar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 border border-purple-500/30 mx-4 mt-2 rounded-xl p-3 space-y-2 backdrop-blur-md"
          >
            <p className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" /> 
              {t('AI Rewrite & Tone Assistant') || 'AI Rewrite & Tone Assistant'}
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: '💼 Professional', tone: 'professional' },
                { label: '😄 Funny & Witty', tone: 'funny and witty' },
                { label: '⚡ Concise', tone: 'short and concise' },
                { label: '🌟 Inspiring', tone: 'inspiring and motivational' },
                { label: '🇧🇩 Bangla Style', tone: 'natural Bangla conversational style' },
              ].map(t => (
                <button
                  key={t.tone}
                  onClick={() => handleAiToneRewrite(t.tone)}
                  disabled={!!aiToneLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-card/80 border border-border/80 hover:bg-card text-foreground transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {aiToneLoading === t.tone ? <Loader2 size={12} className="animate-spin" /> : null}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Rich Content Input — compact empty; grows with text / media */}
      <div className="relative px-4 pt-2 pb-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onSelect={(e) => {
            const el = e.currentTarget;
            syncMentionFromCaret(el.value, el.selectionStart);
          }}
          onKeyUp={(e) => {
            const el = e.currentTarget;
            syncMentionFromCaret(el.value, el.selectionStart);
          }}
          placeholder={
            isQuestion
              ? t('Ask a question…') || 'Ask a question…'
              : t("What's on your mind, {{name}}?", { name: user?.name?.split(' ')[0] || 'User' }) ||
                `What's on your mind, ${user?.name?.split(' ')[0]}?`
          }
          className="w-full bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground/70 text-base leading-relaxed font-normal min-h-[40px] overflow-y-auto"
          rows={1}
        />
        <MentionAutocomplete
          open={mentionOpen}
          query={mentionQuery}
          onSelect={insertMention}
          onClose={() => {
            setMentionOpen(false);
            setMentionQuery('');
            setMentionStart(null);
          }}
        />
        <div className={`flex justify-between items-center ${files.length > 0 ? 'mt-1' : 'mt-2'}`}>
          {onOpenAIPanel && (
            <button
              onClick={onOpenAIPanel}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-all bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 rounded-full border border-primary/20 shadow-sm"
            >
              <Sparkles size={14} className="text-purple-400 animate-pulse" />
              <span>{t('AI Generate') || 'AI Generate'}</span>
            </button>
          )}
        </div>
      </div>

      {gifUrl ? (
        <div className="px-4 pb-2">
          <div className="relative inline-block max-w-full rounded-xl overflow-hidden border border-border/60 bg-muted/30">
            <img src={gifUrl} alt="GIF" className="max-h-48 max-w-full object-contain" loading="lazy" />
            <button
              type="button"
              onClick={() => onGifUrlChange(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Remove GIF"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {(linkPreview || linkPreviewLoading) && (
        <div className="px-4 pb-2">
          {linkPreviewLoading && !linkPreview ? (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 py-2">
              <Loader2 size={12} className="animate-spin" />
              Loading link preview…
            </p>
          ) : null}
          {linkPreview ? (
            <LinkPreviewCard
              preview={linkPreview}
              compact
              onDismiss={() => {
                const u = firstUrlInText(content);
                if (u) linkPreviewDismissedRef.current = u;
                onLinkPreviewChange(null);
              }}
            />
          ) : null}
        </div>
      )}

      {/* Uploaded Media — live layout preview matches selected template */}
      {files.length > 0 && (() => {
        const active = Math.min(previewIndex, files.length - 1);
        const canEdit = Boolean(onEditMedia && files.some((f) => f.size > 0));
        const editLabel = files.length > 1 ? (t('Edit all') || 'Edit all') : (t('Edit') || 'Edit');
        const photoCount = files.filter(
          (f) =>
            f.type.startsWith('image/') ||
            (!f.type && !/\.(mp4|mov|webm|mkv|m4v|avi)/i.test(f.name || '')),
        ).length;
        const previewTemplate =
          files.length >= 2
            ? layoutTemplate || defaultLayoutForPhotoCount(Math.max(photoCount, files.length))
            : null;
        const layoutMedia = files.map((file, i) => ({
          url: filePreviewUrls[i],
          type:
            file.type.startsWith('video/') ||
            /\.(mp4|mov|webm|mkv|m4v|avi)/i.test(file.name || filePreviewUrls[i] || '')
              ? 'video'
              : 'image',
          order: i,
        }));

        return (
          <div className="mx-4 mb-2 rounded-xl border border-border overflow-hidden bg-black/5 dark:bg-black/40">
            <div className="relative bg-muted/30 max-h-[280px] overflow-hidden">
              {files.length >= 2 && previewTemplate ? (
                <div className="pointer-events-none select-none [&_*]:max-h-[280px]">
                  <PostMediaLayout media={layoutMedia} template={previewTemplate} />
                </div>
              ) : (
                <div className="relative aspect-[4/3] max-h-[240px] bg-muted/40">
                  {layoutMedia[active]?.type === 'video' ? (
                    <video
                      src={layoutMedia[active]?.url}
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                      controls={false}
                      muted
                    />
                  ) : (
                    <img
                      src={layoutMedia[active]?.url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    const preferred =
                      files[active]?.size > 0 ? active : files.findIndex((f) => f.size > 0);
                    onEditMedia?.(preferred >= 0 ? preferred : 0);
                  }}
                  className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-lg bg-white text-neutral-900 px-3 py-1.5 text-[13px] font-semibold shadow-md hover:bg-neutral-100 transition-colors pointer-events-auto"
                >
                  <Pencil size={14} strokeWidth={2.25} />
                  {editLabel}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onClearMedia) onClearMedia();
                  else {
                    for (let i = files.length - 1; i >= 0; i--) onRemoveFile(i);
                  }
                  setPreviewIndex(0);
                }}
                className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-black/55 hover:bg-black/75 text-white transition-colors pointer-events-auto"
                title={t('Remove') || 'Remove'}
              >
                <X size={16} />
              </button>
            </div>

            {(files.length >= 1) && (
              <div className="flex gap-1.5 p-2 overflow-x-auto custom-scrollbar bg-card/80 border-t border-border shrink-0 items-center">
                {files.map((file, idx) => {
                  const url = filePreviewUrls[idx];
                  const vid =
                    file.type.startsWith('video/') ||
                    /\.(mp4|mov|webm|mkv|m4v|avi)/i.test(file.name || url || '');
                  const isDragging = dragFrom === idx;
                  const isDropTarget = dragOver === idx && dragFrom !== null && dragFrom !== idx;
                  return (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-${idx}`}
                      data-media-index={idx}
                      // eslint-disable-next-line react-hooks/refs -- intentional ref access during render (existing behavior)
                      onPointerDown={(e) => onMediaThumbPointerDown(e, idx)}
                      className={`relative shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all touch-none select-none cursor-grab active:cursor-grabbing ${
                        isDragging
                          ? 'border-primary opacity-50 scale-95'
                          : isDropTarget
                            ? 'border-primary ring-2 ring-primary/40 opacity-100'
                            : idx === active
                              ? 'border-primary'
                              : 'border-transparent opacity-80 hover:opacity-100'
                      }`}
                      title="Drag to reorder"
                      aria-label={`Media ${idx + 1}. Drag to reorder.`}
                    >
                      <div className="absolute inset-0 pointer-events-none">
                        {vid ? (
                          <video src={url} className="w-full h-full object-cover" muted draggable={false} />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                        )}
                      </div>
                      <button
                        type="button"
                        data-media-remove
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFile(idx);
                          setPreviewIndex((cur) => {
                            if (idx < cur) return Math.max(0, cur - 1);
                            if (idx === cur) return Math.max(0, Math.min(cur, files.length - 2));
                            return cur;
                          });
                        }}
                        className="absolute top-0.5 right-0.5 z-[1] p-0.5 rounded-full bg-black/60 text-white hover:bg-black"
                        title="Remove"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}
                {files.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0 w-14 h-14 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/70 text-primary flex flex-col items-center justify-center gap-0.5 transition-colors"
                    title={t('Add photo/video') || 'Add photo/video'}
                    aria-label={t('Add photo/video') || 'Add photo/video'}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    <span className="text-[9px] font-bold leading-none">{t('Add') || 'Add'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {files.filter((f) => f.type.startsWith('image/')).length >= 2 && (
        <LayoutTemplatePicker
          photoCount={files.filter((f) => f.type.startsWith('image/')).length}
          value={layoutTemplate}
          onChange={onLayoutTemplateChange}
          previewUrls={files
            .map((f, i) => (f.type.startsWith('image/') ? filePreviewUrls[i] : null))
            .filter(Boolean) as string[]}
        />
      )}

      {musicSelection && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2">
          <Music size={14} className="text-violet-400 shrink-0" />
          <button
            type="button"
            onClick={() => setShowMusicPicker(true)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="text-xs font-bold truncate">{musicSelection.title}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {musicSelection.artist || 'Unknown'}
              {musicSelection.endTime != null
                ? ` · ${formatMusicClock(musicSelection.startTime)}–${formatMusicClock(musicSelection.endTime)}`
                : ''}
              {musicSelection.originalAudioMuted ? ' · original muted' : ''}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onMusicSelectionChange(null)}
            className="p-1 rounded-full hover:bg-violet-500/20 text-muted-foreground"
            title="Remove music"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {poll && <PollComposerEditor poll={poll} onChange={onPollChange} />}
      </div>

      {/* Feeling / Activity Modal */}
      <AnimatePresence>
        {showFeelingModal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 left-4 right-4 bg-card border border-border shadow-2xl rounded-2xl p-4 z-50 max-h-60 overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
              <h5 className="font-bold text-sm">{t('How are you feeling?') || 'How are you feeling?'}</h5>
              <button onClick={() => setShowFeelingModal(false)} className="p-1 hover:bg-muted rounded-full">
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FEELINGS_LIST.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    onFeelingChange(`${item.emoji} ${item.label}`);
                    setShowFeelingModal(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-left transition-colors border border-border/40"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-xs font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 left-4 right-4 bg-card border border-border shadow-2xl rounded-2xl p-4 z-50"
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
              <h5 className="font-bold text-sm flex items-center gap-1.5">
                <MapPin size={14} className="text-cyan-400" />
                {t('Add location') || 'Add location'}
              </h5>
              <button onClick={() => setShowLocationModal(false)} className="p-1 hover:bg-muted rounded-full">
                <X size={14} />
              </button>
            </div>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder={t('City, place, or venue…') || 'City, place, or venue…'}
                autoFocus
                autoComplete="off"
                className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-cyan-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setShowLocationModal(false);
                }}
              />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              {location.trim() && (
                <button
                  type="button"
                  onClick={() => onLocationChange('')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-muted-foreground hover:bg-muted"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emoji Picker Popup */}
      <AnimatePresence>
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50">
            <EmojiPicker
              onSelectEmoji={(emoji) => {
                handleEmojiSelect(emoji);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Action Footer with Rich Icons */}
      <div className="p-3 sm:p-4 border-t border-border flex items-center justify-between bg-card/80 backdrop-blur-md md:rounded-b-2xl shrink-0">
        <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap shrink min-w-0">
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*,video/*" 
            className="hidden" 
          />
          {/* Photo Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-1.5 sm:p-2 rounded-lg bg-muted/60 text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center justify-center"
            title={t('Add Photo/Video') || 'Add Photo/Video'}
          >
            <ImageIcon size={16} />
          </button>

          {/* Emoji Button - Now Opens EmojiPicker */}
          <button
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center ${
              showEmojiPicker ? 'bg-amber-500/20 text-amber-400' : 'bg-muted/60 text-amber-400 hover:bg-amber-500/10'
            }`}
            title={t('Insert Emoji') || 'Insert Emoji'}
          >
            <Smile size={16} />
          </button>

          {/* Feeling / Activity Button */}
          <button
            onClick={() => {
              setShowFeelingModal(prev => !prev);
              setShowLocationModal(false);
              setShowEmojiPicker(false);
            }}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center ${
              showFeelingModal || feeling ? 'bg-pink-500/20 text-pink-400' : 'bg-muted/60 text-pink-400 hover:bg-pink-500/10'
            }`}
            title={t('Feeling / Activity') || 'Feeling / Activity'}
          >
            <Heart size={16} />
          </button>

          {/* Location Tag Button */}
          <button
            onClick={() => {
              setShowLocationModal(prev => !prev);
              setShowFeelingModal(false);
              setShowEmojiPicker(false);
            }}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center ${
              showLocationModal || location ? 'bg-cyan-500/20 text-cyan-400' : 'bg-muted/60 text-cyan-400 hover:bg-cyan-500/10'
            }`}
            title={t('Add Location') || 'Add Location'}
          >
            <MapPin size={16} />
          </button>

          {/* Poll */}
          <button
            type="button"
            onClick={() => {
              setShowFeelingModal(false);
              setShowLocationModal(false);
              setShowEmojiPicker(false);
              onPollChange(poll ? null : emptyPoll());
            }}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center ${
              poll ? 'bg-primary/20 text-primary' : 'bg-muted/60 text-sky-500 hover:bg-sky-500/10'
            }`}
            title={t('Add poll') || 'Add poll'}
          >
            <BarChart2 size={16} />
          </button>

          {/* GIF */}
          <button
            type="button"
            onClick={() => {
              setShowGifPicker(true);
              setShowFeelingModal(false);
              setShowLocationModal(false);
              setShowEmojiPicker(false);
            }}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center ${
              gifUrl ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-muted/60 text-fuchsia-400 hover:bg-fuchsia-500/10'
            }`}
            title={t('Add GIF') || 'Add GIF'}
          >
            <Film size={16} />
          </button>

          {/* Ask a question */}
          <button
            type="button"
            onClick={() => {
              onIsQuestionChange(!isQuestion);
              setShowFeelingModal(false);
              setShowLocationModal(false);
              setShowEmojiPicker(false);
            }}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center ${
              isQuestion
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-muted/60 text-amber-500 hover:bg-amber-500/10'
            }`}
            title={t('Ask a question') || 'Ask a question'}
          >
            <HelpCircle size={16} />
          </button>

          {/* Add Music */}
          <button
            onClick={() => {
              setShowMusicPicker(true);
              setShowFeelingModal(false);
              setShowLocationModal(false);
              setShowEmojiPicker(false);
            }}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg transition-colors flex items-center justify-center ${
              musicSelection ? 'bg-violet-500/20 text-violet-400' : 'bg-muted/60 text-violet-400 hover:bg-violet-500/10'
            }`}
            title={musicSelection ? musicSelection.title : t('Add Music') || 'Add Music'}
          >
            <Music size={16} />
          </button>
        </div>

        <button
          onClick={onNextStep}
          disabled={!canContinue}
          className="shrink-0 px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span>{t('Next') || 'Next'}</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <AudienceSelectorModal
        open={showAudienceModal}
        onClose={() => setShowAudienceModal(false)}
        initialFlags={visibilityFlags}
        initialCustomUsers={customUsers}
        initialHideFromUsers={hideFromUsers}
        onSave={onAudienceChange}
      />

      <MusicPickerModal
        open={showMusicPicker}
        onClose={() => setShowMusicPicker(false)}
        value={musicSelection}
        onApply={onMusicSelectionChange}
      />

      <GifPickerModal
        open={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelect={(gif) => onGifUrlChange(gif.url)}
      />
    </div>
  );
};
