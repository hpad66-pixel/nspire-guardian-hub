import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SlidersHorizontal } from 'lucide-react';
import { ModuleVisibilityPanel } from '@/components/projects/ModuleVisibilityPanel';
import type { ModuleVisibilityProject } from '@/lib/projects/moduleVisibility';

interface ModuleVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ModuleVisibilityProject & { id: string; name?: string | null };
}

/** Lightweight dialog wrapper — full controls live on /projects/:id/admin. */
export function ModuleVisibilityDialog({ open, onOpenChange, project }: ModuleVisibilityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Modules
          </DialogTitle>
          <DialogDescription>
            Choose what appears in the project sidebar. For presets, inheritance, and type settings,
            open Project Admin.
          </DialogDescription>
        </DialogHeader>
        <ModuleVisibilityPanel
          project={project}
          variant="compact"
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
