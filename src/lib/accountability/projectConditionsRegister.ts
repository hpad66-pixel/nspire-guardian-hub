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
  projectId: string;
  projectName: string;
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
  comments: ProjectConditionComment[];
  notations: ProjectConditionNotation[];
  audit: ProjectConditionAuditEvent[];
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
