/**
 * D5 · Timecard entry form (cost_type = 'timecard').
 * Employee required. Per-line hours × rate auto-computes amount.
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

export interface TimecardEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultEmployeeId?: string;
  onCreated?: (directCostId: string) => void;
}

export function TimecardEntryForm({
  open, onOpenChange, projectId, defaultEmployeeId, onCreated,
}: TimecardEntryFormProps) {
  const { create } = useDirectCosts(projectId, "timecard");
  const [refNo, setRefNo] = useState("");
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId ?? "");
  const [costDate, setCostDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<DirectCostLineDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const [draftId, setDraftId] = useState<string | null>(null);
  const { addLine } = useDirectCostLines(draftId);

  const lineTotal = useMemo(
    () => lines.reduce((s, l) => s + Number(l.amount ?? 0), 0),
    [lines],
  );
  const totalHours = useMemo(
    () => lines.reduce((s, l) => s + Number(l.hours ?? 0), 0),
    [lines],
  );

  async function handleSave() {
    if (!employeeId) { toast.error("Employee is required for timecards"); return; }
    if (lines.length === 0) { toast.error("Add at least one line"); return; }

    setSaving(true);
    try {
      const created = await create.mutateAsync({
        cost_type: "timecard",
        reference_no: refNo || `TC-${costDate}-${employeeId.slice(0, 4)}`,
        employee_id: employeeId,
        cost_date: costDate,
        amount: lineTotal,
        description: description || null,
        status: "open",
      });
      setDraftId(created.id);
      for (const l of lines) {
        if (!l.cost_code_id) continue;
        await addLine.mutateAsync({
          cost_code_id: l.cost_code_id,
          amount: l.amount,
          hours: l.hours ?? 0,
          rate: l.rate ?? 0,
        });
      }
      toast.success(`Timecard saved · ${totalHours}h · ${money(lineTotal)}`);
      onCreated?.(created.id);
      onOpenChange(false);
      setRefNo(""); setDescription(""); setLines([]); setDraftId(null);
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
          <DialogTitle>New timecard</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Reference</Label>
            <Input value={refNo} onChange={(e) => setRefNo(e.target.value)}
                   placeholder="auto-generated if blank" />
          </div>
          <div>
            <Label>Week ending / date</Label>
            <Input type="date" value={costDate} onChange={(e) => setCostDate(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Employee (auth.users id)</Label>
            <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                   placeholder="uuid" />
          </div>
          <div className="col-span-2">
            <Label>Notes</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Hours breakdown by cost code</Label>
            <div className="flex gap-2">
              <Badge variant="outline" className="font-mono">{totalHours} h</Badge>
              <Badge variant="outline" className="font-mono">{money(lineTotal)}</Badge>
            </div>
          </div>
          <DirectCostLinesEditor lines={lines} onChange={setLines} costType="timecard" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save timecard"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
