import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface ThreadReadStatus {
  id: string;
  thread_id: string;
  user_id: string;
  last_read_at: string | null;
}

export function useThreadReadStatus(threadId: string | null) {
  return useQuery({
    queryKey: ["thread-read-status", threadId],
    queryFn: async () => {
      if (!threadId) return null;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return null;

      const { data, error } = await supabase
        .from("thread_read_status")
        .select("*")
        .eq("thread_id", threadId)
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ThreadReadStatus | null;
    },
    enabled: !!threadId,
  });
}

export function useMarkThreadRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const userId = sessionData.session.user.id;
      const now = new Date().toISOString();

      // Upsert read status
      const { error } = await supabase
        .from("thread_read_status")
        .upsert(
          {
            thread_id: threadId,
            user_id: userId,
            last_read_at: now,
          },
          {
            onConflict: "thread_id,user_id",
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, threadId) => {
      queryClient.invalidateQueries({
        queryKey: ["thread-read-status", threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["unread-thread-count"] });
    },
  });
}

export function useUnreadThreadCount() {
  return useQuery({
    queryKey: ["unread-thread-count"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return 0;

      const userId = sessionData.session.user.id;

      // Get all threads user participates in
      const { data: threads, error: threadsError } = await supabase
        .from("message_threads")
        .select("id, last_message_at")
        .contains("participant_ids", [userId])
        .eq("is_archived", false);

      if (threadsError) throw threadsError;
      if (!threads || threads.length === 0) return 0;

      // Get read status for all threads
      const threadIds = threads.map((t) => t.id);
      const { data: readStatuses, error: readError } = await supabase
        .from("thread_read_status")
        .select("thread_id, last_read_at")
        .eq("user_id", userId)
        .in("thread_id", threadIds);

      if (readError) throw readError;

      // Create map of read status
      const readStatusMap = new Map(
        readStatuses?.map((rs) => [rs.thread_id, rs.last_read_at]) ?? []
      );

      // Count unread threads (where last_message_at > last_read_at or no read status)
      let unreadCount = 0;
      for (const thread of threads) {
        const lastReadAt = readStatusMap.get(thread.id);
        if (!lastReadAt || new Date(thread.last_message_at) > new Date(lastReadAt)) {
          unreadCount++;
        }
      }

      return unreadCount;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useUnreadThreadCountRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("thread-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-thread-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
