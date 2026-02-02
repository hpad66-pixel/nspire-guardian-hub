import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Demo property has a fixed UUID for easy reference
export const DEMO_PROPERTY_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Hook to check if the current user can view demo properties
 * Only admin, manager, and owner roles can see demo data
 */
export function useCanViewDemo() {
  return useQuery({
    queryKey: ['can-view-demo'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('can_view_demo_property', { _user_id: user.id });

      if (error) {
        console.error('Error checking demo access:', error);
        return false;
      }

      return data === true;
    },
  });
}

/**
 * Hook to get demo property data if user has access
 */
export function useDemoProperty() {
  const { data: canViewDemo } = useCanViewDemo();

  return useQuery({
    queryKey: ['demo-property'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', DEMO_PROPERTY_ID)
        .single();

      if (error) {
        // Property might not exist or user doesn't have access
        return null;
      }

      return data;
    },
    enabled: canViewDemo === true,
  });
}

/**
 * Utility to check if a property is the demo property
 */
export function isDemoProperty(propertyId: string): boolean {
  return propertyId === DEMO_PROPERTY_ID;
}
