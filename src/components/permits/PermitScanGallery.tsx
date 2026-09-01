import { useMemo, useState } from 'react';
import { Building2, FolderKanban, ImageIcon, StickyNote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermitScans, type PermitScan } from '@/hooks/usePermitScans';
import { cn } from '@/lib/utils';

export type PermitScanGroupBy = 'project' | 'client';

export function PermitScanGallery({
  projectId,
  propertyId,
  clientId,
  className,
  emptyHint = 'Scan a permit from your phone to see photo tiles here.',
}: {
  projectId?: string | null;
  propertyId?: string | null;
  clientId?: string | null;
  className?: string;
  emptyHint?: string;
}) {
  const { data: scans = [], isLoading, update } = usePermitScans({ projectId, propertyId, clientId });
  const [groupBy, setGroupBy] = useState<PermitScanGroupBy>('project');
  const [edit, setEdit] = useState<PermitScan | null>(null);
  const [notation, setNotation] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: PermitScan[] }>();
    for (const scan of scans) {
      let key: string;
      let label: string;
      if (groupBy === 'client') {
        key = scan.client_id || scan.client?.id || scan.property_id || 'unassigned';
        label =
          scan.client?.name ||
          scan.property?.name ||
          (scan.property_id ? 'Property' : 'Unassigned client');
      } else {
        key = scan.project_id || scan.property_id || 'unassigned';
        label =
          scan.project?.name ||
          scan.property?.name ||
          (scan.property_id ? 'Property permits' : 'Unassigned project');
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(scan);
    }
    return [...map.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [scans, groupBy]);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center', className)}>
        <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)} data-testid="permit-scan-gallery">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold tracking-tight">Scanned permits</h3>
          <p className="text-xs text-muted-foreground">{scans.length} photo tile{scans.length === 1 ? '' : 's'}</p>
        </div>
        <div className="inline-flex rounded-full border bg-background p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setGroupBy('project')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition',
              groupBy === 'project' ? 'bg-[var(--apas-sapphire)] text-white' : 'text-muted-foreground',
            )}
          >
            <FolderKanban className="h-3.5 w-3.5" /> Project
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('client')}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 transition',
              groupBy === 'client' ? 'bg-[var(--apas-sapphire)] text-white' : 'text-muted-foreground',
            )}
          >
            <Building2 className="h-3.5 w-3.5" /> Client
          </button>
        </div>
      </div>

      {groups.map(([key, group]) => (
        <section key={key} className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {group.label}
            </h4>
            <Badge variant="outline" className="text-[10px]">{group.items.length}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map((scan) => (
              <button
                key={scan.id}
                type="button"
                onClick={() => {
                  setEdit(scan);
                  setNotation(scan.notation || '');
                }}
                className="group overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] bg-muted">
                  {scan.photo_url ? (
                    <img
                      src={scan.photo_url}
                      alt={scan.permit_number || 'Permit scan'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <Badge className="absolute left-2 top-2 bg-black/65 text-[10px] text-white hover:bg-black/65">
                    {scan.permit_number || 'No #'}
                  </Badge>
                </div>
                <div className="space-y-1.5 p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">
                    {scan.description || scan.trade || 'Scanned permit'}
                  </p>
                  <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                    <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">
                      {scan.notation?.trim() || 'Tap to add a notation'}
                    </span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      <Dialog open={!!edit} onOpenChange={(v) => !v && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {edit?.permit_number || 'Permit scan'}
            </DialogTitle>
          </DialogHeader>
          {edit?.photo_url && (
            <img
              src={edit.photo_url}
              alt=""
              className="max-h-56 w-full rounded-xl border object-contain bg-muted/30"
            />
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{edit?.description}</p>
            <Textarea
              value={notation}
              onChange={(e) => setNotation(e.target.value)}
              rows={3}
              placeholder="Field notation…"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!edit) return;
                await update.mutateAsync({ id: edit.id, notation });
                setEdit(null);
              }}
            >
              Save notation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
