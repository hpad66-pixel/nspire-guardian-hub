import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, ArrowRight, Plus, Banknote, Award, BriefcaseBusiness } from "lucide-react";
import { useConsultingInvoices, useConsultingArLedger } from "@/hooks/useConsultingInvoices";
import { useProjectScopes, summarizeScopes } from "@/hooks/useProjectScopes";
import { useFinancialProposals } from "@/hooks/useFinancialProposals";
import { proposalTotals } from "@/lib/financial/proposalPricing";
import { money } from "@/components/projects/invoicing/invoiceMeta";
import { INVOICE_STATUS_META } from "@/components/projects/invoicing/invoiceMeta";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMemo } from "react";
import { useConsultingFinancialPosition } from "@/hooks/useConsultingCashFlow";

/**
 * Lean financial home for consulting / client engagements:
 * proposal → invoice → cash — no pay-app / budget / commitment machinery.
 */
export function ConsultingFinancialOverview({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName?: string;
}) {
  const { data: invoices = [], isLoading } = useConsultingInvoices(projectId);
  const { data: ledger } = useConsultingArLedger(projectId);
  const { data: scopes } = useProjectScopes(projectId);
  const { data: proposals = [] } = useFinancialProposals(projectId);
  const { position } = useConsultingFinancialPosition(projectId);
  const summary = summarizeScopes(scopes);

  const active = invoices.filter((i) => i.status !== "void");
  const invoiced = ledger?.totalInvoiced ?? active.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const paid = ledger?.totalPaid ?? 0;
  const open = ledger?.openAr ?? Math.max(0, invoiced - paid);
  const recent = active.slice(0, 5);
  const approvedFee = useMemo(
    () => proposals
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + proposalTotals(p.proposal_lines ?? [], p).total, 0),
    [proposals],
  );
  const unbilledApproved = Math.max(0, approvedFee - invoiced);
  const cashPosition = position.data;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-br from-[var(--apas-sapphire)]/8 via-card to-accent/10 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--apas-sapphire)]">
          Consulting billing
        </p>
        <h2 className="mt-1 font-[Playfair_Display] text-2xl font-bold text-foreground">
          {projectName ?? "Engagement"} — proposal to invoice
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Bill clients with corporate invoices against approved proposals. Each invoice carries
          prior billed and paid amounts forward so A/R stays continuous. Construction pay apps stay hidden.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild className="gap-1.5 bg-[var(--apas-sapphire)] hover:bg-[var(--apas-sapphire)]/90">
            <Link to={`/projects/${projectId}/financials/client-invoices`}>
              <Plus className="h-4 w-4" /> New invoice
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-1.5">
            <Link to={`/projects/${projectId}/financials/proposals`}>
              <FileText className="h-4 w-4" /> Proposals
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Approved proposals", value: money(approvedFee), sub: `${proposals.filter((p) => p.status === "approved").length} approved` },
          { label: "Invoiced", value: money(invoiced), sub: `${active.length} invoices` },
          { label: "Cash received", value: money(paid), sub: "all payments" },
          { label: "Open A/R", value: money(open), sub: "invoiced − paid" },
          { label: "Unbilled", value: money(unbilledApproved || summary.unbilled), sub: unbilledApproved > 0 ? "approved − invoiced" : "earned − billed" },
        ].map((m) => (
          <Card key={m.label} className="border-border/80">
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">{isLoading ? "…" : m.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{m.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-50 via-card to-amber-50">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-double border-emerald-600 bg-white text-emerald-700 shadow-sm"><Award className="h-6 w-6" /></div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Live cash result</p>
            <p className="font-[Playfair_Display] text-2xl font-bold">Net Profit: <span className="text-emerald-700">{money(cashPosition?.net_profit ?? 0)}</span></p>
            <p className="text-xs text-muted-foreground">Cash received {money(cashPosition?.cash_received ?? paid)} − cash paid {money(cashPosition?.cash_paid ?? 0)} · {(cashPosition?.margin_pct ?? 0).toFixed(1)}% margin</p>
          </div>
          <div className="ml-auto flex gap-2"><Button asChild variant="outline" size="sm"><Link to={`/projects/${projectId}/financials/costs`}><BriefcaseBusiness className="mr-1.5 h-4 w-4" />Costs &amp; subs</Link></Button><Button asChild size="sm"><Link to={`/projects/${projectId}/financials/closeout`}>Reconcile &amp; close</Link></Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Proposals",
            desc: "Price the engagement, send a branded PDF, get it signed.",
            href: `/projects/${projectId}/financials/proposals`,
            icon: FileText,
          },
          {
            title: "Client invoices",
            desc: "Editable corporate invoices with running A/R tab and client sign-off PDF.",
            href: `/projects/${projectId}/financials/client-invoices`,
            icon: Receipt,
          },
          {
            title: "Payments",
            desc: "Record cash received — automatically rolls into the next invoice.",
            href: `/projects/${projectId}/financials/payments`,
            icon: Banknote,
          },
        ].map((card) => (
          <Link key={card.title} to={card.href} className="group">
            <Card className="h-full transition-colors group-hover:border-accent/50 group-hover:bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <card.icon className="h-4 w-4 text-[var(--apas-sapphire)]" />
                  {card.title}
                  <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition-opacity group-hover:opacity-60" />
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{card.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Recent invoices</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to={`/projects/${projectId}/financials/client-invoices`}>
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No invoices yet. Create one from Client Invoices when you are ready to bill.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((inv) => {
                const meta = INVOICE_STATUS_META[inv.status] ?? INVOICE_STATUS_META.draft;
                return (
                  <li key={inv.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="font-medium">#{inv.invoice_no}</span>
                    <span className="text-muted-foreground">
                      {format(new Date(inv.issue_date + "T00:00:00"), "MMM d, yyyy")}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", meta.className)}>
                      {meta.label}
                    </span>
                    <span className="ml-auto tabular-nums font-medium">{money(Number(inv.total))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
