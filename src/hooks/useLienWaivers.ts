import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";
import { waiverTitle } from "@/lib/lienWaiver/templates";
import type { LienWaiverSpec } from "@/lib/lienWaiver/types";

const toIsoDate = (s?: string) => {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? s + "T00:00:00" : s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};
const parseAmount = (s?: string) => {
  const n = parseFloat(String(s ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export function useLienWaivers(projectId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lien-waivers", projectId] });
    qc.invalidateQueries({ queryKey: ["lien-releases", projectId] });
  };

  const list = useQuery({
    queryKey: ["lien-waivers", projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lien_releases" as any).select("*").eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const create = useMutation({
    mutationFn: async ({ spec, pdf_path }: { spec: LienWaiverSpec; pdf_path?: string | null }) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const row = {
        tenant_id, project_id: projectId, direction: "inbound", release_type: spec.type,
        through_date: toIsoDate(spec.payment.through_date), amount: parseAmount(spec.payment.amount),
        status: "pending", spec, waiver_no: spec.doc.waiver_no || null, title: waiverTitle(spec.type),
        claimant_name: spec.parties.claimant.name || null, claimant_email: spec.parties.claimant.email || null,
        pdf_path: pdf_path ?? null, created_by: user?.id ?? null,
      };
      const { data, error } = await supabase.from("lien_releases" as any).insert(row as any).select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { data, error } = await supabase.from("lien_releases" as any).update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: invalidate,
  });

  return { ...list, create, update, invalidate };
}

export function useLienWaiver(id: string | null) {
  return useQuery({
    queryKey: ["lien-waiver", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("lien_releases" as any).select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as any;
    },
  });
}
