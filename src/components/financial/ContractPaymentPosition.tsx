/**
 * ContractPaymentPosition — a plain-language "where the money stands" card for a
 * prime pay app: contract value (base + change orders), what's been billed,
 * retainage held, this invoice, and the ACTUAL cash the client has paid to date.
 * Reads the derived `PaymentPosition` (see computePaymentPosition) so the numbers
 * match the certified G702 cover exactly. Self-contained (no @/lib/pdf).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PaymentPosition } from "@/lib/financial/payAppContinuation";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(n) || 0);

function Row({
  label, value, sign, strong, accent, hint,
}: {
  label: string; value: number; sign?: "+" | "−"; strong?: boolean; accent?: string; hint?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? "font-semibold" : ""}`}>
      <span className="text-sm">
        {label}
        {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
      </span>
      <span className="font-mono tabular-nums text-sm whitespace-nowrap" style={accent ? { color: accent } : undefined}>
        {sign ? `${sign} ` : ""}{money(Math.abs(value))}
      </span>
    </div>
  );
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-3 mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>
);

export function ContractPaymentPosition({
  position: p, payAppNo,
}: {
  position: PaymentPosition; payAppNo: number | null;
}) {
  const owed = p.outstanding > 0.01;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Contract &amp; Payment Position</CardTitle>
        <p className="text-xs text-muted-foreground">
          Where the money stands{payAppNo != null ? ` through Pay Application #${payAppNo}` : ""} — contract value, billings, retainage, and cash received.
        </p>
      </CardHeader>
      <CardContent className="max-w-xl">
        <SectionLabel>Contract</SectionLabel>
        <Row label="Base contract" value={p.baseContract} />
        <Row label="Approved change orders" value={p.changeOrders} sign="+" />
        <div className="border-t border-border" />
        <Row label="Revised contract (with change orders)" value={p.revisedContract} strong />

        <SectionLabel>Billed to date</SectionLabel>
        <Row label="Completed &amp; stored to date" value={p.completedToDate} hint={`${p.pctComplete.toFixed(0)}% of contract`} />
        <Row label="Retainage held (deducted)" value={p.retainageHeld} sign="−" accent="var(--apas-amber)" />
        <div className="border-t border-border" />
        <Row label="Earned to date (less retainage)" value={p.earnedLessRetainage} strong />

        <SectionLabel>This application{payAppNo != null ? ` — #${payAppNo}` : ""}</SectionLabel>
        <Row label="Previously billed" value={p.previouslyBilled} />
        <div className="-mx-2 rounded-md bg-[var(--apas-sapphire)]/5 px-2">
          <Row label="This invoice (payment due now)" value={p.thisInvoice} strong accent="var(--apas-sapphire)" />
        </div>

        <SectionLabel>Cash position</SectionLabel>
        <Row label="Paid by client to date" value={p.paidToDate} accent="var(--apas-emerald)" strong />
        <Row label="Retainage still held" value={p.retainageHeld} hint="released at closeout" />
        <Row label="Billed but not yet paid" value={p.outstanding} accent={owed ? "var(--apas-rose)" : undefined} />
        <Row label="Balance left to bill" value={p.balanceToBill} />

        <p className="mt-3 border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">
          You&apos;ve received <span className="font-medium text-foreground">{money(p.paidToDate)}</span> in cash to date.{" "}
          <span className="font-medium text-foreground">{money(p.retainageHeld)}</span> is held back as retainage (released at closeout)
          {owed
            ? <>, and <span className="font-medium text-foreground">{money(p.outstanding)}</span> of billed work is still awaiting payment.</>
            : <>, and billed work is fully paid up.</>}{" "}
          <span className="font-medium text-foreground">{money(p.balanceToBill)}</span> of the contract remains to be billed.
        </p>
      </CardContent>
    </Card>
  );
}
