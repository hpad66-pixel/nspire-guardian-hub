import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfiles, type Profile } from '@/hooks/useProfiles';

// Gamified per-person workload + performance across every project (RLS-scoped).
// Points reward throughput + on-time delivery and lightly penalize letting items
// go overdue — so the leaderboard rewards finishing, not hoarding.

export interface LeaderRow {
  userId: string;
  profile: Profile | null;
  name: string;
  open: number;          // currently open, assigned to them
  overdue: number;       // open + past due
  high: number;          // open + urgent/high priority
  completed: number;     // done (in window)
  onTime: number;        // completed on/before due date
  completedWithDue: number;
  onTimePct: number | null;
  points: number;
  rank: number;
}

interface RawItem { assigned_to: string | null; status: string; priority: string | null; due_date: string | null; completed_at: string | null }

const DONE = new Set(['done']);
const CLOSED = new Set(['done', 'cancelled']);

export function useWorkloadLeaderboard(windowDays = 90) {
  const { data: profiles } = useProfiles();

  const itemsQ = useQuery({
    queryKey: ['workload-leaderboard-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_action_items')
        .select('assigned_to, status, priority, due_date, completed_at')
        .limit(50000);
      if (error) throw error;
      return (data ?? []) as RawItem[];
    },
    staleTime: 60_000,
  });

  const items = itemsQ.data ?? [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const since = Date.now() - windowDays * 864e5;

  const byUser = new Map<string, LeaderRow>();
  const ensure = (uid: string): LeaderRow => {
    let r = byUser.get(uid);
    if (!r) { r = { userId: uid, profile: null, name: 'Unassigned', open: 0, overdue: 0, high: 0, completed: 0, onTime: 0, completedWithDue: 0, onTimePct: null, points: 0, rank: 0 }; byUser.set(uid, r); }
    return r;
  };

  for (const it of items) {
    if (!it.assigned_to) continue;
    const r = ensure(it.assigned_to);
    if (DONE.has(it.status)) {
      // Only count completions within the scoring window.
      if (it.completed_at && new Date(it.completed_at).getTime() < since) continue;
      r.completed += 1;
      if (it.due_date && it.completed_at) {
        r.completedWithDue += 1;
        if (new Date(it.completed_at) <= new Date(it.due_date + 'T23:59:59')) r.onTime += 1;
      }
    } else if (!CLOSED.has(it.status)) {
      r.open += 1;
      if (it.priority === 'urgent' || it.priority === 'high') r.high += 1;
      if (it.due_date && new Date(it.due_date + 'T00:00:00') < today) r.overdue += 1;
    }
  }

  // Attach profiles + compute points; drop people with zero activity.
  const profByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const rows = [...byUser.values()]
    .map((r) => {
      const p = profByUser.get(r.userId) ?? null;
      r.profile = p;
      r.name = p?.full_name || p?.email || 'Teammate';
      r.onTimePct = r.completedWithDue > 0 ? Math.round((r.onTime / r.completedWithDue) * 100) : null;
      r.points = Math.max(0, r.completed * 10 + r.onTime * 5 - r.overdue * 3);
      return r;
    })
    .filter((r) => r.completed > 0 || r.open > 0)
    .sort((a, b) => b.points - a.points || b.completed - a.completed || a.open - b.open);

  rows.forEach((r, i) => { r.rank = i + 1; });

  const totals = {
    people: rows.length,
    open: rows.reduce((s, r) => s + r.open, 0),
    overdue: rows.reduce((s, r) => s + r.overdue, 0),
    completed: rows.reduce((s, r) => s + r.completed, 0),
  };

  return { rows, totals, isLoading: itemsQ.isLoading };
}
