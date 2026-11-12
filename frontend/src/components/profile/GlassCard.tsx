import React from 'react';
import { motion } from 'motion/react';
import type { ProfileTheme } from '../../lib/profileThemes';

export default function GlassCard({ children, className = '', theme, hover = true }: {
  children: React.ReactNode; className?: string; theme: ProfileTheme; hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: theme.glowSm } : undefined}
      transition={{ duration: 0.2 }}
      className={`rounded-3xl p-6 ${theme.card} ${className}`}
      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      {children}
    </motion.div>
  );
}
