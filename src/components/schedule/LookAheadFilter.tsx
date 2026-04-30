/**
 * E1 · LookAheadFilter — window selector + critical / milestone toggles for
 * the schedule task list.
 *
 * The component is purely presentational: it exposes a controlled `value`
 * shape and emits `onChange`. Callers pass the resulting filter into the
 * useScheduleTasks hook (for `windowDays`) and into client-side filters for
 * `criticalOnly` / `milestonesOnly`.
 */
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Zap, Flag } from "lucide-react";

export interface LookAheadFilterValue {
  windowDays: number | null; // null = all
  criticalOnly: boolean;
  milestonesOnly: boolean;
}

export interface LookAheadFilterProps {
  value: LookAheadFilterValue;
  onChange: (next: LookAheadFilterValue) => void;
  className?: string;
}

const WINDOWS: Array<{ label: string; value: number | null }> = [
  { label: "All",  value: null },
  { label: "2wk", value: 14 },
  { label: "4wk", value: 28 },
  { label: "6wk", value: 42 },
];

export function LookAheadFilter({ value, onChange, className }: LookAheadFilterProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex items-center rounded-md border bg-background overflow-hidden">
        {WINDOWS.map((w) => {
          const isActive = value.windowDays === w.value;
          return (
            <button
              key={w.label}
              type="button"
              onClick={() => onChange({ ...value, windowDays: w.value })}
              className={cn(
                "px-3 py-1 text-xs font-medium border-r last:border-r-0",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      <Button
        size="sm"
        variant={value.criticalOnly ? "default" : "outline"}
        onClick={() => onChange({ ...value, criticalOnly: !value.criticalOnly })}
        title="Critical path only"
      >
        <Zap className="h-3.5 w-3.5 mr-1.5" />
        Critical
      </Button>

      <Button
        size="sm"
        variant={value.milestonesOnly ? "default" : "outline"}
        onClick={() => onChange({ ...value, milestonesOnly: !value.milestonesOnly })}
        title="Milestones only"
      >
        <Flag className="h-3.5 w-3.5 mr-1.5" />
        Milestones
      </Button>
    </div>
  );
}
