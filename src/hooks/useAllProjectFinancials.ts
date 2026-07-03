import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Batched read of v_project_financial_summary for EVERY accessible project
// (RLS-scoped), so dashboard cards can show the real revised budget + billed
// without firing one query per card. The `budget` column on `projects` is never
// populated — the real number lives here (prime original + approved COs).

export interface ProjectFin {
  project_id: string;
  original_contract: number;
  approved_co_value: number;
  revised_contract: number;
  billed_to_date: number;
  received_to_date: number;
  net_cash_position: number;
}

const num = (v: unknown) => { const x = typeof v === 'number' ? v : parseFloat(String(v ?? '')); return Number.isFinite(x) ? x : 0; };

export function useAllProjectFinancials() {
  const query = useQuery({
    queryKey: ['all-project-financials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_project_financial_summary' as any)
        .select('project_id, original_contract, approved_co_value, revised_contract, billed_to_date, received_to_date, net_cash_position');
      if (error) throw error;
      const map = new Map<string, ProjectFin>();
      for (const r of (data ?? []) as any[]) {
        map.set(r.project_id, {
          project_id: r.project_id,
          original_contract: num(r.original_contract),
          approved_co_value: num(r.approved_co_value),
          revised_contract: num(r.revised_contract),
          billed_to_date: num(r.billed_to_date),
          received_to_date: num(r.received_to_date),
          net_cash_position: num(r.net_cash_position),
        });
      }
      return map;
    },
    staleTime: 60_000,
  });
  return { financials: query.data ?? new Map<string, ProjectFin>(), ...query };
}
