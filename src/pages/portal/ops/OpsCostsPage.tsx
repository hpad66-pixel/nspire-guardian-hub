import { Link, Navigate } from 'react-router-dom';
import { Loader2, Package, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import {
  useStoresItems,
  useStoresReceipts,
  useStoresTransactions,
  useStoresUnits,
} from '@/hooks/useProjectStores';
import {
  issuesByUnit,
  money,
  onHandValue,
  spendByCategory,
} from '@/lib/stores/storesAnalytics';
import { format } from 'date-fns';

export default function OpsCostsPage() {
  const { propertyId, can, context, isLoading } = useOpsPortalProperty();
  const { data: items = [], isLoading: loadingItems } = useStoresItems(propertyId ?? undefined);
  const { data: txns = [] } = useStoresTransactions(propertyId ?? undefined);
  const { data: receipts = [], isLoading: loadingReceipts } = useStoresReceipts(propertyId ?? undefined);
  const { data: units = [] } = useStoresUnits(propertyId ?? undefined);

  if (!isLoading && !can('costs')) {
    return <Navigate to={opsPortalPath(propertyId)} replace />;
  }

  const byCategory = spendByCategory(items, txns);
  const byUnit = issuesByUnit(txns, 12);
  const receiptTotal = receipts.reduce((s, r) => s + Number(r.total_amount || 0), 0);

  return (
    <div className="space-y-5" data-testid="ops-costs-page">
      <div>
        <Link to={opsPortalPath(propertyId)} className="text-sm text-muted-foreground hover:underline">← Home</Link>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-medium text-[#08271f]">
          <Package className="h-7 w-7" /> Costs, receipts & activity
        </h1>
        <p className="text-sm text-[#5c6863]">
          {context?.property_name} · PM & Owner cost visibility (hidden from maintenance crew)
        </p>
      </div>

      {(isLoading || loadingItems || loadingReceipts) ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Receipt spend</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(receiptTotal)}</CardContent></Card>
            <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Issued materials</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(byCategory.reduce((s, c) => s + c.spend, 0))}</CardContent></Card>
            <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">On-hand value</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(onHandValue(items))}</CardContent></Card>
            <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Units tracked</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{units.length || context?.total_units || 0}</CardContent></Card>
          </div>

          <Card className="border-[#dedbd1]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Receipt className="h-4 w-4" /> Procurement receipts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#efe9da] px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{r.vendor}{r.receipt_number ? ` · #${r.receipt_number}` : ''}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.purchased_at ? format(new Date(r.purchased_at), 'MMM d, yyyy') : '—'}
                      {r.file_name ? ` · ${r.file_name}` : ''}
                    </div>
                  </div>
                  <div className="font-semibold">{money(Number(r.total_amount || 0))}</div>
                </div>
              ))}
              {receipts.length === 0 && <p className="text-sm text-muted-foreground">No receipts uploaded yet.</p>}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-[#dedbd1]">
              <CardHeader><CardTitle className="text-base">Spend by trade</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byCategory.map((c) => (
                  <div key={c.category} className="flex justify-between text-sm">
                    <span>{c.category}</span>
                    <span className="font-medium">{money(c.spend)}</span>
                  </div>
                ))}
                {byCategory.length === 0 && <p className="text-sm text-muted-foreground">No spend yet.</p>}
              </CardContent>
            </Card>
            <Card className="border-[#dedbd1]">
              <CardHeader><CardTitle className="text-base">Activity by unit</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {byUnit.map((u) => (
                  <div key={u.unit} className="flex justify-between text-sm">
                    <span>{u.unit}</span>
                    <span className="font-medium">{u.issues ?? (u as any).qty ?? 0} parts</span>
                  </div>
                ))}
                {byUnit.length === 0 && <p className="text-sm text-muted-foreground">No unit activity yet.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
