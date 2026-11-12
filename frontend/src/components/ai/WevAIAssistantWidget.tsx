import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, X, Send, Bot, User, Loader2, BookOpen, Briefcase, Video, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

export const WevAIAssistantWidget: React.FC = () => {
  const token = useStore((s) => s.token);
  const [isOpen, setIsOpen] = useState(false);
  const [contextModule, setContextModule] = useState<'GENERAL' | 'SOCIAL' | 'STUDY' | 'JOBS' | 'CREATOR'>('GENERAL');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'USER' | 'AI'; text: string }>>([
    { sender: 'AI', text: '👋 Hi! I am Wevsoft Wevsoft AI Assistant. How can I help you today?' },
  ]);
  const [loading, setLoading] = useState(false);
  const chatWindowRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { sender: 'USER', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/creator-ai-watch-live/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userText, contextModule }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: 'AI', text: data.response }]);
      }
    } catch (e) {
      toast.error('AI response failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        drag
        dragMomentum={false}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-2xl flex items-center justify-center border-2 border-border hover:opacity-95 cursor-grab active:cursor-grabbing"
      >
        <Sparkles size={24} className="animate-pulse pointer-events-none" />
      </motion.button>

      {/* Floating AI Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={chatWindowRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-[999] w-[90vw] sm:w-[420px] h-[580px] bg-card/95 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Window Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-purple-900/40 to-blue-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="text-purple-400" size={20} />
                <div>
                  <h3 className="text-sm font-extrabold text-foreground dark:text-white">Wevsoft Wevsoft AI Assistant</h3>
                  <p className="text-[10px] text-purple-300">Context-Aware AI Companion</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-black/10 dark:bg-white/10 text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Context Selector Bar */}
            <div className="flex gap-1.5 p-2 bg-black/5 dark:bg-white/5 border-b border-border overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setContextModule('GENERAL')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                  contextModule === 'GENERAL' ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setContextModule('SOCIAL')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                  contextModule === 'SOCIAL' ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Social
              </button>
              <button
                onClick={() => setContextModule('STUDY')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                  contextModule === 'STUDY' ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen size={10} /> Study
              </button>
              <button
                onClick={() => setContextModule('JOBS')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                  contextModule === 'JOBS' ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Briefcase size={10} /> Jobs
              </button>
              <button
                onClick={() => setContextModule('CREATOR')}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1 ${
                  contextModule === 'CREATOR' ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Video size={10} /> Creator
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-2 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'AI' && (
                    <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center shrink-0">
                      <Sparkles size={12} className="text-purple-300" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'USER'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-black/10 dark:bg-white/10 border border-border text-foreground rounded-tl-none font-sans whitespace-pre-wrap'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-purple-300 font-mono">
                  <Loader2 size={14} className="animate-spin" /> Thinking...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-black/5 dark:bg-white/5 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Ask AI in ${contextModule} mode...`}
                className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-purple-500/50"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-purple-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 transition-all flex items-center justify-center"
              >
                <Send size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
