import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type IssueRow = Database['public']['Tables']['issues']['Row'];
type IssueInsert = Database['public']['Tables']['issues']['Insert'];

export interface Issue extends IssueRow {
  property?: {
    name: string;
  };
  unit?: {
    unit_number: string;
  };
}

export function useIssues() {
  return useQuery({
    queryKey: ['issues'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Issue[];
    },
  });
}

export function useIssuesByProperty(propertyId: string) {
  return useQuery({
    queryKey: ['issues', 'property', propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          property:properties(name),
          unit:units(unit_number)
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Issue[];
    },
    enabled: !!propertyId,
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (issue: Omit<IssueInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('issues')
        .insert({ ...issue, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create issue: ${error.message}`);
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<IssueRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('issues')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update issue: ${error.message}`);
    },
  });
}
