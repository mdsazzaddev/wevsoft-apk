import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square } from 'lucide-react';

interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({ onTranscript }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          // In a real app, send this audio to a speech-to-text API
          // For demo, we'll just simulate a result
          setTimeout(() => {
            onTranscript("search query from voice");
          }, 500);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      monitorAudio();
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsRecording(false);
      setVolume(0);
    }
  };

  const monitorAudio = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const checkAudio = () => {
      analyserRef.current?.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      setVolume(average);

      if (average > 10) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(stopRecording, 2000); // 2s of silence stops recording
      }

      animationFrameRef.current = requestAnimationFrame(checkAudio);
    };
    checkAudio();
  };

  useEffect(() => {
    return () => {
      stopRecording();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-12 -left-1/2 transform -translate-x-1/2 bg-card border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2"
          >
            <div className="flex items-center gap-1 h-4">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
                  animate={{ height: Math.max(4, (volume / 255) * 16 * (Math.random() + 0.5)) }}
                  className="w-1 bg-primary rounded-full"
                  transition={{ type: "tween", duration: 0.1 }}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-2">Listening...</span>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className={`p-2 rounded-full transition-colors ${
          isRecording 
            ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
      </button>
    </div>
  );
};
