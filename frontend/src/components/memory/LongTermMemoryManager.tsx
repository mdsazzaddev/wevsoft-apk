import React, { useState, useEffect } from 'react';
import { BrainCircuit, Search, Plus, X } from 'lucide-react';
import { MemoryCard } from './MemoryCard';
import { getLongTermMemories } from '../../lib/memoryApi';
import { useStore } from '../../store';

export const LongTermMemoryManager: React.FC = () => {
  const [memories, setMemories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const token = useStore(state => state.token);

  useEffect(() => {
    if (token) {
      // Mocking fetch for UI building
      setTimeout(() => {
        setMemories([
          { id: '1', key: 'Occupation', value: 'Software Engineer', source: 'Chat', confidence: 0.95 },
          { id: '2', key: 'Location', value: 'San Francisco, CA', source: 'Profile', confidence: 1.0 },
          { id: '3', key: 'Hobby', value: 'Photography', source: 'Chat', confidence: 0.8 },
        ]);
        setIsLoading(false);
      }, 500);
    }
  }, [token]);

  const filteredMemories = memories.filter(m => 
    m.key.toLowerCase().includes(search.toLowerCase()) || 
    m.value.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-full max-w-sm">
      <div className="p-4 border-b border-border bg-card">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <BrainCircuit className="w-5 h-5 text-primary" />
          What AI Knows
        </h2>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Loading memories...
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center">
            <BrainCircuit className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No memories found.</p>
          </div>
        ) : (
          filteredMemories.map(memory => (
            <MemoryCard 
              key={memory.id} 
              memory={memory} 
              onDelete={() => handleDelete(memory.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};
