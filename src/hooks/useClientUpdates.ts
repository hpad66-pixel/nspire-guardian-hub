/**
 * useClientUpdates — the GC's periodic client briefings (status, accomplishments,
 * risks, decisions, action items, next steps + an optional financial statement).
 * GC reads all; the owner portal reads published only (publishedOnly).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export type Health = "on_track" | "at_risk" | "delayed";
export interface RiskItem { text: string; severity: "low" | "medium" | "high"; }
export interface DecisionItem { text: string; status: "needed" | "made"; }
export interface ActionItem { text: string; owner: string; done: boolean; }

export interface ClientUpdate {
  id: string;
  tenant_id: string;
  project_id: string;
  title: string;
  period_label: string | null;
  health: Health;
  summary: string | null;
  accomplishments: string[];
  risks: RiskItem[];
  decisions: DecisionItem[];
  action_items: ActionItem[];
  next_steps: string[];
  statement_pdf_path: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientUpdateDraft = Partial<Omit<ClientUpdate, "id" | "tenant_id" | "created_at" | "updated_at">>;

export function useClientUpdates(projectId: string | null, opts: { publishedOnly?: boolean } = {}) {
  const qc = useQueryClient();
  const key = ["client-updates", projectId, opts.publishedOnly ? "published" : "all"];

  const list = useQuery<ClientUpdate[]>({
    queryKey: key,
    enabled: Boolean(projectId),
    queryFn: async () => {
      let q = supabase.from("client_updates" as any).select("*").eq("project_id", projectId!);
      if (opts.publishedOnly) q = q.eq("status", "published");
      const { data, error } = await q.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ClientUpdate[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["client-updates", projectId, "all"] });
    qc.invalidateQueries({ queryKey: ["client-updates", projectId, "published"] });
  };

  const create = useMutation({
    mutationFn: async (draft: ClientUpdateDraft) => {
      if (!projectId) throw new Error("No project");
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error("No workspace for current user");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("client_updates" as any)
        .insert({ tenant_id, project_id: projectId, title: draft.title ?? "Project update", ...draft, created_by: user?.id } as any)
        .select().single();
      if (error) throw error;
      return data as unknown as ClientUpdate;
    },
    onSuccess: invalidate,
  });

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ClientUpdateDraft }) => {
      const { error } = await supabase.from("client_updates" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      const { error } = await supabase.from("client_updates" as any)
        .update({ status, published_at: status === "published" ? new Date().toISOString() : null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_updates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { ...list, create, save, setStatus, remove };
}
