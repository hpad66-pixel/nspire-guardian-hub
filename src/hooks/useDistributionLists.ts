import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface DistributionList {
  id: string;
  tenant_id: string;
  workspace_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  scope: "tenant" | "workspace" | "project";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistributionListMember {
  id: string;
  list_id: string;
  user_id: string | null;
  contact_id: string | null;
  email_override: string | null;
  role_label: string | null;
}

export function useDistributionLists(opts?: { projectId?: string | null }) {
  const qc = useQueryClient();

  const list = useQuery<DistributionList[]>({
    queryKey: ["distribution-lists", opts?.projectId ?? null],
    queryFn: async () => {
      let q = supabase.from("distribution_lists" as any).select("*").order("name");
      if (opts?.projectId) {
        q = q.or(`project_id.eq.${opts.projectId},scope.neq.project`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DistributionList[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      scope: DistributionList["scope"];
      projectId?: string;
      workspaceId?: string;
    }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase
        .from("distribution_lists" as any)
        .insert({
          tenant_id,
          name: input.name,
          description: input.description ?? null,
          scope: input.scope,
          project_id: input.projectId ?? null,
          workspace_id: input.workspaceId ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as DistributionList;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["distribution-lists"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("distribution_lists" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["distribution-lists"] }),
  });

  return { ...list, create, remove };
}

export function useDistributionListMembers(listId: string | null) {
  const qc = useQueryClient();
  const list = useQuery<DistributionListMember[]>({
    queryKey: ["distribution-list-members", listId],
    enabled: Boolean(listId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_list_members" as any)
        .select("*")
        .eq("list_id", listId!);
      if (error) throw error;
      return (data ?? []) as DistributionListMember[];
    },
  });

  const addMember = useMutation({
    mutationFn: async (input: Partial<DistributionListMember> & { list_id?: string }) => {
      if (!listId) throw new Error("No list selected");
      const { data, error } = await supabase
        .from("distribution_list_members" as any)
        .insert({ list_id: listId, ...input } as any)
        .select()
        .single();
      if (error) throw error;
      return data as DistributionListMember;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["distribution-list-members", listId] }),
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("distribution_list_members" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["distribution-list-members", listId] }),
  });

  return { ...list, addMember, removeMember };
}
