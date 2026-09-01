import { Database, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PMS_SOURCE_COMPACT } from '@/lib/occupancy/pmsSourceOfTruth';

interface OccupancyPmsSourceBannerProps {
  onImport?: () => void;
}

/** Persistent, compact note: PMO is source of truth; ProjOS is one-way. */
export function OccupancyPmsSourceBanner({ onImport }: OccupancyPmsSourceBannerProps) {
  return (
    <div
      className="rounded-xl border border-[var(--apas-sapphire)]/20 bg-gradient-to-r from-[var(--apas-sapphire)]/[0.06] via-card to-accent/10 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      role="note"
      aria-label="Property management source of truth"
    >
      <div className="flex gap-3 min-w-0">
        <div className="h-9 w-9 shrink-0 rounded-lg bg-[var(--apas-sapphire)]/10 flex items-center justify-center">
          <Database className="h-4 w-4 text-[var(--apas-sapphire)]" />
        </div>
        <p className="text-sm text-foreground/90 leading-snug">
          <span className="font-semibold text-foreground">PMO = source of truth. </span>
          {PMS_SOURCE_COMPACT.replace(/^Source of truth: your Property Management Office system\. /, '')}
        </p>
      </div>
      {onImport && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 self-start sm:self-auto border-[var(--apas-sapphire)]/30"
          onClick={onImport}
        >
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Import CSV
        </Button>
      )}
    </div>
  );
}
