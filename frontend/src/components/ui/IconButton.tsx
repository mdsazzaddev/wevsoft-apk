import React from 'react';
import { cn } from './cn';
import { Button, type ButtonProps } from './Button';

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'leftIcon' | 'rightIcon' | 'children' | 'fullWidth'> {
  /** Required accessible name (icon-only buttons have no visible text). */
  label: string;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const ICON_SIZES = { sm: 'size-control-sm', md: 'size-control-md', lg: 'size-control-lg' } as const;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, size = 'md', variant = 'ghost', className, title, ...props }, ref) => (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      aria-label={label}
      title={title ?? label}
      className={cn(ICON_SIZES[size], 'p-0', className)}
      {...props}
    >
      {!props.loading && icon}
    </Button>
  ),
);
IconButton.displayName = 'IconButton';

export default IconButton;
