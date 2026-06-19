/**
 * D1 · usePayApp — pay-app detail CRUD (lines, submit, approve, reject).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export interface PayApp {
  id: string; tenant_id: string; prime_contract_id: string;
  pay_app_no: number; period_end: string;
  status: "draft" | "submitted" | "approved" | "paid" | "rejected";
  submitted_amount: number | null;
  approved_amount: number | null;
  retainage_held: number | null;
}

export interface PayAppLine {
  id: string; pay_app_id: string; sov_line_id: string;
  work_this_period: number; materials_stored: number;
  pct_complete: number | null;
}

export function usePayApp(payAppId: string | null) {
  const qc = useQueryClient();

  const detail = useQuery<PayApp | null>({
    queryKey: ["pay-app", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_pay_apps" as any)
        .select("*")
        .eq("id", payAppId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PayApp | null;
    },
  });

  const lines = useQuery<PayAppLine[]>({
    queryKey: ["pay-app-lines", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_pay_app_lines" as any)
        .select("*")
        .eq("pay_app_id", payAppId!);
      if (error) throw error;
      return (data ?? []) as PayAppLine[];
    },
  });

  const upsertLine = useMutation({
    mutationFn: async (input: {
      sov_line_id: string;
      work_this_period: number;
      materials_stored: number;
      pct_complete?: number | null;
    }) => {
      if (!payAppId) throw new Error("No pay app");
      const { data, error } = await supabase
        .from("prime_contract_pay_app_lines" as any)
        .upsert(
          { pay_app_id: payAppId, ...input } as any,
          { onConflict: "pay_app_id,sov_line_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as PayAppLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-app-lines", payAppId] }),
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!payAppId) throw new Error("No pay app");
      // compute submitted_amount from lines
      const { data: ll } = await supabase
        .from("prime_contract_pay_app_lines" as any)
        .select("work_this_period, materials_stored")
        .eq("pay_app_id", payAppId);
      const total = (ll ?? []).reduce(
        (s: number, l: any) =>
          s + Number(l.work_this_period ?? 0) + Number(l.materials_stored ?? 0),
        0,
      );
      const { data, error } = await supabase
        .from("prime_contract_pay_apps" as any)
        .update({ status: "submitted", submitted_amount: total } as any)
        .eq("id", payAppId)
        .select()
        .single();
      if (error) throw error;
      return data as PayApp;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-app", payAppId] }),
  });

  const approve = useMutation({
    mutationFn: async (approved: number) => {
      if (!payAppId) throw new Error("No pay app");
      const { data: pa } = await supabase
        .from("prime_contract_pay_apps" as any)
        .select("prime_contract_id")
        .eq("id", payAppId).single();
      const { data: pc } = await supabase
        .from("prime_contracts" as any)
        .select("retainage_pct")
        .eq("id", (pa as any).prime_contract_id).single();
      const retainage = Number(((approved * Number((pc as any).retainage_pct ?? 0)) / 100).toFixed(2));
      const { data, error } = await supabase
        .from("prime_contract_pay_apps" as any)
        .update({
          status: "approved",
          approved_amount: approved,
          retainage_held: retainage,
          approved_date: new Date().toISOString().slice(0, 10),
        } as any)
        .eq("id", payAppId)
        .select()
        .single();
      if (error) throw error;
      return data as PayApp;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-app", payAppId] }),
  });

  // Per-pay-app balance (billed vs received) from v_pay_app_balances.
  const payAppBalance = useQuery({
    queryKey: ["pay-app-balance", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_pay_app_balances" as any)
        .select("*")
        .eq("pay_app_id", payAppId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  // Record an AR receipt against this pay app (partial allowed; DB guards overpay).
  const recordPayment = useMutation({
    mutationFn: async (input: {
      amount: number; received_date: string;
      method?: string | null; reference?: string | null;
      notes?: string | null; artifact_id?: string | null;
    }) => {
      if (!payAppId || !detail.data) throw new Error("No pay app");
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("prime_contract_payments" as any)
        .insert({
          tenant_id,
          prime_contract_id: detail.data.prime_contract_id,
          pay_app_id: payAppId,
          created_by: user?.id,
          ...input,
        } as any)
        .select()
        .single();
      if (error) {
        if (/OVERPAYMENT/i.test(error.message)) throw new Error("Exceeds the pay app's remaining balance.");
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pay-app", payAppId] });
      qc.invalidateQueries({ queryKey: ["pay-app-balance", payAppId] });
      qc.invalidateQueries({ queryKey: ["prime-contract-payments", payAppId] });
      qc.invalidateQueries({ queryKey: ["project-financials"] });
    },
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!payAppId) throw new Error("No pay app");
      const { data, error } = await supabase
        .from("prime_contract_pay_apps" as any)
        .update({ status: "draft", approved_amount: null, retainage_held: null } as any)
        .eq("id", payAppId)
        .select()
        .single();
      if (error) throw error;
      return data as PayApp;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-app", payAppId] }),
  });

  return { detail, lines, upsertLine, submit, approve, reject, payAppBalance, recordPayment };
}
