/**
 * Prime-contract pay-app continuation hooks (G702/G703) on the
 * sov_line_items / pay_app_line_progress schema — the same tables the imported
 * pay apps (1–4) and the Quantities dashboard use.
 *
 *  - useLoadApprovedCos: create SOV lines for executed/approved PCOs lacking one.
 *  - useGeneratePayApp: load COs, create the next pay app, seed each line's
 *    to-date carried forward from the prior pay app.
 *  - usePayAppContinuation: read the merged continuation sheet for a pay app,
 *    edit "this period" per line, and compute the live G702 cover.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import {
  coToSovLine,
  computeLineToDate,
  computeG702,
  seedContinuationRows,
  round2,
  type G702Summary,
  type PriorProgressLike,
} from "@/lib/financial/payAppContinuation";

const APPROVED_CO_STATUSES = ["executed", "approved"];

interface SovLineRow {
  id: string; item_no: string; kind: "base" | "change_order";
  change_order_id: string | null; description: string; unit: string | null;
  scheduled_qty: number; unit_price: number; scheduled_value: number; sort_order: number;
}
interface ProgressRow {
  sov_line_item_id: string; qty_to_date: number; value_to_date: number;
  pct_complete: number; qty_this_period: number; value_this_period: number; retainage: number;
}

/** Create sov_line_items for executed/approved prime COs that don't have one yet. */
async function loadApprovedCosInner(primeContractId: string, projectId: string): Promise<number> {
  const tenant_id = await requireTenantId();
  const { data: cos, error: coErr } = await supabase
    .from("change_orders" as any)
    .select("id, co_no, title, description, amount, status")
    .eq("prime_contract_id", primeContractId)
    .eq("co_type", "PCO")
    .in("status", APPROVED_CO_STATUSES);
  if (coErr) throw coErr;

  const { data: existing, error: exErr } = await supabase
    .from("sov_line_items" as any)
    .select("item_no, change_order_id, sort_order")
    .eq("prime_contract_id", primeContractId);
  if (exErr) throw exErr;

  const linkedCoIds = new Set((existing ?? []).map((r: any) => r.change_order_id).filter(Boolean));
  const missing = (cos ?? []).filter((c: any) => !linkedCoIds.has(c.id));
  if (missing.length === 0) return 0;

  let nextItemNo = (existing ?? []).reduce((m: number, r: any) => {
    const n = parseInt(String(r.item_no), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  let nextSort = (existing ?? []).reduce((m: number, r: any) => Math.max(m, Number(r.sort_order ?? 0)), 0);

  const rows = missing.map((co: any) => {
    nextItemNo += 1; nextSort += 1;
    return {
      tenant_id, project_id: projectId, prime_contract_id: primeContractId,
      ...coToSovLine(
        { id: co.id, co_no: co.co_no, title: co.title, description: co.description, amount: Number(co.amount) },
        { sortOrder: nextSort, itemNo: String(nextItemNo) },
      ),
    };
  });
  const { error: insErr } = await supabase.from("sov_line_items" as any).insert(rows as any);
  if (insErr) throw insErr;
  return rows.length;
}

export function useLoadApprovedCos(primeContractId: string | null, projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!primeContractId || !projectId) throw new Error("Missing contract/project");
      return loadApprovedCosInner(primeContractId, projectId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sov-progress"] });
      qc.invalidateQueries({ queryKey: ["pay-app-continuation"] });
    },
  });
}

export function useGeneratePayApp(primeContractId: string | null, projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input?: { period_end?: string }) => {
      if (!primeContractId || !projectId) throw new Error("Missing contract/project");
      const tenant_id = await requireTenantId();

      // 1. Pull every approved CO into the SOV first.
      await loadApprovedCosInner(primeContractId, projectId);

      // 2. Determine the next pay-app number + the prior pay app (carry-forward source).
      const { data: payApps, error: paErr } = await supabase
        .from("prime_contract_pay_apps" as any)
        .select("id, pay_app_no")
        .eq("prime_contract_id", primeContractId)
        .order("pay_app_no", { ascending: false });
      if (paErr) throw paErr;
      const nextNo = ((payApps ?? [])[0]?.pay_app_no ?? 0) + 1;
      const priorPayAppId = (payApps ?? [])[0]?.id ?? null;

      // 3. Create the new draft pay app.
      const { data: created, error: createErr } = await supabase
        .from("prime_contract_pay_apps" as any)
        .insert({
          tenant_id, prime_contract_id: primeContractId,
          pay_app_no: nextNo, period_end: input?.period_end ?? new Date().toISOString().slice(0, 10),
          status: "draft",
        } as any)
        .select("id")
        .single();
      if (createErr) throw createErr;
      const payAppId = (created as any).id as string;

      // 4. Seed a progress row per SOV line, carrying forward prior to-date.
      const { data: sovLines, error: sovErr } = await supabase
        .from("sov_line_items" as any)
        .select("id, scheduled_value")
        .eq("prime_contract_id", primeContractId);
      if (sovErr) throw sovErr;

      let priorByLineId: Record<string, PriorProgressLike | undefined> = {};
      if (priorPayAppId) {
        const { data: prior } = await supabase
          .from("pay_app_line_progress" as any)
          .select("sov_line_item_id, value_to_date, qty_to_date, retainage")
          .eq("pay_app_id", priorPayAppId);
        for (const p of (prior ?? []) as any[]) priorByLineId[p.sov_line_item_id] = p;
      }

      const rows = seedContinuationRows({
        payAppId, tenantId: tenant_id,
        sovLines: (sovLines ?? []).map((l: any) => ({ id: l.id, scheduled_value: Number(l.scheduled_value) })),
        priorByLineId,
      });
      if (rows.length > 0) {
        const { error: seedErr } = await supabase.from("pay_app_line_progress" as any).insert(rows as any);
        if (seedErr) throw seedErr;
      }
      return { payAppId, payAppNo: nextNo, lineCount: rows.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pay-apps", primeContractId] });
    },
  });
}

export interface ContinuationLine {
  sov_line_item_id: string; item_no: string; kind: "base" | "change_order";
  description: string; unit: string | null;
  scheduled_qty: number; scheduled_value: number;
  prior_value_to_date: number; prior_qty_to_date: number;
  qty_this_period: number; value_this_period: number;
  value_to_date: number; qty_to_date: number; pct_complete: number; retainage: number;
}

export function usePayAppContinuation(payAppId: string | null) {
  const qc = useQueryClient();

  const detail = useQuery<any>({
    queryKey: ["pay-app-continuation", "detail", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contract_pay_apps" as any)
        .select("*").eq("id", payAppId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const primeContractId = detail.data?.prime_contract_id ?? null;
  const payAppNo = detail.data?.pay_app_no ?? null;

  const contract = useQuery<any>({
    queryKey: ["pay-app-continuation", "contract", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prime_contracts" as any)
        .select("original_value, retainage_pct").eq("id", primeContractId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sov = useQuery<SovLineRow[]>({
    queryKey: ["pay-app-continuation", "sov", primeContractId],
    enabled: Boolean(primeContractId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sov_line_items" as any).select("*")
        .eq("prime_contract_id", primeContractId!).order("sort_order");
      if (error) throw error;
      return (data ?? []) as SovLineRow[];
    },
  });

  const thisProgress = useQuery<ProgressRow[]>({
    queryKey: ["pay-app-continuation", "progress", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pay_app_line_progress" as any).select("*").eq("pay_app_id", payAppId!);
      if (error) throw error;
      return (data ?? []) as ProgressRow[];
    },
  });

  // Prior pay app (max pay_app_no < this) → the carry-forward baseline.
  const prior = useQuery<{ progress: ProgressRow[]; earnedLessRetainage: number }>({
    queryKey: ["pay-app-continuation", "prior", primeContractId, payAppNo],
    enabled: Boolean(primeContractId) && payAppNo != null,
    queryFn: async () => {
      const { data: priors } = await supabase
        .from("prime_contract_pay_apps" as any)
        .select("id, pay_app_no").eq("prime_contract_id", primeContractId!)
        .lt("pay_app_no", payAppNo!).order("pay_app_no", { ascending: false }).limit(1);
      const priorId = (priors ?? [])[0]?.id ?? null;
      if (!priorId) return { progress: [], earnedLessRetainage: 0 };
      const { data: pp } = await supabase
        .from("pay_app_line_progress" as any)
        .select("sov_line_item_id, qty_to_date, value_to_date, pct_complete, qty_this_period, value_this_period, retainage")
        .eq("pay_app_id", priorId);
      const rows = (pp ?? []) as ProgressRow[];
      const earned = round2(
        rows.reduce((s, r) => s + Number(r.value_to_date) - Number(r.retainage), 0),
      );
      return { progress: rows, earnedLessRetainage: earned };
    },
  });

  const retainagePct = Number(contract.data?.retainage_pct ?? 0);
  const priorByLineId = useMemo(() => {
    const m: Record<string, ProgressRow> = {};
    for (const p of prior.data?.progress ?? []) m[p.sov_line_item_id] = p;
    return m;
  }, [prior.data]);

  const lines = useMemo<ContinuationLine[]>(() => {
    const progByLine: Record<string, ProgressRow> = {};
    for (const p of thisProgress.data ?? []) progByLine[p.sov_line_item_id] = p;
    return (sov.data ?? []).map((li) => {
      const pr = priorByLineId[li.id];
      const cur = progByLine[li.id];
      return {
        sov_line_item_id: li.id, item_no: li.item_no, kind: li.kind,
        description: li.description, unit: li.unit,
        scheduled_qty: Number(li.scheduled_qty), scheduled_value: Number(li.scheduled_value),
        prior_value_to_date: pr ? Number(pr.value_to_date) : 0,
        prior_qty_to_date: pr ? Number(pr.qty_to_date) : 0,
        qty_this_period: cur ? Number(cur.qty_this_period) : 0,
        value_this_period: cur ? Number(cur.value_this_period) : 0,
        value_to_date: cur ? Number(cur.value_to_date) : pr ? Number(pr.value_to_date) : 0,
        qty_to_date: cur ? Number(cur.qty_to_date) : pr ? Number(pr.qty_to_date) : 0,
        pct_complete: cur ? Number(cur.pct_complete) : 0,
        retainage: cur ? Number(cur.retainage) : 0,
      };
    });
  }, [sov.data, thisProgress.data, priorByLineId]);

  const g702: G702Summary = useMemo(
    () =>
      computeG702({
        originalContractSum: Number(contract.data?.original_value ?? 0),
        previousCertificates: prior.data?.earnedLessRetainage ?? 0,
        lines: lines.map((l) => ({
          kind: l.kind, scheduled_value: l.scheduled_value,
          value_to_date: l.value_to_date, retainage: l.retainage,
        })),
      }),
    [contract.data, prior.data, lines],
  );

  const upsertLine = useMutation({
    mutationFn: async (input: {
      sov_line_item_id: string; scheduled_value: number;
      qty_this_period: number; value_this_period: number;
    }) => {
      if (!payAppId) throw new Error("No pay app");
      const tenant_id = await requireTenantId();
      const pr = priorByLineId[input.sov_line_item_id];
      const td = computeLineToDate({
        scheduledValue: input.scheduled_value,
        priorValueToDate: pr ? Number(pr.value_to_date) : 0,
        priorQtyToDate: pr ? Number(pr.qty_to_date) : 0,
        valueThisPeriod: Number(input.value_this_period) || 0,
        qtyThisPeriod: Number(input.qty_this_period) || 0,
        retainagePct,
      });
      const { error } = await supabase.from("pay_app_line_progress" as any).upsert(
        {
          tenant_id, pay_app_id: payAppId, sov_line_item_id: input.sov_line_item_id,
          qty_this_period: Number(input.qty_this_period) || 0,
          value_this_period: Number(input.value_this_period) || 0,
          ...td,
        } as any,
        { onConflict: "pay_app_id,sov_line_item_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-app-continuation", "progress", payAppId] }),
  });

  // Persist the computed G702 cover + submitted amount and move to "submitted".
  const submit = useMutation({
    mutationFn: async () => {
      if (!payAppId) throw new Error("No pay app");
      const { error } = await supabase
        .from("prime_contract_pay_apps" as any)
        .update({
          status: "submitted",
          submitted_amount: g702.current_payment_due,
          pay_app_data: g702 as any,
        } as any)
        .eq("id", payAppId);
      if (error) throw error;
    },
    onSuccess: () => {
      detail.refetch();
      qc.invalidateQueries({ queryKey: ["pay-apps"] });
    },
  });

  return {
    detail, contract, lines, g702, retainagePct,
    isLoading: detail.isLoading || sov.isLoading || thisProgress.isLoading,
    upsertLine, submit,
    refetch: () => {
      thisProgress.refetch(); sov.refetch(); detail.refetch();
    },
  };
}
