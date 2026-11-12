import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Save, Settings, Plus, Layout, Maximize, Minimize, X, Search, Zap, BrainCircuit, SendHorizontal, Mail, FileSpreadsheet, GitBranch, ChevronDown, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { NodeConfigPanel } from './NodeConfigPanel';
import { TriggerNode } from './TriggerNode';
import { AgentNode } from './AgentNode';
import { ActionNode } from './ActionNode';
import { ModelNode } from './ModelNode';
import { MemoryNode } from './MemoryNode';
import { ToolNode } from './ToolNode';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  action: ActionNode,
  model: ModelNode,
  memory: MemoryNode,
  tool: ToolNode,
};

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const WorkflowBuilder: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [workflowName, setWorkflowName] = useState('Customer Support Auto-Reply');

  const [workflowId, setWorkflowId] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isNodeSelectorOpen, setIsNodeSelectorOpen] = useState(false);
  const [nodeSearch, setNodeSearch] = useState('');
  const [parentNodeContext, setParentNodeContext] = useState<{nodeId: string, connectorType: string} | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleOpenPicker = (e: any) => {
      setParentNodeContext(e.detail);
      setIsNodeSelectorOpen(true);
    };
    window.addEventListener('openNodePicker', handleOpenPicker);
    return () => window.removeEventListener('openNodePicker', handleOpenPicker);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable fullscreen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    // Fetch initial workflow if exists
    fetch('/api/v1/ai-workflows/workflow')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const wf = data[0];
          setWorkflowId(wf.id);
          setWorkflowName(wf.name);
          try {
            const graph = JSON.parse(wf.graphJson);
            if (graph.nodes) setNodes(graph.nodes);
            if (graph.edges) setEdges(graph.edges);
          } catch(e) { /* ignore */ }
        } else {
          // Setup defaults if none
          setNodes([
            { id: 'trigger_1', position: { x: 100, y: 150 }, data: { label: 'Message Received', config: { audienceMode: 'All Users' } }, type: 'trigger' },
            { id: 'agent_1', position: { x: 450, y: 150 }, data: { label: 'AI Agent', config: { instruction: 'You are a helpful assistant.' } }, type: 'agent' },
            { id: 'action_1', position: { x: 800, y: 150 }, data: { label: 'Message Send' }, type: 'action' },
          ]);
          setEdges([
            { id: 'e1', source: 'trigger_1', target: 'agent_1', type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } },
            { id: 'e2', source: 'agent_1', target: 'action_1', type: 'smoothstep', style: { stroke: '#555', strokeWidth: 2 } },
          ]);
        }
      });
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const handleSave = async () => {
    try {
      const graphJson = JSON.stringify({ nodes, edges });
      
      let url = '/api/v1/ai-workflows/workflow';
      let method = 'POST';
      
      if (workflowId) {
        url = `/api/v1/ai-workflows/workflow/${workflowId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowName,
          status: 'active',
          graphJson
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setWorkflowId(saved.id);
        toast.success('Workflow saved & activated!');
      } else {
        toast.error('Failed to save workflow.');
      }
    } catch (e) {
      toast.error('Network error while saving workflow.');
    }
  };

  const handleAddNode = (type: string, label: string) => {
    let newX = 250;
    let newY = 250;
    const parentId = parentNodeContext?.nodeId;

    if (parentId) {
      const parentNode = nodes.find(n => n.id === parentId);
      if (parentNode) {
        if (type === 'model') {
          newX = parentNode.position.x - 70;
          newY = parentNode.position.y + 120;
        } else if (type === 'memory') {
          newX = parentNode.position.x + 40;
          newY = parentNode.position.y + 120;
        } else if (type === 'tool') {
          newX = parentNode.position.x + 150;
          newY = parentNode.position.y + 120;
        } else {
          newX = parentNode.position.x + 350;
          newY = parentNode.position.y;
        }
      }
    }

    // eslint-disable-next-line react-hooks/purity -- impure call kept as-is (existing behavior)
    const newNodeId = `${type}_${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: type,
      position: { x: newX, y: newY },
      data: { label, config: {} }
    };
    
    setNodes((nds) => [...nds, newNode]);
    
    if (parentId) {
      const isSubNode = ['model', 'memory', 'tool'].includes(type);
      setEdges((eds) => [...eds, {
        id: `e_${parentId}_${newNodeId}`,
        source: parentId,
        sourceHandle: isSubNode ? type : 'main',
        target: newNodeId,
        type: 'smoothstep',
        animated: false,
        style: isSubNode ? { strokeDasharray: '4 4', stroke: '#888', strokeWidth: 1.5 } : { stroke: '#555', strokeWidth: 2 }
      }]);
    }

    setIsNodeSelectorOpen(false);
    setParentNodeContext(null);
  };

  const updateNodeConfig = (nodeId: string, newConfig: any) => {
    setNodes(nds => 
      nds.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: newConfig
            }
          };
        }
        return node;
      })
    );
  };

  const ALL_NODES = [
    { type: 'trigger', label: 'Message Received', desc: 'Triggers when a user sends a message', icon: <Zap size={16}/>, color: 'purple' },
    { type: 'agent', label: 'AI Agent', desc: 'Processes text using AI model', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'action', label: 'Send Message', desc: 'Sends an auto-reply back', icon: <SendHorizontal size={16}/>, color: 'emerald' },
    { type: 'action', label: 'Condition', desc: 'Branch logic based on condition', icon: <GitBranch size={16}/>, color: 'orange' },
  ];

  const MODEL_NODES = [
    { type: 'model', label: 'Default Model', desc: 'Use system default model', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'OpenAI', desc: 'ChatGPT, GPT-4, GPT-3.5', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Gemini', desc: 'Google Gemini Pro / Flash', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Claude', desc: 'Anthropic Claude 3', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Groq', desc: 'Ultra-fast LPU inference', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'DeepSeek', desc: 'DeepSeek Coder / Chat', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Mistral', desc: 'Mistral AI models', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'xAI', desc: 'Grok models', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Ollama', desc: 'Local models via Ollama', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'OpenRouter', desc: 'Access multiple AI providers', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Together AI', desc: 'Open-source models', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Azure OpenAI', desc: 'Enterprise OpenAI endpoints', icon: <BrainCircuit size={16}/>, color: 'blue' },
    { type: 'model', label: 'Local Models', desc: 'Custom hosted models', icon: <BrainCircuit size={16}/>, color: 'blue' },
  ];

  const MEMORY_NODES = [
    { type: 'memory', label: 'Simple Memory', desc: 'Stores recent messages in context', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Persistent Memory', desc: 'Continuous knowledge & summaries', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'MongoDB', desc: 'External MongoDB connection', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'PostgreSQL', desc: 'External Postgres connection', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Redis', desc: 'Fast in-memory storage', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Supabase', desc: 'Supabase vector store', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Pinecone', desc: 'Vector database', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Weaviate', desc: 'Vector database', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Chroma', desc: 'Local vector store', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Qdrant', desc: 'Vector database', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Milvus', desc: 'Scalable vector database', icon: <BrainCircuit size={16}/>, color: 'purple' },
    { type: 'memory', label: 'Local DB Memory', desc: 'Internal system DB', icon: <BrainCircuit size={16}/>, color: 'purple' },
  ];

  const TOOL_NODES = [
    { type: 'tool', label: 'Google Search', desc: 'Search the web', icon: <Search size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Gmail', desc: 'Send/Read emails', icon: <Mail size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Google Sheets', desc: 'Read/Write to Sheets', icon: <FileSpreadsheet size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Google Docs', desc: 'Read/Write to Docs', icon: <FileSpreadsheet size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Google Drive', desc: 'Access files', icon: <FileSpreadsheet size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Telegram', desc: 'Send/Receive Telegram', icon: <SendHorizontal size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Discord', desc: 'Send/Receive Discord', icon: <SendHorizontal size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Slack', desc: 'Send/Receive Slack', icon: <SendHorizontal size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'WhatsApp', desc: 'Send/Receive WhatsApp', icon: <SendHorizontal size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Notion', desc: 'Notion API integration', icon: <FileSpreadsheet size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'HTTP Request', desc: 'Make custom API calls', icon: <Zap size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Code', desc: 'Execute custom JavaScript', icon: <GitBranch size={16}/>, color: 'emerald' },
    { type: 'tool', label: 'Local File Upload', desc: 'Upload custom files', icon: <FileSpreadsheet size={16}/>, color: 'emerald' },
  ];

  let currentCategoryNodes = ALL_NODES;
  if (parentNodeContext?.connectorType === 'model') currentCategoryNodes = MODEL_NODES;
  if (parentNodeContext?.connectorType === 'memory') currentCategoryNodes = MEMORY_NODES;
  if (parentNodeContext?.connectorType === 'tool') currentCategoryNodes = TOOL_NODES;

  const filteredNodes = currentCategoryNodes.filter(n => n.label.toLowerCase().includes(nodeSearch.toLowerCase()) || n.desc.toLowerCase().includes(nodeSearch.toLowerCase()));

  return (
    <div ref={containerRef} className="w-full h-full flex bg-[#141414] text-white overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR (Thin Icon Rail) */}
      <div className="w-[60px] bg-[#1a1a1a] border-r border-[#333] flex flex-col items-center py-4 z-20">
        <button className="w-10 h-10 bg-orange-600 hover:bg-orange-700 text-white rounded-full flex items-center justify-center mb-6 transition-colors shadow-lg">
          <Plus size={24} />
        </button>
        <div className="flex flex-col gap-6 text-[#888]">
          <button className="hover:text-white transition-colors"><Search size={22} /></button>
          <button className="hover:text-white transition-colors"><BrainCircuit size={22} /></button>
          <button className="hover:text-white transition-colors"><Layout size={22} /></button>
          <button className="hover:text-white transition-colors"><Zap size={22} /></button>
          <button className="hover:text-white transition-colors"><FileSpreadsheet size={22} /></button>
        </div>
        <div className="mt-auto flex flex-col gap-6 text-[#888]">
          <button className="hover:text-white transition-colors"><Settings size={22} /></button>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        {/* TOP BAR */}
        <div className="h-[60px] border-b border-[#333] flex items-center justify-between px-6 bg-[#1a1a1a] z-20">
          <div className="flex items-center gap-3">
            <span className="text-[#888] text-sm">Personal <span className="mx-1">/</span></span>
            <input 
              type="text" 
              value={workflowName} 
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-white w-48 focus:ring-0 p-0 text-sm"
            />
            <button className="ml-2 text-xs px-2 py-0.5 rounded border border-[#333] text-[#888] hover:text-white hover:border-[#555] transition-colors">+ Add tag</button>
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-[#222] rounded-full p-1 border border-[#333]">
            <button className="px-4 py-1.5 rounded-full text-sm font-semibold bg-[#333] text-white">Editor</button>
            <button className="px-4 py-1.5 rounded-full text-sm font-semibold text-[#888] hover:text-white transition-colors">Executions</button>
            <button className="px-4 py-1.5 rounded-full text-sm font-semibold text-[#888] hover:text-white transition-colors">Evaluations</button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs font-semibold px-2 py-1 bg-[#222] border border-[#333] rounded text-[#aaa]">0 / 1</div>
            <div className="flex items-center">
              <button onClick={handleSave} className="px-4 py-1.5 bg-[#e0e0e0] hover:bg-white text-black text-sm font-semibold rounded-l-md transition-colors">
                Publish
              </button>
              <button className="px-2 py-1.5 bg-[#e0e0e0] hover:bg-white text-black border-l border-[#aaa] rounded-r-md transition-colors">
                <ChevronDown size={16} />
              </button>
            </div>
            <button className="text-[#888] hover:text-white transition-colors"><Settings size={20} /></button>
          </div>
        </div>

        {/* CANVAS */}
        <div className="flex-1 relative bg-[#141414]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
          >
            <Controls className="bg-[#1f1f1f] border border-[#333] rounded-lg overflow-hidden shadow-2xl fill-white text-white" />
            <Background color="#333" gap={20} size={1} />
          </ReactFlow>
          
          {/* BOTTOM FLOATING "Open Chat" PILL */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <button className="flex items-center gap-2 px-6 py-3 bg-[#1f1f1f] border border-[#333] hover:border-[#555] rounded-full shadow-2xl transition-all">
              <MessageSquare size={18} className="text-orange-500" />
              <span className="text-sm font-semibold text-white">Open chat</span>
            </button>
          </div>

          {isNodeSelectorOpen && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-[#1f1f1f] border border-[#333] rounded-[16px] w-[600px] shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                <div className="p-6 border-b border-[#333] flex justify-between items-center">
                  <h3 className="font-semibold text-xl text-white">What happens next?</h3>
                  <button onClick={() => setIsNodeSelectorOpen(false)} className="text-[#888] hover:text-white transition-colors">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="p-4 border-b border-[#333]">
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" />
                    <input 
                      type="text" 
                      autoFocus
                      placeholder="Search nodes..." 
                      value={nodeSearch}
                      onChange={e => setNodeSearch(e.target.value)}
                      className="w-full bg-[#141414] border border-[#333] rounded-full py-2.5 pl-11 pr-4 text-sm text-white outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex">
                  {/* Sidebar Categories */}
                  <div className="w-1/3 border-r border-[#333] pr-4 space-y-1">
                    <div className="px-3 py-2 text-sm text-white bg-[#2a2a2a] rounded-lg cursor-pointer">Advanced AI</div>
                    <div className="px-3 py-2 text-sm text-[#888] hover:text-white cursor-pointer transition-colors">Action in an app</div>
                    <div className="px-3 py-2 text-sm text-[#888] hover:text-white cursor-pointer transition-colors">Data transformation</div>
                    <div className="px-3 py-2 text-sm text-[#888] hover:text-white cursor-pointer transition-colors">Flow</div>
                  </div>

                  {/* Node List */}
                  <div className="w-2/3 pl-4">
                    <p className="text-xs text-[#888] mb-3 uppercase tracking-wider font-semibold">Options</p>
                    <div className="space-y-2">
                      {filteredNodes.length > 0 ? filteredNodes.map((n, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleAddNode(n.type, n.label)}
                          className="flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-[#444] hover:bg-[#2a2a2a] cursor-pointer transition-all group"
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#141414] border border-[#333] text-white shadow-lg`}>
                            {n.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-white group-hover:text-orange-500 transition-colors">{n.label}</h4>
                            <p className="text-xs text-[#888]">{n.desc}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="p-8 text-center text-[#888] text-sm">
                          No nodes found matching '{nodeSearch}'
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Node Config Panel Drawer */}
        {selectedNodeId && (
          <NodeConfigPanel 
            node={nodes.find(n => n.id === selectedNodeId) || null} 
            onClose={() => setSelectedNodeId(null)} 
            onUpdate={updateNodeConfig}
          />
        )}
      </div>
    </div>
  </div>
  );
};
