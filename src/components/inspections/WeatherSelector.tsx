import { cn } from '@/lib/utils';
import { WEATHER_OPTIONS } from '@/hooks/useDailyInspections';

interface WeatherSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function WeatherSelector({ value, onChange }: WeatherSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
      {WEATHER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[80px]',
            'hover:border-primary/50 hover:bg-accent/50 active:scale-95',
            value === option.value
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-muted bg-background'
          )}
        >
          <span className="text-3xl mb-1">{option.icon}</span>
          <span className="text-xs font-medium text-muted-foreground">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
