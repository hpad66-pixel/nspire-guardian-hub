import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EmailAttachment } from "@/hooks/useSendEmail";

export interface SendViaGmailParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}

// Send a letter through the user's OWN connected Gmail (gmail-send edge fn) — it
// lands in their real Gmail "Sent" and threads with the recipient's replies. The
// edge fn returns `code: "not_connected" | "reconnect"` when the Gmail link needs
// (re)connecting, so the caller can route the user to the connect flow instead of
// showing a raw error.
export function useSendViaGmail() {
  return useMutation({
    mutationFn: async (params: SendViaGmailParams) => {
      const attachments = params.attachments?.map((a) => ({
        filename: a.filename,
        contentBase64: a.contentBase64,
        contentType: a.contentType,
      }));
      const { data, error } = await supabase.functions.invoke("gmail-send", {
        body: { ...params, attachments },
      });

      if (error) {
        // The real reason (not_connected, reconnect, Gmail API detail) is in the
        // response body, not the generic "non-2xx" message invoke surfaces.
        let detail = error.message || "Failed to send via Gmail";
        let code: string | undefined;
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.clone === "function") {
            const raw = await ctx.clone().text().catch(() => "");
            if (raw) {
              try { const j = JSON.parse(raw); detail = j?.error || detail; code = j?.code; }
              catch { detail = raw.slice(0, 300); }
            }
          }
        } catch { /* keep generic message */ }
        const err = new Error(detail) as Error & { code?: string };
        err.code = code;
        throw err;
      }
      if (data?.error) {
        const err = new Error(data.error) as Error & { code?: string };
        err.code = data.code;
        throw err;
      }
      return data as { success: boolean; id: string | null; threadId: string | null; from: string | null };
    },
  });
}
