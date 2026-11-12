import React from 'react';
import { Users, Search, Plus, Compass } from 'lucide-react';
import { motion } from 'motion/react';

export const CommunitiesPage: React.FC = () => {
  const joined = [
    { id: '1', name: 'React Developers', members: '12.4k', image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=100&auto=format&fit=crop' },
    { id: '2', name: 'UI/UX Designers', members: '8.2k', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?q=80&w=100&auto=format&fit=crop' },
  ];

  const discover = [
    { id: '3', name: 'AI Enthusiasts', members: '45.1k', description: 'Discussing the latest in ML and AI tools.', image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=100&auto=format&fit=crop' },
    { id: '4', name: 'Startup Founders', members: '3.1k', description: 'Networking and advice for early-stage founders.', image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32d7?q=80&w=100&auto=format&fit=crop' },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-primary" />
              Communities
            </h1>
            <p className="text-muted-foreground">Join groups of like-minded people.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Find communities..."
                className="w-full sm:w-64 pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
            <button onClick={() => {}} className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-transform active:scale-95 shadow-sm">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Joined */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Your Communities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {joined.map(c => (
              <motion.div whileHover={{ y: -4 }} key={c.id} className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer group">
                <div className="h-24 overflow-hidden relative">
                  <div className="absolute inset-0 bg-black/40 z-10 group-hover:bg-black/20 transition-colors" />
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 relative z-20 -mt-8 bg-card rounded-t-2xl">
                  <h3 className="font-bold text-foreground truncate">{c.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{c.members} members</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Discover */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            Discover New Communities
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {discover.map(c => (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer group">
                <img src={c.image} alt={c.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground truncate">{c.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5 mb-1">{c.description}</p>
                  <p className="text-xs font-medium text-primary">{c.members} members</p>
                </div>
                <button onClick={() => {}} className="px-4 py-1.5 bg-muted group-hover:bg-primary group-hover:text-primary-foreground rounded-lg text-sm font-semibold transition-colors shrink-0">
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
