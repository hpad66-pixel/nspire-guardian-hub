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
  retainage_pct: number | null; // per-line override; null = use contract default
}
interface ProgressRow {
  sov_line_item_id: string; qty_to_date: number; value_to_date: number;
  pct_complete: number; qty_this_period: number; value_this_period: number; retainage: number;
}

/**
 * Sync executed/approved prime COs into the SOV: create a line for any CO that
 * lacks one, AND refresh the description (= the CO title) on lines that already
 * exist — so loading approved change orders always shows their current title,
 * even for CO lines that came from an imported pay-app G703.
 */
async function loadApprovedCosInner(
  primeContractId: string, projectId: string,
): Promise<{ inserted: number; updated: number }> {
  const tenant_id = await requireTenantId();
  // Every approved/executed OWNER-side change order on the project — i.e. NOT a
  // sub CCO (those carry commitment_id). We match by project_id and accept COs
  // whose prime_contract_id is this contract OR null (imported/seeded COs are
  // often not linked to the prime_contracts row), REGARDLESS of co_type. The old
  // `prime_contract_id = X AND co_type = 'PCO'` filter silently skipped owner COs
  // typed 'OCO' and imported COs with a null co_type / null prime_contract_id, so
  // the SOV net-change came up short and "Load approved change orders" no-op'd.
  const { data: cos, error: coErr } = await supabase
    .from("change_orders" as any)
    .select("id, co_no, title, description, amount, status, prime_contract_id")
    .eq("project_id", projectId)
    .is("commitment_id", null)
    .in("status", APPROVED_CO_STATUSES)
    .or(`prime_contract_id.eq.${primeContractId},prime_contract_id.is.null`);
  if (coErr) throw coErr;

  // Backfill the prime_contract link on owner COs that were imported/seeded
  // without one. The roll-up views (v_project_financial_summary.approved_co_value,
  // prime_contract_totals) count COs by `prime_contract_id IS NOT NULL`, so an
  // unlinked CO is billed on the pay app but MISSING from the overview dashboard's
  // "Approved Change Orders" / "Revised Contract". Linking it here makes the
  // dashboard, the invoices, and the CO list all count the same set.
  const toLink = (cos ?? []).filter((c: any) => !c.prime_contract_id).map((c: any) => c.id);
  if (toLink.length) {
    const { error: linkErr } = await supabase
      .from("change_orders" as any)
      .update({ prime_contract_id: primeContractId } as any)
      .in("id", toLink);
    if (linkErr) throw linkErr;
  }

  const { data: existing, error: exErr } = await supabase
    .from("sov_line_items" as any)
    .select("id, item_no, change_order_id, sort_order, description, scheduled_value")
    .eq("prime_contract_id", primeContractId);
  if (exErr) throw exErr;

  const lineByCoId = new Map<string, any>(
    (existing ?? []).filter((r: any) => r.change_order_id).map((r: any) => [r.change_order_id, r]),
  );

  // Re-sync existing CO lines to the CO's CURRENT title AND amount — so a CO that
  // was amended, corrected, or re-imported after its SOV line was created gets its
  // scheduled value refreshed (previously only the title was updated, which left a
  // stale amount making the net-change never reconcile even after "Load").
  let updated = 0;
  for (const co of (cos ?? []) as any[]) {
    const line = lineByCoId.get(co.id);
    if (!line) continue;
    const synced = coToSovLine(
      { id: co.id, co_no: co.co_no, title: co.title, description: co.description, amount: Number(co.amount) },
      { sortOrder: Number(line.sort_order ?? 0), itemNo: String(line.item_no) },
    );
    const titleChanged = line.description !== synced.description;
    const amountChanged = round2(Number(line.scheduled_value ?? 0)) !== round2(synced.scheduled_value);
    if (titleChanged || amountChanged) {
      const { error: upErr } = await supabase
        .from("sov_line_items" as any)
        .update({
          description: synced.description,
          scheduled_qty: synced.scheduled_qty,
          unit_price: synced.unit_price,
          scheduled_value: synced.scheduled_value,
        } as any)
        .eq("id", line.id);
      if (upErr) throw upErr;
      updated += 1;
    }
  }

  // Create lines for COs that don't have one yet.
  const missing = (cos ?? []).filter((c: any) => !lineByCoId.has(c.id));
  if (missing.length === 0) return { inserted: 0, updated };

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
  return { inserted: rows.length, updated };
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

/**
 * The approved change-order value for a prime contract — the SAME definition the
 * financial roll-up view (v_project_financial_summary.approved_co_value) uses:
 * every prime-side CO (prime_contract_id set, not a sub CCO) that is
 * approved/executed. Used to reconcile the pay-app SOV net-change against the
 * dashboard so a CO that hasn't been loaded into the SOV shows up as a delta.
 */
export function useApprovedCoValue(primeContractId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ["approved-co-value", primeContractId, projectId],
    enabled: Boolean(primeContractId) && Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders" as any)
        .select("amount")
        .eq("project_id", projectId!)
        .is("commitment_id", null)
        .in("status", APPROVED_CO_STATUSES)
        .or(`prime_contract_id.eq.${primeContractId},prime_contract_id.is.null`);
      if (error) throw error;
      return round2((data ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0));
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
      const payAppsRows = (payApps ?? []) as unknown as { id: string; pay_app_no: number }[];
      const nextNo = (payAppsRows[0]?.pay_app_no ?? 0) + 1;
      const priorPayAppId = payAppsRows[0]?.id ?? null;

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
  scheduled_qty: number; unit_price: number; scheduled_value: number;
  prior_value_to_date: number; prior_qty_to_date: number;
  qty_this_period: number; value_this_period: number;
  value_to_date: number; qty_to_date: number; pct_complete: number; retainage: number;
  retainage_pct: number | null; // per-line override (null = contract default)
  retainage_exempt: boolean;    // true when the line holds no retainage (override = 0)
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
      return (data ?? []) as unknown as SovLineRow[];
    },
  });

  const thisProgress = useQuery<ProgressRow[]>({
    queryKey: ["pay-app-continuation", "progress", payAppId],
    enabled: Boolean(payAppId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pay_app_line_progress" as any).select("*").eq("pay_app_id", payAppId!);
      if (error) throw error;
      return (data ?? []) as unknown as ProgressRow[];
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
      const priorsRows = (priors ?? []) as unknown as { id: string; pay_app_no: number }[];
      const priorId = priorsRows[0]?.id ?? null;
      if (!priorId) return { progress: [], earnedLessRetainage: 0 };
      const { data: pp } = await supabase
        .from("pay_app_line_progress" as any)
        .select("sov_line_item_id, qty_to_date, value_to_date, pct_complete, qty_this_period, value_this_period, retainage")
        .eq("pay_app_id", priorId);
      const rows = (pp ?? []) as unknown as ProgressRow[];
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
        scheduled_qty: Number(li.scheduled_qty), unit_price: Number(li.unit_price),
        scheduled_value: Number(li.scheduled_value),
        prior_value_to_date: pr ? Number(pr.value_to_date) : 0,
        prior_qty_to_date: pr ? Number(pr.qty_to_date) : 0,
        qty_this_period: cur ? Number(cur.qty_this_period) : 0,
        value_this_period: cur ? Number(cur.value_this_period) : 0,
        value_to_date: cur ? Number(cur.value_to_date) : pr ? Number(pr.value_to_date) : 0,
        qty_to_date: cur ? Number(cur.qty_to_date) : pr ? Number(pr.qty_to_date) : 0,
        pct_complete: cur ? Number(cur.pct_complete) : 0,
        retainage: cur ? Number(cur.retainage) : 0,
        retainage_pct: li.retainage_pct == null ? null : Number(li.retainage_pct),
        retainage_exempt: li.retainage_pct != null && Number(li.retainage_pct) === 0,
      };
    });
  }, [sov.data, thisProgress.data, priorByLineId]);

  const liveG702: G702Summary = useMemo(
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

  // Once a pay app leaves "draft" it's a submitted certificate — a fixed legal
  // record. Serve the snapshot frozen at submission (pay_app_data) instead of
  // recomputing live, so later change orders / progress don't rewrite a document
  // the client already received. New work flows into the next pay app.
  const status = (detail.data as any)?.status as string | undefined;
  const isFrozen = Boolean(status && status !== "draft");
  const snapshot = (detail.data as any)?.pay_app_data as G702Summary | null | undefined;
  const g702: G702Summary = isFrozen && snapshot && typeof snapshot.contract_sum_to_date === "number"
    ? snapshot
    : liveG702;

  const upsertLine = useMutation({
    mutationFn: async (input: {
      sov_line_item_id: string; scheduled_value: number;
      qty_this_period: number; value_this_period: number;
    }) => {
      if (!payAppId) throw new Error("No pay app");
      const tenant_id = await requireTenantId();
      const pr = priorByLineId[input.sov_line_item_id];
      // Per-line retainage: a line's override (e.g. 0 for a PM fee) wins over the
      // contract default.
      const sovLine = (sov.data ?? []).find((l) => l.id === input.sov_line_item_id);
      const effPct = sovLine?.retainage_pct == null ? retainagePct : Number(sovLine.retainage_pct);
      const td = computeLineToDate({
        scheduledValue: input.scheduled_value,
        priorValueToDate: pr ? Number(pr.value_to_date) : 0,
        priorQtyToDate: pr ? Number(pr.qty_to_date) : 0,
        valueThisPeriod: Number(input.value_this_period) || 0,
        qtyThisPeriod: Number(input.qty_this_period) || 0,
        retainagePct: effPct,
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

  // Toggle retainage on a line (e.g. exempt a PM fee). Sets the SOV line's
  // retainage_pct override (0 = no retainage, null = contract default) and
  // recomputes this pay app's retainage on that line. Prior pay apps' certified
  // retainage is historical and untouched.
  const setLineRetainage = useMutation({
    mutationFn: async ({ sovLineItemId, exempt }: { sovLineItemId: string; exempt: boolean }) => {
      const override = exempt ? 0 : null; // null → use contract default
      const { error: e1 } = await supabase
        .from("sov_line_items" as any).update({ retainage_pct: override } as any).eq("id", sovLineItemId);
      if (e1) throw e1;
      const line = lines.find((l) => l.sov_line_item_id === sovLineItemId);
      if (payAppId && line) {
        const effPct = exempt ? 0 : retainagePct;
        const retainage = round2(line.value_to_date * (effPct / 100));
        const { error: e2 } = await supabase
          .from("pay_app_line_progress" as any)
          .update({ retainage } as any)
          .eq("pay_app_id", payAppId).eq("sov_line_item_id", sovLineItemId);
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pay-app-continuation", "sov", primeContractId] });
      qc.invalidateQueries({ queryKey: ["pay-app-continuation", "progress", payAppId] });
    },
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
    detail, contract, lines, g702, retainagePct, isFrozen,
    isLoading: detail.isLoading || sov.isLoading || thisProgress.isLoading,
    upsertLine, submit, setLineRetainage,
    refetch: () => {
      thisProgress.refetch(); sov.refetch(); detail.refetch();
    },
  };
}
