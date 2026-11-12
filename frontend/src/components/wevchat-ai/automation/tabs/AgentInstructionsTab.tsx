import React from 'react';
import { WevAgent } from '../../../../lib/automationApi';

interface AgentInstructionsTabProps {
  draft: Partial<WevAgent>;
  onChange: (patch: Partial<WevAgent>) => void;
}

export const AgentInstructionsTab: React.FC<AgentInstructionsTabProps> = ({ draft, onChange }) => {
  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-muted-foreground">System Prompt</label>
        <p className="text-xs text-muted-foreground/70 mb-1.5">How the agent should talk, what tone or persona to take.</p>
        <textarea
          value={draft.systemPrompt || ''}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          rows={6}
          placeholder="You are a friendly assistant replying on behalf of..."
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">Strict Rules</label>
        <p className="text-xs text-muted-foreground/70 mb-1.5">Things the agent should never do or say.</p>
        <textarea
          value={draft.instructions || ''}
          onChange={(e) => onChange({ instructions: e.target.value })}
          rows={6}
          placeholder="Never share pricing without confirming with me first..."
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
        />
      </div>
    </div>
  );
};
