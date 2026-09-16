import { describe, expect, it } from 'vitest';
import {
  buildClientVisibleProjectConditions,
  buildLocationLabel,
  buildProjectConditionsSummary,
  buildProjectConditionRecordUpsertRow,
  buildProjOsConditionIngestPayload,
  classifyFieldItemAsProjectCondition,
  mapProjectConditionDbRowsToRecords,
  mapFieldStatusToProjectConditionStatus,
  type ProjectConditionRecord,
} from '../projectConditionsRegister';

const baseRecord: ProjectConditionRecord = {
  id: 'GG-0001',
  projectId: 'glorieta-gardens-concrete-stucco-repair',
  projectName: 'Glorieta Gardens Concrete and Stucco Repair',
  buildingOrArea: 'Building 3',
  elevation: 'North',
  floor: '2',
  unit: 'TBD',
  element: 'Balcony slab edge',
  classification: 'needs_engineer_determination',
  classificationStatus: 'needs_review',
  observedCondition: 'Spalled concrete observed at slab edge; confirm reinforcing exposure during assessment.',
  conditionCategory: 'Concrete spalling',
  severity: 'high',
  quantity: 4.5,
  quantityUnit: 'SF',
  repairType: 'Concrete repair - slab edge',
  permitStatus: 'permit_required',
  ownerSignoffStatus: 'not_ready',
  status: 'needs_engineer_review',
  aiSuggestion: 'Needs close-up photo with scale reference and engineer classification.',
  aiConfidence: 0.72,
  humanReviewRequired: true,
  clientPublishStatus: 'internal_only',
  clientSummary: null,
  comments: [
    {
      id: 'C-0001',
      body: 'Do not send to owner until engineer determines structural classification.',
      createdBy: 'apas.lead@apas.ai',
      createdAt: '2026-09-15T10:20:00-04:00',
      role: 'APAS Lead',
      audience: 'internal',
    },
  ],
  notations: [
    {
      id: 'N-0001',
      type: 'Observed Condition',
      body: 'Confirm whether reinforcing steel is exposed after closer access.',
      createdBy: 'field.user@apas.ai',
      createdAt: '2026-09-15T10:04:00-04:00',
      audience: 'internal',
    },
  ],
  audit: [
    {
      id: 'A-0001',
      event: 'condition.created',
      actor: 'field.user@apas.ai',
      at: '2026-09-15T10:00:00-04:00',
      note: 'Draft record created during field walk.',
    },
  ],
};

describe('project conditions register', () => {
  it('builds a stable location label', () => {
    expect(buildLocationLabel(baseRecord)).toBe('Building 3 / North / 2 / TBD / Balcony slab edge');
    expect(buildLocationLabel({ ...baseRecord, locationLabel: 'B3 north balcony' })).toBe('B3 north balcony');
  });

  it('keeps internal AI and comments out of client-visible records', () => {
    const clientVisible = buildClientVisibleProjectConditions([
      baseRecord,
      {
        ...baseRecord,
        id: 'GG-0002',
        classification: 'non_structural',
        classificationStatus: 'engineer_approved',
        permitStatus: 'no_permit_expected',
        ownerSignoffStatus: 'ready_for_owner',
        status: 'ready_for_owner',
        clientPublishStatus: 'published_to_client',
        clientSummary: 'Localized stucco finish repair is ready for owner review.',
        comments: [
          ...baseRecord.comments,
          {
            id: 'C-0002',
            body: 'Please confirm whether this can be included in the early release package.',
            createdBy: 'owner@example.com',
            createdAt: '2026-09-15T12:15:00-04:00',
            role: 'Owner',
            audience: 'client_visible',
          },
        ],
      },
    ]);

    expect(clientVisible).toHaveLength(1);
    expect(clientVisible[0].id).toBe('GG-0002');
    expect(clientVisible[0].comments).toEqual([
      expect.objectContaining({ id: 'C-0002', audience: 'client_visible' }),
    ]);
  });

  it('summarizes internal and client-visible state for dashboards', () => {
    const summary = buildProjectConditionsSummary([
      baseRecord,
      {
        ...baseRecord,
        id: 'GG-0002',
        classification: 'non_structural',
        classificationStatus: 'engineer_approved',
        permitStatus: 'no_permit_expected',
        ownerSignoffStatus: 'ready_for_owner',
        status: 'ready_for_owner',
        clientPublishStatus: 'ready_to_publish',
      },
    ]);

    expect(summary).toMatchObject({
      total: 2,
      clientVisible: 1,
      nonStructural: 1,
      needsEngineer: 1,
      readyForOwner: 1,
    });
    expect(summary.hiddenInternalNotes).toBeGreaterThan(0);
  });

  it('builds the Proj OS ingest shape without trusting caller identity fields', () => {
    const payload = buildProjOsConditionIngestPayload({
      projectId: baseRecord.projectId,
      sourceSystem: 'project-conditions-register',
      actor: {
        email: 'apas.lead@apas.ai',
        role: 'APAS Lead',
        identityProvider: 'Google Workspace',
      },
      records: [baseRecord],
    });

    expect(payload.actor).toEqual({
      email: 'apas.lead@apas.ai',
      role: 'APAS Lead',
      identity_provider: 'Google Workspace',
    });
    expect(payload.records[0].visibility.internal_notes_hidden_from_client).toBe(true);
    expect(payload.records[0].comments[0]).toMatchObject({
      comment_id: 'C-0001',
      audience: 'internal',
    });
  });

  it('maps existing Field Accountability concepts into project-condition language', () => {
    expect(classifyFieldItemAsProjectCondition({
      category: 'structural',
      title: 'Spalled concrete at balcony slab edge',
      description: 'Visible reinforcing steel',
    })).toBe('needs_engineer_determination');
    expect(classifyFieldItemAsProjectCondition({
      category: 'landscaping',
      title: 'Mulch washout',
      description: 'Landscape restoration item',
    })).toBe('non_structural');
    expect(mapFieldStatusToProjectConditionStatus('ready_for_review')).toBe('ready_for_owner');
    expect(mapFieldStatusToProjectConditionStatus('verified')).toBe('verified_complete');
  });

  it('hydrates durable Supabase rows into branded register records', () => {
    const records = mapProjectConditionDbRowsToRecords({
      projectName: baseRecord.projectName,
      records: [{
        id: '11111111-1111-4111-8111-111111111111',
        project_id: baseRecord.projectId,
        field_item_id: '22222222-2222-4222-8222-222222222222',
        condition_number: 7,
        source_system: 'field-accountability',
        source_record_id: '22222222-2222-4222-8222-222222222222',
        building_or_area: 'Building 4',
        element: 'Exterior stair landing',
        classification: 'needs_engineer_determination',
        classification_status: 'needs_review',
        observed_condition: 'Cracked landing edge observed during walk.',
        condition_category: 'concrete',
        severity: 'high',
        permit_status: 'permit_required',
        owner_signoff_status: 'not_ready',
        status: 'needs_engineer_review',
        human_review_required: true,
        client_publish_status: 'internal_only',
        client_summary: null,
        updated_at: '2026-09-16T04:00:00Z',
      }],
      comments: [{
        id: '33333333-3333-4333-8333-333333333333',
        condition_id: '11111111-1111-4111-8111-111111111111',
        body: 'Hold for engineer review before publishing.',
        audience: 'internal',
        created_by: '44444444-4444-4444-8444-444444444444',
        created_at: '2026-09-16T04:01:00Z',
      }],
    });

    expect(records[0]).toMatchObject({
      id: 'PCR-0007',
      databaseId: '11111111-1111-4111-8111-111111111111',
      fieldItemId: '22222222-2222-4222-8222-222222222222',
      buildingOrArea: 'Building 4',
      comments: [expect.objectContaining({ audience: 'internal' })],
    });
  });

  it('builds durable register rows from Field Accountability items', () => {
    const row = buildProjectConditionRecordUpsertRow({
      tenantId: '55555555-5555-4555-8555-555555555555',
      userId: '66666666-6666-4666-8666-666666666666',
      projectName: baseRecord.projectName,
      item: {
        id: '77777777-7777-4777-8777-777777777777',
        tenant_id: '55555555-5555-4555-8555-555555555555',
        project_id: baseRecord.projectId,
        property_id: null,
        visit_id: null,
        item_number: 12,
        title: 'Stucco coating loose at breezeway',
        description: 'Loose stucco finish observed.',
        category: 'stucco',
        severity: 'medium',
        location_label: 'Building 5 / Breezeway',
        lat: null,
        lng: null,
        status: 'ready_for_review',
        ball_in_court: 'apas',
        responsible_user_id: null,
        responsible_contact_id: null,
        responsible_organization_id: null,
        work_order_id: null,
        source_type: null,
        source_record_id: null,
        due_date: null,
        repeat_count: 0,
        owner_visible: true,
        owner_verification_required: true,
        ready_for_review_at: null,
        verified_at: null,
        verified_by: null,
        reopened_at: null,
        archived_at: null,
        created_by: '66666666-6666-4666-8666-666666666666',
        created_at: '2026-09-16T04:00:00Z',
        updated_at: '2026-09-16T04:00:00Z',
        photos: [],
        annotations: [],
        comments: [],
        events: [],
      },
    });

    expect(row).toMatchObject({
      source_system: 'field-accountability',
      source_record_id: '77777777-7777-4777-8777-777777777777',
      field_item_id: '77777777-7777-4777-8777-777777777777',
      classification: 'non_structural',
      client_publish_status: 'published_to_client',
      client_summary: 'Loose stucco finish observed.',
      severity: 'moderate',
    });
  });
});
