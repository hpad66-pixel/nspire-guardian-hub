import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DraftTaskInput {
  title: string;
  description?: string | null;
  status: string;
  priority?: string;
  due_date?: string | null;
  assignee?: string | null;
  comments?: { author: string; content: string; created_at: string }[];
}

export interface TaskUpdateDraftArgs {
  project_id: string;
  project_name?: string | null;
  mode: "single" | "weekly";
  audience?: "client" | "internal";
  /** Weekly only: "narrative" (flowing paragraphs, default) or "list" (one line
   *  per task — "**Title** — status: update", no summary prose). */
  format?: "narrative" | "list";
  /** Weekly only: narrows the report to one scope/workstream instead of the
   *  whole project — the AI is told not to reference other workstreams. */
  scope_name?: string;
  topic?: string;
  tasks: DraftTaskInput[];
}

// Drafts a succinct, client-ready update from one task's comments or a weekly
// rollup of every open task — strictly opt-in, always shown as an editable draft
// before send (the function only drafts; it never sends anything itself).
export function useTaskUpdateDraft() {
  return useMutation({
    mutationFn: async (args: TaskUpdateDraftArgs): Promise<{ draft: string; model: string }> => {
      const { data, error } = await supabase.functions.invoke("task-update-draft", { body: args });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { draft: string; model: string };
    },
  });
}
