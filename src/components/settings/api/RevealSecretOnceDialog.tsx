/**
 * G4 · RevealSecretOnceDialog
 *
 * Modal that displays a freshly minted plaintext secret with
 * a copy-to-clipboard button and a hard warning that closing
 * the dialog destroys the only copy. Used by both the API
 * client mint flow and the webhook signing-secret rotate flow.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface RevealSecretOnceDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Plaintext secret. Treat as write-once -- never log, never persist. */
  secret: string;
  /** Optional secondary identifier shown above the secret (e.g. client_id). */
  identifier?: { label: string; value: string };
}

export function RevealSecretOnceDialog({
  open,
  onClose,
  title,
  description,
  secret,
  identifier,
}: RevealSecretOnceDialogProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed -- select the text manually");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="rounded-md border border-[var(--apas-amber)]/40 bg-[var(--apas-amber)]/10 p-3 text-sm flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            This secret is shown <strong>only once</strong>. Copy it now and
            store it securely. After you close this dialog, only a hash is
            kept &mdash; it cannot be retrieved again.
          </p>
        </div>

        {identifier ? (
          <div className="text-xs text-muted-foreground">
            <div className="font-mono">{identifier.label}: {identifier.value}</div>
          </div>
        ) : null}

        <div className="flex gap-2 items-stretch">
          <code
            data-testid="revealed-secret"
            className="flex-1 font-mono text-xs break-all rounded bg-muted px-3 py-2"
          >
            {secret}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            aria-label="Copy secret"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>I&apos;ve saved it &mdash; close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RevealSecretOnceDialog;
