import React from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-md',
  secondary: 'bg-card border border-border text-foreground hover:bg-surface-hover',
  ghost: 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-md',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-md', // legacy alias
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-3 text-caption rounded-sm gap-1.5',
  md: 'h-control-md px-4 text-body-sm rounded-md gap-2',
  lg: 'h-control-lg px-5 text-body rounded-md gap-2',
  icon: 'size-control-md rounded-sm',
};

export const Spinner = ({ className }: { className?: string }) => (
  <svg className={cn('size-4 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * Shared button primitive. Spreads native button props, so it drops in
 * wherever a <button> was. Defaults to type="button" to avoid accidental submits.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', fullWidth = false, loading = false, leftIcon, rightIcon,
      className, children, disabled, type = 'button', ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-extrabold transition-all select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        focusRing,
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  ),
);
Button.displayName = 'Button';

export default Button;
