import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type TrainingResourceRow = Database['public']['Tables']['training_resources']['Row'];
type TrainingResourceInsert = Database['public']['Tables']['training_resources']['Insert'];

export interface TrainingResource extends TrainingResourceRow {}

export function useTrainingResources(category?: string, resourceType?: string) {
  return useQuery({
    queryKey: ['training-resources', category, resourceType],
    queryFn: async () => {
      let query = supabase
        .from('training_resources')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      if (resourceType && resourceType !== 'all') {
        query = query.eq('resource_type', resourceType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TrainingResource[];
    },
  });
}

export function useTrainingResource(id: string) {
  return useQuery({
    queryKey: ['training-resource', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_resources')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as TrainingResource;
    },
    enabled: !!id,
  });
}

export function useCreateTrainingResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resource: Omit<TrainingResourceInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData: TrainingResourceInsert = {
        ...resource,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('training_resources')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-resources'] });
      toast.success('Training resource created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create training resource');
      console.error(error);
    },
  });
}

export function useUpdateTrainingResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingResourceRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('training_resources')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-resources'] });
      toast.success('Training resource updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update training resource');
      console.error(error);
    },
  });
}

export function useDeleteTrainingResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-resources'] });
      toast.success('Training resource deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete training resource');
      console.error(error);
    },
  });
}

export function useTrainingStats() {
  return useQuery({
    queryKey: ['training-stats'],
    queryFn: async () => {
      const { data: resources, error } = await supabase
        .from('training_resources')
        .select('resource_type, category')
        .eq('is_active', true);

      if (error) throw error;

      const totalCourses = resources?.filter(r => r.resource_type === 'course').length || 0;
      const totalEbooks = resources?.filter(r => r.resource_type === 'ebook').length || 0;
      const totalGuides = resources?.filter(r => r.resource_type === 'guide').length || 0;
      const totalResources = resources?.length || 0;

      const byCategory = resources?.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalCourses,
        totalEbooks,
        totalGuides,
        totalResources,
        byCategory,
      };
    },
  });
}
