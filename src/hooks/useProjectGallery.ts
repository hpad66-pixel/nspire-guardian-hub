import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import type { GalleryPhoto, GalleryFilters } from './usePropertyGallery';

export type { GalleryPhoto, GalleryFilters };

function getDateRange(timeFilter?: string): { start: string; end: string } | undefined {
  const now = new Date();
  if (timeFilter === 'this_week') {
    return { start: format(startOfWeek(now), 'yyyy-MM-dd'), end: format(endOfWeek(now), 'yyyy-MM-dd') };
  }
  if (timeFilter === 'this_month') {
    return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
  }
  if (timeFilter === 'last_3_months') {
    return { start: format(subMonths(now, 3), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
  }
  return undefined;
}

export function useProjectGallery(projectId: string, filters?: GalleryFilters) {
  return useQuery({
    queryKey: ['project-gallery', projectId, filters],
    enabled: !!projectId,
    queryFn: async () => {
      const photos: GalleryPhoto[] = [];

      // 1. Daily report photos
      const { data: reports } = await supabase
        .from('daily_reports')
        .select('id, report_date, photos, work_performed')
        .eq('project_id', projectId)
        .not('photos', 'is', null);

      reports?.forEach((report: any) => {
        (report.photos || []).forEach((url: string, i: number) => {
          let label = 'Daily Report';
          try { label = `Daily Report · ${format(parseISO(report.report_date), 'MMM d')}`; } catch {}
          photos.push({
            id: `daily_report_${report.id}_${i}`,
            url,
            caption: '',
            taken_at: report.report_date,
            source: 'daily_report',
            source_id: report.id,
            source_label: label,
            source_route: `/projects/${projectId}?tab=daily-logs&reportId=${report.id}`,
          });
        });
      });

      // 2. photo_gallery direct uploads + captions
      const { data: galleryPhotos } = await supabase
        .from('photo_gallery')
        .select('*')
        .eq('project_id', projectId);

      // Override captions for source photos
      photos.forEach(p => {
        const gp = galleryPhotos?.find((g: any) => g.url === p.url);
        if (gp) {
          p.caption = gp.caption || '';
          if (gp.taken_at) p.taken_at = gp.taken_at;
        }
      });

      // Add direct uploads that aren't already in the list
      galleryPhotos?.forEach((gp: any) => {
        if (!photos.some(p => p.url === gp.url)) {
          photos.push({
            id: gp.id,
            url: gp.url,
            caption: gp.caption || '',
            taken_at: gp.taken_at,
            source: 'direct',
            source_id: '',
            source_label: 'Direct Upload',
            source_route: '',
            uploaded_by: gp.uploaded_by,
          });
        }
      });

      // Apply filters
      let filtered = photos;

      const dateRange = filters?.dateRange || getDateRange(filters?.timeFilter);
      if (dateRange) {
        filtered = filtered.filter(p => p.taken_at >= dateRange.start && p.taken_at <= dateRange.end);
      }

      if (filters?.source && filters.source !== 'all') {
        filtered = filtered.filter(p => p.source === filters.source);
      }

      if (filters?.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(p =>
          p.caption.toLowerCase().includes(q) ||
          p.source_label.toLowerCase().includes(q)
        );
      }

      filtered.sort((a, b) => b.taken_at.localeCompare(a.taken_at));
      return filtered;
    },
  });
}

export function useAddGalleryPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      files,
      caption,
      takenAt,
      projectId,
      propertyId,
    }: {
      files: File[];
      caption: string;
      takenAt: string;
      projectId?: string;
      propertyId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const contextId = projectId || propertyId || 'direct';
      const uploadedUrls: string[] = [];

      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `gallery/${contextId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('daily-report-photos')
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('daily-report-photos')
          .getPublicUrl(path);
        uploadedUrls.push(publicUrl);
      }

      const rows = uploadedUrls.map(url => ({
        url,
        caption,
        taken_at: takenAt,
        source: 'direct' as const,
        property_id: propertyId || null,
        project_id: projectId || null,
        uploaded_by: user?.id,
      }));

      const { error } = await supabase.from('photo_gallery').insert(rows);
      if (error) throw error;
      return uploadedUrls;
    },
    onSuccess: (_, vars) => {
      if (vars.projectId) queryClient.invalidateQueries({ queryKey: ['project-gallery', vars.projectId] });
      if (vars.propertyId) queryClient.invalidateQueries({ queryKey: ['property-gallery', vars.propertyId] });
    },
  });
}
