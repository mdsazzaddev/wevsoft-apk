/**
 * Phantom create post — full-page anonymous composer.
 * Opened from the feed teaser (`/phantom` → click composer).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Image as ImageIcon, KeyRound, Mic, Music, Paperclip, PenSquare, Shield, Square, Video, X,
} from 'lucide-react';
import './phantom-ui.css';
import { useStore } from '../../store';
import { GhostAvatar } from './PhantomArt';

type ApiError = Error & { data?: any };

async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useStore.getState().token;
  const isForm = init.body instanceof FormData;
  const r = await fetch(`/api/phantom${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isForm || !init.body ? {} : { 'Content-Type': 'application/json' }),
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j?.error || `http_${r.status}`) as ApiError;
    e.data = j;
    throw e;
  }
  return j;
}

function errText(e: any) {
  const d = e?.data || {};
  if (e?.message === 'pin_locked') return `Too many wrong PINs. This item is locked for ${Math.ceil((d.retryAfterSec || 900) / 60)} min.`;
  if (e?.message === 'bad_pin') return `Wrong PIN. ${d.remaining ?? ''} ${d.remaining === 1 ? 'try' : 'tries'} left before a 15-minute lock.`;
  return (
    {
      rate_limited: 'Slow down a little and try again shortly.',
      empty_post: 'Write something or attach a file.',
      pin_required: 'Set a PIN of at least 4 characters.',
      bad_image: 'That image could not be read.',
      bad_pin_format: 'PIN must be 4–128 characters.',
    } as Record<string, string>
  )[e?.message] || 'Something went wrong. Please try again.';
}

function blip(on: boolean) {
  if (!on) return;
  try {
    const C = (window as any).AudioContext || (window as any).webkitAudioContext;
    const c = new C();
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = 520;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(c.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18);
    o.stop(c.currentTime + 0.2);
  } catch {
    /* ignore */
  }
}

const SETTINGS_KEY = 'phantom.settings';

export default function PhantomCreatePage() {
  const nav = useNavigate();
  const [text, setText] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [accept, setAccept] = useState('image/*');
  const [posting, setPosting] = useState(false);
  const [toastMsg, setToast] = useState<string | null>(null);
  const [sound] = useState(() => {
    try {
      return !!(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').sound);
    } catch {
      return false;
    }
  });
  const [lightMode] = useState(() => {
    try {
      return !!(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}').lightMode);
    } catch {
      return false;
    }
  });
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toast = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(null), 2800);
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const clearRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  useEffect(() => {
    textareaRef.current?.focus();
    return () => {
      clearRecordTimer();
      if (mediaRecorderRef.current?.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      stopStream();
    };
  }, []);

  const pinErr =
    pin.length > 0 && pin.length < 4
      ? 'PIN must be at least 4 characters'
      : pin2 && pin !== pin2
        ? 'PINs do not match'
        : '';

  const pick = (acc: string) => {
    if (recording) return;
    setAccept(acc);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  const stopVoice = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== 'recording') {
      setRecording(false);
      clearRecordTimer();
      stopStream();
      return;
    }
    rec.stop();
  };

  const startVoice = async () => {
    if (recording || posting) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      return toast('Voice recording is not supported in this browser.');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        clearRecordTimer();
        stopStream();
        setRecording(false);
        const type = rec.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 800) {
          toast('Voice note was too short. Hold a bit longer.');
          return;
        }
        const ext = type.includes('ogg') ? 'ogg' : 'webm';
        setFile(new File([blob], `phantom-voice-${Date.now()}.${ext}`, { type }));
        setRecordSecs(0);
      };
      rec.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          if (s + 1 >= 120) {
            // auto-stop at 2 minutes
            queueMicrotask(() => stopVoice());
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast('Microphone permission is required to record a voice note.');
      stopStream();
      setRecording(false);
    }
  };

  const submit = async () => {
    if (!text.trim() && !file) {
      textareaRef.current?.focus();
      return toast('Write something or attach a file.');
    }
    if (pin.length < 4) return toast('Set a Phantom PIN (min 4 characters) to be able to edit or delete this post later.');
    if (pin !== pin2) return toast('PINs do not match.');
    setPosting(true);
    try {
      const fd = new FormData();
      fd.set('content', text);
      fd.set('pin', pin);
      if (file) fd.set('file', file);
      const r = await api('/posts', { method: 'POST', body: fd });
      blip(sound);
      toast('Published as Phantom. Keep your PIN — it cannot be recovered.');
      nav(r?.post?.id ? `/phantom/post/${r.post.id}` : '/phantom', { replace: true });
    } catch (e) {
      toast(errText(e));
    } finally {
      setPosting(false);
    }
  };

  const cls = ['ph-root', 'ph-create-root', lightMode ? 'ph-light' : ''].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <header className="ph-create-top">
        <button type="button" className="ph-icon-btn" aria-label="Back to Phantom" title="Back" onClick={() => nav('/phantom')}>
          <ArrowLeft size={16} />
        </button>
        <div className="ph-create-title">
          <b>Create Phantom Post</b>
          <small>Anonymous · PIN-owned</small>
        </div>
        <button type="button" className="ph-btn-red ph-create-post-btn" disabled={posting} onClick={() => void submit()}>
          <PenSquare size={13} /> {posting ? 'Posting…' : 'Post'}
        </button>
      </header>

      <main className="ph-create-main">
        <div className="ph-card ph-composer ph-create-composer">
          <div className="ph-composer-row ph-create-row">
            <GhostAvatar size={42} />
            <textarea
              id="phantomCreateContent"
              name="phantomCreateContent"
              ref={textareaRef}
              className={text ? 'has' : ''}
              value={text}
              maxLength={5000}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind? Share anonymously..."
              aria-label="Write an anonymous post"
            />
          </div>

          {recording ? (
            <div className="ph-attach ph-voice-rec">
              <span className="ph-voice-dot" aria-hidden />
              Recording voice… {Math.floor(recordSecs / 60)}:{String(recordSecs % 60).padStart(2, '0')}
              <button type="button" className="ph-btn-red" style={{ padding: '4px 10px', fontSize: 11 }} onClick={stopVoice}>
                <Square size={11} /> Stop
              </button>
            </div>
          ) : null}

          {file && !recording ? (
            <div className="ph-attach">
              {file.name.startsWith('phantom-voice-') ? <Mic size={12} /> : <Paperclip size={12} />}
              {' '}
              {file.name.startsWith('phantom-voice-') ? 'Voice note' : file.name}
              {' '}
              ({Math.round(file.size / 1024)} KB)
              <button type="button" className="ph-icon-btn" aria-label="Remove attachment" onClick={() => setFile(null)}>
                <X size={12} />
              </button>
              <span>
                {file.name.startsWith('phantom-voice-')
                  ? 'Voice note will post anonymously as audio.'
                  : 'Photo location/EXIF data is removed. Other files upload as-is.'}
              </span>
            </div>
          ) : null}

          <div className="ph-pin-row ph-create-pin">
            <KeyRound size={13} className="ph-red" />
            <input
              className="ph-input"
              type="password"
              autoComplete="new-password"
              value={pin}
              maxLength={128}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Set Phantom PIN (min 4)"
              aria-label="Set Phantom PIN"
            />
            <input
              className="ph-input"
              type="password"
              autoComplete="new-password"
              value={pin2}
              maxLength={128}
              onChange={(e) => setPin2(e.target.value)}
              placeholder="Confirm PIN"
              aria-label="Confirm Phantom PIN"
            />
            <small className={pinErr ? 'ph-pin-err' : 'ph-muted'}>
              {pinErr || 'Needed to edit or delete this post. It cannot be recovered.'}
            </small>
          </div>

          <div className="ph-composer-tools">
            <button type="button" className="tool" onClick={() => pick('image/*')} disabled={recording}>
              <ImageIcon size={14} /> Photo
            </button>
            <button type="button" className="tool" onClick={() => pick('video/*')} disabled={recording}>
              <Video size={14} /> Video
            </button>
            <button
              type="button"
              className={`tool${recording ? ' on' : ''}`}
              onClick={() => (recording ? stopVoice() : void startVoice())}
              aria-pressed={recording}
              title={recording ? 'Stop recording' : 'Record voice note'}
            >
              {recording ? <Square size={14} /> : <Mic size={14} />} Voice
            </button>
            <button type="button" className="tool" onClick={() => pick('audio/*')} disabled={recording}>
              <Music size={14} /> Audio
            </button>
            <button
              type="button"
              className="tool"
              disabled={recording}
              onClick={() => pick('.pdf,.txt,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv')}
            >
              <FileText size={14} /> File
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept={accept}
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                e.target.value = '';
              }}
            />
            <span className="ph-aud ph-muted" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
              <Shield size={13} /> Anonymous Post
            </span>
          </div>
        </div>
      </main>

      {toastMsg ? <div className="ph-toast" role="status">{toastMsg}</div> : null}
    </div>
  );
}
