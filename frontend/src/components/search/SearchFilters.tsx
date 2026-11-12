import React from 'react';
import { motion } from 'motion/react';
import { Calendar, User, Check } from 'lucide-react';

interface SearchFiltersProps {
  type: string;
  setType: (type: string) => void;
  dateRange: string;
  setDateRange: (range: string) => void;
  senderId?: string;
  setSenderId: (id: string) => void;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  type, setType, dateRange, setDateRange, senderId, setSenderId
}) => {
  const types = ['All', 'Messages', 'Media', 'Links', 'Documents'];
  const dates = ['Any time', 'Today', 'This Week', 'This Month'];

  return (
    <div className="flex flex-col gap-4 p-4 bg-card border-b border-border">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`relative px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              type === t ? 'text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            {type === t && (
              <motion.div
                layoutId="activeFilterBg"
                className="absolute inset-0 bg-primary rounded-full -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
            {t}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            <Calendar className="w-4 h-4" />
            <span>{dateRange}</span>
          </button>
          <div className="absolute top-full mt-1 left-0 w-48 bg-card border border-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 py-1">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-muted"
              >
                {d}
                {dateRange === d && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </div>

        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
          <User className="w-4 h-4" />
          <span>Sender</span>
        </button>
      </div>
    </div>
  );
};
