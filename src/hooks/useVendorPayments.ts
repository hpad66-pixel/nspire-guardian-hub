/**
 * All disbursements to ONE subcontractor (commitment), across every invoice, each
 * with its granular split (commitment_payment_allocations). Powers the per-vendor
 * payments tab where each payment can be drilled into base / change-order /
 * line-item allocations.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VendorPaymentAllocation {
  id: string;
  kind: "base" | "change_order" | "line_item";
  change_order_id: string | null;
  commitment_sov_line_id: string | null;
  amount: number;
}

export interface VendorPayment {
  id: string;
  commitment_id: string;
  commitment_invoice_id: string | null;
  amount: number;
  paid_date: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  allocations: VendorPaymentAllocation[];
}

export function useVendorPayments(commitmentId: string | null) {
  return useQuery<VendorPayment[]>({
    queryKey: ["vendor-payments", commitmentId],
    enabled: Boolean(commitmentId),
    queryFn: async () => {
      const { data: pays, error } = await supabase
        .from("commitment_payments" as any)
        .select("id, commitment_id, commitment_invoice_id, amount, paid_date, method, reference, notes")
        .eq("commitment_id", commitmentId!)
        .order("paid_date", { ascending: false });
      if (error) throw error;
      const list = (pays ?? []) as any[];
      if (!list.length) return [];

      const { data: allocs } = await supabase
        .from("commitment_payment_allocations" as any)
        .select("id, payment_id, kind, change_order_id, commitment_sov_line_id, amount")
        .in("payment_id", list.map((p) => p.id));
      const byPayment = new Map<string, VendorPaymentAllocation[]>();
      for (const a of (allocs ?? []) as any[]) {
        const arr = byPayment.get(a.payment_id) ?? [];
        arr.push({
          id: a.id, kind: a.kind, change_order_id: a.change_order_id,
          commitment_sov_line_id: a.commitment_sov_line_id, amount: Number(a.amount),
        });
        byPayment.set(a.payment_id, arr);
      }

      return list.map((p) => ({
        id: p.id, commitment_id: p.commitment_id, commitment_invoice_id: p.commitment_invoice_id,
        amount: Number(p.amount), paid_date: p.paid_date, method: p.method,
        reference: p.reference, notes: p.notes, allocations: byPayment.get(p.id) ?? [],
      }));
    },
  });
}
