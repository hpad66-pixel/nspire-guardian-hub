import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileCheck, Hash, Loader2, Plus, Wand2 } from "lucide-react";
import { AttachmentField } from "@/components/common/AttachmentField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FinancialProposal } from "@/hooks/useFinancialProposals";
import { extractProposalValueLinesFromFile, type ExtractedProposalValueLine } from "@/lib/financial/proposalValueExtraction";

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
          <DialogTitle className="flex items-center gap-2"><Hash className="h-4 w-4" /> Edit proposal number</DialogTitle>
          <DialogDescription>Scope, price, status, signatures, invoices, and internal record ID stay unchanged. The stored PDF is cleared so an old number is never mistaken for the current document.</DialogDescription>
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
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={action.isPending || !newNo.trim() || !reason.trim()} onClick={submit}>{action.isPending ? "Saving…" : "Save number"}</Button></DialogFooter>
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

export function UploadFinancialProposalHardcopyDialog({ open, onOpenChange, proposal, projectId, action, onExtractedRows, onDone }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: FinancialProposal;
  projectId: string;
  action: HardcopyAction;
  onExtractedRows?: (rows: ExtractedProposalValueLine[], mode: "replace" | "append") => Promise<void>;
  onDone?: () => void;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [acceptedDate, setAcceptedDate] = useState(new Date().toISOString().slice(0, 10));
  const [signerName, setSignerName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedRows, setExtractedRows] = useState<ExtractedProposalValueLine[]>([]);
  const [rowsApplied, setRowsApplied] = useState(false);

  function reset() {
    setPath(null);
    setAcceptedDate(new Date().toISOString().slice(0, 10));
    setSignerName("");
    setExtractedRows([]);
    setRowsApplied(false);
    setExtracting(false);
  }

  async function handleFileSelected(file: File) {
    setExtracting(true);
    setRowsApplied(false);
    try {
      const rows = await extractProposalValueLinesFromFile(file);
      setExtractedRows(rows);
      if (rows.length) {
        toast.success(`Found ${rows.length} possible value row${rows.length === 1 ? "" : "s"}. Review before applying.`);
      } else {
        toast.warning("No clear dollar value rows were found. You can still type the approved values manually.");
      }
    } catch (error) {
      setExtractedRows([]);
      toast.error(`Could not extract proposal values: ${(error as Error).message}`);
    } finally {
      setExtracting(false);
    }
  }

  function patchRow(index: number, patch: Partial<ExtractedProposalValueLine>) {
    setExtractedRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  async function applyRows(mode: "replace" | "append") {
    if (!onExtractedRows || !extractedRows.length) return;
    const rows = extractedRows
      .map((row) => ({
        ...row,
        description: row.description.trim() || "Approved proposal value",
        unit_cost: Number(row.unit_cost) || 0,
        markup_pct: Number(row.markup_pct) || 0,
      }))
      .filter((row) => row.unit_cost > 0);
    if (!rows.length) return toast.error("At least one extracted row needs a dollar amount.");
    await onExtractedRows(rows, mode);
    setRowsApplied(true);
    toast.success(mode === "replace" ? "Approved value rows replaced from the upload." : "Extracted rows added to the approved values.");
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
          <AttachmentField
            url={path}
            onChange={setPath}
            onFileSelected={handleFileSelected}
            projectId={projectId}
            folder="proposals/signed"
            label="Final client-signed proposal (PDF)"
            preview={Boolean(path)}
          />
          <div className="rounded-md border bg-muted/20 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Extract numbers only</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  This does not rewrite the proposal. It only reads dollar amounts from the uploaded signed proposal and suggests editable value rows for invoicing.
                </p>
              </div>
              {extracting && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Reading file</span>}
            </div>
            {extractedRows.length > 0 ? (
              <div className="mt-3 space-y-2">
                {extractedRows.map((row, index) => (
                  <div key={`${row.source_text}-${index}`} className="grid gap-2 rounded-md border bg-background p-2 sm:grid-cols-[1fr_130px_92px]">
                    <div>
                      <Label className="text-[11px]">Description</Label>
                      <Input className="mt-1 h-8 text-xs" value={row.description} onChange={(event) => patchRow(index, { description: event.target.value })} />
                      <p className="mt-1 truncate text-[10px] text-muted-foreground" title={row.source_text}>{row.confidence} confidence · {row.source_text}</p>
                    </div>
                    <div>
                      <Label className="text-[11px]">Approved amount</Label>
                      <Input className="mt-1 h-8 text-right text-xs" type="number" step="any" value={row.unit_cost} onChange={(event) => patchRow(index, { unit_cost: Number(event.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-[11px]">Markup %</Label>
                      <Input className="mt-1 h-8 text-right text-xs" type="number" step="any" value={row.markup_pct} onChange={(event) => patchRow(index, { markup_pct: Number(event.target.value) })} />
                    </div>
                  </div>
                ))}
                {onExtractedRows && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => applyRows("replace")}>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" />Replace current value rows
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => applyRows("append")}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />Add to current rows
                    </Button>
                    {rowsApplied && <span className="inline-flex items-center text-xs font-medium text-[var(--apas-sapphire)]">Rows applied. Review the table before invoicing.</span>}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Upload a PDF to let Proj OS suggest rows. If the PDF is scanned or unclear, type the approved values manually on the proposal page.
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Executed date</Label><Input type="date" value={acceptedDate} onChange={event => setAcceptedDate(event.target.value)} /></div>
            <div><Label>Signed by (optional)</Label><Input value={signerName} onChange={event => setSignerName(event.target.value)} placeholder={proposal.client_name || "Client signer"} /></div>
          </div>
          <div className="rounded-md border border-[var(--apas-amber)]/35 bg-[var(--apas-amber)]/10 p-3 text-sm text-[var(--apas-deep)]">
            Executing will automatically replace the primary PDF, mark the proposal approved, lock the record, and complete the workflow checklist.
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={action.isPending || !path || !acceptedDate} onClick={submit}>{action.isPending ? "Executing…" : proposal.status === "approved" ? "Replace executed PDF" : "Execute proposal"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
