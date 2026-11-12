import React from 'react';
import { useState, useEffect, useRef, Fragment, type ReactNode } from 'react';
import { useStore } from '../store';
import { Send, MoreHorizontal, Image as ImageIcon, X, RefreshCw, MessageCircle, Heart, Smile, Mic, Square, Play, Pause } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import UserAvatar from './UserAvatar';
import SuspendedBadge from './SuspendedBadge';
import { AITextTools } from './ai/AITextTools';
import PostReactionSummary from './social/PostReactionSummary';
import { useDepsChanged } from '../hooks/useValueChanged';

function formatVoiceSeconds(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function CommentVoicePlayer({ src, duration }: { src: string; duration?: number | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [metaDuration, setMetaDuration] = useState(duration || 0);

  // New clip → reset the player state (during render instead of an effect).
  const clipChanged = useDepsChanged([src, duration]);
  if (clipChanged) {
    setMetaDuration(duration || 0);
    setCurrent(0);
    setPlaying(false);
  }

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(() => setPlaying(true)).catch(() => toast.error('Could not play voice comment'));
    }
  };

  return (
    <div className="mt-2 flex max-w-[260px] items-center gap-2 rounded-xl border border-border/60 bg-card px-2.5 py-2">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => setMetaDuration(e.currentTarget.duration || duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice comment' : 'Play voice comment'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary hover:bg-primary/25"
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{
              width: `${metaDuration > 0 ? Math.min(100, (current / metaDuration) * 100) : 0}%`,
            }}
          />
        </div>
        <p className="mt-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {formatVoiceSeconds(current || metaDuration)}
        </p>
      </div>
    </div>
  );
}

export default function PostComments({
  postId,
  variant = 'inline',
  onCommentCreated,
  onCommentsLoaded,
  listHeader,
}: {
  postId: string;
  /** `sheet` fills an Instagram-style bottom sheet (flex scroll + sticky composer). */
  variant?: 'inline' | 'sheet' | 'viewer';
  onCommentCreated?: () => void;
  /** Total visible comments loaded (top-level + replies). */
  onCommentsLoaded?: (count: number) => void;
  /** Optional content rendered above the comment list (inside the scroll area). */
  listHeader?: ReactNode;
}) {
  const token = useStore((s) => s.token);
  const user = useStore((s) => s.user);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const isViewer = variant === 'viewer';

  // Media Attachment States
  const [attachedMediaUrl, setAttachedMediaUrl] = useState<string | null>(null);
  const [attachedMediaType, setAttachedMediaType] = useState<'image' | 'audio' | 'file' | null>(null);
  const [attachedAudioDuration, setAttachedAudioDuration] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef(0);
  const voiceStopActionRef = useRef<'discard' | 'keep'>('keep');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const countTree = (rows: any[]): number =>
    rows.reduce((sum, c) => sum + 1 + (Array.isArray(c.replies) ? c.replies.length : 0), 0);

  const clearAttachment = () => {
    setAttachedMediaUrl(null);
    setAttachedMediaType(null);
    setAttachedAudioDuration(null);
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setComments(list);
        onCommentsLoaded?.(countTree(list));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadCommentFile = async (file: File, asVoice = false, seconds?: number) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload attachment');
      }
      const path = data.path || data.url;
      if (!path) throw new Error('Upload succeeded but no media path returned');
      setAttachedMediaUrl(path);
      if (asVoice || file.type.startsWith('audio/')) {
        setAttachedMediaType('audio');
        setAttachedAudioDuration(Math.max(1, Math.round(seconds || 1)));
        toast.success('Voice note attached');
      } else if (file.type.startsWith('image/')) {
        setAttachedMediaType('image');
        setAttachedAudioDuration(null);
        toast.success('Photo attached');
      } else {
        setAttachedMediaType('file');
        setAttachedAudioDuration(null);
        toast.success('Media attached');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePostComment = async () => {
    if (posting) return;
    if (!newComment.trim() && !attachedMediaUrl) return;
    setPosting(true);
    try {
      const isAudio = attachedMediaType === 'audio';
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          text: newComment,
          parentId: replyTo,
          mediaUrl: isAudio ? null : attachedMediaUrl,
          mediaType: isAudio ? null : attachedMediaType,
          audioUrl: isAudio ? attachedMediaUrl : null,
          audioDuration: isAudio ? attachedAudioDuration : null,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNewComment('');
        setReplyTo(null);
        clearAttachment();
        onCommentCreated?.();
        fetchComments();
      } else {
        toast.error(data.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadCommentFile(file, false);
    } catch (err: any) {
      toast.error(err?.message || 'Error uploading file');
    }
  };

  const startRecording = async () => {
    if (uploading || posting || isRecordingVoice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : undefined;
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      voiceStopActionRef.current = 'keep';
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (voiceStopActionRef.current === 'discard') return;
        const blobType = recorder.mimeType || mime || 'audio/webm';
        const ext = blobType.includes('mp4') ? 'm4a' : 'webm';
        const blob = new Blob(audioChunksRef.current, { type: blobType });
        if (blob.size < 200) {
          toast.error('Voice note was too short');
          return;
        }
        const file = new File([blob], `voice-comment-${Date.now()}.${ext}`, { type: blobType });
        try {
          await uploadCommentFile(file, true, Math.max(1, recordSecondsRef.current));
        } catch (err: any) {
          toast.error(err?.message || 'Voice upload failed');
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      recordTimerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
        if (recordSecondsRef.current >= 120) {
          stopRecording('keep');
        }
      }, 1000);
    } catch {
      toast.error('Microphone permission is required for voice comments');
    }
  };

  const stopRecording = (action: 'discard' | 'keep') => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    setIsRecordingVoice(false);
    voiceStopActionRef.current = action;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  const toggleReaction = async (commentId: string, type: string = 'like') => {
    try {
      const res = await fetch(`/api/comments/${commentId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type })
      });
      if (res.ok) {
        fetchComments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // A plain render function (not a component) so rows keep their DOM + state when this list re-renders.
  const renderComment = (comment: any, isReply = false): ReactNode => {
    const isLiked = comment.reactions?.some((r: any) => r.userId === user?.id && r.type === 'like');
    const likeTotal = Array.isArray(comment.reactions) ? comment.reactions.length : 0;
    const voiceUrl = comment.audioUrl || (comment.mediaType === 'audio' ? comment.mediaUrl : null);

    if (isViewer) {
      return (
        <div className={`flex gap-3 ${isReply ? 'ml-9 mt-3' : 'mt-4 first:mt-1'}`} data-testid="viewer-comment">
          <UserAvatar user={comment.user} className={`${isReply ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-[11px]'} shrink-0`} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[13px] font-bold leading-tight text-[color:var(--ppv-text)]">
              {comment.user?.name || 'Deleted user'}
              <SuspendedBadge user={comment.user} />
            </p>
            {comment.text && (
              <AITextTools
                sourceId={comment.id}
                sourceType="COMMENT"
                originalText={comment.text}
                compact
                textClassName="mt-0.5 text-[13px] leading-snug text-[color:var(--ppv-text)] opacity-90 break-words"
              />
            )}
            {voiceUrl ? <CommentVoicePlayer src={voiceUrl} duration={comment.audioDuration} /> : null}
            {comment.mediaUrl && comment.mediaType !== 'audio' && (
              <div className="mt-2 max-w-[220px] overflow-hidden rounded-xl border border-[color:var(--ppv-border)]">
                <img src={comment.mediaUrl} alt="Comment attachment" className="max-h-52 w-full object-cover" referrerPolicy="no-referrer" />
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[color:var(--ppv-muted)]">
              {!isReply && (
                <>
                  <button type="button" onClick={() => setReplyTo(comment.id)} className="hover:text-[color:var(--ppv-text)] focus-visible:text-[color:var(--ppv-text)]">
                    Reply
                  </button>
                  <span aria-hidden>•</span>
                </>
              )}
              <button
                type="button"
                onClick={() => toggleReaction(comment.id)}
                aria-pressed={!!isLiked}
                className={`hover:text-[color:var(--ppv-text)] ${isLiked ? 'text-red-500 hover:text-red-500' : ''}`}
              >
                Like
              </button>
              <span aria-hidden>•</span>
              <span className="font-medium">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })}</span>
            </div>
            {comment.replies && comment.replies.map((reply: any) => (
              <Fragment key={reply.id}>{renderComment(reply, true)}</Fragment>
            ))}
          </div>
          <button
            type="button"
            onClick={() => toggleReaction(comment.id)}
            aria-label={isLiked ? 'Unlike comment' : 'Like comment'}
            aria-pressed={!!isLiked}
            className="flex h-8 shrink-0 flex-col items-center gap-0.5 self-start rounded-full px-1.5 text-[color:var(--ppv-muted)] transition hover:text-red-500"
          >
            <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : ''} />
            {likeTotal > 0 ? <span className="text-[10px] font-semibold tabular-nums leading-none">{likeTotal}</span> : null}
          </button>
        </div>
      );
    }

    return (
      <div className={`group/cmt flex gap-2.5 ${isReply ? 'ml-9 mt-2.5' : 'mt-3.5 first:mt-0'}`}>
        <UserAvatar user={comment.user} className="h-8 w-8 shrink-0 text-[10px]" />
        <div className="min-w-0 flex-1">
          <div className="flex max-w-full items-start gap-1.5">
            <div className="min-w-0 max-w-[calc(100%-2rem)] rounded-2xl rounded-tl-md bg-muted/80 px-3 py-2 dark:bg-muted/60">
              <div className="mb-0.5">
                <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                  {comment.user?.name || 'Deleted user'}
                  <SuspendedBadge user={comment.user} />
                </span>
              </div>

              {comment.text && (
                <AITextTools
                  sourceId={comment.id}
                  sourceType="COMMENT"
                  originalText={comment.text}
                  compact
                  textClassName="text-[13px] leading-snug text-foreground break-words"
                />
              )}

              {voiceUrl ? <CommentVoicePlayer src={voiceUrl} duration={comment.audioDuration} /> : null}

              {comment.mediaUrl && comment.mediaType !== 'audio' && (
                <div className="mt-2 max-w-sm overflow-hidden rounded-xl border border-border/60 bg-card">
                  <img
                    src={comment.mediaUrl}
                    alt="Comment Attachment"
                    className="max-h-60 w-full rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              data-comment-more
              aria-label="Comment options"
              className="comment-more flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-100 transition-opacity duration-150 hover:bg-muted hover:text-foreground md:opacity-0 group-hover/cmt:opacity-100 group-focus-within/cmt:opacity-100"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          <div className="ml-1.5 mt-1 flex items-center gap-3.5 text-[11px] font-semibold text-muted-foreground">
            <button
              type="button"
              onClick={() => toggleReaction(comment.id)}
              className={`transition-colors hover:text-primary ${isLiked ? 'text-primary' : ''}`}
            >
              Like{comment.reactions?.length > 0 ? ` · ${comment.reactions.length}` : ''}
            </button>
            {!isReply && (
              <button
                type="button"
                onClick={() => setReplyTo(comment.id)}
                className="transition-colors hover:text-foreground"
              >
                Reply
              </button>
            )}
            <span className="font-medium opacity-60">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          {comment.replies && comment.replies.map((reply: any) => (
            <Fragment key={reply.id}>{renderComment(reply, true)}</Fragment>
          ))}
        </div>
      </div>
    );
  };

  const isSheet = variant === 'sheet';
  const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '😎', '🙌', '👍', '🔥', '❤️', '🎉', '😮', '😢', '🙏', '💯', '✨', '👏'];
  const canSend = !posting && (!!newComment.trim() || !!attachedMediaUrl);

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
        <MessageCircle size={26} strokeWidth={1.6} />
      </div>
      <p className="text-sm font-bold text-foreground">No comments yet</p>
      <p className="max-w-[240px] text-xs leading-relaxed text-muted-foreground">
        Be the first to share your thoughts on this post.
      </p>
    </div>
  );

  const loadingState = (
    <div className="space-y-4 px-1 py-3" aria-busy="true" aria-label="Loading comments">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse gap-2.5">
          <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-14 rounded-2xl rounded-tl-md bg-muted/80" style={{ width: `${72 - i * 10}%` }} />
            <div className="ml-1.5 h-2.5 w-24 rounded bg-muted/50" />
          </div>
        </div>
      ))}
    </div>
  );

  const attachmentPreview = attachedMediaUrl ? (
    <div className="relative mb-2 inline-block animate-in slide-in-from-bottom-2 rounded-xl border border-border bg-muted/50 p-1.5">
      {attachedMediaType === 'audio' ? (
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-foreground">
          <Mic size={14} className="text-primary" />
          Voice note · {formatVoiceSeconds(attachedAudioDuration || 1)}
        </div>
      ) : (
        <img src={attachedMediaUrl} className="h-16 w-16 rounded-lg object-cover" alt="" />
      )}
      <button
        type="button"
        onClick={clearAttachment}
        className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-1 text-destructive-foreground shadow hover:opacity-90"
        aria-label="Remove attachment"
      >
        <X size={10} />
      </button>
    </div>
  ) : null;

  const voiceControls = isRecordingVoice ? (
    <div className="mb-2 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300">
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden />
      Recording {formatVoiceSeconds(recordSeconds)}
      <button
        type="button"
        onClick={() => stopRecording('discard')}
        className="ml-auto rounded-full px-2 py-1 hover:bg-rose-500/15"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={() => stopRecording('keep')}
        className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-white"
        aria-label="Stop recording"
      >
        <Square size={12} className="fill-current" />
        Done
      </button>
    </div>
  ) : null;

  const attachImageButton = (className: string) => (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading || isRecordingVoice}
      aria-label="Attach image"
      className={className}
    >
      {uploading && attachedMediaType !== 'audio' ? <RefreshCw className="animate-spin text-sky-500" size={17} /> : <ImageIcon size={18} />}
    </button>
  );

  const micButton = (className: string) => (
    <button
      type="button"
      onClick={() => (isRecordingVoice ? stopRecording('keep') : void startRecording())}
      disabled={uploading || posting}
      aria-label={isRecordingVoice ? 'Stop voice recording' : 'Record voice comment'}
      className={className}
    >
      {uploading && attachedMediaType === 'audio' ? (
        <RefreshCw className="animate-spin text-primary" size={17} />
      ) : isRecordingVoice ? (
        <Square size={16} className="fill-current text-rose-500" />
      ) : (
        <Mic size={18} />
      )}
    </button>
  );

  return (
    <div
      className={
        isViewer
          ? 'flex h-full min-h-0 flex-col'
          : isSheet
          ? 'flex h-full min-h-0 flex-col bg-background'
          : 'mt-2 rounded-b-3xl border-t border-border bg-card/30 px-4 pb-4 pt-4'
      }
    >
      <div
        className={
          isViewer
            ? 'ppv-thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2'
            : isSheet
            ? 'min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-3'
            : 'mb-4 max-h-80 space-y-1 overflow-y-auto'
        }
      >
        {listHeader}
        {loading ? (
          loadingState
        ) : comments.length === 0 ? (
          emptyState
        ) : (
          comments.map((c) => <Fragment key={c.id}>{renderComment(c)}</Fragment>)
        )}
      </div>

      <div
        className={
          isViewer
            ? 'relative shrink-0 border-t border-[color:var(--ppv-border)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3'
            : isSheet
            ? 'shrink-0 border-t border-border/70 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/80'
            : 'pt-1'
        }
      >
        <PostReactionSummary postId={postId} className="mb-1.5" />
        {replyTo && (
          <div className="mb-2 flex items-center justify-between rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
            <span>Replying to comment…</span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded-full px-2 py-0.5 transition-colors hover:bg-primary/15 hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {voiceControls}
        {attachmentPreview}

        {isViewer ? (
          <div className="flex items-center gap-2.5">
            <UserAvatar user={user} className="h-9 w-9 shrink-0 text-xs" />
            <div className="relative flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[color:var(--ppv-border)] bg-[color:var(--ppv-chip)] py-1 pl-4 pr-1 focus-within:border-sky-500/60 focus-within:ring-2 focus-within:ring-sky-500/20">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                aria-label="Write a comment"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' || e.nativeEvent.isComposing || posting) return;
                  e.preventDefault();
                  void handlePostComment();
                }}
                className="min-w-0 flex-1 border-none bg-transparent py-1.5 text-[13px] text-[color:var(--ppv-text)] outline-none placeholder:text-[color:var(--ppv-muted)]"
              />
              <button
                type="button"
                onClick={() => setEmojiOpen((o) => !o)}
                aria-label="Add emoji"
                aria-expanded={emojiOpen}
                className="rounded-full p-1.5 text-[color:var(--ppv-muted)] hover:text-[color:var(--ppv-text)]"
              >
                <Smile size={18} />
              </button>
              {attachImageButton('rounded-full p-1.5 text-[color:var(--ppv-muted)] hover:text-[color:var(--ppv-text)]')}
              {micButton('rounded-full p-1.5 text-[color:var(--ppv-muted)] hover:text-[color:var(--ppv-text)]')}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <button
                type="button"
                onClick={() => void handlePostComment()}
                disabled={!canSend}
                aria-label="Post comment"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow transition hover:bg-sky-400 disabled:opacity-45"
              >
                <Send size={15} className="-translate-x-px translate-y-px" />
              </button>
              {emojiOpen ? (
                <div
                  role="group"
                  aria-label="Emoji"
                  className="absolute bottom-[calc(100%+8px)] right-0 z-10 grid w-[232px] grid-cols-8 gap-0.5 rounded-2xl border border-[color:var(--ppv-border)] bg-[color:var(--ppv-panel)] p-2 shadow-2xl"
                >
                  {QUICK_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className="rounded-lg p-1 text-lg leading-none hover:bg-[color:var(--ppv-chip)]"
                      onClick={() => {
                        setNewComment((c) => c + em);
                        setEmojiOpen(false);
                        inputRef.current?.focus();
                      }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
        <div className="flex items-end gap-2.5">
          <UserAvatar user={user} className="mb-0.5 h-9 w-9 shrink-0 text-xs" />

          <div className="relative flex flex-1 items-center gap-1.5 rounded-full border border-border/80 bg-muted/70 px-2.5 py-1 shadow-sm transition-shadow focus-within:border-primary/40 focus-within:bg-muted focus-within:ring-2 focus-within:ring-primary/15">
            {attachImageButton('rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground')}
            {micButton('rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground')}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing || posting) return;
                e.preventDefault();
                void handlePostComment();
              }}
              className="min-w-0 flex-1 border-none bg-transparent py-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70"
            />

            <button
              type="button"
              onClick={() => void handlePostComment()}
              disabled={!canSend}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                canSend
                  ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/95'
                  : 'bg-transparent text-muted-foreground/40'
              }`}
              aria-label="Post comment"
            >
              <Send size={15} className={canSend ? 'translate-x-px' : ''} />
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
