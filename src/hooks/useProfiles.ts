import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  work_email: string | null;
  avatar_url: string | null;
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, work_email, avatar_url')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useSearchProfiles(search: string) {
  return useQuery({
    queryKey: ['profiles', 'search', search],
    queryFn: async () => {
      if (!search || search.length < 1) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, email, work_email, avatar_url')
          .order('full_name', { ascending: true })
          .limit(10);
        
        if (error) throw error;
        return data as Profile[];
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, work_email, avatar_url')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        .order('full_name', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}
