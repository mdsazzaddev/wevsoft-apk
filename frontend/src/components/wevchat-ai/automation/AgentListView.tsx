import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Bot, ChevronRight, Key, Wrench, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevAgent } from '../../../lib/automationApi';
import { formatAudienceLabel, parseAudienceTypes } from '@wevsoft/shared/agent-audience';
import { ToggleSwitch } from './ToggleSwitch';

const AUDIENCE_COLOR: Record<string, string> = {
  ALL_PUBLIC: 'bg-emerald-500/10 text-emerald-500',
  ONLY_FRIENDS: 'bg-blue-500/10 text-blue-500',
  ONLY_FOLLOWERS: 'bg-sky-500/10 text-sky-500',
  CUSTOM: 'bg-purple-500/10 text-purple-500',
  PRIVATE: 'bg-muted text-muted-foreground',
  MIXED: 'bg-primary/10 text-primary',
};

function audienceBadgeClass(raw: string): string {
  const types = parseAudienceTypes(raw);
  if (types.length > 1) return AUDIENCE_COLOR.MIXED;
  return AUDIENCE_COLOR[types[0]] || AUDIENCE_COLOR.PRIVATE;
}

interface AgentListViewProps {
  agents: WevAgent[];
  loading: boolean;
  onOpenAgent: (agent: WevAgent) => void;
  onCreated: (agent: WevAgent) => void;
  onToggle: (agent: WevAgent, isEnabled: boolean) => void;
  onOpenProviders: () => void;
  onOpenToolLibrary: () => void;
}

export const AgentListView: React.FC<AgentListViewProps> = ({ agents, loading, onOpenAgent, onCreated, onToggle, onOpenProviders, onOpenToolLibrary }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Agent name is required.');
      return;
    }
    setCreating(true);
    try {
      const agent = await automationApi.createAgent({ name: newName.trim(), audienceType: 'PRIVATE', isEnabled: false });
      toast.success('Agent created');
      setShowCreate(false);
      setNewName('');
      onCreated(agent);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (agent: WevAgent, next: boolean) => {
    setTogglingId(agent.id);
    try {
      await automationApi.toggleAgent(agent.id, next);
      onToggle(agent, next);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update agent');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
        {loading && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="animate-spin" size={18} />
          </div>
        )}

        {!loading && agents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
            <Bot size={28} className="opacity-30" />
            <p className="text-xs max-w-[16rem]">
              No AI agents yet. Create one to start auto-replying to your messages while you're away.
            </p>
          </div>
        )}

        {agents.map((agent) => (
          <div
            key={agent.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenAgent(agent)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenAgent(agent);
              }
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-[13px] text-foreground truncate">{agent.name}</span>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${audienceBadgeClass(agent.audienceType)}`}>
                  {formatAudienceLabel(agent.audienceType)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {agent.description || agent.instructions || 'No description yet'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div 
                className={togglingId === agent.id ? 'opacity-50 pointer-events-none' : ''}
                onClick={(e) => e.stopPropagation()}
              >
                <ToggleSwitch size="sm" checked={agent.isEnabled} onChange={(next) => handleToggle(agent, next)} label={`Enable ${agent.name}`} />
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-2.5 border-t border-border bg-muted/20 flex items-center gap-1.5">
        <button
          onClick={() => setShowCreate(true)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={14} /> Create Agent
        </button>
        <button
          onClick={onOpenToolLibrary}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-foreground transition-colors"
          title="Tool Library"
        >
          <Wrench size={14} />
        </button>
        <button
          onClick={onOpenProviders}
          className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-foreground transition-colors"
          title="API Keys & Providers"
        >
          <Key size={14} />
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground">New Agent</h4>
                <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <label className="text-xs font-semibold text-muted-foreground">Agent Name</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder='e.g. "Business Support"'
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                />
                <p className="text-xs text-muted-foreground">You can configure instructions, audience, and schedule after creating.</p>
              </div>
              <div className="p-4 border-t border-border flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {creating && <Loader2 size={14} className="animate-spin" />} Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
