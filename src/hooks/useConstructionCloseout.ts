import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePunchItemStats } from '@/hooks/usePunchItems';
import { useCloseoutItems } from '@/hooks/useProjectCloseout';
import { useProjectPermits } from '@/hooks/useProjectPermits';
import { countPermitStatuses } from '@/lib/permits/projectPermitStats';
import {
  computeConstructionCloseoutReadiness,
  finalInvoiceFromPayApp,
  type ConstructionCloseoutReadiness,
  type FinalInvoiceSnapshot,
} from '@/lib/projects/constructionCloseout';
import { projectKind } from '@/lib/projectKind';

const db = supabase as any;

export function useTrackerItemStats(projectId: string | null) {
  return useQuery({
    queryKey: ['tracker-items', 'stats', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db
        .from('tracker_items')
        .select('status')
        .eq('project_id', projectId!);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ status: string }>;
      const open = rows.filter((r) => r.status !== 'done').length;
      return {
        open,
        done: rows.length - open,
        total: rows.length,
      };
    },
  });
}

/** Latest final (or latest) pay app for a construction project. */
export function useProjectFinalInvoice(projectId: string | null) {
  return useQuery({
    queryKey: ['project-final-invoice', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data: contracts, error: cErr } = await db
        .from('prime_contracts')
        .select('id')
        .eq('project_id', projectId!)
        .limit(1);
      if (cErr) throw cErr;
      const contractId = contracts?.[0]?.id as string | undefined;
      if (!contractId) return { payApp: null as any, invoice: null as FinalInvoiceSnapshot | null };

      const { data: apps, error: aErr } = await db
        .from('prime_contract_pay_apps')
        .select('*')
        .eq('prime_contract_id', contractId)
        .order('pay_app_no', { ascending: false });
      if (aErr) throw aErr;
      const list = (apps ?? []) as any[];
      const finalApp = list.find((pa) =>
        pa.is_final_invoice || pa.pay_app_data?.is_final_invoice || pa.pay_app_data?.use_reconciled_snapshot,
      ) ?? list[0] ?? null;
      return {
        payApp: finalApp,
        invoice: finalInvoiceFromPayApp(finalApp),
      };
    },
  });
}

export function useConstructionCloseout(project: { id: string; project_type?: string | null } | null | undefined) {
  const projectId = project?.id ?? null;
  const isConstruction = project ? projectKind(project) === 'construction' : false;

  const punch = usePunchItemStats(isConstruction ? projectId : null);
  const tracker = useTrackerItemStats(isConstruction ? projectId : null);
  const closeout = useCloseoutItems(isConstruction ? projectId : null);
  const permits = useProjectPermits(isConstruction ? projectId : undefined);
  const finalInv = useProjectFinalInvoice(isConstruction ? projectId : null);

  const readiness: ConstructionCloseoutReadiness | null = useMemo(() => {
    if (!isConstruction) return null;
    const permitCounts = countPermitStatuses(permits.data ?? []);
    const closeoutRows = closeout.data ?? [];
    return computeConstructionCloseoutReadiness({
      invoice: finalInv.data?.invoice ?? null,
      counts: {
        punchOpen: (punch.data?.open ?? 0) + (punch.data?.inProgress ?? 0),
        punchTotal: punch.data?.total ?? 0,
        trackerOpen: tracker.data?.open ?? 0,
        trackerTotal: tracker.data?.total ?? 0,
        closeoutDone: closeoutRows.filter((i) => i.is_completed).length,
        closeoutTotal: closeoutRows.length,
        permitsClosed: permitCounts.closed,
        permitsTotal: permitCounts.total,
      },
    });
  }, [
    isConstruction,
    punch.data,
    tracker.data,
    closeout.data,
    permits.data,
    finalInv.data,
  ]);

  return {
    enabled: isConstruction,
    readiness,
    payAppId: (finalInv.data?.payApp?.id as string | undefined) ?? null,
    invoice: finalInv.data?.invoice ?? null,
    trackerOpen: tracker.data?.open ?? 0,
    isLoading: isConstruction && (punch.isLoading || tracker.isLoading || closeout.isLoading || permits.isLoading || finalInv.isLoading),
  };
}
