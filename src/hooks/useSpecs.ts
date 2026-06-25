import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { requireTenantId } from "@/lib/tenant";

export interface SpecSet {
  id: string; tenant_id: string; project_id: string;
  name: string; set_date: string | null; status: string; pdf_path: string | null;
}
export interface SpecSection {
  id: string; set_id: string; division: string; section_number: string;
  title: string; pdf_page_start: number | null; pdf_page_end: number | null;
  revision: string; cost_code_id: string | null;
}
export interface SpecRequirement {
  id: string; section_id: string; requirement_text: string;
  submittal_type: string | null; is_generated: boolean;
}

export function useSpecSets(projectId: string | null) {
  return useQuery<SpecSet[]>({
    queryKey: ["spec-sets", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specification_sets" as any).select("*")
        .eq("project_id", projectId!).order("set_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SpecSet[];
    },
  });
}

export function useSpecSections(setId: string | null) {
  return useQuery<SpecSection[]>({
    queryKey: ["spec-sections", setId],
    enabled: Boolean(setId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specification_sections" as any).select("*")
        .eq("set_id", setId!).order("section_number");
      if (error) throw error;
      return (data ?? []) as unknown as SpecSection[];
    },
  });
}

/** Generate draft submittals from spec_submittal_requirements for a project. */
export function useGenerateSubmittalRegister(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tenant_id = await requireTenantId();
      if (!projectId) throw new Error("No project");
      const { data: reqs, error: reqErr } = await supabase
        .from("spec_submittal_requirements" as any)
        .select("id, section_id, submittal_type, is_generated")
        .eq("is_generated", false);
      if (reqErr) throw reqErr;

      const rows = (reqs ?? []).map((r: any) => ({
        tenant_id,
        project_id: projectId,
        specification_section_id: r.section_id,
        required_type: r.submittal_type,
        status: "required",
      }));
      if (rows.length === 0) return { count: 0 };

      const { error } = await supabase.from("submittal_register_items" as any).insert(rows as any);
      if (error) throw error;
      await supabase
        .from("spec_submittal_requirements" as any)
        .update({ is_generated: true })
        .in("id", (reqs as any[]).map((r) => r.id));
      return { count: rows.length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["submittal-register", projectId] }),
  });
}
