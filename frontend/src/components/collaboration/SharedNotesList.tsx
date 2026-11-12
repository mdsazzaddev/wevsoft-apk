import React, { useState } from 'react';
import { LayoutGrid, List, Search, Plus, FileText, Pin, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface Note {
  id: string;
  title: string;
  snippet: string;
  author: string;
  lastUpdated: string;
  isPinned: boolean;
}

interface SharedNotesListProps {
  notes: Note[];
  onCreateNote: () => void;
  onOpenNote: (id: string) => void;
}

export const SharedNotesList: React.FC<SharedNotesListProps> = ({ notes, onCreateNote, onOpenNote }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.snippet.toLowerCase().includes(searchQuery.toLowerCase()));
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });

  return (
    <div className="flex flex-col h-full bg-background p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Group Notes</h2>
        <button onClick={onCreateNote} className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Note</span>
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-4 py-2 bg-muted/50 rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent"
          />
        </div>
        <div className="flex items-center bg-muted/30 rounded-lg border border-border p-0.5">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {sortedNotes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="w-12 h-12 mb-3 opacity-20" />
          <p>No notes found.</p>
        </div>
      ) : (
        <div className={`overflow-y-auto pr-2 no-scrollbar ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'flex flex-col gap-3'}`}>
          {sortedNotes.map(note => (
            <motion.div 
              key={note.id}
              layout
              onClick={() => onOpenNote(note.id)}
              className={`bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group ${viewMode === 'list' ? 'flex items-center gap-4' : 'flex flex-col'}`}
            >
              <div className={`flex items-start justify-between ${viewMode === 'list' ? 'w-1/3 min-w-[200px]' : 'mb-2'}`}>
                <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors flex items-center gap-2">
                  {note.isPinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" fill="currentColor" />}
                  {note.title}
                </h3>
              </div>
              
              <p className={`text-sm text-muted-foreground line-clamp-2 ${viewMode === 'list' ? 'flex-1' : 'mb-4 flex-1'}`}>
                {note.snippet}
              </p>
              
              <div className={`flex items-center gap-3 text-xs text-muted-foreground ${viewMode === 'list' ? 'w-48 justify-end shrink-0' : 'mt-auto pt-3 border-t border-border'}`}>
                <span className="truncate max-w-[100px]">{note.author}</span>
                <span>•</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(note.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
