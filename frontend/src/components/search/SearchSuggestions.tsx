import React from 'react';
import { Clock, Search, ArrowRight } from 'lucide-react';

interface SearchSuggestionsProps {
  suggestions: string[];
  recentSearches: any[];
  onSelect: (query: string) => void;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({ suggestions, recentSearches, onSelect }) => {
  if (suggestions.length === 0 && recentSearches.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
      {suggestions.length > 0 && (
        <div className="p-2">
          <div className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
            Suggestions
          </div>
          {suggestions.map((suggestion, idx) => (
            <button
              key={`sug-${idx}`}
              onClick={() => onSelect(suggestion)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span>{suggestion}</span>
              </div>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </button>
          ))}
        </div>
      )}

      {recentSearches.length > 0 && (
        <div className={`p-2 ${suggestions.length > 0 ? 'border-t border-border' : ''}`}>
          <div className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
            Recent Searches
          </div>
          {recentSearches.slice(0, 3).map((recent) => (
            <button
              key={recent.id}
              onClick={() => onSelect(recent.query)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4" />
                <span>{recent.query}</span>
              </div>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
