import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReportEmail {
  id: string;
  report_id: string | null;
  daily_inspection_id: string | null;
  recipients: string[];
  subject: string;
  sent_at: string;
  status: string;
  error_message: string | null;
  report_type: string;
  sent_by: string | null;
  message_type: "external" | "internal" | null;
  recipient_user_ids: string[] | null;
  from_user_id: string | null;
  from_user_name: string | null;
}

export interface ReportEmailFull extends ReportEmail {
  body_html: string | null;
  body_text: string | null;
  is_read: boolean;
  attachment_filename: string | null;
  attachment_size: number | null;
  is_archived: boolean;
  is_deleted: boolean;
}

export interface ReportEmailFilters {
  status?: string;
  search?: string;
}

export interface SendReportEmailParams {
  recipients: string[];
  bccRecipients?: string[]; // Optional BCC recipients
  subject: string;
  reportType: "daily_inspection" | "daily_report" | "proposal" | "work_order";
  reportId: string;
  propertyName: string;
  inspectorName: string;
  inspectionDate: string;
  message?: string;
  pdfBase64: string;
  pdfFilename: string;
  sourceModule?: string;
  propertyId?: string;
  projectId?: string;
  workOrderId?: string;
  statusSummary?: {
    ok: number;
    attention: number;
    defect: number;
  };
}

export function useReportEmails(filters?: ReportEmailFilters) {
  return useQuery({
    queryKey: ["report-emails", filters],
    queryFn: async () => {
      // Get current user to filter received messages
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      let query = supabase
        .from("report_emails")
        .select("*")
        .order("sent_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.search) {
        query = query.or(
          `subject.ilike.%${filters.search}%,recipients.cs.{${filters.search}}`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching report emails:", error);
        throw error;
      }

      return data as ReportEmail[];
    },
  });
}

export function useSendReportEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendReportEmailParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("send-report-email", {
        body: params,
      });

      if (error) {
        console.error("Error sending report email:", error);
        throw new Error(error.message || "Failed to send email");
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to send email");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      toast.success("Report sent successfully!");
    },
    onError: (error: Error) => {
      console.error("Failed to send report email:", error);
      toast.error(`Failed to send email: ${error.message}`);
    },
  });
}

export function useReportEmailStats() {
  return useQuery({
    queryKey: ["report-email-stats"],
    queryFn: async () => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      const { data, error } = await supabase
        .from("report_emails")
        .select("status, is_read, is_archived, is_deleted, sent_by, recipient_user_ids");

      if (error) {
        console.error("Error fetching report email stats:", error);
        throw error;
      }

      const activeEmails = data.filter((e) => !e.is_deleted);
      
      // Count received emails (where current user is in recipient_user_ids)
      const receivedEmails = activeEmails.filter(
        (e) => userId && e.recipient_user_ids?.includes(userId) && !e.is_archived
      );
      
      // Count sent emails (where current user is the sender)
      const sentEmails = activeEmails.filter(
        (e) => e.sent_by === userId && e.status === "sent" && !e.is_archived
      );

      const stats = {
        total: activeEmails.filter((e) => !e.is_archived).length,
        sent: sentEmails.length,
        failed: activeEmails.filter((e) => e.status === "failed" && !e.is_archived).length,
        pending: activeEmails.filter((e) => e.status === "pending" && !e.is_archived).length,
        unread: activeEmails.filter((e) => !e.is_read && !e.is_archived).length,
        archived: data.filter((e) => e.is_archived && !e.is_deleted).length,
        deleted: data.filter((e) => e.is_deleted).length,
        inbox: receivedEmails.length,
      };

      return stats;
    },
  });
}

export function useReportEmail(id: string | null) {
  return useQuery({
    queryKey: ["report-email", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("report_emails")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as ReportEmailFull;
    },
  });
}

export function useMarkEmailRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_emails")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
    },
  });
}
