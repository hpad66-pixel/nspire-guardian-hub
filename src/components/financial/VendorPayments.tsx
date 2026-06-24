/**
 * VendorPayments — a per-subcontractor "ecosystem" tab strip. Pick a vendor and see
 * everything paid to them: a KPI strip (contract / billed / paid / open / retention),
 * their invoices reconciled against payments, and every payment drilled down to its
 * granular split (base / change order / line item — i.e. labor vs. materials dollars).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, ListPlus, Receipt, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReconciledBadge, ReconciledStamp } from "@/components/financial/ReconciledStamp";
import { useVendorPayments, type VendorPayment } from "@/hooks/useVendorPayments";
import { useCommitmentAllocationTargets } from "@/hooks/useCommitmentPaymentAllocations";
import type { AllocationTargets } from "@/hooks/usePaymentAllocations";
import type { Commitment } from "@/hooks/useCommitments";
import type { CommitmentInvoiceBalance } from "@/hooks/useProjectFinancials";

const fmt = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n ?? 0);
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export function vendorName(c?: Commitment) {
  if (!c) return "Subcontractor";
  return (c.title ?? "").split("—")[0].trim() || c.commitment_no;
}

function allocLabel(a: VendorPayment["allocations"][number], t?: AllocationTargets): string {
  if (a.kind === "base") return "Base contract";
  if (a.kind === "change_order") {
    const co = t?.changeOrders.find((c) => c.id === a.change_order_id);
    return co ? `${co.co_type}-${String(co.co_no).padStart(3, "0")} · ${co.title}` : "Change order";
  }
  const line = t?.lineItems.find((l) => l.id === a.commitment_sov_line_id);
  return line ? `#${line.item_no} ${line.description}` : "Line item";
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-bold tabular-nums ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function PaymentRow({ p, targets, reconciled }: { p: VendorPayment; targets?: AllocationTargets; reconciled: boolean }) {
  const [open, setOpen] = useState(false);
  const hasSplit = p.allocations.length > 0;
  return (
    <div className="border-t first:border-t-0">
      <button
        type="button"
        onClick={() => hasSplit && setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${hasSplit ? "hover:bg-muted/30" : "cursor-default"}`}
      >
        <span className="text-muted-foreground">
          {hasSplit ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="inline-block w-4" />}
        </span>
        <span className="w-28 shrink-0 whitespace-nowrap">{fmtDate(p.paid_date)}</span>
        <span className="flex-1 truncate text-muted-foreground">
          <span className="capitalize">{p.method ?? "payment"}</span>{p.reference ? ` · ${p.reference}` : ""}
        </span>
        {reconciled && <ReconciledBadge />}
        {!reconciled && hasSplit && <Badge variant="outline" className="text-[10px] font-normal text-amber-600">Partly split</Badge>}
        <span className="w-28 shrink-0 text-right font-mono font-medium text-[var(--apas-sapphire)]">{fmt(p.amount)}</span>
      </button>
      {open && hasSplit && (
        <div className="bg-muted/20 px-4 pb-3 pl-11">
          {reconciled && (
            <div className="flex justify-center py-3">
              <ReconciledStamp amount={p.amount} />
            </div>
          )}
          <table className="w-full text-xs">
            <tbody>
              {p.allocations.map((a) => (
                <tr key={a.id} className="border-b border-border/40 last:border-0">
                  <td className="py-1.5 text-muted-foreground">{allocLabel(a, targets)}</td>
                  <td className="py-1.5 text-right font-mono">{fmt(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VendorPanel({
  commitment, invoices, reconciledIds, projectId,
}: {
  commitment: Commitment;
  invoices: CommitmentInvoiceBalance[];
  reconciledIds: Set<string>;
  projectId: string;
}) {
  const { data: payments = [], isLoading } = useVendorPayments(commitment.id);
  const { data: targets } = useCommitmentAllocationTargets(commitment.id);
  const lineCount = targets?.lineItems.length ?? 0;
  const sovHref = `/projects/${projectId}/financials/commitments/${commitment.id}?tab=sov`;

  const billed = invoices.reduce((s, i) => s + i.billed_amount, 0);
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const retention = invoices.reduce((s, i) => s + i.retainage_held, 0);
  const open = billed - paid;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {lineCount > 0
            ? <>{lineCount} line item{lineCount === 1 ? "" : "s"} defined — used to label payment splits.</>
            : <>No line items defined yet. Add them to split payments into labor / materials, etc.</>}
        </div>
        <Link
          to={sovHref}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          <ListPlus className="h-3.5 w-3.5" /> Manage line items
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Metric label="Contract" value={fmt(commitment.original_value)} />
        <Metric label="Billed" value={fmt(billed)} />
        <Metric label="Paid" value={fmt(paid)} tone="text-[var(--apas-sapphire)]" />
        <Metric label="Open" value={fmt(open)} tone={open > 0.005 ? "text-amber-600" : "text-emerald-600"} />
        <Metric label="Retention" value={fmt(retention)} />
      </div>

      {/* Invoices reconciled against payments */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" /> Invoices
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="p-3 text-left">Invoice</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Billed</th>
                <th className="p-3 text-right">Retention</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && <tr><td colSpan={6} className="p-5 text-center text-muted-foreground">No invoices uploaded for this vendor yet.</td></tr>}
              {invoices.map((i) => (
                <tr key={i.commitment_invoice_id} className="border-t">
                  <td className="p-3 font-medium">Invoice #{i.invoice_no ?? "—"}</td>
                  <td className="p-3"><Badge variant="outline" className="text-[10px] font-normal capitalize">{i.status}</Badge></td>
                  <td className="p-3 text-right font-mono">{fmt(i.billed_amount)}</td>
                  <td className="p-3 text-right font-mono text-muted-foreground">{fmt(i.retainage_held)}</td>
                  <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(i.paid_to_date)}</td>
                  <td className={`p-3 text-right font-mono ${i.balance_due > 0.005 ? "text-amber-600" : "text-emerald-600"}`}>{fmt(i.balance_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Payments, each drillable to its granular split */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Payments {payments.length > 0 && <span className="font-normal normal-case">· click a row to see the split</span>}
          </div>
          {isLoading && <div className="p-5 text-center text-sm text-muted-foreground">Loading payments…</div>}
          {!isLoading && payments.length === 0 && <div className="p-5 text-center text-sm text-muted-foreground">No payments recorded for this vendor yet.</div>}
          {payments.map((p) => (
            <PaymentRow key={p.id} p={p} targets={targets} reconciled={reconciledIds.has(p.id)} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function VendorPayments({
  commitments, invoiceBalances, reconciledIds, projectId,
}: {
  commitments: Commitment[];
  invoiceBalances: CommitmentInvoiceBalance[];
  reconciledIds: Set<string>;
  projectId: string;
}) {
  const sorted = useMemo(
    () => [...commitments].sort((a, b) => vendorName(a).localeCompare(vendorName(b))),
    [commitments],
  );
  const [activeId, setActiveId] = useState<string>(sorted[0]?.id ?? "");
  const active = sorted.find((c) => c.id === activeId) ?? sorted[0];

  if (sorted.length === 0) {
    return <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No subcontractor commitments yet. Create a commitment to track vendor payments.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Vendor tab strip */}
      <div className="flex flex-wrap gap-2">
        {sorted.map((c) => {
          const isActive = c.id === active?.id;
          const paid = invoiceBalances.filter((i) => i.commitment_id === c.id).reduce((s, i) => s + i.paid_to_date, 0);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={`rounded-lg border px-3.5 py-2 text-left transition-colors ${
                isActive ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <div className="text-sm font-semibold leading-tight">{vendorName(c)}</div>
              <div className={`text-[11px] tabular-nums ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {c.commitment_no} · {fmt(paid)} paid
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <VendorPanel
          commitment={active}
          invoices={invoiceBalances.filter((i) => i.commitment_id === active.id)}
          reconciledIds={reconciledIds}
          projectId={projectId}
        />
      )}
    </div>
  );
}
