import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, Target, MessageSquare, Bell } from 'lucide-react';
import { useStore } from '../../store';

export const DailySummaryDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Mock data
  const summary = {
    date: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
    keyDecisions: [
      "Agreed to move the deployment to next Tuesday.",
      "Selected the dark mode color palette."
    ],
    mentions: [
      { by: "Alice", context: "asked for the final assets." },
      { by: "Bob", context: "approved the pull request." }
    ],
    general: "The team discussed the upcoming release timeline, shared some design mockups, and coordinated testing efforts."
  };

  useEffect(() => {
    // Simulate fetch
    setTimeout(() => setLoading(false), 800);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Sparkles className="w-8 h-8 mb-4 animate-pulse text-primary" />
        <p>Generating daily digest...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground flex items-center gap-3 mb-2">
              Daily Digest
              <Sparkles className="w-6 h-6 text-primary" />
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {summary.date}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Summary */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card border border-primary/20 shadow-sm shadow-primary/5 rounded-2xl p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                General Chat
              </h2>
              <p className="text-foreground/90 leading-relaxed">
                {summary.general}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-green-500" />
                Key Decisions
              </h2>
              <ul className="space-y-3">
                {summary.keyDecisions.map((decision, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-foreground/90">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                    <p>{decision}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-yellow-500" />
                Your Mentions
              </h2>
              {summary.mentions.length > 0 ? (
                <ul className="space-y-4">
                  {summary.mentions.map((mention, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="font-bold text-foreground">{mention.by}</span>
                      <span className="text-muted-foreground"> {mention.context}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No mentions today.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
