import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ThreadActionItem { title: string; owner: string; due_hint: string }
export interface ThreadEntities { people: string[]; orgs: string[]; amounts: string[]; dates: string[]; refs: string[] }

export interface CorrespondenceThread {
  id: string;
  project_id: string;
  gmail_thread_id: string;
  subject: string | null;
  topic: string | null;
  summary: string | null;
  status: string | null;            // awaiting_us | awaiting_them | in_progress | resolved | fyi
  ball_in_court: string | null;
  urgency: string | null;           // low | normal | high
  action_items: ThreadActionItem[];
  entities: ThreadEntities | null;
  message_count: number;
  last_message_at: string | null;
  analyzed_at: string | null;
  action_items_pushed_at: string | null;
}

// Per-project thread intelligence (the AI-extracted layer that sits on top of the
// raw project_emails trail). `analyze` runs the correspondence-intel edge function.
export function useCorrespondenceThreads(projectId: string | null) {
  const qc = useQueryClient();

  const threads = useQuery({
    queryKey: ["correspondence-threads", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<CorrespondenceThread[]> => {
      const { data, error } = await supabase
        .from("correspondence_threads" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CorrespondenceThread[];
    },
  });

  const analyze = useMutation({
    mutationFn: async (opts?: { thread_id?: string; force?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("correspondence-intel", {
        body: { project_id: projectId, ...opts },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { analyzed: number; threads: unknown[] };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["correspondence-threads", projectId] }),
  });

  return { threads, analyze };
}
