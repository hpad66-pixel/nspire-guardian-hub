/**
 * D5 · Expense entry form (cost_type = 'expense').
 * Either vendor or employee required; attachment required on approval.
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

export interface ExpenseEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated?: (directCostId: string) => void;
}

export function ExpenseEntryForm({ open, onOpenChange, projectId, onCreated }: ExpenseEntryFormProps) {
  const { create } = useDirectCosts(projectId, "expense");
  const [refNo, setRefNo] = useState("");
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
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

  async function handleSave() {
    if (!vendorOrgId && !employeeId) {
      toast.error("Expense requires either a vendor or an employee");
      return;
    }
    if (lines.length === 0) { toast.error("Add at least one line"); return; }

    setSaving(true);
    try {
      const created = await create.mutateAsync({
        cost_type: "expense",
        reference_no: refNo || null,
        vendor_org_id: vendorOrgId || null,
        employee_id: employeeId || null,
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
      toast.success(`Expense saved · ${money(lineTotal)}`);
      onCreated?.(created.id);
      onOpenChange(false);
      setRefNo(""); setVendorOrgId(""); setEmployeeId("");
      setDescription(""); setAttachmentDocId(""); setLines([]); setDraftId(null);
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
          <DialogTitle>New expense</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Receipt reference</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="e.g. Rec-2026-0412" />
          </div>
          <div>
            <Label>Cost date</Label>
            <Input type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} />
          </div>
          <div>
            <Label>Vendor (organization id)</Label>
            <Input value={vendorOrgId} onChange={(e) => setVendorOrgId(e.target.value)}
                   placeholder="uuid (optional)" />
          </div>
          <div>
            <Label>Employee (auth.users id)</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                   placeholder="uuid (optional)" />
          </div>
          <div>
            <Label>Attachment (pl_documents id)</Label>
            <Input value={attachmentDocId} onChange={(e) => setAttachmentDocId(e.target.value)}
                   placeholder="uuid (required on approval)" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Lines</Label>
            <Badge variant="outline" className="font-mono">{money(lineTotal)}</Badge>
          </div>
          <DirectCostLinesEditor lines={lines} onChange={setLines} costType="expense" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
