/**
 * PayAppContinuationBuilder — the G703 continuation sheet on the
 * sov_line_items / pay_app_line_progress schema (base + change-order lines).
 *
 * Unit-price billing: the GC enters the QUANTITY completed this period per line;
 * value = qty × unit price, and qty/value to-date = prior + this period. Prior
 * cumulative figures carry forward automatically from the previous pay app, so
 * only this period's quantities are entered. The live AIA G702 cover recomputes.
 * Approved change orders are pulled in as lines via "Load approved change orders".
 * Locked once the pay app is approved/paid.
 */
import { RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  usePayAppContinuation,
  useLoadApprovedCos,
  type ContinuationLine,
} from "@/hooks/usePayAppContinuation";
import { round2, type G702Summary } from "@/lib/financial/payAppContinuation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";

const qty = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

const G702_ROWS: Array<[string, keyof G702Summary]> = [
  ["1. Original Contract Sum", "original_contract_sum"],
  ["2. Net change by change orders", "net_change_orders"],
  ["3. Contract Sum to date", "contract_sum_to_date"],
  ["4. Total completed & stored to date", "completed_stored_to_date"],
  ["5. Retainage", "retainage_total"],
  ["6. Total earned less retainage", "total_earned_less_retainage"],
  ["7. Less previous certificates", "less_previous_certificates"],
  ["8. CURRENT PAYMENT DUE", "current_payment_due"],
  ["9. Balance to finish (incl. retainage)", "balance_to_finish"],
];

export function PayAppContinuationBuilder({
  payAppId, projectId, primeContractId,
}: { payAppId: string; projectId: string; primeContractId: string }) {
  const { detail, lines, g702, upsertLine, refetch } = usePayAppContinuation(payAppId);
  const loadCos = useLoadApprovedCos(primeContractId, projectId);
  const status = detail.data?.status as string | undefined;
  const locked = status === "approved" || status === "paid";

  async function loadApprovedCos() {
    try {
      const { inserted, updated } = await loadCos.mutateAsync();
      const parts: string[] = [];
      if (inserted) parts.push(`added ${inserted} change order${inserted === 1 ? "" : "s"}`);
      if (updated) parts.push(`refreshed ${updated} title${updated === 1 ? "" : "s"}`);
      toast.success(parts.length ? `Approved change orders: ${parts.join(" · ")}.` : "Approved change orders are already up to date.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  }

  /** Commit a new this-period QUANTITY → value = qty × unit price. */
  async function commitQty(line: ContinuationLine, qtyThisPeriod: number) {
    try {
      await upsertLine.mutateAsync({
        sov_line_item_id: line.sov_line_item_id,
        scheduled_value: line.scheduled_value,
        qty_this_period: qtyThisPeriod,
        value_this_period: round2(qtyThisPeriod * line.unit_price),
      });
    } catch (e: any) { toast.error(e.message); }
  }

  const base = lines.filter((l) => l.kind === "base");
  const cos = lines.filter((l) => l.kind === "change_order");
  // A line billed past its scheduled value (over 100%). Not allowed — needs a CO.
  const overbilled = lines.filter((l) => l.value_to_date > l.scheduled_value + 0.01);

  return (
    <div className="space-y-4">
      {overbilled.length > 0 && (
        <div className="rounded-md border border-[var(--apas-rose)] bg-[var(--apas-rose)]/5 px-3 py-2 text-sm">
          <span className="font-medium text-[var(--apas-rose)]">
            {overbilled.length} line{overbilled.length === 1 ? "" : "s"} billed over 100% of scheduled.
          </span>{" "}
          <span className="text-muted-foreground">
            Billing past the contract quantity isn&apos;t allowed. Back these down to ≤ 100%, or raise an
            approved change order for the extra scope and bill it on the change-order line instead.
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {locked
            ? "This pay app is locked."
            : <>Enter the <strong>quantity completed this period</strong> per line — value computes from the unit price, and to-date carries forward from the prior pay app.</>}
        </p>
        <div className="flex items-center gap-2">
          {!locked && (
            <Button variant="outline" size="sm" disabled={loadCos.isPending} onClick={loadApprovedCos}>
              <Plus className="h-4 w-4 mr-1" />{loadCos.isPending ? "Loading…" : "Load approved change orders"}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refetch} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="p-2 text-left w-10">#</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left w-12">Unit</th>
              <th className="p-2 text-right">Sched qty</th>
              <th className="p-2 text-right">Prev qty</th>
              <th className="p-2 text-right w-28">This period qty</th>
              <th className="p-2 text-right">Qty to date</th>
              <th className="p-2 text-right w-14">%</th>
              <th className="p-2 text-right">Value to date</th>
            </tr>
          </thead>
          <LineSection title="Base contract" rows={base} locked={locked} onCommit={commitQty} />
          {cos.length > 0 && <LineSection title="Change orders" rows={cos} locked={locked} onCommit={commitQty} />}
        </table>
      </div>

      {/* Live AIA G702 cover */}
      <div className="rounded-md border">
        <div className="bg-muted/40 px-3 py-2 text-sm font-medium">AIA G702 — Application for Payment (live)</div>
        <table className="w-full text-sm">
          <tbody>
            {G702_ROWS.map(([label, key]) => (
              <tr key={key} className={`border-t ${key === "current_payment_due" ? "font-bold bg-[var(--apas-sapphire)]/5" : ""}`}>
                <td className="py-2 px-3">{label}</td>
                <td className="py-2 px-3 text-right font-mono">{money(Number(g702[key] ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LineSection({
  title, rows, locked, onCommit,
}: {
  title: string; rows: ContinuationLine[]; locked: boolean;
  onCommit: (line: ContinuationLine, qtyThisPeriod: number) => void;
}) {
  return (
    <tbody>
      <tr className="bg-muted/20">
        <td colSpan={9} className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">{title}</td>
      </tr>
      {rows.length === 0 && (
        <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No lines.</td></tr>
      )}
      {rows.map((l) => {
        const over = l.value_to_date > l.scheduled_value + 0.01;
        return (
        <tr key={l.sov_line_item_id} className={`border-t ${over ? "bg-[var(--apas-rose)]/5" : ""}`}>
          <td className="p-2 text-muted-foreground">{l.item_no}</td>
          <td className="p-2">
            {l.description}
            {l.kind === "change_order" && <Badge variant="outline" className="ml-2 text-[10px]">CO</Badge>}
            {over && <Badge className="ml-2 text-[10px] bg-[var(--apas-rose)] text-white">Over 100%</Badge>}
          </td>
          <td className="p-2 text-muted-foreground">{l.unit ?? "—"}</td>
          <td className="p-2 text-right font-mono">{qty(l.scheduled_qty)}</td>
          <td className="p-2 text-right font-mono text-muted-foreground">{qty(l.prior_qty_to_date)}</td>
          <td className="p-2 text-right">
            {locked ? (
              <span className="font-mono">{qty(l.qty_this_period)}</span>
            ) : (
              <Input
                type="number" inputMode="decimal" step="any"
                defaultValue={l.qty_this_period || ""}
                className="h-8 text-right font-mono"
                onBlur={(e) => {
                  const v = Number(e.target.value) || 0;
                  if (v !== l.qty_this_period) onCommit(l, v);
                }}
              />
            )}
          </td>
          <td className="p-2 text-right font-mono">{qty(l.qty_to_date)}</td>
          <td className={`p-2 text-right font-mono ${over ? "text-[var(--apas-rose)] font-bold" : ""}`}>{l.pct_complete.toFixed(0)}%</td>
          <td className="p-2 text-right font-mono">{money(l.value_to_date)}</td>
        </tr>
        );
      })}
    </tbody>
  );
}
