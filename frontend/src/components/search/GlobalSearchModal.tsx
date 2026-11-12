import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, MessageSquare, Image as ImageIcon, Link as LinkIcon, FileText, Clock, Mic } from 'lucide-react';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../../lib/searchApi';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const token = useStore((state) => state.token);
  const navigate = useNavigate();

  const tabs = [
    { id: 'All', icon: Search },
    { id: 'Messages', icon: MessageSquare },
    { id: 'Media', icon: ImageIcon },
    { id: 'Links', icon: LinkIcon },
    { id: 'Files', icon: FileText }
  ];

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !token) return;
    try {
      const res = await globalSearch(token, query, { type: activeTab.toLowerCase() });
      setResults(res.data || []);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl bg-card border border-border shadow-2xl rounded-xl overflow-hidden mx-4 flex flex-col max-h-[80vh]"
        >
          <form onSubmit={handleSearch} className="relative flex items-center p-4 border-b border-border">
            <Search className="w-6 h-6 text-muted-foreground absolute left-6" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Wevsoft..."
              className="w-full pl-12 pr-12 py-3 bg-transparent border-none outline-none text-lg text-foreground placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-12 p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              className="absolute right-4 p-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mic className="w-5 h-5" />
            </button>
          </form>

          <div className="flex px-2 pt-2 border-b border-border overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{tab.id}</span>
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
            {results.length === 0 && !query ? (
              <div className="text-center py-10 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>Type to start searching...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (result.conversationId) {
                        navigate(`/wevchat/${result.conversationId}?msg=${result.id}`);
                        onClose();
                      }
                    }}
                    className="p-3 bg-card border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="font-medium text-foreground">{result.title || result.sender?.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{result.content || result.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
