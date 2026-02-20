import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HRDocumentCategory {
  id: string;
  workspace_id: string | null;
  name: string;
  is_system: boolean;
  requires_expiry: boolean;
  created_at: string;
}

export interface HRDocument {
  id: string;
  workspace_id: string;
  employee_id: string;
  category_id: string | null;
  title: string;
  file_url: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  expiry_date: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  category?: HRDocumentCategory | null;
  uploader?: {
    user_id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

export type HRDocumentExpiry = 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';

export function getHRDocumentExpiryStatus(expiryDate: string | null): HRDocumentExpiry {
  if (!expiryDate) return 'no_expiry';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return 'expired';
  const days = Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHRVault(employeeId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Categories ────────────────────────────────────────────────────────────

  const categoriesQuery = useQuery({
    queryKey: ['hr-document-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_document_categories')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as HRDocumentCategory[];
    },
    staleTime: 10 * 60 * 1000, // 10 min — categories change rarely
  });

  // ── Documents for employee ────────────────────────────────────────────────

  const documentsQuery = useQuery({
    queryKey: ['hr-documents', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('hr_documents')
        .select(`
          *,
          category:hr_document_categories(*)
        `)
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as HRDocument[];
    },
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000,
  });

  // ── HR doc counts for all employees in workspace (for badge) ──────────────

  const allDocCountsQuery = useQuery({
    queryKey: ['hr-documents-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_documents')
        .select('employee_id, expiry_date');
      if (error) throw error;

      // Map: employeeId → { count, hasAlert }
      const map: Record<string, { count: number; hasAlert: boolean }> = {};
      for (const doc of data ?? []) {
        if (!map[doc.employee_id]) {
          map[doc.employee_id] = { count: 0, hasAlert: false };
        }
        map[doc.employee_id].count++;
        const status = getHRDocumentExpiryStatus(doc.expiry_date);
        if (status === 'expired' || status === 'expiring_soon') {
          map[doc.employee_id].hasAlert = true;
        }
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Upload ────────────────────────────────────────────────────────────────

  const uploadDocument = useMutation({
    mutationFn: async ({
      file,
      categoryId,
      title,
      notes,
      expiryDate,
    }: {
      file: File;
      categoryId: string;
      title: string;
      notes?: string;
      expiryDate?: string;
    }) => {
      if (!employeeId || !user) throw new Error('No employee or user');

      // Get workspace_id from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();
      if (profileError) throw profileError;
      const workspaceId = profile.workspace_id;

      // Upload file to storage
      const ext = file.name.split('.').pop() ?? 'bin';
      const storagePath = `${workspaceId}/${employeeId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('hr-documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      // Generate signed URL (private bucket — 10 year TTL)
      const { data: signedData, error: signError } = await supabase.storage
        .from('hr-documents')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);
      if (signError) throw signError;

      // Insert row
      const { data, error: insertError } = await supabase
        .from('hr_documents')
        .insert({
          workspace_id: workspaceId,
          employee_id: employeeId,
          category_id: categoryId,
          title,
          file_url: signedData.signedUrl,
          file_name: file.name,
          file_size_bytes: file.size,
          expiry_date: expiryDate || null,
          notes: notes || null,
          uploaded_by: user.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-documents', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['hr-documents-counts'] });
      toast.success('Document uploaded to HR Vault');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to upload document');
    },
  });

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      // Fetch to get the file URL for storage cleanup
      const { data: doc, error: fetchError } = await supabase
        .from('hr_documents')
        .select('file_url, file_name')
        .eq('id', documentId)
        .single();
      if (fetchError) throw fetchError;

      // Delete DB row
      const { error: deleteError } = await supabase
        .from('hr_documents')
        .delete()
        .eq('id', documentId);
      if (deleteError) throw deleteError;

      // Best-effort: try to delete from storage (may fail if URL is signed)
      // We parse the path from the signed URL
      if (doc?.file_url) {
        try {
          const url = new URL(doc.file_url);
          const pathMatch = url.pathname.match(/\/object\/sign\/hr-documents\/(.+?)(\?|$)/);
          if (pathMatch?.[1]) {
            await supabase.storage.from('hr-documents').remove([decodeURIComponent(pathMatch[1])]);
          }
        } catch {
          // Silent — DB row is already deleted
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-documents', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['hr-documents-counts'] });
      toast.success('Document deleted from HR Vault');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete document');
    },
  });

  return {
    documents: documentsQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    allDocCounts: allDocCountsQuery.data ?? {},
    isLoading: documentsQuery.isLoading || categoriesQuery.isLoading,
    isUploading: uploadDocument.isPending,
    error: documentsQuery.error || categoriesQuery.error,
    uploadDocument,
    deleteDocument,
  };
}
