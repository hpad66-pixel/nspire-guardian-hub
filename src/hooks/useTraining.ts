import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useModules } from '@/contexts/ModuleContext';
import { useCurrentUserRole } from '@/hooks/useUserManagement';
import * as lwService from '@/services/learnworlds/learnworldsService';
import type { LWUserProgress, LWCertificate } from '@/services/learnworlds/learnworldsTypes';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

// ─── Alert placeholder ───────────────────────────────────────────────────────
export function sendCredentialExpiryAlert(credentialId: string, userId: string): void {
  // TODO: implement email + in-app notification in next session
  console.log('[Training] sendCredentialExpiryAlert', { credentialId, userId });
}

// ─── My assignments ──────────────────────────────────────────────────────────
export function useMyAssignments() {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();

  return useQuery({
    queryKey: ['training-assignments-mine', user?.id],
    enabled: !!user && isModuleEnabled('trainingHubEnabled'),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_assignments')
        .select('*')
        .eq('assigned_to', user.id)
        .neq('status', 'removed')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── My completions (raw DB records) ────────────────────────────────────────
export function useMyCompletions() {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();

  return useQuery({
    queryKey: ['training-completions-mine', user?.id],
    enabled: !!user && isModuleEnabled('trainingHubEnabled'),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_completions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── My certificates (passed + have cert URL) ────────────────────────────────
export function useMyCertificates() {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();

  return useQuery({
    queryKey: ['training-certificates-mine', user?.id],
    enabled: !!user && isModuleEnabled('trainingHubEnabled'),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('passed', true)
        .not('certificate_url', 'is', null)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Course catalog (mock via LW service) ────────────────────────────────────
export function useCatalog() {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();

  return useQuery({
    queryKey: ['training-catalog'],
    enabled: !!user && isModuleEnabled('trainingHubEnabled'),
    staleTime: 1000 * 60 * 10, // 10 min — catalog changes rarely
    queryFn: () => lwService.getCourses(),
  });
}

// ─── LW progress (mock) ──────────────────────────────────────────────────────
export function useMyLWProgress(): {
  data: LWUserProgress[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();

  const query = useQuery({
    queryKey: ['lw-progress', user?.id],
    enabled: !!user && isModuleEnabled('trainingHubEnabled'),
    staleTime: 1000 * 60 * 5,
    queryFn: () => lwService.getUserProgress(user!.id),
  });

  return { data: query.data ?? [], isLoading: query.isLoading };
}

// ─── LW certificates (mock) ──────────────────────────────────────────────────
export function useMyLWCertificates(): {
  data: LWCertificate[];
  isLoading: boolean;
} {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();

  const query = useQuery({
    queryKey: ['lw-certificates', user?.id],
    enabled: !!user && isModuleEnabled('trainingHubEnabled'),
    staleTime: 1000 * 60 * 5,
    queryFn: () => lwService.getUserCertificates(user!.id),
  });

  return { data: query.data ?? [], isLoading: query.isLoading };
}

// ─── All assignments (admin) ─────────────────────────────────────────────────
export function useAllAssignments() {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();
  const { data: role } = useCurrentUserRole();
  const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';

  return useQuery({
    queryKey: ['training-assignments-all', user?.id],
    enabled: !!user && isModuleEnabled('trainingHubEnabled') && isAdmin,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_assignments')
        .select(`
          *,
          assignee:profiles!training_assignments_assigned_to_fkey(user_id, full_name, avatar_url, job_title, department),
          assigner:profiles!training_assignments_assigned_by_fkey(user_id, full_name)
        `)
        .neq('status', 'removed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Team completions (admin) ────────────────────────────────────────────────
export function useTeamCompletions() {
  const { user } = useAuth();
  const { isModuleEnabled } = useModules();
  const { data: role } = useCurrentUserRole();
  const isAdmin = role === 'admin' || role === 'owner' || role === 'manager';

  return useQuery({
    queryKey: ['training-completions-all', user?.id],
    enabled: !!user && isModuleEnabled('trainingHubEnabled') && isAdmin,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('training_completions')
        .select(`
          *,
          profile:profiles!training_completions_user_id_fkey(user_id, full_name, avatar_url, job_title, department)
        `)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Assign course ───────────────────────────────────────────────────────────
interface AssignCoursePayload {
  workspaceId: string;
  lwCourseId: string;
  assignedTo?: string; // specific user id
  assignedToRole?: string; // role-based bulk
  dueDate?: string;
  recurrence?: string;
  recurrenceIntervalDays?: number;
  isMandatory: boolean;
  notes?: string;
}

function calcNextDueDate(dueDate: string | undefined, intervalDays: number | undefined): string | null {
  if (!dueDate || !intervalDays) return null;
  return addDays(new Date(dueDate), intervalDays).toISOString().split('T')[0];
}

export function useAssignCourse() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AssignCoursePayload) => {
      if (!user) throw new Error('Not authenticated');

      type AssignmentInsert = {
        workspace_id: string;
        lw_course_id: string;
        assigned_to: string;
        assigned_to_role?: string;
        assigned_by: string;
        due_date: string | null;
        recurrence: string | null;
        recurrence_interval_days: number | null;
        next_due_date: string | null;
        is_mandatory: boolean;
        notes: string | null;
      };
      const rows: AssignmentInsert[] = [];

      if (payload.assignedToRole) {
        // Bulk assignment by role
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('workspace_id', payload.workspaceId);

        if (error) throw error;

        // Get users with the target role
        const userIds = (profiles ?? []).map((p) => p.user_id);
        if (userIds.length > 0) {
          const { data: roleRows, error: roleError } = await supabase
            .from('user_roles')
            .select('user_id')
            .in('user_id', userIds)
            .eq('role', payload.assignedToRole as 'admin');

          if (roleError) throw roleError;

          for (const r of roleRows ?? []) {
            rows.push({
              workspace_id: payload.workspaceId,
              lw_course_id: payload.lwCourseId,
              assigned_to: r.user_id,
              assigned_to_role: payload.assignedToRole,
              assigned_by: user.id,
              due_date: payload.dueDate ?? null,
              recurrence: payload.recurrence ?? null,
              recurrence_interval_days: payload.recurrenceIntervalDays ?? null,
              next_due_date: calcNextDueDate(payload.dueDate, payload.recurrenceIntervalDays),
              is_mandatory: payload.isMandatory,
              notes: payload.notes ?? null,
            });
          }
        }
      } else if (payload.assignedTo) {
        rows.push({
          workspace_id: payload.workspaceId,
          lw_course_id: payload.lwCourseId,
          assigned_to: payload.assignedTo,
          assigned_by: user.id,
          due_date: payload.dueDate ?? null,
          recurrence: payload.recurrence ?? null,
          recurrence_interval_days: payload.recurrenceIntervalDays ?? null,
          next_due_date: calcNextDueDate(payload.dueDate, payload.recurrenceIntervalDays),
          is_mandatory: payload.isMandatory,
          notes: payload.notes ?? null,
        });
      }

      if (rows.length === 0) throw new Error('No users to assign to');

      const { error } = await supabase.from('training_assignments').insert(rows);
      if (error) throw error;

      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['training-assignments'] });
      toast.success(`Course assigned to ${count} ${count === 1 ? 'person' : 'people'} ✓`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to assign course');
    },
  });
}

// ─── Remove assignment ────────────────────────────────────────────────────────
export function useRemoveAssignment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('training_assignments')
        .update({ status: 'removed' })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-assignments'] });
      toast.success('Assignment removed');
    },
  });
}

// ─── Generate certificate share link ─────────────────────────────────────────
export function useGenerateCertificateShareLink() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (completionId: string): Promise<string> => {
      if (!user) throw new Error('Not authenticated');

      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

      const { error } = await supabase.from('training_share_links').insert({
        completion_id: completionId,
        token,
        created_by: user.id,
      });

      if (error) throw error;

      const shareUrl = `${window.location.origin}/share/certificate/${token}`;
      await navigator.clipboard.writeText(shareUrl);
      return shareUrl;
    },
    onSuccess: () => {
      toast.success('Link copied — expires in 72 hours');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to generate share link');
    },
  });
}
