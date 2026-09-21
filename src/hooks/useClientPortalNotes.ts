import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveCurrentWorkspaceId } from "@/lib/tenant";

export interface ClientPortalNote {
  id: string;
  tenant_id: string;
  project_id: string;
  author_id: string;
  author_email: string | null;
  body: string;
  created_at: string;
}

export function useClientPortalNotes(projectId: string | null) {
  const qc = useQueryClient();
  const queryKey = ["client-portal-notes", projectId];

  const list = useQuery<ClientPortalNote[]>({
    queryKey,
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_portal_notes" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as ClientPortalNote[];
    },
  });

  const create = useMutation({
    mutationFn: async (body: string) => {
      if (!projectId) throw new Error("No project selected");
      const value = body.trim();
      if (!value) throw new Error("Write a note first.");
      const tenantId = await resolveCurrentWorkspaceId();
      if (!tenantId) throw new Error("No workspace for current user");
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Sign in before sending a note.");

      const { data, error } = await supabase
        .from("client_portal_notes" as any)
        .insert({
          tenant_id: tenantId,
          project_id: projectId,
          author_id: user.id,
          author_email: user.email ?? null,
          body: value,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ClientPortalNote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
    },
  });

  return { ...list, create };
}
