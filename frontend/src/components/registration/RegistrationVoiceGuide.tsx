import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

type Props = {
  text: string;
  lang: string;
  label?: string;
};

/**
 * Browser speechSynthesis voice guide — never autoplays; never reads secrets.
 * Failures are swallowed so registration is never blocked.
 */
export default function RegistrationVoiceGuide({ text, lang, label = 'Listen' }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
    setPaused(false);
    utterRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
    stop();
  }, [text, lang, stop]);

  const speak = () => {
    if (muted || typeof window === 'undefined' || !window.speechSynthesis || !text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'en-US';
      u.rate = rate;
      u.onend = () => {
        setSpeaking(false);
        setPaused(false);
      };
      u.onerror = () => {
        setSpeaking(false);
        setPaused(false);
      };
      utterRef.current = u;
      window.speechSynthesis.speak(u);
      setSpeaking(true);
      setPaused(false);
    } catch {
      setSpeaking(false);
    }
  };

  const togglePause = () => {
    try {
      if (!window.speechSynthesis) return;
      if (paused) {
        window.speechSynthesis.resume();
        setPaused(false);
      } else {
        window.speechSynthesis.pause();
        setPaused(true);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2" role="group" aria-label={label}>
      <button
        type="button"
        onClick={speaking && !paused ? togglePause : speak}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-foreground/5 px-3 text-sm font-semibold hover:bg-foreground/10"
        aria-label={speaking && !paused ? 'Pause voice guide' : 'Play voice guide'}
      >
        {speaking && !paused ? <Pause size={16} /> : <Play size={16} />}
        <span>{label}</span>
      </button>
      {speaking && (
        <button type="button" onClick={togglePause} className="min-h-10 rounded-xl px-2 text-xs font-medium text-muted-foreground" aria-label={paused ? 'Resume' : 'Pause'}>
          {paused ? 'Resume' : 'Pause'}
        </button>
      )}
      <button type="button" onClick={speak} className="min-h-10 rounded-xl px-2 text-muted-foreground" aria-label="Replay">
        <RotateCcw size={15} />
      </button>
      <button
        type="button"
        onClick={() => {
          setMuted((m) => !m);
          if (!muted) stop();
        }}
        className="min-h-10 rounded-xl px-2 text-muted-foreground"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
      </button>
      <label className="ml-auto flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Speed
        <select
          className="rounded-lg border border-border bg-background px-1 py-1 text-xs"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          aria-label="Voice speed"
        >
          <option value={0.8}>0.8x</option>
          <option value={1}>1x</option>
          <option value={1.2}>1.2x</option>
        </select>
      </label>
      <p className="sr-only">{text}</p>
    </div>
  );
}
