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
import { useDeleteProject } from '@/hooks/useProjects';
import { Trash2, AlertTriangle } from 'lucide-react';

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
  const deleteProject = useDeleteProject();

  const confirmed = confirmName.trim() === projectName.trim();

  const handleDelete = async () => {
    if (!confirmed) return;
    await deleteProject.mutateAsync(projectId);
    onOpenChange(false);
    setConfirmName('');
    if (navigateAfter) navigate('/projects');
  };

  const handleClose = () => {
    setConfirmName('');
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
            <p className="text-sm text-muted-foreground">
              To confirm, type the project name below:
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
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
            disabled={!confirmed || deleteProject.isPending}
            className="gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            {deleteProject.isPending ? 'Deleting…' : 'Delete Project'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
