import { useParams, Link } from 'react-router-dom';
import { useProjectContracts } from '@/hooks/useProjectContracts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileSignature, MapPin, ChevronRight, DollarSign } from 'lucide-react';

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

export default function ContractListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: contracts = [], isLoading } = useProjectContracts(projectId!);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-[var(--apas-sapphire)]" />
              Contracts
            </h1>
            <p className="text-sm text-muted-foreground">Prime contracts, subcontracts, and owner agreements</p>
          </div>
          <Link to={`/projects/${projectId}/contracts/new`}>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Contract</Button>
          </Link>
        </div>

        {/* Summary cards */}
        {contracts.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: contracts.length, color: '' },
              { label: 'Executed', value: contracts.filter((c) => c.status === 'executed').length, color: 'text-green-600' },
              { label: 'Total Value', value: fmt(contracts.reduce((s, c) => s + (c.base_contract_amount ?? 0), 0)), color: 'text-[var(--apas-sapphire)]' },
              { label: 'Pending Signature', value: contracts.filter((c) => c.status === 'out_for_signature').length, color: 'text-amber-600' },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-muted-foreground text-sm py-8 text-center">Loading…</div>
        ) : contracts.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center space-y-4">
              <FileSignature className="h-10 w-10 mx-auto text-muted-foreground/30" />
              <div>
                <p className="font-medium">No contracts yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                  Create a contract manually, or click below to load the Glorieta Gardens Sewer Extension
                  contract as a starting template.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <Link to={`/projects/${projectId}/contracts/new`}>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Contract</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="divide-y border rounded-lg overflow-hidden">
            {contracts.map((c) => {
              const sov = c.sov_items ?? [];
              const totalBilled = sov.reduce((s, i) => s + (i.billed_to_date ?? 0), 0);
              const pctBilled = c.base_contract_amount
                ? Math.round((totalBilled / c.base_contract_amount) * 100)
                : 0;
              return (
                <Link
                  key={c.id}
                  to={`/projects/${projectId}/contracts/${c.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30 transition"
                >
                  <FileSignature className="h-5 w-5 text-[var(--apas-sapphire)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-medium truncate">{c.contract_title}</span>
                      {c.contract_number && (
                        <Badge variant="outline" className="font-mono text-xs">#{c.contract_number}</Badge>
                      )}
                      <span className={`px-1.5 py-0 rounded text-xs font-medium border ${STATUS_STYLE[c.status] ?? ''}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {c.subcontractor_name && <span>{c.subcontractor_name}</span>}
                      {c.project_address && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />{c.project_address}
                        </span>
                      )}
                      {c.start_date && <span>Start: {new Date(c.start_date + 'T00:00:00').toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{fmt(c.base_contract_amount)}</p>
                    <p className="text-xs text-muted-foreground">{pctBilled}% billed</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
