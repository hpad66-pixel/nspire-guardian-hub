import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProgressReport {
  id: string;
  project_id: string;
  report_type: "weekly" | "monthly_invoice";
  report_period_start: string;
  report_period_end: string;
  title: string;
  content_html: string | null;
  status: "draft" | "finalized";
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateReportParams {
  projectId: string;
  reportType: "weekly" | "monthly_invoice";
  periodStart: string;
  periodEnd: string;
  userNotes?: string;
}

export function useProgressReports(projectId: string | null) {
  return useQuery({
    queryKey: ["progress-reports", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("project_progress_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as ProgressReport[]) || [];
    },
    enabled: !!projectId,
  });
}

export function useGenerateProgressReport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (
      params: GenerateReportParams,
      onChunk: (html: string) => void,
      onDone: () => void
    ) => {
      setIsGenerating(true);

      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) throw new Error("Not authenticated");

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-progress-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            projectId: params.projectId,
            reportType: params.reportType,
            periodStart: params.periodStart,
            periodEnd: params.periodEnd,
            userNotes: params.userNotes,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || `HTTP ${resp.status}`);
        }

        if (!resp.body) throw new Error("No response body");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });

          let nlIdx: number;
          while ((nlIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, nlIdx);
            buffer = buffer.slice(nlIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              done = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content as string | undefined;
              if (content) onChunk(content);
            } catch {
              // partial — wait
            }
          }
        }

        onDone();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Generation failed";
        toast.error(`Report generation failed: ${msg}`);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generate, isGenerating };
}

export function useSaveProgressReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (report: {
      id?: string;
      project_id: string;
      report_type: "weekly" | "monthly_invoice";
      report_period_start: string;
      report_period_end: string;
      title: string;
      content_html: string;
      status: "draft" | "finalized";
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) throw new Error("Not authenticated");

      const userId = session.session.user.id;

      if (report.id) {
        const { data, error } = await supabase
          .from("project_progress_reports")
          .update({
            title: report.title,
            content_html: report.content_html,
            status: report.status,
          })
          .eq("id", report.id)
          .select()
          .single();

        if (error) throw error;
        return data as ProgressReport;
      } else {
        const { data, error } = await supabase
          .from("project_progress_reports")
          .insert({
            project_id: report.project_id,
            report_type: report.report_type,
            report_period_start: report.report_period_start,
            report_period_end: report.report_period_end,
            title: report.title,
            content_html: report.content_html,
            status: report.status,
            generated_by: userId,
          })
          .select()
          .single();

        if (error) throw error;
        return data as ProgressReport;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["progress-reports", data.project_id] });
      toast.success(data.status === "finalized" ? "Report finalized" : "Report saved as draft");
    },
    onError: (err: Error) => {
      toast.error(`Failed to save report: ${err.message}`);
    },
  });
}

export function useDeleteProgressReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from("project_progress_reports").delete().eq("id", id);
      if (error) throw error;
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: ["progress-reports", projectId] });
      toast.success("Report deleted");
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete report: ${err.message}`);
    },
  });
}
