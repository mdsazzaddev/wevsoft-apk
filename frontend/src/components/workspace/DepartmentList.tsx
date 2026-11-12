import React from 'react';
import { Users, ChevronRight } from 'lucide-react';

export const DepartmentList: React.FC = () => {
  const departments = [
    { id: '1', name: 'Engineering', head: { name: 'Sarah Drasner', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }, memberCount: 45 },
    { id: '2', name: 'Design', head: { name: 'Alex Rivera', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100' }, memberCount: 12 },
    { id: '3', name: 'Marketing', head: { name: 'Jessica Chen', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' }, memberCount: 28 },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {departments.map(dept => (
        <div key={dept.id} className="bg-card border border-border hover:border-primary/50 transition-colors rounded-2xl p-5 cursor-pointer group shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-foreground">{dept.name}</h3>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="flex items-center gap-2">
              <img src={dept.head.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Head</p>
                <p className="text-sm font-medium text-foreground">{dept.head.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-lg text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm font-bold">{dept.memberCount}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
