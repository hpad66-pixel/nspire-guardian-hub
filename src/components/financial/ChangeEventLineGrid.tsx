/**
 * D3 · ChangeEventLineGrid — editable lines per change event.
 * Each line carries cost_code_id, estimated_cost, and a status bucket
 * (pending / approved / not_included / void). The pending bucket is what
 * feeds Budget's pending_exposure column.
 */
import { useState, useMemo } from "react";
import { Trash2, Plus } from "lucide-react";
import { useChangeEventLines, type ChangeEventLine } from "@/hooks/useChangeEvents";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CostCodePicker } from "@/components/shared/CostCodePicker";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/pdf";
import { toast } from "sonner";

type Bucket = ChangeEventLine["status_bucket"];

const BUCKET_VARIANTS: Record<Bucket, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  approved: "secondary",
  not_included: "outline",
  void: "destructive",
};

export interface ChangeEventLineGridProps {
  eventId: string;
  readOnly?: boolean;
  /** IDs checked for promote-to-PCO. Controlled by parent. */
  selected?: Set<string>;
  onToggleSelect?: (lineId: string) => void;
}

export function ChangeEventLineGrid({
  eventId, readOnly = false, selected, onToggleSelect,
}: ChangeEventLineGridProps) {
  const { data: lines = [], addLine, setBucket } = useChangeEventLines(eventId);

  const [draftCostCode, setDraftCostCode] = useState<string | null>(null);
  const [draftDescription, setDraftDescription] = useState("");
  const [draftEstimate, setDraftEstimate] = useState<number>(0);

  const totals = useMemo(() => {
    const t = { pending: 0, approved: 0, not_included: 0, void: 0 };
    for (const l of lines) t[l.status_bucket] += Number(l.estimated_cost ?? 0);
    return t;
  }, [lines]);

  async function handleAdd() {
    if (!draftCostCode || !draftDescription.trim()) {
      toast.error("Cost code + description required");
      return;
    }
    try {
      await addLine.mutateAsync({
        cost_code_id: draftCostCode,
        description: draftDescription.trim(),
        estimated_cost: draftEstimate,
        status_bucket: "pending",
      });
      setDraftCostCode(null);
      setDraftDescription("");
      setDraftEstimate(0);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleBucket(lineId: string, bucket: Bucket) {
    try {
      await setBucket.mutateAsync({ lineId, bucket });
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge className="font-mono">Pending {money(totals.pending)}</Badge>
        <Badge variant="secondary" className="font-mono">Approved {money(totals.approved)}</Badge>
        <Badge variant="outline" className="font-mono">Not incl. {money(totals.not_included)}</Badge>
        <Badge variant="destructive" className="font-mono">Void {money(totals.void)}</Badge>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {selected && <th className="w-10 p-2" />}
              <th className="w-56 p-2 text-left font-medium">Cost code</th>
              <th className="p-2 text-left font-medium">Description</th>
              <th className="w-32 p-2 text-right font-medium">Estimate</th>
              <th className="w-36 p-2 text-left font-medium">Status</th>
              <th className="w-20 p-2" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={selected ? 6 : 5} className="p-6 text-center text-muted-foreground">
                  No lines yet. Add one below.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr key={l.id} className="border-t">
                {selected && (
                  <td className="p-2">
                    <Checkbox
                      checked={selected.has(l.id)}
                      onCheckedChange={() => onToggleSelect?.(l.id)}
                      disabled={readOnly || l.status_bucket !== "pending"}
                    />
                  </td>
                )}
                <td className="p-2 font-mono text-xs text-muted-foreground">
                  {/* cost_code_id shown as-is; could resolve via useCostCodes for display later */}
                  {l.cost_code_id?.slice(0, 8) ?? "—"}
                </td>
                <td className="p-2">{l.description}</td>
                <td className="p-2 text-right font-mono">{money(Number(l.estimated_cost))}</td>
                <td className="p-2">
                  <Select
                    value={l.status_bucket}
                    onValueChange={(v) => handleBucket(l.id, v as Bucket)}
                    disabled={readOnly || l.pco_id != null}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="approved">approved</SelectItem>
                      <SelectItem value="not_included">not included</SelectItem>
                      <SelectItem value="void">void</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-2">
                  {l.pco_id && (
                    <Badge variant="outline" className="text-xs">PCO linked</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          {!readOnly && (
            <tfoot className="border-t-2 bg-muted/10">
              <tr>
                {selected && <td />}
                <td className="p-2">
                  <CostCodePicker value={draftCostCode} onChange={setDraftCostCode} />
                </td>
                <td className="p-2">
                  <Input
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Line description"
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number" inputMode="decimal" step="0.01"
                    value={draftEstimate}
                    onChange={(e) => setDraftEstimate(Number(e.target.value) || 0)}
                    className="text-right font-mono"
                  />
                </td>
                <td className="p-2" colSpan={2}>
                  <Button size="sm" onClick={handleAdd} disabled={addLine.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Add line
                  </Button>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
