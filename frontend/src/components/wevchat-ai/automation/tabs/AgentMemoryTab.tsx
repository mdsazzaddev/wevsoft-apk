import React, { useEffect, useState } from 'react';
import { Loader2, RotateCcw, ExternalLink, MessageSquareText } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevAgent, WevAgentConversationStateEntry } from '../../../../lib/automationApi';
import { ToggleSwitch } from '../ToggleSwitch';
import UserAvatar from '../../../UserAvatar';

interface AgentMemoryTabProps {
  agentId: string;
  draft: Partial<WevAgent>;
  onChange: (patch: Partial<WevAgent>) => void;
  onOpenOwnerProfile: () => void;
}

export const AgentMemoryTab: React.FC<AgentMemoryTabProps> = ({ agentId, draft, onChange, onOpenOwnerProfile }) => {
  const [states, setStates] = useState<WevAgentConversationStateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);

  useEffect(() => {
    automationApi
      .getAgentStates(agentId)
      .then(setStates)
      .catch(() => setStates([]))
      .finally(() => setLoading(false));
  }, [agentId]);

  const handleReset = async (senderId: string) => {
    if (!window.confirm("Reset this contact's memory? The running summary and turn counters will be cleared.")) return;
    setResettingId(senderId);
    try {
      await automationApi.resetAgentState(agentId, senderId);
      setStates((prev) => prev.filter((s) => s.senderId !== senderId));
      toast.success('Memory reset for this contact');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset memory');
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-semibold text-muted-foreground">Messages to Remember</label>
        <p className="text-xs text-muted-foreground/70 mb-1.5">
          How many previous messages with each contact the agent should recall for context.
        </p>
        <input
          type="number"
          min={1}
          max={50}
          value={draft.memoryTurnLimit ?? 10}
          onChange={(e) => onChange({ memoryTurnLimit: Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)) })}
          className="w-32 bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
        />
      </div>

      <div 
        onClick={() => onChange({ summaryEnabled: !(draft.summaryEnabled ?? true) })}
        className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border cursor-pointer hover:bg-muted/40 transition-colors select-none"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Running Summary</p>
          <p className="text-xs text-muted-foreground">Let the agent maintain a per-contact summary automatically. You can read it, not edit it.</p>
        </div>
        <ToggleSwitch checked={draft.summaryEnabled ?? true} onChange={(v) => onChange({ summaryEnabled: v })} />
      </div>

      <div 
        onClick={() => onChange({ useOwnerProfile: !(draft.useOwnerProfile ?? true) })}
        className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border cursor-pointer hover:bg-muted/40 transition-colors select-none"
      >
        <div>
          <p className="text-sm font-semibold text-foreground">Use My Profile Info</p>
          <p className="text-xs text-muted-foreground">Give the agent your saved personal/business info as context when replying.</p>
        </div>
        <ToggleSwitch checked={draft.useOwnerProfile ?? true} onChange={(v) => onChange({ useOwnerProfile: v })} />
      </div>

      <button onClick={onOpenOwnerProfile} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        Edit your profile info <ExternalLink size={13} />
      </button>

      <div className="pt-2 border-t border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Per-Contact Memory (read-only)</p>

        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
          </div>
        ) : states.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <MessageSquareText size={28} className="opacity-30" />
            <p className="text-xs max-w-xs">No conversations yet — memory will appear here once this agent replies to someone.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {states.map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-card border border-border">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar user={s.contact} className="w-7 h-7 shrink-0 text-[10px]" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.contact?.name || 'Unknown contact'}</p>
                      <p className="text-[11px] text-muted-foreground">{s.turnCount} turn{s.turnCount === 1 ? '' : 's'} remembered</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReset(s.senderId)}
                    disabled={resettingId === s.senderId}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0"
                    title="Reset memory for this contact"
                  >
                    {resettingId === s.senderId ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  </button>
                </div>
                {s.summary && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.summary}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
