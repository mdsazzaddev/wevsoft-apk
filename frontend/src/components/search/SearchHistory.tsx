import React from 'react';
import { Clock, X, Trash2 } from 'lucide-react';

interface SearchHistoryProps {
  history: any[];
  onSelect: (query: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({ history, onSelect, onDelete, onClearAll }) => {
  if (history.length === 0) return null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Recent Searches</h3>
        <button
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Clear All
        </button>
      </div>

      <div className="space-y-1">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 group transition-colors"
          >
            <button
              onClick={() => onSelect(item.query)}
              className="flex items-center gap-3 flex-1 text-left"
            >
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm text-foreground">{item.query}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
