/**
 * PayAppContinuationBuilder — the G703 continuation sheet on the
 * sov_line_items / pay_app_line_progress schema (base + change-order lines).
 *
 * Unit-price billing: the GC enters the QUANTITY completed this period per line;
 * value = qty × unit price, and qty/value to-date = prior + this period. Prior
 * cumulative figures carry forward automatically from the previous pay app, so
 * only this period's quantities are entered. The live AIA G702 cover recomputes.
 * Approved change orders are pulled in as lines via "Load approved change orders".
 * Locked once the pay app is approved/paid — unless an administrator edits a
 * scheduled value and clicks "Reload cover from SOV".
 */
import { useState } from "react";
import { RefreshCw, Plus, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  usePayAppContinuation,
  useLoadApprovedCos,
  useApprovedCoValue,
  type ContinuationLine,
} from "@/hooks/usePayAppContinuation";
import { usePrimeContract } from "@/hooks/usePrimeContract";
import { useUserPermissions } from "@/hooks/usePermissions";
import { computeG703GrandTotals, round2 } from "@/lib/financial/payAppContinuation";
import { g702SidebarRows } from "@/lib/payApp/g702Labels";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { money } from "@/lib/pdf";

const qty = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function PayAppContinuationBuilder({
  payAppId, projectId, primeContractId,
}: { payAppId: string; projectId: string; primeContractId: string }) {
  const {
    detail, lines, g702, isFrozen, upsertLine, setLineRetainage,
    adminEditSovLine, reloadCoverFromSov, refetch,
  } = usePayAppContinuation(payAppId);
  const loadCos = useLoadApprovedCos(primeContractId, projectId);
  const { data: contract } = usePrimeContract(projectId);
  const approvedCoQ = useApprovedCoValue(primeContractId, projectId);
  const { isAdmin } = useUserPermissions();
  const status = detail.data?.status as string | undefined;
  const isFinalInvoice =
    Boolean((detail.data as any)?.is_final_invoice) ||
    Boolean((detail.data as any)?.pay_app_data?.is_final_invoice);
  const G702_ROWS = g702SidebarRows(isFinalInvoice);
  // A submitted pay app is a fixed certificate — lock ordinary editing.
  // Admins can still correct scheduled values and reload the cover.
  const locked = isFrozen;
  const [editLine, setEditLine] = useState<ContinuationLine | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [billToScheduled, setBillToScheduled] = useState(true);

  async function toggleRetainage(line: ContinuationLine) {
    try {
      await setLineRetainage.mutateAsync({ sovLineItemId: line.sov_line_item_id, exempt: !line.retainage_exempt });
      toast.success(line.retainage_exempt ? "Retainage restored on this line." : "Retainage removed from this line.");
      refetch();
    } catch (e: any) { toast.error(e.message); }
  }

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

  /** Commit a new this-period QUANTITY → value = qty × unit price. Capped at the
   *  scheduled quantity — billing more requires an approved change order. */
  async function commitQty(line: ContinuationLine, qtyThisPeriod: number) {
    const remaining = line.scheduled_qty - line.prior_qty_to_date;
    if (qtyThisPeriod > remaining + 0.0001) {
      toast.error(
        `Exceeds the scheduled quantity — only ${qty(Math.max(0, remaining))} ${line.unit ?? ""} remain on this line. Bill the extra on an approved change order instead.`,
        { action: { label: "Create CO", onClick: () => { window.location.href = `/projects/${projectId}/financials/change-orders/new`; } } },
      );
      return;
    }
    try {
      await upsertLine.mutateAsync({
        sov_line_item_id: line.sov_line_item_id,
        scheduled_value: line.scheduled_value,
        qty_this_period: qtyThisPeriod,
        value_this_period: round2(qtyThisPeriod * line.unit_price),
      });
    } catch (e: any) {
      toast.error(/scheduled value|check_violation/i.test(e.message)
        ? "Can't bill beyond the scheduled quantity on this line — raise a change order for the extra scope."
        : e.message);
    }
  }

  function openAdminEdit(line: ContinuationLine) {
    setEditLine(line);
    setEditAmount(String(line.scheduled_value));
    setBillToScheduled(true);
  }

  async function saveAdminEdit() {
    if (!editLine) return;
    const amount = round2(Number(editAmount));
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Enter a non-zero scheduled amount.");
      return;
    }
    try {
      await adminEditSovLine.mutateAsync({
        sov_line_item_id: editLine.sov_line_item_id,
        scheduled_value: amount,
        billToScheduled,
      });
      toast.success(
        `Updated #${editLine.item_no} to ${money(amount)}${billToScheduled ? " (billed 100%)" : ""}. Click Reload cover from SOV to refresh Lines 1–9.`,
      );
      setEditLine(null);
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function reloadCover() {
    try {
      const next = await reloadCoverFromSov.mutateAsync();
      toast.success(
        `Cover reloaded from SOV — Current due ${money(next.current_payment_due)}, Line 9 ${money(next.balance_to_finish)}.`,
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const base = lines.filter((l) => l.kind === "base");
  const cos = lines.filter((l) => l.kind === "change_order");
  // A line billed past its scheduled value (over 100%). Not allowed — needs a CO.
  const overbilled = lines.filter((l) => l.value_to_date > l.scheduled_value + 0.01);

  // ── Reconciliation vs the contract / financial dashboard ──────────────────
  const reconReady = Boolean(contract) && approvedCoQ.isSuccess;
  const originalContract = round2(Number((contract as any)?.original_value ?? 0));
  const baseSov = round2(base.reduce((s, l) => s + l.scheduled_value, 0));
  const baseDelta = round2(baseSov - originalContract);
  const approvedCoTotal = round2(approvedCoQ.data ?? 0);
  const coDelta = round2(approvedCoTotal - g702.net_change_orders);
  const reconciled = Math.abs(baseDelta) < 0.01 && Math.abs(coDelta) < 0.01;

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
            {isAdmin && <> Admins can also edit the scheduled value with the pencil and reload the cover.</>}
          </span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {locked
            ? <>Submitted{status && status !== "submitted" ? ` · ${status}` : ""} — these figures are <strong>frozen exactly as submitted</strong>.
              {isAdmin
                ? <> Admins can correct a line&apos;s scheduled value, then <strong>Reload cover from SOV</strong>.</>
                : <> Later change orders and progress go onto the next pay app, not this one.</>}
            </>
            : <>Enter the <strong>quantity completed this period</strong> per line — value computes from the unit price, and to-date carries forward from the prior pay app.</>}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {!locked && (
            <Button variant="outline" size="sm" disabled={loadCos.isPending} onClick={loadApprovedCos}>
              <Plus className="h-4 w-4 mr-1" />{loadCos.isPending ? "Loading…" : "Load approved change orders"}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              disabled={reloadCoverFromSov.isPending}
              onClick={reloadCover}
              title="Recompute G702 Lines 1–9 from the current SOV and pin the cover"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {reloadCoverFromSov.isPending ? "Reloading…" : "Reload cover from SOV"}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refetch} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Reconciliation strip — flags when the pay app's base / net-change don't
          match the contract Original Contract Sum and the approved-CO roll-up. */}
      {reconReady && (
        reconciled ? (
          <div className="rounded-md border border-[var(--apas-emerald)]/40 bg-[var(--apas-emerald)]/5 px-3 py-2 text-xs text-[var(--apas-emerald)]">
            Reconciled — base {money(originalContract)} + approved change orders {money(approvedCoTotal)} = contract sum to date {money(g702.contract_sum_to_date)}.
          </div>
        ) : (
          <div className="rounded-md border border-[var(--apas-amber)] bg-[var(--apas-amber)]/5 px-3 py-2 text-sm space-y-1">
            <div className="font-medium text-[var(--apas-amber)]">This pay app doesn&apos;t reconcile with the contract yet</div>
            {Math.abs(coDelta) >= 0.01 && (
              <div className="text-muted-foreground">
                <strong className="text-foreground">Change orders:</strong> {money(approvedCoTotal)} approved on the contract vs {money(g702.net_change_orders)} loaded on this pay app —{" "}
                {coDelta > 0
                  ? <><span className="text-foreground">{money(coDelta)} not yet loaded.</span>{!locked && <> Click <strong>Load approved change orders</strong> above.</>}</>
                  : <span className="text-foreground">{money(-coDelta)} more on the pay app than is approved (a CO may have been voided or amended).</span>}
              </div>
            )}
            {Math.abs(baseDelta) >= 0.01 && (
              <div className="text-muted-foreground">
                <strong className="text-foreground">Base contract:</strong> Original Contract Sum {money(originalContract)} vs base SOV lines {money(baseSov)} —{" "}
                <span className="text-foreground">{money(Math.abs(baseDelta))} {baseDelta > 0 ? "more in the line items than the contract value" : "short of the contract value in the line items"}.</span>{" "}
                The G702 bills against the Original Contract Sum; the base line items should total it.
              </div>
            )}
          </div>
        )
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs">
            <tr>
              <th className="p-2 text-left w-10">#</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-left w-12">Unit</th>
              <th className="p-2 text-right">Sched $</th>
              <th className="p-2 text-right">Sched qty</th>
              <th className="p-2 text-right">Prev qty</th>
              <th className="p-2 text-right w-28">This period qty</th>
              <th className="p-2 text-right">Qty to date</th>
              <th className="p-2 text-right w-14">%</th>
              <th className="p-2 text-right">Value to date</th>
              <th className="p-2 text-center w-20" title="Hold retainage on this line?">Retainage</th>
              {isAdmin && <th className="p-2 text-center w-12">Admin</th>}
            </tr>
          </thead>
          <LineSection
            title="Base contract"
            rows={base}
            locked={locked}
            isAdmin={isAdmin}
            onCommit={commitQty}
            onToggleRetainage={toggleRetainage}
            onAdminEdit={openAdminEdit}
          />
          {cos.length > 0 && (
            <LineSection
              title="Change orders"
              rows={cos}
              locked={locked}
              isAdmin={isAdmin}
              onCommit={commitQty}
              onToggleRetainage={toggleRetainage}
              onAdminEdit={openAdminEdit}
            />
          )}
          {(() => {
            // AIA: footer Column G / I must match G702 Lines 4 / 5 (cover snapshot).
            const t = computeG703GrandTotals(
              lines.map((l) => ({
                scheduled_value: l.scheduled_value,
                value_to_date: l.value_to_date,
                retainage: l.retainage,
              })),
              g702,
            );
            const colSpan = isAdmin ? 5 : 4;
            return (
              <tfoot>
                <tr className="border-t-2 bg-muted/30 font-semibold" data-testid="continuation-grand-total">
                  <td className="p-2" colSpan={colSpan}>Grand total</td>
                  <td className="p-2" colSpan={4} />
                  <td className="p-2 text-right font-mono" data-testid="continuation-total-to-date">{money(t.toDate)}</td>
                  <td className="p-2 text-center font-mono" data-testid="continuation-total-retainage">{money(t.retainage)}</td>
                  {isAdmin && <td />}
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>

      {/* Live AIA G702 cover */}
      <div className="rounded-md border">
        <div className="bg-muted/40 px-3 py-2 text-sm font-medium flex items-center justify-between gap-2">
          <span>AIA G702 — Application for Payment (live)</span>
          {isFinalInvoice && (
            <Badge className="bg-[var(--apas-sapphire)] text-white tracking-wider uppercase text-[10px]">
              Final Invoice
            </Badge>
          )}
        </div>
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
        {isFinalInvoice && (
          <div className="border-t px-3 py-2 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Final invoice:</strong> Line 7 is paid to date.
            Line 9 is <strong>Line 3 − Line 4</strong> (contract − completed) — the true unbuilt /
            unbilled leftover. It is <em>not</em> Line 3 − Line 6 (that older AIA figure also
            bundled retainage already shown in Lines 5–6). Leftover quantities will not be billed;
            the project closes on payment of Line 8.
          </div>
        )}
      </div>

      <Dialog open={Boolean(editLine)} onOpenChange={(o) => { if (!o) setEditLine(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Admin: edit scheduled value</DialogTitle>
            <DialogDescription>
              Correct item #{editLine?.item_no} {editLine?.description}. This updates the SOV
              {editLine?.kind === "change_order" ? " and the linked change-order amount" : ""}.
              Then click <strong>Reload cover from SOV</strong> so Lines 1–9 recalculate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-sched">Scheduled value ($)</Label>
              <Input
                id="admin-sched"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Current billed to date: {money(editLine?.value_to_date ?? 0)}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="bill-to-sched"
                checked={billToScheduled}
                onCheckedChange={(v) => setBillToScheduled(v === true)}
              />
              <Label htmlFor="bill-to-sched" className="text-sm font-normal leading-snug cursor-pointer">
                Also set value to date = new scheduled (bill 100% on this line)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLine(null)}>Cancel</Button>
            <Button disabled={adminEditSovLine.isPending} onClick={saveAdminEdit}>
              {adminEditSovLine.isPending ? "Saving…" : "Save correction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LineSection({
  title, rows, locked, isAdmin, onCommit, onToggleRetainage, onAdminEdit,
}: {
  title: string; rows: ContinuationLine[]; locked: boolean; isAdmin: boolean;
  onCommit: (line: ContinuationLine, qtyThisPeriod: number) => void;
  onToggleRetainage: (line: ContinuationLine) => void;
  onAdminEdit: (line: ContinuationLine) => void;
}) {
  const cols = isAdmin ? 12 : 11;
  return (
    <tbody>
      <tr className="bg-muted/20">
        <td colSpan={cols} className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">{title}</td>
      </tr>
      {rows.length === 0 && (
        <tr><td colSpan={cols} className="p-4 text-center text-muted-foreground">No lines.</td></tr>
      )}
      {rows.map((l) => {
        const over = l.value_to_date > l.scheduled_value + 0.01;
        const remaining = Math.max(0, l.scheduled_qty - l.prior_qty_to_date);
        return (
        <tr key={l.sov_line_item_id} className={`border-t ${over ? "bg-[var(--apas-rose)]/5" : ""}`}>
          <td className="p-2 text-muted-foreground">{l.item_no}</td>
          <td className="p-2">
            {l.description}
            {l.kind === "change_order" && <Badge variant="outline" className="ml-2 text-[10px]">CO</Badge>}
            {over && <Badge className="ml-2 text-[10px] bg-[var(--apas-rose)] text-white">Over 100%</Badge>}
          </td>
          <td className="p-2 text-muted-foreground">{l.unit ?? "—"}</td>
          <td className="p-2 text-right font-mono">{money(l.scheduled_value)}</td>
          <td className="p-2 text-right font-mono">{qty(l.scheduled_qty)}</td>
          <td className="p-2 text-right font-mono text-muted-foreground">{qty(l.prior_qty_to_date)}</td>
          <td className="p-2 text-right">
            {locked ? (
              <span className="font-mono">{qty(l.qty_this_period)}</span>
            ) : (
              <Input
                type="number" inputMode="decimal" step="any" max={remaining || undefined}
                defaultValue={l.qty_this_period || ""}
                placeholder={`${qty(remaining)} left`}
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
          <td className="p-2 text-center">
            {l.retainage_exempt ? (
              <button type="button" disabled={locked && !isAdmin} onClick={() => onToggleRetainage(l)}
                className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-60" title="No retainage held — click to restore">
                Exempt
              </button>
            ) : (
              <button type="button" disabled={locked && !isAdmin} onClick={() => onToggleRetainage(l)}
                className="font-mono text-xs hover:text-[var(--apas-rose)] disabled:opacity-60" title="Retainage held — click to exempt this line">
                {money(l.retainage)}
              </button>
            )}
          </td>
          {isAdmin && (
            <td className="p-2 text-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Admin: edit scheduled value"
                onClick={() => onAdminEdit(l)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </td>
          )}
        </tr>
        );
      })}
    </tbody>
  );
}
