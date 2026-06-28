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
  is_client?: boolean;
  photos?: string[];
  created_at: string;
}

// Uploads an image for a Project Log update; returns its public URL.
export async function uploadTrackerPhoto(file: File, projectId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `tracker/${projectId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('daily-report-photos').upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from('daily-report-photos').getPublicUrl(path).data.publicUrl;
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
  client_visible: boolean;
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
  dueDate?: string | null; firstNote?: string; clientVisible?: boolean;
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
        client_visible: input.clientVisible ?? true,
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

// Merge several items into one: move all their updates onto the target, log the
// merge, then delete the now-empty source items.
export function useMergeTrackerItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetId, sourceIds, projectId, summary }: { targetId: string; sourceIds: string[]; projectId: string; summary?: string }) => {
      const sources = sourceIds.filter(id => id !== targetId);
      if (!sources.length) return;
      const { error: e1 } = await db.from('tracker_updates').update({ item_id: targetId }).in('item_id', sources);
      if (e1) throw e1;
      if (summary) {
        const { uid, name } = await authorName();
        await db.from('tracker_updates').insert({ project_id: projectId, item_id: targetId, author: name, created_by: uid, body: summary });
      }
      const { error: e2 } = await db.from('tracker_items').delete().in('id', sources);
      if (e2) throw e2;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['tracker-items', v.projectId] }); toast.success('Items merged'); },
    onError: (e: Error) => toast.error(e.message || 'Merge failed'),
  });
}

export function useBulkDeleteTrackerItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[]; projectId: string }) => {
      const { error } = await db.from('tracker_items').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['tracker-items', v.projectId] }); toast.success('Items deleted'); },
    onError: (e: Error) => toast.error(e.message || 'Delete failed'),
  });
}

// Posts a timestamped update, optionally changing the item's status in the same
// stroke (the way the contractor logs incremental progress).
export function useAddTrackerUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, projectId, body, statusTo, photos }: { itemId: string; projectId: string; body?: string; statusTo?: TrackerStatus | ''; photos?: string[] }) => {
      const { uid, name } = await authorName();
      const text = (body ?? '').trim();
      const pics = photos ?? [];
      if (!text && !statusTo && !pics.length) throw new Error('Enter a note, add a photo, or set a status.');
      if (text || statusTo || pics.length) {
        await db.from('tracker_updates').insert({
          project_id: projectId, item_id: itemId, author: name, created_by: uid,
          body: text || (pics.length ? 'Added photos.' : `Status set to ${statusTo}.`), status_to: statusTo || null, photos: pics,
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

// ── Unread client comments (per-browser "seen" marker) ──────────────────────
const SEEN_KEY = (pid: string) => `tracker-comments-seen-${pid}`;

export function markTrackerCommentsSeen(projectId: string) {
  try { localStorage.setItem(SEEN_KEY(projectId), new Date().toISOString()); } catch { /* ignore */ }
}

// Count of client comments posted since this browser last opened the log.
export function useUnreadClientComments(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tracker-unread', projectId],
    enabled: !!projectId,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<number> => {
      let seen = '1970-01-01T00:00:00Z';
      try { seen = localStorage.getItem(SEEN_KEY(projectId!)) || seen; } catch { /* ignore */ }
      const { count } = await db.from('tracker_updates')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId).eq('is_client', true).gt('created_at', seen);
      return count ?? 0;
    },
  });
}

// ── Per-client AI switch (projects.ai_enabled) ───────────────────────────────
export function useProjectAiEnabled(projectId: string | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['project-ai-enabled', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<boolean> => {
      const { data } = await db.from('projects').select('ai_enabled').eq('id', projectId).maybeSingle();
      return data?.ai_enabled ?? true;
    },
  });
  const setEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await db.from('projects').update({ ai_enabled: enabled }).eq('id', projectId);
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      qc.setQueryData(['project-ai-enabled', projectId], enabled);
      toast.success(enabled ? 'AI enabled for this client' : 'AI disabled for this client');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not change AI setting'),
  });
  return { enabled: query.data ?? true, isLoading: query.isLoading, setEnabled: setEnabled.mutate, isSaving: setEnabled.isPending };
}

export interface TrackerAiChange {
  item_id: string | null;
  code: string | null;
  owner: string | null;
  title: string;
  note: string;
  new_status: TrackerStatus | null;
  is_new: boolean;
}

// Summarize the log into a client-ready update.
export function useTrackerSummarize() {
  return useMutation({
    mutationFn: async ({ items, projectName }: { items: TrackerItem[]; projectName: string }) => {
      const slim = items.map(i => ({ status: i.status, owner: i.owner, title: i.title, latest: i.updates[0]?.body ?? '' }));
      const { data, error } = await supabase.functions.invoke('tracker-ai', { body: { action: 'summarize', items: slim, project_name: projectName } });
      if (error || !data?.ok) throw new Error(data?.error || 'Could not summarize');
      return data as { title: string; summary_html: string };
    },
    onError: (e: Error) => toast.error(e.message || 'Could not summarize'),
  });
}

// Parse an Otter/voice transcript into proposed log updates (review before apply).
export function useTrackerIngest() {
  return useMutation({
    mutationFn: async ({ transcript, items }: { transcript: string; items: TrackerItem[] }) => {
      const slim = items.map(i => ({ id: i.id, code: i.code, owner: i.owner, title: i.title, status: i.status }));
      const { data, error } = await supabase.functions.invoke('tracker-ai', { body: { action: 'ingest', transcript, items: slim } });
      if (error || !data?.ok) throw new Error(data?.error || 'Could not read transcript');
      return (data.changes ?? []) as TrackerAiChange[];
    },
    onError: (e: Error) => toast.error(e.message || 'Could not read transcript'),
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
