import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  content_path: string;
  entry_file: string;
  duration_minutes: number | null;
  passing_score: number;
  allow_resume: boolean;
  is_active: boolean;
  is_required: boolean;
  target_roles: string[];
  sort_order: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  version: string;
}

type AppRole = 'admin' | 'inspector' | 'manager' | 'owner' | 'project_manager' | 'subcontractor' | 'superintendent' | 'user' | 'viewer';

export interface CreateCourseInput {
  title: string;
  description?: string;
  thumbnail_url?: string;
  category: string;
  content_path: string;
  entry_file?: string;
  duration_minutes?: number;
  passing_score?: number;
  allow_resume?: boolean;
  is_active?: boolean;
  is_required?: boolean;
  target_roles?: AppRole[];
  sort_order?: number;
  version?: string;
}

export function useTrainingCourses() {
  return useQuery({
    queryKey: ['training-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingCourse[];
    },
  });
}

export function useActiveCourses() {
  return useQuery({
    queryKey: ['training-courses', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrainingCourse[];
    },
  });
}

export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ['training-courses', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      return data as TrainingCourse;
    },
    enabled: !!courseId,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCourseInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData = {
        title: input.title,
        description: input.description,
        thumbnail_url: input.thumbnail_url,
        category: input.category,
        content_path: input.content_path,
        entry_file: input.entry_file,
        duration_minutes: input.duration_minutes,
        passing_score: input.passing_score,
        allow_resume: input.allow_resume,
        is_active: input.is_active,
        is_required: input.is_required,
        target_roles: input.target_roles,
        sort_order: input.sort_order,
        version: input.version,
        uploaded_by: user.id,
      };

      const { data, error } = await supabase
        .from('training_courses')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data as TrainingCourse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      toast.success('Course created successfully');
    },
    onError: (error) => {
      console.error('Failed to create course:', error);
      toast.error('Failed to create course');
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: Partial<Omit<TrainingCourse, 'target_roles'>> & { id: string; target_roles?: AppRole[] }) => {
      const { data, error } = await supabase
        .from('training_courses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as TrainingCourse;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      queryClient.invalidateQueries({ queryKey: ['training-courses', variables.id] });
      toast.success('Course updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update course:', error);
      toast.error('Failed to update course');
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      // First get the course to find its content path
      const { data: course } = await supabase
        .from('training_courses')
        .select('content_path')
        .eq('id', courseId)
        .single();

      // Delete the course record
      const { error } = await supabase
        .from('training_courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      // Try to delete storage files (optional, may fail if no files exist)
      if (course?.content_path) {
        try {
          const { data: files } = await supabase.storage
            .from('training-courses')
            .list(course.content_path);
          
          if (files && files.length > 0) {
            const filePaths = files.map(f => `${course.content_path}/${f.name}`);
            await supabase.storage
              .from('training-courses')
              .remove(filePaths);
          }
        } catch (e) {
          console.warn('Could not delete course files:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      toast.success('Course deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete course:', error);
      toast.error('Failed to delete course');
    },
  });
}

export function useProcessCourseZip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      file, 
      courseId 
    }: { 
      file: File; 
      courseId: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('courseId', courseId);

      const response = await supabase.functions.invoke('process-articulate-course', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to process course');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-courses'] });
    },
    onError: (error) => {
      console.error('Failed to process course ZIP:', error);
      toast.error('Failed to process course file');
    },
  });
}

export function getCourseContentUrl(course: TrainingCourse): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/training-courses/${course.content_path}/${course.entry_file}`;
}

export const COURSE_CATEGORIES = [
  { id: 'safety', label: 'Safety & Compliance' },
  { id: 'operations', label: 'Operations' },
  { id: 'nspire', label: 'NSPIRE Inspections' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'customer-service', label: 'Customer Service' },
  { id: 'leadership', label: 'Leadership' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'software', label: 'Software Training' },
] as const;
