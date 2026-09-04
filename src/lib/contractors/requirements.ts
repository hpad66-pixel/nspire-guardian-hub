import type { ContractorRequirement, ContractorResponseType } from '@/hooks/useContractorReadiness';

export const COMPLETE_REQUIREMENT_STATUSES = new Set([
  'submitted',
  'under_review',
  'verified',
  'waived',
  'not_applicable',
]);

export const RESPONSE_TYPE_COPY: Record<ContractorResponseType, { label: string; contractorLabel: string; description: string }> = {
  document: {
    label: 'Upload a document',
    contractorLabel: 'Document upload',
    description: 'The contractor provides a PDF, Word file, or image as evidence.',
  },
  questionnaire: {
    label: 'Answer a question',
    contractorLabel: 'Written response',
    description: 'The contractor provides a written response directly in the portal.',
  },
  either: {
    label: 'Upload or answer',
    contractorLabel: 'Document or written response',
    description: 'The contractor may upload evidence, write a response, or provide both.',
  },
  acknowledgement: {
    label: 'Acknowledge',
    contractorLabel: 'Acknowledgement',
    description: 'The contractor confirms that the requirement has been read and accepted.',
  },
};

export function responseType(requirement: Pick<ContractorRequirement, 'response_type'>): ContractorResponseType {
  return requirement.response_type ?? 'document';
}

export function supportsDocumentUpload(requirement: Pick<ContractorRequirement, 'response_type'>) {
  return ['document', 'either'].includes(responseType(requirement));
}

export function supportsWrittenResponse(requirement: Pick<ContractorRequirement, 'response_type'>) {
  return ['questionnaire', 'either'].includes(responseType(requirement));
}

export function isAcknowledgement(requirement: Pick<ContractorRequirement, 'response_type'>) {
  return responseType(requirement) === 'acknowledgement';
}

export function isRequirementComplete(requirement: Pick<ContractorRequirement, 'status'>) {
  return COMPLETE_REQUIREMENT_STATUSES.has(requirement.status);
}

export function contractorRequirementProgress(requirements: ContractorRequirement[]) {
  const required = requirements.filter((item) => item.required);
  const optional = requirements.filter((item) => !item.required);
  const completedRequired = required.filter(isRequirementComplete).length;
  const completedOptional = optional.filter(isRequirementComplete).length;
  return {
    required,
    optional,
    completedRequired,
    completedOptional,
    percent: required.length ? Math.round((completedRequired / required.length) * 100) : 100,
    readyToSubmit: completedRequired === required.length,
  };
}
