import { describe, expect, it } from 'vitest';
import {
  buildOwnerWalkPunchCaptureSummary,
  classifyOwnerWalkCategory,
  isOwnerWalkCloseoutBlocked,
  isReadyForOwnerAcceptance,
  OWNER_WALK_CATEGORIES,
  OWNER_WALK_PIPELINE,
} from '../ownerWalkPunchCapture';
import type { FieldItem, FieldPhoto, FieldVisit } from '@/hooks/useFieldAccountability';

function photo(overrides: Partial<FieldPhoto> = {}): FieldPhoto {
  return {
    id: 'link-1',
    tenant_id: 'tenant',
    project_id: 'project',
    visit_id: 'visit-1',
    item_id: 'item-1',
    photo_id: 'photo-1',
    evidence_type: 'observation',
    sort_order: 0,
    ai_suggestion: {},
    created_at: '2026-09-15T14:00:00Z',
    photo: {
      id: 'photo-1',
      uploader_id: 'user',
      storage_path: 'tenant/project/IMG_0001.JPEG',
      thumb_path: null,
      taken_at: '2026-09-15T14:00:00Z',
      lat: null,
      lng: null,
      caption: 'Owner pointed to an exposed gate-control wire.',
      created_at: '2026-09-15T14:00:00Z',
    },
    ...overrides,
  };
}

function item(overrides: Partial<FieldItem> = {}): FieldItem {
  return {
    id: 'item-1',
    tenant_id: 'tenant',
    project_id: 'project',
    property_id: 'property',
    visit_id: 'visit-1',
    item_number: 1,
    title: 'Gate-control enclosure and exposed cabling',
    description: 'Owner wants the opening corrected before sign-off.',
    category: 'electrical',
    severity: 'high',
    location_label: 'R4 entry gate',
    lat: null,
    lng: null,
    status: 'ready_for_review',
    ball_in_court: 'vendor',
    responsible_user_id: null,
    responsible_contact_id: null,
    responsible_organization_id: null,
    work_order_id: null,
    source_type: 'owner_walk',
    source_record_id: null,
    due_date: null,
    repeat_count: 0,
    owner_visible: true,
    owner_verification_required: true,
    ready_for_review_at: '2026-09-15T14:00:00Z',
    verified_at: null,
    verified_by: null,
    reopened_at: null,
    archived_at: null,
    created_by: 'user',
    created_at: '2026-09-15T14:00:00Z',
    updated_at: '2026-09-15T14:00:00Z',
    photos: [photo({ evidence_type: 'before' }), photo({ id: 'link-2', photo_id: 'photo-2', evidence_type: 'after' })],
    annotations: [],
    comments: [],
    events: [],
    ...overrides,
  };
}

function visit(overrides: Partial<FieldVisit> = {}): FieldVisit {
  return {
    id: 'visit-1',
    tenant_id: 'tenant',
    project_id: 'project',
    property_id: 'property',
    title: 'R4 owner walk',
    visit_type: 'owner_walk',
    visited_at: '2026-09-15T14:00:00Z',
    status: 'triage',
    notes: 'Otter transcript attached after the walk.',
    created_by: 'user',
    created_at: '2026-09-15T14:00:00Z',
    updated_at: '2026-09-15T14:00:00Z',
    ...overrides,
  };
}

describe('owner walk punch capture reusable feature', () => {
  it('keeps the reusable R4 categories intentionally narrow', () => {
    expect(OWNER_WALK_CATEGORIES.map((category) => category.id)).toEqual([
      'structural',
      'mechanical',
      'electrical',
      'plumbing',
      'landscaping',
    ]);
    expect(OWNER_WALK_PIPELINE.map((stage) => stage.key)).toEqual([
      'capture',
      'transcript',
      'triage',
      'scope',
      'after',
      'acceptance',
    ]);
  });

  it('maps common field wording into the owner walk categories', () => {
    expect(classifyOwnerWalkCategory('open void beside sidewalk slab')).toBe('structural');
    expect(classifyOwnerWalkCategory('HVAC service clearance and condensate line')).toBe('mechanical');
    expect(classifyOwnerWalkCategory('gate-control wiring needs weather-rated cover')).toBe('electrical');
    expect(classifyOwnerWalkCategory('ponding at drain inlet')).toBe('plumbing');
    expect(classifyOwnerWalkCategory('tree root and sod restoration')).toBe('landscaping');
  });

  it('requires after evidence before owner acceptance is ready', () => {
    const ready = item();
    expect(isReadyForOwnerAcceptance(ready)).toBe(true);
    expect(isOwnerWalkCloseoutBlocked(ready)).toBe(false);

    const blocked = item({
      photos: [photo({ evidence_type: 'before' })],
    });
    expect(isReadyForOwnerAcceptance(blocked)).toBe(false);
    expect(isOwnerWalkCloseoutBlocked(blocked)).toBe(true);
  });

  it('builds a project-level capture summary for dashboard and portal routing', () => {
    const photos = [
      photo({ id: 'before-1', evidence_type: 'before' }),
      photo({ id: 'after-1', evidence_type: 'after' }),
      photo({ id: 'untriaged-1', item_id: null, evidence_type: 'observation' }),
    ];
    const items = [
      item(),
      item({
        id: 'item-2',
        title: 'Courtyard sod restoration',
        category: 'landscaping',
        status: 'in_progress',
        owner_verification_required: false,
        photos: [photo({ id: 'before-2', evidence_type: 'before' })],
      }),
    ];

    const summary = buildOwnerWalkPunchCaptureSummary({
      photos,
      items,
      visits: [visit(), visit({ id: 'visit-2', visit_type: 'apas_inspection' })],
    });

    expect(summary.totalPhotos).toBe(3);
    expect(summary.untriagedPhotos).toBe(1);
    expect(summary.ownerWalks).toBe(1);
    expect(summary.readyForOwnerAcceptance).toBe(1);
    expect(summary.blockedCloseout).toBe(1);
    expect(summary.categoryCounts.electrical).toBe(1);
    expect(summary.categoryCounts.landscaping).toBe(1);
  });
});

