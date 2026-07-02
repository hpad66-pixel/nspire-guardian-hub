import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { useUpdateProject } from '@/hooks/useProjects';
import {
  PROJECT_MODULE_CATALOG,
  buildModuleConfig,
  isModuleVisible,
  type ModuleGroup,
} from '@/lib/projects/moduleVisibility';

interface ModuleVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: { id: string; name?: string | null; project_type?: string | null; module_config?: Record<string, boolean> | null };
}

const GROUP_LABELS: Record<ModuleGroup, string> = {
  core: 'Core',
  compliance: 'Collaboration',
  reports: 'Reports & client-facing',
};

const GROUP_ORDER: ModuleGroup[] = ['core', 'compliance', 'reports'];

export function ModuleVisibilityDialog({ open, onOpenChange, project }: ModuleVisibilityDialogProps) {
  const updateProject = useUpdateProject();

  // Seed local toggle state from the effective (override-or-default) visibility.
  const initial = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const def of PROJECT_MODULE_CATALOG) map[def.slug] = isModuleVisible(project, def.slug);
    return map;
  }, [project]);

  const [values, setValues] = useState<Record<string, boolean>>(initial);

  // Re-seed when the dialog is re-opened for a (possibly) different project.
  const [seenKey, setSeenKey] = useState(project.id);
  if (open && seenKey !== project.id) {
    setSeenKey(project.id);
    setValues(initial);
  }

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: PROJECT_MODULE_CATALOG.filter((m) => m.group === group),
    })).filter((g) => g.items.length > 0);
  }, []);

  const dirty = PROJECT_MODULE_CATALOG.some((def) => values[def.slug] !== initial[def.slug]);

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({ id: project.id, module_config: buildModuleConfig(values) } as never);
      onOpenChange(false);
    } catch {
      // toast handled by the mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Modules
          </DialogTitle>
          <DialogDescription>
            Choose what this client sees on <span className="font-medium text-foreground">{project.name ?? 'this project'}</span>.
            Off modules disappear from the sidebar and client portal for everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
                {GROUP_LABELS[group]}
              </p>
              <div className="rounded-lg border divide-y">
                {items.map((def) => (
                  <div key={def.slug} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{def.label}</div>
                      <div className="text-xs text-muted-foreground">{def.description}</div>
                    </div>
                    <Switch
                      checked={values[def.slug] ?? true}
                      onCheckedChange={(v) => setValues((prev) => ({ ...prev, [def.slug]: v }))}
                      aria-label={`Toggle ${def.label}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!dirty || updateProject.isPending}>
            {updateProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
