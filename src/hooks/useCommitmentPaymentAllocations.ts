/**
 * Commitment (subcontractor) payment allocations — split a payment to a sub across
 * the commitment base, its change orders (CCOs), and/or its SOV line items. Reuses
 * the AllocationTargets shape so the shared PaymentAllocationEditor works; the
 * line-item id rides in AllocationDraft.sov_line_item_id and is written to the
 * commitment_sov_line_id column.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import type { AllocationTargets } from "@/hooks/usePaymentAllocations";
import type { AllocationDraft } from "@/lib/financial/paymentAllocation";

export interface CommitmentPaymentAllocation {
  id: string;
  payment_id: string;
  kind: "base" | "change_order" | "line_item";
  change_order_id: string | null;
  commitment_sov_line_id: string | null;
  amount: number;
}

export function useCommitmentAllocationTargets(commitmentId: string | null) {
  return useQuery<AllocationTargets>({
    queryKey: ["commitment-alloc-targets", commitmentId],
    enabled: Boolean(commitmentId),
    queryFn: async () => {
      const [cos, lines] = await Promise.all([
        supabase.from("change_orders" as any)
          .select("id, co_no, co_type, title, amount, status")
          .eq("commitment_id", commitmentId!).eq("co_type", "CCO").order("co_no"),
        supabase.from("commitment_sov_lines" as any)
          .select("id, line_no, description, scheduled_value")
          .eq("commitment_id", commitmentId!).order("line_no"),
      ]);
      return {
        changeOrders: ((cos.data ?? []) as any[]).map((c) => ({
          id: c.id, co_no: Number(c.co_no), co_type: c.co_type, title: c.title ?? "", amount: Number(c.amount), status: c.status,
        })),
        lineItems: ((lines.data ?? []) as any[]).map((l) => ({
          id: l.id, item_no: String(l.line_no), kind: "commitment", description: l.description ?? "",
          change_order_id: null, scheduled_value: Number(l.scheduled_value),
        })),
      };
    },
  });
}

export function useCommitmentPaymentAllocations(paymentId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<CommitmentPaymentAllocation[]>({
    queryKey: ["commitment-payment-allocations", paymentId],
    enabled: Boolean(paymentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_payment_allocations" as any).select("*").eq("payment_id", paymentId!);
      if (error) throw error;
      return (data ?? []) as unknown as CommitmentPaymentAllocation[];
    },
  });

  const saveAll = useMutation({
    mutationFn: async ({ paymentId: pid, allocations }: { paymentId: string; allocations: AllocationDraft[] }) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { error: delErr } = await supabase.from("commitment_payment_allocations" as any).delete().eq("payment_id", pid);
      if (delErr) throw delErr;
      const rows = allocations
        .filter((a) => Number(a.amount) > 0)
        .map((a) => ({
          tenant_id, payment_id: pid, kind: a.kind,
          change_order_id: a.kind === "change_order" ? a.change_order_id : null,
          commitment_sov_line_id: a.kind === "line_item" ? a.sov_line_item_id : null,
          amount: Number(a.amount), created_by: user?.id,
        }));
      if (rows.length) {
        const { error } = await supabase.from("commitment_payment_allocations" as any).insert(rows as any);
        if (error) {
          if (/exceed the payment amount/i.test(error.message)) throw new Error("Allocations exceed the payment amount.");
          throw error;
        }
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["commitment-payment-allocations", vars.paymentId] });
    },
  });

  return { ...list, saveAll };
}
