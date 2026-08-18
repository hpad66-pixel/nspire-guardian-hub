import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { VoiceDictationTextareaWithAI } from "@/components/ui/voice-dictation-textarea-ai";
import type { FinancialProposal } from "@/hooks/useFinancialProposals";

export function AmendFinancialProposalDialog({ open, onOpenChange, proposal, reopen, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  reopen: { isPending: boolean; mutateAsync: (input: { proposal: FinancialProposal; reason: string }) => Promise<unknown> };
  onDone?: () => void;
}) {
  const [reason, setReason] = useState("");
  async function submit() {
    try {
      await reopen.mutateAsync({ proposal, reason });
      toast.success(`${proposal.proposal_no} reopened. Edit the scope and pricing, then sign and re-send.`);
      setReason(""); onOpenChange(false); onDone?.();
    } catch (error) { toast.error((error as Error).message); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Amend {proposal.proposal_no}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">This preserves the amendment reason, clears the prior signatures, and opens a new editable draft. The proposal must be signed and sent again.</p>
        <div><Label>Reason for amendment</Label><VoiceDictationTextareaWithAI value={reason} onValueChange={setReason} rows={3} context="notes" placeholder="Client requested a revised scope or price…" /></div>
        {proposal.amendment_history?.length > 0 && <div className="border-t pt-2 text-xs text-muted-foreground"><div className="mb-1 font-medium">Amendment history</div>{proposal.amendment_history.map((entry, index) => <div key={index}>{entry.reason} · {new Date(entry.at).toLocaleDateString()}</div>)}</div>}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!reason.trim() || reopen.isPending}>{reopen.isPending ? "Reopening…" : "Reopen for editing"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
