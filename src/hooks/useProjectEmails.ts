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
  topic: string | null;         // water_billing | water_meters | sewer_extension | stormwater | other
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  snippet: string | null;
  body_html: string | null;
  body_text: string | null;
  /** Structured fields for a letter authored in CorrespondenceComposer
   *  (recipient/org/referenceNo/category/salutation) — null for synced Gmail
   *  messages. Lets a saved draft be reopened with full context, not just the
   *  flattened subject/body_text. */
  letter_meta: Record<string, string> | null;
  has_attachments: boolean;
  labels: string[];
  contact_id: string | null;
  occurred_at: string;
  created_at: string;
  updated_at: string | null;
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
  letter_meta?: Record<string, string> | null;
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
          letter_meta: input.letter_meta ?? null,
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

  // Tombstone a set of Gmail message ids so a future sync never resurrects them —
  // without this, deleting a synced message just frees its id up to be
  // re-imported on the very next sync.
  const tombstone = async (messageIds: string[]) => {
    if (!projectId || !messageIds.length) return;
    const { data: auth } = await supabase.auth.getUser();
    const rows = messageIds.map((gmail_message_id) => ({ project_id: projectId, gmail_message_id, deleted_by: auth?.user?.id ?? null }));
    try { await supabase.from("correspondence_deleted_messages" as any).upsert(rows, { onConflict: "project_id,gmail_message_id" }); }
    catch { /* tombstoning is best-effort — the row is deleted either way */ }
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { data: row } = await supabase.from("project_emails" as any).select("gmail_message_id").eq("id", id).maybeSingle();
      const { error } = await supabase.from("project_emails" as any).delete().eq("id", id);
      if (error) throw error;
      if ((row as any)?.gmail_message_id) await tombstone([(row as any).gmail_message_id]);
    },
    onSettled: invalidate,
  });

  // Delete every message in a synced thread (the natural unit in the UI — a
  // "thread card" — rather than one message row at a time).
  const removeThread = useMutation({
    mutationFn: async (gmailThreadId: string) => {
      const { data: rows } = await supabase.from("project_emails" as any).select("id,gmail_message_id").eq("project_id", projectId!).eq("gmail_thread_id", gmailThreadId);
      const ids = (rows ?? []).map((r: any) => r.id as string);
      const messageIds = (rows ?? []).map((r: any) => r.gmail_message_id as string).filter(Boolean);
      if (ids.length) {
        const { error } = await supabase.from("project_emails" as any).delete().in("id", ids);
        if (error) throw error;
      }
      await tombstone(messageIds);
    },
    onSettled: invalidate,
  });

  return { ...list, create, update, remove, removeThread };
}
