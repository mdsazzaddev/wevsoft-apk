import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../../store';
import { createEvent } from '../../lib/collaborationApi';
import toast from 'react-hot-toast';

interface CreateEventModalProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ conversationId, isOpen, onClose }) => {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [description, setDescription] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = useStore(state => state.token);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    if (!startTime) return toast.error('Start time is required');
    if (!token) return;

    setIsSubmitting(true);
    try {
      await createEvent(token, conversationId, {
        title,
        location,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
        isAllDay,
        description,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined
      });
      toast.success('Event created');
      onClose();
    } catch (err) {
      toast.error('Failed to create event');
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
          className="w-full max-w-md bg-card border border-border shadow-xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Create Event
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Event Name</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Team Meeting"
                className="w-full px-4 py-2.5 bg-muted/50 rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location / Link</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Zoom link or physical address"
                  className="w-full pl-9 pr-4 py-2.5 bg-muted/50 rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border">
              <span className="text-sm font-semibold text-foreground">All-day event</span>
              <input 
                type="checkbox" 
                checked={isAllDay} 
                onChange={e => setIsAllDay(e.target.checked)} 
                className="accent-primary w-4 h-4"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Starts</label>
                <input 
                  type={isAllDay ? "date" : "datetime-local"}
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ends (Optional)</label>
                <input 
                  type={isAllDay ? "date" : "datetime-local"}
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this event about?"
                rows={3}
                className="w-full px-4 py-2 bg-muted/50 rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Max Attendees (Optional)</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="number"
                  min="1"
                  value={maxAttendees}
                  onChange={e => setMaxAttendees(e.target.value)}
                  placeholder="Unlimited"
                  className="w-full pl-9 pr-4 py-2.5 bg-muted/50 rounded-xl text-foreground outline-none focus:ring-2 focus:ring-primary/50 border border-transparent text-sm"
                />
              </div>
            </div>
          </form>

          <div className="p-4 border-t border-border bg-card flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Create Event'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
