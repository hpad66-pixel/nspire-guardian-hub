import { ArrowRight, Camera, FileBadge2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Compact project-level permit entry.
 * Keep capture visible without consuming the whole phone viewport.
 */
export function ProjectPermitScanEntry({
  onScan,
  onOpenPermits,
  openCount,
  className,
}: {
  onScan: () => void;
  onOpenPermits: () => void;
  openCount?: number | null;
  className?: string;
}) {
  return (
    <section
      data-testid="project-permit-scan-entry"
      className={cn(
        'rounded-xl border border-[var(--apas-sapphire)]/20 bg-card/95 p-3 shadow-sm sm:p-4',
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--apas-sapphire)]/10 text-[var(--apas-sapphire)]">
            <FileBadge2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--apas-sapphire)]">
              Project permits
            </p>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              Permit register and capture
            </h3>
            <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Add a permit photo or PDF when needed. The register stays inside the Permits tab so
              closeout work stays organized without crowding the project overview.
            </p>
            {typeof openCount === 'number' && openCount > 0 && (
              <p className="text-xs font-semibold text-amber-700">
                {openCount} permit{openCount === 1 ? '' : 's'} still open on this project
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={onScan}
            className="h-10 justify-center bg-[var(--apas-sapphire)] text-white hover:bg-[var(--apas-sapphire)]/90"
            data-testid="project-permit-scan-cta"
          >
            <Camera className="mr-2 h-4 w-4" />
            Scan
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onOpenPermits}
            className="h-10 justify-center font-semibold"
            data-testid="project-permit-open-register"
          >
            Open Permits
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
