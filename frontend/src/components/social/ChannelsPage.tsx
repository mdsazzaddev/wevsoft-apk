import React from 'react';
import { Radio, Search, Hash, Star } from 'lucide-react';
import { ChannelFeed } from './ChannelFeed';

export const ChannelsPage: React.FC = () => {
  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:flex w-72 flex-col border-r border-border bg-card/50">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2 mb-4">
            <Radio className="w-6 h-6 text-primary" />
            Channels
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search channels..."
              className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Subscribed</h3>
            <div className="space-y-1">
              {['Tech News', 'Design Patterns', 'Startups'].map(channel => (
                <button onClick={() => {}} key={channel} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-left group">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Hash className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-foreground flex-1">{channel}</span>
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Discover</h3>
            <div className="space-y-1">
              {['AI Researchers', 'Indie Hackers', 'UI/UX Daily'].map(channel => (
                <button onClick={() => {}} key={channel} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-colors text-left group">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
                    <Star className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-muted-foreground group-hover:text-foreground flex-1 transition-colors">{channel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between md:hidden">
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Radio className="w-6 h-6 text-primary" />
            Channels
          </h2>
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-2xl mx-auto py-6">
            <ChannelFeed />
          </div>
        </div>
      </div>
    </div>
  );
};
