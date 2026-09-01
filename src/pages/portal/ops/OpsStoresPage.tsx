import { Link, Navigate } from 'react-router-dom';
import { Loader2, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { useStoresItems, useStoresTransactions } from '@/hooks/useProjectStores';
import { lowStockItems, money, onHandValue } from '@/lib/stores/storesAnalytics';

export default function OpsStoresPage() {
  const { propertyId, can, context, isLoading } = useOpsPortalProperty();
  const { data: items = [], isLoading: loadingItems } = useStoresItems(propertyId ?? undefined);
  const { data: txns = [], isLoading: loadingTxns } = useStoresTransactions(propertyId ?? undefined);

  if (!isLoading && !can('stores')) {
    return <Navigate to={opsPortalPath(propertyId)} replace />;
  }

  const low = lowStockItems(items);
  const recent = [...txns]
    .filter((t) => t.transaction_type === 'used')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 12);

  return (
    <div className="space-y-5" data-testid="ops-stores-page">
      <div>
        <Link to={opsPortalPath(propertyId)} className="text-sm text-muted-foreground hover:underline">← Home</Link>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-medium text-[#08271f]">
          <Warehouse className="h-7 w-7" /> Stores & Materials
        </h1>
        <p className="text-sm text-[#5c6863]">{context?.property_name} · work-order gated stock room</p>
      </div>

      {(isLoading || loadingItems || loadingTxns) ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">SKUs on hand</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{items.length}</CardContent></Card>
            <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Cage value</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{money(onHandValue(items))}</CardContent></Card>
            <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Low stock</CardTitle></CardHeader><CardContent className="text-3xl font-semibold text-amber-700">{low.length}</CardContent></Card>
          </div>

          <Card className="border-[#dedbd1]">
            <CardHeader><CardTitle className="text-base">Stock room</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {items.slice(0, 40).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#efe9da] px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.category || 'General'} · qty {item.current_quantity ?? 0}</div>
                  </div>
                  {(item.current_quantity ?? 0) <= (item.minimum_quantity ?? 0) && (
                    <Badge variant="outline" className="border-amber-300 text-amber-800">Low</Badge>
                  )}
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">No stock yet. Ask APAS to load the Glorieta demo catalog or receive a procurement receipt.</p>}
            </CardContent>
          </Card>

          <Card className="border-[#dedbd1]">
            <CardHeader><CardTitle className="text-base">Recent issues (WO-linked)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recent.map((txn) => (
                <div key={txn.id} className="rounded-xl border border-[#efe9da] px-3 py-2 text-sm">
                  <div className="font-medium">{txn.notes || 'Part issued'}</div>
                  <div className="text-xs text-muted-foreground">
                    Qty {txn.quantity} · {(txn as any).unit_label || 'unit'} · {(txn as any).requester_name || 'crew'}
                  </div>
                </div>
              ))}
              {recent.length === 0 && <p className="text-sm text-muted-foreground">No issues yet.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
