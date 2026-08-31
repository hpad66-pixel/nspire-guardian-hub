import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectPermitStatus } from '@/lib/permits/projectPermitStats';

export interface ProjectPermit {
  id: string;
  project_id: string;
  tenant_id: string;
  permit_number: string;
  issued_on: string | null;
  department: string | null;
  building: string | null;
  street_address: string | null;
  trade: string | null;
  contractor: string | null;
  description: string;
  status: ProjectPermitStatus;
  notes: string | null;
  responsible_party: string | null;
  next_action: string | null;
  city_confirmed_on: string | null;
  closed_on: string | null;
  client_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ProjectPermitInsert = Partial<ProjectPermit> & {
  project_id: string;
  permit_number: string;
  description: string;
};

const table = () => supabase.from('project_permits' as never) as any;

export function useProjectPermits(
  projectId: string | null | undefined,
  opts?: { clientVisibleOnly?: boolean },
) {
  const qc = useQueryClient();
  const key = ['project-permits', projectId, opts?.clientVisibleOnly ? 'client' : 'all'];

  const list = useQuery({
    queryKey: key,
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) return [] as ProjectPermit[];
      let q = table()
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('issued_on', { ascending: true, nullsFirst: false });
      if (opts?.clientVisibleOnly) {
        q = q.eq('client_visible', true);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProjectPermit[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Omit<ProjectPermitInsert, 'project_id'>) => {
      if (!projectId) throw new Error('No project');
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await table()
        .insert({
          project_id: projectId,
          permit_number: input.permit_number,
          description: input.description,
          issued_on: input.issued_on ?? null,
          department: input.department ?? null,
          building: input.building ?? null,
          street_address: input.street_address ?? null,
          trade: input.trade ?? null,
          contractor: input.contractor ?? null,
          status: input.status ?? 'open_active',
          notes: input.notes ?? null,
          responsible_party: input.responsible_party ?? null,
          next_action: input.next_action ?? null,
          client_visible: input.client_visible ?? true,
          sort_order: input.sort_order ?? 0,
          created_by: auth?.user?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as ProjectPermit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-permits', projectId] });
      toast.success('Permit added');
    },
    onError: (e: Error) => toast.error(`Couldn't add permit: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ProjectPermit>) => {
      const { data, error } = await table()
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as ProjectPermit;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-permits', projectId] });
      toast.success('Permit updated');
    },
    onError: (e: Error) => toast.error(`Couldn't update permit: ${e.message}`),
  });

  return { ...list, create, update };
}
