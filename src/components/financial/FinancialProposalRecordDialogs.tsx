import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileCheck, Hash } from "lucide-react";
import { AttachmentField } from "@/components/common/AttachmentField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FinancialProposal } from "@/hooks/useFinancialProposals";

type RenumberAction = {
  isPending: boolean;
  mutateAsync: (input: { proposal: FinancialProposal; newNo: string; reason: string }) => Promise<unknown>;
};

type ApproveOfflineAction = {
  isPending: boolean;
  mutateAsync: (input: { proposal: FinancialProposal; path: string; acceptedDate: string; signerName?: string }) => Promise<unknown>;
};

type HardcopyAction = {
  isPending: boolean;
  mutateAsync: (input: { proposal: FinancialProposal; path: string; acceptedDate: string; signerName?: string }) => Promise<unknown>;
};

export function RenumberFinancialProposalDialog({ open, onOpenChange, proposal, action, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  action: RenumberAction;
  onDone?: () => void;
}) {
  const [newNo, setNewNo] = useState("");
  const [reason, setReason] = useState("");
  const history = Array.isArray(proposal.proposal_no_history) ? proposal.proposal_no_history : [];

  async function submit() {
    try {
      await action.mutateAsync({ proposal, newNo, reason });
      toast.success(`Renumbered ${proposal.proposal_no} to ${newNo.trim()}.`);
      setNewNo("");
      setReason("");
      onOpenChange(false);
      onDone?.();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Hash className="h-4 w-4" /> Renumber {proposal.proposal_no}</DialogTitle>
          <DialogDescription>Admin override. Scope, price, status, and signatures stay unchanged. The stored PDF is cleared so an old number is never mistaken for the current document.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>New proposal number</Label><Input value={newNo} onChange={event => setNewNo(event.target.value)} placeholder="PROP-012" /></div>
          <div><Label>Reason (required)</Label><Textarea rows={3} value={reason} onChange={event => setReason(event.target.value)} placeholder="Client requested alignment with its procurement register." /></div>
          {history.length > 0 && (
            <div className="border-t pt-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Renumber history</p>
              {history.map((entry, index) => <p key={`${entry.at}-${index}`}>{entry.from} → {entry.to} · {entry.reason} · {new Date(entry.at).toLocaleDateString()}</p>)}
            </div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={action.isPending || !newNo.trim() || !reason.trim()} onClick={submit}>{action.isPending ? "Saving…" : "Renumber"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApproveFinancialProposalOfflineDialog({ open, onOpenChange, proposal, projectId, action, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  projectId: string;
  action: ApproveOfflineAction;
  onDone?: () => void;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [acceptedDate, setAcceptedDate] = useState(new Date().toISOString().slice(0, 10));
  const [signerName, setSignerName] = useState("");
  useEffect(() => { if (!open) setPath(null); }, [open]);

  async function submit() {
    if (!path) return toast.error("Upload the client's signed proposal first.");
    try {
      await action.mutateAsync({ proposal, path, acceptedDate, signerName });
      toast.success(`${proposal.proposal_no} approved from the signed client copy.`);
      onOpenChange(false);
      onDone?.();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileCheck className="h-4 w-4" /> Record offline client approval</DialogTitle>
          <DialogDescription>Use this when the client signs a printed or externally routed copy. The scan becomes the approved proposal of record.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <AttachmentField url={path} onChange={setPath} projectId={projectId} folder="proposals/signed" label="Client-signed proposal" preview={false} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Accepted date</Label><Input type="date" value={acceptedDate} onChange={event => setAcceptedDate(event.target.value)} /></div>
            <div><Label>Signed by (optional)</Label><Input value={signerName} onChange={event => setSignerName(event.target.value)} placeholder={proposal.client_name || "Client signer"} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={action.isPending || !path || !acceptedDate} onClick={submit}>{action.isPending ? "Recording…" : "Mark approved"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UploadFinancialProposalHardcopyDialog({ open, onOpenChange, proposal, projectId, action, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  projectId: string;
  action: HardcopyAction;
  onDone?: () => void;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [acceptedDate, setAcceptedDate] = useState(new Date().toISOString().slice(0, 10));
  const [signerName, setSignerName] = useState("");

  function reset() {
    setPath(null);
    setAcceptedDate(new Date().toISOString().slice(0, 10));
    setSignerName("");
  }

  async function submit() {
    if (!path) return toast.error("Upload the client's signed proposal first.");
    try {
      await action.mutateAsync({ proposal, path, acceptedDate, signerName });
      toast.success(`${proposal.proposal_no} approved and executed. The client-signed PDF is now the primary document.`);
      reset();
      onOpenChange(false);
      onDone?.();
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => { onOpenChange(value); if (!value) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{proposal.status === "approved" ? "Replace executed proposal PDF" : "Execute client-signed proposal"}</DialogTitle>
          <DialogDescription>
            Upload the final PDF signed by the client. It will replace the consultant-only PDF, become the primary document of record, and mark this proposal approved and executed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <AttachmentField url={path} onChange={setPath} projectId={projectId} folder="proposals/signed" label="Final client-signed proposal (PDF)" preview={false} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Executed date</Label><Input type="date" value={acceptedDate} onChange={event => setAcceptedDate(event.target.value)} /></div>
            <div><Label>Signed by (optional)</Label><Input value={signerName} onChange={event => setSignerName(event.target.value)} placeholder={proposal.client_name || "Client signer"} /></div>
          </div>
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Executing will automatically replace the primary PDF, mark the proposal approved, lock the record, and complete the workflow checklist.
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={action.isPending || !path || !acceptedDate} onClick={submit}>{action.isPending ? "Executing…" : proposal.status === "approved" ? "Replace executed PDF" : "Execute proposal"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
