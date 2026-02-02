import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  score: number | null;
  last_location: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_accessed_at: string | null;
  created_at: string;
}

export function useUserCourseProgress() {
  return useQuery({
    queryKey: ['course-progress'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as CourseProgress[];
    },
  });
}

export function useCourseProgressById(courseId: string | undefined) {
  return useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('course_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as CourseProgress | null;
    },
    enabled: !!courseId,
  });
}

export function useStartCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('course_progress')
        .upsert({
          user_id: user.id,
          course_id: courseId,
          status: 'in_progress',
          progress_percent: 0,
          started_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,course_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data as CourseProgress;
    },
    onSuccess: (_, courseId) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
    },
    onError: (error) => {
      console.error('Failed to start course:', error);
      toast.error('Failed to start course');
    },
  });
}

export function useUpdateCourseProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      progress_percent,
      last_location,
      score,
    }: {
      courseId: string;
      progress_percent?: number;
      last_location?: string;
      score?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: Partial<CourseProgress> & { last_accessed_at: string } = {
        last_accessed_at: new Date().toISOString(),
      };

      if (progress_percent !== undefined) {
        updates.progress_percent = progress_percent;
      }
      if (last_location !== undefined) {
        updates.last_location = last_location;
      }
      if (score !== undefined) {
        updates.score = score;
      }

      const { data, error } = await supabase
        .from('course_progress')
        .update(updates)
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data as CourseProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress', variables.courseId] });
    },
    onError: (error) => {
      console.error('Failed to update progress:', error);
    },
  });
}

export function useCompleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      score,
    }: {
      courseId: string;
      score?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('course_progress')
        .update({
          status: 'completed',
          progress_percent: 100,
          score: score ?? null,
          completed_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .select()
        .single();

      if (error) throw error;
      return data as CourseProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress', variables.courseId] });
      toast.success('Course completed! 🎉');
    },
    onError: (error) => {
      console.error('Failed to complete course:', error);
      toast.error('Failed to mark course as complete');
    },
  });
}

export function useCourseProgressStats() {
  return useQuery({
    queryKey: ['course-progress-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { completed: 0, inProgress: 0, notStarted: 0 };

      const { data, error } = await supabase
        .from('course_progress')
        .select('status')
        .eq('user_id', user.id);

      if (error) throw error;

      const completed = data?.filter(p => p.status === 'completed').length || 0;
      const inProgress = data?.filter(p => p.status === 'in_progress').length || 0;
      const notStarted = data?.filter(p => p.status === 'not_started').length || 0;

      return { completed, inProgress, notStarted };
    },
  });
}
