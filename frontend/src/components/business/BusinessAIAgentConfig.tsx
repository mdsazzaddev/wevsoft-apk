import React, { useState } from 'react';
import { Bot, Save, Trash2, SlidersHorizontal, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const BusinessAIAgentConfig: React.FC = () => {
  const [agentName, setAgentName] = useState('Sales Assistant');
  const [prompt, setPrompt] = useState('You are a helpful sales assistant for Acme Corp. Always be polite and try to gather the customer\'s email address.');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Mock save
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Agent configuration saved');
    }, 800);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm max-w-2xl">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
            <Bot className="w-6 h-6 text-primary" />
            Custom AI Agent
          </h2>
          <p className="text-sm text-muted-foreground">Configure the AI agent that responds to your customers.</p>
        </div>
        <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold uppercase tracking-wider rounded-full border border-green-500/20">
          Active
        </span>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            Agent Name
          </label>
          <input
            type="text"
            aria-label="Agent name"
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            className="w-full px-4 py-2.5 bg-muted/50 rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            System Prompt
          </label>
          <p className="text-xs text-muted-foreground mb-3">Define the persona, rules, and knowledge base the agent should use.</p>
          <textarea
            aria-label="System prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
            Triggers & Rules
          </label>
          <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Auto-reply to new messages outside business hours</span>
              <input name="autoReply" type="checkbox" defaultChecked className="accent-primary w-4 h-4" />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Escalate to human if customer is frustrated</span>
              <input name="escalateHuman" type="checkbox" defaultChecked className="accent-primary w-4 h-4" />
            </label>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-border">
          <button className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-semibold transition-colors">
            <Trash2 className="w-4 h-4" />
            Reset
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
