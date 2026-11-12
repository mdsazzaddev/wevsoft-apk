import React, { useEffect, useState } from 'react';
import { ShieldCheck, Send, Sparkles, Download, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../store';

interface EventOrganizerDashboardProps {
  onBackToFeed: () => void;
}

export const EventOrganizerDashboard: React.FC<EventOrganizerDashboardProps> = ({ onBackToFeed }) => {
  const token = useStore((s) => s.token);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [stats, setStats] = useState({ hostedEvents: 0, totalRsvps: 0, checkInRate: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
      setLoadingStats(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingStats(true);
      try {
        const res = await fetch('/api/v1/events/organizer/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load dashboard');
        const data = await res.json();
        if (cancelled) return;
        setStats({
          hostedEvents: data.stats?.hostedEvents ?? 0,
          totalRsvps: data.stats?.totalRsvps ?? 0,
          checkInRate: data.stats?.checkInRate ?? 0,
        });
      } catch {
        if (!cancelled) toast.error('Failed to load organizer stats');
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAiAdviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setLoadingAdvice(true);

    try {
      const res = await fetch('/api/v1/events/ai/organizer-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ question: aiQuestion }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiAdvice(data.advice);
        toast.success('✨ AI Organizer advice generated!');
      }
    } catch (e) {
      toast.error('AI Advice failed');
    } finally {
      setLoadingAdvice(false);
    }
  };

  const handleExportCsv = async () => {
    if (!token) {
      toast.error('Please sign in');
      return;
    }
    setExporting(true);
    try {
      const res = await fetch('/api/v1/events/organizer/attendees.csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wevsoft-event-attendees-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Attendee list CSV downloaded');
    } catch {
      toast.error('Failed to export attendees CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToFeed}
          className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-border hover:bg-black/10 dark:bg-white/10 text-xs font-bold transition-all text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <ArrowLeft size={16} />
          <span>Back to Events Feed</span>
        </button>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 disabled:opacity-60"
        >
          {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Export Attendees CSV
        </button>
      </div>

      {/* Organizer Header */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-purple-400" size={26} />
          <h2 className="text-xl font-extrabold text-foreground">Event Organizer Management Hub</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage your hosted events, check in attendees, export RSVP rosters, and consult the AI Organizer Assistant.
        </p>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border">
            <div className="text-xs text-muted-foreground font-extrabold uppercase">Total Hosted Events</div>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              {loadingStats ? '…' : `${stats.hostedEvents} Event${stats.hostedEvents === 1 ? '' : 's'}`}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <div className="text-xs text-rose-400 font-extrabold uppercase">Total RSVPs Received</div>
            <div className="text-2xl font-extrabold text-rose-300 mt-1">
              {loadingStats ? '…' : `${Number(stats.totalRsvps).toLocaleString()} Attendees`}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
            <div className="text-xs text-purple-400 font-extrabold uppercase">Check-in Rate</div>
            <div className="text-2xl font-extrabold text-purple-300 mt-1">
              {loadingStats ? '…' : `${stats.checkInRate}% Attendance`}
            </div>
          </div>
        </div>
      </div>

      {/* AI Organizer Assistant Chat */}
      <div className="bg-card/40 backdrop-blur-2xl border border-border rounded-3xl p-6 shadow-2xl space-y-4">
        <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
          <Sparkles className="text-purple-400" size={18} /> AI Organizer Assistant & Promotion Advisor
        </h3>

        <form onSubmit={handleAiAdviceSubmit} className="flex gap-2">
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            placeholder="Ask AI Advisor (e.g., 'How to increase reunion attendance by 40%?')..."
            className="flex-1 bg-black/5 dark:bg-white/5 border border-border rounded-2xl px-4 py-2.5 text-xs text-foreground outline-none focus:border-purple-500/50"
          />
          <button type="submit" disabled={loadingAdvice} className="px-5 py-2.5 rounded-2xl bg-purple-600 text-white font-extrabold text-xs shadow-lg hover:opacity-90">
            <Send size={15} />
          </button>
        </form>

        {aiAdvice && (
          <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-mono">
            {aiAdvice}
          </div>
        )}
      </div>
    </div>
  );
};
