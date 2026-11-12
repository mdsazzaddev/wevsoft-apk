import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, User as UserIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store';
import { createTask } from '../../lib/collaborationApi';
import toast from 'react-hot-toast';

interface CreateTaskModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: 'todo' | 'in_progress' | 'done';
  members: { id: string; name: string; avatar?: string }[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ 
  conversationId, isOpen, onClose, initialStatus = 'todo', members 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useStore(state => state.token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Task title is required');
    if (!token) return;

    setIsSubmitting(true);
    try {
      await createTask(token, conversationId, {
        title,
        description,
        status: initialStatus,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
      });
      toast.success('Task created');
      onClose();
    } catch (err) {
      toast.error('Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground">Create Task</h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Task Title"
                className="w-full px-4 py-3 bg-muted/50 rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent font-semibold"
                autoFocus
              />
            </div>

            <div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={3}
                className="w-full px-4 py-2 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Assignee</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select 
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent appearance-none cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Due Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <label key={p} className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className="sr-only"
                    />
                    <div className={`text-center py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border ${
                      priority === p 
                        ? p === 'low' ? 'bg-blue-500/10 text-blue-500 border-blue-500/50'
                        : p === 'medium' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/50'
                        : 'bg-red-500/10 text-red-500 border-red-500/50'
                        : 'bg-card text-muted-foreground border-border hover:bg-muted'
                    }`}>
                      {p}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </form>

          <div className="p-4 border-t border-border bg-card flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
