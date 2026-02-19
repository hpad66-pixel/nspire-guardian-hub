import { cn } from '@/lib/utils';
import { School } from 'lucide-react';
import type { LWSchool } from '@/hooks/useUserSchool';

interface SchoolSwitcherProps {
  schools: LWSchool[];
  activeSchoolId: string | null;
  onSwitch: (schoolId: string) => void;
}

export function SchoolSwitcher({ schools, activeSchoolId, onSwitch }: SchoolSwitcherProps) {
  if (schools.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2 p-1 rounded-xl bg-muted/50 border w-fit">
      {schools.map((school) => {
        const isActive = school.id === activeSchoolId;
        return (
          <button
            key={school.id}
            onClick={() => onSwitch(school.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <School className="h-3 w-3 flex-shrink-0" />
            <span className="truncate max-w-[140px]">{school.name}</span>
          </button>
        );
      })}
    </div>
  );
}
