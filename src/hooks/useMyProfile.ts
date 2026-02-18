import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface MyProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  work_email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  hire_date: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  avatar_url: string | null;
  status: string | null;
  updated_at: string;
}

export function useMyProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      // If no profile row exists yet, return a skeleton so the form still renders
      if (!data) {
        return {
          id: '',
          user_id: user!.id,
          full_name: (user?.user_metadata?.full_name as string) || null,
          email: user?.email || null,
          work_email: null,
          phone: null,
          job_title: null,
          department: null,
          hire_date: null,
          emergency_contact: null,
          emergency_phone: null,
          avatar_url: null,
          status: 'active',
          updated_at: new Date().toISOString(),
        } as MyProfile;
      }

      return data as MyProfile;
    },
  });
}

export function useUpdateMyProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<MyProfile, 'id' | 'user_id' | 'updated_at'>>) => {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user!.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) throw error;

      // Sync full_name to Supabase Auth metadata so header initials update immediately
      if (updates.full_name) {
        await supabase.auth.updateUser({
          data: { full_name: updates.full_name },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
      toast.success('Profile saved');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated');

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) throw new Error('Image must be smaller than 5MB');
      if (!file.type.startsWith('image/')) throw new Error('File must be an image');

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (profileError) throw profileError;

      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile photo updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload photo: ${error.message}`);
    },
  });
}
