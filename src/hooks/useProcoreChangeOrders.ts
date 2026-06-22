/**
 * D4 · Change Orders (PCO/OCO/CCO).
 * Named useProcoreChangeOrders to coexist with pre-existing useChangeOrders.ts.
 */
import { toDateOnly } from "@/lib/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";
import { buildCoPdfBlob } from "@/lib/changeOrder/coPdf";
import { uploadCoArtifact } from "@/lib/changeOrder/storage";
import { coLabel } from "@/lib/changeOrder/coLabel";

export interface ChangeOrder {
  id: string; tenant_id: string; project_id: string;
  co_no: number | null;
  co_type: "PCO"|"OCO"|"CCO"|null;
  prime_contract_id: string | null;
  commitment_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  days_impact: number;
  status: "draft"|"pending"|"out_for_signature"|"executed"|"rejected"|"void";
  reason_code: string | null;
  parent_pco_id: string | null;
  peer_co_id: string | null;
  executed_date: string | null;
}

export interface ChangeOrderLine {
  id: string; change_order_id: string;
  cost_code_id: string; description: string; amount: number;
}

export function useChangeOrdersByType(projectId: string | null, coType: "PCO"|"OCO"|"CCO") {
  return useQuery<ChangeOrder[]>({
    queryKey: ["change-orders", projectId, coType],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_orders" as any).select("*")
        .eq("project_id", projectId!).eq("co_type", coType)
        .order("co_no", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChangeOrder[];
    },
  });
}

export function useChangeOrderLines(coId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<ChangeOrderLine[]>({
    queryKey: ["co-lines", coId],
    enabled: Boolean(coId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("change_order_lines" as any).select("*")
        .eq("change_order_id", coId!);
      if (error) throw error;
      return (data ?? []) as ChangeOrderLine[];
    },
  });

  const addLine = useMutation({
    mutationFn: async (input: { costCodeId: string; description: string; amount: number }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase.from("change_order_lines" as any).insert({
        tenant_id, change_order_id: coId!,
        cost_code_id: input.costCodeId,
        description: input.description,
        amount: input.amount,
      } as any).select().single();
      if (error) throw error;
      return data as ChangeOrderLine;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["co-lines", coId] }),
  });

  return { ...list, addLine };
}

/** Promote a PCO to an OCO once signed by the Owner. */
export function usePromoteToOco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pcoId: string) => {
      const tenant_id = await requireTenantId();
      const { data: pco, error: e1 } = await supabase
        .from("change_orders" as any).select("*").eq("id", pcoId).single();
      if (e1) throw e1;

      const { data: oco, error: e2 } = await supabase.from("change_orders" as any).insert({
        tenant_id,
        project_id: (pco as any).project_id,
        prime_contract_id: (pco as any).prime_contract_id,
        co_type: "OCO",
        title: (pco as any).title,
        description: (pco as any).description,
        amount: (pco as any).amount,
        status: "executed",
        parent_pco_id: pcoId,
        executed_date: toDateOnly(new Date()),
      } as any).select().single();
      if (e2) throw e2;

      // Copy lines
      const { data: lines } = await supabase
        .from("change_order_lines" as any).select("*").eq("change_order_id", pcoId);
      if (Array.isArray(lines) && lines.length > 0) {
        await supabase.from("change_order_lines" as any).insert(
          (lines as any[]).map((l) => ({
            tenant_id,
            change_order_id: (oco as any).id,
            cost_code_id: l.cost_code_id,
            description: l.description,
            amount: l.amount,
          })) as any,
        );
      }

      return oco as ChangeOrder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["change-orders"] }),
  });
}

/**
 * Admin renumber of a change order's co_no — allowed even when the CO is
 * executed/locked (co_no isn't part of the lock guard's protected set). Keeps
 * the CO's status untouched (co_no is a reference label, not money), validates
 * the new number is free for this project+type, and appends an audit entry to
 * co_no_history. Gate the UI to admins.
 */
export function useRenumberChangeOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ coId, newCoNo, reason }: { coId: string; newCoNo: number; reason: string }) => {
      if (!Number.isInteger(newCoNo) || newCoNo <= 0) throw new Error("Enter a positive whole number.");
      if (!reason.trim()) throw new Error("A reason is required.");

      const { data: co, error: e0 } = await supabase
        .from("change_orders" as any)
        .select("co_no, co_type, project_id, co_no_history, spec, locked, submitted_signature_path, accepted_signature_path")
        .eq("id", coId).single();
      if (e0) throw e0;
      const cur = co as any;
      if (Number(cur.co_no) === newCoNo) throw new Error("That is already the current number.");

      const label = coLabel(cur.co_type, newCoNo);
      const { data: clash } = await supabase
        .from("change_orders" as any)
        .select("id").eq("project_id", cur.project_id).eq("co_type", cur.co_type)
        .eq("co_no", newCoNo).neq("id", coId).maybeSingle();
      if (clash) throw new Error(`${label} already exists on this project — pick a free number.`);

      // Rebuild the number everywhere it's embedded in the document spec — this is
      // what the rendered document AND the email subject/body read from.
      const hasSpec = cur.spec && typeof cur.spec === "object" && (cur.spec as any).doc;
      const updatedSpec = hasSpec
        ? { ...cur.spec, doc: { ...(cur.spec as any).doc, co_number: String(newCoNo), co_label: label } }
        : null;

      // Regenerate the branded PDF from the updated spec (keeping signatures) so the
      // attached/linked document shows the new number too. Non-fatal if it fails.
      let newPdfPath: string | null = null;
      if (updatedSpec && cur.project_id) {
        try {
          const blob = await buildCoPdfBlob(updatedSpec as any, {
            submitted: cur.submitted_signature_path, accepted: cur.accepted_signature_path,
          });
          newPdfPath = await uploadCoArtifact(blob, cur.project_id, "change-orders", "pdf");
        } catch { /* keep the existing PDF if regeneration fails */ }
      }

      const { data: auth } = await supabase.auth.getUser();
      const history = Array.isArray(cur.co_no_history) ? cur.co_no_history : [];
      const entry = {
        from: Number(cur.co_no), to: newCoNo,
        by: auth.user?.id ?? null, reason: reason.trim(),
        at: new Date().toISOString(),
      };
      const wasLocked = Boolean(cur.locked);

      // Flip `locked` off in the SAME update so the lock guard permits the spec/pdf
      // change (it only raises when OLD.locked AND NEW.locked are both true), then
      // restore the lock. co_no/co_no_history aren't lock-protected either way.
      const patch: Record<string, unknown> = {
        co_no: newCoNo, co_no_history: [...history, entry], locked: false,
      };
      if (updatedSpec) patch.spec = updatedSpec;
      if (newPdfPath) patch.pdf_path = newPdfPath;

      const { error: e1 } = await supabase
        .from("change_orders" as any).update(patch as any).eq("id", coId);
      if (e1) {
        if (/duplicate key|uniq_co/i.test(e1.message)) {
          throw new Error(`${label} already exists on this project — pick a free number.`);
        }
        throw e1;
      }
      if (wasLocked) {
        const { error: e2 } = await supabase
          .from("change_orders" as any).update({ locked: true } as any).eq("id", coId);
        if (e2) throw e2;
      }
      return { coId, newCoNo, regeneratedPdf: Boolean(newPdfPath), specUpdated: Boolean(updatedSpec) };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["co"] });
      qc.invalidateQueries({ queryKey: ["change-orders"] });
      qc.invalidateQueries({ queryKey: ["procore-change-orders"] });
    },
  });
}
