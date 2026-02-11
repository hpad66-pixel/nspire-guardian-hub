import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface OrganizationDocument {
  id: string;
  folder: string;
  subfolder: string | null;
  folder_id: string | null;
  name: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  version: number;
  previous_version_id: string | null;
  uploaded_by: string | null;
  expiry_date: string | null;
  tags: string[];
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export const DOCUMENT_FOLDERS = [
  'General',
  'Contracts',
  'Permits',
  'Insurance',
  'Legal',
  'Policies',
  'Training',
  'Reports',
] as const;

export function useOrganizationDocuments(folderId?: string | null) {
  return useQuery({
    queryKey: ['organization-documents', folderId],
    queryFn: async () => {
      let query = supabase
        .from('organization_documents')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });
      
      if (folderId) {
        query = query.eq('folder_id', folderId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as OrganizationDocument[];
    },
  });
}

export function useDocumentFolderStats() {
  return useQuery({
    queryKey: ['organization-documents', 'folder-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_documents')
        .select('folder, subfolder')
        .eq('is_archived', false);
      
      if (error) throw error;
      
      const stats: Record<string, number> = {};
      const subfoldersByFolder: Record<string, Set<string>> = {};
      DOCUMENT_FOLDERS.forEach(folder => {
        stats[folder] = 0;
      });
      
      data.forEach((doc: { folder: string; subfolder: string | null }) => {
        if (stats[doc.folder] !== undefined) {
          stats[doc.folder]++;
        } else {
          stats[doc.folder] = 1;
        }
        
        if (doc.subfolder) {
          if (!subfoldersByFolder[doc.folder]) {
            subfoldersByFolder[doc.folder] = new Set();
          }
          subfoldersByFolder[doc.folder].add(doc.subfolder);
        }
      });
      
      const subfolders: Record<string, string[]> = {};
      Object.entries(subfoldersByFolder).forEach(([folder, set]) => {
        subfolders[folder] = Array.from(set).sort((a, b) => a.localeCompare(b));
      });
      
      return { stats, subfoldersByFolder: subfolders };
    },
  });
}

export function useUploadOrganizationDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const toStoragePathSegment = (value: string) => {
    const cleaned = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || 'general';
  };
  
  return useMutation({
    mutationFn: async ({
      file,
      folder,
      folderId,
      folderPathSegments,
      subfolder,
      name,
      description,
      tags,
      expiryDate,
    }: {
      file: File;
      folder: string;
      folderId?: string | null;
      folderPathSegments?: string[];
      subfolder?: string;
      name: string;
      description?: string;
      tags?: string[];
      expiryDate?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const normalizedFolder = folder.trim() || 'General';
      const normalizedSubfolder = subfolder?.trim() || null;
      const normalizedPathSegments = (folderPathSegments && folderPathSegments.length > 0)
        ? folderPathSegments
        : [normalizedFolder];
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = normalizedPathSegments
        .map((segment) => toStoragePathSegment(segment))
        .join('/');
      const filePath = `${storagePath}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organization-documents')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('organization-documents')
        .getPublicUrl(filePath);
      
      // Create document record
      const { data, error } = await supabase
        .from('organization_documents')
        .insert({
          folder: normalizedFolder,
          subfolder: normalizedSubfolder,
          folder_id: folderId || null,
          name,
          description: description || null,
          file_url: urlData.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          tags: tags || [],
          expiry_date: expiryDate || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

export function useUpdateOrganizationDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      folder,
      subfolder,
      tags,
      expiryDate,
    }: {
      id: string;
      name?: string;
      description?: string;
      folder?: string;
      subfolder?: string | null;
      tags?: string[];
      expiryDate?: string | null;
    }) => {
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (folder !== undefined) updates.folder = folder;
      if (subfolder !== undefined) updates.subfolder = subfolder;
      if (tags !== undefined) updates.tags = tags;
      if (expiryDate !== undefined) updates.expiry_date = expiryDate;
      
      const { data, error } = await supabase
        .from('organization_documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Document updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document: ${error.message}`);
    },
  });
}

export function useArchiveOrganizationDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('organization_documents')
        .update({ is_archived: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Document archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive document: ${error.message}`);
    },
  });
}

export function useDeleteOrganizationDocument() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('organization_documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-documents'] });
      toast.success('Document deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
}
