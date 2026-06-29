import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Prime↔sub margin reconciliation. APAS (prime) bills the owner the prime amount,
// pays the sub the sub amount; the delta is APAS's recovery. Tables/views not in
// generated types → (supabase as any).
const db = supabase as any;

const EXECUTED = ['approved', 'executed'];

export interface MarginCO {
  id: string;
  co_no: number | null;
  title: string;
  amount: number;
  status: string;
  commitment_id: string | null;
  prime_contract_id: string | null;
}

export interface MarginPair {
  link_id: string;
  is_pass_through: boolean;
  prime: MarginCO | null;
  sub: MarginCO | null;
  delta: number; // prime − sub = APAS recovery
}

export interface MarginData {
  base: { prime: number; sub: number; delta: number };
  pairs: MarginPair[];
  unlinkedPrime: MarginCO[];
  unlinkedSub: MarginCO[];
  totals: {
    revenue: number;      // prime base + prime COs (≈ revised contract)
    cost: number;         // sub base + sub COs (≈ committed total)
    margin: number;       // revenue − cost (APAS gross recovery)
    coRevenue: number;    // prime COs only
    coCost: number;       // sub COs only
    coMargin: number;
  };
  cash: { billedToOwner: number; receivedFromOwner: number; committed: number; paidToSubs: number; owedToSubs: number };
}

export function useMargin(projectId: string | undefined) {
  return useQuery({
    queryKey: ['margin', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<MarginData> => {
      const [summaryR, commitmentsR, cosR, linksR] = await Promise.all([
        db.from('v_project_financial_summary').select('original_contract, revised_contract, committed_total, paid_to_subs, billed_to_date, received_to_date').eq('project_id', projectId).maybeSingle(),
        db.from('commitments').select('original_value, status').eq('project_id', projectId),
        db.from('change_orders').select('id, co_no, title, amount, status, commitment_id, prime_contract_id').eq('project_id', projectId),
        db.from('co_margin_links').select('id, prime_co_id, sub_co_id, is_pass_through').eq('project_id', projectId),
      ]);
      const s = summaryR.data ?? {};
      const cos: MarginCO[] = (cosR.data ?? []).filter((c: MarginCO) => EXECUTED.includes(c.status));
      const links = linksR.data ?? [];

      const primeBase = Number(s.original_contract ?? 0);
      const subBase = (commitmentsR.data ?? []).reduce((t: number, c: any) => t + Number(c.original_value ?? 0), 0);

      const primeCOs = cos.filter((c) => c.prime_contract_id);
      const subCOs = cos.filter((c) => c.commitment_id);
      const byId = (id: string) => cos.find((c) => c.id === id) ?? null;

      const usedPrime = new Set<string>(), usedSub = new Set<string>();
      const pairs: MarginPair[] = links.map((l: any) => {
        const prime = byId(l.prime_co_id); const sub = byId(l.sub_co_id);
        if (prime) usedPrime.add(prime.id); if (sub) usedSub.add(sub.id);
        return { link_id: l.id, is_pass_through: l.is_pass_through, prime, sub, delta: Number(prime?.amount ?? 0) - Number(sub?.amount ?? 0) };
      });

      const coRevenue = primeCOs.reduce((t, c) => t + Number(c.amount ?? 0), 0);
      const coCost = subCOs.reduce((t, c) => t + Number(c.amount ?? 0), 0);
      const revenue = primeBase + coRevenue;
      const cost = subBase + coCost;
      const committed = Number(s.committed_total ?? cost);
      const paidToSubs = Number(s.paid_to_subs ?? 0);

      return {
        base: { prime: primeBase, sub: subBase, delta: primeBase - subBase },
        pairs,
        unlinkedPrime: primeCOs.filter((c) => !usedPrime.has(c.id)),
        unlinkedSub: subCOs.filter((c) => !usedSub.has(c.id)),
        totals: { revenue, cost, margin: revenue - cost, coRevenue, coCost, coMargin: coRevenue - coCost },
        cash: {
          billedToOwner: Number(s.billed_to_date ?? 0),
          receivedFromOwner: Number(s.received_to_date ?? 0),
          committed,
          paidToSubs,
          owedToSubs: committed - paidToSubs,
        },
      };
    },
  });
}

export function useLinkCoMargin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, primeCoId, subCoId, passThrough }: { projectId: string; primeCoId: string; subCoId: string; passThrough?: boolean }) => {
      const { error } = await db.from('co_margin_links').insert({ project_id: projectId, prime_co_id: primeCoId, sub_co_id: subCoId, is_pass_through: passThrough ?? false });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['margin', v.projectId] }); toast.success('Linked'); },
    onError: (e: Error) => toast.error(e.message || 'Could not link'),
  });
}

export function useUnlinkCoMargin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId }: { linkId: string; projectId: string }) => {
      const { error } = await db.from('co_margin_links').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['margin', v.projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not unlink'),
  });
}

export function useToggleCoPassThrough() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId, value }: { linkId: string; value: boolean; projectId: string }) => {
      const { error } = await db.from('co_margin_links').update({ is_pass_through: value }).eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['margin', v.projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not update'),
  });
}
