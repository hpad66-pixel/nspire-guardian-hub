import { useEffect, useState } from 'react';
import { Archive, CircleAlert, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { VoiceDictationTextareaWithAI } from '@/components/ui/voice-dictation-textarea-ai';
import { useCloseProject } from '@/hooks/useProjects';

export function ProjectCloseDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  consulting = false,
  financialsReconciled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  consulting?: boolean;
  financialsReconciled?: boolean;
}) {
  const closeProject = useCloseProject();
  const [reason, setReason] = useState('');
  const [allowException, setAllowException] = useState(false);

  useEffect(() => {
    if (!open) {
      setReason('');
      setAllowException(false);
    }
  }, [open]);

  const incomplete = consulting && financialsReconciled === false;
  const canSubmit = reason.trim().length >= 5 && (!incomplete || allowException);

  const submit = async () => {
    await closeProject.mutateAsync({
      projectId,
      reason,
      allowUnreconciled: incomplete && allowException,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <DialogTitle>Close and lock this project?</DialogTitle>
          <DialogDescription>
            {projectName} will become read-only. Its records stay available for review, but nobody can edit, add, delete, upload, or post until an administrator reopens it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="project-close-reason">Closeout reason *</Label>
            <VoiceDictationTextareaWithAI
              id="project-close-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Example: Project completed with a final net loss; all remaining records are preserved for closeout."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This statement appears on the permanent closure certificate and audit trail.
            </p>
          </div>

          {incomplete && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Financial reconciliation is incomplete</p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-900/80">
                      You may still close the engagement as an administrator exception. The open financial position and your reason will be frozen into the certificate.
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium">
                    <Checkbox
                      checked={allowException}
                      onCheckedChange={(checked) => setAllowException(checked === true)}
                    />
                    <span>I authorize closure with the unreconciled financial position recorded.</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="bg-slate-900 text-white hover:bg-slate-800"
            disabled={!canSubmit || closeProject.isPending}
            onClick={() => void submit()}
          >
            <Archive className="mr-2 h-4 w-4" />
            {closeProject.isPending ? 'Closing and locking…' : 'Close project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
