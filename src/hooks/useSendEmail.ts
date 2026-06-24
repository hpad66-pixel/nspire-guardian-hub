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
        // reason (attachment too large, invalid recipient, …) is in the response body.
        let detail = error.message || "Failed to send email";
        try {
          const ctx = (error as any).context;
          const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
          if (body?.error) detail = body.error;
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
