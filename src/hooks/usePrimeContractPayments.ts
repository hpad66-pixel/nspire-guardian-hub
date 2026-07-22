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

export function usePrimeContractPayments(payAppId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<PrimeContractPayment[]>({
    queryKey: ["prime-contract-payments", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_payments" as any)
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
        .from("prime_contract_payments" as any)
        .insert({ ...input, tenant_id, created_by: user?.id } as any)
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
      qc.invalidateQueries({ queryKey: ["prime-contract-payments", payAppId] });
      qc.invalidateQueries({ queryKey: ["pay-app", payAppId] });
      qc.invalidateQueries({ queryKey: ["pay-app-balances"] });
      qc.invalidateQueries({ queryKey: ["project-financials"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prime_contract_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prime-contract-payments", payAppId] });
      qc.invalidateQueries({ queryKey: ["project-financials"] });
    },
  });

  return { ...list, create, remove };
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
        .from("prime_contract_payments" as any)
        .select("amount")
        .eq("prime_contract_id", primeContractId!);
      if (error) throw error;
      return (data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    },
  });
}
