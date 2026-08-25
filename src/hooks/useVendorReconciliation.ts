import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { marginClassificationNeedsReview } from '@/lib/financial/changeOrderPropagation';

const db = supabase as any;
const EXECUTED = ['approved', 'executed'];

export interface VendorCO { id: string; co_no: string | number | null; title: string; amount: number; status: string; treatment: string | null; classificationNeedsReview: boolean }
export interface OwnerShare { primeCoId: string; co_no: string | number | null; title: string; treatment: string; share: number; status: string; counted: boolean; needsReview: boolean }
export interface VendorReconciliationControl {
  commitmentId: string;
  tenantId: string;
  asOfDate: string;
  expectedPaidToDate: number;
  expectedPaymentCount: number;
  expectedInvoiceCount: number;
  actualPaidToDate: number;
  actualPaymentCount: number;
  actualInvoiceCount: number;
  missingReferenceCount: number;
  variance: number;
  isReconciled: boolean;
  certifiedAt: string | null;
  controlNote: string | null;
}
export interface VendorReconciliation {
  base: number;                 // the vendor's own contract value (commitment)
  sovTotal: number;             // sum of SOV line items (a breakdown, may differ)
  additiveCO: number;
  deductiveCO: number;          // positive number (magnitude of deductions)
  netCO: number;
  revisedContract: number;      // base + netCO  (only the vendor's money)
  billedToDate: number;         // approved/submitted on the sub's invoices
  paidToDate: number;           // actual payments
  retainageHeld: number;        // outstanding retainage on approved/paid sub invoices
  retainagePct: number;
  maxPayable: number;           // revised − retainage (won't overpay)
  remainingToPay: number;       // maxPayable − paid
  leftToEarn: number;           // revised − billed
  overpaid: boolean;
  cos: VendorCO[];
  ownerShares: OwnerShare[];    // his share of owner COs classified to him (not yet pushed)
  lineItems: { item_no: string; description: string; scheduled_value: number }[]; // pay-app/SOV lines tagged to him
  lineItemsTotal: number;
  control: VendorReconciliationControl | null;
}

export function useVendorReconciliation(projectId: string | undefined, commitmentId: string | null) {
  return useQuery({
    queryKey: ['vendor-reconciliation', projectId, commitmentId],
    enabled: !!commitmentId,
    queryFn: async (): Promise<VendorReconciliation> => {
      const [commitR, sovR, cosR, invR, payR, marginR, primeCosR, sovLinesR, controlR] = await Promise.all([
        db.from('commitments').select('original_value, retainage_pct').eq('id', commitmentId).maybeSingle(),
        db.from('commitment_sov_lines').select('scheduled_value').eq('commitment_id', commitmentId),
        db.from('change_orders').select('id, co_no, title, amount, status').eq('commitment_id', commitmentId),
        db.from('commitment_invoices').select('status, approved_amount, submitted_amount, retainage_held').eq('commitment_id', commitmentId),
        db.from('commitment_payments').select('amount').eq('commitment_id', commitmentId),
        projectId ? db.from('co_margin_links').select('prime_co_id, treatment, sub_cost, sub_co_id, sub_commitment_id, source_amount, source_amendment_count').eq('project_id', projectId) : Promise.resolve({ data: [] }),
        projectId ? db.from('change_orders').select('id, co_no, title, amount, status, amendment_history').eq('project_id', projectId).not('prime_contract_id', 'is', null) : Promise.resolve({ data: [] }),
        db.from('sov_line_items').select('item_no, description, scheduled_value').eq('commitment_id', commitmentId).order('sort_order'),
        db.from('v_vendor_reconciliation_status').select('*').eq('commitment_id', commitmentId).maybeSingle(),
      ]);
      const lineItems = (sovLinesR.data ?? []).map((l: any) => ({ item_no: l.item_no, description: l.description, scheduled_value: Number(l.scheduled_value ?? 0) }));
      const lineItemsTotal = lineItems.reduce((t: number, l: any) => t + l.scheduled_value, 0);
      // treatment per pushed sub CO (markup / pass_through / apas_100), deterministic via sub_co_id.
      const treatmentBySubCo: Record<string, string> = {};
      const reviewBySubCo: Record<string, boolean> = {};
      for (const l of (marginR.data ?? [])) {
        if (!l.sub_co_id) continue;
        treatmentBySubCo[l.sub_co_id] = l.treatment;
        const prime = (primeCosR.data ?? []).find((c: any) => c.id === l.prime_co_id);
        reviewBySubCo[l.sub_co_id] = prime ? marginClassificationNeedsReview(prime, l) : true;
      }

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
          const needsReview = co ? marginClassificationNeedsReview(co, l) : true;
          return { primeCoId: l.prime_co_id, co_no: co?.co_no ?? null, title: co?.title ?? 'Owner change order', treatment: l.treatment, share, status, counted: !needsReview && EXECUTED.includes(status), needsReview };
        });
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
      // Unpushed owner-side allocations are visibility only.  They do not
      // amend the subcontract or become payable until an approved/executed CCO
      // exists on this commitment, matching the database payment ceiling.
      const revisedContract = base + netCO;

      const billedInvoices = (invR.data ?? []).filter((i: any) => ['submitted', 'approved', 'paid'].includes(i.status));
      const approvedInvoices = (invR.data ?? []).filter((i: any) => ['approved', 'paid'].includes(i.status));
      const billedToDate = billedInvoices.reduce((t: number, i: any) => t + Number(i.approved_amount ?? i.submitted_amount ?? 0), 0);
      const paidToDate = (payR.data ?? []).reduce((t: number, p: any) => t + Number(p.amount ?? 0), 0);
      const retainagePct = Number(commitR.data?.retainage_pct ?? 0);
      const retainageHeld = approvedInvoices.reduce(
        (total: number, invoice: any) => total + Math.max(0, Number(invoice.retainage_held ?? 0)),
        0,
      );

      const maxPayable = revisedContract - retainageHeld;
      const remainingToPay = maxPayable - paidToDate;
      const leftToEarn = revisedContract - billedToDate;
      const rawControl = controlR.data as any;
      const control: VendorReconciliationControl | null = rawControl ? {
        commitmentId: rawControl.commitment_id,
        tenantId: rawControl.tenant_id,
        asOfDate: rawControl.as_of_date,
        expectedPaidToDate: Number(rawControl.expected_paid_to_date ?? 0),
        expectedPaymentCount: Number(rawControl.expected_payment_count ?? 0),
        expectedInvoiceCount: Number(rawControl.expected_invoice_count ?? 0),
        actualPaidToDate: Number(rawControl.actual_paid_to_date ?? 0),
        actualPaymentCount: Number(rawControl.actual_payment_count ?? 0),
        actualInvoiceCount: Number(rawControl.actual_invoice_count ?? 0),
        missingReferenceCount: Number(rawControl.missing_reference_count ?? 0),
        variance: Number(rawControl.variance ?? 0),
        isReconciled: rawControl.is_reconciled === true,
        certifiedAt: rawControl.certified_at ?? null,
        controlNote: rawControl.control_note ?? null,
      } : null;

      return {
        base, sovTotal, additiveCO, deductiveCO, netCO, revisedContract,
        billedToDate, paidToDate, retainageHeld, retainagePct,
        maxPayable, remainingToPay, leftToEarn,
        overpaid: paidToDate > maxPayable + 0.01,
        cos: cosAll.map((c: any) => ({ id: c.id, co_no: c.co_no, title: c.title, amount: Number(c.amount), status: c.status, treatment: treatmentBySubCo[c.id] ?? null, classificationNeedsReview: reviewBySubCo[c.id] ?? false })),
        ownerShares,
        lineItems, lineItemsTotal,
        control,
      };
    },
  });
}
