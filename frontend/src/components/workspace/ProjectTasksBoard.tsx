import React, { useState } from 'react';
import { Plus, MoreHorizontal, MessageSquare, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface ProjectTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assignees: { name: string; avatar: string }[];
  comments: number;
  dueDate: string;
}

export const ProjectTasksBoard: React.FC = () => {
  const [tasks, setTasks] = useState<ProjectTask[]>([
    { id: '1', title: 'Implement new auth flow', priority: 'high', status: 'in_progress', assignees: [{ name: 'Alice', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }], comments: 5, dueDate: 'Oct 24' },
    { id: '2', title: 'Design system updates', priority: 'medium', status: 'review', assignees: [], comments: 12, dueDate: 'Oct 25' },
    { id: '3', title: 'Write documentation', priority: 'low', status: 'todo', assignees: [{ name: 'Bob', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' }], comments: 0, dueDate: 'Oct 30' },
  ]);

  const columns: { id: ProjectTask['status'], label: string }[] = [
    { id: 'todo', label: 'To Do' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'review', label: 'In Review' },
    { id: 'done', label: 'Done' }
  ];

  const handleDragStart = (e: React.DragEvent<Element>, id: string) => {
    e.dataTransfer.setData('taskId', id);
  };

  const handleDrop = (e: React.DragEvent, status: ProjectTask['status']) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 no-scrollbar">
      {columns.map(col => {
        const columnTasks = tasks.filter(t => t.status === col.id);

        return (
          <div 
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.id)}
            className="flex-1 min-w-[300px] bg-muted/20 border border-border rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                {col.label}
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{columnTasks.length}</span>
              </h3>
              <button className="p-1 hover:bg-muted rounded text-muted-foreground"><Plus className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {columnTasks.map(task => (
                <motion.div
                  layout
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<Element>, task.id)}
                  className="bg-card border border-border p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      task.priority === 'high' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      task.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {task.priority}
                    </span>
                    <button className="text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                  </div>
                  
                  <h4 className="font-bold text-sm text-foreground mb-4 line-clamp-2">{task.title}</h4>
                  
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                    <div className="flex -space-x-2">
                      {task.assignees.map((a, i) => (
                        <img key={i} src={a.avatar} alt={a.name} className="w-6 h-6 rounded-full border-2 border-card object-cover" />
                      ))}
                      {task.assignees.length === 0 && (
                        <div className="w-6 h-6 rounded-full border-2 border-card border-dashed flex items-center justify-center">
                          <span className="text-[8px] text-muted-foreground">?</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                      <div className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{task.comments}</div>
                      <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{task.dueDate}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {columnTasks.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/50 rounded-xl text-muted-foreground text-sm">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
