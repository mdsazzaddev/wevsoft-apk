import React, { useId } from 'react';
import { cn } from './cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

const SIZES = {
  sm: 'h-control-sm text-caption',
  md: 'h-control-md text-body-sm',
  lg: 'h-control-lg text-body',
} as const;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, size = 'md', leftIcon, id, className, containerClassName, disabled, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [props['aria-describedby'], errorId, hintId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-body-sm font-semibold text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              'w-full rounded-sm border bg-card px-3 text-foreground placeholder:text-muted-foreground transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
              leftIcon && 'pl-10',
              SIZES[size],
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-caption font-medium text-destructive">{error}</p>
        ) : hint ? (
          <p id={hintId} className="text-caption text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export default Input;
