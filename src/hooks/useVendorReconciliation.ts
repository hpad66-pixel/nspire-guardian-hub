import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
const EXECUTED = ['approved', 'executed'];

export interface VendorCO { id: string; co_no: string | number | null; title: string; amount: number; status: string; treatment: string | null }
export interface OwnerShare { primeCoId: string; co_no: string | number | null; title: string; treatment: string; share: number; status: string; counted: boolean }
export interface VendorReconciliation {
  base: number;                 // the vendor's own contract value (commitment)
  sovTotal: number;             // sum of SOV line items (a breakdown, may differ)
  additiveCO: number;
  deductiveCO: number;          // positive number (magnitude of deductions)
  netCO: number;
  revisedContract: number;      // base + netCO  (only the vendor's money)
  billedToDate: number;         // approved/submitted on the sub's invoices
  paidToDate: number;           // actual payments
  retainageHeld: number;        // retainage to date — from the latest pay app
  retainagePct: number;
  latestPayAppNo: number | null;
  maxPayable: number;           // revised − retainage (won't overpay)
  remainingToPay: number;       // maxPayable − paid
  leftToEarn: number;           // revised − billed
  overpaid: boolean;
  cos: VendorCO[];
  ownerShares: OwnerShare[];    // his share of owner COs classified to him (not yet pushed)
}

export function useVendorReconciliation(projectId: string | undefined, commitmentId: string | null) {
  return useQuery({
    queryKey: ['vendor-reconciliation', commitmentId],
    enabled: !!commitmentId,
    queryFn: async (): Promise<VendorReconciliation> => {
      const [commitR, sovR, cosR, invR, payR, primeR, marginR, primeCosR] = await Promise.all([
        db.from('commitments').select('original_value').eq('id', commitmentId).maybeSingle(),
        db.from('commitment_sov_lines').select('scheduled_value').eq('commitment_id', commitmentId),
        db.from('change_orders').select('id, co_no, title, amount, status').eq('commitment_id', commitmentId),
        db.from('commitment_invoices').select('approved_amount, submitted_amount, retainage_held').eq('commitment_id', commitmentId),
        db.from('commitment_payments').select('amount').eq('commitment_id', commitmentId),
        projectId ? db.from('prime_contracts').select('id, retainage_pct').eq('project_id', projectId).maybeSingle() : Promise.resolve({ data: null }),
        projectId ? db.from('co_margin_links').select('prime_co_id, treatment, sub_cost, sub_co_id, sub_commitment_id').eq('project_id', projectId) : Promise.resolve({ data: [] }),
        projectId ? db.from('change_orders').select('id, co_no, title, amount, status').eq('project_id', projectId).not('prime_contract_id', 'is', null) : Promise.resolve({ data: [] }),
      ]);
      // treatment per pushed sub CO (markup / pass_through / apas_100), deterministic via sub_co_id.
      const treatmentBySubCo: Record<string, string> = {};
      for (const l of (marginR.data ?? [])) if (l.sub_co_id) treatmentBySubCo[l.sub_co_id] = l.treatment;

      // His share of OWNER change orders classified to this vendor's commitment but
      // not yet pushed to a sub CO (deterministic via sub_commitment_id, no fuzzy match).
      const primeById: Record<string, any> = {};
      for (const c of (primeCosR.data ?? [])) primeById[c.id] = c;
      const ownerShares = (marginR.data ?? [])
        .filter((l: any) => l.sub_commitment_id === commitmentId && !l.sub_co_id)
        .map((l: any) => {
          const co = primeById[l.prime_co_id];
          const primeAmt = Number(co?.amount ?? 0);
          const share = l.treatment === 'apas_100' ? 0 : l.treatment === 'pass_through' ? primeAmt : Number(l.sub_cost ?? 0);
          const status = co?.status ?? 'draft';
          return { primeCoId: l.prime_co_id, co_no: co?.co_no ?? null, title: co?.title ?? 'Owner change order', treatment: l.treatment, share, status, counted: EXECUTED.includes(status) };
        });
      const ownerSharesCounted = ownerShares.filter((o: any) => o.counted).reduce((t: number, o: any) => t + o.share, 0);

      // Base = the VENDOR's own contract value (not the prime / not APAS margin).
      const sov = sovR.data ?? [];
      const sovTotal = sov.reduce((t: number, l: any) => t + Number(l.scheduled_value ?? 0), 0);
      const base = Number(commitR.data?.original_value ?? 0);

      // All of this vendor's sub change orders (CCOs) — every status shown; only
      // approved/executed count toward the revised contract.
      const cosAll = (cosR.data ?? []);
      const counted = cosAll.filter((c: any) => EXECUTED.includes(c.status));
      const additiveCO = counted.filter((c: any) => Number(c.amount) > 0).reduce((t: number, c: any) => t + Number(c.amount), 0);
      const deductiveCO = counted.filter((c: any) => Number(c.amount) < 0).reduce((t: number, c: any) => t + Math.abs(Number(c.amount)), 0);
      const netCO = additiveCO - deductiveCO;
      const revisedContract = base + netCO + ownerSharesCounted;

      const invoices = invR.data ?? [];
      const billedToDate = invoices.reduce((t: number, i: any) => t + Number(i.approved_amount ?? i.submitted_amount ?? 0), 0);
      const paidToDate = (payR.data ?? []).reduce((t: number, p: any) => t + Number(p.amount ?? 0), 0);
      const retainagePct = Number(primeR.data?.retainage_pct ?? 10);

      // Retainage to date wired LIVE from the most recent pay app TAGGED to THIS
      // vendor (provenance). A pay app with no vendor tag belongs to no one's
      // dashboard, so vendors without tagged pay apps carry $0 retainage — which
      // is why Ecotech no longer inherits D'Shin's retainage.
      let retainageHeld = 0;
      let latestPayAppNo: number | null = null;
      const pa = await db.from('prime_contract_pay_apps')
        .select('pay_app_no, retainage_held')
        .eq('commitment_id', commitmentId)
        .order('pay_app_no', { ascending: false })
        .limit(1).maybeSingle();
      if (pa.data) {
        retainageHeld = Number(pa.data.retainage_held ?? 0);
        latestPayAppNo = pa.data.pay_app_no ?? null;
      }

      const maxPayable = revisedContract - retainageHeld;
      const remainingToPay = maxPayable - paidToDate;
      const leftToEarn = revisedContract - billedToDate;

      return {
        base, sovTotal, additiveCO, deductiveCO, netCO, revisedContract,
        billedToDate, paidToDate, retainageHeld, retainagePct, latestPayAppNo,
        maxPayable, remainingToPay, leftToEarn,
        overpaid: paidToDate > maxPayable + 0.01,
        cos: cosAll.map((c: any) => ({ id: c.id, co_no: c.co_no, title: c.title, amount: Number(c.amount), status: c.status, treatment: treatmentBySubCo[c.id] ?? null })),
        ownerShares,
      };
    },
  });
}
