import React, { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { X, Search, Check, BrainCircuit, Zap, SendHorizontal, Save, Link2, Plus } from 'lucide-react';

interface NodeConfigPanelProps {
  node: Node | null;
  onClose: () => void;
  onUpdate: (nodeId: string, newConfig: any) => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('instruction');
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  if (!node) return null;

  const config = typeof node.data.config === 'string' ? JSON.parse(node.data.config) : (node.data.config || {});

  const updateField = (field: string, value: any) => {
    onUpdate(node.id, { ...config, [field]: value });
  };

  const fetchUsers = async (q: string) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/users?search=${q}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch(e) { /* ignore */ }
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (config.audienceMode === 'Custom' && node.type === 'trigger') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      fetchUsers(userSearch);
    }
  }, [userSearch, config.audienceMode, node.type]);

  const toggleCustomUser = (userId: string) => {
    const current = config.customUsers || [];
    if (current.includes(userId)) {
      updateField('customUsers', current.filter((id: string) => id !== userId));
    } else {
      updateField('customUsers', [...current, userId]);
    }
  };

  const handleConnectGoogle = () => {
    window.location.href = '/api/v1/oauth/google/connect?token=' + localStorage.getItem('token');
  };

  const renderTriggerConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold mb-1 block">Publicly Available</label>
        <div className="mt-1 flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={config.isPublic || false} 
            onChange={(e) => updateField('isPublic', e.target.checked)} 
            className="w-4 h-4"
          />
          <span className="text-sm">Allow anyone to trigger</span>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold mb-1 block">Mode</label>
        <select 
          value={config.replyMode || 'Always Reply'} 
          onChange={(e) => updateField('replyMode', e.target.value)}
          className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm focus:border-orange-500 outline-none text-[#ccc]"
        >
          <option>Always Reply</option>
          <option>Offline Only</option>
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold mb-1 block">Who can message</label>
        <select 
          value={config.audienceMode || 'All Users'} 
          onChange={(e) => updateField('audienceMode', e.target.value)}
          className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm focus:border-orange-500 outline-none text-[#ccc]"
        >
          <option>All Users</option>
          <option>Friends</option>
          <option>Custom</option>
        </select>
      </div>

      {config.audienceMode === 'Custom' && (
        <div className="mt-4 p-4 border border-[#333] rounded-xl bg-[#141414]">
          <h4 className="text-sm font-bold mb-2 text-[#ccc]">Select Custom Users</h4>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-[4px] py-1.5 pl-8 pr-3 text-sm focus:border-orange-500 outline-none text-[#ccc]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {loadingUsers ? <p className="text-xs text-center text-[#888]">Loading...</p> : 
              users.map(u => (
                <div key={u.id} className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-lg cursor-pointer" onClick={() => toggleCustomUser(u.id)}>
                  <input type="checkbox" checked={(config.customUsers || []).includes(u.id)} readOnly className="w-3 h-3" />
                  <img src={u.avatar || 'https://via.placeholder.com/30'} alt="" className="w-6 h-6 rounded-full" />
                  <span className="text-xs font-medium">{u.name}</span>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );

  const renderAgentConfig = () => {
    return (
      <div className="space-y-6 text-[#ccc]">
        <div>
          <label className="text-xs font-semibold mb-1 block">Source for Prompt (User Message)</label>
          <select 
            className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm focus:border-orange-500 outline-none"
            defaultValue="connected"
          >
            <option value="connected">Connected Chat Trigger Node</option>
          </select>
        </div>
        
        <div>
          <label className="text-xs font-semibold mb-1 block">Prompt (User Message)</label>
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-[#2a2a2a] border-r border-[#333] flex items-center justify-center text-[10px] text-[#888] font-mono rounded-l-[4px]">
              fx
            </div>
            <input 
              type="text" 
              defaultValue="{{ $json.chatInput }}"
              className="w-full bg-[#141414] border border-[#333] rounded-[4px] pl-10 pr-3 py-2 text-sm focus:border-orange-500 outline-none font-mono text-orange-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input name="requireFormat" type="checkbox" className="w-4 h-4 rounded border-[#333] bg-[#141414] checked:bg-orange-500 focus:ring-0" />
          <span className="text-sm">Require Specific Output Format</span>
        </div>

        <div className="flex items-center gap-3">
          <input name="enableFallback" type="checkbox" className="w-4 h-4 rounded border-[#333] bg-[#141414] checked:bg-orange-500 focus:ring-0" />
          <span className="text-sm">Enable Fallback Model</span>
        </div>

        <div className="pt-4 border-t border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">Options</span>
            <button className="text-xs border border-[#444] bg-[#2a2a2a] hover:bg-[#333] px-2 py-1 rounded">
              + Add Option
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold mb-1 block">Instruction (System Prompt)</label>
          <textarea 
            rows={10}
            value={config.instruction || ''} 
            onChange={(e) => updateField('instruction', e.target.value)}
            className="w-full bg-[#141414] border border-[#333] rounded-[4px] p-3 text-sm focus:border-orange-500 outline-none text-white resize-none"
            placeholder="You are my personal business assistant. Always answer politely. Recommend my products. Never discuss politics."
          />
          <p className="text-[10px] text-[#888] mt-1">This instruction dictates how the AI behaves and uses its tools and memory.</p>
        </div>

        {/* Repeat Connectors */}
        <div className="pt-8 flex justify-center gap-12 border-t border-[#333] mt-8">
          <div className="flex flex-col items-center gap-2">
            <button className="w-8 h-8 bg-[#2a2a2a] border border-[#444] hover:bg-[#333] rounded-[8px] flex items-center justify-center">
              <Plus size={16} className="text-gray-300" />
            </button>
            <span className="text-[10px] text-gray-400">Chat Model <span className="text-red-500">*</span></span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button className="w-8 h-8 bg-[#2a2a2a] border border-[#444] hover:bg-[#333] rounded-[8px] flex items-center justify-center">
              <Plus size={16} className="text-gray-300" />
            </button>
            <span className="text-[10px] text-gray-400">Memory</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button className="w-8 h-8 bg-[#2a2a2a] border border-[#444] hover:bg-[#333] rounded-[8px] flex items-center justify-center">
              <Plus size={16} className="text-gray-300" />
            </button>
            <span className="text-[10px] text-gray-400">Tool</span>
          </div>
        </div>
      </div>
    );
  };

  const renderModelConfig = () => {
    const isDefault = node.data.label === 'Default Model';
    return (
      <div className="space-y-6 text-[#ccc]">
        <div>
          <label className="text-xs font-semibold mb-1 block">Provider</label>
          <div className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm text-[#888]">
            {node.data.label as string}
          </div>
        </div>
        {!isDefault && (
          <div>
            <label className="text-xs font-semibold mb-1 block">API Key <span className="text-red-500">*</span></label>
            <input 
              type="password" 
              value={config.apiKey || ''} 
              onChange={(e) => updateField('apiKey', e.target.value)}
              className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm focus:border-orange-500 outline-none text-white"
              placeholder="sk-..."
            />
          </div>
        )}
        {isDefault && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md text-sm text-blue-400">
            This uses the default AI model configured in the Admin Panel. No API key is required.
          </div>
        )}
      </div>
    );
  };

  const renderMemoryConfig = () => {
    const isSimple = node.data.label === 'Simple Memory';
    const isSummary = node.data.label === 'Summary Store';
    return (
      <div className="space-y-6 text-[#ccc]">
        <div>
          <label className="text-xs font-semibold mb-1 block">Memory Type</label>
          <div className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm text-[#888]">
            {node.data.label as string}
          </div>
        </div>
        {isSimple && (
          <div>
            <label className="text-xs font-semibold mb-1 block">Context Window Length</label>
            <select 
              value={config.contextLength || '20 Messages'} 
              onChange={(e) => updateField('contextLength', e.target.value)}
              className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm focus:border-orange-500 outline-none text-white"
            >
              <option value="20 Messages">20 Messages</option>
              <option value="50 Messages">50 Messages</option>
              <option value="100 Messages">100 Messages</option>
              <option value="Unlimited">Unlimited</option>
            </select>
            <p className="text-[10px] text-[#888] mt-1">Number of recent messages to keep in AI's context memory.</p>
          </div>
        )}
        {isSummary && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-md text-sm text-purple-400">
            This memory store automatically writes summaries of the conversations (what AI learned from the user) into a persistent database.
          </div>
        )}
        {!isSimple && !isSummary && (
           <div>
           <label className="text-xs font-semibold mb-1 block">Connection String</label>
           <input 
             type="password" 
             value={config.connectionString || ''} 
             onChange={(e) => updateField('connectionString', e.target.value)}
             className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm focus:border-orange-500 outline-none text-white"
             placeholder="mongodb://..."
           />
         </div>
        )}
      </div>
    );
  };

  const renderToolConfig = () => {
    const isLocal = node.data.label === 'Local File Upload';
    return (
      <div className="space-y-6 text-[#ccc]">
        <div>
          <label className="text-xs font-semibold mb-1 block">Tool Type</label>
          <div className="w-full bg-[#141414] border border-[#333] rounded-[4px] px-3 py-2 text-sm text-[#888]">
            {node.data.label as string}
          </div>
        </div>
        {isLocal ? (
          <div>
             <label className="text-xs font-semibold mb-1 block">Upload Document (Excel/Doc)</label>
             <input type="file" className="text-sm text-white" accept=".xlsx,.xls,.doc,.docx,.pdf,.csv" />
             <p className="text-[10px] text-[#888] mt-1">The AI will use this file as a tool for its knowledge base.</p>
          </div>
        ) : (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-sm text-emerald-400">
            The AI Agent will automatically have access to your {String(node.data.label ?? 'integration')}. Ensure your account is connected in the Integration settings.
          </div>
        )}
      </div>
    );
  };

  const renderActionConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase">Delay before sending (ms)</label>
        <input 
          type="number" 
          value={config.delay || 0} 
          onChange={(e) => updateField('delay', parseInt(e.target.value) || 0)}
          className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-sm"
          placeholder="e.g. 2000"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-muted-foreground uppercase">Fallback Message</label>
        <textarea 
          rows={3}
          value={config.fallbackMessage || ''} 
          onChange={(e) => updateField('fallbackMessage', e.target.value)}
          className="w-full mt-1 bg-background border border-border rounded-lg p-2 text-sm resize-none"
          placeholder="If AI fails, send this..."
        />
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-[95%] h-[90%] bg-[#1f1f1f] border border-[#333] rounded-[16px] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-[60px] border-b border-[#333] flex items-center justify-between px-6 bg-[#1f1f1f]">
          <div className="flex items-center gap-3">
            {node.type === 'trigger' ? <Zap size={20} className="text-white"/> : node.type === 'agent' ? <BrainCircuit size={20} className="text-white"/> : <SendHorizontal size={20} className="text-white"/>}
            <h3 className="font-semibold text-lg text-white leading-tight">{node.data.label as string}</h3>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="text-[#888] hover:text-white text-sm font-medium transition-colors">Docs ↗</a>
            <button onClick={onClose} className="p-1.5 hover:bg-[#333] rounded-md transition-colors">
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* 3 Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: INPUT */}
          <div className="w-[300px] border-r border-[#333] bg-[#1a1a1a] flex flex-col">
            <div className="p-4 uppercase text-[10px] tracking-widest font-bold text-[#888]">Input</div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-[#888] mb-4">→|</span>
              <h4 className="text-white font-semibold mb-6">No input data</h4>
              <button className="px-4 py-2 border border-[#444] hover:bg-[#2a2a2a] rounded-[8px] text-white text-sm font-medium transition-colors">
                Execute previous nodes
              </button>
              <p className="text-[#666] text-xs mt-4">to view input data</p>
            </div>
          </div>

          {/* MIDDLE: PARAMETERS */}
          <div className="flex-1 flex flex-col bg-[#1f1f1f] overflow-y-auto">
            <div className="border-b border-[#333] flex items-center px-2 pt-2 gap-1 sticky top-0 bg-[#1f1f1f] z-10 justify-between">
              <div className="flex">
                <button className="px-4 py-2 text-sm font-semibold text-orange-500 border-b-2 border-orange-500">Parameters</button>
                <button className="px-4 py-2 text-sm font-semibold text-[#888] hover:text-white transition-colors border-b-2 border-transparent">Settings</button>
              </div>
              <button className="mb-2 mr-2 bg-[#ff6d00] hover:bg-[#e66200] text-white text-sm font-semibold px-4 py-2 rounded-[8px] flex items-center gap-2 transition-colors">
                <BrainCircuit size={16} /> Execute step
              </button>
            </div>
            <div className="p-6 max-w-[600px] w-full">
              {node.type === 'trigger' && renderTriggerConfig()}
              {node.type === 'agent' && renderAgentConfig()}
              {node.type === 'action' && renderActionConfig()}
              {node.type === 'model' && renderModelConfig()}
              {node.type === 'memory' && renderMemoryConfig()}
              {node.type === 'tool' && renderToolConfig()}
            </div>
          </div>

          {/* RIGHT: OUTPUT */}
          <div className="w-[300px] border-l border-[#333] bg-[#1a1a1a] flex flex-col">
            <div className="p-4 uppercase text-[10px] tracking-widest font-bold text-[#888]">Output</div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-[#888] mb-4">|→</span>
              <h4 className="text-white font-semibold mb-6">No output data</h4>
              <button className="px-4 py-2 border border-[#444] hover:bg-[#2a2a2a] rounded-[8px] text-white text-sm font-medium transition-colors mb-4">
                Execute step
              </button>
              <p className="text-[#666] text-xs">or <button className="text-orange-500 hover:underline">set mock data</button></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
