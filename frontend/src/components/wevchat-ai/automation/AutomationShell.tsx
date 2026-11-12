import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { automationApi, WevAgent } from '../../../lib/automationApi';
import { AgentListView } from './AgentListView';
import { AgentEditorView } from './AgentEditorView';
import { OwnerProfileEditor } from './OwnerProfileEditor';
import { ToolLibraryView } from './ToolLibraryView';
import { RecordsView } from './RecordsView';
import AIProviderSettings from '../AIProviderSettings';

interface AutomationShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** Render inline (e.g. as a full page body) instead of as an overlay. */
  variant?: 'overlay' | 'inline';
}

type View = 'list' | 'editor' | 'providers' | 'profile' | 'tools' | 'records';
type PanelMode = 'default' | 'expanded' | 'minimized';

export const AutomationShell: React.FC<AutomationShellProps> = ({ isOpen, onClose, variant = 'overlay' }) => {
  const [view, setView] = useState<View>('list');
  const [subViewReturnTo, setSubViewReturnTo] = useState<View>('list');
  const [agents, setAgents] = useState<WevAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('default');

  useEffect(() => {
    if (isOpen || variant === 'inline') {
      // eslint-disable-next-line react-hooks/immutability -- intentional mutation/forward reference (existing behavior)
      loadAgents();
    }
    if (!isOpen && variant === 'overlay') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setPanelMode('default');
    }
     
  }, [isOpen, variant]);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const data = await automationApi.getAgents();
      setAgents(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load AI agents');
    } finally {
      setLoading(false);
    }
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  const goToEditor = (agent: WevAgent) => {
    setSelectedAgentId(agent.id);
    setView('editor');
    setPanelMode('default');
  };

  const goToList = () => {
    setSelectedAgentId(null);
    setView('list');
    setPanelMode('default');
  };

  const toggleExpanded = () => {
    setPanelMode((m) => (m === 'expanded' ? 'default' : 'expanded'));
  };

  const minimizePanel = () => setPanelMode('minimized');
  const restorePanel = () => setPanelMode('default');

  const content = (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden">
      {view !== 'editor' && (
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            {view === 'providers' || view === 'profile' || view === 'tools' || view === 'records' ? (
              <button onClick={() => setView(view === 'records' ? 'tools' : subViewReturnTo)} className="p-1 -ml-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft size={16} />
              </button>
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Bot size={14} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-[13px] leading-tight text-foreground">
                {view === 'providers'
                  ? 'API Keys & Providers'
                  : view === 'profile'
                    ? 'Your Profile'
                    : view === 'tools'
                      ? 'Tool Library'
                      : view === 'records'
                        ? 'Saved Records'
                      : 'AI Automation'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {view === 'providers'
                  ? 'Bring your own key for any agent'
                  : view === 'profile'
                    ? 'Used by agents that reference your info'
                    : view === 'tools'
                      ? 'Connect apps and data your agents can use'
                      : view === 'records'
                        ? 'Orders, leads and bookings captured by your agents'
                      : 'Auto-reply agents for your wevchat'}
              </p>
            </div>
          </div>
          {variant === 'overlay' && (
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        {view === 'list' && (
          <AgentListView
            agents={agents}
            loading={loading}
            onOpenAgent={goToEditor}
            onCreated={(agent) => {
              setAgents((prev) => [...prev, agent]);
              goToEditor(agent);
            }}
            onToggle={(agent, isEnabled) => {
              setAgents((prev) => prev.map((a) => (a.id === agent.id ? { ...a, isEnabled } : a)));
            }}
            onOpenProviders={() => {
              setSubViewReturnTo('list');
              setView('providers');
            }}
            onOpenToolLibrary={() => {
              setSubViewReturnTo('list');
              setView('tools');
            }}
          />
        )}

        {view === 'editor' && selectedAgent && (
          <AgentEditorView
            agent={selectedAgent}
            onBack={goToList}
            panelExpanded={panelMode === 'expanded'}
            onToggleExpand={toggleExpanded}
            onMinimize={minimizePanel}
            onUpdated={(updated) => {
              setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            }}
            onDeleted={(id) => {
              setAgents((prev) => prev.filter((a) => a.id !== id));
              goToList();
            }}
            onOpenProviders={() => {
              setSubViewReturnTo('editor');
              setView('providers');
              setPanelMode('default');
            }}
            onOpenOwnerProfile={() => {
              setSubViewReturnTo('editor');
              setView('profile');
              setPanelMode('default');
            }}
            onOpenToolLibrary={() => {
              setSubViewReturnTo('editor');
              setView('tools');
              setPanelMode('default');
            }}
          />
        )}

        {view === 'providers' && (
          <div className="h-full overflow-y-auto p-3 sm:p-4">
            <AIProviderSettings />
          </div>
        )}

        {view === 'profile' && <OwnerProfileEditor />}

        {view === 'tools' && <ToolLibraryView onOpenRecords={() => setView('records')} />}

        {view === 'records' && <RecordsView />}
      </div>
    </div>
  );

  if (variant === 'inline') {
    const inlineClass =
      panelMode === 'expanded'
        ? 'h-full min-h-[100dvh] bg-card border border-border rounded-none overflow-hidden shadow-sm'
        : 'h-full min-h-[70vh] bg-card border border-border rounded-3xl overflow-hidden shadow-sm';
    return <div className={inlineClass}>{content}</div>;
  }

  const compactPanel =
    view === 'editor'
      ? 'relative w-full sm:w-[560px] h-[min(82dvh,640px)] sm:h-[min(78vh,600px)] bg-background/95 backdrop-blur-2xl border border-border/80 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 text-[13px]'
      : 'relative w-full sm:w-[480px] h-[min(70dvh,520px)] sm:h-[min(68vh,480px)] bg-background/95 backdrop-blur-2xl border border-border/80 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 text-[13px]';

  const panelClass =
    panelMode === 'expanded'
      ? 'relative w-full h-[100dvh] max-h-[100dvh] sm:max-w-none rounded-none border-0 sm:border sm:border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden z-10'
      : panelMode === 'minimized'
        ? 'relative w-full sm:w-80 h-12 sm:h-12 rounded-xl border border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden z-10'
        : compactPanel;

  const shellAlign =
    panelMode === 'minimized'
      ? 'items-end justify-end p-3 sm:p-4'
      : panelMode === 'expanded'
        ? 'items-stretch justify-stretch p-0'
        : 'items-end sm:items-center justify-center p-0 sm:p-4';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-[100] flex ${shellAlign}`}>
          {panelMode !== 'minimized' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm"
            />
          )}
          <motion.div
            layout
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={panelClass}
          >
            {panelMode === 'minimized' && view === 'editor' && selectedAgent ? (
              <div className="flex items-center gap-2 px-3 h-full">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Bot size={16} />
                </div>
                <button
                  type="button"
                  onClick={restorePanel}
                  className="flex-1 min-w-0 text-left"
                  title="Restore"
                >
                  <p className="text-sm font-semibold text-foreground truncate">{selectedAgent.name}</p>
                  <p className="text-[10px] text-muted-foreground">Minimized · tap to restore</p>
                </button>
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Full screen"
                >
                  <Maximize2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={restorePanel}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Restore"
                >
                  <Minimize2 size={15} className="rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              content
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
