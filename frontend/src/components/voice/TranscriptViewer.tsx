import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Copy, Languages, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store';
import { summarizeVoiceNote, translateVoiceNote } from '../../lib/voiceApi';
import { LanguagePicker } from './LanguagePicker';
import toast from 'react-hot-toast';

interface TranscriptViewerProps {
  noteId: string;
  transcript: string;
  originalTranscript?: string;
  isTranslated?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  noteId,
  transcript,
  originalTranscript,
  isTranslated,
  isExpanded,
  onToggle
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const token = useStore(state => state.token);

  const handleCopy = () => {
    const textToCopy = (showOriginal && originalTranscript) ? originalTranscript : transcript;
    navigator.clipboard.writeText(textToCopy);
    toast.success('Copied to clipboard');
  };

  const handleTranslate = async (langCode: string) => {
    setShowLangPicker(false);
    if (!token) return;
    try {
      const toastId = toast.loading('Translating...');
      await translateVoiceNote(token, noteId, langCode);
      toast.success('Translated successfully', { id: toastId });
      // In a real app, this might trigger a state update via websockets or refetch
    } catch (err) {
      toast.error('Translation failed');
    }
  };

  const handleSummarize = async () => {
    if (!token) return;
    try {
      const toastId = toast.loading('Summarizing...');
      await summarizeVoiceNote(token, noteId);
      toast.success('Summary generated', { id: toastId });
    } catch (err) {
      toast.error('Failed to generate summary');
    }
  };

  const displayText = (showOriginal && originalTranscript) ? originalTranscript : transcript;

  return (
    <div className="w-full mt-2 border-t border-border/50 pt-2">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>AI Transcript {isTranslated && !showOriginal ? '(Translated)' : ''}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1">
              <p className="text-sm text-foreground/90 leading-relaxed italic mb-3">
                "{displayText}"
              </p>
              
              <div className="flex items-center flex-wrap gap-2">
                <button 
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
                
                <button 
                  onClick={handleSummarize}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Summarize
                </button>
                
                <button 
                  onClick={() => setShowLangPicker(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  <Languages className="w-3.5 h-3.5" />
                  Translate
                </button>

                {isTranslated && originalTranscript && (
                  <button 
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="text-xs text-primary hover:underline ml-2 font-medium"
                  >
                    {showOriginal ? 'Show Translation' : 'Show Original'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showLangPicker && (
        <LanguagePicker 
          onSelect={handleTranslate} 
          onClose={() => setShowLangPicker(false)} 
        />
      )}
    </div>
  );
};
