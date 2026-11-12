import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface NotificationBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number;
  maxCount?: number;
  variant?: 'rose' | 'blue' | 'primary';
  size?: 'sm' | 'md';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  maxCount = 99,
  variant = 'rose',
  size = 'md',
  className,
  ...props
}) => {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count;

  return (
    <span
      className={twMerge(
        clsx(
          'flex items-center justify-center rounded-full font-bold text-white',
          {
            'bg-rose-500': variant === 'rose',
            'bg-blue-500': variant === 'blue',
            'bg-primary': variant === 'primary',
            'min-w-[14px] h-[14px] px-0.5 text-[9px]': size === 'sm',
            'min-w-5 px-1.5 py-0.5 text-[10px]': size === 'md',
          },
          className
        )
      )}
      {...props}
    >
      {displayCount}
    </span>
  );
};
