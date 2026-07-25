import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// One row in a project's correspondence trail — an inbound message synced from
// Gmail or an outbound letter/email drafted or sent from projOS. (New table, not
// yet in generated types → `as any` on the query builder.)
export interface ProjectEmail {
  id: string;
  project_id: string;
  direction: "inbound" | "outbound";
  status: string;              // received | draft | sent | signed
  channel: string;             // gmail | resend | manual
  gmail_thread_id: string | null;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  snippet: string | null;
  body_html: string | null;
  has_attachments: boolean;
  labels: string[];
  contact_id: string | null;
  occurred_at: string;
  created_at: string;
}

export function useProjectEmails(projectId: string | null) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["project-emails", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectEmail[]> => {
      const { data, error } = await supabase
        .from("project_emails" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectEmail[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_emails" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["project-emails", projectId] }),
  });

  return { ...list, remove };
}
