import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
const EXECUTED = ['approved', 'executed'];

export interface SubLine {
  commitmentId: string;
  name: string;
  contract: number;     // original + their approved CCOs
  paid: number;         // commitment_payments to them
  retainage: number;    // from the latest pay app tagged to them
  remaining: number;    // contract − paid − retainage
}

export interface ApasTrueUp {
  receivedFromOwner: number;   // money IN (owner → APAS)
  billedToOwner: number;
  ownerRetainageHeld: number;  // owner holds on APAS (latest prime pay app)
  primeRevised: number;        // APAS revenue (owner contract + approved COs)
  paidToSubs: number;          // money OUT
  subCost: number;             // committed to subs (revised)
  apasMargin: number;          // revenue − sub cost
  netCashOnHand: number;       // received − paid to subs
  subs: SubLine[];
}

export function useApasTrueUp(projectId: string | undefined) {
  return useQuery({
    queryKey: ['apas-trueup', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ApasTrueUp> => {
      const [summaryR, commitsR, payR, cosR, primeR] = await Promise.all([
        db.from('v_project_financial_summary').select('original_contract, approved_co_value, revised_contract, billed_to_date, received_to_date, paid_to_subs, committed_total').eq('project_id', projectId).maybeSingle(),
        db.from('commitments').select('id, title, original_value').eq('project_id', projectId),
        db.from('commitment_payments').select('commitment_id, amount').eq('project_id', projectId),
        db.from('change_orders').select('commitment_id, amount, status').eq('project_id', projectId),
        db.from('prime_contracts').select('id').eq('project_id', projectId).maybeSingle(),
      ]);
      const s = summaryR.data ?? {};
      const commitments = commitsR.data ?? [];
      const payments = payR.data ?? [];
      const ccos = (cosR.data ?? []).filter((c: any) => c.commitment_id && EXECUTED.includes(c.status));

      // Retainage per vendor from the latest pay app tagged to them.
      const primeId = primeR.data?.id;
      const retByCommit: Record<string, number> = {};
      let ownerRetainageHeld = 0;
      if (primeId) {
        const pas = await db.from('prime_contract_pay_apps')
          .select('pay_app_no, retainage_held, commitment_id')
          .eq('prime_contract_id', primeId).order('pay_app_no', { ascending: false });
        const seen = new Set<string>();
        for (const pa of (pas.data ?? [])) {
          if (pa.commitment_id && !seen.has(pa.commitment_id)) { seen.add(pa.commitment_id); retByCommit[pa.commitment_id] = Number(pa.retainage_held ?? 0); }
        }
        // owner's total retainage = the most recent pay app overall
        const latest = (pas.data ?? [])[0];
        ownerRetainageHeld = Number(latest?.retainage_held ?? 0);
      }

      const paidByCommit: Record<string, number> = {};
      for (const p of payments) paidByCommit[p.commitment_id] = (paidByCommit[p.commitment_id] ?? 0) + Number(p.amount ?? 0);
      const ccoByCommit: Record<string, number> = {};
      for (const c of ccos) ccoByCommit[c.commitment_id] = (ccoByCommit[c.commitment_id] ?? 0) + Number(c.amount ?? 0);

      const subs: SubLine[] = commitments.map((c: any) => {
        const contract = Number(c.original_value ?? 0) + (ccoByCommit[c.id] ?? 0);
        const paid = paidByCommit[c.id] ?? 0;
        const retainage = retByCommit[c.id] ?? 0;
        return { commitmentId: c.id, name: (c.title ?? '').split('—')[0].trim() || c.title, contract, paid, retainage, remaining: contract - paid - retainage };
      }).sort((a, b) => b.contract - a.contract);

      const primeRevised = Number(s.revised_contract ?? (Number(s.original_contract ?? 0) + Number(s.approved_co_value ?? 0)));
      const subCost = Number(s.committed_total ?? subs.reduce((t, x) => t + x.contract, 0));
      const receivedFromOwner = Number(s.received_to_date ?? 0);
      const paidToSubs = Number(s.paid_to_subs ?? subs.reduce((t, x) => t + x.paid, 0));

      return {
        receivedFromOwner,
        billedToOwner: Number(s.billed_to_date ?? 0),
        ownerRetainageHeld,
        primeRevised,
        paidToSubs,
        subCost,
        apasMargin: primeRevised - subCost,
        netCashOnHand: receivedFromOwner - paidToSubs,
        subs,
      };
    },
  });
}
