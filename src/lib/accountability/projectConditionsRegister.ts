import type { FieldItem } from '@/hooks/useFieldAccountability';

export type ProjectConditionClassification =
  | 'structural'
  | 'non_structural'
  | 'mixed'
  | 'needs_engineer_determination';

export type ProjectConditionPublishStatus =
  | 'internal_only'
  | 'ready_to_publish'
  | 'published_to_client'
  | 'returned_before_publish';

export type ProjectConditionAudience = 'internal' | 'client_visible';

export type ProjectConditionStatus =
  | 'draft'
  | 'needs_apas_review'
  | 'needs_engineer_review'
  | 'ready_for_owner'
  | 'held_pending_permit'
  | 'released_for_contractor_pricing'
  | 'in_construction'
  | 'verified_complete'
  | 'closed'
  | 'void';

export type ProjectConditionSeverity = 'low' | 'moderate' | 'high' | 'critical' | 'to_be_determined';

export interface ProjectConditionComment {
  id: string;
  body: string;
  createdBy: string;
  createdAt: string;
  role?: string;
  audience: ProjectConditionAudience;
}

export interface ProjectConditionNotation {
  id: string;
  type: string;
  body: string;
  createdBy: string;
  createdAt: string;
  audience: ProjectConditionAudience;
}

export interface ProjectConditionAuditEvent {
  id: string;
  event: string;
  actor: string;
  at: string;
  note: string;
}

export interface ProjectConditionRecord {
  id: string;
  databaseId?: string | null;
  projectId: string;
  projectName: string;
  fieldItemId?: string | null;
  conditionNumber?: number | null;
  sourceSystem?: string | null;
  sourceRecordId?: string | null;
  buildingOrArea: string;
  elevation?: string | null;
  floor?: string | null;
  unit?: string | null;
  element: string;
  locationLabel?: string | null;
  classification: ProjectConditionClassification;
  classificationStatus: 'draft' | 'needs_review' | 'engineer_approved' | 'returned';
  observedCondition: string;
  conditionCategory: string;
  severity: ProjectConditionSeverity;
  quantity?: number | null;
  quantityUnit?: string | null;
  repairType?: string | null;
  specReference?: string | null;
  permitStatus: 'not_determined' | 'no_permit_expected' | 'permit_required' | 'held_pending_permit' | 'permit_issued';
  ownerSignoffStatus: 'not_ready' | 'ready_for_owner' | 'pending' | 'approved' | 'returned';
  status: ProjectConditionStatus;
  aiSuggestion?: string | null;
  aiConfidence?: number | null;
  humanReviewRequired: boolean;
  clientPublishStatus: ProjectConditionPublishStatus;
  clientSummary?: string | null;
  updatedAt?: string | null;
  comments: ProjectConditionComment[];
  notations: ProjectConditionNotation[];
  audit: ProjectConditionAuditEvent[];
}

export interface ProjectConditionDbRecordRow {
  id: string;
  project_id: string;
  field_item_id?: string | null;
  condition_number?: number | null;
  source_system?: string | null;
  source_record_id?: string | null;
  building_or_area: string;
  elevation?: string | null;
  floor?: string | null;
  unit?: string | null;
  element: string;
  location_label?: string | null;
  classification: ProjectConditionClassification;
  classification_status: ProjectConditionRecord['classificationStatus'];
  observed_condition: string;
  condition_category: string;
  severity: ProjectConditionSeverity;
  quantity?: number | null;
  quantity_unit?: string | null;
  repair_type?: string | null;
  spec_reference?: string | null;
  permit_status: ProjectConditionRecord['permitStatus'];
  owner_signoff_status: ProjectConditionRecord['ownerSignoffStatus'];
  status: ProjectConditionStatus;
  ai_suggestion?: string | null;
  ai_confidence?: number | null;
  human_review_required: boolean;
  client_publish_status: ProjectConditionPublishStatus;
  client_summary?: string | null;
  updated_at?: string | null;
}

export interface ProjectConditionDbCommentRow {
  id: string;
  condition_id: string;
  body: string;
  role?: string | null;
  audience: ProjectConditionAudience;
  created_by: string;
  created_at: string;
}

export interface ProjectConditionDbNotationRow {
  id: string;
  condition_id: string;
  notation_type: string;
  body: string;
  audience: ProjectConditionAudience;
  created_by: string;
  created_at: string;
}

export interface ProjectConditionDbAuditRow {
  id: string;
  condition_id: string;
  event_type: string;
  note?: string | null;
  actor_id?: string | null;
  created_at: string;
}

export interface ClientVisibleProjectCondition {
  id: string;
  projectId: string;
  projectName: string;
  buildingOrArea: string;
  locationLabel: string;
  element: string;
  classification: ProjectConditionClassification;
  observedCondition: string;
  conditionCategory: string;
  severity: ProjectConditionSeverity;
  quantity?: number | null;
  quantityUnit?: string | null;
  repairType?: string | null;
  permitStatus: ProjectConditionRecord['permitStatus'];
  ownerSignoffStatus: ProjectConditionRecord['ownerSignoffStatus'];
  status: ProjectConditionStatus;
  clientSummary: string;
  comments: ProjectConditionComment[];
  notations: ProjectConditionNotation[];
}

export interface ProjectConditionsSummary {
  total: number;
  clientVisible: number;
  structural: number;
  nonStructural: number;
  needsEngineer: number;
  heldPendingPermit: number;
  readyForOwner: number;
  hiddenInternalNotes: number;
}

const CLIENT_VISIBLE_PUBLISH_STATES = new Set<ProjectConditionPublishStatus>([
  'ready_to_publish',
  'published_to_client',
]);

export function buildLocationLabel(record: Pick<ProjectConditionRecord, 'buildingOrArea' | 'elevation' | 'floor' | 'unit' | 'element' | 'locationLabel'>) {
  if (record.locationLabel?.trim()) return record.locationLabel.trim();
  return [record.buildingOrArea, record.elevation, record.floor, record.unit, record.element]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join(' / ');
}

export function formatProjectConditionNumber(conditionNumber?: number | null) {
  return conditionNumber ? `PCR-${String(conditionNumber).padStart(4, '0')}` : null;
}

export function isClientVisibleCondition(record: Pick<ProjectConditionRecord, 'clientPublishStatus'>) {
  return CLIENT_VISIBLE_PUBLISH_STATES.has(record.clientPublishStatus);
}

export function clientVisibleComments(comments: ProjectConditionComment[]) {
  return comments.filter((comment) => comment.audience === 'client_visible');
}

export function clientVisibleNotations(notations: ProjectConditionNotation[]) {
  return notations.filter((notation) => notation.audience === 'client_visible');
}

export function toClientVisibleProjectCondition(record: ProjectConditionRecord): ClientVisibleProjectCondition | null {
  if (!isClientVisibleCondition(record)) return null;

  return {
    id: record.id,
    projectId: record.projectId,
    projectName: record.projectName,
    buildingOrArea: record.buildingOrArea,
    locationLabel: buildLocationLabel(record),
    element: record.element,
    classification: record.classification,
    observedCondition: record.observedCondition,
    conditionCategory: record.conditionCategory,
    severity: record.severity,
    quantity: record.quantity,
    quantityUnit: record.quantityUnit,
    repairType: record.repairType,
    permitStatus: record.permitStatus,
    ownerSignoffStatus: record.ownerSignoffStatus,
    status: record.status,
    clientSummary: record.clientSummary?.trim() || record.observedCondition,
    comments: clientVisibleComments(record.comments),
    notations: clientVisibleNotations(record.notations),
  };
}

export function buildClientVisibleProjectConditions(records: ProjectConditionRecord[]) {
  return records
    .map(toClientVisibleProjectCondition)
    .filter((record): record is ClientVisibleProjectCondition => Boolean(record));
}

export function buildProjectConditionsSummary(records: ProjectConditionRecord[]): ProjectConditionsSummary {
  return records.reduce<ProjectConditionsSummary>((summary, record) => {
    const clientVisible = isClientVisibleCondition(record);
    const hiddenInternalNotes = record.comments.filter((comment) => comment.audience === 'internal').length
      + record.notations.filter((notation) => notation.audience === 'internal').length
      + (record.aiSuggestion ? 1 : 0);

    return {
      total: summary.total + 1,
      clientVisible: summary.clientVisible + Number(clientVisible),
      structural: summary.structural + Number(record.classification === 'structural'),
      nonStructural: summary.nonStructural + Number(record.classification === 'non_structural'),
      needsEngineer: summary.needsEngineer + Number(record.classification === 'needs_engineer_determination' || record.classificationStatus === 'needs_review'),
      heldPendingPermit: summary.heldPendingPermit + Number(record.status === 'held_pending_permit' || record.permitStatus === 'held_pending_permit' || record.permitStatus === 'permit_required'),
      readyForOwner: summary.readyForOwner + Number(record.status === 'ready_for_owner' || record.ownerSignoffStatus === 'ready_for_owner'),
      hiddenInternalNotes: summary.hiddenInternalNotes + hiddenInternalNotes,
    };
  }, {
    total: 0,
    clientVisible: 0,
    structural: 0,
    nonStructural: 0,
    needsEngineer: 0,
    heldPendingPermit: 0,
    readyForOwner: 0,
    hiddenInternalNotes: 0,
  });
}

export function buildProjOsConditionIngestPayload(input: {
  projectId: string;
  sourceSystem: string;
  actor: { email: string; role: string; identityProvider: string };
  records: ProjectConditionRecord[];
}) {
  return {
    source_system: input.sourceSystem,
    project_id: input.projectId,
    actor: {
      email: input.actor.email,
      role: input.actor.role,
      identity_provider: input.actor.identityProvider,
    },
    records: input.records.map((record) => ({
      deficiency_id: record.id,
      building_or_area: record.buildingOrArea,
      elevation: record.elevation,
      floor: record.floor,
      unit: record.unit,
      element: record.element,
      classification: record.classification,
      observed_condition: record.observedCondition,
      condition_category: record.conditionCategory,
      severity: record.severity,
      quantity: record.quantity ?? null,
      quantity_unit: record.quantityUnit ?? null,
      repair_type: record.repairType ?? null,
      permit_status: record.permitStatus,
      register_status: record.status,
      visibility: {
        client_publish_status: record.clientPublishStatus,
        client_summary: record.clientSummary ?? '',
        internal_notes_hidden_from_client: true,
      },
      comments: record.comments.map((comment) => ({
        comment_id: comment.id,
        body: comment.body,
        created_by: comment.createdBy,
        role: comment.role,
        created_at: comment.createdAt,
        audience: comment.audience,
      })),
      notations: record.notations.map((notation) => ({
        notation_id: notation.id,
        notation_type: notation.type,
        body: notation.body,
        created_by: notation.createdBy,
        created_at: notation.createdAt,
        audience: notation.audience,
      })),
      audit: record.audit.map((event) => ({
        audit_event_id: event.id,
        event_type: event.event,
        actor_email: event.actor,
        event_at: event.at,
        visibility: 'internal',
        note: event.note,
      })),
    })),
  };
}

export function mapProjectConditionDbRowsToRecords(input: {
  projectName: string;
  records: ProjectConditionDbRecordRow[];
  comments?: ProjectConditionDbCommentRow[];
  notations?: ProjectConditionDbNotationRow[];
  audit?: ProjectConditionDbAuditRow[];
}): ProjectConditionRecord[] {
  const comments = input.comments ?? [];
  const notations = input.notations ?? [];
  const audit = input.audit ?? [];

  return input.records.map((record) => ({
    id: formatProjectConditionNumber(record.condition_number) ?? record.id,
    databaseId: record.id,
    projectId: record.project_id,
    projectName: input.projectName,
    fieldItemId: record.field_item_id,
    conditionNumber: record.condition_number,
    sourceSystem: record.source_system,
    sourceRecordId: record.source_record_id,
    buildingOrArea: record.building_or_area,
    elevation: record.elevation,
    floor: record.floor,
    unit: record.unit,
    element: record.element,
    locationLabel: record.location_label,
    classification: record.classification,
    classificationStatus: record.classification_status,
    observedCondition: record.observed_condition,
    conditionCategory: record.condition_category,
    severity: record.severity,
    quantity: record.quantity,
    quantityUnit: record.quantity_unit,
    repairType: record.repair_type,
    specReference: record.spec_reference,
    permitStatus: record.permit_status,
    ownerSignoffStatus: record.owner_signoff_status,
    status: record.status,
    aiSuggestion: record.ai_suggestion,
    aiConfidence: record.ai_confidence,
    humanReviewRequired: record.human_review_required,
    clientPublishStatus: record.client_publish_status,
    clientSummary: record.client_summary,
    updatedAt: record.updated_at,
    comments: comments.filter((comment) => comment.condition_id === record.id).map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdBy: comment.created_by,
      createdAt: comment.created_at,
      role: comment.role ?? undefined,
      audience: comment.audience,
    })),
    notations: notations.filter((notation) => notation.condition_id === record.id).map((notation) => ({
      id: notation.id,
      type: notation.notation_type,
      body: notation.body,
      createdBy: notation.created_by,
      createdAt: notation.created_at,
      audience: notation.audience,
    })),
    audit: audit.filter((event) => event.condition_id === record.id).map((event) => ({
      id: event.id,
      event: event.event_type,
      actor: event.actor_id ?? 'system',
      at: event.created_at,
      note: event.note ?? event.event_type,
    })),
  }));
}

export function buildProjectConditionRecordUpsertRow(input: {
  item: FieldItem;
  tenantId: string;
  userId: string;
  projectName: string;
}) {
  const record = mapFieldItemToProjectConditionRecord(input.item, input.projectName);
  return {
    tenant_id: input.tenantId,
    project_id: input.item.project_id,
    field_item_id: input.item.id,
    source_system: 'field-accountability',
    source_record_id: input.item.id,
    building_or_area: record.buildingOrArea,
    elevation: record.elevation ?? null,
    floor: record.floor ?? null,
    unit: record.unit ?? null,
    element: record.element,
    location_label: record.locationLabel ?? null,
    classification: record.classification,
    classification_status: record.classificationStatus,
    observed_condition: record.observedCondition,
    condition_category: record.conditionCategory,
    severity: record.severity,
    quantity: record.quantity ?? null,
    quantity_unit: record.quantityUnit ?? null,
    repair_type: record.repairType ?? null,
    spec_reference: record.specReference ?? null,
    permit_status: record.permitStatus,
    owner_signoff_status: record.ownerSignoffStatus,
    status: record.status,
    ai_suggestion: record.aiSuggestion ?? null,
    ai_confidence: record.aiConfidence ?? null,
    human_review_required: record.humanReviewRequired,
    client_publish_status: record.clientPublishStatus,
    client_summary: record.clientSummary ?? null,
    created_by: input.userId,
  };
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function classifyFieldItemAsProjectCondition(item: Pick<FieldItem, 'category' | 'title' | 'description'>): ProjectConditionClassification {
  const text = normalize(`${item.category} ${item.title} ${item.description ?? ''}`);
  if (/\b(structural|concrete|spall|spalling|rebar|reinforcing|slab|beam|column|stair|landing|balcony|soffit|crack|cracking|delamination)\b/.test(text)) {
    return 'needs_engineer_determination';
  }
  if (/\b(stucco|sealant|joint|coating|paint|finish|landscape|landscaping|sod|mulch|irrigation|lighting|gate|access-control)\b/.test(text)) {
    return 'non_structural';
  }
  return 'needs_engineer_determination';
}

export function mapFieldStatusToProjectConditionStatus(status: FieldItem['status']): ProjectConditionStatus {
  switch (status) {
    case 'needs_triage':
      return 'needs_apas_review';
    case 'assigned':
    case 'in_progress':
    case 'reopened':
      return 'in_construction';
    case 'ready_for_review':
      return 'ready_for_owner';
    case 'verified':
      return 'verified_complete';
    case 'deferred':
      return 'held_pending_permit';
    case 'rejected':
      return 'void';
    default:
      return 'draft';
  }
}

export function mapFieldItemToProjectConditionRecord(item: FieldItem, projectName: string): ProjectConditionRecord {
  const classification = classifyFieldItemAsProjectCondition(item);
  const clientPublishStatus: ProjectConditionPublishStatus = item.owner_visible
    ? item.status === 'ready_for_review' || item.status === 'verified'
      ? 'published_to_client'
      : 'ready_to_publish'
    : 'internal_only';

  return {
    id: `FA-${String(item.item_number).padStart(4, '0')}`,
    projectId: item.project_id,
    projectName,
    buildingOrArea: item.location_label?.split('/')[0]?.trim() || 'Project area',
    element: item.title,
    locationLabel: item.location_label,
    classification,
    classificationStatus: classification === 'needs_engineer_determination' ? 'needs_review' : 'engineer_approved',
    observedCondition: item.description || item.title,
    conditionCategory: item.category,
    severity: item.severity === 'medium' ? 'moderate' : item.severity,
    quantity: null,
    quantityUnit: null,
    repairType: item.category,
    specReference: null,
    permitStatus: classification === 'needs_engineer_determination' ? 'permit_required' : 'not_determined',
    ownerSignoffStatus: item.owner_verification_required
      ? item.status === 'ready_for_review'
        ? 'ready_for_owner'
        : item.status === 'verified'
          ? 'approved'
          : 'not_ready'
      : 'not_ready',
    status: mapFieldStatusToProjectConditionStatus(item.status),
    aiSuggestion: null,
    aiConfidence: null,
    humanReviewRequired: true,
    clientPublishStatus,
    clientSummary: item.owner_visible ? item.description || item.title : null,
    comments: item.comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdBy: comment.author_id,
      createdAt: comment.created_at,
      audience: comment.visibility === 'owner' ? 'client_visible' : 'internal',
    })),
    notations: [],
    audit: item.events.map((event) => ({
      id: event.id,
      event: event.action,
      actor: event.actor_id,
      at: event.created_at,
      note: event.note || `${event.from_status ?? 'new'} -> ${event.to_status ?? 'updated'}`,
    })),
  };
}

export function mapFieldItemsToProjectConditions(items: FieldItem[], projectName: string) {
  return items.map((item) => mapFieldItemToProjectConditionRecord(item, projectName));
}
