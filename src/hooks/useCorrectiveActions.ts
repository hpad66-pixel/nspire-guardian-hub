import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

export interface RegulatoryDocument {
  id: string;
  workspace_id: string | null;
  property_id: string | null;
  doc_number: string | null;
  title: string;
  description: string | null;
  doc_type: string;
  agency: string;
  agency_contact_name: string | null;
  agency_contact_email: string | null;
  agency_contact_phone: string | null;
  case_number: string | null;
  issued_date: string | null;
  effective_date: string | null;
  final_compliance_date: string | null;
  status: string;
  penalty_amount: number | null;
  daily_fine: number | null;
  document_url: string | null;
  assigned_to: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  property?: { id: string; name: string } | null;
}

export interface RegulatoryActionItem {
  id: string;
  regulatory_document_id: string;
  workspace_id: string | null;
  item_number: string | null;
  title: string;
  description: string | null;
  required_action: string | null;
  acceptance_criteria: string | null;
  due_date: string | null;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  completion_notes: string | null;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  created_at: string | null;
  assigned_profile?: { user_id: string; full_name: string | null; avatar_url: string | null } | null;
}

const DOC_KEY = 'regulatory-documents';
const ITEM_KEY = 'regulatory-action-items';

export function useRegulatoryDocuments(propertyId?: string) {
  return useQuery({
    queryKey: [DOC_KEY, propertyId],
    queryFn: async () => {
      let q = supabase
        .from('regulatory_documents')
        .select('*, property:properties!regulatory_documents_property_id_fkey(id, name)')
        .order('created_at', { ascending: false });
      if (propertyId) q = q.eq('property_id', propertyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RegulatoryDocument[];
    },
  });
}

export function useRegulatoryActionItems(documentId: string | null) {
  return useQuery({
    queryKey: [ITEM_KEY, documentId],
    queryFn: async () => {
      if (!documentId) return [];
      const { data, error } = await supabase
        .from('regulatory_action_items')
        .select('*, assigned_profile:profiles!regulatory_action_items_assigned_to_fkey(user_id, full_name, avatar_url)')
        .eq('regulatory_document_id', documentId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RegulatoryActionItem[];
    },
    enabled: !!documentId,
  });
}

export function useCorrectiveActionStats() {
  const { data: docs = [] } = useRegulatoryDocuments();
  const activeDocs = docs.filter(d => d.status === 'active').length;
  const totalExposure = docs.reduce((sum, d) => sum + (d.penalty_amount || 0), 0);
  return { totalDocs: docs.length, activeDocs, totalExposure };
}

export function useCreateRegulatoryDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { workspaceId } = useWorkspaceContext();
  return useMutation({
    mutationFn: async (doc: Partial<RegulatoryDocument>) => {
      const { data, error } = await supabase
        .from('regulatory_documents')
        .insert({ ...doc, workspace_id: workspaceId, created_by: user?.id } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [DOC_KEY] }); toast.success('Document added'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRegulatoryDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RegulatoryDocument> & { id: string }) => {
      const { error } = await supabase.from('regulatory_documents').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [DOC_KEY] }); toast.success('Updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateActionItem() {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();
  return useMutation({
    mutationFn: async (item: Partial<RegulatoryActionItem>) => {
      const { data, error } = await supabase
        .from('regulatory_action_items')
        .insert({ ...item, workspace_id: workspaceId } as any)
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [ITEM_KEY] }); toast.success('Action item added'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RegulatoryActionItem> & { id: string }) => {
      const { error } = await supabase.from('regulatory_action_items').update(updates as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [ITEM_KEY] }); toast.success('Updated'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCloseActionItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, completion_notes }: { id: string; completion_notes: string }) => {
      const { error } = await supabase.from('regulatory_action_items').update({
        status: 'closed', completed_at: new Date().toISOString(), completion_notes, completed_by: user?.id,
      } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [ITEM_KEY] }); toast.success('Action item closed'); },
    onError: (e: Error) => toast.error(e.message),
  });
}
