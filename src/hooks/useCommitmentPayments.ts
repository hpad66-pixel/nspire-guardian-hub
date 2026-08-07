/**
 * F0 · useCommitmentPayments — AP disbursements against a commitment invoice.
 * Surfaces the DB lien-gate / over-payment guards as typed errors.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export interface CommitmentPayment {
  id: string;
  tenant_id: string;
  commitment_id: string;
  commitment_invoice_id: string;
  amount: number;
  paid_date: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  artifact_id: string | null;
  created_at: string;
}

export type PaymentErrorCode = "LIEN_REQUIRED" | "OVERPAYMENT" | "UNKNOWN";

export class CommitmentPaymentError extends Error {
  code: PaymentErrorCode;
  constructor(code: PaymentErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CommitmentPaymentError";
  }
}

function classify(message: string): CommitmentPaymentError {
  if (/LIEN_REQUIRED/i.test(message))
    return new CommitmentPaymentError("LIEN_REQUIRED", "An approved lien release is required before paying this invoice.");
  if (/OVERPAYMENT/i.test(message))
    return new CommitmentPaymentError("OVERPAYMENT", "This exceeds the invoice's remaining balance.");
  return new CommitmentPaymentError("UNKNOWN", message);
}

export interface RecordCommitmentPaymentInput {
  commitment_id: string;
  commitment_invoice_id: string;
  amount: number;
  paid_date: string;
  method?: string | null;
  reference?: string | null;
  notes?: string | null;
  artifact_id?: string | null;
}

export function useCommitmentPayments(invoiceId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<CommitmentPayment[]>({
    queryKey: ["commitment-payments", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commitment_payments" as any)
        .select("*")
        .eq("commitment_invoice_id", invoiceId!)
        .order("paid_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CommitmentPayment[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: RecordCommitmentPaymentInput) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("commitment_payments" as any)
        .insert({ ...input, tenant_id, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw classify(error.message);
      return data as unknown as CommitmentPayment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitment-payments", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["commitment-invoice-balances"] });
      qc.invalidateQueries({ queryKey: ["project-financials"] });
      qc.invalidateQueries({ queryKey: ["margin"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commitment_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commitment-payments", invoiceId] });
      qc.invalidateQueries({ queryKey: ["project-financials"] });
      qc.invalidateQueries({ queryKey: ["margin"] });
    },
  });

  return { ...list, create, remove };
}
