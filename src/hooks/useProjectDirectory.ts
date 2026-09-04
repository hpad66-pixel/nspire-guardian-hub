import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

// Project-directory external CRM columns land through a forward migration and
// are not present in the checked-in generated database type snapshot yet.
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DirectoryEntry {
  id: string;
  tenant_id: string;
  project_id: string;
  user_id: string | null;
  contact_id: string | null;
  organization_id: string | null;
  role_label: string | null;
  is_key_contact: boolean;
  permission_template_id: string | null;
  apas_contact_id: string | null;
  source_intake_id: string | null;
  external_display_name: string | null;
  external_company_name: string | null;
  external_primary_email: string | null;
  external_contact_url: string | null;
  created_at: string;
}

export function useProjectDirectory(projectId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<DirectoryEntry[]>({
    queryKey: ["project-directory", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_directory_entries" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("is_key_contact", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DirectoryEntry[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: Partial<DirectoryEntry>) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase
        .from("project_directory_entries" as any)
        .insert({ tenant_id, project_id: projectId!, ...input } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DirectoryEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-directory", projectId] });
      qc.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      qc.invalidateQueries({ queryKey: ["project-contact-ids", projectId] });
      qc.invalidateQueries({ queryKey: ["contact-assignments"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_directory_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-directory", projectId] });
      qc.invalidateQueries({ queryKey: ["project-contacts", projectId] });
      qc.invalidateQueries({ queryKey: ["project-contact-ids", projectId] });
      qc.invalidateQueries({ queryKey: ["contact-assignments"] });
    },
  });

  return { ...list, add, remove };
}

export function useOrgTrades(organizationId: string | null) {
  return useQuery({
    queryKey: ["org-trades", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_trades" as any)
        .select("cost_code_id")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}
