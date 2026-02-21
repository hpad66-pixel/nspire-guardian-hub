import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useModules } from '@/contexts/ModuleContext';
import { useUserPermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Credential {
  id: string;
  workspace_id: string;
  holder_id: string;
  credential_type: string;
  custom_type_label: string | null;
  issuing_authority: string | null;
  credential_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  renewal_url: string | null;
  document_url: string | null;
  status: string;
  notes: string | null;
  is_org_credential: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data (admin view)
  holder?: {
    user_id: string;
    full_name: string | null;
    avatar_url: string | null;
    job_title: string | null;
    department: string | null;
  };
}

export interface ShareLink {
  id: string;
  credential_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  accessed_at: string | null;
  access_count: number;
  revoked: boolean;
  created_at: string;
}

export type CredentialStatus = 'current' | 'expiring_soon' | 'expired' | 'no_expiry';

export interface AddCredentialInput {
  credential_type: string;
  custom_type_label?: string;
  issuing_authority?: string;
  credential_number?: string;
  issue_date?: string;
  expiry_date?: string;
  renewal_url?: string;
  notes?: string;
  is_org_credential?: boolean;
  holder_id?: string; // For admin adding on behalf of someone
}

// ─── Credential Type Constants ────────────────────────────────────────────────

export const CREDENTIAL_CATEGORIES = [
  {
    key: 'professional_license',
    label: 'Professional License',
    icon: '📋',
    types: [
      'General Contractor License',
      'PE (Professional Engineer)',
      'Architect License',
      'Real Estate Broker',
      'Property Manager License',
    ],
  },
  {
    key: 'safety_certification',
    label: 'Safety Certification',
    icon: '🦺',
    types: [
      'OSHA 10-Hour',
      'OSHA 30-Hour',
      'First Aid / CPR',
      'Forklift Operator',
      'Lead Renovator (RRP)',
      'Asbestos Inspector/Supervisor',
      'Hazmat Transportation (DOT)',
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance',
    icon: '🛡️',
    types: [
      'General Liability Certificate',
      'Workers Compensation',
      'Professional Liability (E&O)',
      'Commercial Auto',
    ],
  },
  {
    key: 'vehicle_equipment',
    label: 'Vehicle & Equipment',
    icon: '🚗',
    types: [
      'Vehicle Registration',
      'Commercial Driver\'s License (CDL)',
      'Equipment Inspection Certificate',
    ],
  },
  {
    key: 'other',
    label: 'Other',
    icon: '➕',
    types: [
      'Notary Commission',
      'Electrical License',
      'Custom',
    ],
  },
] as const;

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function getCredentialStatus(expiryDate: string | null): CredentialStatus {
  if (!expiryDate) return 'no_expiry';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return 'expired';
  const daysUntil = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 60) return 'expiring_soon';
  return 'current';
}

export function getDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatExpiryLabel(expiryDate: string | null, status: CredentialStatus): string {
  if (status === 'no_expiry') return 'No expiry date';
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return 'No expiry date';
  if (status === 'expired') {
    const absDays = Math.abs(days);
    return absDays === 1 ? 'Expired yesterday' : `Expired ${absDays} days ago`;
  }
  if (status === 'expiring_soon') return `${days} days left — renew soon`;
  return `${days} days left`;
}

export function formatExpiryDate(dateStr: string | null): string {
  if (!dateStr) return 'No expiry set';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── useMyCredentials ─────────────────────────────────────────────────────────

export function useMyCredentials() {
  const { isModuleEnabled } = useModules();
  const { user } = useAuth();
  const enabled = isModuleEnabled('credentialWalletEnabled') && !!user;

  return useQuery({
    queryKey: ['credentials', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('holder_id', user!.id)
        .neq('status', 'deleted')
        .order('expiry_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Credential[];
    },
    enabled,
  });
}

// ─── useAllCredentials ────────────────────────────────────────────────────────

export function useAllCredentials() {
  const { isModuleEnabled } = useModules();
  const { isAdmin } = useUserPermissions();
  const enabled = isModuleEnabled('credentialWalletEnabled') && isAdmin;

  return useQuery({
    queryKey: ['credentials', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credentials')
        .select(`
          *,
          holder:profiles!credentials_holder_id_fkey(user_id, full_name, avatar_url, job_title, department)
        `)
        .neq('status', 'deleted')
        .order('expiry_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Credential[];
    },
    enabled,
  });
}

// ─── useAddCredential ─────────────────────────────────────────────────────────

export function useAddCredential() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: AddCredentialInput & { workspace_id: string }) => {
      const holderId = input.holder_id ?? user?.id;
      if (!holderId) throw new Error('No holder ID');

      const { data, error } = await supabase
        .from('credentials')
        .insert({
          workspace_id: input.workspace_id,
          holder_id: holderId,
          credential_type: input.credential_type,
          custom_type_label: input.custom_type_label ?? null,
          issuing_authority: input.issuing_authority ?? null,
          credential_number: input.credential_number ?? null,
          issue_date: input.issue_date || null,
          expiry_date: input.expiry_date || null,
          renewal_url: input.renewal_url ?? null,
          notes: input.notes ?? null,
          is_org_credential: input.is_org_credential ?? false,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw error;
      return data as Credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Credential added ✓');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add credential');
    },
  });
}

// ─── useUpdateCredential ──────────────────────────────────────────────────────

export function useUpdateCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Credential> & { id: string }) => {
      const { data, error } = await supabase
        .from('credentials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Credential;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Credential updated ✓');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update credential');
    },
  });
}

// ─── useDeleteCredential ──────────────────────────────────────────────────────

export function useDeleteCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credentials')
        .update({ status: 'deleted' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Credential removed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove credential');
    },
  });
}

// ─── useUploadCredentialDocument ──────────────────────────────────────────────

export function useUploadCredentialDocument(credentialId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, workspaceId }: { file: File; workspaceId: string }) => {
      const ext = file.name.split('.').pop();
      const path = `${workspaceId}/${user!.id}/${credentialId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('credentials-documents')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('credentials-documents')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('credentials')
        .update({ document_url: publicUrl })
        .eq('id', credentialId);
      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to upload document');
    },
  });

  return {
    upload: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    progress: uploadMutation.isPending ? 50 : 0,
  };
}

// ─── useGenerateShareLink ─────────────────────────────────────────────────────

export function useGenerateShareLink() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (credentialId: string): Promise<string> => {
      // Generate a short random token
      const array = new Uint8Array(6);
      crypto.getRandomValues(array);
      const token = Array.from(array, b => b.toString(36)).join('').slice(0, 8);

      const { error } = await supabase
        .from('credential_share_links')
        .insert({
          credential_id: credentialId,
          token,
          created_by: user!.id,
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        });
      if (error) throw error;

      const shareUrl = `${window.location.origin}/share/credential/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied — expires in 72 hours');
      return shareUrl;
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to generate share link');
    },
  });
}

// ─── useRevokeShareLink ───────────────────────────────────────────────────────

export function useRevokeShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shareLinkId: string) => {
      const { error } = await supabase
        .from('credential_share_links')
        .update({ revoked: true })
        .eq('id', shareLinkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      toast.success('Share link revoked');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to revoke share link');
    },
  });
}

// ─── useCredentialShareLinks ──────────────────────────────────────────────────

export function useCredentialShareLinks(credentialId: string) {
  return useQuery({
    queryKey: ['credential-share-links', credentialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credential_share_links')
        .select('*')
        .eq('credential_id', credentialId)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ShareLink[];
    },
    enabled: !!credentialId,
  });
}

// ─── sendCredentialExpiryAlert (placeholder) ─────────────────────────────────

export function sendCredentialExpiryAlert(
  credentialId: string,
  holderEmail: string,
  daysUntilExpiry: number
): void {
  // TODO: Implement full alert system in next session
  // Alert cadence:
  //   90 days → informational email
  //   60 days → email + in-app notification
  //   30 days → email + push
  //    7 days → email + push (urgent)
  //    0 days → mark expired, notify holder + admin
  //   After   → weekly until renewed or waived
  console.log('[CredentialAlert] placeholder:', { credentialId, holderEmail, daysUntilExpiry });
}
