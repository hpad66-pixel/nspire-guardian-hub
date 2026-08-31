/**
 * Contractor e-sign for an authored correspondence document (Word letter or PDF).
 * Mirrors ChangeOrderSignDialog — typed signature pad locks the document for send.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import type { AuthoredDocument } from "@/hooks/useAuthoredDocuments";

export function SignAuthoredDocumentDialog({
  open,
  onOpenChange,
  doc,
  onSign,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  doc: AuthoredDocument;
  onSign: (payload: { name: string; signatureDataUrl: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!sig || !name.trim()) {
      toast.error("Type your name and complete the signature.");
      return;
    }
    setBusy(true);
    try {
      await onSign({ name: name.trim(), signatureDataUrl: sig });
      toast.success("Document signed. You can send it to the client.");
      onOpenChange(false);
      setName("");
      setSig(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't sign the document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-[var(--apas-sapphire)]" />
            Electronically sign
          </DialogTitle>
          <DialogDescription>
            Sign “{doc.title}” the same way you sign change orders and proposals. This locks the version and enables Send to client.
          </DialogDescription>
        </DialogHeader>
        <TypedSignaturePad onChange={setSig} onNameChange={setName} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !sig || !name.trim()}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PenLine className="h-4 w-4 mr-1.5" />}
            Sign &amp; lock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
