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

// Fields accepted when logging an outbound letter/email into the trail.
export interface OutboundEmailInput {
  direction?: "outbound";
  status?: string;              // draft | sent
  channel?: string;             // resend | gmail | manual
  subject: string;
  to_emails?: string[];
  cc_emails?: string[];
  from_email?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  snippet?: string | null;
  template_id?: string | null;
  occurred_at?: string;
}

export function useProjectEmails(projectId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project-emails", projectId] });

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

  // Log an outbound letter/email (draft or sent) into the project trail.
  const create = useMutation({
    mutationFn: async (input: OutboundEmailInput): Promise<ProjectEmail> => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("project_emails" as any)
        .insert({
          project_id: projectId,
          direction: input.direction ?? "outbound",
          status: input.status ?? "draft",
          channel: input.channel ?? "manual",
          subject: input.subject,
          to_emails: input.to_emails ?? [],
          cc_emails: input.cc_emails ?? [],
          from_email: input.from_email ?? null,
          body_html: input.body_html ?? null,
          body_text: input.body_text ?? null,
          snippet: input.snippet ?? ((input.body_text ?? "").slice(0, 200) || null),
          template_id: input.template_id ?? null,
          occurred_at: input.occurred_at ?? new Date().toISOString(),
          created_by: auth?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProjectEmail;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ProjectEmail>) => {
      const { error } = await supabase
        .from("project_emails" as any)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_emails" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  return { ...list, create, update, remove };
}
