import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Briefcase, Lightbulb, Check, Loader2, HardHat } from 'lucide-react';
import { useUpdateProject } from '@/hooks/useProjects';
import { companyBrandForProjectType } from '@/lib/financial/apasCompanyBranding';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name?: string | null; project_type?: string | null };
}

const TYPES = [
  { value: 'property',     label: 'Property Record',        icon: Building2, desc: 'Property-centered record with construction modules available when activated.' },
  { value: 'construction', label: 'Construction / Build',   icon: HardHat,   desc: 'APAS Build workflow: pay applications, G702/G703 packages, RFIs, submittals, safety, and procurement.' },
  { value: 'client',       label: 'Client / Consulting',    icon: Briefcase, desc: 'Client engagement billed with proposals and APAS Consulting invoices.' },
  { value: 'consulting',   label: 'Consulting',             icon: Lightbulb, desc: 'APAS Consulting workflow: proposals, client invoices, CRM, reports, and lean project controls.' },
] as const;

export function ProjectTypeDialog({ open, onOpenChange, project }: Props) {
  const update = useUpdateProject();
  const current =
    project.project_type === 'consulting' || project.project_type === 'client' || project.project_type === 'construction'
      ? project.project_type
      : 'property';

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
            const brand = companyBrandForProjectType(t.value);
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
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 text-white"
                  style={{ background: active ? brand.primary : `${brand.primary}cc` }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-2">{t.label}{active && <span className="text-[11px] text-[var(--apas-sapphire)]">Current</span>}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                  <div className="mt-1 text-[11px] font-semibold" style={{ color: brand.primary }}>
                    {brand.legalName} - {brand.workflowLabel} - sender: {brand.senderName}
                  </div>
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
