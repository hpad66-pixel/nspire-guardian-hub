import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveCurrentWorkspaceId } from '@/lib/tenant';

export interface BidPackage {
  id: string;
  project_id: string;
  title: string;
  trade: string | null;
  scope: string | null;
  due_date: string | null;
  status: 'open' | 'awarded' | 'closed';
  awarded_invitee_id: string | null;
  estimate: number | null;
  created_at: string;
}

export interface BidInvitee {
  id: string;
  bid_package_id: string;
  vendor_name: string;
  vendor_company: string | null;
  vendor_email: string | null;
  status: 'invited' | 'declined' | 'submitted' | 'awarded';
  bid_amount: number | null;
  notes: string | null;
  submitted_at: string | null;
}

const db = () => supabase as any;

export function useBidPackages(projectId: string | null) {
  const qc = useQueryClient();
  const key = ['bid-packages', projectId];

  const list = useQuery({
    queryKey: key,
    enabled: !!projectId,
    queryFn: async (): Promise<BidPackage[]> => {
      const { data, error } = await db().from('bid_packages').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { title: string; trade?: string; scope?: string; due_date?: string | null; estimate?: number | null }) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error('No workspace');
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await db().from('bid_packages').insert({
        tenant_id, project_id: projectId, created_by: user?.id,
        title: input.title.trim(), trade: input.trade?.trim() || null, scope: input.scope?.trim() || null,
        due_date: input.due_date || null, estimate: input.estimate ?? null,
      }).select().single();
      if (error) throw error;
      return data as BidPackage;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BidPackage['status'] }) => {
      const { error } = await db().from('bid_packages').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('bid_packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { ...list, create, setStatus, remove };
}

export function useBidInvitees(packageId: string | null, projectId: string | null) {
  const qc = useQueryClient();
  const key = ['bid-invitees', packageId];
  const bust = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['bid-packages', projectId] }); };

  const list = useQuery({
    queryKey: key,
    enabled: !!packageId,
    queryFn: async (): Promise<BidInvitee[]> => {
      const { data, error } = await db().from('bid_invitees').select('*').eq('bid_package_id', packageId).order('bid_amount', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const addInvitee = useMutation({
    mutationFn: async (input: { vendor_name: string; vendor_company?: string; vendor_email?: string }) => {
      const tenant_id = await resolveCurrentWorkspaceId();
      if (!tenant_id) throw new Error('No workspace');
      const { error } = await db().from('bid_invitees').insert({
        tenant_id, bid_package_id: packageId,
        vendor_name: input.vendor_name.trim(), vendor_company: input.vendor_company?.trim() || null, vendor_email: input.vendor_email?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: bust,
  });

  const updateInvitee = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BidInvitee> }) => {
      // Recording a bid amount marks it submitted.
      const p: any = { ...patch };
      if (patch.bid_amount != null && !patch.status) { p.status = 'submitted'; p.submitted_at = new Date().toISOString(); }
      const { error } = await db().from('bid_invitees').update(p).eq('id', id);
      if (error) throw error;
    },
    onSuccess: bust,
  });

  const removeInvitee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('bid_invitees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: bust,
  });

  /** Award a package to one invitee: mark it awarded, others stay, package → awarded. */
  const award = useMutation({
    mutationFn: async ({ inviteeId, pkgId }: { inviteeId: string; pkgId: string }) => {
      await db().from('bid_invitees').update({ status: 'submitted' }).eq('bid_package_id', pkgId).eq('status', 'awarded');
      await db().from('bid_invitees').update({ status: 'awarded' }).eq('id', inviteeId);
      const { error } = await db().from('bid_packages').update({ status: 'awarded', awarded_invitee_id: inviteeId }).eq('id', pkgId);
      if (error) throw error;
    },
    onSuccess: bust,
  });

  return { ...list, addInvitee, updateInvitee, removeInvitee, award };
}
