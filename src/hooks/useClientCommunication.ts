import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type MessageDirection = 'client_to_pm' | 'pm_to_client';

export interface ClientMessage {
  id: string;
  project_id: string;
  sent_by: string | null;
  direction: MessageDirection;
  subject: string | null;
  body: string;
  photo_urls: string[];
  parent_id: string | null;
  thread_id: string | null;
  read_by_pm: boolean;
  read_by_pm_at: string | null;
  read_by_pm_user: string | null;
  read_by_client: boolean;
  read_by_client_at: string | null;
  requires_response: boolean;
  responded_at: string | null;
  resolves_action_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ActionItemType =
  | 'decision'
  | 'approval'
  | 'payment'
  | 'information'
  | 'rfi_response'
  | 'change_order'
  | 'acknowledgment';

export type ActionItemStatus = 'pending' | 'viewed' | 'responded' | 'resolved' | 'cancelled';
export type ActionItemPriority = 'urgent' | 'normal' | 'low';

export interface ClientActionItem {
  id: string;
  project_id: string;
  action_type: ActionItemType;
  title: string;
  description: string | null;
  options: string[] | null;
  client_selection: string | null;
  amount: number | null;
  due_date: string | null;
  linked_rfi_id: string | null;
  linked_change_order_id: string | null;
  linked_document_id: string | null;
  attachment_urls: string[];
  status: ActionItemStatus;
  priority: ActionItemPriority;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  created_by: string | null;
  resolved_by: string | null;
  client_response: string | null;
  pm_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES — QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export function useClientMessages(projectId: string) {
  return useQuery({
    queryKey: ['client-messages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ClientMessage[];
    },
    enabled: !!projectId,
  });
}

export function useUnreadClientMessageCount(projectId: string) {
  return useQuery({
    queryKey: ['client-messages-unread', projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('client_messages')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('direction', 'client_to_pm')
        .eq('read_by_pm', false);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!projectId,
  });
}

export function useAllProjectsUnreadCount() {
  return useQuery({
    queryKey: ['all-client-unread'],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return 0;

      // Fetch unread messages across all projects the current user created
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', sessionData.session.user.id);

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return 0;

      const projectIds = projects.map((p) => p.id);

      const { count, error } = await supabase
        .from('client_messages')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .eq('direction', 'client_to_pm')
        .eq('read_by_pm', false);

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES — MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface SendMessageParams {
  projectId: string;
  body: string;
  subject?: string;
  photoUrls?: string[];
  parentId?: string;
  threadId?: string;
  direction: MessageDirection;
  requiresResponse?: boolean;
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('client_messages')
        .insert({
          project_id: params.projectId,
          sent_by: sessionData.session.user.id,
          direction: params.direction,
          body: params.body,
          subject: params.subject ?? null,
          photo_urls: params.photoUrls ?? [],
          parent_id: params.parentId ?? null,
          thread_id: params.threadId ?? null,
          requires_response: params.requiresResponse ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-messages', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['client-messages-unread', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-client-unread'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });
}

export interface MarkMessageReadParams {
  messageId: string;
  projectId: string;
  side: 'pm' | 'client';
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MarkMessageReadParams) => {
      const now = new Date().toISOString();
      const { data: sessionData } = await supabase.auth.getSession();

      const updatePayload =
        params.side === 'pm'
          ? {
              read_by_pm: true,
              read_by_pm_at: now,
              read_by_pm_user: sessionData.session?.user.id ?? null,
            }
          : {
              read_by_client: true,
              read_by_client_at: now,
            };

      const { error } = await supabase
        .from('client_messages')
        .update(updatePayload)
        .eq('id', params.messageId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-messages-unread', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-client-unread'] });
      queryClient.invalidateQueries({ queryKey: ['client-messages', variables.projectId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark message read: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION ITEMS — QUERIES
// ─────────────────────────────────────────────────────────────────────────────

export function useClientActionItems(projectId: string, statusFilter?: ActionItemStatus[]) {
  return useQuery({
    queryKey: ['client-action-items', projectId, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('client_action_items')
        .select('*')
        .eq('project_id', projectId);

      if (statusFilter && statusFilter.length > 0) {
        query = query.in('status', statusFilter);
      }

      // Ordering: urgent first, then by due_date asc (nulls last), then newest first
      query = query
        .order('priority', { ascending: true })  // 'low' < 'normal' < 'urgent' alphabetically — handled in client sort below
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const priorityOrder: Record<ActionItemPriority, number> = { urgent: 0, normal: 1, low: 2 };
      return ((data ?? []) as ClientActionItem[]).sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      );
    },
    enabled: !!projectId,
  });
}

export function usePendingActionItemCount(projectId: string) {
  return useQuery({
    queryKey: ['client-action-pending-count', projectId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('client_action_items')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('status', ['pending', 'viewed']);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!projectId,
  });
}

export function useAllProjectsPendingCount() {
  return useQuery({
    queryKey: ['all-action-items-pending'],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return 0;

      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('created_by', sessionData.session.user.id);

      if (projectsError) throw projectsError;
      if (!projects || projects.length === 0) return 0;

      const projectIds = projects.map((p) => p.id);

      const { count, error } = await supabase
        .from('client_action_items')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)
        .in('status', ['pending', 'viewed']);

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION ITEMS — MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateActionItemParams {
  projectId: string;
  actionType: ActionItemType;
  title: string;
  description?: string;
  options?: string[];
  amount?: number;
  dueDate?: string;
  linkedRfiId?: string;
  linkedChangeOrderId?: string;
  linkedDocumentId?: string;
  priority?: ActionItemPriority;
  attachmentUrls?: string[];
}

export function useCreateActionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateActionItemParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('client_action_items')
        .insert({
          project_id: params.projectId,
          action_type: params.actionType,
          title: params.title,
          description: params.description ?? null,
          options: params.options ? params.options : null,
          amount: params.amount ?? null,
          due_date: params.dueDate ?? null,
          linked_rfi_id: params.linkedRfiId ?? null,
          linked_change_order_id: params.linkedChangeOrderId ?? null,
          linked_document_id: params.linkedDocumentId ?? null,
          priority: params.priority ?? 'normal',
          attachment_urls: params.attachmentUrls ?? [],
          created_by: sessionData.session.user.id,
          status: 'pending',
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientActionItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-action-items', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['client-action-pending-count', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-action-items-pending'] });
      toast.success('Action item sent to client');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create action item: ${error.message}`);
    },
  });
}

export interface RespondToActionItemParams {
  itemId: string;
  projectId: string;
  response?: string;
  selection?: string;
}

export function useRespondToActionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RespondToActionItemParams) => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('client_action_items')
        .update({
          status: 'responded',
          responded_at: now,
          client_response: params.response ?? null,
          client_selection: params.selection ?? null,
          // Mark as viewed if not already
          viewed_at: now,
        })
        .eq('id', params.itemId)
        .select()
        .single();

      if (error) throw error;
      return data as ClientActionItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-action-items', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['client-action-pending-count', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-action-items-pending'] });
      toast.success('Response submitted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit response: ${error.message}`);
    },
  });
}

export interface MarkActionItemViewedParams {
  itemId: string;
  projectId: string;
}

export function useMarkActionItemViewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MarkActionItemViewedParams) => {
      // Only transition from 'pending' to 'viewed'
      const { error } = await supabase
        .from('client_action_items')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString(),
        })
        .eq('id', params.itemId)
        .eq('status', 'pending'); // Guard: only update if still pending

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-action-items', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['client-action-pending-count', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-action-items-pending'] });
    },
    // Silent — this is called automatically, no toast needed
  });
}

export interface ResolveActionItemParams {
  itemId: string;
  projectId: string;
}

export function useResolveActionItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResolveActionItemParams) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('client_action_items')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: sessionData.session.user.id,
        })
        .eq('id', params.itemId)
        .select()
        .single();

      if (error) throw error;

      const item = data as ClientActionItem;

      // Send email notification to the person who created the action item
      if (item.created_by && item.created_by !== sessionData.session.user.id) {
        try {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', item.created_by)
            .single();

          const { data: resolverProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', sessionData.session.user.id)
            .single();

          if (creatorProfile?.email) {
            const resolverName = resolverProfile?.full_name || 'A team member';
            const resolvedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            await supabase.functions.invoke('send-email', {
              body: {
                recipients: [creatorProfile.email],
                subject: `✅ Action Item Completed: ${item.title}`,
                bodyHtml: `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
  <div style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:24px 32px;">
    <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.7);">Action Item Completed</p>
    <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3;">${item.title}</h1>
  </div>
  <div style="padding:24px 32px;">
    <p style="font-size:15px;color:#374151;margin:0 0 16px;line-height:1.6;">
      <strong>${resolverName}</strong> has marked this action item as completed.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="padding:8px 12px;background:#F0FDF4;border-radius:6px 0 0 6px;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Status</td>
        <td style="padding:8px 12px;background:#F0FDF4;border-radius:0 6px 6px 0;font-size:14px;color:#059669;font-weight:600;">✅ Resolved</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Resolved On</td>
        <td style="padding:8px 12px;font-size:14px;color:#111827;">${resolvedDate}</td>
      </tr>
      ${item.client_response ? `<tr><td style="padding:8px 12px;background:#F9FAFB;border-radius:6px 0 0 6px;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Response</td><td style="padding:8px 12px;background:#F9FAFB;border-radius:0 6px 6px 0;font-size:14px;color:#111827;">${item.client_response}</td></tr>` : ''}
    </table>
    ${item.description ? `<p style="font-size:14px;color:#6B7280;margin:0;line-height:1.5;border-top:1px solid #E5E7EB;padding-top:16px;">${item.description}</p>` : ''}
  </div>
  <div style="background:#F8FAFC;padding:14px 32px;border-top:1px solid #E5E7EB;">
    <p style="margin:0;font-size:11px;color:#94A3B8;">Sent via APAS — Project Management Platform</p>
  </div>
</div>`,
              },
            });
          }
        } catch (emailErr) {
          console.error('Failed to send resolution email:', emailErr);
          // Don't block the resolve action if email fails
        }
      }

      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-action-items', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['client-action-pending-count', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['all-action-items-pending'] });
      toast.success('Marked as resolved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to resolve item: ${error.message}`);
    },
  });
}

export interface MarkActionItemUrgentParams {
  itemId: string;
  projectId: string;
}

export function useMarkActionItemUrgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MarkActionItemUrgentParams) => {
      const { error } = await supabase
        .from('client_action_items')
        .update({ priority: 'urgent' })
        .eq('id', params.itemId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-action-items', variables.projectId] });
      toast.success('Marked as urgent');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update priority: ${error.message}`);
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME SUBSCRIPTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function useClientMessagesRealtime(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`client-messages:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_messages',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client-messages', projectId] });
          queryClient.invalidateQueries({ queryKey: ['client-messages-unread', projectId] });
          queryClient.invalidateQueries({ queryKey: ['all-client-unread'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_messages',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client-messages', projectId] });
          queryClient.invalidateQueries({ queryKey: ['client-messages-unread', projectId] });
          queryClient.invalidateQueries({ queryKey: ['all-client-unread'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}

export function useActionItemsRealtime(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`client-action-items:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_action_items',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client-action-items', projectId] });
          queryClient.invalidateQueries({ queryKey: ['client-action-pending-count', projectId] });
          queryClient.invalidateQueries({ queryKey: ['all-action-items-pending'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'client_action_items',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['client-action-items', projectId] });
          queryClient.invalidateQueries({ queryKey: ['client-action-pending-count', projectId] });
          queryClient.invalidateQueries({ queryKey: ['all-action-items-pending'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}
