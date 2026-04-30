import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ilike";

export interface FilterRule {
  id: string;
  column: string;
  op: FilterOp;
  value: string;
}

const OPS: Array<[FilterOp, string]> = [
  ["eq", "equals"],
  ["neq", "not equals"],
  ["gt", ">"],
  ["gte", "≥"],
  ["lt", "<"],
  ["lte", "≤"],
  ["ilike", "contains"],
];

export function FilterRuleBuilder({
  rules, columns, onChange,
}: {
  rules: FilterRule[];
  columns: string[];
  onChange: (rules: FilterRule[]) => void;
}) {
  function add() {
    onChange([
      ...rules,
      { id: crypto.randomUUID(), column: columns[0] ?? "", op: "eq", value: "" },
    ]);
  }
  function update(id: string, patch: Partial<FilterRule>) {
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function remove(id: string) {
    onChange(rules.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-2">
      {rules.length === 0 && (
        <div className="text-sm text-muted-foreground">No filters — all rows returned.</div>
      )}
      {rules.map((r) => (
        <div key={r.id} className="flex items-center gap-2">
          <Select value={r.column} onValueChange={(v) => update(r.id, { column: v })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={r.op} onValueChange={(v) => update(r.id, { op: v as FilterOp })}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {OPS.map(([op, label]) => <SelectItem key={op} value={op}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            value={r.value}
            onChange={(e) => update(r.id, { value: e.target.value })}
            placeholder="value"
            className="flex-1"
          />
          <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" /> Add filter
      </Button>
    </div>
  );
}
