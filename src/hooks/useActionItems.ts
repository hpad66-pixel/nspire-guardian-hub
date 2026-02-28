import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActionItemProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface ActionItem {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  completed_at: string | null;
  tags: string[];
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  assignee?: ActionItemProfile | null;
  creator?: ActionItemProfile | null;
  project?: { id: string; name: string } | null;
  comment_count?: number;
}

export interface ActionItemComment {
  id: string;
  action_item_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: ActionItemProfile | null;
}

const ITEMS_QUERY_KEY = (projectId: string) => ['action-items', projectId];
const MY_ITEMS_QUERY_KEY = ['my-action-items'];
const ASSIGNED_BY_ME_KEY = ['assigned-by-me'];
const COMMENTS_QUERY_KEY = (itemId: string) => ['action-item-comments', itemId];

// ── fetch helpers ──────────────────────────────────────────────────────────

async function fetchItemsForProject(projectId: string): Promise<ActionItem[]> {
  const { data, error } = await supabase
    .from('project_action_items')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  const items = data || [];

  // Collect unique user IDs
  const userIds = [...new Set([
    ...items.map(i => i.assigned_to).filter(Boolean),
    ...items.map(i => i.created_by).filter(Boolean),
  ])] as string[];

  const profileMap: Record<string, ActionItemProfile> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url')
      .in('user_id', userIds);
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
  }

  // Count comments per item
  const commentCounts: Record<string, number> = {};
  if (items.length > 0) {
    const { data: counts } = await supabase
      .from('action_item_comments')
      .select('action_item_id')
      .in('action_item_id', items.map(i => i.id));
    (counts || []).forEach(r => {
      commentCounts[r.action_item_id] = (commentCounts[r.action_item_id] || 0) + 1;
    });
  }

  return items.map(item => ({
    ...item,
    tags: item.tags || [],
    status: item.status as ActionItem['status'],
    priority: item.priority as ActionItem['priority'],
    assignee: item.assigned_to ? profileMap[item.assigned_to] ?? null : null,
    creator: item.created_by ? profileMap[item.created_by] ?? null : null,
    comment_count: commentCounts[item.id] || 0,
  }));
}

async function fetchMyItems(): Promise<ActionItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('project_action_items')
    .select('*, project:projects(id, name)')
    .eq('assigned_to', user.id)
    .not('status', 'in', '("done","cancelled")')
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  const items = data || [];

  const userIds = [...new Set(items.map(i => i.created_by).filter(Boolean))] as string[];
  const profileMap: Record<string, ActionItemProfile> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url')
      .in('user_id', userIds);
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
  }

  return items.map(item => ({
    ...item,
    tags: item.tags || [],
    status: item.status as ActionItem['status'],
    priority: item.priority as ActionItem['priority'],
    assignee: null,
    creator: item.created_by ? profileMap[item.created_by] ?? null : null,
    project: Array.isArray(item.project) ? item.project[0] ?? null : item.project ?? null,
  }));
}

async function fetchAssignedByMe(): Promise<ActionItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('project_action_items')
    .select('*, project:projects(id, name)')
    .eq('created_by', user.id)
    .not('assigned_to', 'is', null)
    .neq('assigned_to', user.id) // exclude self-assigned
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  const items = data || [];

  // Collect unique user IDs (assignees)
  const userIds = [...new Set(items.map(i => i.assigned_to).filter(Boolean))] as string[];
  const profileMap: Record<string, ActionItemProfile> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, avatar_url')
      .in('user_id', userIds);
    (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
  }

  return items.map(item => ({
    ...item,
    tags: item.tags || [],
    status: item.status as ActionItem['status'],
    priority: item.priority as ActionItem['priority'],
    assignee: item.assigned_to ? profileMap[item.assigned_to] ?? null : null,
    creator: null,
    project: Array.isArray(item.project) ? item.project[0] ?? null : item.project ?? null,
  }));
}

// ── hooks ──────────────────────────────────────────────────────────────────

export function useActionItemsByProject(projectId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ITEMS_QUERY_KEY(projectId ?? ''),
    queryFn: () => fetchItemsForProject(projectId!),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (!projectId) return;
    const channel = supabase
      .channel(`action-items-${projectId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_action_items',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ITEMS_QUERY_KEY(projectId) });
        qc.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, qc]);

  return query;
}

export function useMyActionItems() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: MY_ITEMS_QUERY_KEY,
    queryFn: fetchMyItems,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('my-action-items')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_action_items',
        filter: `assigned_to=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return query;
}

export function useAssignedByMe() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ASSIGNED_BY_ME_KEY,
    queryFn: fetchAssignedByMe,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('assigned-by-me')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_action_items',
        filter: `created_by=eq.${user.id}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ASSIGNED_BY_ME_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  return query;
}

export function useActionItemComments(actionItemId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: COMMENTS_QUERY_KEY(actionItemId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_item_comments')
        .select('*')
        .eq('action_item_id', actionItemId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const comments = data || [];

      const userIds = [...new Set(comments.map(c => c.created_by).filter(Boolean))] as string[];
      const profileMap: Record<string, ActionItemProfile> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds);
        (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
      }

      return comments.map(c => ({
        ...c,
        creator: c.created_by ? profileMap[c.created_by] ?? null : null,
      })) as ActionItemComment[];
    },
    enabled: !!actionItemId,
  });

  useEffect(() => {
    if (!actionItemId) return;
    const channel = supabase
      .channel(`action-item-comments-${actionItemId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'action_item_comments',
        filter: `action_item_id=eq.${actionItemId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: COMMENTS_QUERY_KEY(actionItemId) });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [actionItemId, qc]);

  return query;
}

// ── mutations ──────────────────────────────────────────────────────────────

export function useCreateActionItem(projectId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      priority?: ActionItem['priority'];
      assigned_to?: string | null;
      due_date?: string | null;
      tags?: string[];
      linked_entity_type?: string | null;
      linked_entity_id?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('project_action_items')
        .insert({
          project_id: projectId,
          created_by: user.id,
          title: payload.title,
          description: payload.description || null,
          priority: payload.priority || 'medium',
          assigned_to: payload.assigned_to || null,
          due_date: payload.due_date || null,
          tags: payload.tags || [],
          linked_entity_type: payload.linked_entity_type || null,
          linked_entity_id: payload.linked_entity_id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify assignee if different from creator
      if (payload.assigned_to && payload.assigned_to !== user.id) {
        const { data: proj } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        await supabase.from('notifications').insert({
          user_id: payload.assigned_to,
          type: 'assignment',
          title: "You've been assigned a task",
          message: `${payload.title}${proj?.name ? ` — ${proj.name}` : ''}`,
          entity_type: 'action_item',
          entity_id: data.id,
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_QUERY_KEY(projectId) });
      qc.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
    },
  });
}

export function useUpdateActionItem(projectId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      title?: string;
      description?: string | null;
      status?: ActionItem['status'];
      priority?: ActionItem['priority'];
      assigned_to?: string | null;
      due_date?: string | null;
      tags?: string[];
      completed_at?: string | null;
      previous_assigned_to?: string | null;
    }) => {
      const { id, previous_assigned_to, ...updates } = payload;
      if (updates.status === 'done' && !updates.completed_at) {
        updates.completed_at = new Date().toISOString();
      }
      if (updates.status && updates.status !== 'done') {
        updates.completed_at = null;
      }

      const { data, error } = await supabase
        .from('project_action_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify new assignee
      if (
        updates.assigned_to &&
        updates.assigned_to !== previous_assigned_to &&
        updates.assigned_to !== user?.id
      ) {
        const { data: proj } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        await supabase.from('notifications').insert({
          user_id: updates.assigned_to,
          type: 'assignment',
          title: "You've been assigned a task",
          message: `${data.title}${proj?.name ? ` — ${proj.name}` : ''}`,
          entity_type: 'action_item',
          entity_id: id,
        });
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_QUERY_KEY(projectId) });
      qc.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
    },
  });
}

export function useDeleteActionItem(projectId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_action_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ITEMS_QUERY_KEY(projectId) });
      qc.invalidateQueries({ queryKey: MY_ITEMS_QUERY_KEY });
    },
  });
}

export function useCreateActionItemComment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ actionItemId, content }: { actionItemId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('action_item_comments')
        .insert({ action_item_id: actionItemId, content, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { actionItemId }) => {
      qc.invalidateQueries({ queryKey: COMMENTS_QUERY_KEY(actionItemId) });
    },
  });
}
