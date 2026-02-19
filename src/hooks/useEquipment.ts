import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface EquipmentCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface WorkspaceEquipmentConfig {
  id: string;
  workspace_id: string;
  active_category_slugs: string[];
  custom_category_name: string | null;
  custom_category_icon: string | null;
  setup_completed: boolean;
  asset_limit: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentAsset {
  id: string;
  workspace_id: string;
  name: string;
  asset_tag: string | null;
  category_slug: string;
  make: string | null;
  model: string | null;
  year: number | null;
  serial_number: string | null;
  vin: string | null;
  license_plate: string | null;
  color: string | null;
  assigned_to: string | null;
  assigned_location: string | null;
  status: 'available' | 'checked_out' | 'in_maintenance' | 'retired';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  notes: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_profile?: { full_name: string | null; avatar_url: string | null } | null;
  active_checkout?: EquipmentCheckout | null;
  documents?: EquipmentDocument[];
}

export interface EquipmentDocument {
  id: string;
  asset_id: string;
  workspace_id: string;
  document_type: string;
  custom_type_label: string | null;
  document_number: string | null;
  issuing_authority: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  notes: string | null;
  status: 'active' | 'deleted';
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentCheckout {
  id: string;
  asset_id: string;
  workspace_id: string;
  checked_out_by: string;
  checked_out_at: string;
  expected_return: string | null;
  purpose: string | null;
  destination: string | null;
  checked_in_by: string | null;
  checked_in_at: string | null;
  return_notes: string | null;
  condition_on_return: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  checked_out_profile?: { full_name: string | null; avatar_url: string | null } | null;
}

export type DocumentStatus = 'current' | 'expiring_soon' | 'expired' | 'no_expiry';
export type AssetComplianceStatus = 'current' | 'expiring_soon' | 'expired' | 'no_docs';

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────
export function getDocumentStatus(expiry_date: string | null): DocumentStatus {
  if (!expiry_date) return 'no_expiry';
  const days = differenceInDays(parseISO(expiry_date), new Date());
  if (days < 0) return 'expired';
  if (days <= 60) return 'expiring_soon';
  return 'current';
}

export function getAssetComplianceStatus(documents: EquipmentDocument[]): AssetComplianceStatus {
  const active = documents.filter(d => d.status === 'active');
  if (active.length === 0) return 'no_docs';
  const statuses = active.map(d => getDocumentStatus(d.expiry_date));
  if (statuses.includes('expired')) return 'expired';
  if (statuses.includes('expiring_soon')) return 'expiring_soon';
  return 'current';
}

export function formatExpiryLabel(expiry_date: string | null, status: DocumentStatus): string {
  if (!expiry_date || status === 'no_expiry') return 'No expiry set';
  const days = differenceInDays(parseISO(expiry_date), new Date());
  if (days < 0) return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Expires today';
  if (days <= 30) return `${days} days left — renew soon`;
  return `${days} days left`;
}

export function getDocumentTypes(category_slug: string): string[] {
  switch (category_slug) {
    case 'vehicles':
      return ['registration', 'insurance', 'dot_inspection', 'emissions', 'warranty', 'other'];
    case 'heavy-equipment':
      return ['insurance', 'inspection', 'warranty', 'other'];
    case 'field-equipment':
      return ['calibration', 'warranty', 'inspection', 'other'];
    default:
      return ['insurance', 'inspection', 'warranty', 'other'];
  }
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  registration: 'Registration',
  insurance: 'Insurance',
  dot_inspection: 'DOT Inspection',
  emissions: 'Emissions',
  calibration: 'Calibration Certificate',
  inspection: 'Inspection Certificate',
  warranty: 'Warranty',
  other: 'Other',
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────
async function getWorkspaceId(): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('workspace_id').maybeSingle();
  return data?.workspace_id ?? null;
}

export function useMasterCategories() {
  return useQuery({
    queryKey: ['equipment-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as EquipmentCategory[];
    },
  });
}

export function useWorkspaceEquipmentConfig() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workspace-equipment-config'],
    enabled: !!user,
    queryFn: async () => {
      const wsId = await getWorkspaceId();
      if (!wsId) return null;
      const { data, error } = await supabase
        .from('workspace_equipment_config')
        .select('*')
        .eq('workspace_id', wsId)
        .maybeSingle();
      if (error) throw error;
      return data as WorkspaceEquipmentConfig | null;
    },
  });
}

export function useSaveEquipmentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      active_category_slugs: string[];
      custom_category_name?: string | null;
      custom_category_icon?: string | null;
      setup_completed: boolean;
    }) => {
      const wsId = await getWorkspaceId();
      if (!wsId) throw new Error('No workspace');
      const { error } = await supabase
        .from('workspace_equipment_config')
        .upsert({
          workspace_id: wsId,
          ...payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workspace_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-equipment-config'] });
      toast.success('Equipment settings saved ✓');
    },
    onError: () => toast.error('Failed to save settings'),
  });
}

export function useActivatedCategories() {
  const { data: categories = [] } = useMasterCategories();
  const { data: config } = useWorkspaceEquipmentConfig();

  const slugs = config?.active_category_slugs ?? [];
  const activated = categories.filter(c => slugs.includes(c.slug));

  if (config?.custom_category_name) {
    activated.push({
      id: 'custom',
      name: config.custom_category_name,
      slug: 'custom',
      icon: config.custom_category_icon ?? 'Box',
      sort_order: 999,
      is_active: true,
      created_at: '',
    });
  }

  return { categories: activated, config };
}

export function useAssets(filters?: {
  category_slug?: string;
  status?: string;
  compliance?: string;
}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['equipment-assets', filters],
    enabled: !!user,
    queryFn: async () => {
      const wsId = await getWorkspaceId();
      if (!wsId) return [];

      let q = supabase
        .from('equipment_assets')
        .select(`
          *,
          assigned_profile:profiles!equipment_assets_assigned_to_fkey(full_name, avatar_url),
          active_checkout:equipment_checkouts(
            id, checked_out_by, checked_out_at, expected_return,
            purpose, destination, is_active,
            checked_out_profile:profiles!equipment_checkouts_checked_out_by_fkey(full_name, avatar_url)
          ),
          documents:equipment_documents(*)
        `)
        .eq('workspace_id', wsId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (filters?.category_slug && filters.category_slug !== 'all') {
        q = q.eq('category_slug', filters.category_slug);
      }
      if (filters?.status && filters.status !== 'all') {
        q = q.eq('status', filters.status);
      }

      const { data, error } = await q;
      if (error) throw error;

      let assets = (data ?? []).map(a => ({
        ...a,
        active_checkout: (a.active_checkout as EquipmentCheckout[] | null)?.find(c => c.is_active) ?? null,
        documents: (a.documents as EquipmentDocument[] | null)?.filter(d => d.status === 'active') ?? [],
      })) as EquipmentAsset[];

      // Compliance filter
      if (filters?.compliance && filters.compliance !== 'all') {
        assets = assets.filter(a => {
          const cs = getAssetComplianceStatus(a.documents ?? []);
          return filters.compliance === cs || (filters.compliance === 'expiring' && cs === 'expiring_soon');
        });
      }

      return assets;
    },
  });
}

export function useAsset(id: string | null) {
  return useQuery({
    queryKey: ['equipment-asset', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_assets')
        .select(`
          *,
          assigned_profile:profiles!equipment_assets_assigned_to_fkey(full_name, avatar_url),
          documents:equipment_documents(*),
          checkouts:equipment_checkouts(
            *,
            checked_out_profile:profiles!equipment_checkouts_checked_out_by_fkey(full_name, avatar_url),
            checked_in_profile:profiles!equipment_checkouts_checked_in_by_fkey(full_name, avatar_url)
          )
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as EquipmentAsset & {
        checkouts: (EquipmentCheckout & {
          checked_in_profile?: { full_name: string | null; avatar_url: string | null } | null;
        })[];
      };
    },
  });
}

export function useAssetCount() {
  const { user } = useAuth();
  const { data: config } = useWorkspaceEquipmentConfig();
  return useQuery({
    queryKey: ['equipment-asset-count'],
    enabled: !!user,
    queryFn: async () => {
      const wsId = await getWorkspaceId();
      if (!wsId) return { count: 0, limit: config?.asset_limit ?? 50 };
      const { count, error } = await supabase
        .from('equipment_assets')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsId)
        .eq('is_active', true);
      if (error) throw error;
      return { count: count ?? 0, limit: config?.asset_limit ?? 50 };
    },
  });
}

export function useAddAsset() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      asset: Omit<EquipmentAsset, 'id' | 'workspace_id' | 'created_by' | 'created_at' | 'updated_at' | 'assigned_profile' | 'active_checkout' | 'documents'>;
      documents?: Array<{
        document_type: string;
        custom_type_label?: string | null;
        document_number?: string | null;
        issuing_authority?: string | null;
        issue_date?: string | null;
        expiry_date?: string | null;
        document_url?: string | null;
        notes?: string | null;
      }>;
    }) => {
      const wsId = await getWorkspaceId();
      if (!wsId || !user) throw new Error('No workspace/user');

      const { data: asset, error: ae } = await supabase
        .from('equipment_assets')
        .insert({ ...payload.asset, workspace_id: wsId, created_by: user.id })
        .select()
        .single();
      if (ae) throw ae;

      if (payload.documents?.length) {
        const docs = payload.documents.map(d => ({
          ...d,
          asset_id: asset.id,
          workspace_id: wsId,
          uploaded_by: user.id,
        }));
        const { error: de } = await supabase.from('equipment_documents').insert(docs);
        if (de) throw de;
      }

      return asset;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      qc.invalidateQueries({ queryKey: ['equipment-asset-count'] });
      toast.success('Asset added ✓');
    },
    onError: () => toast.error('Failed to add asset'),
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EquipmentAsset> & { id: string }) => {
      const { error } = await supabase
        .from('equipment_assets')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      qc.invalidateQueries({ queryKey: ['equipment-asset', vars.id] });
      toast.success('Asset updated ✓');
    },
    onError: () => toast.error('Failed to update asset'),
  });
}

export function useRetireAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_assets')
        .update({ is_active: false, status: 'retired', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      qc.invalidateQueries({ queryKey: ['equipment-asset-count'] });
      toast.success('Asset retired');
    },
    onError: () => toast.error('Failed to retire asset'),
  });
}

export function useAddDocument() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Omit<EquipmentDocument, 'id' | 'uploaded_by' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('No user');
      const { error } = await supabase
        .from('equipment_documents')
        .insert({ ...payload, uploaded_by: user.id });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      qc.invalidateQueries({ queryKey: ['equipment-asset', vars.asset_id] });
      qc.invalidateQueries({ queryKey: ['equipment-expiring-docs'] });
      toast.success('Document added ✓');
    },
    onError: () => toast.error('Failed to add document'),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EquipmentDocument> & { id: string }) => {
      const { error } = await supabase
        .from('equipment_documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      qc.invalidateQueries({ queryKey: ['equipment-expiring-docs'] });
      toast.success('Document updated ✓');
    },
    onError: () => toast.error('Failed to update document'),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipment_documents')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      qc.invalidateQueries({ queryKey: ['equipment-expiring-docs'] });
      toast.success('Document removed');
    },
    onError: () => toast.error('Failed to remove document'),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      asset_id: string;
      workspace_id: string;
      checked_out_by: string;
      expected_return?: string | null;
      purpose?: string | null;
      destination?: string | null;
    }) => {
      if (!user) throw new Error('No user');
      const { error: ce } = await supabase
        .from('equipment_checkouts')
        .insert({ ...payload, is_active: true });
      if (ce) throw ce;
      const { error: ae } = await supabase
        .from('equipment_assets')
        .update({ status: 'checked_out', updated_at: new Date().toISOString() })
        .eq('id', payload.asset_id);
      if (ae) throw ae;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      toast.success('Equipment checked out ✓');
    },
    onError: () => toast.error('Failed to check out'),
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      checkout_id: string;
      asset_id: string;
      condition_on_return: string;
      return_notes?: string | null;
    }) => {
      if (!user) throw new Error('No user');
      const { error: ce } = await supabase
        .from('equipment_checkouts')
        .update({
          checked_in_by: user.id,
          checked_in_at: new Date().toISOString(),
          condition_on_return: payload.condition_on_return,
          return_notes: payload.return_notes ?? null,
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.checkout_id);
      if (ce) throw ce;

      const assetUpdate: Record<string, unknown> = {
        status: 'available',
        updated_at: new Date().toISOString(),
      };
      if (payload.condition_on_return === 'damaged') assetUpdate.condition = 'poor';

      const { error: ae } = await supabase
        .from('equipment_assets')
        .update(assetUpdate)
        .eq('id', payload.asset_id);
      if (ae) throw ae;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['equipment-assets'] });
      qc.invalidateQueries({ queryKey: ['equipment-asset', vars.asset_id] });
      toast.success('Equipment returned ✓');
      if (vars.condition_on_return === 'damaged') {
        setTimeout(() => {
          toast.info('Asset marked as damaged — consider logging a work order');
        }, 1000);
      }
    },
    onError: () => toast.error('Failed to check in'),
  });
}

export function useExpiringDocuments(days = 60) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['equipment-expiring-docs', days],
    enabled: !!user,
    queryFn: async () => {
      const wsId = await getWorkspaceId();
      if (!wsId) return [];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);
      const { data, error } = await supabase
        .from('equipment_documents')
        .select(`
          *,
          asset:equipment_assets(id, name, category_slug, workspace_id)
        `)
        .eq('status', 'active')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', cutoff.toISOString().split('T')[0])
        .order('expiry_date');
      if (error) throw error;
      // Filter to this workspace
      return (data ?? []).filter(
        (d: any) => d.asset?.workspace_id === wsId
      ) as (EquipmentDocument & { asset: Pick<EquipmentAsset, 'id' | 'name' | 'category_slug'> })[];
    },
  });
}
