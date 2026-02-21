import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  emoji?: string;
  onAddEntry?: () => void;
  addLabel?: string;
  /** Accent color for the add button: 'default' | 'red' | 'amber' */
  accent?: 'default' | 'red' | 'amber';
  children: React.ReactNode;
}

/**
 * Standard full-screen bottom sheet wrapper for all daily log sections.
 */
export function SectionSheet({
  open,
  onOpenChange,
  title,
  emoji,
  onAddEntry,
  addLabel = 'Add Entry',
  accent = 'default',
  children,
}: SectionSheetProps) {
  const addBtnClass = cn(
    'h-8 text-xs font-semibold rounded-lg px-3 gap-1.5',
    accent === 'red'
      ? 'bg-red-600 hover:bg-red-500 text-white'
      : accent === 'amber'
      ? 'bg-amber-500 hover:bg-amber-400 text-white'
      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* bottom, full-screen on mobile */}
      <SheetContent
        side="bottom"
        className="h-[95dvh] flex flex-col p-0 rounded-t-2xl overflow-hidden"
      >
        {/* Dark header */}
        <SheetHeader className="flex-shrink-0 px-4 py-3 flex flex-row items-center gap-3"
          style={{ background: '#0F172A' }}
        >
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <SheetTitle className="flex-1 text-left text-white text-base font-bold flex items-center gap-2">
            {emoji && <span className="text-xl leading-none">{emoji}</span>}
            {title}
          </SheetTitle>
          {onAddEntry && (
            <button onClick={onAddEntry} className={addBtnClass}>
              <Plus className="h-3.5 w-3.5" />
              {addLabel}
            </button>
          )}
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
