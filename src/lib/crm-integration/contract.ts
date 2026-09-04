export const CRM_CONTRACT_VERSION = 'crm-integration.v1' as const;
export const CARD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const MAX_CARD_BYTES = 12_000_000;

export const CRM_INTAKE_STATES = [
  'uploading_securely',
  'reading_card',
  'review_uncertain_fields',
  'possible_matches_found',
  'waiting_proj_os_approval',
  'approved_for_submission',
  'sent_to_apas_crm',
  'waiting_crm_review',
  'linked_to_master_contact',
  'retry_queued',
  'rejected',
  'returned_for_correction',
] as const;

export type CrmIntakeState = typeof CRM_INTAKE_STATES[number];

export interface CrmIntegrationIntake {
  id: string;
  tenant_id: string;
  project_id: string;
  submitter_user_id: string;
  source_contract_version: typeof CRM_CONTRACT_VERSION;
  status: CrmIntakeState;
  correlation_id: string;
  source_context: Record<string, unknown>;
  project_private_context: Record<string, unknown>;
  review_payload: Record<string, unknown>;
  external_intake_id: string | null;
  canonical_apas_contact_id: string | null;
  current_remote_status: string | null;
  retry_count: number;
  retryable: boolean;
  next_retry_at: string | null;
  safe_failure_code: string | null;
  safe_failure_reason: string | null;
  project_directory_entry_id: string | null;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  resolved_at: string | null;
}

export interface CrmCategory {
  id: string;
  name: string;
  active: boolean;
}

export interface CrmCategoryCatalog {
  contractVersion: typeof CRM_CONTRACT_VERSION;
  catalogVersion: string;
  categories: CrmCategory[];
}

export interface UploadGrant {
  uploadId: string;
  side: 'front' | 'back';
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
  maxBytes: number;
}

export interface DuplicateCandidate {
  id: string;
  displayName: string;
  companyName?: string;
  reason?: string;
  score?: number;
}

export interface ContactProposal {
  contact: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    jobTitle?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: string;
  };
  duplicateDecision: 'create' | 'update' | 'link' | 'keep_separate';
  duplicateContactId?: string;
  requestedCategoryIds: string[];
  catalogVersion: string;
  projectRole?: string | null;
  promotedSourceContext: Record<string, string>;
}

export const STATE_COPY: Record<CrmIntakeState, { label: string; detail: string; tone: 'neutral' | 'warning' | 'success' | 'danger' }> = {
  uploading_securely: { label: 'Uploading securely', detail: 'Your card is going directly to the APAS CRM private intake boundary.', tone: 'neutral' },
  reading_card: { label: 'Reading the card', detail: 'APAS CRM is extracting only visible card information.', tone: 'neutral' },
  review_uncertain_fields: { label: 'Review uncertain fields', detail: 'Correct or omit anything the card reader could not verify confidently.', tone: 'warning' },
  possible_matches_found: { label: 'Possible matches found', detail: 'Choose whether this is a new contact or an existing APAS CRM record.', tone: 'warning' },
  waiting_proj_os_approval: { label: 'Waiting for your approval', detail: 'The exact proposal is ready. Nothing else can be substituted after approval.', tone: 'warning' },
  approved_for_submission: { label: 'Approved for submission', detail: 'The one-time approval was consumed and the exact proposal is being submitted.', tone: 'neutral' },
  sent_to_apas_crm: { label: 'Sent to APAS CRM', detail: 'The attributed intake was accepted by the master CRM.', tone: 'neutral' },
  waiting_crm_review: { label: 'Waiting for CRM administrator review', detail: 'A CRM curator must resolve the master record before it is linked here.', tone: 'warning' },
  linked_to_master_contact: { label: 'Linked to master contact', detail: 'The canonical APAS CRM contact is connected to this project.', tone: 'success' },
  retry_queued: { label: 'APAS CRM temporarily unavailable', detail: 'No local master contact was created. The same approved request can be retried safely.', tone: 'danger' },
  rejected: { label: 'Rejected', detail: 'The intake was rejected without changing the project directory.', tone: 'danger' },
  returned_for_correction: { label: 'Returned for correction', detail: 'Review the requested corrections and prepare a new exact approval.', tone: 'warning' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readSuggestedContact(payload: Record<string, unknown>): ContactProposal['contact'] {
  const proposal = isRecord(payload.proposal) ? payload.proposal : payload;
  const contact = isRecord(proposal.contact) ? proposal.contact : {};
  const fields = isRecord(payload.fields) ? payload.fields : {};
  const result: ContactProposal['contact'] = {};
  const keys: Array<keyof ContactProposal['contact']> = [
    'firstName', 'lastName', 'displayName', 'jobTitle', 'companyName',
    'email', 'phone', 'mobile', 'website', 'address',
  ];
  for (const key of keys) {
    const direct = contact[key];
    const candidate = fields[key];
    const value = typeof direct === 'string'
      ? direct
      : isRecord(candidate) && typeof candidate.value === 'string'
        ? candidate.value
        : typeof candidate === 'string'
          ? candidate
          : undefined;
    if (value) result[key] = value;
  }
  return result;
}

export function readDuplicateCandidates(payload: Record<string, unknown>): DuplicateCandidate[] {
  if (!Array.isArray(payload.duplicateCandidates)) return [];
  return payload.duplicateCandidates.flatMap((value) => {
    if (!isRecord(value) || typeof value.id !== 'string' || typeof value.displayName !== 'string') return [];
    return [{
      id: value.id,
      displayName: value.displayName,
      companyName: typeof value.companyName === 'string' ? value.companyName : undefined,
      reason: typeof value.reason === 'string' ? value.reason : undefined,
      score: typeof value.score === 'number' ? value.score : undefined,
    }];
  });
}

export function validateCardFile(file: File): string | null {
  if (!CARD_CONTENT_TYPES.includes(file.type as typeof CARD_CONTENT_TYPES[number])) return 'Use a JPEG, PNG, WebP, or PDF file.';
  if (file.size < 1 || file.size > MAX_CARD_BYTES) return 'Each card file must be 12 MB or smaller.';
  return null;
}
