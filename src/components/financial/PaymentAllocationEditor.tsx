/**
 * PaymentAllocationEditor — controlled UI to split a payment across the base
 * contract, change orders, and/or specific SOV line items. Emits AllocationDraft[]
 * via onChange. Shows the running allocated total + unallocated remainder and
 * inline validation. Allocation is optional (a remainder is allowed).
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import type { AllocationDraft } from "@/lib/financial/paymentAllocation";
import { allocatedTotal, unallocated, validateAllocations } from "@/lib/financial/paymentAllocation";
import type { AllocationTargets } from "@/hooks/usePaymentAllocations";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
const coLabel = (c: AllocationTargets["changeOrders"][number]) => `${c.co_type}-${String(c.co_no).padStart(3, "0")} · ${c.title}`;
const lineLabel = (l: AllocationTargets["lineItems"][number]) => `#${l.item_no} ${l.description}`.slice(0, 60);

function encode(a: AllocationDraft): string {
  if (a.kind === "change_order") return `co:${a.change_order_id}`;
  if (a.kind === "line_item") return `line:${a.sov_line_item_id}`;
  return "base";
}
function decode(v: string): Pick<AllocationDraft, "kind" | "change_order_id" | "sov_line_item_id"> {
  if (v.startsWith("co:")) return { kind: "change_order", change_order_id: v.slice(3), sov_line_item_id: null };
  if (v.startsWith("line:")) return { kind: "line_item", sov_line_item_id: v.slice(5), change_order_id: null };
  return { kind: "base", change_order_id: null, sov_line_item_id: null };
}

export function PaymentAllocationEditor({
  paymentAmount, value, onChange, targets,
}: {
  paymentAmount: number;
  value: AllocationDraft[];
  onChange: (next: AllocationDraft[]) => void;
  targets: AllocationTargets | undefined;
}) {
  const remainder = unallocated(paymentAmount, value);
  const errors = validateAllocations(paymentAmount, value);

  const update = (i: number, patch: Partial<AllocationDraft>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { kind: "base", amount: Math.max(0, remainder) }]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Apply payment to <span className="text-muted-foreground font-normal">(optional)</span></span>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>

      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Not split — the full payment stays unassigned. Add a row to apply it to the base contract, a change order, or a line item.
        </p>
      )}

      {value.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            value={encode(a)}
            onChange={(e) => update(i, decode(e.target.value))}
          >
            <option value="base">Base contract</option>
            {targets?.changeOrders.length ? (
              <optgroup label="Change orders">
                {targets.changeOrders.map((c) => <option key={c.id} value={`co:${c.id}`}>{coLabel(c)}</option>)}
              </optgroup>
            ) : null}
            {targets?.lineItems.length ? (
              <optgroup label="Line items">
                {targets.lineItems.map((l) => <option key={l.id} value={`line:${l.id}`}>{lineLabel(l)}</option>)}
              </optgroup>
            ) : null}
          </select>
          <Input
            type="number" step="0.01" min="0" placeholder="0.00"
            className="w-32 font-mono text-right"
            value={a.amount || ""}
            onChange={(e) => update(i, { amount: Number(e.target.value) || 0 })}
          />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(i)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {value.length > 0 && (
        <div className="flex items-center justify-between text-xs pt-1 border-t">
          <span className="text-muted-foreground">Allocated {money(allocatedTotal(value))} of {money(paymentAmount)}</span>
          <span className={remainder < -0.001 ? "text-[var(--apas-rose)] font-medium" : remainder > 0.001 ? "text-[var(--apas-amber)] font-medium" : "text-[var(--apas-emerald)] font-medium"}>
            {remainder < -0.001 ? `Over by ${money(-remainder)}` : `${money(remainder)} unallocated`}
          </span>
        </div>
      )}
      {errors.length > 0 && (
        <ul className="text-xs text-[var(--apas-rose)] list-disc pl-4">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}
