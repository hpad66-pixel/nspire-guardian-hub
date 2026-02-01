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
}

export interface ReportEmailFilters {
  status?: string;
  search?: string;
}

export interface SendReportEmailParams {
  recipients: string[];
  subject: string;
  reportType: "daily_inspection" | "daily_report";
  reportId: string;
  propertyName: string;
  inspectorName: string;
  inspectionDate: string;
  message?: string;
  pdfBase64: string;
  pdfFilename: string;
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
      const { data, error } = await supabase
        .from("report_emails")
        .select("status");

      if (error) {
        console.error("Error fetching report email stats:", error);
        throw error;
      }

      const stats = {
        total: data.length,
        sent: data.filter((e) => e.status === "sent").length,
        failed: data.filter((e) => e.status === "failed").length,
        pending: data.filter((e) => e.status === "pending").length,
      };

      return stats;
    },
  });
}
