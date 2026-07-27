import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CorrespondenceTopicDef } from "@/hooks/useGmailSync";

export interface ReassignArgs {
  project_id: string;
  gmail_thread_id: string;
  target_project_id?: string;
  topic?: string;
  apply_gmail_label?: boolean;
}
export interface ReassignResult {
  moved: boolean;
  movedRows: number;
  droppedRows: number;
  labelApplied: boolean;
  labelSkippedReason?: string;
}

// Correct a synced thread: move it to the right project and/or fix its topic,
// optionally pushing the matching Gmail label. Invalidates both the source and
// target project's correspondence data on success.
export function useCorrespondenceReassign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: ReassignArgs): Promise<ReassignResult> => {
      const { data, error } = await supabase.functions.invoke("correspondence-reassign", { body: args });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as ReassignResult;
    },
    onSuccess: (_r, args) => {
      const invalidateFor = (pid: string) => {
        qc.invalidateQueries({ queryKey: ["project-emails", pid] });
        qc.invalidateQueries({ queryKey: ["correspondence-threads", pid] });
      };
      invalidateFor(args.project_id);
      if (args.target_project_id) invalidateFor(args.target_project_id);
    },
  });
}

export interface ProjectTopicOption {
  project_id: string;
  project_name: string;
  parent_name: string | null;
  topics: CorrespondenceTopicDef[];
  has_gmail_label: boolean;
}

// Every project the user can see, with its own configured topics (for the "move
// to project / pick a topic" picker). Projects with no correspondence_settings
// yet still appear (with an empty topic list) so a first-time move is possible.
export function useAllProjectTopics() {
  return useQuery({
    queryKey: ["all-project-topics"],
    queryFn: async (): Promise<ProjectTopicOption[]> => {
      const [{ data: projects, error: e1 }, { data: settings, error: e2 }] = await Promise.all([
        supabase.from("projects").select("id,name,parent_project_id").order("name", { ascending: true }),
        supabase.from("correspondence_settings" as any).select("project_id,topics,gmail_label_id"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byId = new Map((projects ?? []).map((p) => [p.id, p]));
      const settingsByProject = new Map((settings ?? []).map((s: any) => [s.project_id, s]));
      return (projects ?? []).map((p) => {
        const s = settingsByProject.get(p.id);
        const parent = p.parent_project_id ? byId.get(p.parent_project_id) : null;
        return {
          project_id: p.id,
          project_name: p.name,
          parent_name: parent?.name ?? null,
          topics: (s?.topics ?? []) as CorrespondenceTopicDef[],
          has_gmail_label: Boolean(s?.gmail_label_id),
        };
      });
    },
  });
}
