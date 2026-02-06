import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useArchiveEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_emails")
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
      toast.success("Email archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive email: ${error.message}`);
    },
  });
}

export function useRestoreEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_emails")
        .update({ is_archived: false, archived_at: null, is_deleted: false, deleted_at: null })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
      toast.success("Email restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore email: ${error.message}`);
    },
  });
}

export function useSoftDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_emails")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
      toast.success("Email moved to trash");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email: ${error.message}`);
    },
  });
}

export function usePermanentDeleteEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("report_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
      toast.success("Email permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email: ${error.message}`);
    },
  });
}
