import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store';
import { inChatSearch } from '../../lib/searchApi';

interface InChatSearchBarProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateMatch: (messageId: string) => void;
}

export const InChatSearchBar: React.FC<InChatSearchBarProps> = ({
  conversationId,
  isOpen,
  onClose,
  onNavigateMatch
}) => {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = useStore((state) => state.token);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setQuery('');
      setMatches([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim() || !token) {
        setMatches([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await inChatSearch(token, conversationId, query);
        setMatches(res.data || []);
        setCurrentIndex(0);
        if (res.data?.length > 0) {
          onNavigateMatch(res.data[0].id);
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [query, conversationId, token, onNavigateMatch]);

  const handleNext = () => {
    if (matches.length === 0) return;
    const next = (currentIndex + 1) % matches.length;
    setCurrentIndex(next);
    onNavigateMatch(matches[next].id);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const prev = (currentIndex - 1 + matches.length) % matches.length;
    setCurrentIndex(prev);
    onNavigateMatch(matches[prev].id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="absolute top-0 left-0 right-0 z-20 bg-card border-b border-border shadow-sm p-3 flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="w-full pl-9 pr-4 py-2 bg-muted/50 rounded-full border border-transparent focus:border-primary/50 focus:bg-card outline-none text-sm transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
            {query.trim() && (
              <span>
                {matches.length > 0 ? `${currentIndex + 1} of ${matches.length}` : '0 results'}
              </span>
            )}
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <button
                onClick={handlePrev}
                disabled={matches.length === 0}
                className="p-1.5 hover:bg-muted rounded-md disabled:opacity-50 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={matches.length === 0}
                className="p-1.5 hover:bg-muted rounded-md disabled:opacity-50 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted hover:text-foreground rounded-md ml-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
