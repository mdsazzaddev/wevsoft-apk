import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store';
import { createPoll } from '../../lib/collaborationApi';
import toast from 'react-hot-toast';

interface CreatePollModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ conversationId, isOpen, onClose }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([{ id: '1', text: '' }, { id: '2', text: '' }]);
  const [isMultiple, setIsMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useStore(state => state.token);

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, { id: Date.now().toString(), text: '' }]);
  };

  const removeOption = (id: string) => {
    if (options.length <= 2) return;
    setOptions(options.filter(opt => opt.id !== id));
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map(o => o.text.trim()).filter(Boolean);
    
    if (!question.trim()) return toast.error('Question is required');
    if (validOptions.length < 2) return toast.error('At least 2 options are required');
    if (!token) return;

    setIsSubmitting(true);
    try {
      await createPoll(token, conversationId, {
        question: question.trim(),
        options: validOptions,
        isMultipleChoice: isMultiple,
        isAnonymous,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
      });
      toast.success('Poll created successfully');
      onClose();
    } catch (err) {
      toast.error('Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground">Create Poll</h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full px-4 py-2 bg-muted/50 rounded-lg text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/50"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground mb-1">Options</label>
              {options.map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => handleOptionChange(opt.id, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 px-4 py-2 bg-muted/50 rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/50"
                  />
                  {options.length > 2 && (
                    <button 
                      type="button" 
                      onClick={() => removeOption(opt.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="w-full flex items-center justify-center gap-2 py-2 mt-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-foreground">Allow multiple answers</span>
                <input type="checkbox" checked={isMultiple} onChange={e => setIsMultiple(e.target.checked)} className="accent-primary w-4 h-4" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-foreground">Anonymous voting</span>
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="accent-primary w-4 h-4" />
              </label>
              <div>
                <span className="block text-sm font-medium text-foreground mb-1">Ends at</span>
                <input 
                  type="datetime-local" 
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-2 bg-muted/50 rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent focus:border-primary/50"
                />
              </div>
            </div>
          </form>

          <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Poll'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
