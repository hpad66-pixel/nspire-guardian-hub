import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { useWorkOrdersByProperty } from '@/hooks/useWorkOrders';
import { computeWorkOrderDashboardKpis } from '@/lib/workorders/workOrderDashboard';
import { WorkOrderDashboardStats } from '@/components/workorders/WorkOrderDashboardStats';
import { CreateWorkOrderDialog } from '@/components/workorders/CreateWorkOrderDialog';
import { WorkOrderDetailSheet } from '@/components/workorders/WorkOrderDetailSheet';
import { format } from 'date-fns';

export default function OpsWorkOrdersPage() {
  const { propertyId, can, context, isLoading } = useOpsPortalProperty();
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrdersByProperty(propertyId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortNewest, setSortNewest] = useState(true);

  const kpis = useMemo(() => computeWorkOrderDashboardKpis(workOrders as any), [workOrders]);
  const sorted = useMemo(() => {
    const rows = [...workOrders];
    rows.sort((a: any, b: any) => {
      const da = new Date(a.created_at || a.due_date || 0).getTime();
      const db = new Date(b.created_at || b.due_date || 0).getTime();
      return sortNewest ? db - da : da - db;
    });
    return rows;
  }, [workOrders, sortNewest]);

  if (!isLoading && !can('maintenance')) {
    return <Navigate to={opsPortalPath(propertyId)} replace />;
  }

  return (
    <div className="space-y-5" data-testid="ops-work-orders-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to={opsPortalPath(propertyId)} className="text-sm text-muted-foreground hover:underline">← Home</Link>
          <h1 className="mt-1 font-display text-3xl font-medium text-[#08271f]">Work Orders</h1>
          <p className="text-sm text-[#5c6863]">{context?.property_name} · maintenance queue</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSortNewest((v) => !v)}>
            {sortNewest ? 'Newest first' : 'Oldest first'}
          </Button>
          <Button size="sm" className="bg-[#08271f] hover:bg-[#08271f]/90" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New work order
          </Button>
        </div>
      </div>

      <WorkOrderDashboardStats kpis={kpis} isLoading={woLoading} />

      {woLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {sorted.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#dedbd1] bg-white p-10 text-center text-sm text-muted-foreground">
              No work orders yet. Create one or wait for a Voice Complaints ticket.
            </div>
          )}
          {sorted.map((wo: any) => (
            <button
              key={wo.id}
              type="button"
              onClick={() => setSelectedId(wo.id)}
              className="flex w-full items-start justify-between gap-3 rounded-2xl border border-[#dedbd1] bg-white p-4 text-left shadow-sm transition hover:border-[#d5aa52]/50"
            >
              <div>
                <div className="font-semibold text-[#08271f]">{wo.title}</div>
                <div className="mt-1 text-xs text-[#5c6863]">
                  {wo.priority ? `${String(wo.priority).replace('_', ' ')} · ` : ''}
                  Due {wo.due_date ? format(new Date(wo.due_date), 'MMM d') : '—'}
                  {wo.requester_name ? ` · ${wo.requester_name}` : ''}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 capitalize">{String(wo.status || '').replace(/_/g, ' ')}</Badge>
            </button>
          ))}
        </div>
      )}

      {propertyId && (
        <CreateWorkOrderDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultPropertyId={propertyId}
        />
      )}
      <WorkOrderDetailSheet
        workOrder={(sorted as any[]).find((w) => w.id === selectedId) ?? null}
        open={!!selectedId}
        onOpenChange={(open) => !open && setSelectedId(null)}
      />
    </div>
  );
}
