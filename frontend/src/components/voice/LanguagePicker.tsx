import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'bn', name: 'Bengali' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'de', name: 'German' },
];

interface LanguagePickerProps {
  onSelect: (code: string) => void;
  onClose: () => void;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');

  const filteredLanguages = LANGUAGES.filter(l => 
    l.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col max-h-[70vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Select Language</h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-3 border-b border-border relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search languages..."
              className="w-full pl-9 pr-4 py-2 bg-muted rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="overflow-y-auto p-2 no-scrollbar">
            {filteredLanguages.map(lang => (
              <button
                key={lang.code}
                onClick={() => onSelect(lang.code)}
                className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted rounded-xl transition-colors font-medium"
              >
                {lang.name}
              </button>
            ))}
            {filteredLanguages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No languages found
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
