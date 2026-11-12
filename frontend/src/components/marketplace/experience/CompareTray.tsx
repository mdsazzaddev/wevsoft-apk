import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare, X } from 'lucide-react';
import { readCompareIds, writeCompareIds } from './stock';

export function CompareTray() {
  const navigate = useNavigate();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readCompareIds());
    sync();
    window.addEventListener('wev-compare', sync);
    return () => window.removeEventListener('wev-compare', sync);
  }, []);

  if (ids.length < 1) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-3">
      <GitCompare size={16} className="text-primary" />
      <span className="text-xs font-bold">{ids.length} selected</span>
      <button
        type="button"
        disabled={ids.length < 2}
        onClick={() => navigate(`/wevmall/compare?ids=${ids.join(',')}`)}
        className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold disabled:opacity-40"
      >
        Compare
      </button>
      <button type="button" onClick={() => writeCompareIds([])} className="text-muted-foreground">
        <X size={14} />
      </button>
    </div>
  );
}
