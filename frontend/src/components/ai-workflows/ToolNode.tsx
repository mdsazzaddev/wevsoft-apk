import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Wrench } from 'lucide-react';

export const ToolNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  return (
    <div className="relative flex flex-col items-center group">
      <div className="w-[60px] h-[60px] bg-[#1a1a1a] border border-[#333] hover:border-[#555] rounded-full flex items-center justify-center shadow-lg transition-colors z-10 relative">
        <Wrench size={24} className="text-orange-400" />
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 bg-[#1a1a1a] border border-[#555] -mt-1 rounded-sm rotate-45" 
          isConnectable={isConnectable} 
        />
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#141414] rounded-full flex items-center justify-center">
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">!</div>
        </div>
      </div>
      
      <div className="absolute top-[68px] w-[140px] text-center">
        <p className="text-[12px] font-semibold text-white leading-tight">
          {data.label as string}
        </p>
      </div>
    </div>
  );
};
