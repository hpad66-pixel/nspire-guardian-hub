import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Contractor {
  id: string;
  workspace_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  insurance_expiry: string | null;
  trade: string | null;
  status: 'active' | 'inactive' | 'suspended';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorScorecard {
  contractor: Contractor;
  totalWorkOrders: number;
  completedOnTime: number;
  completedLate: number;
  openWorkOrders: number;
  onTimeRate: number;
  totalPunchItems: number;
  openPunchItems: number;
  punchResolutionRate: number;
  totalPayApps: number;
  disputedPayApps: number;
  totalCertified: number;
  performanceScore: number;
  licenseExpiringSoon: boolean;
  insuranceExpiringSoon: boolean;
}

export function useContractors() {
  return useQuery({
    queryKey: ['contractors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Contractor[];
    },
  });
}

export function useContractor(id: string | null) {
  return useQuery({
    queryKey: ['contractor', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Contractor;
    },
    enabled: !!id,
  });
}

export function useContractorWorkOrders(contractorId: string | null) {
  return useQuery({
    queryKey: ['contractor-work-orders', contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, title, status, due_date, completed_at, created_at, property:properties(name), project:projects(name)')
        .eq('contractor_id', contractorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
}

export function useContractorPayApps(contractorId: string | null) {
  return useQuery({
    queryKey: ['contractor-pay-apps', contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from('pay_applications')
        .select('id, pay_app_number, period_from, period_to, status, submitted_date, certified_date, contractor_name, project:projects(name)')
        .eq('contractor_id', contractorId)
        .order('pay_app_number', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!contractorId,
  });
}

export function computeContractorScore(
  workOrders: Array<{ status: string; due_date: string; completed_at: string | null }>,
  payApps: Array<{ status: string }>,
  contractor: Contractor
): Omit<ContractorScorecard, 'contractor'> {
  const today = new Date();

  const completed = workOrders.filter(wo =>
    ['completed', 'verified', 'closed'].includes(wo.status)
  );
  const onTime = completed.filter(wo => {
    if (!wo.completed_at || !wo.due_date) return false;
    return new Date(wo.completed_at) <= new Date(wo.due_date);
  });
  const late = completed.filter(wo => {
    if (!wo.completed_at || !wo.due_date) return false;
    return new Date(wo.completed_at) > new Date(wo.due_date);
  });
  const open = workOrders.filter(wo =>
    !['completed', 'verified', 'closed'].includes(wo.status)
  );
  const onTimeRate = completed.length > 0
    ? Math.round((onTime.length / completed.length) * 100)
    : 100;

  const disputed = payApps.filter(p => p.status === 'disputed');

  const payAppScore = payApps.length > 0
    ? Math.round(((payApps.length - disputed.length) / payApps.length) * 100)
    : 100;

  // Weighted: on-time 60%, pay app compliance 40% (no punch items query for now)
  const performanceScore = Math.round(
    onTimeRate * 0.60 +
    payAppScore * 0.40
  );

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const licenseExpiringSoon = contractor.license_expiry
    ? (new Date(contractor.license_expiry).getTime() - today.getTime()) < thirtyDays
    : false;
  const insuranceExpiringSoon = contractor.insurance_expiry
    ? (new Date(contractor.insurance_expiry).getTime() - today.getTime()) < thirtyDays
    : false;

  return {
    totalWorkOrders: workOrders.length,
    completedOnTime: onTime.length,
    completedLate: late.length,
    openWorkOrders: open.length,
    onTimeRate,
    totalPunchItems: 0,
    openPunchItems: 0,
    punchResolutionRate: 100,
    totalPayApps: payApps.length,
    disputedPayApps: disputed.length,
    totalCertified: 0,
    performanceScore,
    licenseExpiringSoon,
    insuranceExpiringSoon,
  };
}

export function useCreateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Contractor, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('contractors').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractors'] });
      toast.success('Contractor added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateContractor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Contractor> & { id: string }) => {
      const { error } = await supabase.from('contractors').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['contractors'] });
      qc.invalidateQueries({ queryKey: ['contractor', vars.id] });
      toast.success('Contractor updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
