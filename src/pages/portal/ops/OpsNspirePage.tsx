import { Link, Navigate } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { format } from 'date-fns';

export default function OpsNspirePage() {
  const { propertyId, can, context, isLoading } = useOpsPortalProperty();

  const { data: inspections = [], isLoading: loading } = useQuery({
    queryKey: ['ops-nspire-inspections', propertyId],
    enabled: !!propertyId && can('nspire'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inspections' as any)
        .select('id, inspection_type, status, scheduled_date, completed_at, unit_id, created_at')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) {
        // Some workspaces use slightly different inspection schemas — fail soft.
        console.warn('[OpsNspirePage]', error.message);
        return [];
      }
      return (data ?? []) as any[];
    },
  });

  if (!isLoading && !can('nspire')) {
    return <Navigate to={opsPortalPath(propertyId)} replace />;
  }

  const open = inspections.filter((i) => !['completed', 'closed', 'cancelled'].includes(String(i.status || '').toLowerCase())).length;
  const done = inspections.length - open;

  return (
    <div className="space-y-5" data-testid="ops-nspire-page">
      <div>
        <Link to={opsPortalPath(propertyId)} className="text-sm text-muted-foreground hover:underline">← Home</Link>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-medium text-[#08271f]">
          <ShieldCheck className="h-7 w-7" /> NSPIRE & inspections
        </h1>
        <p className="text-sm text-[#5c6863]">
          {context?.property_name} · inspection queue for PM / Owner (not shown to maintenance-only crew)
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{inspections.length}</CardContent></Card>
        <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Open</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{open}</CardContent></Card>
        <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Completed</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{done}</CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {inspections.map((insp) => (
            <div key={insp.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#dedbd1] bg-white p-4">
              <div>
                <div className="font-semibold capitalize text-[#08271f]">
                  {String(insp.inspection_type || 'Inspection').replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {insp.scheduled_date
                    ? `Scheduled ${format(new Date(insp.scheduled_date), 'MMM d, yyyy')}`
                    : insp.created_at
                      ? `Created ${format(new Date(insp.created_at), 'MMM d, yyyy')}`
                      : '—'}
                </div>
              </div>
              <Badge variant="outline" className="capitalize">{String(insp.status || 'open').replace(/_/g, ' ')}</Badge>
            </div>
          ))}
          {inspections.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#dedbd1] bg-white p-10 text-center text-sm text-muted-foreground">
              No NSPIRE / inspection records yet for this property. When APAS or your team runs inspections, they appear here.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
