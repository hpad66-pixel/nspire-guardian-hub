/**
 * D5 · Invoice entry form (cost_type = 'invoice').
 * Requires vendor_org_id + attachment on approval. Line total must == header amount.
 */
import { useState, useMemo } from "react";
import { useDirectCosts, useDirectCostLines } from "@/hooks/useDirectCosts";
import { DirectCostLinesEditor, type DirectCostLineDraft } from "./DirectCostLinesEditor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

export interface InvoiceEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: (directCostId: string) => void;
}

export function InvoiceEntryForm({ open, onOpenChange, projectId, onCreated }: InvoiceEntryFormProps) {
  const { create } = useDirectCosts(projectId, "invoice");
  const [refNo, setRefNo] = useState("");
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [costDate, setCostDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [attachmentDocId, setAttachmentDocId] = useState("");
  const [lines, setLines] = useState<DirectCostLineDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(null);
  const { addLine } = useDirectCostLines(draftId);

  const lineTotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.amount ?? 0), 0),
    [lines],
  );
  const balanced = lines.length > 0 && Math.abs(lineTotal) > 0;

  async function handleSave() {
    if (!vendorOrgId) { toast.error("Vendor is required for invoices"); return; }
    if (!balanced) { toast.error("Add at least one line"); return; }

    setSaving(true);
    try {
      const created = await create.mutateAsync({
        cost_type: "invoice",
        reference_no: refNo || null,
        vendor_org_id: vendorOrgId,
        cost_date: costDate,
        amount: lineTotal,
        description: description || null,
        attachment_doc_id: attachmentDocId || null,
        status: "open",
      });
      setDraftId(created.id);
      for (const l of lines) {
        if (!l.cost_code_id) continue;
        await addLine.mutateAsync({
          cost_code_id: l.cost_code_id,
          amount: l.amount,
          hours: null, rate: null,
        });
      }
      toast.success(`Invoice ${refNo || created.id.slice(0, 8)} saved`);
      onCreated?.(created.id);
      onOpenChange(false);
      // reset
      setRefNo(""); setVendorOrgId(""); setDescription("");
      setAttachmentDocId(""); setLines([]); setDraftId(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Reference / invoice #</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="INV-1001" />
          </div>
          <div>
            <Label>Cost date</Label>
            <Input type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} />
          </div>
          <div>
            <Label>Vendor (organization id)</Label>
            <Input value={vendorOrgId} onChange={(e) => setVendorOrgId(e.target.value)}
                   placeholder="uuid" />
          </div>
          <div>
            <Label>Attachment (pl_documents id)</Label>
            <Input value={attachmentDocId} onChange={(e) => setAttachmentDocId(e.target.value)}
                   placeholder="uuid (required on approval)" />
          </div>
          <div className="col-span-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Lines</Label>
            <Badge variant="outline" className="font-mono">{money(lineTotal)}</Badge>
          </div>
          <DirectCostLinesEditor lines={lines} onChange={setLines} costType="invoice" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
