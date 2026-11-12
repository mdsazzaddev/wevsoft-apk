import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { SendHorizontal } from 'lucide-react';

export const ActionNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  return (
    <div className="relative flex flex-col items-center group">
      {/* Node Shape */}
      <div className="w-[72px] h-[72px] bg-[#1f1f1f] border border-[#333] hover:border-[#555] rounded-[16px] flex items-center justify-center shadow-lg transition-colors z-10 relative">
        <SendHorizontal size={32} className="text-white" strokeWidth={1.5} />
        <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 bg-[#555] border-none -ml-1 rounded-full" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 bg-[#555] border-none -mr-1 rounded-full" isConnectable={isConnectable} />
        {/* Warning badge if needed */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#141414] rounded-full flex items-center justify-center">
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">!</div>
        </div>
      </div>

      {/* External Label */}
      <div className="absolute top-[80px] w-[140px] text-center">
        <p className="text-[13px] font-semibold text-white leading-tight">
          {data.label as string}
        </p>
        <p className="text-[11px] text-[#888] mt-0.5">Send Message</p>
      </div>
    </div>
  );
};
