import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface ProjectDiscussion {
  id: string;
  project_id: string;
  title: string;
  content: string;
  content_html: string | null;
  created_by: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiscussionWithDetails extends ProjectDiscussion {
  author?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  reply_count: number;
  last_reply_at: string | null;
}

export interface DiscussionReply {
  id: string;
  discussion_id: string;
  content: string;
  content_html: string | null;
  created_by: string;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
}

export interface ReplyWithAuthor extends DiscussionReply {
  author?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useProjectDiscussions(projectId: string | null) {
  return useQuery({
    queryKey: ["project-discussions", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data: discussions, error } = await supabase
        .from("project_discussions")
        .select("*")
        .eq("project_id", projectId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!discussions || discussions.length === 0) return [];

      const authorIds = [...new Set(discussions.map((d) => d.created_by))];
      const discussionIds = discussions.map((d) => d.id);

      const [{ data: profiles }, { data: replies }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", authorIds),
        supabase
          .from("project_discussion_replies")
          .select("discussion_id, created_at")
          .in("discussion_id", discussionIds)
          .order("created_at", { ascending: false }),
      ]);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

      // Count replies per discussion
      const replyCountMap = new Map<string, number>();
      const lastReplyMap = new Map<string, string>();
      replies?.forEach((r) => {
        replyCountMap.set(r.discussion_id, (replyCountMap.get(r.discussion_id) || 0) + 1);
        if (!lastReplyMap.has(r.discussion_id)) {
          lastReplyMap.set(r.discussion_id, r.created_at);
        }
      });

      return discussions.map((d) => ({
        ...d,
        author: profileMap.get(d.created_by) ? {
          user_id: d.created_by,
          full_name: profileMap.get(d.created_by)!.full_name,
          avatar_url: profileMap.get(d.created_by)!.avatar_url,
        } : undefined,
        reply_count: replyCountMap.get(d.id) || 0,
        last_reply_at: lastReplyMap.get(d.id) || null,
      })) as DiscussionWithDetails[];
    },
    enabled: !!projectId,
  });
}

export function useDiscussionReplies(discussionId: string | null) {
  return useQuery({
    queryKey: ["discussion-replies", discussionId],
    queryFn: async () => {
      if (!discussionId) return [];

      const { data: replies, error } = await supabase
        .from("project_discussion_replies")
        .select("*")
        .eq("discussion_id", discussionId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!replies || replies.length === 0) return [];

      const authorIds = [...new Set(replies.map((r) => r.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", authorIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

      return replies.map((r) => ({
        ...r,
        author: profileMap.get(r.created_by) ? {
          user_id: r.created_by,
          full_name: profileMap.get(r.created_by)!.full_name,
          avatar_url: profileMap.get(r.created_by)!.avatar_url,
        } : undefined,
      })) as ReplyWithAuthor[];
    },
    enabled: !!discussionId,
  });
}

export function useCreateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      title: string;
      content: string;
      contentHtml?: string;
      linkedEntityType?: string;
      linkedEntityId?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("project_discussions")
        .insert({
          project_id: params.projectId,
          title: params.title,
          content: params.content,
          content_html: params.contentHtml || null,
          created_by: session.session.user.id,
          linked_entity_type: params.linkedEntityType || null,
          linked_entity_id: params.linkedEntityId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["project-discussions", vars.projectId] });
      toast.success("Discussion created");
    },
    onError: (err: Error) => {
      toast.error(`Failed to create discussion: ${err.message}`);
    },
  });
}

export function useCreateReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      discussionId: string;
      projectId: string;
      content: string;
      contentHtml?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("project_discussion_replies")
        .insert({
          discussion_id: params.discussionId,
          content: params.content,
          content_html: params.contentHtml || null,
          created_by: session.session.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["discussion-replies", vars.discussionId] });
      queryClient.invalidateQueries({ queryKey: ["project-discussions", vars.projectId] });
    },
    onError: (err: Error) => {
      toast.error(`Failed to post reply: ${err.message}`);
    },
  });
}

export function useDiscussionRealtime(projectId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-discussions:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_discussion_replies" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["discussion-replies"] });
          queryClient.invalidateQueries({ queryKey: ["project-discussions", projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}
