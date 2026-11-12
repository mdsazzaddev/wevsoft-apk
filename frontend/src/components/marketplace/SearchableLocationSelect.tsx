import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface LocationOption {
  id: string;
  name: string;
  local_name?: string | null;
  flag?: string | null;
  code?: string | null;
}

interface SearchableLocationSelectProps {
  label?: string;
  placeholder?: string;
  options: LocationOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  className?: string;
}

export const SearchableLocationSelect: React.FC<SearchableLocationSelectProps> = ({
  label,
  placeholder = 'Select an option...',
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  allowClear = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = options.find(opt => opt.id === value);

  // Filter options based on search query
  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const matchName = opt.name.toLowerCase().includes(query);
    const matchLocal = opt.local_name ? opt.local_name.toLowerCase().includes(query) : false;
    const matchCode = opt.code ? opt.code.toLowerCase().includes(query) : false;
    return matchName || matchLocal || matchCode;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search box when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 rounded-xl bg-slate-800 border ${
          isOpen ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-slate-700'
        } text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-all text-left shadow-sm hover:border-slate-600`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.flag && <span className="text-base">{selectedOption.flag}</span>}
              <span className="font-medium">{selectedOption.name}</span>
              {selectedOption.local_name && (
                <span className="text-slate-400 text-xs">({selectedOption.local_name})</span>
              )}
            </>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {allowClear && selectedOption && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-cyan-400' : ''
            }`}
          />
        </div>
      </button>

      {/* Searchable Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-80 duration-150">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-700/80 bg-slate-900/50">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-700/40 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = option.id === value;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option.id)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between text-sm transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/15 text-cyan-400 font-medium'
                        : 'text-slate-200 hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      {option.flag && <span className="text-base shrink-0">{option.flag}</span>}
                      <span className="truncate">{option.name}</span>
                      {option.local_name && (
                        <span className="text-slate-400 text-xs shrink-0">
                          ({option.local_name})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                <p>No matching location found</p>
                <p className="text-xs text-slate-500 mt-0.5">Try searching with a different spelling</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
