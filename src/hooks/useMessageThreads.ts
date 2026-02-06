import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MessageThread {
  id: string;
  subject: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  participant_ids: string[];
  is_group: boolean;
  is_archived: boolean;
}

export interface ThreadWithLastMessage extends MessageThread {
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  participants?: Array<{
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

export function useMessageThreads() {
  return useQuery({
    queryKey: ["message-threads"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("message_threads")
        .select("*")
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as MessageThread[];
    },
  });
}

export function useMessageThread(threadId: string | null) {
  return useQuery({
    queryKey: ["message-thread", threadId],
    queryFn: async () => {
      if (!threadId) return null;

      const { data, error } = await supabase
        .from("message_threads")
        .select("*")
        .eq("id", threadId)
        .single();

      if (error) throw error;
      return data as MessageThread;
    },
    enabled: !!threadId,
  });
}

export function useThreadsWithDetails() {
  return useQuery({
    queryKey: ["message-threads-with-details"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      // Get all threads
      const { data: threads, error: threadsError } = await supabase
        .from("message_threads")
        .select("*")
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false });

      if (threadsError) throw threadsError;
      if (!threads || threads.length === 0) return [];

      // Get all participant user_ids from all threads
      const allParticipantIds = [
        ...new Set(threads.flatMap((t) => t.participant_ids)),
      ];

      // Get participant profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", allParticipantIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, p]) ?? []
      );

      // Get last message for each thread
      const threadIds = threads.map((t) => t.id);
      const { data: lastMessages } = await supabase
        .from("thread_messages")
        .select("thread_id, content, sender_id, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      // Group last messages by thread
      const lastMessageMap = new Map<string, typeof lastMessages extends (infer T)[] ? T : never>();
      lastMessages?.forEach((msg) => {
        if (!lastMessageMap.has(msg.thread_id)) {
          lastMessageMap.set(msg.thread_id, msg);
        }
      });

      // Combine data
      const threadsWithDetails: ThreadWithLastMessage[] = threads.map((thread) => ({
        ...thread,
        last_message: lastMessageMap.get(thread.id)
          ? {
              content: lastMessageMap.get(thread.id)!.content,
              sender_id: lastMessageMap.get(thread.id)!.sender_id,
              created_at: lastMessageMap.get(thread.id)!.created_at,
            }
          : undefined,
        participants: thread.participant_ids.map((id: string) => ({
          user_id: id,
          full_name: profileMap.get(id)?.full_name ?? null,
          avatar_url: profileMap.get(id)?.avatar_url ?? null,
        })),
      }));

      return threadsWithDetails;
    },
  });
}

export interface CreateThreadParams {
  subject: string;
  participantIds: string[];
  initialMessage?: string;
  initialMessageHtml?: string;
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateThreadParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Not authenticated");

      const userId = sessionData.session.user.id;

      // Ensure creator is included in participants
      const allParticipants = [...new Set([userId, ...params.participantIds])];

      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from("message_threads")
        .insert({
          subject: params.subject,
          created_by: userId,
          participant_ids: allParticipants,
          is_group: allParticipants.length > 2,
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Send initial message if provided
      if (params.initialMessage) {
        const { error: messageError } = await supabase
          .from("thread_messages")
          .insert({
            thread_id: thread.id,
            sender_id: userId,
            content: params.initialMessage,
            content_html: params.initialMessageHtml || null,
          });

        if (messageError) throw messageError;
      }

      // Create read status for all participants
      const readStatusRows = allParticipants.map((participantId) => ({
        thread_id: thread.id,
        user_id: participantId,
        last_read_at: participantId === userId ? new Date().toISOString() : null,
      }));

      await supabase.from("thread_read_status").insert(readStatusRows);

      return thread as MessageThread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["message-threads-with-details"] });
      toast.success("Conversation started!");
    },
    onError: (error: Error) => {
      console.error("Failed to create thread:", error);
      toast.error(`Failed to create conversation: ${error.message}`);
    },
  });
}

export function useArchiveThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("message_threads")
        .update({ is_archived: true })
        .eq("id", threadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["message-threads-with-details"] });
      toast.success("Conversation archived");
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive: ${error.message}`);
    },
  });
}

export function useAddParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      userId,
    }: {
      threadId: string;
      userId: string;
    }) => {
      // Get current participants
      const { data: thread, error: fetchError } = await supabase
        .from("message_threads")
        .select("participant_ids")
        .eq("id", threadId)
        .single();

      if (fetchError) throw fetchError;

      const newParticipants = [...new Set([...thread.participant_ids, userId])];

      const { error } = await supabase
        .from("message_threads")
        .update({
          participant_ids: newParticipants,
          is_group: newParticipants.length > 2,
        })
        .eq("id", threadId);

      if (error) throw error;

      // Create read status for new participant
      await supabase.from("thread_read_status").insert({
        thread_id: threadId,
        user_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-threads"] });
      queryClient.invalidateQueries({ queryKey: ["message-thread"] });
      toast.success("Participant added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add participant: ${error.message}`);
    },
  });
}
