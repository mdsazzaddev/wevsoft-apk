import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Search } from 'lucide-react';

interface SearchResultListProps {
  results: any[];
  onResultClick: (result: any) => void;
  query: string;
}

export const SearchResultList: React.FC<SearchResultListProps> = ({ results, onResultClick, query }) => {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Search className="w-8 h-8 opacity-50" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">No results found</p>
        <p className="text-sm">We couldn't find anything matching "{query}"</p>
      </div>
    );
  }

  const highlightMatch = (text: string, term: string) => {
    if (!term || !text) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() ? (
        <span key={i} className="bg-primary/30 text-primary font-medium px-0.5 rounded">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <Virtuoso
      className="w-full h-full no-scrollbar"
      data={results}
      itemContent={(index, result) => (
        <div
          onClick={() => onResultClick(result)}
          className="flex items-start gap-4 p-4 border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
        >
          {result.sender?.avatar ? (
            <img src={result.sender.avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-medium">{result.sender?.name?.charAt(0) || '?'}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h4 className="text-sm font-semibold text-foreground truncate">
                {result.sender?.name || 'Unknown User'}
              </h4>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {new Date(result.createdAt || result.timestamp).toLocaleDateString()}
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {highlightMatch(result.text || result.content || '', query)}
            </p>
          </div>
        </div>
      )}
    />
  );
};
