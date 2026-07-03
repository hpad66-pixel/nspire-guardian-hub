import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Briefcase, Lightbulb, Check, Loader2 } from 'lucide-react';
import { useUpdateProject } from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name?: string | null; project_type?: string | null };
}

const TYPES = [
  { value: 'property',   label: 'Construction / Property', icon: Building2, desc: 'Full construction modules — contracts, RFIs, submittals, pay apps, daily logs.' },
  { value: 'client',     label: 'Client / Standalone',     icon: Briefcase, desc: 'A general client project with the standard module set.' },
  { value: 'consulting', label: 'Consulting',              icon: Lightbulb, desc: 'Advisory engagement — scope, action items, meetings, invoicing; construction modules hidden.' },
] as const;

export function ProjectTypeDialog({ open, onOpenChange, project }: Props) {
  const update = useUpdateProject();
  const current = project.project_type === 'consulting' ? 'consulting' : project.project_type === 'client' ? 'client' : 'property';

  const change = async (value: string) => {
    if (value === current) { onOpenChange(false); return; }
    try {
      // Only the type changes — property/client links are preserved so the
      // project stays correctly scoped (and modules/nav switch to match).
      await update.mutateAsync({ id: project.id, project_type: value } as never);
      onOpenChange(false);
    } catch { /* toast handled by the mutation */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Project type</DialogTitle>
          <DialogDescription>
            Change what <span className="font-medium text-foreground">{project.name ?? 'this project'}</span> is. This only switches the modules and layout — your data and links stay intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {TYPES.map((t) => {
            const Icon = t.icon;
            const active = t.value === current;
            return (
              <button
                key={t.value}
                onClick={() => change(t.value)}
                disabled={update.isPending}
                className={cn(
                  'w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  active ? 'border-[var(--apas-sapphire)]/50 bg-[var(--apas-sapphire)]/5' : 'hover:bg-muted/40',
                )}
              >
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', active ? 'bg-[var(--apas-sapphire)]/15 text-[var(--apas-sapphire)]' : 'bg-muted text-muted-foreground')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">{t.label}{active && <span className="text-[11px] text-[var(--apas-sapphire)]">Current</span>}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
                {update.isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0 mt-1" /> : active ? <Check className="h-4 w-4 text-[var(--apas-sapphire)] shrink-0 mt-1" /> : null}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
