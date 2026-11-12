import React, { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { TaskCard, Task } from './TaskCard';

interface TaskBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: Task['status']) => void;
  onCreateTask: (status: Task['status']) => void;
  onEditTask: (task: Task) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onMoveTask, onCreateTask, onEditTask }) => {
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  
  const columns: { id: Task['status'], label: string }[] = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Done' }
  ];

  const filteredTasks = filterAssignee === 'all' 
    ? tasks 
    : tasks.filter(t => t.assignee?.id === filterAssignee);

  // Simple mock drag and drop logic (in real app use react-beautiful-dnd or dnd-kit)
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: Task['status']) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveTask(taskId, status);
    }
  };

  // Get unique assignees for filter
  const assignees = Array.from(new Map(tasks.filter(t => t.assignee).map(t => [t.assignee!.id, t.assignee])).values());

  return (
    <div className="flex flex-col h-full bg-background p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Task Board</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select 
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="pl-8 pr-4 py-2 bg-muted rounded-lg text-sm font-medium text-foreground outline-none appearance-none cursor-pointer border border-border"
            >
              <option value="all">All Assignees</option>
              {assignees.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {columns.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.id);
          
          return (
            <div 
              key={col.id}
              className="flex-1 min-w-[300px] max-w-[350px] bg-muted/30 rounded-xl flex flex-col overflow-hidden border border-border/50"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-3 border-b border-border/50 flex items-center justify-between bg-card/50">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  {col.label}
                  <span className="bg-muted text-muted-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {columnTasks.length}
                  </span>
                </h3>
                <button 
                  onClick={() => onCreateTask(col.id)}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
                {columnTasks.map(task => (
                  <div 
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                  >
                    <TaskCard task={task} onClick={() => onEditTask(task)} />
                  </div>
                ))}
                
                {columnTasks.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg text-muted-foreground text-sm">
                    Drop tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
