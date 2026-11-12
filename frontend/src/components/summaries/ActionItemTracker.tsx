import React, { useState } from 'react';
import { CheckSquare, Square, Calendar, User } from 'lucide-react';
import { motion } from 'motion/react';

interface ActionItem {
  id: string;
  task: string;
  assignee: { name: string; avatar?: string };
  dueDate?: string;
  isCompleted: boolean;
}

export const ActionItemTracker: React.FC = () => {
  // Mock data
  const [items, setItems] = useState<ActionItem[]>([
    { id: '1', task: 'Update the staging environment variables', assignee: { name: 'Bob' }, dueDate: 'Today', isCompleted: false },
    { id: '2', task: 'Send final assets to the client', assignee: { name: 'Alice' }, isCompleted: true },
    { id: '3', task: 'Schedule sync with marketing', assignee: { name: 'You' }, dueDate: 'Tomorrow', isCompleted: false },
  ]);

  const toggleItem = (id: string) => {
    setItems(items.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
  };

  const sortedItems = [...items].sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-primary" />
        AI Action Items
      </h2>

      <div className="space-y-2">
        {sortedItems.map(item => (
          <motion.div 
            layout
            key={item.id}
            className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
              item.isCompleted ? 'bg-muted/30 border-transparent opacity-60' : 'bg-card border-border hover:border-primary/40 shadow-sm'
            }`}
          >
            <button onClick={() => toggleItem(item.id)} className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
              {item.isCompleted ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6" />}
            </button>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium transition-all ${item.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {item.task}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {item.dueDate && (
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  <Calendar className="w-3 h-3" />
                  {item.dueDate}
                </div>
              )}
              
              <div className="flex items-center gap-1.5" title={`Assigned to ${item.assignee.name}`}>
                {item.assignee.avatar ? (
                  <img src={item.assignee.avatar} alt="" className="w-6 h-6 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                    {item.assignee.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {items.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No action items found.</p>
        )}
      </div>
    </div>
  );
};
