import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trash2,
  User,
  MessageSquare,
  Users,
  Clock,
  Cpu,
  Brain,
  Code2,
  Maximize2,
  Minimize2,
  Shrink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevAgent } from '../../../lib/automationApi';
import { AgentGeneralTab } from './tabs/AgentGeneralTab';
import { AgentInstructionsTab } from './tabs/AgentInstructionsTab';
import { AgentAudienceTab } from './tabs/AgentAudienceTab';
import { AgentScheduleTab } from './tabs/AgentScheduleTab';
import { AgentModelTab } from './tabs/AgentModelTab';
import { AgentMemoryTab } from './tabs/AgentMemoryTab';
import { AgentToolsTab } from './tabs/AgentToolsTab';
import { hasAudience } from '@wevsoft/shared/agent-audience';

interface AgentEditorViewProps {
  agent: WevAgent;
  onBack: () => void;
  onUpdated: (agent: WevAgent) => void;
  onDeleted: (agentId: string) => void;
  onOpenProviders: () => void;
  onOpenOwnerProfile: () => void;
  onOpenToolLibrary: () => void;
  /** Overlay shell window controls (optional for inline). */
  panelExpanded?: boolean;
  onToggleExpand?: () => void;
  onMinimize?: () => void;
}

type TabId = 'general' | 'instructions' | 'audience' | 'schedule' | 'model' | 'memory' | 'tools';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'general', label: 'General', icon: User },
  { id: 'instructions', label: 'Instructions', icon: MessageSquare },
  { id: 'audience', label: 'Audience', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: Clock },
  { id: 'model', label: 'Model', icon: Cpu },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'tools', label: 'Tools', icon: Code2 },
];

export const AgentEditorView: React.FC<AgentEditorViewProps> = ({
  agent,
  onBack,
  onUpdated,
  onDeleted,
  onOpenProviders,
  onOpenOwnerProfile,
  onOpenToolLibrary,
  panelExpanded = false,
  onToggleExpand,
  onMinimize,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [draft, setDraft] = useState<Partial<WevAgent>>(agent);
  const [assignedTargetUserIds, setAssignedTargetUserIds] = useState<string[]>(
    (agent.assignedUsers || []).map((a) => a.targetUserId)
  );
  const [assignedUsersDetail, setAssignedUsersDetail] = useState<{ id: string; name: string; avatar?: string }[]>(
    (agent.assignedUsers || [])
      .filter((a) => a.targetUser)
      .map((a) => ({ id: a.targetUser!.id, name: a.targetUser!.name, avatar: a.targetUser!.avatar || undefined }))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateTabScrollState = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(max > 2 && el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    updateTabScrollState();
    el.addEventListener('scroll', updateTabScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateTabScrollState) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateTabScrollState);
    return () => {
      el.removeEventListener('scroll', updateTabScrollState);
      ro?.disconnect();
      window.removeEventListener('resize', updateTabScrollState);
    };
  }, [updateTabScrollState]);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>('[data-active-tab="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    requestAnimationFrame(updateTabScrollState);
  }, [activeTab, updateTabScrollState]);

  const scrollTabs = (dir: -1 | 1) => {
    const el = tabsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.55), behavior: 'smooth' });
  };

  const patch = (update: Partial<WevAgent> | ((prev: Partial<WevAgent>) => Partial<WevAgent>)) => {
    setDraft((prev) => ({ ...prev, ...(typeof update === 'function' ? update(prev) : update) }));
    setDirty(true);
  };

  const handleAssignedChange = (ids: string[]) => {
    setAssignedTargetUserIds(ids);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!draft.name || !draft.name.trim()) {
      toast.error('Agent name is required.');
      setActiveTab('general');
      return;
    }
    setSaving(true);
    try {
      const updated = await automationApi.updateAgent(agent.id, {
        ...draft,
        assignedTargetUserIds: hasAudience(draft.audienceType, 'CUSTOM') ? assignedTargetUserIds : [],
      });
      toast.success('Agent saved');
      setDirty(false);
      onUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await automationApi.deleteAgent(agent.id);
      toast.success('Agent deleted');
      onDeleted(agent.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete agent');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <button type="button" onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-bold text-sm text-foreground truncate flex-1">{draft.name || agent.name}</h3>
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Minimize"
          >
            <Minimize2 size={16} />
          </button>
        )}
        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={panelExpanded ? 'Exit full screen' : 'Full screen'}
          >
            {panelExpanded ? <Shrink size={16} /> : <Maximize2 size={16} />}
          </button>
        )}
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          title="Delete agent"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>

      <div className="flex items-stretch border-b border-border">
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          disabled={!canScrollLeft}
          aria-label="Scroll tabs left"
          className="shrink-0 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          <ChevronLeft size={16} />
        </button>
        <div ref={tabsRef} className="flex flex-1 gap-1 px-1 pt-2 overflow-x-auto no-scrollbar scroll-smooth min-w-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-active-tab={isActive ? 'true' : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap rounded-t-md transition-colors border-b-2 ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={13} /> {tab.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => scrollTabs(1)}
          disabled={!canScrollRight}
          aria-label="Scroll tabs right"
          className="shrink-0 px-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-25 disabled:pointer-events-none"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'general' && <AgentGeneralTab draft={draft} onChange={patch} />}
        {activeTab === 'instructions' && <AgentInstructionsTab draft={draft} onChange={patch} />}
        {activeTab === 'audience' && (
          <AgentAudienceTab
            draft={draft}
            onChange={patch}
            assignedTargetUserIds={assignedTargetUserIds}
            setAssignedTargetUserIds={handleAssignedChange}
            assignedUsersDetail={assignedUsersDetail}
            setAssignedUsersDetail={setAssignedUsersDetail}
          />
        )}
        {activeTab === 'schedule' && <AgentScheduleTab draft={draft} onChange={patch} />}
        {activeTab === 'model' && <AgentModelTab draft={draft} onChange={patch} onOpenProviders={onOpenProviders} />}
        {activeTab === 'memory' && (
          <AgentMemoryTab agentId={agent.id} draft={draft} onChange={patch} onOpenOwnerProfile={onOpenOwnerProfile} />
        )}
        {activeTab === 'tools' && <AgentToolsTab agentId={agent.id} onOpenToolLibrary={onOpenToolLibrary} />}
      </div>

      <div className="px-3 py-2.5 border-t border-border bg-muted/20 flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
        </button>
      </div>
    </div>
  );
};
