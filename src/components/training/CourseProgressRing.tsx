import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CourseProgressRingProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { container: 40, stroke: 3, text: 'text-[10px]' },
  md: { container: 56, stroke: 4, text: 'text-xs' },
  lg: { container: 80, stroke: 5, text: 'text-sm' },
};

export function CourseProgressRing({ 
  progress, 
  size = 'md',
  showLabel = true,
  className 
}: CourseProgressRingProps) {
  const config = sizeConfig[size];
  const radius = (config.container - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const isComplete = progress >= 100;
  const isStarted = progress > 0;

  return (
    <div 
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: config.container, height: config.container }}
    >
      {/* Background circle */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={config.container}
        height={config.container}
      >
        <circle
          cx={config.container / 2}
          cy={config.container / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-muted/30"
        />
        <circle
          cx={config.container / 2}
          cy={config.container / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn(
            'transition-all duration-500 ease-out',
            isComplete ? 'text-green-500' : isStarted ? 'text-amber-500' : 'text-muted'
          )}
        />
      </svg>
      
      {/* Center content */}
      {showLabel && (
        <div className="relative z-10 flex items-center justify-center">
          {isComplete ? (
            <Check className={cn(
              'text-green-500',
              size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-6 w-6'
            )} />
          ) : (
            <span className={cn(
              'font-semibold',
              config.text,
              isStarted ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {progress}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
