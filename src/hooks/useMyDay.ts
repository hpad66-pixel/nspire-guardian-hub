import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface MyDayItem {
  id: string;
  title: string;
  status: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  due_date: string | null;
  project_id: string;
  assigned_to: string | null;
  created_by: string | null;
  project?: { id: string; name: string; project_type: string | null; status: string | null } | null;
}

/** One cross-project pull of open action items (RLS-scoped to the workspace),
 *  split into "assigned to me", "I'm waiting on others", and per-project counts. */
export function useMyDay() {
  const { user } = useAuth();
  const myId = user?.id;

  const query = useQuery({
    queryKey: ['my-day-open-items', myId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_action_items')
        .select('id, title, status, priority, due_date, project_id, assigned_to, created_by, project:projects(id, name, project_type, status)')
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []).map((i: any) => ({
        ...i,
        project: Array.isArray(i.project) ? i.project[0] ?? null : i.project ?? null,
      })) as MyDayItem[];
    },
    enabled: !!user,
  });

  const items = query.data ?? [];
  const mine = items.filter((i) => i.assigned_to === myId);
  const waiting = items.filter((i) => i.created_by === myId && i.assigned_to && i.assigned_to !== myId);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const byProject = new Map<string, { open: number; overdue: number }>();
  for (const i of items) {
    const e = byProject.get(i.project_id) ?? { open: 0, overdue: 0 };
    e.open++;
    if (i.due_date && new Date(i.due_date + 'T00:00:00') < today) e.overdue++;
    byProject.set(i.project_id, e);
  }

  return { ...query, items, mine, waiting, byProject, myId };
}

export function useCompleteActionItemById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_action_items')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-day-open-items'] });
      qc.invalidateQueries({ queryKey: ['my-action-items'] });
      qc.invalidateQueries({ queryKey: ['action-items'] });
    },
    onError: (e: Error) => toast.error(`Couldn't complete: ${e.message}`),
  });
}
