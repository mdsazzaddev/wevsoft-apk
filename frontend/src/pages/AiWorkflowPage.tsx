import React from 'react';
import { WorkflowBuilder } from '../components/ai-workflows/WorkflowBuilder';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AiWorkflowPage() {
  return (
    <div className="max-w-[1600px] mx-auto h-[calc(100vh-6rem)] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/ai" className="p-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-xl transition-all">
            <ArrowLeft size={20} className="text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="text-blue-500" /> Wevsoft AI Workflow Builder
            </h1>
            <p className="text-sm text-muted-foreground">Drag and drop nodes to build powerful autonomous agents.</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1">
        <WorkflowBuilder />
      </div>
    </div>
  );
}
