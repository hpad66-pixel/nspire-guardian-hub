import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
  archived_by_user_ids?: string[] | null;
  deleted_by_user_ids?: string[] | null;
}

export interface ReportEmailFull extends ReportEmail {
  body_html: string | null;
  body_text: string | null;
  is_read: boolean;
  attachment_filename: string | null;
  attachment_size: number | null;
  is_archived: boolean;
  is_deleted: boolean;
  thread_id: string | null;
  reply_to_id: string | null;
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
      if (!userId) return [];

      let query = supabase
        .from("report_emails")
        .select("*")
        .or(`sent_by.eq.${userId},from_user_id.eq.${userId},recipient_user_ids.cs.{${userId}}`)
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
      if (!userId) {
        return {
          total: 0,
          sent: 0,
          failed: 0,
          pending: 0,
          unread: 0,
          archived: 0,
          deleted: 0,
          inbox: 0,
        };
      }

      const { data, error } = await supabase
        .from("report_emails")
        .select("status, is_read, is_archived, is_deleted, sent_by, from_user_id, recipient_user_ids, archived_by_user_ids, deleted_by_user_ids")
        .or(`sent_by.eq.${userId},from_user_id.eq.${userId},recipient_user_ids.cs.{${userId}}`);

      if (error) {
        console.error("Error fetching report email stats:", error);
        throw error;
      }

      const isDeletedForUser = (e: {
        is_deleted: boolean | null;
        deleted_by_user_ids?: string[] | null;
      }) =>
        Array.isArray(e.deleted_by_user_ids)
          ? e.deleted_by_user_ids.includes(userId)
          : !!e.is_deleted;

      const isArchivedForUser = (e: {
        is_archived: boolean | null;
        archived_by_user_ids?: string[] | null;
      }) =>
        Array.isArray(e.archived_by_user_ids)
          ? e.archived_by_user_ids.includes(userId)
          : !!e.is_archived;

      const activeEmails = data.filter((e) => !isDeletedForUser(e));
      
      // Count received emails (where current user is in recipient_user_ids)
      const receivedEmails = activeEmails.filter(
        (e) => e.recipient_user_ids?.includes(userId) && !isArchivedForUser(e)
      );
      
      // Count sent emails (where current user is the sender)
      const sentEmails = activeEmails.filter(
        (e) => e.sent_by === userId && e.status === "sent" && !isArchivedForUser(e)
      );

      const stats = {
        total: activeEmails.filter((e) => !isArchivedForUser(e)).length,
        sent: sentEmails.length,
        failed: activeEmails.filter((e) => e.status === "failed" && !isArchivedForUser(e)).length,
        pending: activeEmails.filter((e) => e.status === "pending" && !isArchivedForUser(e)).length,
        unread: activeEmails.filter((e) => !e.is_read && !isArchivedForUser(e)).length,
        archived: data.filter((e) => isArchivedForUser(e) && !isDeletedForUser(e)).length,
        deleted: data.filter((e) => isDeletedForUser(e)).length,
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("report_emails")
        .select("*")
        .or(`sent_by.eq.${userId},from_user_id.eq.${userId},recipient_user_ids.cs.{${userId}}`)
        .eq("id", id!)
        .maybeSingle();

      if (error) throw error;
      return data as ReportEmailFull | null;
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

export function useReportEmailsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("report-emails-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "report_emails",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["report-emails"] });
          queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
          queryClient.invalidateQueries({ queryKey: ["report-email"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "report_emails",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["report-emails"] });
          queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
          queryClient.invalidateQueries({ queryKey: ["report-email"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "report_emails",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["report-emails"] });
          queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
          queryClient.invalidateQueries({ queryKey: ["report-email"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
