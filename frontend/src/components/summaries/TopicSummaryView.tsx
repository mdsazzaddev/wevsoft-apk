import React, { useState } from 'react';
import { Hash, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Topic {
  id: string;
  name: string;
  summary: string;
  messageCount: number;
}

export const TopicSummaryView: React.FC = () => {
  const [expandedTopic, setExpandedTopic] = useState<string | null>('1');

  // Mock data
  const topics: Topic[] = [
    { id: '1', name: 'Project X Launch', summary: 'Discussed the marketing materials and set the launch date for next Friday. Alice will provide final graphics.', messageCount: 45 },
    { id: '2', name: 'Weekend Plans', summary: 'Group is planning a hike on Sunday morning. Meeting at the trailhead at 8 AM.', messageCount: 12 },
    { id: '3', name: 'Bug #402', summary: 'Found the root cause in the authentication middleware. Patch is being deployed to staging.', messageCount: 28 },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Hash className="w-5 h-5 text-primary" />
        Topics Discussed
      </h2>
      
      <div className="space-y-3">
        {topics.map(topic => (
          <div key={topic.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Hash className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{topic.name}</h3>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {topic.messageCount} messages
                  </span>
                </div>
              </div>
              {expandedTopic === topic.id ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </button>
            
            <AnimatePresence>
              {expandedTopic === topic.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-border mt-2">
                    <p className="text-sm text-foreground/90 pt-3">
                      {topic.summary}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
