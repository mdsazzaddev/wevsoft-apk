import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Wand2, Mic, Paperclip, Image, FileText, X, Sparkles, Command, Square, Loader2, CornerUpLeft, Edit3, Camera, RotateCcw, BarChart2, Calendar, Clock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { wevchatApi } from '../../lib/wevchatApi';
import type { MessageData } from './MessageBubble';
import { ScheduleMessageSheet } from './ScheduleMessageSheet';
import { ScheduledMessagesPanel } from './ScheduledMessagesPanel';
import type { ScheduledMessageItem } from './scheduleUtils';
import { Button, IconButton } from '../ui';
import { messageComposerPlaceholder } from './utils/wevchatThread.logic';

export type { ScheduledMessageItem } from './scheduleUtils';

interface UploadedMedia {
  url: string;
  mediaType: string;
  fileName: string;
  fileSize: number;
  durationSeconds?: number;
  text?: string;
  storageProvider?: string | null;
  driveFileId?: string | null;
}

interface VoiceDraft {
  file: File;
  seconds: number;
}

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onSendMedia: (media: UploadedMedia) => void;
  conversationId?: string;
  onTyping?: () => void;
  onStopTyping?: () => void;
  replyingTo?: MessageData | null;
  onCancelReply?: () => void;
  editingMessage?: MessageData | null;
  onCancelEdit?: () => void;
  onSubmitEdit?: (text: string) => void;
  onSendPoll?: (data: { question: string; options: string[] }) => void;
  onSendEvent?: (data: { eventId: string; title: string; image?: string | null; date?: string; location?: string }) => void;
  onScheduleMessage?: (text: string, scheduledFor: string) => void;
  scheduledMessages?: ScheduledMessageItem[];
  onCancelScheduled?: (id: string) => void;
  onSendScheduledNow?: (id: string) => void;
  onUpdateScheduled?: (id: string, payload: { text?: string; scheduledFor?: string }) => void | Promise<void>;
  isPrivateChat?: boolean;
  onSendGenerate?: (prompt: string) => void;
  /** Optional controls rendered before the attach button (e.g. in-chat search). */
  leadingActions?: React.ReactNode;
  /** Denser composer for the home right-rail embed. */
  compact?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onSendMedia,
  conversationId,
  onTyping,
  onStopTyping,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSubmitEdit,
  onSendPoll,
  onSendEvent,
  onScheduleMessage,
  scheduledMessages = [],
  onCancelScheduled,
  onSendScheduledNow,
  onUpdateScheduled,
  isPrivateChat = false,
  onSendGenerate,
  leadingActions,
  compact = false,
}) => {
  const [text, setText] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voiceDraft, setVoiceDraft] = useState<VoiceDraft | null>(null);
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** Message textarea: kept focused after send so the mobile keyboard stays open. */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const attachButtonRef = useRef<HTMLButtonElement>(null);
  const mediaPickerRef = useRef<HTMLDivElement>(null);
  const mediaPickerButtonRef = useRef<HTMLButtonElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef(0);
  /** What to do when MediaRecorder stops: discard, keep draft, or upload+send. */
  const voiceStopActionRef = useRef<'discard' | 'draft' | 'send'>('draft');
  const typingTimeoutRef = useRef<number | null>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showPollComposer, setShowPollComposer] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [eventHits, setEventHits] = useState<any[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [showScheduledList, setShowScheduledList] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const sendHoldTimerRef = useRef<number | null>(null);
  const suppressSendClickRef = useRef(false);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const capturedBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    if (editingMessage) setText(editingMessage.text || '');
  }, [editingMessage]);

  useEffect(() => {
    const open = () => {
      setShowGenerateModal(true);
      setShowAiModal(false);
      setShowAttachMenu(false);
      setShowSlashMenu(false);
    };
    window.addEventListener('wev-open-ai-composer', open);
    return () => window.removeEventListener('wev-open-ai-composer', open);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(target) &&
        attachButtonRef.current &&
        !attachButtonRef.current.contains(target)
      ) {
        setShowAttachMenu(false);
      }
      if (
        showMediaPicker &&
        mediaPickerRef.current &&
        !mediaPickerRef.current.contains(target) &&
        mediaPickerButtonRef.current &&
        !mediaPickerButtonRef.current.contains(target)
      ) {
        setShowMediaPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu, showMediaPicker]);

  const slashCommands = [
    { cmd: '/generate', desc: 'Create an AI image or video in this chat' },
    { cmd: '/poll', desc: 'Create a group poll' },
    { cmd: '/event', desc: 'Share a campus event' },
    { cmd: '/schedule', desc: 'Send this message later' },
    { cmd: '/ai rewrite', desc: 'Rewrite your draft to sound clearer' },
    { cmd: '/ai grammar', desc: 'Fix grammar & spelling in your draft' },
    { cmd: '/ai translate', desc: 'Translate your draft (English)' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setShowSlashMenu(val.startsWith('/'));

    onTyping?.();
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => onStopTyping?.(), 2000);
  };

  const runQuickAi = async (action: 'rewrite' | 'grammar' | 'translate', base: string) => {
    if (!base.trim()) { toast.error('Type a draft first'); return; }
    try {
      setAiLoading(true);
      const { result } = await wevchatApi.aiAssist(action, base);
      setText(result);
    } catch (e: any) {
      toast.error(e.message || 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectSlashCommand = async (cmd: string) => {
    setShowSlashMenu(false);
    if (cmd === '/generate') {
      const draft = text.replace(/^\/generate\s*/i, '').trim();
      setText('');
      if (draft) setGeneratePrompt(draft);
      setShowGenerateModal(true);
      return;
    }
    if (cmd === '/poll') {
      setText('');
      setShowPollComposer(true);
      return;
    }
    if (cmd === '/event') {
      setText('');
      setShowEventPicker(true);
      setEventLoading(true);
      try {
        const res = await fetch('/api/v1/events');
        const data = await res.json();
        setEventHits(Array.isArray(data?.events) ? data.events.slice(0, 12) : []);
      } catch {
        setEventHits([]);
      } finally {
        setEventLoading(false);
      }
      return;
    }
    if (cmd === '/schedule') {
      const draft = (text.startsWith('/') ? text.replace(/^\/schedule\s*/i, '') : text).trim();
      const cleaned = draft.startsWith('/') ? '' : draft;
      if (!cleaned) {
        toast.error('Type a message first');
        setShowSlashMenu(false);
        return;
      }
      setText(cleaned);
      setShowSchedulePicker(true);
      setShowSlashMenu(false);
      setShowAttachMenu(false);
      setShowScheduledList(false);
      return;
    }
    const draft = text.replace(cmd, '').trim() || text;
    if (cmd === '/ai rewrite') await runQuickAi('rewrite', draft);
    else if (cmd === '/ai grammar') await runQuickAi('grammar', draft);
    else if (cmd === '/ai translate') await runQuickAi('translate', draft);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    if (editingMessage && onSubmitEdit) {
      onSubmitEdit(text.trim());
    } else {
      onSendMessage(text.trim());
    }
    setText('');
    setShowSlashMenu(false);
    onStopTyping?.();
    // Refocus inside the same user gesture so iOS/Android keep the keyboard up (Messenger-style).
    textareaRef.current?.focus({ preventScroll: true });
  };

  const openSchedulePicker = () => {
    if (editingMessage) return;
    if (!text.trim()) {
      toast.error('Type a message first');
      return;
    }
    setShowSchedulePicker(true);
    setShowSlashMenu(false);
    setShowAttachMenu(false);
    setShowScheduledList(false);
  };

  const confirmSchedule = (scheduledFor: string) => {
    if (!text.trim()) {
      toast.error('Type a message first');
      return;
    }
    onScheduleMessage?.(text.trim(), scheduledFor);
    setText('');
    setShowSchedulePicker(false);
    setShowSlashMenu(false);
    onStopTyping?.();
  };

  const clearSendHold = () => {
    if (sendHoldTimerRef.current) {
      window.clearTimeout(sendHoldTimerRef.current);
      sendHoldTimerRef.current = null;
    }
  };

  const onSendPointerDown = () => {
    if (editingMessage || !onScheduleMessage) return;
    suppressSendClickRef.current = false;
    clearSendHold();
    sendHoldTimerRef.current = window.setTimeout(() => {
      suppressSendClickRef.current = true;
      openSchedulePicker();
    }, 450);
  };

  const onSendClick = () => {
    if (suppressSendClickRef.current) {
      suppressSendClickRef.current = false;
      return;
    }
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && editingMessage) onCancelEdit?.();
  };

  const handleAiDraftSubmit = async () => {
    if (!aiDraftPrompt.trim()) return;
    try {
      setAiLoading(true);
      const { result } = await wevchatApi.aiAssist('compose', aiDraftPrompt);
      setText(result);
      setShowAiModal(false);
      setAiDraftPrompt('');
      toast.success('AI drafted response inserted');
    } catch (e: any) {
      toast.error(e.message || 'AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileSelected = async (file: File | undefined, voice = false) => {
    if (!file) return;
    try {
      setUploading(true);
      const media = voice
        ? await wevchatApi.uploadVoice(file, conversationId)
        : await wevchatApi.uploadMedia(file, conversationId);
      onSendMedia(media);
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  /** Upload a batch of files sequentially and send each as its own message. */
  const handleFilesSelected = async (files: File[] | FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 10);
    let sent = 0;
    let failed = 0;
    setUploading(true);
    for (const file of list) {
      try {
        const media = await wevchatApi.uploadMedia(file, conversationId);
        onSendMedia(media);
        sent += 1;
      } catch (e: any) {
        failed += 1;
        toast.error(e.message || `Failed to send ${file.name}`);
      }
    }
    setUploading(false);
    if (failed === 0) toast.success(sent > 1 ? `${sent} items sent` : 'Sent');
    else toast.error(`${failed} of ${list.length} items failed`);
  };

  const uploadAndSendVoice = async (file: File, seconds: number) => {
    try {
      setUploading(true);
      const media = await wevchatApi.uploadVoice(file, conversationId);
      onSendMedia({ ...media, durationSeconds: seconds });
      setVoiceDraft(null);
    } catch (e: any) {
      toast.error(e.message || 'Voice upload failed. Tap send to retry.');
      setVoiceDraft({ file, seconds });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      voiceStopActionRef.current = 'draft';
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const action = voiceStopActionRef.current;
        if (action === 'discard') return;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const seconds = Math.max(1, recordSecondsRef.current);
        if (action === 'send') {
          await uploadAndSendVoice(file, seconds);
          return;
        }
        setVoiceDraft({ file, seconds });
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoice(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      recordTimerRef.current = window.setInterval(() => setRecordSeconds((s) => {
        recordSecondsRef.current = s + 1;
        return s + 1;
      }), 1000);
    } catch {
      toast.error('Microphone permission is required to record a voice note');
    }
  };

  const stopRecording = (action: 'discard' | 'draft' | 'send') => {
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
    recordTimerRef.current = null;
    setIsRecordingVoice(false);
    voiceStopActionRef.current = action;
    mediaRecorderRef.current?.stop();
  };

  const sendVoiceDraft = async () => {
    if (!voiceDraft) return;
    await uploadAndSendVoice(voiceDraft.file, voiceDraft.seconds);
  };

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
  };

  const openCamera = () => {
    setShowAttachMenu(false);
    setShowMediaPicker(false);
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
    setCapturedPhoto(null);
    capturedBlobRef.current = null;
    setCameraReady(false);
    setShowCamera(true);
  };

  const closeCamera = () => {
    stopCameraStream();
    setShowCamera(false);
    setCameraReady(false);
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
    setCapturedPhoto(null);
    capturedBlobRef.current = null;
  };

  useEffect(() => {
    if (!showCamera || capturedPhoto) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cameraStreamRef.current = stream;
        const video = cameraVideoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        if (cancelled) return;
        setShowCamera(false);
        cameraCaptureInputRef.current?.click();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCamera, capturedPhoto]);

  const capturePhoto = () => {
    const video = cameraVideoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) { toast.error('Could not capture photo'); return; }
      capturedBlobRef.current = blob;
      setCapturedPhoto(URL.createObjectURL(blob));
      stopCameraStream();
      setCameraReady(false);
    }, 'image/jpeg', 0.92);
  };

  const retakePhoto = () => {
    if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
    setCapturedPhoto(null);
    capturedBlobRef.current = null;
    openCamera();
  };

  const sendCapturedPhoto = async () => {
    const blob = capturedBlobRef.current;
    if (!blob) return;
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    closeCamera();
    await handleFileSelected(file);
  };

  const shareLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported on this device');
      return;
    }
    setShowAttachMenu(false);
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let label = 'Shared location';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
            { headers: { Accept: 'application/json' } },
          );
          if (res.ok) {
            const data = await res.json();
            if (typeof data?.display_name === 'string' && data.display_name.trim()) {
              label = data.display_name.trim();
            }
          }
        } catch {
          /* coords + maps link are enough */
        }
        onSendMedia({
          url: `https://www.google.com/maps?q=${lat},${lng}`,
          mediaType: 'location',
          fileName: `location:${lat},${lng}`,
          fileSize: 0,
          text: label,
        });
        setSharingLocation(false);
      },
      (err) => {
        setSharingLocation(false);
        toast.error(err.code === 1 ? 'Location permission is required' : 'Could not get your location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  // Release camera tracks if the composer unmounts mid-capture.
  useEffect(() => stopCameraStream, []);
  useEffect(() => () => {
    if (sendHoldTimerRef.current) window.clearTimeout(sendHoldTimerRef.current);
  }, []);

  const iconBtn = compact
    ? 'p-1.5 rounded-lg'
    : 'p-2 sm:p-2.5 rounded-xl';
  const iconSz = compact ? 15 : 18;
  const sendBtn = compact
    ? 'p-1.5 rounded-lg'
    : 'p-2.5 rounded-xl';

  return (
    <div className={`relative shrink-0 mt-auto bg-transparent ${compact
      ? 'p-2 space-y-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]'
      : 'p-3 sm:p-3.5 md:p-5 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
      }`}>
      {(replyingTo || editingMessage) && (
        <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2 min-w-0 text-muted-foreground">
            {editingMessage ? <Edit3 size={14} className="text-blue-500 dark:text-blue-400 shrink-0" /> : <CornerUpLeft size={14} className="text-blue-500 dark:text-blue-400 shrink-0" />}
            <span className="truncate">
              <span className="font-bold text-foreground">{editingMessage ? 'Editing message' : `Replying to ${replyingTo?.sender?.name || 'message'}`}</span>
              {!editingMessage && replyingTo?.text ? `: ${replyingTo.text}` : ''}
            </span>
          </div>
          <button onClick={editingMessage ? onCancelEdit : onCancelReply} className="text-muted-foreground hover:text-foreground shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {scheduledMessages.length > 0 && !editingMessage && (
        <button
          type="button"
          onClick={() => { setShowScheduledList((v) => !v); setShowSchedulePicker(false); }}
          className="w-full flex items-center justify-between bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200"
        >
          <span className="flex items-center gap-2 font-bold">
            <Clock size={14} className="text-amber-400" />
            {scheduledMessages.length} scheduled message{scheduledMessages.length === 1 ? '' : 's'}
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300/80">
            {showScheduledList ? 'Hide' : 'View'}
          </span>
        </button>
      )}

      <AnimatePresence>
        {showSlashMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-4 mb-3 w-80 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl p-2 shadow-2xl z-50 space-y-1"
          >
            <div className="px-3 py-1.5 text-[10px] font-extrabold text-purple-500 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-border">
              <Command size={12} /> Wevsoft AI Slash Commands
            </div>
            {slashCommands.map((item) => (
              <button
                key={item.cmd}
                onClick={() => handleSelectSlashCommand(item.cmd)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-all flex flex-col gap-0.5"
              >
                <span className="font-extrabold text-xs text-foreground font-mono">{item.cmd}</span>
                <span className="text-[11px] text-muted-foreground">{item.desc}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMediaPicker && (
          <motion.div
            ref={mediaPickerRef}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-full left-14 mb-2 z-50 w-44 overflow-hidden rounded-2xl border border-border bg-card/95 backdrop-blur-2xl shadow-2xl"
          >
            <button
              type="button"
              onClick={openCamera}
              disabled={uploading}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
                <Camera size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-foreground">Camera</span>
                <span className="block text-[10px] text-muted-foreground">Take a photo & send</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMediaPicker(false);
                fileInputRef.current?.click();
              }}
              disabled={uploading}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left border-t border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
                <Image size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-foreground">Media</span>
                <span className="block text-[10px] text-muted-foreground">Photo, video or file</span>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAttachMenu && (
          <motion.div
            ref={attachMenuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute bottom-full left-4 mb-3 p-3 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl z-50 grid grid-cols-3 gap-3 w-60"
          >
            <button
              onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-blue-500 dark:text-blue-400 transition-all"
            >
              <Image size={20} />
              <span className="text-[10px] font-bold text-foreground">Photo/Video</span>
            </button>
            <button
              onClick={openCamera}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-emerald-500 dark:text-emerald-400 transition-all"
            >
              <Camera size={20} />
              <span className="text-[10px] font-bold text-foreground">Camera</span>
            </button>
            <button
              onClick={() => { docInputRef.current?.click(); setShowAttachMenu(false); }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-purple-500 dark:text-purple-400 transition-all"
            >
              <FileText size={20} />
              <span className="text-[10px] font-bold text-foreground">Document</span>
            </button>
            <button
              onClick={shareLocation}
              disabled={sharingLocation}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-emerald-500 dark:text-emerald-400 transition-all disabled:opacity-50"
            >
              {sharingLocation ? <Loader2 size={20} className="animate-spin" /> : <MapPin size={20} />}
              <span className="text-[10px] font-bold text-foreground">Location</span>
            </button>
            <button
              onClick={() => { setShowAttachMenu(false); setShowGenerateModal(true); }}
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-blue-500 dark:text-blue-400 transition-all"
            >
              <Sparkles size={20} />
              <span className="text-[10px] font-bold text-foreground">Generate</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-4 right-4 mb-3 bg-card/95 backdrop-blur-2xl border border-blue-500/30 rounded-2xl p-4 shadow-2xl z-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500 dark:text-blue-400" />
                <span className="text-xs font-extrabold text-foreground">Generate in chat</span>
              </div>
              <IconButton label="Close" size="sm" icon={<X size={16} />} onClick={() => setShowGenerateModal(false)} />
            </div>
            <textarea
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="Describe the image or video to create…"
              rows={3}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-blue-500/50 resize-none"
            />
            <p className="text-[10px] text-muted-foreground">Posts as an AI generation bubble. Remix and provenance come next.</p>
            <button
              onClick={() => {
                const prompt = generatePrompt.trim();
                if (!prompt) { toast.error('Write a prompt first'); return; }
                if (onSendGenerate) onSendGenerate(prompt);
                else onSendMessage(prompt);
                setGeneratePrompt('');
                setShowGenerateModal(false);
              }}
              className="w-full py-2 rounded-xl bg-blue-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all"
            >
              Generate
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAiModal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-4 right-4 mb-3 bg-card/95 backdrop-blur-2xl border border-purple-500/30 rounded-2xl p-4 shadow-2xl z-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500 dark:text-purple-400" />
                <span className="text-xs font-extrabold text-foreground dark:text-white">Wevsoft AI Message Drafter</span>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-muted-foreground hover:text-foreground dark:text-white">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={aiDraftPrompt}
              onChange={(e) => setAiDraftPrompt(e.target.value)}
              placeholder="What would you like AI to draft? (e.g. 'Polite acceptance for meeting at 4 PM')"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-purple-500/50"
            />
            <button
              onClick={handleAiDraftSubmit}
              disabled={aiLoading}
              className="w-full py-2 rounded-xl bg-purple-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : null}
              Generate Response
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPollComposer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-4 right-4 mb-3 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl p-4 shadow-2xl z-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-blue-500 dark:text-blue-400" />
                <span className="text-xs font-extrabold">Create poll</span>
              </div>
              <button type="button" onClick={() => setShowPollComposer(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <input
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Ask a question"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs outline-none"
            />
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                value={opt}
                onChange={(e) => setPollOptions((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                placeholder={`Option ${i + 1}`}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs outline-none"
              />
            ))}
            {pollOptions.length < 4 && (
              <button
                type="button"
                onClick={() => setPollOptions((prev) => [...prev, ''])}
                className="text-[11px] font-bold text-primary"
              >
                + Add option
              </button>
            )}
            <Button
              type="button"
              fullWidth
              size="sm"
              onClick={() => {
                const options = pollOptions.map((o) => o.trim()).filter(Boolean);
                if (!pollQuestion.trim() || options.length < 2) {
                  toast.error('Need a question and at least 2 options');
                  return;
                }
                onSendPoll?.({ question: pollQuestion.trim(), options });
                setShowPollComposer(false);
                setPollQuestion('');
                setPollOptions(['', '']);
              }}
            >
              Send poll
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEventPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-4 right-4 mb-3 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl p-4 shadow-2xl z-50 space-y-2 max-h-72 overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-emerald-400" />
                <span className="text-xs font-extrabold">Share an event</span>
              </div>
              <button type="button" onClick={() => setShowEventPicker(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            {eventLoading && <p className="text-[11px] text-muted-foreground">Loading events…</p>}
            {!eventLoading && eventHits.length === 0 && (
              <p className="text-[11px] text-muted-foreground">No events yet. Open /events to create one.</p>
            )}
            {eventHits.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => {
                  onSendEvent?.({
                    eventId: ev.id,
                    title: ev.title,
                    image: ev.coverImage || ev.image || null,
                    date: ev.date,
                    location: ev.location || ev.address,
                  });
                  setShowEventPicker(false);
                }}
                className="w-full text-left p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
              >
                {(ev.coverImage || ev.image) && (
                  <img src={ev.coverImage || ev.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{ev.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{ev.date} {ev.location || ev.address || ''}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduledList && scheduledMessages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-4 right-4 mb-3 bg-card/95 backdrop-blur-2xl border border-amber-500/30 rounded-2xl p-3 shadow-2xl z-50 space-y-2 max-h-72 overflow-y-auto"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <span className="text-xs font-extrabold">Scheduled messages</span>
              </div>
              <button type="button" onClick={() => setShowScheduledList(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <ScheduledMessagesPanel
              items={scheduledMessages}
              onCancel={(id) => onCancelScheduled?.(id)}
              onSendNow={onSendScheduledNow}
              onUpdate={onUpdateScheduled}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSchedulePicker && (
          <ScheduleMessageSheet
            draftText={text.trim()}
            onClose={() => setShowSchedulePicker(false)}
            onSchedule={confirmSchedule}
          />
        )}
      </AnimatePresence>

      {showCamera && (
        <div className="fixed inset-0 z-[90] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-extrabold">{capturedPhoto ? 'Preview' : 'Camera'}</span>
            <button type="button" onClick={closeCamera} className="p-2 rounded-full hover:bg-white/10" aria-label="Close camera">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 relative bg-black overflow-hidden">
            {capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured" className="w-full h-full object-contain" />
            ) : (
              <video ref={cameraVideoRef} playsInline muted autoPlay className="w-full h-full object-cover" />
            )}
            {!capturedPhoto && !cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs font-bold">
                Starting camera…
              </div>
            )}
          </div>
          <div className="p-5 flex items-center justify-center gap-6">
            {capturedPhoto ? (
              <>
                <button type="button" onClick={retakePhoto} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 text-white text-xs font-extrabold">
                  <RotateCcw size={16} /> Retake
                </button>
                <button type="button" onClick={sendCapturedPhoto} disabled={uploading} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-extrabold disabled:opacity-50">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!cameraReady}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
                aria-label="Take photo"
              />
            )}
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
        multiple
        onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
      />
      <input
        type="file"
        ref={cameraCaptureInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
      />
      <input
        type="file"
        ref={docInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
        multiple
        onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ''; }}
      />

      <div className={`flex items-center min-w-0 w-full ${compact ? 'gap-1' : 'gap-1 sm:gap-1.5'}`}>
        {leadingActions}
        <button
          ref={attachButtonRef}
          onClick={() => {
            setShowMediaPicker(false);
            setShowAttachMenu(!showAttachMenu);
          }}
          disabled={uploading}
          className={`${iconBtn} bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95 text-muted-foreground hover:text-foreground transition-all shrink-0 disabled:opacity-50`}
          title="Attachments"
        >
          {uploading ? <Loader2 size={iconSz} className="animate-spin" /> : <Paperclip size={iconSz} />}
        </button>
        <button
          ref={mediaPickerButtonRef}
          type="button"
          onClick={() => {
            setShowAttachMenu(false);
            setShowMediaPicker((v) => !v);
          }}
          disabled={uploading}
          className={`${iconBtn} border transition-all shrink-0 disabled:opacity-50 ${
            showMediaPicker
              ? 'bg-blue-500/15 border-blue-500/30 text-blue-500'
              : 'bg-black/5 dark:bg-white/5 border-border text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95 hover:text-foreground'
          }`}
          title="Camera or media"
          aria-label="Camera or media"
          aria-expanded={showMediaPicker}
        >
          <Image size={iconSz} />
        </button>

        {isRecordingVoice ? (
          <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-full px-5 py-3 flex items-center justify-between text-sm text-red-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-red-500/50" />
              <span className="font-extrabold">Recording {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => stopRecording('discard')} className="text-sm font-bold text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="button" onClick={() => stopRecording('draft')} className="p-2 rounded-full bg-red-500 text-white" title="Stop recording" aria-label="Stop recording">
                <Square size={14} />
              </button>
            </div>
          </div>
        ) : voiceDraft ? (
          <div className="flex-1 bg-blue-500/10 border border-blue-500/30 rounded-full px-5 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <Mic size={17} className="text-blue-500 dark:text-blue-400 shrink-0" />
              <span className="font-bold truncate">Voice note · {Math.floor(voiceDraft.seconds / 60)}:{String(voiceDraft.seconds % 60).padStart(2, '0')}</span>
              <span className="text-[11px] text-muted-foreground">Ready to send</span>
            </div>
            <button type="button" onClick={() => setVoiceDraft(null)} disabled={uploading} className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50" aria-label="Discard voice note">
              <X size={17} />
            </button>
          </div>
        ) : (
          <div className="wevchat-composer flex-1 relative flex items-center min-w-0">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={messageComposerPlaceholder(text, isPrivateChat)}
              className={`w-full min-w-0 outline-none resize-none no-scrollbar touch-manipulation ${compact
                ? 'rounded-2xl pl-2.5 pr-8 py-1.5 text-xs'
                : 'rounded-3xl pl-3.5 pr-10 py-2.5 text-sm'
                } ${
                isPrivateChat
                  ? 'bg-amber-500/10 border border-amber-400/30 text-foreground placeholder:text-amber-700/50 dark:placeholder:text-amber-200/50 focus:border-amber-400/70'
                  : 'bg-background border border-border/60 text-foreground focus:ring-2 focus:ring-primary/30'
              }`}
            />
            <button
              onClick={() => setShowAiModal(!showAiModal)}
              className={`absolute ${compact ? 'right-1 p-1' : 'right-1.5 p-1.5'} rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 dark:hover:bg-purple-500/30 transition-all`}
              title="Wevsoft AI Composer Assistant"
            >
              <Wand2 size={compact ? 13 : 16} />
            </button>
          </div>
        )}

        {text.trim() ? (
          <button
            type="button"
            onClick={onSendClick}
            // Keep focus in the textarea: a tap on the button must not blur it (that closes the mobile keyboard).
            onMouseDown={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              if (e.pointerType !== 'mouse' || e.button === 0) e.preventDefault();
              onSendPointerDown();
            }}
            onPointerUp={clearSendHold}
            onPointerCancel={clearSendHold}
            onContextMenu={(e) => e.preventDefault()}
            className={`${sendBtn} bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all shrink-0 select-none touch-manipulation`}
            title="Send · hold to schedule"
            aria-label="Send message. Hold to schedule"
          >
            <Send size={iconSz} />
          </button>
        ) : isRecordingVoice ? (
          <button
            type="button"
            onClick={() => stopRecording('send')}
            disabled={uploading}
            className={`${sendBtn} bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-50`}
            title="Send voice note"
            aria-label="Send voice note"
          >
            <Send size={iconSz} />
          </button>
        ) : voiceDraft ? (
          <button
            type="button"
            onClick={sendVoiceDraft}
            disabled={uploading}
            className={`${sendBtn} bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-50`}
            title="Send voice note"
            aria-label="Send voice note"
          >
            {uploading ? <Loader2 size={iconSz} className="animate-spin" /> : <Send size={iconSz} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={uploading}
            className={`${sendBtn} bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-50`}
            title="Record voice note"
            aria-label="Record voice note"
          >
            <Mic size={iconSz} />
          </button>
        )}
      </div>
    </div>
  );
};
