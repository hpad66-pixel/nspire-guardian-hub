import { useParams, Link } from 'react-router-dom';
import { useProjectContracts } from '@/hooks/useProjectContracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Edit, FileText, Calendar, DollarSign,
  Building2, Users, AlertTriangle, CheckCircle2, Clock,
  ShieldCheck, FileSignature, MapPin,
} from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  out_for_signature: 'bg-amber-100 text-amber-800',
  executed: 'bg-green-100 text-green-800',
  terminated: 'bg-red-100 text-red-800',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  out_for_signature: 'Out for Signature',
  executed: 'Executed',
  terminated: 'Terminated',
};

function fmt(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

export default function ContractDashboardPage() {
  const { projectId, contractId } = useParams<{ projectId: string; contractId: string }>();
  const { data: contracts = [], isLoading } = useProjectContracts(projectId!);

  const contract = contracts.find((c) => c.id === contractId);

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading contract…</div>;
  }
  if (!contract) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-muted-foreground">Contract not found.</p>
        <Link to={`/projects/${projectId}/contracts`}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back to Contracts</Button>
        </Link>
      </div>
    );
  }

  const sov = contract.sov_items ?? [];
  const totalBilled = sov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0);
  const contractValue = contract.base_contract_amount ?? 0;
  const retainageHeld = totalBilled * ((contract.retainage_percent ?? 5) / 100);
  const netPayable = totalBilled - retainageHeld;
  const balance = contractValue - totalBilled;
  const overallPct = pct(totalBilled, contractValue);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Breadcrumb + actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to={`/projects/${projectId}/contracts`} className="hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Contracts
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-xs">{contract.contract_title}</span>
          </div>
          <div className="flex gap-2">
            <Link to={`/projects/${projectId}/contracts/${contractId}/edit`}>
              <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-1.5" />Edit</Button>
            </Link>
          </div>
        </div>

        {/* Header card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileSignature className="h-5 w-5 text-[var(--apas-sapphire)]" />
                  <h1 className="text-xl font-bold">{contract.contract_title}</h1>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[contract.status] ?? STATUS_STYLE.draft}`}>
                    {STATUS_LABEL[contract.status] ?? contract.status}
                  </span>
                </div>
                {contract.contract_number && (
                  <p className="text-sm text-muted-foreground font-mono">#{contract.contract_number}</p>
                )}
                {contract.project_address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />{contract.project_address}
                  </p>
                )}
                {contract.docusign_envelope_id && (
                  <p className="text-xs text-muted-foreground font-mono">
                    DocuSign: {contract.docusign_envelope_id}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-foreground">{fmt(contractValue)}</p>
                <p className="text-sm text-muted-foreground">Base Contract Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Billed to Date', value: fmt(totalBilled), sub: `${overallPct}% of contract`, icon: DollarSign, color: 'text-[var(--apas-sapphire)]' },
            { label: 'Net Payable', value: fmt(netPayable), sub: 'After retainage', icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Retainage Held', value: fmt(retainageHeld), sub: `${contract.retainage_percent ?? 5}% rate`, icon: ShieldCheck, color: 'text-amber-600' },
            { label: 'Contract Balance', value: fmt(balance), sub: 'Remaining to bill', icon: Clock, color: balance < 0 ? 'text-destructive' : 'text-foreground' },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{k.label}</p>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Overall progress */}
        {contractValue > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Overall Completion</p>
                <span className="text-sm font-bold">{overallPct}%</span>
              </div>
              <Progress value={overallPct} className="h-3" />
            </CardContent>
          </Card>
        )}

        {/* Parties + Dates */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Parties */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" />Contract Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Prime Contractor / Owner</p>
                <p className="font-medium">{contract.prime_contractor_name ?? '—'}</p>
                {contract.prime_contractor_address && <p className="text-muted-foreground">{contract.prime_contractor_address}</p>}
                {contract.prime_contractor_contact && <p>{contract.prime_contractor_contact}</p>}
                {contract.prime_contractor_email && (
                  <a href={`mailto:${contract.prime_contractor_email}`} className="text-[var(--apas-sapphire)] hover:underline">
                    {contract.prime_contractor_email}
                  </a>
                )}
              </div>
              <div className="border-t pt-3">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-1">Subcontractor</p>
                <p className="font-medium">{contract.subcontractor_name ?? '—'}</p>
                {contract.subcontractor_address && <p className="text-muted-foreground">{contract.subcontractor_address}</p>}
                {contract.subcontractor_contact && <p>{contract.subcontractor_contact}</p>}
                {contract.subcontractor_email && (
                  <a href={`mailto:${contract.subcontractor_email}`} className="text-[var(--apas-sapphire)] hover:underline">
                    {contract.subcontractor_email}
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key dates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {[
                { label: 'Contract Date', val: contract.contract_date },
                { label: 'Start Date', val: contract.start_date },
                { label: 'Substantial Completion', val: contract.substantial_completion_date },
                { label: 'Final Completion', val: contract.final_completion_date },
                { label: 'Actual Completion', val: contract.actual_completion_date },
                { label: 'Signed Contract Received', val: contract.signed_contract_received_date },
              ].map(({ label, val }) => (
                <div key={label} className="flex justify-between items-center py-1 border-b last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-medium ${!val ? 'text-muted-foreground' : ''}`}>{fmtDate(val)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Payment terms */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4" />Payment Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Retainage Rate', value: `${contract.retainage_percent ?? 5}%` },
                { label: 'Mobilization Advance', value: fmt(contract.mobilization_advance) },
                { label: 'Payment Cycle', value: contract.payment_cycle_days ? `Every ${contract.payment_cycle_days} days` : '—' },
                { label: 'Pay-Within (from receipt)', value: contract.payment_due_within_days ? `${contract.payment_due_within_days} business days` : '—' },
                { label: 'LD Rate', value: contract.liquidated_damages_per_day ? `${fmt(contract.liquidated_damages_per_day)}/day` : '—' },
                { label: 'Retainage Release #1', value: contract.retainage_release_substantial ? `${contract.retainage_release_substantial}% at Substantial Completion` : '—' },
                { label: 'Retainage Release #2', value: contract.retainage_release_final ? `${contract.retainage_release_final}% after ${contract.retainage_warranty_months ?? 12}-mo warranty` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              ))}
            </div>
            {contract.special_conditions && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                <p className="font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Special Conditions</p>
                <p className="leading-relaxed">{contract.special_conditions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scope */}
        {(contract.scope_description || contract.inclusions || contract.exclusions) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" />Scope of Work</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              {contract.scope_description && <p className="text-muted-foreground leading-relaxed">{contract.scope_description}</p>}
              {contract.inclusions && (
                <div>
                  <p className="font-medium mb-1">Inclusions</p>
                  <p className="text-muted-foreground">{contract.inclusions}</p>
                </div>
              )}
              {contract.exclusions && (
                <div>
                  <p className="font-medium mb-1">Exclusions</p>
                  <p className="text-muted-foreground">{contract.exclusions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Schedule of Values */}
        {sov.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Schedule of Values ({sov.length} items)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left p-3 w-8">#</th>
                      <th className="text-left p-3">Description</th>
                      <th className="text-right p-3 whitespace-nowrap">Qty / Unit</th>
                      <th className="text-right p-3">Unit Cost</th>
                      <th className="text-right p-3">Subtotal</th>
                      <th className="text-right p-3">Billed</th>
                      <th className="p-3 w-28">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sov
                      .slice()
                      .sort((a, b) => a.item_number - b.item_number)
                      .map((item) => {
                        const billedPct = pct(item.billed_to_date ?? 0, item.subtotal ?? 0);
                        return (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20 transition">
                            <td className="p-3 text-muted-foreground font-mono">{item.item_number}</td>
                            <td className="p-3">
                              <p className="font-medium leading-snug">{item.description}</p>
                              {item.budget_code && (
                                <span className="text-xs text-muted-foreground font-mono">{item.budget_code}</span>
                              )}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap text-muted-foreground">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-3 text-right font-mono">{fmt(item.unit_cost)}</td>
                            <td className="p-3 text-right font-mono font-medium">{fmt(item.subtotal)}</td>
                            <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">
                              {item.billed_to_date > 0 ? fmt(item.billed_to_date) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <Progress value={billedPct} className="h-1.5 flex-1" />
                                <span className="text-xs text-muted-foreground w-8 text-right">{billedPct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {/* Grand Total row */}
                    <tr className="bg-muted/60 font-bold">
                      <td colSpan={4} className="p-3 text-right text-sm">Grand Total</td>
                      <td className="p-3 text-right font-mono text-base">{fmt(sov.reduce((s, i) => s + (i.subtotal ?? 0), 0))}</td>
                      <td className="p-3 text-right font-mono text-[var(--apas-sapphire)]">{fmt(totalBilled)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <Progress value={overallPct} className="h-1.5 flex-1" />
                          <span className="text-xs w-8 text-right">{overallPct}%</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
