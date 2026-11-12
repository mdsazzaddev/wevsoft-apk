import React, { useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EXPLORE_DEBOUNCE_MS = 450;

export default function SmartSearchBar({
  placeholder = 'search anything',
  className = 'max-w-md',
  compact = false,
  autoFocus = false,
  onResultNavigate,
  inputClassName,
}: {
  placeholder?: string;
  className?: string;
  compact?: boolean;
  autoFocus?: boolean;
  onResultNavigate?: () => void;
  /** Replaces the default input styling (e.g. Creator Studio's square search). */
  inputClassName?: string;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');

  const openExplore = useCallback(
    (value?: string) => {
      const normalized = (value ?? query).trim();
      navigate(normalized ? `/explore?q=${encodeURIComponent(normalized)}` : '/explore');
      onResultNavigate?.();
    },
    [query, navigate, onResultNavigate],
  );

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const timer = window.setTimeout(() => {
      openExplore(trimmed);
    }, EXPLORE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, openExplore]);

  const inputClass = inputClassName
    ? inputClassName
    : compact
    ? 'w-full h-8 bg-muted/50 hover:bg-muted focus:bg-card border border-border text-foreground text-xs font-medium rounded-full pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all shadow-sm placeholder:text-muted-foreground/60'
    : 'w-full h-10 bg-muted/50 hover:bg-muted focus:bg-card border border-border text-foreground text-sm font-medium rounded-full pl-11 pr-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all shadow-sm placeholder:text-muted-foreground/60';

  const iconBtnClass = compact
    ? 'absolute left-1 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
    : 'absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30';

  const showMinHint = query.trim().length === 1;

  return (
    <div className={`relative w-full group ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          name="globalSearch"
          type="search"
          className={inputClass}
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') openExplore();
          }}
        />
        <button
          type="button"
          onClick={() => openExplore()}
          className={iconBtnClass}
          aria-label="Search"
          title="Search"
        >
          <Search className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2.5} />
        </button>
      </div>
      {showMinHint && (
        <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
          Type at least 2 characters
        </p>
      )}
    </div>
  );
}
