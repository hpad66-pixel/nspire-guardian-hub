import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

export interface UnitTurn {
  id: string;
  unit_id: string;
  property_id: string | null;
  status: 'open' | 'inspecting' | 'closed';
  trigger_source: 'tenant_moved_out' | 'unit_vacant' | 'manual';
  nspire_required: boolean;
  nspire_pending: boolean;
  inspection_id: string | null;
  vacated_at: string | null;
  turned_over_at: string;
  findings_count: number;
  findings_addressed: boolean;
  closed_at: string | null;
}

// Open (not closed) turns for a property, keyed by unit for tile badges.
export function useUnitTurns(propertyId: string | null) {
  return useQuery({
    queryKey: ['unit-turns', propertyId],
    enabled: !!propertyId,
    queryFn: async () => {
      const { data, error } = await db.from('unit_turns')
        .select('*').eq('property_id', propertyId).neq('status', 'closed')
        .order('turned_over_at', { ascending: false });
      if (error) throw error;
      const turns = (data ?? []) as UnitTurn[];
      const byUnit: Record<string, UnitTurn> = {};
      for (const t of turns) if (!byUnit[t.unit_id]) byUnit[t.unit_id] = t;
      return { turns, byUnit };
    },
  });
}

export function useStartUnitTurn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ unitId }: { unitId: string; propertyId: string | null }) => {
      const { error } = await db.rpc('open_unit_turn', { p_unit_id: unitId, p_source: 'manual', p_vacated: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['unit-turns', v.propertyId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not start the turn'),
  });
}

// "Conduct now": create a unit NSPIRE inspection, link it, move to inspecting.
export function useConductTurnInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ turn }: { turn: UnitTurn; propertyId: string | null }): Promise<string> => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: insp, error } = await db.from('inspections').insert({
        property_id: turn.property_id, unit_id: turn.unit_id, area: 'unit',
        inspector_id: user?.id ?? null, inspection_date: new Date().toISOString().slice(0, 10),
        status: 'in_progress', notes: 'Auto-triggered by unit turnover',
      }).select('id').single();
      if (error) throw error;
      const inspId = (insp as any).id as string;
      await db.from('unit_turns').update({ status: 'inspecting', nspire_pending: false, inspection_id: inspId }).eq('id', turn.id);
      await db.from('unit_turn_log').insert({ turn_id: turn.id, kind: 'inspection_triggered', body: 'NSPIRE inspection started', created_by: user?.id ?? null });
      return inspId;
    },
    onSuccess: (_id, v) => { qc.invalidateQueries({ queryKey: ['unit-turns', v.propertyId] }); qc.invalidateQueries({ queryKey: ['inspections'] }); },
    onError: (e: Error) => toast.error(e.message || 'Could not start the inspection'),
  });
}

// "Conduct later": keep it pending (routes to the dashboard / property log).
export function useDeferTurnInspection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ turn }: { turn: UnitTurn; propertyId: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      await db.from('unit_turns').update({ nspire_pending: true }).eq('id', turn.id);
      await db.from('unit_turn_log').insert({ turn_id: turn.id, kind: 'inspection_deferred', body: 'Inspection deferred — routed as a pending action item', created_by: user?.id ?? null });
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['unit-turns', v.propertyId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not update'),
  });
}
