/**
 * A2 · Permission Templates CRUD hooks.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface PermissionTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  cloned_from: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionTemplateGrant {
  id: string;
  template_id: string;
  module: string;
  action: string;
  level: "none" | "read" | "standard" | "admin";
}

export function usePermissionTemplates() {
  const qc = useQueryClient();

  const list = useQuery<PermissionTemplate[]>({
    queryKey: ["permission-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_templates" as any)
        .select("*")
        .order("is_system", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PermissionTemplate[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; description?: string; clonedFrom?: string }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase
        .from("permission_templates" as any)
        .insert({
          tenant_id,
          name: input.name,
          description: input.description ?? null,
          cloned_from: input.clonedFrom ?? null,
          is_system: false,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // If cloning, copy grants too.
      if (input.clonedFrom) {
        const { data: srcGrants } = await supabase
          .from("permission_template_grants" as any)
          .select("module, action, level")
          .eq("template_id", input.clonedFrom);
        if (srcGrants && srcGrants.length > 0) {
          await supabase.from("permission_template_grants" as any).insert(
            (srcGrants as any[]).map((g) => ({
              template_id: (data as any).id,
              module: g.module,
              action: g.action,
              level: g.level,
            })) as any,
          );
        }
      }
      return data as unknown as PermissionTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permission-templates"] }),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string }) => {
      const { data, error } = await supabase
        .from("permission_templates" as any)
        .update({ name: input.name, description: input.description } as any)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PermissionTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permission-templates"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("permission_templates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permission-templates"] }),
  });

  return { ...list, create, update, remove };
}

export function useTemplateGrants(templateId: string | null) {
  const qc = useQueryClient();

  const list = useQuery<PermissionTemplateGrant[]>({
    queryKey: ["permission-template-grants", templateId],
    enabled: Boolean(templateId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_template_grants" as any)
        .select("*")
        .eq("template_id", templateId!)
        .order("module")
        .order("action");
      if (error) throw error;
      return (data ?? []) as unknown as PermissionTemplateGrant[];
    },
  });

  const setGrant = useMutation({
    mutationFn: async (input: {
      module: string;
      action: string;
      level: PermissionTemplateGrant["level"];
    }) => {
      if (!templateId) throw new Error("No template selected");
      const { data, error } = await supabase
        .from("permission_template_grants" as any)
        .upsert(
          { template_id: templateId, ...input } as any,
          { onConflict: "template_id,module,action" },
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PermissionTemplateGrant;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["permission-template-grants", templateId] }),
  });

  return { ...list, setGrant };
}

export function useAssignTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      templateId: string;
      workspaceId?: string;
      projectId?: string;
    }) => {
      const tenant_id = await requireTenantId();
      const { data, error } = await supabase
        .from("user_template_assignments" as any)
        .insert({
          tenant_id,
          user_id: input.userId,
          template_id: input.templateId,
          workspace_id: input.workspaceId ?? null,
          project_id: input.projectId ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["user-template-assignments"] }),
  });
}
