/**
 * usePaymentAllocations — read + replace the allocations that split a received
 * payment across the base contract / change orders / SOV line items.
 * useAllocationTargets — the pickable targets (change orders + line items) for a
 * prime contract. All reads are RLS-scoped; the DB caps total allocations at the
 * payment amount and enforces the tenant boundary.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import type { AllocationDraft } from "@/lib/financial/paymentAllocation";

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  kind: "base" | "change_order" | "line_item";
  change_order_id: string | null;
  sov_line_item_id: string | null;
  amount: number;
  note: string | null;
}

export interface AllocationTargets {
  changeOrders: Array<{ id: string; co_no: number; co_type: string; title: string; amount: number; status: string }>;
  lineItems: Array<{ id: string; item_no: string; kind: string; description: string; change_order_id: string | null; scheduled_value: number }>;
}

export function useAllocationTargets(primeContractId: string | null) {
  return useQuery<AllocationTargets>({
    queryKey: ["payment-alloc-targets", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      const [cos, lines] = await Promise.all([
        supabase.from("change_orders" as any)
          .select("id, co_no, co_type, title, amount, status")
          .eq("prime_contract_id", primeContractId!).eq("co_type", "PCO").order("co_no"),
        supabase.from("sov_line_items" as any)
          .select("id, item_no, kind, description, change_order_id, scheduled_value")
          .eq("prime_contract_id", primeContractId!).order("sort_order"),
      ]);
      return {
        changeOrders: ((cos.data ?? []) as any[]).map((c) => ({
          id: c.id, co_no: Number(c.co_no), co_type: c.co_type, title: c.title ?? "", amount: Number(c.amount), status: c.status,
        })),
        lineItems: ((lines.data ?? []) as any[]).map((l) => ({
          id: l.id, item_no: l.item_no, kind: l.kind, description: l.description ?? "",
          change_order_id: l.change_order_id ?? null, scheduled_value: Number(l.scheduled_value),
        })),
      };
    },
  });
}

export function usePaymentAllocations(paymentId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<PaymentAllocation[]>({
    queryKey: ["payment-allocations", paymentId],
    enabled: Boolean(paymentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_payment_allocations" as any).select("*").eq("payment_id", paymentId!);
      if (error) throw error;
      return (data ?? []) as unknown as PaymentAllocation[];
    },
  });

  // Replace ALL allocations for a payment (delete + insert) — simplest correct edit.
  const saveAll = useMutation({
    mutationFn: async ({ paymentId: pid, allocations }: { paymentId: string; allocations: AllocationDraft[] }) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { error: delErr } = await supabase.from("prime_payment_allocations" as any).delete().eq("payment_id", pid);
      if (delErr) throw delErr;
      const rows = allocations
        .filter((a) => Number(a.amount) > 0)
        .map((a) => ({
          tenant_id, payment_id: pid, kind: a.kind,
          change_order_id: a.kind === "change_order" ? a.change_order_id : null,
          sov_line_item_id: a.kind === "line_item" ? a.sov_line_item_id : null,
          amount: Number(a.amount), created_by: user?.id,
        }));
      if (rows.length) {
        const { error } = await supabase.from("prime_payment_allocations" as any).insert(rows as any);
        if (error) {
          if (/exceed the payment amount/i.test(error.message)) throw new Error("Allocations exceed the payment amount.");
          throw error;
        }
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["payment-allocations", vars.paymentId] });
      qc.invalidateQueries({ queryKey: ["prime-contract-payments"] });
    },
  });

  return { ...list, saveAll };
}
