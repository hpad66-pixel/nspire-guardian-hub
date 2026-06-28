import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Project Log — general per-project tracker (punch items, decisions, division
// tasks…) with a timestamped update log. Tables aren't in generated types yet,
// so we go through `(supabase as any)`.
const db = supabase as any;

export type TrackerStatus = 'open' | 'progress' | 'scheduled' | 'blocked' | 'done';
export type TrackerPriority = 'high' | 'med' | 'low';
export type TrackerCategory = 'punch' | 'decision' | 'division' | 'update' | 'general';

export interface TrackerUpdate {
  id: string;
  item_id: string;
  author: string | null;
  body: string;
  status_to: string | null;
  created_at: string;
}

export interface TrackerItem {
  id: string;
  project_id: string;
  code: string | null;
  owner: string | null;
  category: TrackerCategory;
  division: string | null;
  title: string;
  description: string | null;
  priority: TrackerPriority;
  status: TrackerStatus;
  due_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  updates: TrackerUpdate[];
}

export function useTrackerItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tracker-items', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<TrackerItem[]> => {
      const [{ data: items, error: e1 }, { data: updates, error: e2 }] = await Promise.all([
        db.from('tracker_items').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
        db.from('tracker_updates').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const byItem: Record<string, TrackerUpdate[]> = {};
      (updates ?? []).forEach((u: TrackerUpdate) => { (byItem[u.item_id] ??= []).push(u); });
      return (items ?? []).map((i: TrackerItem) => ({ ...i, updates: byItem[i.id] ?? [] }));
    },
  });
}

async function authorName(): Promise<{ uid: string | null; name: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { uid: null, name: 'Contractor' };
  const { data: p } = await db.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
  return { uid: user.id, name: p?.full_name || user.email || 'Contractor' };
}

export interface CreateTrackerItemInput {
  projectId: string;
  code?: string; owner?: string; category?: TrackerCategory; division?: string;
  title: string; description?: string; priority?: TrackerPriority; status?: TrackerStatus;
  dueDate?: string | null; firstNote?: string;
}

export function useCreateTrackerItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTrackerItemInput) => {
      const { uid, name } = await authorName();
      const status = input.status ?? 'open';
      const { data: item, error } = await db.from('tracker_items').insert({
        project_id: input.projectId,
        code: input.code || null,
        owner: input.owner || null,
        category: input.category ?? 'punch',
        division: input.division || null,
        title: input.title,
        description: input.description || null,
        priority: input.priority ?? 'med',
        status,
        due_date: input.dueDate || null,
        created_by: uid,
        closed_at: status === 'done' ? new Date().toISOString() : null,
      }).select().single();
      if (error) throw error;
      if (input.firstNote?.trim()) {
        await db.from('tracker_updates').insert({
          project_id: input.projectId, item_id: item.id, author: name, body: input.firstNote.trim(), created_by: uid,
        });
      }
      return item;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['tracker-items', v.projectId] }); toast.success('Item added'); },
    onError: (e: Error) => toast.error(e.message || 'Could not add item'),
  });
}

export function useUpdateTrackerItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, patch }: { id: string; projectId: string; patch: Partial<TrackerItem> }) => {
      const next: Record<string, unknown> = { ...patch };
      if (patch.status) next.closed_at = patch.status === 'done' ? new Date().toISOString() : null;
      const { error } = await db.from('tracker_items').update(next).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['tracker-items', v.projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not update item'),
  });
}

export function useDeleteTrackerItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      const { error } = await db.from('tracker_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['tracker-items', v.projectId] }); toast.success('Item deleted'); },
    onError: (e: Error) => toast.error(e.message || 'Could not delete item'),
  });
}

// Posts a timestamped update, optionally changing the item's status in the same
// stroke (the way the contractor logs incremental progress).
export function useAddTrackerUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, projectId, body, statusTo }: { itemId: string; projectId: string; body?: string; statusTo?: TrackerStatus | '' }) => {
      const { uid, name } = await authorName();
      const text = (body ?? '').trim();
      if (!text && !statusTo) throw new Error('Enter a note or set a status.');
      if (text || statusTo) {
        await db.from('tracker_updates').insert({
          project_id: projectId, item_id: itemId, author: name, created_by: uid,
          body: text || `Status set to ${statusTo}.`, status_to: statusTo || null,
        });
      }
      if (statusTo) {
        await db.from('tracker_items').update({
          status: statusTo, closed_at: statusTo === 'done' ? new Date().toISOString() : null,
        }).eq('id', itemId);
      }
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['tracker-items', v.projectId] }); toast.success('Update posted'); },
    onError: (e: Error) => toast.error(e.message || 'Could not post update'),
  });
}

// Quick status change that also drops a log entry, so the history stays complete.
export function useSetTrackerStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, status }: { id: string; projectId: string; status: TrackerStatus }) => {
      const { uid, name } = await authorName();
      await db.from('tracker_items').update({
        status, closed_at: status === 'done' ? new Date().toISOString() : null,
      }).eq('id', id);
      await db.from('tracker_updates').insert({
        project_id: projectId, item_id: id, author: name, created_by: uid,
        body: status === 'done' ? 'Item closed / completed.' : `Status set to ${status}.`, status_to: status,
      });
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['tracker-items', v.projectId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not change status'),
  });
}
