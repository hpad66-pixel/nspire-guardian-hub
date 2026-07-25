import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Reusable branded letter templates (project-scoped or workspace-wide). New
// table → `as any` on the query builder until types are regenerated.
export interface CorrespondenceTemplate {
  id: string;
  project_id: string | null;
  name: string;
  category: string;            // r4 | city | transmittal | general
  subject_template: string | null;
  body_template: string | null;
  recipient: string | null;
  recipient_address: string | null;
  letterhead: string;
  is_active: boolean;
  created_at: string;
}

export interface TemplateInput {
  name: string;
  category?: string;
  subject_template?: string | null;
  body_template?: string | null;
  recipient?: string | null;
  recipient_address?: string | null;
  project_id?: string | null;   // null = workspace-wide
}

export function useCorrespondenceTemplates(projectId: string | null) {
  const qc = useQueryClient();

  // Templates usable on this project: its own + workspace-wide (project_id null).
  const list = useQuery({
    queryKey: ["correspondence-templates", projectId],
    queryFn: async (): Promise<CorrespondenceTemplate[]> => {
      const { data, error } = await supabase
        .from("correspondence_templates" as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as CorrespondenceTemplate[];
      return rows.filter((t) => t.project_id === null || t.project_id === projectId);
    },
  });

  const create = useMutation({
    mutationFn: async (input: TemplateInput): Promise<CorrespondenceTemplate> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("correspondence_templates" as any)
        .insert({
          name: input.name,
          category: input.category ?? "general",
          subject_template: input.subject_template ?? null,
          body_template: input.body_template ?? null,
          recipient: input.recipient ?? null,
          recipient_address: input.recipient_address ?? null,
          project_id: input.project_id ?? projectId,
          created_by: auth?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CorrespondenceTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["correspondence-templates", projectId] }),
  });

  return { ...list, create };
}
