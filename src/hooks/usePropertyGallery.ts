import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  taken_at: string;
  source: 'grounds_inspection' | 'nspire_inspection' | 'daily_report' | 'direct';
  source_id: string;
  source_label: string;
  source_route: string;
  uploaded_by?: string;
}

export interface GalleryFilters {
  source?: string;
  search?: string;
  dateRange?: { start: string; end: string };
  timeFilter?: 'this_week' | 'this_month' | 'last_3_months' | 'all_time';
}

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

export function usePropertyGallery(propertyId: string, filters?: GalleryFilters) {
  return useQuery({
    queryKey: ['property-gallery', propertyId, filters],
    enabled: !!propertyId,
    queryFn: async () => {
      const photos: GalleryPhoto[] = [];

      // 1. Grounds inspection photos via daily_inspection_items
      const { data: inspItems } = await supabase
        .from('daily_inspection_items')
        .select(`
          id, photo_urls, notes, checked_at,
          daily_inspection:daily_inspections!daily_inspection_id(
            id, inspection_date, property_id
          )
        `)
        .not('photo_urls', 'is', null);

      inspItems?.forEach((item: any) => {
        const insp = item.daily_inspection;
        if (!insp || insp.property_id !== propertyId) return;
        (item.photo_urls || []).forEach((url: string, i: number) => {
          const dateStr = insp.inspection_date || item.checked_at?.split('T')[0] || format(new Date(), 'yyyy-MM-dd');
          let label = 'Grounds Inspection';
          try { label = `Grounds Inspection · ${format(parseISO(dateStr), 'MMM d')}`; } catch {}
          photos.push({
            id: `grounds_${item.id}_${i}`,
            url,
            caption: '',
            taken_at: dateStr,
            source: 'grounds_inspection',
            source_id: insp.id || '',
            source_label: label,
            source_route: `/inspections/grounds?inspectionId=${insp.id}`,
          });
        });
      });

      // 2. NSPIRE defect photos
      const { data: defects } = await supabase
        .from('defects')
        .select(`
          id, photo_urls, item_name, category, severity,
          inspection:inspections!inspection_id(
            id, inspection_date, property_id
          )
        `)
        .not('photo_urls', 'is', null);

      defects?.forEach((defect: any) => {
        const insp = defect.inspection;
        if (!insp || insp.property_id !== propertyId) return;
        (defect.photo_urls || []).forEach((url: string, i: number) => {
          const dateStr = insp.inspection_date || format(new Date(), 'yyyy-MM-dd');
          let label = `NSPIRE · ${defect.item_name}`;
          try { label = `NSPIRE · ${defect.item_name} · ${format(parseISO(dateStr), 'MMM d')}`; } catch {}
          photos.push({
            id: `nspire_${defect.id}_${i}`,
            url,
            caption: '',
            taken_at: dateStr,
            source: 'nspire_inspection',
            source_id: insp.id || '',
            source_label: label,
            source_route: `/inspections?inspectionId=${insp.id}`,
          });
        });
      });

      // 3. photo_gallery direct uploads + captions
      const { data: galleryPhotos } = await supabase
        .from('photo_gallery')
        .select('*')
        .eq('property_id', propertyId);

      const captionMap = new Map<string, { caption: string; taken_at: string }>();
      galleryPhotos?.forEach((gp: any) => {
        captionMap.set(gp.url, { caption: gp.caption || '', taken_at: gp.taken_at });
      });

      // Override captions for source photos
      photos.forEach(p => {
        const override = captionMap.get(p.url);
        if (override) {
          p.caption = override.caption;
          if (override.taken_at) p.taken_at = override.taken_at;
          captionMap.delete(p.url); // mark as consumed
        }
      });

      // Add remaining direct uploads
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

export function useDeleteGalleryPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      photoId,
      propertyId,
      projectId,
    }: {
      photoId: string;
      propertyId?: string;
      projectId?: string;
    }) => {
      const { error } = await supabase
        .from('photo_gallery')
        .delete()
        .eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      if (vars.propertyId) queryClient.invalidateQueries({ queryKey: ['property-gallery', vars.propertyId] });
      if (vars.projectId) queryClient.invalidateQueries({ queryKey: ['project-gallery', vars.projectId] });
    },
  });
}

export function useUpdatePhotoCaption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      url,
      caption,
      propertyId,
      projectId,
      takenAt,
      source,
      sourceId,
      sourceLabel,
      sourceRoute,
    }: {
      url: string;
      caption: string;
      propertyId?: string;
      projectId?: string;
      takenAt?: string;
      source?: string;
      sourceId?: string;
      sourceLabel?: string;
      sourceRoute?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const upsertData: any = {
        url,
        caption,
        source: source || 'direct',
        source_id: sourceId || null,
        source_label: sourceLabel || null,
        source_route: sourceRoute || null,
        uploaded_by: user?.id,
      };
      if (propertyId) upsertData.property_id = propertyId;
      if (projectId) upsertData.project_id = projectId;
      if (takenAt) upsertData.taken_at = takenAt;

      // Try to find existing record
      let query = supabase.from('photo_gallery').select('id').eq('url', url);
      if (propertyId) query = query.eq('property_id', propertyId);
      if (projectId) query = query.eq('project_id', projectId);
      const { data: existing } = await query.maybeSingle();

      if (existing?.id) {
        await supabase.from('photo_gallery').update({ caption, taken_at: takenAt }).eq('id', existing.id);
      } else {
        await supabase.from('photo_gallery').insert(upsertData);
      }
    },
    onSuccess: (_, vars) => {
      if (vars.propertyId) queryClient.invalidateQueries({ queryKey: ['property-gallery', vars.propertyId] });
      if (vars.projectId) queryClient.invalidateQueries({ queryKey: ['project-gallery', vars.projectId] });
    },
  });
}
