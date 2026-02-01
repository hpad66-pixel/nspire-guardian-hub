import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InspectionAddendum {
  id: string;
  daily_inspection_id: string;
  created_by: string | null;
  content: string;
  attachments: string[];
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useInspectionAddendums(inspectionId: string) {
  return useQuery({
    queryKey: ['inspection-addendums', inspectionId],
    queryFn: async () => {
      const { data: addendums, error } = await supabase
        .from('daily_inspection_addendums')
        .select('*')
        .eq('daily_inspection_id', inspectionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles for addendum creators
      const creatorIds = [...new Set(addendums?.map(a => a.created_by).filter(Boolean) as string[])];
      let profileMap: Record<string, { full_name: string | null; email: string | null }> = {};
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', creatorIds);
        
        profiles?.forEach(p => {
          profileMap[p.user_id] = { full_name: p.full_name, email: p.email };
        });
      }
      
      const result = addendums?.map(a => ({
        ...a,
        profile: a.created_by ? profileMap[a.created_by] : undefined,
      }));
      
      if (error) throw error;
      return result as InspectionAddendum[];
    },
    enabled: !!inspectionId,
  });
}

export function useCreateAddendum() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      daily_inspection_id: string;
      content: string;
      attachments?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('daily_inspection_addendums')
        .insert({
          daily_inspection_id: input.daily_inspection_id,
          content: input.content,
          attachments: input.attachments || [],
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-addendums', variables.daily_inspection_id] });
      toast.success('Addendum added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add addendum: ${error.message}`);
    },
  });
}
