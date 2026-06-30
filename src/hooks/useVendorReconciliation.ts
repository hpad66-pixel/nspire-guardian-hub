import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
const EXECUTED = ['approved', 'executed'];

export interface VendorCO { id: string; co_no: string | number | null; title: string; amount: number; status: string }
export interface VendorReconciliation {
  base: number;                 // sum of SOV lines (or original_value)
  additiveCO: number;
  deductiveCO: number;          // positive number (magnitude of deductions)
  netCO: number;
  revisedContract: number;      // base + netCO
  billedToDate: number;         // approved/submitted on the sub's invoices
  paidToDate: number;           // actual payments
  retainageHeld: number;        // retainage withheld on the sub's invoices
  retainagePct: number;
  maxPayable: number;           // revised − retainage (won't overpay)
  remainingToPay: number;       // maxPayable − paid
  leftToEarn: number;           // revised − billed
  overpaid: boolean;
  cos: VendorCO[];
}

export function useVendorReconciliation(projectId: string | undefined, commitmentId: string | null) {
  return useQuery({
    queryKey: ['vendor-reconciliation', commitmentId],
    enabled: !!commitmentId,
    queryFn: async (): Promise<VendorReconciliation> => {
      const [commitR, sovR, cosR, invR, payR, primeR] = await Promise.all([
        db.from('commitments').select('original_value').eq('id', commitmentId).maybeSingle(),
        db.from('commitment_sov_lines').select('scheduled_value').eq('commitment_id', commitmentId),
        db.from('change_orders').select('id, co_no, title, amount, status').eq('commitment_id', commitmentId),
        db.from('commitment_invoices').select('approved_amount, submitted_amount, retainage_held').eq('commitment_id', commitmentId),
        db.from('commitment_payments').select('amount').eq('commitment_id', commitmentId),
        projectId ? db.from('prime_contracts').select('retainage_pct').eq('project_id', projectId).maybeSingle() : Promise.resolve({ data: null }),
      ]);

      const sov = sovR.data ?? [];
      const sovTotal = sov.reduce((t: number, l: any) => t + Number(l.scheduled_value ?? 0), 0);
      const base = sov.length ? sovTotal : Number(commitR.data?.original_value ?? 0);

      const cosRaw = (cosR.data ?? []).filter((c: any) => EXECUTED.includes(c.status));
      const additiveCO = cosRaw.filter((c: any) => Number(c.amount) > 0).reduce((t: number, c: any) => t + Number(c.amount), 0);
      const deductiveCO = cosRaw.filter((c: any) => Number(c.amount) < 0).reduce((t: number, c: any) => t + Math.abs(Number(c.amount)), 0);
      const netCO = additiveCO - deductiveCO;
      const revisedContract = base + netCO;

      const invoices = invR.data ?? [];
      const billedToDate = invoices.reduce((t: number, i: any) => t + Number(i.approved_amount ?? i.submitted_amount ?? 0), 0);
      const retainageHeld = invoices.reduce((t: number, i: any) => t + Number(i.retainage_held ?? 0), 0);
      const paidToDate = (payR.data ?? []).reduce((t: number, p: any) => t + Number(p.amount ?? 0), 0);
      const retainagePct = Number(primeR.data?.retainage_pct ?? 10);

      const maxPayable = revisedContract - retainageHeld;
      const remainingToPay = maxPayable - paidToDate;
      const leftToEarn = revisedContract - billedToDate;

      return {
        base, additiveCO, deductiveCO, netCO, revisedContract,
        billedToDate, paidToDate, retainageHeld, retainagePct,
        maxPayable, remainingToPay, leftToEarn,
        overpaid: paidToDate > maxPayable + 0.01,
        cos: cosRaw.map((c: any) => ({ id: c.id, co_no: c.co_no, title: c.title, amount: Number(c.amount), status: c.status })),
      };
    },
  });
}
