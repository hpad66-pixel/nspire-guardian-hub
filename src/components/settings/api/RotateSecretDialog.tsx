/**
 * G4 · RotateSecretDialog
 *
 * Confirms a rotate, then on success hands the plaintext to a
 * RevealSecretOnceDialog so the user can copy the new secret.
 * Calls useWebhooks().rotate.
 */
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWebhooks } from "@/hooks/useWebhooks";
import { RevealSecretOnceDialog } from "./RevealSecretOnceDialog";
import { toast } from "sonner";

interface RotateSecretDialogProps {
  open: boolean;
  webhookId: string | null;
  onClose: () => void;
}

export function RotateSecretDialog({
  open, webhookId, onClose,
}: RotateSecretDialogProps) {
  const { rotate } = useWebhooks();
  const [revealed, setRevealed] = useState<string | null>(null);

  async function handleConfirm() {
    if (!webhookId) return;
    try {
      const r = await rotate.mutateAsync(webhookId);
      setRevealed(r.signing_secret);
    } catch (err: any) {
      toast.error(err.message ?? "Rotate failed");
      onClose();
    }
  }

  function handleRevealClose() {
    setRevealed(null);
    onClose();
  }

  return (
    <>
      <AlertDialog
        open={open && revealed === null}
        onOpenChange={(o) => { if (!o) onClose(); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate signing secret?</AlertDialogTitle>
            <AlertDialogDescription>
              The current signing secret will be invalidated immediately and a
              new plaintext secret will be shown <strong>once</strong>. Any
              consumers using the old secret will fail signature verification
              until they&apos;re updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Rotate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RevealSecretOnceDialog
        open={revealed !== null}
        onClose={handleRevealClose}
        title="New signing secret"
        description="Update your endpoint to verify against this secret."
        secret={revealed ?? ""}
      />
    </>
  );
}

export default RotateSecretDialog;
