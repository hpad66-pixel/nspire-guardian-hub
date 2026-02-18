import { supabase } from '@/integrations/supabase/client';

export async function getAssignedPropertyIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('property_team_members')
    .select('property_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) throw error;
  return (data || []).map((row) => row.property_id).filter(Boolean);
}

export async function getAssignedProjectIds(): Promise<string[]> {
  const propertyIds = await getAssignedPropertyIds();
  if (propertyIds.length === 0) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .in('property_id', propertyIds);

  if (error) throw error;
  return (data || []).map((row) => row.id).filter(Boolean);
}

export async function getDirectProjectIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('project_team_members')
    .select('project_id')
    .eq('user_id', user.id);

  if (error) throw error;
  return (data || []).map((row) => row.project_id).filter(Boolean);
}
