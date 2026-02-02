import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SendInternalMessageParams {
  recipientUserIds: string[];
  ccRecipientUserIds?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  replyToId?: string;
}

export function useSendInternalMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendInternalMessageParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const userId = sessionData.session.user.id;

      // Get sender's profile for the from_user_name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", userId)
        .single();

      const senderName = profile?.full_name || profile?.email || "Unknown";

      // Get recipient emails for display
      const { data: recipientProfiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, work_email")
        .in("user_id", params.recipientUserIds);

      const recipientEmails = recipientProfiles?.map(
        (p) => p.work_email || p.email || p.full_name || "Unknown"
      ) || [];

      // Insert the internal message
      const { data, error } = await supabase
        .from("report_emails")
        .insert({
          message_type: "internal",
          subject: params.subject,
          body_html: params.bodyHtml,
          body_text: params.bodyText || "",
          recipients: recipientEmails,
          recipient_user_ids: params.recipientUserIds,
          from_user_id: userId,
          from_user_name: senderName,
          sent_by: userId,
          status: "sent",
          is_read: false,
          source_module: "mailbox",
          report_type: "internal_message",
          reply_to_id: params.replyToId || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending internal message:", error);
        throw new Error(error.message || "Failed to send message");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
      toast.success("Message sent successfully!");
    },
    onError: (error: Error) => {
      console.error("Failed to send internal message:", error);
      toast.error(`Failed to send message: ${error.message}`);
    },
  });
}
