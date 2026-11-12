import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { VoiceWaveform } from './VoiceWaveform';
import { TranscriptViewer } from './TranscriptViewer';
import { useStore } from '../../store';

interface VoiceNotePlayerProps {
  noteId: string;
  audioUrl: string;
  duration: number;
  waveformData?: number[];
  senderAvatar?: string;
  transcript?: string;
  isTranslated?: boolean;
  originalTranscript?: string;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  noteId,
  audioUrl,
  duration,
  waveformData = [],
  senderAvatar,
  transcript,
  isTranslated,
  originalTranscript,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const token = useStore(state => state.token);

  useEffect(() => {
    audioRef.current = new Audio(audioUrl);
    
    audioRef.current.addEventListener('timeupdate', () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setProgress(audioRef.current.currentTime / duration);
      }
    });

    audioRef.current.addEventListener('ended', () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    });

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [audioUrl, duration]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const cycleSpeed = () => {
    const rates = [1, 1.5, 2, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Generate random dummy waveform if none provided
  const visualWaveform = waveformData.length > 0 
    ? waveformData 
    // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
    : Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2);

  return (
    <div className="flex flex-col gap-2 max-w-sm w-full bg-card rounded-2xl p-3 shadow-sm border border-border">
      <div className="flex items-center gap-3">
        {senderAvatar && (
          <img src={senderAvatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        )}
        
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white fill-current" />
          ) : (
            <Play className="w-5 h-5 text-white fill-current ml-0.5" />
          )}
        </button>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-8 w-full">
            <VoiceWaveform 
              waveformData={visualWaveform} 
              progress={progress} 
            />
          </div>
          <div className="flex items-center justify-between mt-1 px-1">
            <span className="text-[10px] text-muted-foreground font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button 
              onClick={cycleSpeed}
              className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground hover:bg-muted/80 font-medium"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>

      {transcript && (
        <div className="mt-2">
          <TranscriptViewer
            noteId={noteId}
            transcript={transcript}
            originalTranscript={originalTranscript}
            isTranslated={isTranslated}
            isExpanded={showTranscript}
            onToggle={() => setShowTranscript(!showTranscript)}
          />
        </div>
      )}
    </div>
  );
};
