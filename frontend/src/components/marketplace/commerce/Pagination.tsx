import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  onLimitChange
}: PaginationProps) {
  const [jumpPage, setJumpPage] = useState('');

  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpPage, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setJumpPage('');
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 w-full text-sm">
      {onLimitChange && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Items per page:</span>
          <select
            className="bg-card border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            onChange={(e) => onLimitChange(Number(e.target.value))}
            defaultValue="12"
          >
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="48">48</option>
          </select>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-border bg-card text-muted-foreground rounded-md disabled:opacity-50 hover:bg-muted disabled:hover:bg-card transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {getPages().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-3 py-2 text-muted-foreground">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-1.5 min-w-[32px] rounded-md border text-center transition-colors ${
                  currentPage === page
                    ? 'border-primary bg-primary text-white font-medium'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-border bg-card text-muted-foreground rounded-md disabled:opacity-50 hover:bg-muted disabled:hover:bg-card transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleJump} className="flex items-center gap-2">
        <span className="text-muted-foreground">Go to:</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={jumpPage}
          onChange={(e) => setJumpPage(e.target.value)}
          className="w-16 bg-card border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          className="px-3 py-1 bg-muted hover:bg-muted/80 border border-border text-foreground rounded-md transition-colors"
        >
          Go
        </button>
      </form>
    </div>
  );
}
