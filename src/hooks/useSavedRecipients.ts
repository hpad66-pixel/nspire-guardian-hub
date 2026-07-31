import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Quick-add email addresses for sending — NOT the CRM contacts table (which
// requires a first name + contact type, a full "person" record). This is
// deliberately just "an email worth remembering": label is optional, and
// `remember()` is called silently after every successful send so the list
// builds itself without an extra save step.
export interface SavedRecipient {
  id: string;
  email: string;
  label: string | null;
  last_used_at: string;
}

export function useSavedRecipients() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["saved-email-recipients"],
    queryFn: async (): Promise<SavedRecipient[]> => {
      const { data, error } = await supabase
        .from("saved_email_recipients" as any)
        .select("id, email, label, last_used_at")
        .order("last_used_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as SavedRecipient[];
    },
  });

  // Best-effort: never blocks or surfaces an error on the send flow it's called from.
  const remember = useMutation({
    mutationFn: async ({ email, label }: { email: string; label?: string | null }) => {
      const { data: auth } = await supabase.auth.getUser();
      const clean = email.trim().toLowerCase();
      if (!clean) return;
      await supabase.from("saved_email_recipients" as any).upsert(
        { email: clean, label: label?.trim() || null, last_used_at: new Date().toISOString(), created_by: auth?.user?.id ?? null },
        { onConflict: "tenant_id,email" },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-email-recipients"] }),
  });

  const rememberAll = async (emails: string[], label?: string | null) => {
    const unique = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    await Promise.all(unique.map((email) => remember.mutateAsync({ email, label }).catch(() => {})));
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_email_recipients" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-email-recipients"] }),
  });

  return { ...list, remember, rememberAll, remove };
}
