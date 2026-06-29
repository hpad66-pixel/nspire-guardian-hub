import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Prime↔sub margin. APAS (prime) bills the owner; each owner change order is
// classified: markup (pay a sub X, keep the delta), pass_through (no margin), or
// apas_100 (100% APAS, no sub). Tables/views not in generated types → (supabase as any).
const db = supabase as any;

const EXECUTED = ['approved', 'executed'];
export type Treatment = 'markup' | 'pass_through' | 'apas_100';

export interface MarginCO {
  id: string;
  co_no: number | null;
  title: string;
  amount: number;
  status: string;
  commitment_id: string | null;
  prime_contract_id: string | null;
}

export interface MarginClass {
  link_id: string;
  prime: MarginCO;
  treatment: Treatment;
  sub_cost: number;
  sub_label: string | null;
  recovery: number; // prime − sub_cost
}

export interface MarginData {
  base: { prime: number; sub: number; delta: number };
  classified: MarginClass[];
  unclassifiedPrime: MarginCO[];
  subCOs: MarginCO[]; // formal sub change orders, for pre-filling markup costs
  subs: { id: string; name: string }[]; // subcontractors / vendors to pay
  totals: {
    revenue: number; cost: number; margin: number;
    coRevenue: number; coCost: number; coMargin: number;
    unclassifiedAmount: number;
  };
  cash: { billedToOwner: number; receivedFromOwner: number; committed: number; paidToSubs: number; owedToSubs: number };
}

export function useMargin(projectId: string | undefined) {
  return useQuery({
    queryKey: ['margin', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<MarginData> => {
      const [summaryR, commitmentsR, cosR, linksR, orgsR] = await Promise.all([
        db.from('v_project_financial_summary').select('original_contract, revised_contract, committed_total, paid_to_subs, billed_to_date, received_to_date').eq('project_id', projectId).maybeSingle(),
        db.from('commitments').select('original_value').eq('project_id', projectId),
        db.from('change_orders').select('id, co_no, title, amount, status, commitment_id, prime_contract_id').eq('project_id', projectId),
        db.from('co_margin_links').select('id, prime_co_id, treatment, sub_cost, sub_label, is_pass_through').eq('project_id', projectId),
        db.from('organizations').select('id, name').in('kind', ['sub', 'vendor']).eq('is_active', true).order('name'),
      ]);
      const s = summaryR.data ?? {};
      const cos: MarginCO[] = (cosR.data ?? []).filter((c: MarginCO) => EXECUTED.includes(c.status));
      const links = linksR.data ?? [];

      const primeBase = Number(s.original_contract ?? 0);
      const subBase = (commitmentsR.data ?? []).reduce((t: number, c: any) => t + Number(c.original_value ?? 0), 0);

      const primeCOs = cos.filter((c) => c.prime_contract_id);
      const subCOs = cos.filter((c) => c.commitment_id);
      const byId = (id: string) => primeCOs.find((c) => c.id === id) ?? null;

      const classified: MarginClass[] = [];
      const classifiedIds = new Set<string>();
      links.forEach((l: any) => {
        const prime = byId(l.prime_co_id);
        if (!prime) return;
        classifiedIds.add(prime.id);
        const treatment: Treatment = (l.treatment ?? (l.is_pass_through ? 'pass_through' : 'markup')) as Treatment;
        const subCost = treatment === 'apas_100' ? 0 : treatment === 'pass_through' ? Number(prime.amount ?? 0) : Number(l.sub_cost ?? 0);
        classified.push({ link_id: l.id, prime, treatment, sub_cost: subCost, sub_label: l.sub_label ?? null, recovery: Number(prime.amount ?? 0) - subCost });
      });

      const unclassifiedPrime = primeCOs.filter((c) => !classifiedIds.has(c.id));
      const coRevenue = classified.reduce((t, c) => t + Number(c.prime.amount ?? 0), 0);
      const coCost = classified.reduce((t, c) => t + c.sub_cost, 0);
      const revenue = primeBase + coRevenue;
      const cost = subBase + coCost;
      const committed = Number(s.committed_total ?? cost);
      const paidToSubs = Number(s.paid_to_subs ?? 0);

      return {
        base: { prime: primeBase, sub: subBase, delta: primeBase - subBase },
        classified,
        unclassifiedPrime,
        subCOs,
        subs: (orgsR.data ?? []).map((o: any) => ({ id: o.id, name: o.name })),
        totals: {
          revenue, cost, margin: revenue - cost,
          coRevenue, coCost, coMargin: coRevenue - coCost,
          unclassifiedAmount: unclassifiedPrime.reduce((t, c) => t + Number(c.amount ?? 0), 0),
        },
        cash: {
          billedToOwner: Number(s.billed_to_date ?? 0),
          receivedFromOwner: Number(s.received_to_date ?? 0),
          committed, paidToSubs, owedToSubs: committed - paidToSubs,
        },
      };
    },
  });
}

export function useSaveMarginClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, primeCoId, treatment, subCost, subLabel, subCoId }: {
      projectId: string; primeCoId: string; treatment: Treatment; subCost?: number; subLabel?: string | null; subCoId?: string | null;
    }) => {
      const row = {
        project_id: projectId, prime_co_id: primeCoId, treatment,
        sub_cost: treatment === 'apas_100' ? 0 : Number(subCost ?? 0),
        sub_label: subLabel ?? null, sub_co_id: subCoId ?? null,
        is_pass_through: treatment === 'pass_through',
      };
      const { error } = await db.from('co_margin_links').upsert(row, { onConflict: 'prime_co_id' });
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['margin', v.projectId] }); toast.success('Saved'); },
    onError: (e: Error) => toast.error(e.message || 'Could not save'),
  });
}

export function useDeleteMarginClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId }: { linkId: string; projectId: string }) => {
      const { error } = await db.from('co_margin_links').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['margin', v.projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not remove'),
  });
}
