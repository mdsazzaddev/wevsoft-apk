import React from 'react';
import { Building2, Users, Layout, Settings, Home } from 'lucide-react';

export const WorkspaceSidebar: React.FC = () => {
  const navItems = [
    { label: 'Home', icon: Home, active: true },
    { label: 'Departments', icon: Building2 },
    { label: 'Teams', icon: Users },
    { label: 'Projects', icon: Layout },
    { label: 'Settings', icon: Settings },
  ];

  return (
    <div className="hidden md:flex w-64 flex-col border-r border-border bg-card/50">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-lg">
          A
        </div>
        <span className="font-bold text-foreground">Acme Corp</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map(item => (
          <button 
            key={item.label}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
              item.active 
                ? 'bg-primary/10 text-primary font-bold' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};
