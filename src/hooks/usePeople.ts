import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface PropertyTeamMember {
  id: string;
  property_id: string;
  user_id: string;
  role: AppRole;
  title: string | null;
  department: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'archived' | 'deactivated';
  departure_reason: 'resignation' | 'termination' | 'transfer' | 'contract_end' | 'other' | null;
  departure_notes: string | null;
  added_by: string | null;
  archived_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    phone: string | null;
    job_title: string | null;
    department: string | null;
    status: string | null;
    hire_date: string | null;
  };
  property?: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
  };
}

export interface PersonWithAssignments {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  status: string | null;
  hire_date: string | null;
  created_at: string;
  assignments: PropertyTeamMember[];
  global_roles: AppRole[];
}

// Fetch all people with their property assignments
export function usePeople(filters?: {
  propertyId?: string;
  status?: string;
  role?: AppRole;
  search?: string;
}) {
  return useQuery({
    queryKey: ['people', filters],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;

      // Get all property team members with property info
      let teamQuery = supabase
        .from('property_team_members')
        .select(`
          *,
          property:properties(id, name, address, city, state)
        `);

      if (filters?.propertyId) {
        teamQuery = teamQuery.eq('property_id', filters.propertyId);
      }
      if (filters?.status) {
        teamQuery = teamQuery.eq('status', filters.status);
      }
      if (filters?.role) {
        teamQuery = teamQuery.eq('role', filters.role);
      }

      const { data: teamMembers, error: teamError } = await teamQuery;
      if (teamError) throw teamError;

      // Get all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine data
      const people: PersonWithAssignments[] = profiles.map(profile => {
        const assignments = (teamMembers || [])
          .filter(tm => tm.user_id === profile.user_id)
          .map(tm => ({
            ...tm,
            property: tm.property,
          })) as PropertyTeamMember[];

        const globalRoles = (userRoles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role);

        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          phone: (profile as any).phone || null,
          job_title: (profile as any).job_title || null,
          department: (profile as any).department || null,
          status: (profile as any).status || 'active',
          hire_date: (profile as any).hire_date || null,
          created_at: profile.created_at,
          assignments,
          global_roles: globalRoles,
        };
      });

      // Apply search filter
      let filtered = people;
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = people.filter(p => 
          p.full_name?.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search)
        );
      }

      // Filter by property assignment if specified
      if (filters?.propertyId) {
        filtered = filtered.filter(p => 
          p.assignments.some(a => a.property_id === filters.propertyId)
        );
      }

      return filtered;
    },
  });
}

// Get a single person by user_id
export function usePerson(userId: string | null) {
  return useQuery({
    queryKey: ['person', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('property_team_members')
        .select(`
          *,
          property:properties(id, name, address, city, state)
        `)
        .eq('user_id', userId);

      if (assignmentsError) throw assignmentsError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      return {
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        phone: (profile as any).phone || null,
        job_title: (profile as any).job_title || null,
        department: (profile as any).department || null,
        status: (profile as any).status || 'active',
        hire_date: (profile as any).hire_date || null,
        created_at: profile.created_at,
        assignments: assignments as PropertyTeamMember[],
        global_roles: roles.map(r => r.role),
      } as PersonWithAssignments;
    },
    enabled: !!userId,
  });
}

// Add a person to a property
export function useAddPropertyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      property_id: string;
      user_id: string;
      role: AppRole;
      title?: string;
      department?: string;
      start_date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('property_team_members')
        .insert({
          property_id: data.property_id,
          user_id: data.user_id,
          role: data.role,
          title: data.title,
          department: data.department,
          start_date: data.start_date || new Date().toISOString().split('T')[0],
          added_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      toast.success('Property assignment added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add assignment: ${error.message}`);
    },
  });
}

// Update a property assignment
export function useUpdatePropertyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      role?: AppRole;
      title?: string;
      department?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('property_team_members')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      toast.success('Assignment updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });
}

// Archive a team member (with reason and notes)
export function useArchiveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, departure_reason, departure_notes, end_date }: {
      id: string;
      departure_reason: 'resignation' | 'termination' | 'transfer' | 'contract_end' | 'other';
      departure_notes?: string;
      end_date?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from('property_team_members')
        .update({
          status: 'archived',
          departure_reason,
          departure_notes,
          end_date: end_date || new Date().toISOString().split('T')[0],
          archived_by: user?.id,
          archived_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      toast.success('Team member archived');
    },
    onError: (error: Error) => {
      toast.error(`Failed to archive: ${error.message}`);
    },
  });
}

// Reactivate an archived team member
export function useReactivateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from('property_team_members')
        .update({
          status: 'active',
          departure_reason: null,
          departure_notes: null,
          end_date: null,
          archived_by: null,
          archived_at: null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      toast.success('Team member reactivated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reactivate: ${error.message}`);
    },
  });
}

// Remove property assignment (hard delete - use archive for soft delete)
export function useRemovePropertyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('property_team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      toast.success('Assignment removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });
}

// Update profile information
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ...data }: {
      userId: string;
      full_name?: string;
      email?: string;
      phone?: string;
      job_title?: string;
      department?: string;
      hire_date?: string;
      status?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['person'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      toast.success('Profile updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}

// Get people stats
export function usePeopleStats() {
  return useQuery({
    queryKey: ['people-stats'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, status');
      
      if (profilesError) throw profilesError;

      const { data: teamMembers, error: teamError } = await supabase
        .from('property_team_members')
        .select('id, status');

      if (teamError) throw teamError;

      const { data: properties, error: propsError } = await supabase
        .from('properties')
        .select('id');

      if (propsError) throw propsError;

      const { data: roles, error: rolesError } = await supabase
        .from('role_definitions')
        .select('id');

      if (rolesError) throw rolesError;

      const activeMembers = (teamMembers || []).filter(tm => tm.status === 'active').length;
      const archivedMembers = (teamMembers || []).filter(tm => tm.status === 'archived').length;

      return {
        totalPeople: profiles?.length || 0,
        activeMembers,
        archivedMembers,
        propertiesWithTeam: properties?.length || 0,
        rolesCount: roles?.length || 0,
      };
    },
  });
}
