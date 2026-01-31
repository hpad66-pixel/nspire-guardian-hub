import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AssetType = 'cleanout' | 'catch_basin' | 'lift_station' | 'retention_pond' | 'general_grounds';

export interface Asset {
  id: string;
  property_id: string;
  name: string;
  asset_type: AssetType;
  location_description: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  photo_url: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetInput {
  property_id: string;
  name: string;
  asset_type: AssetType;
  location_description?: string;
  latitude?: number;
  longitude?: number;
  status?: string;
  photo_url?: string;
  qr_code?: string;
}

export function useAssets(propertyId?: string) {
  return useQuery({
    queryKey: ['assets', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('assets')
        .select('*')
        .order('asset_type', { ascending: true })
        .order('name', { ascending: true });
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Asset[];
    },
  });
}

export function useAssetsByType(propertyId: string, assetType: AssetType) {
  return useQuery({
    queryKey: ['assets', propertyId, assetType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('property_id', propertyId)
        .eq('asset_type', assetType)
        .eq('status', 'active')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Asset[];
    },
    enabled: !!propertyId,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateAssetInput) => {
      const { data, error } = await supabase
        .from('assets')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create asset: ${error.message}`);
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Asset> & { id: string }) => {
      const { data, error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Asset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update asset: ${error.message}`);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Asset deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete asset: ${error.message}`);
    },
  });
}

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cleanout: 'Cleanout',
  catch_basin: 'Catch Basin',
  lift_station: 'Lift Station',
  retention_pond: 'Retention Pond',
  general_grounds: 'General Grounds',
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  cleanout: '🔧',
  catch_basin: '🕳️',
  lift_station: '⚡',
  retention_pond: '💧',
  general_grounds: '🏡',
};
