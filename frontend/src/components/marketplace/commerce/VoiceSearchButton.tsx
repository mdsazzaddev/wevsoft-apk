import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { motion } from 'motion/react';

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
}

// Add typing for web speech api
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoiceSearchButton({ onResult }: VoiceSearchButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleListen = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setError('Voice search not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      onResult(speechResult);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setError('Could not understand. Please try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={handleListen}
      className={`p-2 rounded-full transition-colors flex items-center justify-center ${
        isListening ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
      }`}
      title={error || "Search by voice"}
    >
      {isListening ? (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Mic className="w-5 h-5" />
        </motion.div>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
