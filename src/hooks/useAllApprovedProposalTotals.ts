import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { proposalTotals } from '@/lib/financial/proposalPricing';
import type { ConsultingTotalsLike } from '@/lib/projectTileAmounts';

const num = (v: unknown) => {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(x) ? x : 0;
};

/**
 * Batched approved-proposal + consulting-invoice totals for every accessible
 * project, so dashboard tiles can show the real consulting fee stack
 * (e.g. Larkin MRI PROP-001 $3,369 + PROP-002 $14,500 = $17,869).
 */
export function useAllApprovedProposalTotals() {
  const query = useQuery({
    queryKey: ['all-approved-proposal-totals'],
    queryFn: async () => {
      const map = new Map<string, ConsultingTotalsLike>();

      const { data: proposals, error: pErr } = await supabase
        .from('proposals')
        .select('id, project_id, status, overhead_pct, profit_pct, proposal_lines(quantity, unit_cost)')
        .eq('status', 'approved');
      if (pErr) throw pErr;

      for (const row of (proposals ?? []) as any[]) {
        const projectId = row.project_id as string;
        if (!projectId) continue;
        const fee = proposalTotals(row.proposal_lines ?? [], row).total;
        const prev = map.get(projectId) ?? { approvedFee: 0, invoiced: 0 };
        prev.approvedFee += fee;
        map.set(projectId, prev);
      }

      const { data: invoices, error: iErr } = await supabase
        .from('consulting_invoices' as never)
        .select('project_id, total, status') as any;
      if (iErr) throw iErr;

      for (const inv of (invoices ?? []) as any[]) {
        if (!inv?.project_id || inv.status === 'void' || inv.status === 'draft') continue;
        const prev = map.get(inv.project_id) ?? { approvedFee: 0, invoiced: 0 };
        prev.invoiced += num(inv.total);
        map.set(inv.project_id, prev);
      }

      return map;
    },
    staleTime: 60_000,
  });

  return {
    consultingTotals: query.data ?? new Map<string, ConsultingTotalsLike>(),
    ...query,
  };
}
