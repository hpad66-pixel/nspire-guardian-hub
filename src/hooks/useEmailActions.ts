import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const toUnique = (values: (string | null | undefined)[]) =>
  Array.from(new Set(values.filter((v): v is string => !!v)));

export function useArchiveEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: row, error: fetchError } = await supabase
        .from("report_emails")
        .select("archived_by_user_ids, deleted_by_user_ids")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("report_emails")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archived_by_user_ids: toUnique([...(row?.archived_by_user_ids || []), userId]),
          deleted_by_user_ids: (row?.deleted_by_user_ids || []).filter((v: string) => v !== userId),
        } as never)
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: row, error: fetchError } = await supabase
        .from("report_emails")
        .select("archived_by_user_ids, deleted_by_user_ids")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("report_emails")
        .update({
          is_archived: false,
          archived_at: null,
          is_deleted: false,
          deleted_at: null,
          archived_by_user_ids: (row?.archived_by_user_ids || []).filter((v: string) => v !== userId),
          deleted_by_user_ids: (row?.deleted_by_user_ids || []).filter((v: string) => v !== userId),
        } as never)
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: row, error: fetchError } = await supabase
        .from("report_emails")
        .select("deleted_by_user_ids")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("report_emails")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by_user_ids: toUnique([...(row?.deleted_by_user_ids || []), userId]),
        } as never)
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const { data: row, error: fetchError } = await supabase
        .from("report_emails")
        .select("archived_by_user_ids, deleted_by_user_ids")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("report_emails")
        .update({
          archived_by_user_ids: (row?.archived_by_user_ids || []).filter((v: string) => v !== userId),
          deleted_by_user_ids: (row?.deleted_by_user_ids || []).filter((v: string) => v !== userId),
        } as never)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-emails"] });
      queryClient.invalidateQueries({ queryKey: ["report-email-stats"] });
      toast.success("Email removed from your trash");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete email: ${error.message}`);
    },
  });
}
