import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useDeleteProject } from '@/hooks/useProjects';
import { useProjectTree } from '@/hooks/useProjectTree';
import { Trash2, AlertTriangle, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  /** If true, navigate to /projects after deletion */
  navigateAfter?: boolean;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  navigateAfter = true,
}: DeleteProjectDialogProps) {
  const navigate = useNavigate();
  const [confirmName, setConfirmName] = useState('');
  const [mode, setMode] = useState<'detach' | 'all'>('detach');
  const [busy, setBusy] = useState(false);
  const deleteProject = useDeleteProject();

  const { tree } = useProjectTree();
  const descendants = tree.descendants(projectId);
  const directChildren = tree.children(projectId);
  const hasSubs = descendants.length > 0;

  const confirmed = confirmName.trim() === projectName.trim();

  const handleDelete = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      // Delete the whole program: remove every descendant first, then the parent.
      if (hasSubs && mode === 'all') {
        const ids = descendants.map((d) => d.id);
        const { error } = await supabase.from('projects').delete().in('id', ids);
        if (error) throw error;
      }
      await deleteProject.mutateAsync(projectId);
      onOpenChange(false);
      setConfirmName('');
      setMode('detach');
      if (navigateAfter) navigate('/projects');
    } catch (e) {
      toast.error(`Couldn't delete: ${e instanceof Error ? e.message : 'try again'}`);
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    setConfirmName('');
    setMode('detach');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle className="text-left">
              Delete "{projectName}"?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">
                This will permanently delete all associated milestones, daily reports, change orders,
                RFIs, meetings, action items, and all other project data. This cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Subproject warning + choice */}
        {hasSubs && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg border border-[var(--apas-amber)]/30 bg-[var(--apas-amber)]/5 p-3">
              <FolderTree className="h-4 w-4 text-[var(--apas-amber)] shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">This program has {descendants.length} subproject{descendants.length !== 1 ? 's' : ''}.</span>
                <div className="mt-0.5 text-xs text-muted-foreground truncate">{directChildren.map((c) => c.name).join(', ')}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMode('detach')}
              className={cn('w-full text-left rounded-lg border p-2.5 text-sm transition-colors', mode === 'detach' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}
            >
              <span className="font-medium">Keep subprojects</span>
              <span className="block text-xs text-muted-foreground">They become standalone projects (their data is preserved).</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('all')}
              className={cn('w-full text-left rounded-lg border p-2.5 text-sm transition-colors', mode === 'all' ? 'border-destructive bg-destructive/5' : 'border-border hover:bg-muted/50')}
            >
              <span className="font-medium text-destructive">Delete the whole program</span>
              <span className="block text-xs text-muted-foreground">Also permanently deletes all {descendants.length} subproject{descendants.length !== 1 ? 's' : ''} and their data.</span>
            </button>
          </div>
        )}

        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">To confirm, type the project name below:</p>
          <Label htmlFor="confirm-project-name" className="text-sm font-mono bg-muted px-2 py-1 rounded">
            {projectName}
          </Label>
          <Input
            id="confirm-project-name"
            placeholder="Type project name to confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && confirmed) handleDelete(); }}
            className={confirmed ? 'border-destructive' : ''}
            autoComplete="off"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmed || busy || deleteProject.isPending}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            {busy || deleteProject.isPending
              ? 'Deleting…'
              : hasSubs && mode === 'all'
                ? `Delete program + ${descendants.length}`
                : 'Delete Project'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
