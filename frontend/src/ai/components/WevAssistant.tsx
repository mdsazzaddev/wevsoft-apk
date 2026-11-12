import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useWevAI } from '../hooks/useWevAI';
import { WevAIClient } from '../client';
import { Sparkles, X, Send, Mic, Paperclip, Loader2, Check, AlertTriangle } from 'lucide-react'
import { ActionRenderer } from './ActionRenderer';

export const WevAssistant: React.FC = () => {
  const { 
    isOpen, toggleAssistant, closeAssistant, messages, isTyping, 
    addMessage, setTyping, pendingAction, 
    setPendingAction, clearPendingAction, conversationId, setConversationId 
  } = useWevAI();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Close when clicking outside chat window
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent | PointerEvent) => {
      const target = event.target as Node;
      const isInsideWindow = chatWindowRef.current?.contains(target);
      const isInsideButton = buttonRef.current?.contains(target);

      if (!isInsideWindow && !isInsideButton) {
        closeAssistant();
      }
    };

    document.addEventListener('pointerdown', handleClickOutside, true);
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen, closeAssistant]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userText = input;
    setInput('');
    addMessage({ role: 'user', content: userText });
    setTyping(true);

    try {
      // Pass the current window location to the Context Engine
      const pageContext = window.location.pathname;
      let featureContext = 'global';
      if (pageContext.includes('/wevmall')) featureContext = 'marketplace';
      else if (pageContext.includes('/academy')) featureContext = 'academic';
      else if (pageContext.includes('/messages')) featureContext = 'wevchat';
      else if (pageContext.includes('/profile')) featureContext = 'profile';
      else if (pageContext === '/' || pageContext === '') featureContext = 'feed';

      const response = await WevAIClient.chat(userText, pageContext, featureContext, conversationId || undefined);
      
      if (response.conversationId) setConversationId(response.conversationId);
      
      // If the AI wants to execute a sensitive tool, intercept it
      if (response.requiresConfirmation) {
        setPendingAction(response.toolCall);
        addMessage({ 
          role: 'assistant', 
          content: response.message || 'I need your permission to perform this action.',
          isAction: true,
          actionDetails: response.toolCall
        });
      } else {
        addMessage({ role: 'assistant', content: response.message || 'Action completed.' });
      }
    } catch (error: any) {
      addMessage({ role: 'system', content: error.message });
    } finally {
      setTyping(false);
    }
  };

  const handleConfirmAction = async (isConfirmed: boolean) => {
    if (!pendingAction) return;
    const action = pendingAction;
    clearPendingAction();
    setTyping(true);

    try {
      const response = await WevAIClient.executeAction(action.toolName, action.args, isConfirmed);
      if (response.success) {
        addMessage({ role: 'system', content: isConfirmed ? 'Action executed successfully.' : 'Action cancelled.' });
      } else {
        addMessage({ role: 'system', content: 'Action failed: ' + response.error });
      }
    } catch (e: any) {
      addMessage({ role: 'system', content: 'Error: ' + e.message });
    } finally {
      setTyping(false);
    }
  };

  return (
    <motion.div 
      drag 
      dragMomentum={false} 
      className="wev-assistant-dock hidden md:flex fixed bottom-6 right-6 z-50 flex-col items-end"
      style={{ touchAction: "none" }}
    >
      
      {/* Chat Window */}
      {isOpen && (
        <div 
          ref={chatWindowRef}
          className="mb-4 w-96 max-w-[90vw] h-[600px] max-h-[80vh] bg-white/70 dark:bg-black/20 dark:bg-black/70 backdrop-blur-xl border border-border shadow-2xl rounded-3xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right"
          onPointerDownCapture={(e) => e.stopPropagation()} // Prevent dragging from inside chat
        >
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-black/5 dark:border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500 rounded-full shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-4 h-4 text-foreground dark:text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Wevsoft</h3>
            </div>
            <button onClick={toggleAssistant} className="p-2 hover:bg-black/5 dark:hover:bg-black/5 dark:bg-white/5 rounded-full transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                {msg.role === 'system' ? (
                  <div className="text-xs text-center w-full text-muted-foreground my-2">{msg.content}</div>
                ) : (
                  <div className={`max-w-[85%] rounded-2xl p-3 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-500 text-foreground dark:text-white shadow-md shadow-indigo-500/20' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-700'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Action Confirmation Card */}
                    {msg.isAction && pendingAction && (
                      <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Confirm Action</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-muted-foreground mb-3 font-mono">
                          {pendingAction.toolName}({JSON.stringify(pendingAction.args)})
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => handleConfirmAction(true)} className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-foreground dark:text-white text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Confirm
                          </button>
                          <button onClick={() => handleConfirmAction(false)} className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-muted-foreground text-xs font-medium py-1.5 rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          {!isTyping && messages.length < 5 && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto custom-scrollbar">
              {window.location.pathname.includes('/wevmall') && (
                <>
                  <button onClick={() => setInput('Help me create a product listing')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Create Listing</button>
                  <button onClick={() => setInput('Improve this product description')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Improve Description</button>
                </>
              )}
              {window.location.pathname.includes('/academy') && (
                <>
                  <button onClick={() => setInput('Generate a quiz for this topic')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Generate Quiz</button>
                  <button onClick={() => setInput('Create a study plan for me')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Study Plan</button>
                </>
              )}
              {window.location.pathname.includes('/messages') && (
                <>
                  <button onClick={() => setInput('Summarize this conversation')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Summarize Chat</button>
                  <button onClick={() => setInput('Translate the last message to English')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Translate</button>
                </>
              )}
              {(window.location.pathname === '/' || window.location.pathname === '') && (
                <>
                  <button onClick={() => setInput('Help me write a new post')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Write Post</button>
                  <button onClick={() => setInput('What is trending in the feed?')} className="whitespace-nowrap px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full hover:bg-indigo-500/20 transition-colors">Summarize Feed</button>
                </>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-md border-t border-black/5 dark:border-border">
            <div className="flex items-end gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl border border-transparent focus-within:border-indigo-500/50 transition-colors">
              <button
                type="button"
                aria-label="Attach file"
                onClick={() => {
                  const el = document.createElement('input');
                  el.type = 'file';
                  el.onchange = (e: any) => {
                    const f = e.target?.files?.[0];
                    if (f) setInput((prev) => (prev ? `${prev} [Attachment: ${f.name}]` : `[Attachment: ${f.name}]`));
                  };
                  el.click();
                }}
                className="p-2 text-muted-foreground hover:text-indigo-500 transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Wevsoft anything..."
                className="flex-1 max-h-32 min-h-[40px] bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none py-2"
                rows={1}
              />
              <button
                type="button"
                aria-label="Voice input"
                onClick={() => {
                  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                    alert('Speech recognition is not supported in this browser.');
                    return;
                  }
                  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  const rec = new SpeechRec();
                  rec.lang = 'en-US';
                  rec.onresult = (ev: any) => {
                    const transcript = ev.results?.[0]?.[0]?.transcript;
                    if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
                  };
                  rec.start();
                }}
                className="p-2 text-muted-foreground hover:text-indigo-500 transition-colors"
              >
                <Mic className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-foreground dark:text-white rounded-xl transition-all shadow-md shadow-indigo-500/20"
              >
                {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button — transparent W mark only (no orb/circle plate). */}
      <button 
        ref={buttonRef}
        onClick={toggleAssistant}
        title={isOpen ? 'Close Wevsoft AI' : 'Open Wevsoft AI'}
        className={`wev-assistant-fab rounded-full transition-all duration-300 flex items-center justify-center group ${
          isOpen 
            ? 'is-open p-3 shadow-2xl bg-gray-900 dark:bg-gray-800 text-foreground dark:text-white hover:scale-105' 
            : 'p-0 bg-transparent shadow-none hover:scale-110'
        }`}
      >
        {isOpen ? (
          <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
        ) : (
          <img
            src="/logo.png"
            alt="Wevsoft AI"
            className="wev-assistant-orb w-10 h-10 object-contain bg-transparent border-0 shadow-none pointer-events-none select-none"
          />
        )}
      </button>

    </motion.div>
  );
};
