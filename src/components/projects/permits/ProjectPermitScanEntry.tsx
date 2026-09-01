import { Camera, FileBadge2, FileUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * High-visibility entry point for project-level permit scan/upload.
 * Shown on project Overview so PWA users don't have to dig through Field → Permits.
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
        'relative overflow-hidden rounded-2xl border-2 border-[#0D3B30]/35 bg-gradient-to-br from-[#0D3B30] via-[#134e3a] to-[#0f766e] p-4 text-white shadow-lg sm:p-5',
        className,
      )}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-[#0D3B30] shadow-md">
            <Camera className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]">
              <FileBadge2 className="h-3 w-3" />
              Project Permits
            </div>
            <h3 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Scan or upload a permit
            </h3>
            <p className="text-sm text-white/85 leading-relaxed">
              Photograph a permit from your phone or upload a PDF. OCR fills the register — annotate,
              set Open / City / Closed, and keep closeout current.
            </p>
            {typeof openCount === 'number' && openCount > 0 && (
              <p className="text-xs font-semibold text-amber-200">
                {openCount} permit{openCount === 1 ? '' : 's'} still open on this project
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            size="lg"
            onClick={onScan}
            className="h-12 w-full justify-center bg-white text-[#0D3B30] hover:bg-emerald-50 font-bold text-base shadow-md"
            data-testid="project-permit-scan-cta"
          >
            <Camera className="mr-2 h-5 w-5" />
            Scan / Upload Permit
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={onOpenPermits}
            className="h-12 w-full justify-center border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white font-semibold"
            data-testid="project-permit-open-register"
          >
            <FileUp className="mr-2 h-4 w-4" />
            Open Permits
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
