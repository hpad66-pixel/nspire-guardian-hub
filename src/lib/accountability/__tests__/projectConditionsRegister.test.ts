import { describe, expect, it } from 'vitest';
import {
  buildClientVisibleProjectConditions,
  buildLocationLabel,
  buildProjectConditionsSummary,
  buildProjOsConditionIngestPayload,
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
});
