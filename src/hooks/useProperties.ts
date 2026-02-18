import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserPermissions } from './usePermissions';
import { getAssignedPropertyIds } from './propertyAccess';

export interface Property {
  id: string;
  name: string;
  workspace_id?: string | null;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  year_built: number | null;
  total_units: number | null;
  status: string | null;
  nspire_enabled: boolean | null;
  daily_grounds_enabled: boolean | null;
  projects_enabled: boolean | null;
  occupancy_enabled: boolean | null;
  qr_scanning_enabled: boolean | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  mailing_address: string | null;
  mailing_city: string | null;
  mailing_state: string | null;
  mailing_zip: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useProperties() {
  const { isAdmin } = useUserPermissions();
  return useQuery({
    queryKey: ['properties', isAdmin],
    queryFn: async () => {
      if (isAdmin) {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('name');

        if (error) throw error;
        return data as Property[];
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('property_team_members')
        .select('property:properties(*)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (error) throw error;

      const properties = (data || [])
        .map((row: any) => row.property)
        .filter(Boolean) as Property[];

      return properties.sort((a, b) => a.name.localeCompare(b.name));
    },
  });
}

export function useProperty(id: string) {
  const { isAdmin } = useUserPermissions();
  return useQuery({
    queryKey: ['properties', id, isAdmin],
    queryFn: async () => {
      if (!id) return null;

      if (!isAdmin) {
        const propertyIds = await getAssignedPropertyIds();
        if (!propertyIds.includes(id)) {
          return null;
        }
      }

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Property;
    },
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (property: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'occupancy_enabled' | 'qr_scanning_enabled'> & {
      occupancy_enabled?: boolean | null;
      qr_scanning_enabled?: boolean | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('properties')
        .insert({ ...property, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create property: ${error.message}`);
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Property> & { id: string }) => {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', data.id] });
      toast.success('Property updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update property: ${error.message}`);
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete property: ${error.message}`);
    },
  });
}
