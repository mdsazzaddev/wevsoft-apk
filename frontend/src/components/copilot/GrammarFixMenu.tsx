import React, { useState } from 'react';
import { SpellCheck } from 'lucide-react';
import { fixGrammar } from '../../lib/copilotApi';
import { useStore } from '../../store';
import toast from 'react-hot-toast';

interface GrammarFixMenuProps {
  text: string;
  onReplace: (newText: string) => void;
}

export const GrammarFixMenu: React.FC<GrammarFixMenuProps> = ({ text, onReplace }) => {
  const [isFixing, setIsFixing] = useState(false);
  const token = useStore(state => state.token);

  const handleFix = async () => {
    if (!text.trim() || !token) return;
    setIsFixing(true);
    const toastId = toast.loading('Fixing grammar...');
    try {
      const res = await fixGrammar(token, text);
      onReplace(res.text);
      toast.success('Grammar fixed', { id: toastId });
    } catch (err) {
      toast.error('Failed to fix grammar', { id: toastId });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <button
      onClick={handleFix}
      disabled={isFixing || !text.trim()}
      className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-muted-foreground rounded-lg hover:bg-primary/10"
      title="Fix Grammar"
    >
      <SpellCheck className="w-5 h-5" />
    </button>
  );
};
