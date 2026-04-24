/**
 * E2 · RootCauseEditor — inline list of root causes for a single incident.
 *
 * Each entry has a category (Man / Machine / Method / Material / Environment /
 * Measurement — the classic 5M+1E fishbone) plus a free-text description.
 * Rows can be added and removed inline; there's no "publish" state — write
 * access is governed by RLS on `incident_root_causes`.
 */
import { useState } from "react";
import { useIncidentRootCauses } from "@/hooks/useIncidents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Man", "Machine", "Method", "Material", "Environment", "Measurement", "Other",
];

export function RootCauseEditor({
  incidentId,
}: { incidentId: string }) {
  const { data: rows = [], add, remove } = useIncidentRootCauses(incidentId);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");

  async function handleAdd() {
    if (!description.trim()) { toast.error("Describe the cause"); return; }
    try {
      await add.mutateAsync({
        category, description: description.trim(),
      });
      setDescription("");
      toast.success("Cause added");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="w-44">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label>Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Ladder not tied off at top"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button onClick={handleAdd} disabled={add.isPending || !description.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
          No root causes recorded yet.
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-2 text-sm">
              <span className="w-32 shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                {r.category ?? "—"}
              </span>
              <span className="flex-1 min-w-0 truncate">{r.description ?? "—"}</span>
              <Button
                size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => remove.mutate(r.id)}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
