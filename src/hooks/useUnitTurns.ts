import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;
const DOC_BUCKET = 'unit-photos';

export interface TurnLogEntry {
  id: string;
  turn_id: string;
  kind: string;
  body: string | null;
  actor_name: string | null;
  artifact_path: string | null;
  meta: any;
  created_at: string;
}

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

// Full detail for one turn: the turn + its audit log + unit/property labels.
export function useUnitTurnDetail(turnId: string | null) {
  return useQuery({
    queryKey: ['unit-turn-detail', turnId],
    enabled: !!turnId,
    queryFn: async () => {
      const { data: turn, error } = await db.from('unit_turns').select('*').eq('id', turnId).maybeSingle();
      if (error) throw error;
      const [logR, unitR] = await Promise.all([
        db.from('unit_turn_log').select('*').eq('turn_id', turnId).order('created_at', { ascending: true }),
        db.from('units').select('unit_number, property_id, properties(name)').eq('id', (turn as any)?.unit_id).maybeSingle(),
      ]);
      return {
        turn: turn as UnitTurn,
        log: (logR.data ?? []) as TurnLogEntry[],
        unitNumber: (unitR.data as any)?.unit_number ?? '',
        propertyName: (unitR.data as any)?.properties?.name ?? '',
      };
    },
  });
}

// Add an audit-log entry (note / finding addressed / equipment / document upload).
export function useAddTurnLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ turnId, kind, body, actorName, file }: { turnId: string; kind: string; body?: string; actorName?: string; file?: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      let artifact_path: string | null = null;
      if (file) {
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        artifact_path = `turns/${turnId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(DOC_BUCKET).upload(artifact_path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;
      }
      const { error } = await db.from('unit_turn_log').insert({ turn_id: turnId, kind, body: body ?? (file ? file.name : null), actor_name: actorName ?? null, artifact_path, created_by: user?.id ?? null });
      if (error) throw error;
    },
    onSuccess: (_r, v) => qc.invalidateQueries({ queryKey: ['unit-turn-detail', v.turnId] }),
    onError: (e: Error) => toast.error(e.message || 'Could not add entry'),
  });
}

// Close out a turn: all findings addressed + signed off. Logs the sign-off + close.
export function useCloseTurn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ turnId, signoffName, propertyId }: { turnId: string; signoffName: string; propertyId: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      await db.from('unit_turn_log').insert({ turn_id: turnId, kind: 'signed_off', body: `Signed off by ${signoffName}`, actor_name: signoffName, created_by: user?.id ?? null });
      await db.from('unit_turn_log').insert({ turn_id: turnId, kind: 'closed', body: 'Turn closed — all findings addressed', actor_name: signoffName, created_by: user?.id ?? null });
      const { error } = await db.from('unit_turns').update({ status: 'closed', findings_addressed: true, nspire_pending: false, closed_at: new Date().toISOString(), closed_by: user?.id ?? null }).eq('id', turnId);
      if (error) throw error;
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['unit-turn-detail', v.turnId] });
      qc.invalidateQueries({ queryKey: ['unit-turns', v.propertyId] });
      toast.success('Turn closed and signed off.');
    },
    onError: (e: Error) => toast.error(e.message || 'Could not close the turn'),
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
