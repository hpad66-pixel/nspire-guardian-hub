import { useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Loader2, Mic, PhoneCall } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOpsPortalProperty } from '@/components/portal/OpsPortalPropertyContext';
import { opsPortalPath } from '@/lib/portal/opsPortal';
import { formatDistanceToNow } from 'date-fns';

export default function OpsVoicePage() {
  const { propertyId, can, context, isLoading } = useOpsPortalProperty();

  const { data: tickets = [], isLoading: loadingTickets } = useQuery({
    queryKey: ['ops-voice-tickets', propertyId],
    enabled: !!propertyId && can('voice'),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests' as any)
        .select('id, ticket_number, caller_name, caller_unit_number, issue_category, issue_description, urgency_level, status, work_order_id, created_at, demo_seed')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 15_000,
  });

  const kpis = useMemo(() => {
    const today = new Date().toDateString();
    const todayRows = tickets.filter((t) => new Date(t.created_at).toDateString() === today);
    const withWo = tickets.filter((t) => t.work_order_id);
    const open = tickets.filter((t) => !['closed', 'resolved', 'cancelled'].includes(String(t.status || '').toLowerCase()));
    return {
      today: todayRows.length,
      processed: withWo.length,
      backlog: open.length,
      emergency: tickets.filter((t) => ['emergency', 'urgent'].includes(String(t.urgency_level || '').toLowerCase())).length,
    };
  }, [tickets]);

  if (!isLoading && !can('voice')) {
    return <Navigate to={opsPortalPath(propertyId)} replace />;
  }

  return (
    <div className="space-y-5" data-testid="ops-voice-page">
      <div>
        <Link to={opsPortalPath(propertyId)} className="text-sm text-muted-foreground hover:underline">← Home</Link>
        <h1 className="mt-1 flex items-center gap-2 font-display text-3xl font-medium text-[#08271f]">
          <Mic className="h-7 w-7" /> Voice Complaints
        </h1>
        <p className="text-sm text-[#5c6863]">
          {context?.property_name} · resident call-in → ticket → work order
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Calls today</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{kpis.today}</CardContent></Card>
        <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Wired to WO</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{kpis.processed}</CardContent></Card>
        <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Backlog</CardTitle></CardHeader><CardContent className="text-3xl font-semibold">{kpis.backlog}</CardContent></Card>
        <Card className="border-[#dedbd1]"><CardHeader className="pb-1"><CardTitle className="text-sm text-muted-foreground">Emergency</CardTitle></CardHeader><CardContent className="text-3xl font-semibold text-rose-600">{kpis.emergency}</CardContent></Card>
      </div>

      <Card className="border-[#dedbd1] bg-[#08271f] text-white">
        <CardContent className="flex items-start gap-3 py-5">
          <PhoneCall className="mt-0.5 h-5 w-5 text-[#d5aa52]" />
          <div className="text-sm leading-relaxed text-[#dce5e1]">
            Residents call the Glorieta Gardens maintenance line (ElevenLabs). Finished calls create an MR ticket and a work order automatically. This queue refreshes live for PM / Owner roles.
          </div>
        </CardContent>
      </Card>

      {loadingTickets ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-2xl border border-[#dedbd1] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-[#08271f]">
                    MR-{t.ticket_number ?? '—'} · {t.issue_category || 'Maintenance'}
                  </div>
                  <div className="mt-1 text-sm text-[#5c6863]">
                    {t.caller_name || 'Resident'}
                    {t.caller_unit_number ? ` · Unit ${t.caller_unit_number}` : ''}
                    {' · '}
                    {t.created_at ? formatDistanceToNow(new Date(t.created_at), { addSuffix: true }) : ''}
                  </div>
                  {t.issue_description && (
                    <p className="mt-2 text-sm text-[#08271f]/90">{t.issue_description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className="capitalize">{String(t.status || 'open').replace(/_/g, ' ')}</Badge>
                  {t.work_order_id ? (
                    <span className="text-[11px] font-semibold text-emerald-700">WO linked</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700">Processing</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {tickets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#dedbd1] bg-white p-10 text-center text-sm text-muted-foreground">
              No voice tickets yet for this property.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
