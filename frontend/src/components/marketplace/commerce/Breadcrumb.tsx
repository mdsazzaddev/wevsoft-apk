import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="py-2 md:py-3 overflow-x-auto no-scrollbar">
      <ol className="flex items-center whitespace-nowrap gap-1.5 text-xs sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center shrink-0">
              {isLast ? (
                <span className="text-primary font-medium truncate max-w-[180px] sm:max-w-xs" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className="text-zinc-400 hover:text-zinc-100 transition-colors truncate max-w-[120px] sm:max-w-[180px]"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-zinc-500 truncate max-w-[120px] sm:max-w-[180px]">
                      {item.label}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 mx-1 text-zinc-600 shrink-0" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
