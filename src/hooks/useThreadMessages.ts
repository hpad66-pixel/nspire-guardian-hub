import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  content_html: string | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  attachments: string[];
}

export interface ThreadMessageWithSender extends ThreadMessage {
  sender?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useThreadMessages(threadId: string | null) {
  return useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];

      const { data: messages, error } = await supabase
        .from("thread_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (!messages || messages.length === 0) return [];

      // Get unique sender IDs
      const senderIds = [...new Set(messages.map((m) => m.sender_id))];

      // Get sender profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", senderIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) ?? []
      );

      // Combine messages with sender info
      const messagesWithSender: ThreadMessageWithSender[] = messages.map((msg) => ({
        ...msg,
        sender: profileMap.get(msg.sender_id)
          ? {
              user_id: msg.sender_id,
              full_name: profileMap.get(msg.sender_id)!.full_name,
              avatar_url: profileMap.get(msg.sender_id)!.avatar_url,
            }
          : undefined,
      }));

      return messagesWithSender;
    },
    enabled: !!threadId,
  });
}

export interface SendMessageParams {
  threadId: string;
  content: string;
  contentHtml?: string;
}

export function useSendThreadMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("thread_messages")
        .insert({
          thread_id: params.threadId,
          sender_id: sessionData.session.user.id,
          content: params.content,
          content_html: params.contentHtml || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ThreadMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["thread-messages", variables.threadId],
      });
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["message-threads-with-details"] });
    },
    onError: (error: Error) => {
      console.error("Failed to send message:", error);
      toast.error(`Failed to send message: ${error.message}`);
    },
  });
}

export function useEditMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      content,
      contentHtml,
    }: {
      messageId: string;
      content: string;
      contentHtml?: string;
    }) => {
      const { error } = await supabase
        .from("thread_messages")
        .update({
          content,
          content_html: contentHtml || null,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-messages"] });
      toast.success("Message updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to edit message: ${error.message}`);
    },
  });
}

export function useThreadRealtime(threadId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          // Invalidate to refetch with sender info
          queryClient.invalidateQueries({
            queryKey: ["thread-messages", threadId],
          });
          queryClient.invalidateQueries({
            queryKey: ["message-threads-with-details"],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "thread_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["thread-messages", threadId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);
}
