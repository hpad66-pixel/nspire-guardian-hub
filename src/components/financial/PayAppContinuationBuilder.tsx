/**
 * PayAppContinuationBuilder — the G703 continuation sheet on the
 * sov_line_items / pay_app_line_progress schema (base + change-order lines).
 *
 * The GC enters "this period" per line; to-date = prior + this period, and the
 * live AIA G702 cover recomputes. Approved change orders are pulled in as lines
 * via "Load approved change orders". Locked once the pay app is approved/paid.
 */
import { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  usePayAppContinuation,
  useLoadApprovedCos,
  type ContinuationLine,
} from "@/hooks/usePayAppContinuation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";

const G702_ROWS: Array<[string, keyof import("@/lib/financial/payAppContinuation").G702Summary]> = [
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
      const n = await loadCos.mutateAsync();
      toast.success(n > 0 ? `Loaded ${n} approved change order${n === 1 ? "" : "s"} into the SOV.` : "No new approved change orders to load.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  }

  async function commit(line: ContinuationLine, patch: { qty_this_period?: number; value_this_period?: number }) {
    try {
      await upsertLine.mutateAsync({
        sov_line_item_id: line.sov_line_item_id,
        scheduled_value: line.scheduled_value,
        qty_this_period: patch.qty_this_period ?? line.qty_this_period,
        value_this_period: patch.value_this_period ?? line.value_this_period,
      });
    } catch (e: any) { toast.error(e.message); }
  }

  const base = lines.filter((l) => l.kind === "base");
  const cos = lines.filter((l) => l.kind === "change_order");

  return (
    <div className="space-y-4">
      {!locked && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Enter work completed <strong>this period</strong> per line. To-date carries forward from the prior pay app.
          </p>
          <Button variant="outline" size="sm" disabled={loadCos.isPending} onClick={loadApprovedCos}>
            <Plus className="h-4 w-4 mr-1" />{loadCos.isPending ? "Loading…" : "Load approved change orders"}
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="p-2 text-left w-12">#</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-right">Scheduled</th>
              <th className="p-2 text-right">Previous</th>
              <th className="p-2 text-right w-32">This period ($)</th>
              <th className="p-2 text-right">To date</th>
              <th className="p-2 text-right w-16">%</th>
              <th className="p-2 text-right">Retainage</th>
            </tr>
          </thead>
          <LineSection title="Base contract" rows={base} locked={locked} onCommit={commit} />
          {cos.length > 0 && <LineSection title="Change orders" rows={cos} locked={locked} onCommit={commit} />}
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
  onCommit: (line: ContinuationLine, patch: { value_this_period?: number }) => void;
}) {
  return (
    <tbody>
      <tr className="bg-muted/20">
        <td colSpan={8} className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">{title}</td>
      </tr>
      {rows.length === 0 && (
        <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No lines.</td></tr>
      )}
      {rows.map((l) => (
        <tr key={l.sov_line_item_id} className="border-t">
          <td className="p-2 text-muted-foreground">{l.item_no}</td>
          <td className="p-2">
            {l.description}
            {l.kind === "change_order" && <Badge variant="outline" className="ml-2 text-[10px]">CO</Badge>}
          </td>
          <td className="p-2 text-right font-mono">{money(l.scheduled_value)}</td>
          <td className="p-2 text-right font-mono text-muted-foreground">{money(l.prior_value_to_date)}</td>
          <td className="p-2 text-right">
            {locked ? (
              <span className="font-mono">{money(l.value_this_period)}</span>
            ) : (
              <Input
                type="number" inputMode="decimal" step="0.01"
                defaultValue={l.value_this_period || ""}
                className="h-8 text-right font-mono"
                onBlur={(e) => {
                  const v = Number(e.target.value) || 0;
                  if (v !== l.value_this_period) onCommit(l, { value_this_period: v });
                }}
              />
            )}
          </td>
          <td className="p-2 text-right font-mono">{money(l.value_to_date)}</td>
          <td className="p-2 text-right font-mono">{l.pct_complete.toFixed(0)}%</td>
          <td className="p-2 text-right font-mono">{money(l.retainage)}</td>
        </tr>
      ))}
    </tbody>
  );
}
