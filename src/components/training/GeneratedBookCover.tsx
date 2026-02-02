import { cn } from '@/lib/utils';

interface GeneratedBookCoverProps {
  title: string;
  category: string;
  className?: string;
  compact?: boolean;
}

const CATEGORY_STYLES: Record<string, { gradient: string; accent: string }> = {
  onboarding: {
    gradient: 'from-blue-600 via-blue-700 to-indigo-800',
    accent: 'bg-blue-400/20',
  },
  maintenance: {
    gradient: 'from-orange-500 via-orange-600 to-amber-700',
    accent: 'bg-orange-400/20',
  },
  safety: {
    gradient: 'from-red-500 via-red-600 to-rose-700',
    accent: 'bg-red-400/20',
  },
  compliance: {
    gradient: 'from-purple-500 via-purple-600 to-violet-700',
    accent: 'bg-purple-400/20',
  },
  operations: {
    gradient: 'from-emerald-500 via-emerald-600 to-green-700',
    accent: 'bg-emerald-400/20',
  },
  emergency: {
    gradient: 'from-rose-500 via-rose-600 to-pink-700',
    accent: 'bg-rose-400/20',
  },
  general: {
    gradient: 'from-slate-600 via-slate-700 to-slate-800',
    accent: 'bg-slate-400/20',
  },
};

export function GeneratedBookCover({ 
  title, 
  category, 
  className,
  compact = false 
}: GeneratedBookCoverProps) {
  const normalizedCategory = category?.toLowerCase() || 'general';
  const styles = CATEGORY_STYLES[normalizedCategory] || CATEGORY_STYLES.general;

  if (compact) {
    return (
      <div 
        className={cn(
          "w-full h-full flex items-center justify-center bg-gradient-to-br",
          styles.gradient,
          className
        )}
      >
        <span className="text-white/90 text-xs font-semibold text-center px-1 line-clamp-2">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-between p-4 bg-gradient-to-br overflow-hidden",
        styles.gradient,
        className
      )}
    >
      {/* Decorative top pattern */}
      <div className="absolute top-0 left-0 right-0 h-24 opacity-30">
        <div className={cn("absolute top-4 left-4 w-16 h-16 rounded-full", styles.accent)} />
        <div className={cn("absolute top-8 right-8 w-8 h-8 rounded-full", styles.accent)} />
        <div className={cn("absolute top-2 right-16 w-4 h-4 rounded-full", styles.accent)} />
      </div>

      {/* Category Badge */}
      <div className="z-10 mt-2">
        <span className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-white/80 bg-white/10 rounded-full backdrop-blur-sm border border-white/10">
          {category || 'General'}
        </span>
      </div>

      {/* Title Section */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 px-2">
        {/* Decorative line above title */}
        <div className="w-12 h-0.5 bg-white/30 rounded-full mb-3" />
        
        <h3 className="text-white font-bold text-center leading-tight line-clamp-3 text-base sm:text-lg">
          {title}
        </h3>
        
        {/* Decorative line below title */}
        <div className="w-12 h-0.5 bg-white/30 rounded-full mt-3" />
      </div>

      {/* Decorative bottom pattern */}
      <div className="absolute bottom-0 left-0 right-0 h-20 opacity-20">
        <div className={cn("absolute bottom-6 left-8 w-12 h-12 rounded-full", styles.accent)} />
        <div className={cn("absolute bottom-4 right-4 w-20 h-20 rounded-full", styles.accent)} />
      </div>

      {/* Footer Branding */}
      <div className="z-10 text-center mb-1">
        <p className="text-white/90 text-xs font-semibold tracking-wide">
          Glorieta Gardens
        </p>
        <p className="text-white/60 text-[9px] uppercase tracking-widest">
          Training Library
        </p>
      </div>
    </div>
  );
}
