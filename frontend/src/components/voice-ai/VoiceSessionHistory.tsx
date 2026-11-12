import React from 'react';
import { Phone, Clock, Calendar, ChevronRight } from 'lucide-react';

export const VoiceSessionHistory: React.FC = () => {
  // Mock data
  const sessions = [
    { id: '1', agent: 'Wevsoft', duration: '15m 23s', date: 'Today, 2:30 PM', summary: 'Discussed ideas for the new marketing campaign and drafted an outline.' },
    { id: '2', agent: 'Elena', duration: '45m 10s', date: 'Yesterday, 8:00 PM', summary: 'Talked about managing work stress and mindfulness exercises.' },
    { id: '3', agent: 'Prof. Alan', duration: '22m 05s', date: 'Mon, 10:15 AM', summary: 'Reviewed the concepts of async/await in JavaScript and solved 2 coding problems.' },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Phone className="w-6 h-6 text-primary" />
        Call History
      </h2>

      <div className="space-y-4">
        {sessions.map(session => (
          <div key={session.id} className="bg-card border border-border hover:border-primary/30 rounded-2xl p-4 sm:p-5 transition-colors group cursor-pointer shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {session.agent.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{session.agent}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {session.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {session.duration}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center justify-center p-2 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
            
            <div className="pl-0 sm:pl-[52px]">
              <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground block mb-1">AI Summary</span>
                {session.summary}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
