import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TypedSignaturePad } from "@/components/financial/TypedSignaturePad";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenLine } from "lucide-react";
import type { FinancialProposal, FinancialProposalLine } from "@/hooks/useFinancialProposals";
import { buildProposalPdfBlob } from "@/lib/pdf/proposalPdf";
import { uploadFinancialProposalArtifact } from "@/lib/proposals/financialProposalStorage";

async function dataUrlToBlob(dataUrl: string) { return (await fetch(dataUrl)).blob(); }

export function FinancialProposalSignDialog({ open, onOpenChange, proposal, lines, projectName, onSigned }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  lines: FinancialProposalLine[];
  projectName: string;
  onSigned?: () => void;
}) {
  const [signature, setSignature] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) { setSignature(null); setName(""); } }, [open]);
  const handleSignature = useCallback((value: string | null) => setSignature(value), []);

  async function sign() {
    if (!signature || !name.trim()) return toast.error("Type your name to sign first.");
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const signedProposal = { ...proposal, submitted_signed_at: now };
      const pdfBlob = await buildProposalPdfBlob(signedProposal, lines, projectName, "APAS Consulting", { submitted: signature });
      const [pdfPath, signaturePath] = await Promise.all([
        uploadFinancialProposalArtifact(pdfBlob, proposal.project_id, "signed"),
        uploadFinancialProposalArtifact(await dataUrlToBlob(signature), proposal.project_id, "signature"),
      ]);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("proposals" as any).update({
        locked: true,
        submitted_signature_path: signaturePath,
        submitted_signed_at: now,
        submitted_signed_by: user?.id ?? null,
        pdf_path: pdfPath,
      }).eq("id", proposal.id);
      if (error) throw error;
      toast.success("Proposal signed and locked");
      onSigned?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(`Could not sign proposal: ${(error as Error).message}`);
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenLine className="h-4 w-4" /> Sign proposal</DialogTitle>
          <DialogDescription>Signing freezes this version and prepares it for client acceptance. Use Amend to reopen it later with an audit reason.</DialogDescription>
        </DialogHeader>
        <TypedSignaturePad onChange={handleSignature} onNameChange={setName} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={sign} disabled={!signature || !name.trim() || busy}>{busy ? "Signing…" : "Sign & lock"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
