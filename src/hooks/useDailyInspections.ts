import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type InspectionItemStatus = 'ok' | 'needs_attention' | 'defect_found';

export interface DailyInspection {
  id: string;
  property_id: string;
  inspection_date: string;
  inspector_id: string | null;
  weather: string | null;
  general_notes: string | null;
  general_notes_html: string | null;
  voice_transcript: string | null;
  status: string;
  attachments: string[];
  created_at: string;
  completed_at: string | null;
}

export interface DailyInspectionItem {
  id: string;
  daily_inspection_id: string;
  asset_id: string;
  status: InspectionItemStatus;
  photo_urls: string[];
  notes: string | null;
  defect_description: string | null;
  checked_at: string;
}

export function useDailyInspections(propertyId?: string) {
  return useQuery({
    queryKey: ['daily-inspections', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('daily_inspections')
        .select('*')
        .order('inspection_date', { ascending: false });
      
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DailyInspection[];
    },
  });
}

export function useTodayInspection(propertyId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['daily-inspection', propertyId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_inspections')
        .select('*')
        .eq('property_id', propertyId)
        .eq('inspection_date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as DailyInspection | null;
    },
    enabled: !!propertyId,
  });
}

export function useCreateDailyInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: { property_id: string; weather?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('daily_inspections')
        .insert({
          property_id: input.property_id,
          weather: input.weather,
          inspector_id: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as DailyInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['daily-inspection'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create inspection: ${error.message}`);
    },
  });
}

export function useUpdateDailyInspection() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyInspection> & { id: string }) => {
      const { data, error } = await supabase
        .from('daily_inspections')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as DailyInspection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['daily-inspection'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update inspection: ${error.message}`);
    },
  });
}

export function useInspectionItems(dailyInspectionId: string) {
  return useQuery({
    queryKey: ['inspection-items', dailyInspectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_inspection_items')
        .select('*')
        .eq('daily_inspection_id', dailyInspectionId);
      
      if (error) throw error;
      return data as DailyInspectionItem[];
    },
    enabled: !!dailyInspectionId,
  });
}

export function useUpsertInspectionItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: {
      daily_inspection_id: string;
      asset_id: string;
      status: InspectionItemStatus;
      photo_urls?: string[];
      notes?: string;
      defect_description?: string;
    }) => {
      // Check if item exists
      const { data: existing } = await supabase
        .from('daily_inspection_items')
        .select('id')
        .eq('daily_inspection_id', input.daily_inspection_id)
        .eq('asset_id', input.asset_id)
        .maybeSingle();
      
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('daily_inspection_items')
          .update({
            status: input.status,
            photo_urls: input.photo_urls,
            notes: input.notes,
            defect_description: input.defect_description,
            checked_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data as DailyInspectionItem;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('daily_inspection_items')
          .insert(input)
          .select()
          .single();
        
        if (error) throw error;
        return data as DailyInspectionItem;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inspection-items', variables.daily_inspection_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save inspection item: ${error.message}`);
    },
  });
}

export const WEATHER_OPTIONS = [
  { value: 'sunny', label: 'Sunny', icon: '☀️' },
  { value: 'cloudy', label: 'Cloudy', icon: '☁️' },
  { value: 'partly_cloudy', label: 'Partly Cloudy', icon: '⛅' },
  { value: 'rainy', label: 'Rainy', icon: '🌧️' },
  { value: 'stormy', label: 'Stormy', icon: '⛈️' },
  { value: 'snowy', label: 'Snowy', icon: '❄️' },
  { value: 'foggy', label: 'Foggy', icon: '🌫️' },
];
