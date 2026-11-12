import React, { useState, useRef, useEffect } from 'react';
import { Mic, Lock, Trash2, Send, Square, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioVisualizer } from './AudioVisualizer';
import { uploadVoiceNote } from '../../lib/voiceApi';
import { useStore } from '../../store';

interface VoiceNoteRecorderProps {
  conversationId: string;
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ conversationId, onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [sourceNode, setSourceNode] = useState<MediaStreamAudioSourceNode | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  
  const token = useStore(state => state.token);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const ac = new AudioContext();
      setAudioContext(ac);
      const sn = ac.createMediaStreamSource(stream);
      setSourceNode(sn);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = (shouldSend: boolean) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        if (shouldSend) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          onSend(audioBlob, duration);
          if (token) {
             uploadVoiceNote(token, conversationId, audioBlob, duration).catch(console.error);
          }
        }
      };
      
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      
      setIsRecording(false);
      setIsLocked(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isRecording && !isLocked) {
      startRecording();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isRecording && !isLocked) {
      // Logic for determining if it was a lock gesture vs tap vs cancel
      // For simplicity in this UI component, we can just stop and send if they lift pointer
      // Unless they swiped to lock or cancel
      stopRecording(true);
    }
  };

  const handleLock = () => {
    setIsLocked(true);
  };

  const handleCancel = () => {
    stopRecording(false);
    onCancel();
  };

  const handleSend = () => {
    stopRecording(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card rounded-full shadow-lg border border-border h-12 relative w-full max-w-sm mx-auto">
      <AnimatePresence>
        {isRecording ? (
          <motion.div 
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '100%' }}
            exit={{ opacity: 0 }}
            className="flex items-center w-full justify-between px-2"
          >
            <button onClick={handleCancel} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center flex-1 mx-2 overflow-hidden h-full py-1">
               <span className="text-red-500 font-medium text-xs font-mono">{formatTime(duration)}</span>
               {audioContext && sourceNode && (
                 <div className="h-6 w-full flex items-center justify-center opacity-70">
                   <AudioVisualizer audioContext={audioContext} sourceNode={sourceNode} isRecording={isRecording} />
                 </div>
               )}
            </div>

            {isLocked ? (
              <button onClick={handleSend} className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors">
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex flex-col items-center px-2 text-muted-foreground animate-pulse">
                <Lock className="w-4 h-4 mb-1" />
                <span className="text-[10px]">Swipe up</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div className="flex items-center justify-end w-full">
            <button 
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors shadow-lg flex items-center justify-center"
            >
              <Mic className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
