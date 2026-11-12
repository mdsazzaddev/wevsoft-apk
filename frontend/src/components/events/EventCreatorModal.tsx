import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Wand2, Calendar, MapPin, Globe, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface EventCreatorModalProps {
  onClose: () => void;
  onEventCreated: () => void;
}

export const EventCreatorModal: React.FC<EventCreatorModalProps> = ({ onClose, onEventCreated }) => {
  const token = useStore((s) => s.token);

  // AI Prompt Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Social');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [locationType, setLocationType] = useState<'PHYSICAL' | 'ONLINE' | 'HYBRID'>('PHYSICAL');
  const [address, setAddress] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [submitting, setSubmitting] = useState(false);

  // AI Auto-Fill Handler
  const handleAiAutoFill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);

    try {
      const res = await fetch('/api/v1/events/ai/create-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        const details = data.eventDetails;
        if (details) {
          setTitle(details.title || '');
          setDescription(details.description || '');
          if (details.category) setCategory(details.category);
          toast.success('✨ AI Event details auto-filled!');
        }
      }
    } catch (e) {
      toast.error('AI Auto-Fill failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/v1/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title, description, category, date, startTime, locationType, address, meetingUrl, privacy
        }),
      });

      if (res.ok) {
        toast.success('🎉 Event published live on Wevsoft Events!');
        onEventCreated();
        onClose();
      }
    } catch (e) {
      toast.error('Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-card border border-border rounded-3xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative space-y-6"
    >
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="text-rose-500" size={22} />
          <h2 className="text-lg font-extrabold text-foreground">Create New Wevsoft Event</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:bg-white/10 text-muted-foreground">
          <X size={18} />
        </button>
      </div>

      {/* AI Prompt Auto-Fill Console */}
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-2">
        <div className="flex items-center gap-1.5 text-purple-300 font-extrabold text-xs">
          <Sparkles size={15} /> AI Event Prompt Assistant
        </div>
        <form onSubmit={handleAiAutoFill} className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. 'HSC 2026 Reunion at Chandina College with alumni tech talks'"
            className="flex-1 bg-black/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none"
          />
          <button type="submit" disabled={aiGenerating} className="px-4 py-2 rounded-xl bg-purple-600 text-white font-extrabold text-xs shadow-md hover:opacity-90 flex items-center gap-1">
            {aiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            <span>Auto-Fill</span>
          </button>
        </form>
      </div>

      {/* Main Event Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1">Event Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Campus Reunion & Tech Fest 2026"
            className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none focus:border-rose-500/50"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground block mb-1">Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Provide event details, itinerary, and rules..."
            className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl p-3 text-xs text-foreground outline-none focus:border-rose-500/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-black/40 border border-border rounded-xl p-2.5 text-xs text-foreground outline-none"
            >
              <option value="Social">Social / Reunion</option>
              <option value="Education">Education / Webinar</option>
              <option value="Business">Business / Launch</option>
              <option value="Entertainment">Entertainment / Concert</option>
              <option value="WevMall">WevMall Expo</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Location Format:</label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value as any)}
              className="w-full bg-black/40 border border-border rounded-xl p-2.5 text-xs text-foreground outline-none"
            >
              <option value="PHYSICAL">Physical Location</option>
              <option value="ONLINE">Online Stream / Zoom</option>
              <option value="HYBRID">Hybrid Both</option>
            </select>
          </div>
        </div>

        {locationType !== 'ONLINE' && (
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Physical Address:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. College Auditorium, Chandina"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
            />
          </div>
        )}

        {locationType !== 'PHYSICAL' && (
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Online Meeting URL:</label>
            <input
              type="text"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="e.g. https://meet.wevsoft.com/room-id"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl px-4 py-2 text-xs text-foreground outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
          <span>Publish Event</span>
        </button>
      </form>
    </motion.div>
  );
};
