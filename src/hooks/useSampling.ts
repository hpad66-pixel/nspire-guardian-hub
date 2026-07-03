import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SamplingLocation {
  id: string;
  project_id: string;
  name: string;
  code: string | null;
  location_type: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface SamplingResult {
  id: string;
  project_id: string;
  location_id: string;
  sample_date: string;
  parameter: string;
  value: number | null;
  unit: string | null;
  detection_limit: number | null;
  permit_limit: number | null;
  permit_limit_type: string | null;
  is_exceedance: boolean;
  exceedance_percent: number | null;
  method: string | null;
  sampled_by: string | null;
  notes: string | null;
  created_at: string;
  location?: { name: string; code: string | null } | null;
}

// Exceedance is stored (not recomputed) so reports/alerts can query it directly.
export function computeExceedance(value: number | null | undefined, limit: number | null | undefined) {
  if (value == null || limit == null || !(limit > 0)) return { is_exceedance: false, exceedance_percent: null as number | null };
  const over = value > limit;
  return { is_exceedance: over, exceedance_percent: over ? Math.round(((value - limit) / limit) * 1000) / 10 : null };
}

const locTable = () => supabase.from('sampling_locations' as never) as any;
const resTable = () => supabase.from('sampling_results' as never) as any;

export function useSamplingLocations(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['sampling-locations', projectId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as SamplingLocation[];
      const { data, error } = await locTable().select('*').eq('project_id', projectId).order('sort_order', { ascending: true }).order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SamplingLocation[];
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (input: Partial<SamplingLocation> & { name: string }) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await locTable().insert({
        project_id: projectId, name: input.name, code: input.code ?? null, location_type: input.location_type ?? null,
        latitude: input.latitude ?? null, longitude: input.longitude ?? null, description: input.description ?? null,
        sort_order: input.sort_order ?? 0, created_by: auth?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Location added'); },
    onError: (e: Error) => toast.error(`Couldn't add location: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<SamplingLocation>) => {
      const { error } = await locTable().update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't update: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await locTable().delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { invalidate(); toast.success('Location removed'); },
    onError: (e: Error) => toast.error(`Couldn't remove: ${e.message}`),
  });

  return { ...list, create, update, remove };
}

export function useSamplingResults(projectId: string | null | undefined) {
  const qc = useQueryClient();
  const key = ['sampling-results', projectId];
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const list = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!projectId) return [] as SamplingResult[];
      const { data, error } = await resTable()
        .select('*, location:sampling_locations(name, code)')
        .eq('project_id', projectId)
        .order('sample_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SamplingResult[];
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (input: Partial<SamplingResult> & { location_id: string; sample_date: string; parameter: string }) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const exc = computeExceedance(input.value ?? null, input.permit_limit ?? null);
      const { error } = await resTable().insert({
        project_id: projectId, location_id: input.location_id, sample_date: input.sample_date, parameter: input.parameter,
        value: input.value ?? null, unit: input.unit ?? null, detection_limit: input.detection_limit ?? null,
        permit_limit: input.permit_limit ?? null, permit_limit_type: input.permit_limit_type ?? null,
        is_exceedance: exc.is_exceedance, exceedance_percent: exc.exceedance_percent,
        method: input.method ?? null, sampled_by: input.sampled_by ?? null, notes: input.notes ?? null,
        created_by: auth?.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Result recorded'); },
    onError: (e: Error) => toast.error(`Couldn't record result: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await resTable().delete().eq('id', id); if (error) throw error; },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Couldn't remove: ${e.message}`),
  });

  return { ...list, create, remove };
}
