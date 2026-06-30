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
  sub_co_id: string | null; // the sub CCO this was pushed into, if any
  sub_commitment_id: string | null; // the sub's commitment this CO is attributed to
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
      const [summaryR, commitmentsR, cosR, linksR] = await Promise.all([
        db.from('v_project_financial_summary').select('original_contract, revised_contract, committed_total, paid_to_subs, billed_to_date, received_to_date').eq('project_id', projectId).maybeSingle(),
        db.from('commitments').select('id, title, original_value').eq('project_id', projectId),
        db.from('change_orders').select('id, co_no, title, amount, status, commitment_id, prime_contract_id').eq('project_id', projectId),
        db.from('co_margin_links').select('id, prime_co_id, treatment, sub_cost, sub_label, is_pass_through, sub_co_id, sub_commitment_id').eq('project_id', projectId),
      ]);
      const s = summaryR.data ?? {};
      const allCos: MarginCO[] = (cosR.data ?? []);
      const links = linksR.data ?? [];

      const primeBase = Number(s.original_contract ?? 0);
      const subBase = (commitmentsR.data ?? []).reduce((t: number, c: any) => t + Number(c.original_value ?? 0), 0);

      // Owner-side COs (anything that isn't a sub CO) are what you classify. Show
      // EVERY active one — executed AND pending — so nothing is hidden; only the
      // executed/approved ones count toward the totals below.
      const primeCOs = allCos.filter((c) => !c.commitment_id && c.status !== 'rejected' && c.status !== 'void');
      // Sub COs for the classify pre-fill — any status (incl. draft) so nothing is hidden.
      const subCOs = allCos.filter((c: MarginCO) => c.commitment_id);
      const byId = (id: string) => primeCOs.find((c) => c.id === id) ?? null;

      // A CO counts as classified the moment it has a link — so it leaves the
      // "unclassified" list immediately, even if its prime CO can't be re-resolved.
      const classifiedIds = new Set<string>((links ?? []).map((l: any) => l.prime_co_id));
      const classified: MarginClass[] = [];
      links.forEach((l: any) => {
        const prime = byId(l.prime_co_id);
        if (!prime) return;
        const treatment: Treatment = (l.treatment ?? (l.is_pass_through ? 'pass_through' : 'markup')) as Treatment;
        const subCost = treatment === 'apas_100' ? 0 : treatment === 'pass_through' ? Number(prime.amount ?? 0) : Number(l.sub_cost ?? 0);
        classified.push({ link_id: l.id, prime, treatment, sub_cost: subCost, sub_label: l.sub_label ?? null, recovery: Number(prime.amount ?? 0) - subCost, sub_co_id: l.sub_co_id ?? null, sub_commitment_id: l.sub_commitment_id ?? null });
      });

      const unclassifiedPrime = primeCOs.filter((c) => !classifiedIds.has(c.id));
      // Only executed/approved classified COs count toward revenue/cost.
      const counted = classified.filter((c) => EXECUTED.includes(c.prime.status));
      const coRevenue = counted.reduce((t, c) => t + Number(c.prime.amount ?? 0), 0);
      const coCost = counted.reduce((t, c) => t + c.sub_cost, 0);
      const revenue = primeBase + coRevenue;
      const cost = subBase + coCost;
      const committed = Number(s.committed_total ?? cost);
      const paidToSubs = Number(s.paid_to_subs ?? 0);

      return {
        base: { prime: primeBase, sub: subBase, delta: primeBase - subBase },
        classified,
        unclassifiedPrime,
        subCOs,
        subs: (commitmentsR.data ?? []).map((c: any) => ({ id: c.id, name: (c.title ?? '').split('—')[0].trim() || c.title })),
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
    mutationFn: async ({ projectId, primeCoId, treatment, subCost, subLabel, subCoId, subCommitmentId }: {
      projectId: string; primeCoId: string; treatment: Treatment; subCost?: number; subLabel?: string | null; subCoId?: string | null; subCommitmentId?: string | null;
    }) => {
      const row = {
        project_id: projectId, prime_co_id: primeCoId, treatment,
        sub_cost: treatment === 'apas_100' ? 0 : Number(subCost ?? 0),
        sub_label: subLabel ?? null, sub_co_id: subCoId ?? null,
        sub_commitment_id: subCommitmentId ?? null,
        is_pass_through: treatment === 'pass_through',
      };
      // Robust replace (no ON CONFLICT dependency): clear any existing
      // classification for this CO, then insert the fresh one.
      const { error: delErr } = await db.from('co_margin_links').delete().eq('prime_co_id', primeCoId);
      if (delErr) throw delErr;
      const { error } = await db.from('co_margin_links').insert(row);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['margin', v.projectId] }); toast.success('Saved'); },
    onError: (e: Error) => toast.error(e.message || 'Could not save'),
  });
}

// One-click: turn a classified prime CO's sub portion into a real sub change
// order (CCO) on the chosen commitment, and link it back on the margin row. This
// makes the sub cost a payable you can invoice against. Idempotent-ish: re-pushing
// replaces the link target (old CCO is left for manual cleanup if needed).
export function usePushToCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, linkId, commitmentId, amount, title }: {
      projectId: string; linkId: string; commitmentId: string; amount: number; title: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // CCO trigger requires commitment_id set and prime_contract_id null.
      const { data: co, error } = await db.from('change_orders').insert({
        project_id: projectId, title, amount: Number(amount) || 0, status: 'approved',
        co_type: 'CCO', commitment_id: commitmentId, requested_by: user?.id ?? null,
      }).select('id').single();
      if (error) throw error;
      const { error: linkErr } = await db.from('co_margin_links').update({ sub_co_id: (co as any).id }).eq('id', linkId);
      if (linkErr) throw linkErr;
      return (co as any).id as string;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ['margin', v.projectId] });
      qc.invalidateQueries({ queryKey: ['commitment-totals'] });
      qc.invalidateQueries({ queryKey: ['change-orders'] });
      toast.success('Pushed to commitment as a sub change order.');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not push to commitment'),
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
