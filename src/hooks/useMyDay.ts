import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { pickFocusItems, countByBucket, type FocusableItem } from '@/lib/myDay/focus';

export interface MyDayAssignee {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

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
  assignee?: MyDayAssignee | null;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** One cross-project pull of open action items (RLS-scoped to the workspace),
 *  split into "assigned to me", "I'm waiting on others", and per-project counts. */
export function useMyDay() {
  const { user } = useAuth();
  const myId = user?.id;

  const openQuery = useQuery({
    queryKey: ['my-day-open-items', myId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_action_items')
        .select('id, title, status, priority, due_date, project_id, assigned_to, created_by, project:projects(id, name, project_type, status)')
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;

      const rows = (data ?? []).map((i: any) => ({
        ...i,
        project: Array.isArray(i.project) ? i.project[0] ?? null : i.project ?? null,
      })) as MyDayItem[];

      const assigneeIds = [...new Set(
        rows.map((r) => r.assigned_to).filter((id): id is string => !!id && id !== myId),
      )];

      let profileMap: Record<string, MyDayAssignee> = {};
      if (assigneeIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', assigneeIds);
        (profiles ?? []).forEach((p) => {
          profileMap[p.user_id] = p;
        });
      }

      return rows.map((r) => ({
        ...r,
        assignee: r.assigned_to ? profileMap[r.assigned_to] ?? null : null,
      }));
    },
    enabled: !!user,
  });

  const doneTodayQuery = useQuery({
    queryKey: ['my-day-done-today', myId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('project_action_items')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', myId!)
        .eq('status', 'done')
        .gte('completed_at', startOfTodayIso());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
  });

  const items = openQuery.data ?? [];
  const mine = useMemo(
    () => items.filter((i) => i.assigned_to === myId),
    [items, myId],
  );
  const waiting = useMemo(
    () => items.filter((i) => i.created_by === myId && i.assigned_to && i.assigned_to !== myId),
    [items, myId],
  );

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const byProject = useMemo(() => {
    const map = new Map<string, { open: number; overdue: number; needsYou: number }>();
    for (const i of items) {
      const e = map.get(i.project_id) ?? { open: 0, overdue: 0, needsYou: 0 };
      e.open++;
      if (i.due_date && new Date(i.due_date + 'T00:00:00') < today) e.overdue++;
      if (i.assigned_to === myId) e.needsYou++;
      map.set(i.project_id, e);
    }
    return map;
  }, [items, myId, today]);

  const bucketCounts = useMemo(() => countByBucket(mine), [mine]);
  const focusItems = useMemo(
    () => pickFocusItems(mine as FocusableItem[], 3),
    [mine],
  );
  const overdue = bucketCounts.overdue;
  const dueToday = bucketCounts.today;
  const doneToday = doneTodayQuery.data ?? 0;

  return {
    ...openQuery,
    isLoading: openQuery.isLoading,
    items,
    mine,
    waiting,
    byProject,
    myId,
    focusItems,
    bucketCounts,
    overdue,
    dueToday,
    doneToday,
  };
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
      qc.invalidateQueries({ queryKey: ['my-day-done-today'] });
      qc.invalidateQueries({ queryKey: ['my-action-items'] });
      qc.invalidateQueries({ queryKey: ['action-items'] });
      toast.success('Marked done');
    },
    onError: (e: Error) => toast.error(`Couldn't complete: ${e.message}`),
  });
}
