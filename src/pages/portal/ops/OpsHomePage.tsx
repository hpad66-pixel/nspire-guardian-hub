import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  Mic,
  Package,
  ShieldCheck,
  Sparkles,
  Droplets,
  Warehouse,
} from 'lucide-react';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { useWorkOrdersByProperty } from '@/hooks/useWorkOrders';
import { computeWorkOrderDashboardKpis } from '@/lib/workorders/workOrderDashboard';
import { WorkOrderDashboardStats } from '@/components/workorders/WorkOrderDashboardStats';
import { useMemo } from 'react';

export default function OpsHomePage() {
  const { context, propertyId, can, role, isLoading } = useOpsPortalProperty();
  const { data: workOrders = [], isLoading: woLoading } = useWorkOrdersByProperty(propertyId);
  const kpis = useMemo(() => computeWorkOrderDashboardKpis(workOrders as any), [workOrders]);

  if (isLoading || !context) {
    return <div className="animate-pulse space-y-4"><div className="h-40 rounded-2xl bg-[#efe9da]" /><div className="h-28 rounded-2xl bg-[#efe9da]" /></div>;
  }

  const greeting =
    role === 'ops_owner'
      ? 'Your executive property command center'
      : role === 'ops_pm'
        ? 'Property operations for your team'
        : 'Your maintenance board for today';

  const launchers = [
    { key: 'maintenance', to: opsPortalPath(propertyId, 'work-orders'), label: 'Work Orders', blurb: 'Create, claim, close', icon: ClipboardList, show: can('maintenance') },
    { key: 'executive', to: opsPortalPath(propertyId, 'executive'), label: 'Executive Dashboard', blurb: 'Owner-only trends & spend', icon: LayoutDashboard, show: can('executive') },
    { key: 'nspire', to: opsPortalPath(propertyId, 'nspire'), label: 'NSPIRE', blurb: 'Inspections & daily grounds', icon: ShieldCheck, show: can('nspire') },
    { key: 'stores', to: opsPortalPath(propertyId, 'stores'), label: 'Stores & Materials', blurb: 'Stock room + WO-gated issue', icon: Warehouse, show: can('stores') },
    { key: 'voice', to: opsPortalPath(propertyId, 'voice'), label: 'Voice Complaints', blurb: 'Resident call-in → tickets', icon: Mic, show: can('voice') },
    { key: 'costs', to: opsPortalPath(propertyId, 'costs'), label: 'Costs & Receipts', blurb: 'Spend, units, trends', icon: Package, show: can('costs') },
    { key: 'water', to: opsPortalPath(propertyId, 'water'), label: 'Water Intelligence', blurb: 'Bills, trends, dispute brief', icon: Droplets, show: can('water') },
  ].filter((item) => item.show);

  return (
    <div className="space-y-6" data-testid="ops-home-page">
      <section className="overflow-hidden rounded-3xl bg-[#08271f] px-6 py-8 text-white shadow-lg">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d5aa52]">
          Glorieta Gardens · Property Ops
        </div>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-medium leading-tight md:text-5xl">
          {greeting}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[#b8c5c0]">
          {context.property_name}
          {context.city ? ` · ${context.city}${context.state ? `, ${context.state}` : ''}` : ''}
          {context.total_units ? ` · ${context.total_units} units` : ''}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-[#d5aa52]" />
            Construction modules stay with APAS
          </span>
        </div>
      </section>

      {can('maintenance') && (
        <WorkOrderDashboardStats kpis={kpis} isLoading={woLoading} />
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#8a8478]">Your modules</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {launchers.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className="group rounded-2xl border border-[#dedbd1] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d5aa52]/60 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#08271f]/5 text-[#08271f]">
                  <item.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-[#8a8478] transition group-hover:translate-x-0.5 group-hover:text-[#08271f]" />
              </div>
              <div className="mt-4 font-semibold text-[#08271f]">{item.label}</div>
              <p className="mt-1 text-sm text-[#5c6863]">{item.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
