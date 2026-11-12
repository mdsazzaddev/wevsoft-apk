import React from 'react';
import { motion } from 'motion/react';
import type { ProfileTheme } from '../../lib/profileThemes';

export default function TabSpinner({ theme }: { theme: ProfileTheme }) {
  return (
    <div className="flex justify-center py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-8 h-8 rounded-full border-4 border-t-transparent"
        style={{ borderColor: `${theme.accent} transparent transparent transparent` }}
      />
    </div>
  );
}
