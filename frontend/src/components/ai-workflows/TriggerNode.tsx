import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageSquare, Zap } from 'lucide-react';

export const TriggerNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  return (
    <div className="relative flex flex-col items-center group">
      {/* Floating lightning icon */}
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-orange-500">
        <Zap size={14} className="fill-current" />
      </div>

      {/* Node Shape */}
      <div className="w-[72px] h-[72px] bg-[#1f1f1f] border border-[#333] hover:border-[#555] rounded-l-full rounded-r-[16px] flex items-center justify-center shadow-lg transition-colors z-10 relative">
        <MessageSquare size={32} className="text-white" strokeWidth={1.5} />
        <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-[#555] border-none -mr-1 rounded-full" isConnectable={isConnectable} />
      </div>

      {/* External Label */}
      <div className="absolute top-[80px] w-[140px] text-center">
        <p className="text-[13px] font-semibold text-white leading-tight">
          {data.label as string || 'When chat message received'}
        </p>
      </div>
    </div>
  );
};
