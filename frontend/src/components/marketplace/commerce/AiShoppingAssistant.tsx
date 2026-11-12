import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Sparkles, Send, Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AiShoppingAssistant({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string, suggestions?: string[] }[]>([
    {
      role: 'assistant',
      text: "Hi! I'm your WevMall AI assistant. What are you looking for today?",
      suggestions: ["Best deals on electronics", "Trending sneakers", "Gift ideas for men"]
    }
  ]);
  const navigate = useNavigate();

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    const newMsg = { role: 'user' as const, text };
    setMessages(prev => [...prev, newMsg]);
    setQuery('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `I can help you find "${text}". Let me show you some matches in WevMall!`,
      }]);
      
      // After showing the message, redirect to search in 1.5s
      setTimeout(() => {
        onClose();
        navigate(`/wevmall?q=${encodeURIComponent(text)}`);
      }, 1500);
      
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[90%] md:w-[400px] bg-card border-l border-primary/20 z-[101] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-primary/20 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-1">
                    WevMall AI <Sparkles size={12} className="text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground">Shopping Assistant</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-black rounded-tr-sm font-medium' 
                        : 'bg-white/10 text-zinc-200 border border-white/10 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  
                  {msg.suggestions && msg.role === 'assistant' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(s)}
                          className="px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors flex items-center gap-1"
                        >
                          <Search size={10} /> {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start">
                  <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm p-3 flex items-center gap-2 text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-primary/20 bg-black/40">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(query); }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask for recommendations..."
                  className="w-full bg-white/5 border border-white/10 focus:border-primary/50 rounded-full py-2.5 pl-4 pr-12 text-sm text-zinc-100 placeholder:text-muted-foreground focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isTyping}
                  className="absolute right-1.5 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-black disabled:opacity-50 disabled:bg-primary/50 hover:bg-primary/90 transition-colors"
                >
                  <Send size={14} className="ml-0.5" />
                </button>
              </form>
              <div className="text-center mt-2">
                <span className="text-[10px] text-muted-foreground">AI can make mistakes. Verify important info.</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
