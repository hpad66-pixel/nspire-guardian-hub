import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspace } from '@/hooks/useWorkspace';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientPortal {
  id: string;
  workspace_id: string;
  name: string;
  portal_type: 'client' | 'project';
  project_id: string | null;
  client_name: string | null;
  client_contact_name: string | null;
  client_contact_email: string | null;
  brand_logo_url: string | null;
  brand_accent_color: string;
  welcome_message: string | null;
  portal_slug: string;
  is_active: boolean;
  status: 'draft' | 'active' | 'archived';
  shared_modules: string[];
  pending_requests_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PortalAccess {
  id: string;
  portal_id: string;
  email: string;
  name: string | null;
  company: string | null;
  password_hash: string | null;
  magic_link_token: string | null;
  magic_link_expires_at: string | null;
  last_login_at: string | null;
  login_count: number;
  is_active: boolean;
  invited_at: string;
  invited_by: string;
  created_at: string;
  updated_at: string;
}

export interface PortalExclusion {
  id: string;
  portal_id: string;
  module: string;
  record_id: string;
  excluded_by: string;
  reason: string | null;
  created_at: string;
}

export interface PortalDocumentRequest {
  id: string;
  portal_id: string;
  requested_by_email: string;
  requested_by_name: string | null;
  request_type: 'document' | 'update' | 'clarification';
  module: string | null;
  subject: string;
  message: string;
  status: 'pending' | 'in_review' | 'fulfilled' | 'declined';
  response_message: string | null;
  responded_by: string | null;
  responded_at: string | null;
  fulfilled_record_id: string | null;
  fulfilled_module: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalActivity {
  id: string;
  portal_id: string;
  actor_email: string;
  actor_name: string | null;
  activity_type: 'login' | 'view_module' | 'download_document' | 'submit_request' | 'view_record';
  module: string | null;
  record_id: string | null;
  description: string | null;
  created_at: string;
}

export interface PortalSession {
  portalId: string;
  email: string;
  name: string | null;
  accessId: string;
  authenticated: boolean;
  portalSlug: string;
}

// ─── Portal Tier Limits ───────────────────────────────────────────────────────

export const PORTAL_LIMITS: Record<string, number> = {
  starter: 1,
  professional: 3,
  business: 10,
  enterprise: Infinity,
};

// ─── Workspace hook (fallback) ────────────────────────────────────────────────

function useCurrentWorkspaceId() {
  return useQuery({
    queryKey: ['current-workspace-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();
      return data?.workspace_id ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Hooks: Inside APAS OS ────────────────────────────────────────────────────

export function usePortals() {
  const { data: workspaceId } = useCurrentWorkspaceId();

  return useQuery({
    queryKey: ['portals', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from('client_portals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientPortal[];
    },
    enabled: !!workspaceId,
  });
}

export function usePortal(id: string | undefined) {
  return useQuery({
    queryKey: ['portal', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('client_portals')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ClientPortal;
    },
    enabled: !!id,
  });
}

export function usePortalBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['portal-by-slug', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('client_portals')
        .select('*')
        .eq('portal_slug', slug)
        .single();
      if (error) throw error;
      return data as ClientPortal;
    },
    enabled: !!slug,
  });
}

export function usePortalCount() {
  const { data: portals = [], isLoading } = usePortals();
  const count = portals.length;
  // Default to professional plan — in production this would come from subscription
  const limit = PORTAL_LIMITS['professional'] ?? 3;
  const canCreate = count < limit;
  return { count, limit, canCreate, isLoading };
}

export function useTotalPendingRequests() {
  const { data: portals = [] } = usePortals();
  return portals.reduce((sum, p) => sum + (p.pending_requests_count ?? 0), 0);
}

export function useCreatePortal() {
  const qc = useQueryClient();
  const { data: workspaceId } = useCurrentWorkspaceId();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      portal_type: 'client' | 'project';
      project_id?: string;
      client_name?: string;
      client_contact_name?: string;
      client_contact_email?: string;
      brand_accent_color?: string;
      welcome_message?: string;
      portal_slug: string;
      shared_modules: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !workspaceId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('client_portals')
        .insert({
          ...input,
          workspace_id: workspaceId,
          created_by: user.id,
          status: input.client_contact_email ? 'active' : 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as ClientPortal;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portals'] });
      toast.success('Portal created ✓');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create portal');
    },
  });
}

export function useUpdatePortal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClientPortal> }) => {
      const { data, error } = await supabase
        .from('client_portals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ClientPortal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['portal', data.id] });
      qc.invalidateQueries({ queryKey: ['portals'] });
      toast.success('Portal updated ✓');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update portal');
    },
  });
}

export function useArchivePortal() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_portals')
        .update({ status: 'archived', is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portals'] });
      toast.success('Portal archived');
    },
  });
}

// ─── Portal Access ────────────────────────────────────────────────────────────

export function usePortalAccess(portalId: string | undefined) {
  return useQuery({
    queryKey: ['portal-access', portalId],
    queryFn: async () => {
      if (!portalId) return [];
      const { data, error } = await supabase
        .from('portal_access')
        .select('*')
        .eq('portal_id', portalId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PortalAccess[];
    },
    enabled: !!portalId,
  });
}

export function useInviteContact(portalId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; name?: string; company?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('portal_access')
        .upsert({
          portal_id: portalId,
          email: input.email,
          name: input.name ?? null,
          company: input.company ?? null,
          magic_link_token: token,
          magic_link_expires_at: expires,
          invited_by: user.id,
          is_active: true,
        }, { onConflict: 'portal_id,email' })
        .select()
        .single();

      if (error) throw error;
      return data as PortalAccess;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['portal-access', portalId] });
      toast.success(`Invite sent to ${vars.email} ✓`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send invite');
    },
  });
}

export function useRevokeAccess() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, portalId }: { id: string; portalId: string }) => {
      const { error } = await supabase
        .from('portal_access')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
      return portalId;
    },
    onSuccess: (portalId) => {
      qc.invalidateQueries({ queryKey: ['portal-access', portalId] });
      toast.success('Access revoked');
    },
  });
}

// ─── Exclusions ───────────────────────────────────────────────────────────────

export function usePortalExclusions(portalId: string | undefined, module?: string) {
  return useQuery({
    queryKey: ['portal-exclusions', portalId, module],
    queryFn: async () => {
      if (!portalId) return [];
      let q = supabase
        .from('portal_exclusions')
        .select('*')
        .eq('portal_id', portalId);
      if (module) q = q.eq('module', module);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PortalExclusion[];
    },
    enabled: !!portalId,
  });
}

export function useToggleExclusion() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      portalId,
      module,
      recordId,
      excluded,
    }: {
      portalId: string;
      module: string;
      recordId: string;
      excluded: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (excluded) {
        const { error } = await supabase.from('portal_exclusions').insert({
          portal_id: portalId,
          module,
          record_id: recordId,
          excluded_by: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('portal_exclusions')
          .delete()
          .eq('portal_id', portalId)
          .eq('module', module)
          .eq('record_id', recordId);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['portal-exclusions', vars.portalId] });
    },
  });
}

// ─── Document Requests ────────────────────────────────────────────────────────

export function usePortalRequests(portalId: string | undefined, status?: string) {
  return useQuery({
    queryKey: ['portal-requests', portalId, status],
    queryFn: async () => {
      if (!portalId) return [];
      let q = supabase
        .from('portal_document_requests')
        .select('*')
        .eq('portal_id', portalId)
        .order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PortalDocumentRequest[];
    },
    enabled: !!portalId,
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      portalId,
      responseMessage,
      newStatus,
      fulfilledRecordId,
      fulfilledModule,
    }: {
      id: string;
      portalId: string;
      responseMessage: string;
      newStatus: 'fulfilled' | 'declined' | 'in_review';
      fulfilledRecordId?: string;
      fulfilledModule?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('portal_document_requests')
        .update({
          status: newStatus,
          response_message: responseMessage,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
          fulfilled_record_id: fulfilledRecordId ?? null,
          fulfilled_module: fulfilledModule ?? null,
        })
        .eq('id', id);

      if (error) throw error;
      return portalId;
    },
    onSuccess: (portalId) => {
      qc.invalidateQueries({ queryKey: ['portal-requests', portalId] });
      qc.invalidateQueries({ queryKey: ['portals'] });
      toast.success('Response sent ✓');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to send response');
    },
  });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export function usePortalActivity(portalId: string | undefined) {
  return useQuery({
    queryKey: ['portal-activity', portalId],
    queryFn: async () => {
      if (!portalId) return [];
      const { data, error } = await supabase
        .from('portal_activity')
        .select('*')
        .eq('portal_id', portalId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PortalActivity[];
    },
    enabled: !!portalId,
  });
}

// ─── Portal-side session helpers (localStorage, no Supabase auth) ─────────────

const PORTAL_SESSION_KEY = 'apas_portal_session';

export function getPortalSession(): PortalSession | null {
  try {
    const raw = localStorage.getItem(PORTAL_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PortalSession;
  } catch {
    return null;
  }
}

export function setPortalSession(session: PortalSession): void {
  try {
    localStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export function clearPortalSession(): void {
  try {
    localStorage.removeItem(PORTAL_SESSION_KEY);
  } catch {}
}

export function isPortalAuthenticated(portalId?: string): boolean {
  const session = getPortalSession();
  if (!session?.authenticated) return false;
  if (portalId && session.portalId !== portalId) return false;
  return true;
}

import { useState, useEffect } from 'react';

export function usePortalSession(expectedPortalId?: string) {
  const [session, setSession] = useState<PortalSession | null>(() => getPortalSession());

  useEffect(() => {
    const s = getPortalSession();
    setSession(s);
  }, []);

  const isAuthenticated = session?.authenticated === true &&
    (!expectedPortalId || session.portalId === expectedPortalId);

  return { session, isAuthenticated };
}

// ─── Slug generation helper ───────────────────────────────────────────────────

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export async function checkSlugAvailability(slug: string): Promise<boolean> {
  if (!slug || slug.length < 3) return false;
  const { data } = await supabase
    .from('client_portals')
    .select('id')
    .eq('portal_slug', slug)
    .maybeSingle();
  return !data;
}
