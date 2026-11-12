import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Bot, TriangleAlert, Plus } from 'lucide-react';

export const AgentNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  let config: any = {};
  try {
    config = typeof data.config === 'string' ? JSON.parse(data.config) : (data.config || {});
  } catch (e) { /* ignore */ }

  const hasModel = !!config.modelType;
  
  const handleAddSubNode = (type: string) => {
    window.dispatchEvent(new CustomEvent('openNodePicker', { 
      detail: { nodeId: data.id, connectorType: type } 
    }));
  };

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-[#1f1f1f] border border-[#555] -ml-1.5 rounded-sm rotate-45" isConnectable={isConnectable} />
      
      <div className="bg-[#1f1f1f] border border-[#333] hover:border-[#555] rounded-[16px] w-[260px] h-[90px] flex flex-col shadow-lg relative group transition-colors">
        {!hasModel && (
          <div className="absolute -top-1.5 -right-1.5 text-red-500 bg-[#1f1f1f] rounded-full">
            <TriangleAlert size={14} className="fill-current" />
          </div>
        )}

        <div className="flex-1 flex items-center justify-center gap-3 mt-[-10px]">
          <Bot size={28} className="text-white" strokeWidth={1.5} />
          <span className="font-semibold text-white text-[16px]">AI Agent</span>
        </div>

        {/* Labels inside the bottom of the card */}
        <div className="absolute bottom-2 w-full flex justify-between px-4">
          <div className="flex-1 text-center"><span className="text-[10px] text-[#888]">Chat Model<span className="text-red-500">*</span></span></div>
          <div className="flex-1 text-center"><span className="text-[10px] text-[#888]">Memory</span></div>
          <div className="flex-1 text-center"><span className="text-[10px] text-[#888]">Tool</span></div>
        </div>

        {/* Handles protruding from bottom border */}
        <Handle type="source" position={Position.Bottom} id="model" className="left-[16.66%] w-3 h-3 bg-[#1f1f1f] border border-[#555] -mb-1.5 rounded-sm rotate-45" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="memory" className="left-[50%] w-3 h-3 bg-[#1f1f1f] border border-[#555] -mb-1.5 rounded-sm rotate-45" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="tool" className="left-[83.33%] w-3 h-3 bg-[#1f1f1f] border border-[#555] -mb-1.5 rounded-sm rotate-45" isConnectable={isConnectable} />
      </div>

      <Handle type="source" position={Position.Right} id="main" className="w-3 h-3 bg-[#1f1f1f] border border-[#555] -mr-1.5 rounded-sm rotate-45" isConnectable={isConnectable} />

      {/* Floating + buttons that act as the edge targets if no edge exists yet */}
      {/* We position them 40px below the card */}
      <div className="absolute top-[90px] left-0 w-full h-[60px] pointer-events-none">
        
        {/* Model dashed line & + */}
        <div className="absolute left-[16.66%] -translate-x-1/2 top-0 flex flex-col items-center pointer-events-auto">
          <div className="w-[1px] h-[30px] border-l border-dashed border-[#555]"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleAddSubNode('model'); }}
            className="w-5 h-5 bg-[#2a2a2a] border border-[#444] hover:bg-[#333] hover:text-white rounded-[4px] flex items-center justify-center -mt-1 text-[#888] transition-colors shadow-sm"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Memory dashed line & + */}
        <div className="absolute left-[50%] -translate-x-1/2 top-0 flex flex-col items-center pointer-events-auto">
          <div className="w-[1px] h-[30px] border-l border-dashed border-[#555]"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleAddSubNode('memory'); }}
            className="w-5 h-5 bg-[#2a2a2a] border border-[#444] hover:bg-[#333] hover:text-white rounded-[4px] flex items-center justify-center -mt-1 text-[#888] transition-colors shadow-sm"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Tool dashed line & + */}
        <div className="absolute left-[83.33%] -translate-x-1/2 top-0 flex flex-col items-center pointer-events-auto">
          <div className="w-[1px] h-[30px] border-l border-dashed border-[#555]"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleAddSubNode('tool'); }}
            className="w-5 h-5 bg-[#2a2a2a] border border-[#444] hover:bg-[#333] hover:text-white rounded-[4px] flex items-center justify-center -mt-1 text-[#888] transition-colors shadow-sm"
          >
            <Plus size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};
