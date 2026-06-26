import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
  size: number;
}

export interface SendEmailParams {
  recipients: string[];
  ccRecipients?: string[];
  bccRecipients?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  attachments?: EmailAttachment[];
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendEmailParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: params,
      });

      if (error) {
        console.error("Error sending email:", error);
        // supabase.functions.invoke surfaces a generic "non-2xx" message; the real
        // reason (attachment too large, invalid recipient, unverified domain …) is
        // in the response body. Read it robustly (json → text), and detect the
        // platform-level body-size rejection which has no JSON body at all.
        let detail = error.message || "Failed to send email";
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.clone === "function") {
            const raw = await ctx.clone().text().catch(() => "");
            if (raw) {
              try { const j = JSON.parse(raw); detail = j?.error || j?.message || raw; }
              catch { detail = raw.slice(0, 300); }
            }
            const status = ctx.status;
            if (status === 413 || /payload|too large|entity too large/i.test(raw)) {
              detail = "The attachment is too large for email. Try again — the minutes will be sent in the body without the PDF.";
            }
          }
        } catch { /* keep generic message */ }
        throw new Error(detail);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to send email");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
      toast.success("Email sent successfully!");
    },
    onError: (error: Error) => {
      console.error("Failed to send email:", error);
      toast.error(`Failed to send email: ${error.message}`);
    },
  });
}
