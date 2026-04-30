/**
 * T2.8 · Editable SOV (Schedule of Values) grid.
 *
 * Used by Prime Contract + Commitments. Supports:
 *   - inline editing of description + scheduled_value
 *   - cost code picker per line (via A5 CostCodePicker)
 *   - line reordering (up/down arrows)
 *   - running total footer with variance-vs-target badge
 *   - paste-from-Excel into description + scheduled_value columns
 *
 * The caller wires the actual Supabase mutations; this component is pure UI.
 */
import { useMemo, useState, useCallback } from "react";
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CostCodePicker } from "@/components/shared/CostCodePicker";
import { money } from "@/lib/pdf";

export interface SovLine {
  id: string;
  line_no: number;
  cost_code_id: string | null;
  description: string;
  scheduled_value: number;
}

export interface SovTableProps {
  lines: SovLine[];
  targetTotal: number;
  readOnly?: boolean;
  onChange: (next: SovLine[]) => void | Promise<void>;
  onPersist?: (line: SovLine) => void | Promise<void>;
  onRemove?: (id: string) => void | Promise<void>;
}

export function SovTable({
  lines, targetTotal, readOnly = false, onChange, onPersist, onRemove,
}: SovTableProps) {
  const [localLines, setLocalLines] = useState<SovLine[]>(lines);

  // Sync when parent refetches
  useMemo(() => setLocalLines(lines), [lines]);

  const total = useMemo(
    () => localLines.reduce((s, l) => s + Number(l.scheduled_value ?? 0), 0),
    [localLines],
  );
  const variance = total - targetTotal;
  const balanced = Math.abs(variance) < 0.01;

  const update = useCallback(
    (id: string, patch: Partial<SovLine>) => {
      const next = localLines.map((l) => (l.id === id ? { ...l, ...patch } : l));
      setLocalLines(next);
      onChange(next);
      const changed = next.find((l) => l.id === id);
      if (changed && onPersist) onPersist(changed);
    },
    [localLines, onChange, onPersist],
  );

  function addLine() {
    const nextNo = localLines.length > 0
      ? Math.max(...localLines.map((l) => l.line_no)) + 1
      : 1;
    const draft: SovLine = {
      id: `draft-${crypto.randomUUID()}`,
      line_no: nextNo,
      cost_code_id: null,
      description: "",
      scheduled_value: 0,
    };
    const next = [...localLines, draft];
    setLocalLines(next);
    onChange(next);
  }

  function move(id: string, dir: -1 | 1) {
    const idx = localLines.findIndex((l) => l.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= localLines.length) return;
    const next = [...localLines];
    [next[idx].line_no, next[swap].line_no] = [next[swap].line_no, next[idx].line_no];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setLocalLines(next);
    onChange(next);
    if (onPersist) next.forEach(onPersist);
  }

  /** Paste handler — supports Excel TSV (newline-separated rows, tab-separated cols). */
  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    if (readOnly) return;
    const text = e.clipboardData.getData("text");
    if (!text || !text.includes("\t")) return;
    e.preventDefault();
    const rows = text.trim().split(/\r?\n/).map((r) => r.split("\t"));
    const startNo = localLines.length > 0 ? Math.max(...localLines.map((l) => l.line_no)) + 1 : 1;
    const drafts: SovLine[] = rows.map((cells, i) => ({
      id: `draft-${crypto.randomUUID()}`,
      line_no: startNo + i,
      cost_code_id: null,
      description: (cells[0] ?? "").trim(),
      scheduled_value: Number((cells[1] ?? "").replace(/[$,]/g, "")) || 0,
    }));
    const next = [...localLines, ...drafts];
    setLocalLines(next);
    onChange(next);
  }

  return (
    <div className="space-y-2" onPaste={handlePaste}>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-14 p-2 text-left font-medium">#</th>
              <th className="w-60 p-2 text-left font-medium">Cost code</th>
              <th className="p-2 text-left font-medium">Description</th>
              <th className="w-36 p-2 text-right font-medium">Scheduled value</th>
              {!readOnly && <th className="w-24 p-2 text-center font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {localLines.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 4 : 5} className="p-6 text-center text-muted-foreground">
                  No SOV lines yet. {readOnly ? "" : "Paste from Excel or click Add line."}
                </td>
              </tr>
            )}
            {localLines.map((line) => (
              <tr key={line.id} className="border-t">
                <td className="p-2 font-mono text-xs text-muted-foreground">L{line.line_no}</td>
                <td className="p-2">
                  <CostCodePicker
                    value={line.cost_code_id}
                    onChange={(id) => update(line.id, { cost_code_id: id })}
                    disabled={readOnly}
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={line.description}
                    onChange={(e) => update(line.id, { description: e.target.value })}
                    placeholder="Work description"
                    disabled={readOnly}
                  />
                </td>
                <td className="p-2">
                  <Input
                    type="number" inputMode="decimal" step="0.01"
                    value={line.scheduled_value}
                    onChange={(e) => update(line.id, { scheduled_value: Number(e.target.value) || 0 })}
                    className="text-right font-mono"
                    disabled={readOnly}
                  />
                </td>
                {!readOnly && (
                  <td className="p-1">
                    <div className="flex items-center justify-center gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => move(line.id, -1)} title="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => move(line.id, 1)} title="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => onRemove?.(line.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-muted/20 font-medium">
            <tr className="border-t">
              <td colSpan={3} className="p-2 text-right">Total</td>
              <td className="p-2 text-right font-mono">{money(total)}</td>
              {!readOnly && <td className="p-2" />}
            </tr>
            <tr className="border-t">
              <td colSpan={3} className="p-2 text-right text-muted-foreground">
                Target (original contract value)
              </td>
              <td className="p-2 text-right font-mono text-muted-foreground">{money(targetTotal)}</td>
              {!readOnly && <td />}
            </tr>
            <tr className="border-t">
              <td colSpan={3} className="p-2 text-right text-muted-foreground">Variance</td>
              <td className="p-2 text-right">
                <Badge variant={balanced ? "default" : "destructive"} className="font-mono">
                  {balanced ? "Balanced" : money(variance)}
                </Badge>
              </td>
              {!readOnly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addLine}>
          <Plus className="h-4 w-4 mr-1" /> Add line
        </Button>
      )}
    </div>
  );
}
