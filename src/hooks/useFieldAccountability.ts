/* Generated Supabase types intentionally lag additive migrations in this repository. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveCurrentWorkspaceId } from '@/lib/tenant';
import { readExif } from '@/lib/exif';

export type FieldStatus =
  | 'needs_triage' | 'assigned' | 'in_progress' | 'ready_for_review'
  | 'verified' | 'reopened' | 'deferred' | 'rejected';
export type FieldSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FieldEvidenceType = 'observation' | 'before' | 'progress' | 'after';
export type FieldBallInCourt = 'apas' | 'property_management' | 'maintenance' | 'owner' | 'vendor';

export interface FieldVisit {
  id: string;
  tenant_id: string;
  project_id: string;
  property_id: string | null;
  title: string;
  visit_type: string;
  visited_at: string;
  status: 'draft' | 'triage' | 'active' | 'complete';
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FieldPhoto {
  id: string;
  tenant_id: string;
  project_id: string;
  visit_id: string | null;
  item_id: string | null;
  photo_id: string;
  evidence_type: FieldEvidenceType;
  sort_order: number;
  ai_suggestion: Record<string, unknown>;
  ai_status?: 'not_analyzed' | 'queued' | 'analyzing' | 'drafted' | 'failed';
  ai_error?: string | null;
  analyzed_at?: string | null;
  analysis_model?: string | null;
  review_status?: 'unreviewed' | 'ai_drafted' | 'needs_clarification' | 'confirmed';
  reviewed_category?: string | null;
  reviewed_severity?: FieldSeverity | null;
  reviewed_narrative?: string | null;
  recommended_action?: string | null;
  reviewed_location?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  photo: {
    id: string;
    uploader_id: string | null;
    storage_path: string;
    thumb_path: string | null;
    taken_at: string | null;
    lat: number | null;
    lng: number | null;
    caption: string | null;
    exif?: Record<string, unknown> | null;
    created_at: string;
  };
}

export interface FieldAnnotation {
  id: string;
  item_id: string;
  photo_id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  created_by: string;
  created_at: string;
}

export interface FieldComment {
  id: string;
  item_id: string;
  photo_id: string | null;
  annotation_id: string | null;
  body: string;
  visibility: 'owner' | 'internal';
  author_id: string;
  created_at: string;
}

export interface FieldEvent {
  id: string;
  item_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor_id: string;
  created_at: string;
}

export interface FieldItem {
  id: string;
  tenant_id: string;
  project_id: string;
  property_id: string | null;
  visit_id: string | null;
  item_number: number;
  title: string;
  description: string | null;
  category: string;
  severity: FieldSeverity;
  location_label: string | null;
  lat: number | null;
  lng: number | null;
  status: FieldStatus;
  ball_in_court: FieldBallInCourt;
  responsible_user_id: string | null;
  responsible_contact_id: string | null;
  responsible_organization_id: string | null;
  work_order_id: string | null;
  source_type: string | null;
  source_record_id: string | null;
  due_date: string | null;
  repeat_count: number;
  owner_visible: boolean;
  owner_verification_required: boolean;
  ready_for_review_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  reopened_at: string | null;
  archived_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  photos: FieldPhoto[];
  annotations: FieldAnnotation[];
  comments: FieldComment[];
  events: FieldEvent[];
}

export interface FieldAccountabilityData {
  items: FieldItem[];
  visits: FieldVisit[];
  allPhotos: FieldPhoto[];
  untriagedPhotos: FieldPhoto[];
}

type UploadInput = {
  file: File;
  caption?: string;
  currentLocation?: { lat: number; lng: number; accuracy?: number } | null;
};

async function tenantAndUser() {
  const [{ data: userData }, tenantId] = await Promise.all([
    supabase.auth.getUser(),
    resolveCurrentWorkspaceId(),
  ]);
  if (!tenantId) throw new Error('No workspace for current user');
  if (!userData.user) throw new Error('Please sign in again');
  return { tenantId, userId: userData.user.id };
}

export function useFieldAccountability(projectId: string | null) {
  const qc = useQueryClient();
  const key = ['field-accountability', projectId];

  const list = useQuery<FieldAccountabilityData>({
    queryKey: key,
    enabled: Boolean(projectId),
    queryFn: async () => {
      const db = supabase as any;
      const [itemsResult, visitsResult, photosResult, annotationsResult, commentsResult, eventsResult] = await Promise.all([
        db.from('field_accountability_items').select('*').eq('project_id', projectId).is('archived_at', null),
        db.from('field_visits').select('*').eq('project_id', projectId).order('visited_at', { ascending: false }),
        db.from('field_accountability_photos').select('*, photo:photos(id,uploader_id,storage_path,thumb_path,taken_at,lat,lng,caption,exif,created_at)').eq('project_id', projectId).order('sort_order'),
        db.from('field_photo_annotations').select('*').eq('project_id', projectId),
        db.from('field_accountability_comments').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
        db.from('field_accountability_events').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      ]);
      const firstError = [itemsResult, visitsResult, photosResult, annotationsResult, commentsResult, eventsResult].find((r) => r.error)?.error;
      if (firstError) throw firstError;

      const photoLinks = (photosResult.data ?? []).filter((row: any) => row.photo) as FieldPhoto[];
      const annotations = (annotationsResult.data ?? []) as FieldAnnotation[];
      const comments = (commentsResult.data ?? []) as FieldComment[];
      const events = (eventsResult.data ?? []) as FieldEvent[];
      const items = ((itemsResult.data ?? []) as Omit<FieldItem, 'photos' | 'annotations' | 'comments' | 'events'>[])
        .map((item) => ({
          ...item,
          photos: photoLinks.filter((photo) => photo.item_id === item.id),
          annotations: annotations.filter((annotation) => annotation.item_id === item.id),
          comments: comments.filter((comment) => comment.item_id === item.id),
          events: events.filter((event) => event.item_id === item.id),
        }))
        .sort((a, b) => {
          if (a.status === 'verified' && b.status !== 'verified') return -1;
          if (b.status === 'verified' && a.status !== 'verified') return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });

      return {
        items,
        visits: (visitsResult.data ?? []) as FieldVisit[],
        allPhotos: photoLinks.slice().sort((a, b) =>
          new Date(a.photo.taken_at || a.photo.created_at).getTime()
          - new Date(b.photo.taken_at || b.photo.created_at).getTime(),
        ),
        untriagedPhotos: photoLinks.filter((photo) => !photo.item_id),
      };
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const createVisit = useMutation({
    mutationFn: async (input: {
      title: string;
      visitType: string;
      visitedAt?: string;
      notes?: string;
      propertyId?: string | null;
    }) => {
      if (!projectId) throw new Error('No project selected');
      const { tenantId, userId } = await tenantAndUser();
      const { data, error } = await (supabase as any).from('field_visits').insert({
        tenant_id: tenantId,
        project_id: projectId,
        property_id: input.propertyId ?? null,
        title: input.title.trim(),
        visit_type: input.visitType,
        visited_at: input.visitedAt ?? new Date().toISOString(),
        notes: input.notes?.trim() || null,
        created_by: userId,
      }).select().single();
      if (error) throw error;
      return data as FieldVisit;
    },
    onSuccess: invalidate,
  });

  const createItem = useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      category?: string;
      severity?: FieldSeverity;
      locationLabel?: string;
      ballInCourt?: FieldBallInCourt;
      dueDate?: string | null;
      visitId?: string | null;
      propertyId?: string | null;
      ownerVisible?: boolean;
      ownerVerificationRequired?: boolean;
      photoLinkIds?: string[];
    }) => {
      if (!projectId) throw new Error('No project selected');
      const { tenantId, userId } = await tenantAndUser();
      const { data, error } = await (supabase as any).from('field_accountability_items').insert({
        tenant_id: tenantId,
        project_id: projectId,
        property_id: input.propertyId ?? null,
        visit_id: input.visitId ?? null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category ?? 'other',
        severity: input.severity ?? 'medium',
        location_label: input.locationLabel?.trim() || null,
        status: 'assigned',
        ball_in_court: input.ballInCourt ?? 'property_management',
        due_date: input.dueDate || null,
        owner_visible: input.ownerVisible ?? true,
        owner_verification_required: input.ownerVerificationRequired ?? false,
        created_by: userId,
      }).select().single();
      if (error) throw error;
      if (input.photoLinkIds?.length) {
        const { error: linkError } = await (supabase as any).from('field_accountability_photos')
          .update({ item_id: data.id, ai_approved_at: new Date().toISOString(), ai_approved_by: userId })
          .in('id', input.photoLinkIds)
          .eq('project_id', projectId);
        if (linkError) throw linkError;
      }
      return data as FieldItem;
    },
    onSuccess: invalidate,
  });

  const updateItem = useMutation({
    mutationFn: async ({ itemId, patch }: { itemId: string; patch: Partial<FieldItem> }) => {
      const allowed = {
        title: patch.title,
        description: patch.description,
        category: patch.category,
        severity: patch.severity,
        location_label: patch.location_label,
        ball_in_court: patch.ball_in_court,
        due_date: patch.due_date,
        owner_visible: patch.owner_visible,
        owner_verification_required: patch.owner_verification_required,
        responsible_user_id: patch.responsible_user_id,
        responsible_contact_id: patch.responsible_contact_id,
        responsible_organization_id: patch.responsible_organization_id,
        work_order_id: patch.work_order_id,
      };
      const clean = Object.fromEntries(Object.entries(allowed).filter(([, value]) => value !== undefined));
      const { data, error } = await (supabase as any).from('field_accountability_items')
        .update(clean).eq('id', itemId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const uploadPhotos = useMutation({
    mutationFn: async (input: {
      visitId?: string | null;
      itemId?: string | null;
      evidenceType?: FieldEvidenceType;
      files: UploadInput[];
    }) => {
      if (!projectId) throw new Error('No project selected');
      if (!input.visitId && !input.itemId) throw new Error('Choose a walk or accountability item');
      const { tenantId, userId } = await tenantAndUser();
      const uploaded: FieldPhoto[] = [];

      for (let index = 0; index < input.files.length; index += 1) {
        const queued = input.files[index];
        const exif = await readExif(queued.file);
        const fallback = queued.currentLocation;
        const safeName = queued.file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
        const storagePath = `${tenantId}/${projectId}/${crypto.randomUUID()}-${safeName}`;
        const { error: storageError } = await supabase.storage.from('project-photos').upload(storagePath, queued.file);
        if (storageError) throw storageError;

        const { data: photo, error: photoError } = await (supabase as any).from('photos').insert({
          tenant_id: tenantId,
          project_id: projectId,
          uploader_id: userId,
          storage_path: storagePath,
          caption: queued.caption?.trim() || null,
          lat: exif.lat ?? fallback?.lat ?? null,
          lng: exif.lng ?? fallback?.lng ?? null,
          taken_at: exif.takenAt ?? new Date().toISOString(),
          exif: {
            ...(exif.raw ?? {}),
            location_source: exif.lat != null ? 'exif' : fallback ? 'device_current' : 'not_available',
            location_accuracy_m: exif.lat == null ? fallback?.accuracy ?? null : null,
          },
        }).select().single();
        if (photoError) throw photoError;

        const { data: link, error: linkError } = await (supabase as any).from('field_accountability_photos').insert({
          tenant_id: tenantId,
          project_id: projectId,
          visit_id: input.visitId ?? null,
          item_id: input.itemId ?? null,
          photo_id: photo.id,
          evidence_type: input.evidenceType ?? 'observation',
          sort_order: index,
          created_by: userId,
        }).select('*, photo:photos(id,uploader_id,storage_path,thumb_path,taken_at,lat,lng,caption,created_at)').single();
        if (linkError) throw linkError;
        uploaded.push(link as FieldPhoto);
        // Thumbnail generation is advisory and must never make a confirmed
        // field upload appear to fail. It runs after the database linkage.
        void supabase.functions.invoke('photo-process', { body: { photo_id: photo.id } });
      }
      return uploaded;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ['photos', projectId] });
    },
  });

  const transitionItem = useMutation({
    mutationFn: async ({ itemId, status, note }: { itemId: string; status: FieldStatus; note?: string }) => {
      const { data, error } = await (supabase as any).rpc('transition_field_accountability_item', {
        p_item_id: itemId,
        p_target_status: status,
        p_note: note?.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const updatePhotoCaption = useMutation({
    mutationFn: async ({ photoId, caption }: { photoId: string; caption: string }) => {
      const { data, error } = await (supabase as any).rpc('update_field_photo_caption', {
        p_photo_id: photoId,
        p_caption: caption,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const addComment = useMutation({
    mutationFn: async (input: { itemId: string; body: string; visibility?: 'owner' | 'internal'; photoId?: string | null; annotationId?: string | null }) => {
      if (!projectId) throw new Error('No project selected');
      const { tenantId, userId } = await tenantAndUser();
      const { data, error } = await (supabase as any).from('field_accountability_comments').insert({
        tenant_id: tenantId,
        project_id: projectId,
        item_id: input.itemId,
        photo_id: input.photoId ?? null,
        annotation_id: input.annotationId ?? null,
        body: input.body.trim(),
        visibility: input.visibility ?? 'owner',
        author_id: userId,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const addAnnotation = useMutation({
    mutationFn: async (input: { itemId: string; photoId: string; x: number; y: number; label: string }) => {
      if (!projectId) throw new Error('No project selected');
      const { tenantId, userId } = await tenantAndUser();
      const { data, error } = await (supabase as any).from('field_photo_annotations').insert({
        tenant_id: tenantId,
        project_id: projectId,
        item_id: input.itemId,
        photo_id: input.photoId,
        x: Math.max(0, Math.min(1, input.x)),
        y: Math.max(0, Math.min(1, input.y)),
        label: input.label.trim(),
        created_by: userId,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const analyzePhoto = useMutation({
    mutationFn: async (photoLinkId: string) => {
      const { data, error } = await supabase.functions.invoke('field-photo-assist', { body: { photoLinkId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.suggestion as Record<string, unknown>;
    },
    onSuccess: invalidate,
  });

  const updatePhotoReview = useMutation({
    mutationFn: async (input: {
      photoLinkId: string;
      reviewStatus: 'unreviewed' | 'ai_drafted' | 'needs_clarification' | 'confirmed';
      category: string;
      severity: FieldSeverity;
      narrative: string;
      action: string;
      location: string;
    }) => {
      const { data, error } = await (supabase as any).rpc('update_field_photo_review', {
        p_photo_link_id: input.photoLinkId,
        p_review_status: input.reviewStatus,
        p_category: input.category || null,
        p_severity: input.severity || null,
        p_narrative: input.narrative || null,
        p_action: input.action || null,
        p_location: input.location || null,
      });
      if (error) throw error;
      return data as FieldPhoto;
    },
    onSuccess: invalidate,
  });

  return {
    ...list,
    createVisit,
    createItem,
    updateItem,
    uploadPhotos,
    updatePhotoCaption,
    transitionItem,
    addComment,
    addAnnotation,
    analyzePhoto,
    updatePhotoReview,
  };
}
