// ─────────────────────────────────────────────────────────────────────────────
// useUserSchool — resolves which LearnWorlds school(s) apply to the current user
//
// Resolution order (highest priority wins):
//   Priority 3 — individual user assignment
//   Priority 2 — organization (workspace) assignment
//   Priority 1 — platform default (APAS Labs, is_default = true)
//
// Multiple schools are possible. One is always marked primary.
// ─────────────────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LWSchool {
  id: string;
  name: string;
  slug: string;
  school_url: string;
  categories: string[];
  description: string | null;
  logo_url: string | null;
  is_default: boolean;
  is_active: boolean;
  // NOTE: api_key, client_id, client_secret, sso_secret are NEVER fetched client-side
}

interface ResolvedSchools {
  primarySchool: LWSchool | null;
  allSchools: LWSchool[];
  isLoading: boolean;
  hasMultipleSchools: boolean;
}

// ─── Local storage key helper ─────────────────────────────────────────────────
function activeSchoolKey(userId: string) {
  return `apas_active_school_${userId}`;
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export function useUserSchool(): ResolvedSchools {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-school', user?.id],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<LWSchool[]> => {
      if (!user) return [];

      // Safe columns only (no secrets)
      const safeColumns = 'id, name, slug, school_url, categories, description, logo_url, is_default, is_active';

      // Resolve workspace_id from profiles table
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const workspaceId = (profileRow as { workspace_id?: string } | null)?.workspace_id;

      // ── Step 1: individual user assignments (priority 3) ──────────────────
      const { data: userAssignments } = await supabase
        .from('lw_school_assignments')
        .select(`school:lw_schools(${safeColumns}), is_primary, priority`)
        .eq('user_id', user.id);

      // ── Step 2: workspace assignments (priority 2) ────────────────────────
      let workspaceAssignments: Array<{ school: LWSchool | null; is_primary: boolean; priority: number }> = [];
      if (workspaceId) {
        const { data } = await supabase
          .from('lw_school_assignments')
          .select(`school:lw_schools(${safeColumns}), is_primary, priority`)
          .eq('workspace_id', workspaceId);
        workspaceAssignments = (data ?? []) as typeof workspaceAssignments;
      }

      // ── Step 3: platform default (priority 1) ────────────────────────────
      const { data: defaultSchools } = await supabase
        .from('lw_schools')
        .select(safeColumns)
        .eq('is_default', true)
        .eq('is_active', true)
        .limit(1);

      const defaultSchool = defaultSchools?.[0] as LWSchool | undefined;

      // ── Merge + deduplicate ───────────────────────────────────────────────
      const seen = new Set<string>();
      const merged: Array<{ school: LWSchool; priority: number; isPrimary: boolean }> = [];

      const addSchool = (school: LWSchool | null | undefined, priority: number, isPrimary: boolean) => {
        if (!school || !school.is_active || seen.has(school.id)) return;
        seen.add(school.id);
        merged.push({ school, priority, isPrimary });
      };

      for (const a of (userAssignments ?? []) as Array<{ school: LWSchool | null; is_primary: boolean; priority: number }>) {
        addSchool(a.school, a.priority, a.is_primary);
      }
      for (const a of workspaceAssignments) {
        addSchool(a.school, a.priority, a.is_primary);
      }
      // Default school as fallback only if no others found
      if (merged.length === 0 && defaultSchool) {
        addSchool(defaultSchool, 1, true);
      } else if (defaultSchool && !seen.has(defaultSchool.id)) {
        // Include default if user has assignments but not this school already
        // Don't add — default is only fallback when nothing else applies
      }

      // Sort: individual (3) first, then org (2), then default (1)
      merged.sort((a, b) => b.priority - a.priority);

      return merged.map((m) => m.school);
    },
  });

  const schools = query.data ?? [];

  // Respect localStorage preference for active school
  const storedId = user ? localStorage.getItem(activeSchoolKey(user.id)) : null;
  const storedSchool = storedId ? schools.find((s) => s.id === storedId) : null;
  const primarySchool = storedSchool ?? schools[0] ?? null;

  return {
    primarySchool,
    allSchools: schools,
    isLoading: query.isLoading,
    hasMultipleSchools: schools.length > 1,
  };
}

// ─── Switch primary school (localStorage preference) ─────────────────────────
export function useSwitchPrimarySchool() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useCallback(
    (schoolId: string) => {
      if (!user) return;
      localStorage.setItem(activeSchoolKey(user.id), schoolId);
      // Invalidate catalog so it re-fetches with new school context
      qc.invalidateQueries({ queryKey: ['training-catalog'] });
      qc.invalidateQueries({ queryKey: ['user-school', user.id] });
    },
    [user, qc],
  );
}

// ─── Admin: fetch all schools ─────────────────────────────────────────────────
export function useAllSchools() {
  return useQuery({
    queryKey: ['lw-schools-all'],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<LWSchool[]> => {
      const { data, error } = await supabase
        .from('lw_schools')
        .select('id, name, slug, school_url, categories, description, logo_url, is_default, is_active')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return (data ?? []) as LWSchool[];
    },
  });
}

// ─── Admin: school assignments ────────────────────────────────────────────────
export interface SchoolAssignment {
  id: string;
  school_id: string;
  workspace_id: string | null;
  user_id: string | null;
  is_primary: boolean;
  priority: number;
  notes: string | null;
  created_at: string;
  assigned_by: string | null;
}

export function useSchoolAssignments(schoolId: string) {
  return useQuery({
    queryKey: ['lw-school-assignments', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lw_school_assignments')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SchoolAssignment[];
    },
  });
}

export function useAddSchoolAssignment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: {
      schoolId: string;
      workspaceId?: string;
      userId?: string;
      isPrimary?: boolean;
      priority?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('lw_school_assignments').insert({
        school_id: payload.schoolId,
        workspace_id: payload.workspaceId ?? null,
        user_id: payload.userId ?? null,
        is_primary: payload.isPrimary ?? true,
        priority: payload.priority ?? 2,
        assigned_by: user.id,
        notes: payload.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['lw-school-assignments', vars.schoolId] });
    },
  });
}

export function useRemoveSchoolAssignment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, schoolId }: { assignmentId: string; schoolId: string }) => {
      const { error } = await supabase
        .from('lw_school_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
      return schoolId;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['lw-school-assignments', vars.schoolId] });
    },
  });
}

// ─── Admin: set default school ────────────────────────────────────────────────
export function useSetDefaultSchool() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      // Unset existing default first
      await supabase.from('lw_schools').update({ is_default: false }).eq('is_default', true);
      // Set new default
      const { error } = await supabase
        .from('lw_schools')
        .update({ is_default: true })
        .eq('id', schoolId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lw-schools-all'] });
    },
  });
}
