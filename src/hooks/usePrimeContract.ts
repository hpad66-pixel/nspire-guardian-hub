/**
 * D1 · Prime Contract hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface PrimeContract {
  id: string; tenant_id: string; project_id: string;
  contract_no: string; title: string;
  owner_org_id: string | null; gc_org_id: string | null;
  executed_date: string | null;
  original_value: number;
  status: "draft"|"out_for_signature"|"executed"|"closed"|"terminated";
  retainage_pct: number;
  workflow_instance_id: string | null;
  // Contract metadata (added 20260618150000)
  contractor_name: string | null; contractor_address: string | null;
  contractor_contact: string | null; contractor_email: string | null;
  owner_name: string | null; owner_address: string | null;
  owner_contact: string | null; owner_email: string | null;
  architect_name: string | null; project_address: string | null;
  docusign_envelope_id: string | null; artifact_id: string | null;
  contract_date: string | null; start_date: string | null;
  substantial_completion_date: string | null; final_completion_date: string | null;
  actual_completion_date: string | null; signed_contract_received_date: string | null;
  scope_description: string | null; inclusions: string | null;
  exclusions: string | null; special_conditions: string | null;
  mobilization_advance: number | null; liquidated_damages_per_day: number | null;
  retainage_release_substantial: number | null; retainage_release_final: number | null;
  retainage_warranty_months: number | null; payment_cycle_days: number | null;
  payment_due_within_days: number | null;
  // Schedule-of-Values finalize/lock (20260722120200). When sov_finalized_at is
  // set, the base SOV lines are immutable (see guard_base_sov_line_locked).
  sov_finalized_at: string | null; sov_finalized_by: string | null;
  created_at: string; updated_at: string;
}

export interface PrimeContractSovLine {
  id: string; prime_contract_id: string; line_no: number;
  cost_code_id: string; description: string; scheduled_value: number;
}

export interface PrimeContractTotals {
  prime_contract_id: string;
  original_value: number;
  executed_co_value: number;
  revised_contract_value: number;
  billed_to_date: number;
}

export function usePrimeContract(projectId: string | null) {
  const qc = useQueryClient();

  const one = useQuery<PrimeContract | null>({
    queryKey: ["prime-contract", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contracts" as any).select("*")
        .eq("project_id", projectId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PrimeContract | null;
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<PrimeContract> & { contract_no: string; title: string; original_value: number }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("prime_contracts" as any).insert({
        tenant_id, project_id: projectId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as PrimeContract;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prime-contract", projectId] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<PrimeContract> & { id: string }) => {
      const { data, error } = await supabase
        .from("prime_contracts" as any).update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as PrimeContract;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prime-contract", projectId] }),
  });

  // Finalize the Schedule of Values → base lines lock (DB trigger). Unlock reverses
  // it so an admin can revise, then re-finalize. Refresh the pay-app SOV too so the
  // builder reflects the lock state.
  const finalizeSov = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("prime_contracts" as any)
        .update({ sov_finalized_at: new Date().toISOString(), sov_finalized_by: u?.user?.id ?? null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prime-contract", projectId] });
      qc.invalidateQueries({ queryKey: ["pay-app-continuation", "sov"] });
    },
  });

  const unlockSov = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("prime_contracts" as any)
        .update({ sov_finalized_at: null, sov_finalized_by: null } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prime-contract", projectId] }),
  });

  return { ...one, create, update, finalizeSov, unlockSov };
}

export function usePrimeContractSov(primeContractId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<PrimeContractSovLine[]>({
    queryKey: ["prime-contract-sov", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      // The unified schedule of values lives in sov_line_items. The legacy
      // prime_contract_sov_lines table is empty. Read the BASE lines (the original
      // SOV); folded-in change-order lines are tracked separately in the Change
      // Orders tab, so excluding them here avoids double-counting. item_no/sort_order
      // → line_no.
      const { data, error } = await supabase
        .from("sov_line_items" as any).select("*")
        .eq("prime_contract_id", primeContractId!).eq("kind", "base").order("sort_order");
      if (error) throw error;
      return ((data ?? []) as any[]).map((r, i) => ({
        id: r.id,
        prime_contract_id: r.prime_contract_id,
        line_no: Number(r.item_no) || (r.sort_order ?? i) + 1,
        cost_code_id: r.cost_code_id ?? "",
        description: r.description ?? "",
        scheduled_value: Number(r.scheduled_value ?? 0),
      })) as PrimeContractSovLine[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (input: Omit<PrimeContractSovLine, "id" | "prime_contract_id">) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("prime_contract_sov_lines" as any).insert({
        tenant_id, prime_contract_id: primeContractId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data as unknown as PrimeContractSovLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prime-contract-sov", primeContractId] }),
  });

  return { ...list, addLine };
}

export function usePrimeContractTotals(primeContractId: string | null) {
  return useQuery<PrimeContractTotals | null>({
    queryKey: ["prime-contract-totals", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_totals" as any).select("*")
        .eq("prime_contract_id", primeContractId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PrimeContractTotals | null;
    },
  });
}

export function usePayApps(primeContractId: string | null) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["pay-apps", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_pay_apps" as any).select("*")
        .eq("prime_contract_id", primeContractId!).order("pay_app_no", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { pay_app_no: number; period_end: string }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("prime_contract_pay_apps" as any).insert({
        tenant_id, prime_contract_id: primeContractId!, ...input,
      } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-apps", primeContractId] }),
  });

  return { ...list, create };
}
