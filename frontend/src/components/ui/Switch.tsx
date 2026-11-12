import React from 'react';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible label for the toggle (icon-only control). */
  label?: string;
  /** Optional extra classes for the track. */
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Canonical toggle switch for the app. Brand-colored when on
 * (`bg-primary`), neutral when off, with a white knob. Use this everywhere
 * instead of hand-rolling a `role="switch"` button so every toggle looks and
 * behaves the same (keyboard-activatable, labelled, respects `disabled`).
 */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, label, className = '', size = 'md' }) => {
  const compact = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        compact ? 'h-4 w-7' : 'h-6 w-11'
      } ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      } ${className}`}
    >
      <span
        className={`inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ${
          compact ? 'h-3 w-3' : 'h-5 w-5'
        } ${
          checked ? (compact ? 'translate-x-3' : 'translate-x-5') : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export default Switch;
