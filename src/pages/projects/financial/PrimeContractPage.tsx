import { useParams, Link } from "react-router-dom";
import { FinancialSubNav } from "@/components/financial/FinancialSubNav";
import { usePrimeContract, usePrimeContractSov, usePrimeContractTotals, usePayApps } from "@/hooks/usePrimeContract";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

function fmt(n: number | null | undefined) {
  return `$${((n ?? 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PrimeContractPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: pc, isLoading } = usePrimeContract(projectId ?? null);
  const { data: totals } = usePrimeContractTotals(pc?.id ?? null);
  const { data: sov = [] } = usePrimeContractSov(pc?.id ?? null);
  const { data: payApps = [] } = usePayApps(pc?.id ?? null);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;
  if (!pc) {
    return (
      <div className="container mx-auto p-6 max-w-4xl space-y-4">
        <FinancialSubNav />
        <h1 className="text-3xl font-bold">Prime Contract</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <p>No prime contract yet for this project.</p>
            <p className="text-sm">
              Looking for your subcontracts or the Sewer Extension agreement?{' '}
              <Link to={`/projects/${projectId}/contracts`} className="text-blue-600 underline">
                Go to Contracts
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <FinancialSubNav />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{pc.title}</h1>
          <div className="text-muted-foreground font-mono text-sm">{pc.contract_no}</div>
        </div>
        <Badge variant="outline" className="capitalize">{pc.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Original</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{fmt(totals?.original_value ?? pc.original_value)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Executed COs</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{fmt(totals?.executed_co_value)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Revised</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-primary">{fmt(totals?.revised_contract_value)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs uppercase">Billed to date</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{fmt(totals?.billed_to_date)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Schedule of Values</CardTitle></CardHeader>
        <CardContent>
          {sov.length === 0 ? (
            <div className="text-muted-foreground">No SOV lines yet.</div>
          ) : (
            <div className="divide-y text-sm">
              {sov.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-mono text-muted-foreground mr-2">L{l.line_no}</span>
                    {l.description}
                  </div>
                  <div className="font-mono">{fmt(l.scheduled_value)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pay Applications</CardTitle></CardHeader>
        <CardContent>
          {payApps.length === 0 ? (
            <div className="text-muted-foreground">No pay apps yet.</div>
          ) : (
            <div className="divide-y text-sm">
              {payApps.map((pa: any) => (
                <Link
                  key={pa.id}
                  to={`/projects/${projectId}/financials/prime-contract/pay-apps/${pa.id}`}
                  className="flex items-center justify-between py-2 hover:bg-muted px-2 rounded -mx-2"
                >
                  <div>
                    <span className="font-mono mr-2">#{pa.pay_app_no}</span>
                    <span className="text-muted-foreground">period end {pa.period_end}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="font-mono">{fmt(pa.approved_amount ?? pa.submitted_amount)}</span>
                    <Badge variant="outline" className="capitalize">{pa.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
