import React from 'react';
import { cn } from '@/lib/utils';

interface ChipOption {
  label: string;
  value: string;
  emoji?: string;
  color?: string; // tailwind bg class e.g. 'bg-red-100 text-red-700 border-red-200'
}

interface QuickPickChipsProps {
  options: ChipOption[];
  value?: string | string[];
  onChange: (val: string) => void;
  multi?: boolean;
  className?: string;
}

/**
 * Horizontal scrollable chip row for quick category selection.
 */
export function QuickPickChips({
  options,
  value,
  onChange,
  multi = false,
  className,
}: QuickPickChipsProps) {
  const isSelected = (v: string) =>
    Array.isArray(value) ? value.includes(v) : value === v;

  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-hide', className)}>
      {options.map((opt) => {
        const selected = isSelected(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
              selected
                ? opt.color || 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            )}
          >
            {opt.emoji && <span>{opt.emoji}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
