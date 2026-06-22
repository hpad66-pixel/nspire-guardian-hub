/**
 * F2 · Owner portal — Prime contract summary + owner-visible change orders.
 * RLS (prime_contract_owner_portal_select, co_owner_portal_select) filters.
 * Owner sees PCO + OCO only; CCOs are hidden.
 */
import { Link } from "react-router-dom";
import { useOwnerPortalData } from "@/hooks/usePortals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pdf";

export default function OwnerContractPage() {
  const { data, isLoading } = useOwnerPortalData();

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const contracts = data?.primeContracts ?? [];
  const ocos = data?.pendingOcos ?? [];

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <Link to="/owner-portal" className="text-sm text-muted-foreground hover:underline">
          ← Owner dashboard
        </Link>
        <h1 className="text-3xl font-bold mt-2">Prime contracts</h1>
      </div>

      {contracts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          No prime contracts yet.
        </CardContent></Card>
      ) : (
        contracts.map((pc: any) => (
          <Card key={pc.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>
                    <span className="font-mono text-muted-foreground mr-2">{pc.contract_no}</span>
                    {pc.title}
                  </CardTitle>
                  <div className="text-muted-foreground text-sm mt-1 capitalize">
                    {pc.status}
                    {pc.executed_date && ` · executed ${pc.executed_date}`}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{pc.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div><span className="text-muted-foreground">Original value:</span> <span className="font-mono">{money(Number(pc.original_value))}</span></div>
                <div><span className="text-muted-foreground">Retainage %:</span> {pc.retainage_pct}%</div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Change orders pending your signature</div>
                {ocos.filter((co: any) => co.prime_contract_id === pc.id).length === 0 ? (
                  <div className="text-xs text-muted-foreground">None pending.</div>
                ) : (
                  <div className="divide-y text-sm border rounded-md">
                    {ocos
                      .filter((co: any) => co.prime_contract_id === pc.id)
                      .map((co: any) => (
                        <Link
                          key={co.id}
                          to={`/owner-portal/cos/${co.id}`}
                          className="flex items-center justify-between py-2 px-3 hover:bg-muted"
                        >
                          <div>
                            <span className="font-mono mr-2">
                              {co.co_type}-{String(co.co_no).padStart(4, "0")}
                            </span>
                            {co.title}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{money(Number(co.amount))}</span>
                            <Badge variant="outline" className="capitalize">{co.status.replace("_", " ")}</Badge>
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
