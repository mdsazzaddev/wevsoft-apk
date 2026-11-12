import React from 'react';
import { motion } from 'motion/react';
import type { AppliedTheme } from '../theme/apply';

export function WidgetShell({
  title,
  icon,
  theme,
  children,
  className = '',
  empty,
}: {
  title: string;
  icon?: React.ReactNode;
  theme: AppliedTheme;
  children?: React.ReactNode;
  className?: string;
  empty?: boolean;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full ${theme.preset.card} ${className}`}
      style={{
        borderRadius: theme.radius,
        padding: theme.pad,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      <h3
        className="text-[11px] font-bold uppercase tracking-[0.14em] mb-3 flex items-center gap-2"
        style={{ color: theme.accent }}
      >
        {icon}
        {title}
      </h3>
      {empty ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : children}
    </motion.section>
  );
}

export function WidgetSkeleton({ theme }: { theme: AppliedTheme }) {
  return (
    <div
      className="animate-pulse bg-muted/50"
      style={{ borderRadius: theme.radius, minHeight: 140 }}
      aria-hidden
    />
  );
}
