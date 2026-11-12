import React from 'react';
import { MessageSquare, Clock, CalendarIcon } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: { id: string; name: string; avatar?: string };
  dueDate?: string;
  commentCount: number;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const priorityColors = {
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    high: 'bg-red-500/10 text-red-500 border-red-500/20'
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div 
      onClick={onClick}
      className="bg-card border border-border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {task.title}
        </h4>
      </div>
      
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        
        {task.dueDate && (
          <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${
            isOverdue ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-muted text-muted-foreground border-border'
          }`}>
            <CalendarIcon className="w-3 h-3 shrink-0" />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
        {task.assignee ? (
          <div className="flex items-center gap-1.5" title={task.assignee.name}>
            {task.assignee.avatar ? (
              <img src={task.assignee.avatar} alt="" className="w-5 h-5 rounded-full object-cover bg-muted" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {task.assignee.name.charAt(0)}
              </div>
            )}
            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
              {task.assignee.name}
            </span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border border-dashed border-muted-foreground flex items-center justify-center" title="Unassigned">
            <span className="text-[10px] text-muted-foreground">?</span>
          </div>
        )}

        {task.commentCount > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">{task.commentCount}</span>
          </div>
        )}
      </div>
    </div>
  );
};
