import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | Option)[];
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({ value, onChange, options, placeholder = '---', disabled = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) => {
    const lbl = typeof opt === 'object' ? opt.label : opt;
    return (lbl || '').toLowerCase().includes(search.toLowerCase());
  });

  const displayLabel = (() => {
    const selectedOpt = options.find(opt => {
      const val = typeof opt === 'object' ? opt.value : opt;
      return val === value;
    });
    if (selectedOpt) {
       return typeof selectedOpt === 'object' ? selectedOpt.label : selectedOpt;
    }
    return value;
  })();

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className={`w-full bg-transparent border border-transparent hover:border-neutral-200 focus-within:border-blue-400 rounded text-sm text-neutral-900 py-0.5 px-1 -ml-1 transition-colors flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => { 
          if (!disabled) {
            setIsOpen(!isOpen); 
            setSearch(''); 
          }
        }}
      >
        <span className={`block truncate ${!displayLabel ? 'text-neutral-400' : ''}`} title={displayLabel || placeholder}>
           {displayLabel || placeholder}
        </span>
        {!disabled && <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0 ml-1" />}
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-lg rounded-md max-h-60 flex flex-col min-w-[200px]">
          <div className="p-2 border-b border-neutral-100 shrink-0">
            <input 
              autoFocus
              type="text" 
              className="w-full bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-sm text-neutral-500 text-center">Không tìm thấy kết quả</div>
            ) : filteredOptions.map((opt) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const lbl = typeof opt === 'object' ? opt.label : opt;
              return (
                <div 
                  key={val} 
                  className={`px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-neutral-100 truncate ${value === val ? 'bg-blue-50 text-blue-700 font-medium' : 'text-neutral-700'}`}
                  title={lbl}
                  onClick={() => {
                    onChange(val);
                    setIsOpen(false);
                  }}
                >
                  {lbl || '---'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
