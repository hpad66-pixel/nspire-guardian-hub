import { Database, Plus, Upload, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PMS_SOURCE_RECOMMENDATION,
  PMS_SOURCE_SUMMARY,
  PMS_SOURCE_TITLE,
} from '@/lib/occupancy/pmsSourceOfTruth';

interface OccupancyPmsIntroCardProps {
  onImport: () => void;
  onAddTenant: () => void;
}

/**
 * Prominent empty-state explainer. Dismissed when the user opens Import
 * (parent stores that in localStorage); a compact banner remains afterward.
 */
export function OccupancyPmsIntroCard({ onImport, onAddTenant }: OccupancyPmsIntroCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <div
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--apas-sapphire)] via-accent to-[var(--apas-sapphire)]"
        aria-hidden
      />
      <div className="px-6 py-10 md:px-10 md:py-12 text-center max-w-2xl mx-auto space-y-6">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-[var(--apas-sapphire)]/10 flex items-center justify-center">
          <Database className="h-7 w-7 text-[var(--apas-sapphire)]" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--apas-sapphire)]">
            Occupancy sync
          </p>
          <h2 className="font-display text-xl md:text-2xl font-bold text-foreground tracking-tight">
            {PMS_SOURCE_TITLE}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            {PMS_SOURCE_SUMMARY}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-left">
          <div className="rounded-xl border bg-muted/30 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileSpreadsheet className="h-4 w-4 text-accent" />
              Weekly CSV
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export tenants from your PMO, then import here. Keeps reporting accurate without dual entry.
            </p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4 space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ArrowRightLeft className="h-4 w-4 text-[var(--apas-sapphire)]" />
              Direct integration
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If your PMO supports it, we can connect a real-time one-way feed into ProjOS.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed border-t pt-4">
          {PMS_SOURCE_RECOMMENDATION}
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-1">
          <Button size="lg" onClick={onImport} className="bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90 text-white">
            <Upload className="h-4 w-4 mr-2" />
            Import from your PMO
          </Button>
          <Button size="lg" variant="outline" onClick={onAddTenant}>
            <Plus className="h-4 w-4 mr-2" />
            Add a tenant
          </Button>
        </div>
      </div>
    </div>
  );
}
