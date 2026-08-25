/**
 * F0 · usePrimeContractPayments — AR cash receipts against a prime pay app.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export interface PrimeContractPayment {
  id: string;
  tenant_id: string;
  prime_contract_id: string;
  pay_app_id: string;
  amount: number;
  received_date: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  artifact_id: string | null;
  created_at: string;
}

export interface AdminPrimeContractPayment extends PrimeContractPayment {
  allocation_count: number;
}

export interface RecordPrimePaymentInput {
  prime_contract_id: string;
  pay_app_id: string;
  amount: number;
  received_date: string;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  artifact_id?: string | null;
}

export type CorrectPrimePaymentInput = Pick<
  PrimeContractPayment,
  "amount" | "received_date" | "method" | "reference" | "notes"
>;

function invalidatePrimePaymentQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["prime-contract-payments"] });
  qc.invalidateQueries({ queryKey: ["prime-contract-payments-total"] });
  qc.invalidateQueries({ queryKey: ["prime-contract-payment-admin"] });
  qc.invalidateQueries({ queryKey: ["payment-allocations"] });
  qc.invalidateQueries({ queryKey: ["reconciled-payment-ids"] });
  qc.invalidateQueries({ queryKey: ["pay-app"] });
  qc.invalidateQueries({ queryKey: ["pay-app-balances"] });
  qc.invalidateQueries({ queryKey: ["project-financials"] });
}

export function usePrimeContractPayments(payAppId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<PrimeContractPayment[]>({
    queryKey: ["prime-contract-payments", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_payments")
        .select("*")
        .eq("pay_app_id", payAppId!)
        .order("received_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PrimeContractPayment[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: RecordPrimePaymentInput) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("prime_contract_payments")
        .insert({ ...input, tenant_id, created_by: user?.id })
        .select()
        .single();
      if (error) {
        if (/OVERPAYMENT/i.test(error.message)) {
          throw new Error("This exceeds the pay app's remaining balance.");
        }
        throw error;
      }
      return data as unknown as PrimeContractPayment;
    },
    onSuccess: () => {
      invalidatePrimePaymentQueries(qc);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prime_contract_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidatePrimePaymentQueries(qc),
  });

  return { ...list, create, remove };
}

/**
 * Administrator correction surface for owner receipts. The database repeats
 * both guards enforced by the UI: the current user must be an administrator,
 * and the receipt must not have any allocation rows.
 */
export function usePrimeContractPaymentAdministration(primeContractId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<AdminPrimeContractPayment[]>({
    queryKey: ["prime-contract-payment-admin", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      const { data: payments, error: paymentsError } = await supabase
        .from("prime_contract_payments")
        .select("*")
        .eq("prime_contract_id", primeContractId!)
        .order("received_date", { ascending: false });
      if (paymentsError) throw paymentsError;

      const rows = (payments ?? []) as unknown as PrimeContractPayment[];
      if (!rows.length) return [];

      const { data: allocations, error: allocationsError } = await supabase
        .from("prime_payment_allocations")
        .select("payment_id")
        .in("payment_id", rows.map((payment) => payment.id));
      if (allocationsError) throw allocationsError;

      const counts = new Map<string, number>();
      for (const allocation of allocations ?? []) {
        counts.set(allocation.payment_id, (counts.get(allocation.payment_id) ?? 0) + 1);
      }

      return rows.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
        allocation_count: counts.get(payment.id) ?? 0,
      }));
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: CorrectPrimePaymentInput }) => {
      const { data, error } = await supabase
        .from("prime_contract_payments")
        .update(changes)
        .eq("id", id)
        .select()
        .single();
      if (error) {
        throw new Error(
          error.code === "PGRST116"
            ? "This receipt can no longer be edited. Only administrators can correct an unallocated receipt."
            : error.message,
        );
      }
      return data as unknown as PrimeContractPayment;
    },
    onSuccess: () => invalidatePrimePaymentQueries(qc),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("prime_contract_payments")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error("This receipt can no longer be deleted. Only administrators can delete an unallocated receipt.");
      }
      return id;
    },
    onSuccess: () => invalidatePrimePaymentQueries(qc),
  });

  return { ...list, update, remove };
}

/**
 * Total cash actually received from the client across ALL pay apps on a prime
 * contract — the cumulative "paid to date" figure the pay-app position card
 * shows (distinct from the G702's "less previous certificates", which is billed,
 * not paid).
 */
export function usePrimeContractPaymentsTotal(primeContractId: string | null) {
  return useQuery<number>({
    queryKey: ["prime-contract-payments-total", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_payments")
        .select("amount")
        .eq("prime_contract_id", primeContractId!);
      if (error) throw error;
      return (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    },
  });
}
