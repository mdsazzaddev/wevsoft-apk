import React from 'react';
import type { ProfileTheme } from '../../lib/profileThemes';

export default function EmptyTab({ theme, icon: Icon, title, subtitle }: {
  theme: ProfileTheme; icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <div
      className="text-center py-20 rounded-3xl"
      style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}` }}
    >
      <div
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: theme.accentLight, border: `1px solid ${theme.accentBorder}` }}
      >
        <Icon className="w-6 h-6" style={{ color: theme.accent }} />
      </div>
      <h3 className="text-xl font-bold mb-2 text-zinc-600 dark:text-zinc-300">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">{subtitle}</p>
    </div>
  );
}
