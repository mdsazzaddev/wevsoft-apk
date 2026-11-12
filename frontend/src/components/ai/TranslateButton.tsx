import React from 'react';
import { Languages, Loader2 } from 'lucide-react';

interface TranslateButtonProps {
  active?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Smaller icon for tight UI (comments). */
  compact?: boolean;
  /** Kept for callers; both sizes are icon-only. */
  size?: 'sm' | 'md';
  onClick: () => void;
}

export const TranslateButton: React.FC<TranslateButtonProps> = ({
  active,
  loading,
  disabled,
  compact,
  size,
  onClick,
}) => {
  const iconSize = size === 'md' && !compact ? 14 : 13;
  const label = active ? 'Hide translation' : 'Translate';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      className={`inline-flex items-center justify-center rounded-full p-0.5 transition-colors disabled:opacity-50 ${
        active
          ? 'text-primary hover:text-primary/80'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : (
        <Languages size={iconSize} />
      )}
    </button>
  );
};
