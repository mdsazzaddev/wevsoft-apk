import React, { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Plus,
  X,
  BookOpen,
  FileText,
  Table2,
  Wrench,
  ExternalLink,
  Sheet,
  HardDrive,
  Webhook,
  MessageSquareText,
  Save,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevAgentToolJoin, WevToolConnection } from '../../../../lib/automationApi';
import {
  kindSupportsSave,
  parseAgentToolModes,
  type AgentToolModes,
} from '@wevsoft/shared/agent-tool-modes';
import { ToggleSwitch } from '../ToggleSwitch';

interface AgentToolsTabProps {
  agentId: string;
  onOpenToolLibrary: () => void;
}

const KIND_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  WIKIPEDIA: BookOpen,
  DOCUMENTS: FileText,
  CUSTOM_TABLE: Table2,
  GOOGLE_SHEETS: Sheet,
  GOOGLE_DRIVE: HardDrive,
  WEBHOOK: Webhook,
};

function modesOf(join: WevAgentToolJoin): AgentToolModes {
  return parseAgentToolModes(join.config);
}

export const AgentToolsTab: React.FC<AgentToolsTabProps> = ({ agentId, onOpenToolLibrary }) => {
  const [attached, setAttached] = useState<WevAgentToolJoin[]>([]);
  const [library, setLibrary] = useState<WevToolConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [attaching, setAttaching] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
    load();
     
  }, [agentId]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ attached: attachedTools }, libraryTools] = await Promise.all([
        automationApi.getAgentTools(agentId),
        automationApi.getTools(),
      ]);
      setAttached(attachedTools.filter((a) => a.toolConnectionId));
      setLibrary(libraryTools);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const attachedToolIds = useMemo(() => new Set(attached.map((a) => a.toolConnectionId).filter(Boolean)), [attached]);
  const availableToAttach = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return library
      .filter((t) => !attachedToolIds.has(t.id))
      .filter((t) => !q || t.label.toLowerCase().includes(q) || t.kind.toLowerCase().includes(q));
  }, [library, attachedToolIds, pickerQuery]);

  const handleAttach = async (toolId: string) => {
    setAttaching(toolId);
    try {
      const join = await automationApi.attachAgentTool(agentId, toolId);
      setAttached((prev) => [...prev.filter((a) => a.toolConnectionId !== toolId), join]);
      setShowPicker(false);
      setPickerQuery('');
      toast.success('Tool added');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add tool');
    } finally {
      setAttaching(null);
    }
  };

  const handleDetach = async (agentToolId: string) => {
    try {
      await automationApi.detachAgentTool(agentId, agentToolId);
      setAttached((prev) => prev.filter((a) => a.id !== agentToolId));
      toast.success('Tool removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove tool');
    }
  };

  const handleMode = async (join: WevAgentToolJoin, patch: Partial<AgentToolModes>) => {
    setUpdatingId(join.id);
    const prev = join;
    setAttached((list) =>
      list.map((a) =>
        a.id === join.id
          ? {
              ...a,
              config: JSON.stringify({ ...modesOf(a), ...patch }),
            }
          : a
      )
    );
    try {
      const updated = await automationApi.updateAgentTool(agentId, join.id, patch);
      setAttached((list) => list.map((a) => (a.id === join.id ? updated : a)));
    } catch (err: any) {
      setAttached((list) => list.map((a) => (a.id === join.id ? prev : a)));
      toast.error(err.message || 'Failed to update tool');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted-foreground leading-snug">
          Add tools from your library. <span className="text-foreground/80 font-medium">Info</span> lets the AI read them
          while chatting; <span className="text-foreground/80 font-medium">Save</span> lets it store chat notes (table,
          sheet, or webhook).
        </p>
        <button
          type="button"
          onClick={onOpenToolLibrary}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
        >
          Library <ExternalLink size={11} />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Add from library
        </button>
      </div>

      {showPicker && (
        <div className="rounded-xl border border-border bg-muted/20 p-2 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search library tools…"
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-[12px] outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          {library.length === 0 ? (
            <div className="py-4 text-center space-y-2">
              <p className="text-[11px] text-muted-foreground">Your library is empty.</p>
              <button
                type="button"
                onClick={onOpenToolLibrary}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Create a tool in Library →
              </button>
            </div>
          ) : availableToAttach.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-3">
              {pickerQuery.trim() ? 'No matches.' : 'All library tools are already added.'}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {availableToAttach.map((tool) => {
                const Icon = KIND_ICON[tool.kind] || Wrench;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => handleAttach(tool.id)}
                    disabled={attaching === tool.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border border-border hover:border-primary/40 text-left disabled:opacity-50"
                  >
                    <Icon size={14} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-foreground truncate">{tool.label}</p>
                      <p className="text-[10px] text-muted-foreground">{tool.kind.replace(/_/g, ' ')}</p>
                    </div>
                    {attaching === tool.id ? (
                      <Loader2 size={12} className="animate-spin shrink-0" />
                    ) : (
                      <Plus size={12} className="text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {attached.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-8 text-center text-muted-foreground">
          <Wrench size={22} className="opacity-30" />
          <p className="text-[11px] max-w-[16rem]">No tools on this agent yet. Add from your library.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attached.map((join) => {
            const tool = join.toolConnection;
            if (!tool) return null;
            const Icon = KIND_ICON[tool.kind] || Wrench;
            const modes = modesOf(join);
            const canSave = kindSupportsSave(tool.kind);
            const busy = updatingId === join.id;

            return (
              <div key={join.id} className="rounded-xl border border-border bg-card/50 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-foreground truncate">{tool.label}</p>
                    <p className="text-[10px] text-muted-foreground">{tool.kind.replace(/_/g, ' ')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDetach(join.id)}
                    className="p-1 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  <label
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors ${
                      modes.useInfo ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
                    } ${busy ? 'opacity-60' : ''}`}
                  >
                    <MessageSquareText size={13} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground">Info</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        AI reads this tool to answer users
                      </p>
                    </div>
                    <ToggleSwitch
                      size="sm"
                      checked={modes.useInfo}
                      disabled={busy}
                      onChange={(v) => handleMode(join, { useInfo: v })}
                      label={`Info for ${tool.label}`}
                    />
                  </label>

                  <label
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-colors ${
                      modes.useSave && canSave ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
                    } ${busy || !canSave ? 'opacity-60' : ''}`}
                    title={canSave ? undefined : 'Use a Custom Table, Google Sheets, or Webhook to save chats'}
                  >
                    <Save size={13} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground">Save</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {canSave
                          ? 'AI can save chat notes into this tool'
                          : 'Needs Table, Sheets, or Webhook'}
                      </p>
                    </div>
                    <ToggleSwitch
                      size="sm"
                      checked={modes.useSave && canSave}
                      disabled={busy || !canSave}
                      onChange={(v) => handleMode(join, { useSave: v })}
                      label={`Save for ${tool.label}`}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
