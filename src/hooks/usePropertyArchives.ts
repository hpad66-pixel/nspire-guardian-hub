import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ARCHIVE_CATEGORIES = [
  { id: 'as-builts', label: 'As-Built Drawings', icon: 'FileType', description: 'Final construction drawings reflecting actual conditions' },
  { id: 'design-drawings', label: 'Design Drawings', icon: 'Compass', description: 'Original architectural and engineering designs' },
  { id: 'engineering', label: 'Engineering Specifications', icon: 'FileCode', description: 'Structural, MEP, and civil engineering documents' },
  { id: 'equipment-manuals', label: 'Equipment Manuals', icon: 'BookOpen', description: 'Operating & maintenance manuals for installed equipment' },
  { id: 'permits-approvals', label: 'Permits & Approvals', icon: 'Stamp', description: 'Original issued permits and regulatory approvals' },
  { id: 'surveys-reports', label: 'Surveys & Reports', icon: 'MapPin', description: 'Property surveys, environmental reports, assessments' },
  { id: 'warranties', label: 'Warranties & Guarantees', icon: 'Shield', description: 'Equipment and construction warranties' },
  { id: 'legal-deeds', label: 'Legal & Deeds', icon: 'Scale', description: 'Property deeds, easements, legal agreements' },
] as const;

export type ArchiveCategory = typeof ARCHIVE_CATEGORIES[number]['id'];

export interface PropertyArchive {
  id: string;
  category: string;
  subcategory: string | null;
  name: string;
  description: string | null;
  document_number: string | null;
  revision: string | null;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  property_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  original_date: string | null;
  received_from: string | null;
  tags: string[] | null;
  notes: string | null;
}

export function usePropertyArchives(category?: string) {
  return useQuery({
    queryKey: ['property-archives', category],
    queryFn: async () => {
      let query = supabase
        .from('property_archives')
        .select('*')
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PropertyArchive[];
    },
  });
}

export function useArchiveCategoryStats() {
  return useQuery({
    queryKey: ['property-archives-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('property_archives')
        .select('category');

      if (error) throw error;

      const stats: Record<string, number> = {};
      ARCHIVE_CATEGORIES.forEach(cat => {
        stats[cat.id] = 0;
      });

      data?.forEach((item) => {
        if (stats[item.category] !== undefined) {
          stats[item.category]++;
        }
      });

      return stats;
    },
  });
}

export function useTotalArchiveCount() {
  return useQuery({
    queryKey: ['property-archives-total'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('property_archives')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });
}

interface UploadArchiveParams {
  file: File;
  name: string;
  category: string;
  description?: string;
  document_number?: string;
  revision?: string;
  property_id?: string;
  original_date?: string;
  received_from?: string;
  tags?: string[];
  notes?: string;
}

export function useUploadPropertyArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadArchiveParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = params.file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${params.category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-archives')
        .upload(filePath, params.file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('property-archives')
        .getPublicUrl(filePath);

      // Create database record
      const { data, error } = await supabase
        .from('property_archives')
        .insert({
          name: params.name,
          category: params.category,
          description: params.description,
          document_number: params.document_number,
          revision: params.revision || 'A',
          file_url: urlData.publicUrl,
          file_size: params.file.size,
          mime_type: params.file.type,
          property_id: params.property_id,
          uploaded_by: user.id,
          original_date: params.original_date,
          received_from: params.received_from,
          tags: params.tags || [],
          notes: params.notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-archives'] });
      queryClient.invalidateQueries({ queryKey: ['property-archives-stats'] });
      queryClient.invalidateQueries({ queryKey: ['property-archives-total'] });
      toast.success('Document archived successfully');
    },
    onError: (error) => {
      toast.error(`Failed to archive document: ${error.message}`);
    },
  });
}

interface UpdateArchiveParams {
  id: string;
  name?: string;
  description?: string;
  document_number?: string;
  revision?: string;
  original_date?: string;
  received_from?: string;
  tags?: string[];
  notes?: string;
}

export function useUpdatePropertyArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateArchiveParams) => {
      const { data, error } = await supabase
        .from('property_archives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-archives'] });
      toast.success('Archive updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update archive: ${error.message}`);
    },
  });
}

// Note: No delete mutation - archives are permanent by design
