import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepperInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Large ± stepper number input, optimised for field data entry.
 */
export function StepperInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  size = 'md',
  className,
}: StepperInputProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  const btnClass = cn(
    'flex items-center justify-center rounded-xl font-bold select-none active:scale-95 transition-all',
    'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
    size === 'lg' && 'w-14 h-14 text-2xl',
    size === 'md' && 'w-11 h-11 text-xl',
    size === 'sm' && 'w-8 h-8 text-base'
  );

  const numClass = cn(
    'font-bold text-slate-900 tabular-nums select-none',
    size === 'lg' && 'text-4xl w-16 text-center',
    size === 'md' && 'text-2xl w-12 text-center',
    size === 'sm' && 'text-lg w-10 text-center'
  );

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      )}
      <div className="flex items-center gap-3">
        <button type="button" onClick={dec} disabled={value <= min} className={cn(btnClass, 'disabled:opacity-30')}>
          <Minus className={size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} />
        </button>
        <span className={numClass}>{value}</span>
        <button type="button" onClick={inc} disabled={value >= max} className={cn(btnClass, 'disabled:opacity-30')}>
          <Plus className={size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'} />
        </button>
      </div>
    </div>
  );
}
