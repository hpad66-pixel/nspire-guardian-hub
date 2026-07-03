import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AgendaCategory = 'overdue' | 'due' | 'open' | 'objective' | 'decision' | 'next_step' | 'update' | 'discussion';

export interface AgendaItem {
  id: string;
  meeting_id: string;
  project_id: string;
  action_item_id: string | null;
  category: AgendaCategory;
  topic: string | null;
  title: string;
  description: string | null;
  owner_name: string | null;
  due_date: string | null;
  discussed: boolean;
  sort_order: number;
}

export type NewAgendaItem = Omit<AgendaItem, 'id' | 'meeting_id' | 'project_id' | 'discussed'>;

const table = () => supabase.from('consulting_agenda_items' as never) as any;

export function useMeetingAgendaItems(meetingId: string | null | undefined, projectId: string) {
  const qc = useQueryClient();
  const key = ['meeting-agenda-items', meetingId];

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!meetingId) return [] as AgendaItem[];
      const { data, error } = await table().select('*').eq('meeting_id', meetingId).order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as AgendaItem[];
    },
    enabled: !!meetingId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['meeting-agenda-items', meetingId] });

  const toggle = useMutation({
    mutationFn: async ({ id, discussed }: { id: string; discussed: boolean }) => {
      const { error } = await table().update({ discussed, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await table().delete().eq('id', id); if (error) throw error; },
    onSuccess: invalidate,
  });

  const addItem = useMutation({
    mutationFn: async (input: Partial<NewAgendaItem> & { title: string }) => {
      if (!meetingId) throw new Error('No meeting');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await table().insert({
        meeting_id: meetingId, project_id: projectId,
        category: input.category ?? 'discussion', topic: input.topic ?? null,
        title: input.title, description: input.description ?? null,
        owner_name: input.owner_name ?? null, due_date: input.due_date ?? null, action_item_id: input.action_item_id ?? null,
        sort_order: input.sort_order ?? 999, created_by: auth?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Added to agenda'); },
    onError: (e: Error) => toast.error(`Couldn't add: ${e.message}`),
  });

  // Inline edit a single item (title, description, owner, due, category, topic).
  const updateItem = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<AgendaItem, 'title' | 'description' | 'owner_name' | 'due_date' | 'category' | 'topic'>>) => {
      const { error } = await table().update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't save: ${e.message}`),
  });

  // Persist a new ordering (and optional topic move) for a set of rows in one shot.
  const applyOrder = useMutation({
    mutationFn: async (rows: Array<{ id: string; sort_order: number; topic?: string | null }>) => {
      for (const r of rows) {
        const patch: Record<string, unknown> = { sort_order: r.sort_order, updated_at: new Date().toISOString() };
        if (r.topic !== undefined) patch.topic = r.topic;
        const { error } = await table().update(patch).eq('id', r.id);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't reorder: ${e.message}`),
  });

  // Replace the whole agenda (used by "Build agenda").
  const replaceAll = useMutation({
    mutationFn: async (items: Array<Partial<NewAgendaItem> & { title: string }>) => {
      if (!meetingId) throw new Error('No meeting');
      const { data: auth } = await supabase.auth.getUser();
      await table().delete().eq('meeting_id', meetingId);
      if (items.length) {
        const rows = items.map((it, i) => ({
          meeting_id: meetingId, project_id: projectId,
          category: it.category ?? 'discussion', topic: it.topic ?? null,
          title: it.title, description: it.description ?? null,
          owner_name: it.owner_name ?? null, due_date: it.due_date ?? null, action_item_id: it.action_item_id ?? null,
          sort_order: it.sort_order ?? i, created_by: auth?.user?.id ?? null,
        }));
        const { error } = await table().insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Agenda built'); },
    onError: (e: Error) => toast.error(`Couldn't build agenda: ${e.message}`),
  });

  return { ...list, toggle, remove, addItem, updateItem, applyOrder, replaceAll };
}
