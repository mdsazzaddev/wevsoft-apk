import React from 'react';

interface AutocompleteOverlayProps {
  value: string;
  suggestion: string;
  onAccept: () => void;
}

export const AutocompleteOverlay: React.FC<AutocompleteOverlayProps> = ({ value, suggestion, onAccept }) => {
  if (!suggestion || !suggestion.startsWith(value)) return null;

  const ghostText = suggestion.slice(value.length);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center px-4 py-2 text-sm overflow-hidden">
      <span className="invisible whitespace-pre">{value}</span>
      <span className="text-muted-foreground/50 whitespace-pre">
        {ghostText}
        <span className="ml-2 px-1.5 py-0.5 rounded bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">
          Tab
        </span>
      </span>
    </div>
  );
};
