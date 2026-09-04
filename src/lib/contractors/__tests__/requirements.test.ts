import { describe, expect, it } from 'vitest';
import type { ContractorRequirement } from '@/hooks/useContractorReadiness';
import {
  contractorRequirementProgress,
  isAcknowledgement,
  supportsDocumentUpload,
  supportsWrittenResponse,
} from '../requirements';

function requirement(overrides: Partial<ContractorRequirement> = {}): ContractorRequirement {
  return {
    id: crypto.randomUUID(),
    case_id: 'case-1',
    requirement_code: 'test',
    title: 'Test requirement',
    description: null,
    category: 'other',
    gate_type: 'contract',
    required: true,
    legally_required: false,
    verification_required: true,
    expiration_required: false,
    response_type: 'document',
    response_text: null,
    response_submitted_at: null,
    response_submitted_by_name: null,
    response_submitted_by_email: null,
    instructions: null,
    sort_order: 10,
    status: 'missing',
    current_document_id: null,
    due_date: null,
    waiver_reason: null,
    ...overrides,
  };
}

describe('contractor requirement controls', () => {
  it('lets optional items remain incomplete without blocking submission', () => {
    const progress = contractorRequirementProgress([
      requirement({ status: 'submitted' }),
      requirement({ required: false, status: 'missing' }),
    ]);
    expect(progress).toMatchObject({ percent: 100, readyToSubmit: true, completedRequired: 1, completedOptional: 0 });
  });

  it('counts only completed mandatory items in progress', () => {
    const progress = contractorRequirementProgress([
      requirement({ status: 'verified' }),
      requirement({ status: 'requested' }),
      requirement({ required: false, status: 'verified' }),
    ]);
    expect(progress).toMatchObject({ percent: 50, readyToSubmit: false, completedRequired: 1, completedOptional: 1 });
  });

  it('maps response types to the actions available in the portal', () => {
    expect(supportsDocumentUpload(requirement({ response_type: 'document' }))).toBe(true);
    expect(supportsWrittenResponse(requirement({ response_type: 'questionnaire' }))).toBe(true);
    expect(supportsDocumentUpload(requirement({ response_type: 'either' }))).toBe(true);
    expect(supportsWrittenResponse(requirement({ response_type: 'either' }))).toBe(true);
    expect(isAcknowledgement(requirement({ response_type: 'acknowledgement' }))).toBe(true);
  });
});
