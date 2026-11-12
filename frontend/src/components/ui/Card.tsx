import React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
  interactive?: boolean;
}

const PADDING = { none: 'p-0', sm: 'p-3', md: 'p-gutter', lg: 'p-section' } as const;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', elevated = false, interactive = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground',
        PADDING[padding],
        elevated && 'shadow-lg',
        interactive && 'cursor-pointer transition-colors hover:bg-surface-hover',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-3 flex items-start justify-between gap-3', className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-title font-bold text-foreground', className)} {...p} />
);
export const CardDescription = ({ className, ...p }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-body-sm text-muted-foreground', className)} {...p} />
);
export const CardFooter = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-4 flex items-center justify-end gap-2', className)} {...p} />
);

export default Card;
