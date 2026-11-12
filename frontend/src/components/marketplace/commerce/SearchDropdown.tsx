import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Search } from 'lucide-react';
import { marketFetch } from './utils';

interface SearchDropdownProps {
  query: string;
  onSelect: (item: string) => void;
  isVisible: boolean;
}

export default function SearchDropdown({ query, onSelect, isVisible }: SearchDropdownProps) {
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const fetchItems = async () => {
      setIsLoading(true);
      try {
        if (!query.trim()) {
          const res = await marketFetch('/api/marketplace/search/trending', null);
          setItems(res.items || ['Shoes', 'Watches', 'Phones', 'Laptops']);
        } else {
          const res = await marketFetch(`/api/marketplace/search/suggestions?q=${encodeURIComponent(query)}`, null);
          setItems(res.items || []);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        // Fallback for development if API is missing
        setItems(query ? [`${query} shoes`, `${query} watch`, `best ${query}`] : ['Trending 1', 'Trending 2']);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchItems, 300);
    return () => clearTimeout(debounce);
  }, [query, isVisible]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"
      >
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Loading...</div>
        ) : items.length > 0 ? (
          <ul>
            {items.map((item, index) => (
              <li
                key={index}
                className="px-4 py-2 hover:bg-muted cursor-pointer flex items-center gap-3 text-foreground"
                onClick={() => onSelect(item)}
              >
                {!query.trim() ? (
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Search className="w-4 h-4 text-muted-foreground" />
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">No suggestions found</div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
