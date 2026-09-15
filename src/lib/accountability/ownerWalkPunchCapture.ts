import type {
  FieldBallInCourt,
  FieldEvidenceType,
  FieldItem,
  FieldPhoto,
  FieldVisit,
} from '@/hooks/useFieldAccountability';

export type OwnerWalkCategoryId =
  | 'structural'
  | 'mechanical'
  | 'electrical'
  | 'plumbing'
  | 'landscaping';

export interface OwnerWalkCategory {
  id: OwnerWalkCategoryId;
  label: string;
  defaultBallInCourt: FieldBallInCourt;
  ownerVerificationRequired: boolean;
  keywords: string[];
  scopePrompt: string;
}

export interface OwnerWalkPipelineStage {
  key: string;
  title: string;
  description: string;
  evidenceGate: string;
}

export interface OwnerWalkPunchCaptureSummary {
  totalPhotos: number;
  walkPhotos: number;
  untriagedPhotos: number;
  beforeEvidence: number;
  afterEvidence: number;
  ownerWalks: number;
  draftScopeItems: number;
  ownerVisibleItems: number;
  readyForOwnerAcceptance: number;
  acceptedOrVerified: number;
  blockedCloseout: number;
  categoryCounts: Record<OwnerWalkCategoryId, number>;
}

const CATEGORY_FALLBACK: OwnerWalkCategoryId = 'structural';

export const OWNER_WALK_CATEGORIES: OwnerWalkCategory[] = [
  {
    id: 'structural',
    label: 'Structural',
    defaultBallInCourt: 'apas',
    ownerVerificationRequired: true,
    keywords: ['structural', 'stucco', 'envelope', 'wall', 'slab', 'stair', 'railing', 'settlement', 'void', 'foundation'],
    scopePrompt: 'Confirm support, safety, repair method and matching-angle closeout evidence.',
  },
  {
    id: 'mechanical',
    label: 'Mechanical',
    defaultBallInCourt: 'vendor',
    ownerVerificationRequired: false,
    keywords: ['mechanical', 'hvac', 'equipment', 'condensate', 'service clearance', 'fan', 'compressor'],
    scopePrompt: 'Confirm equipment condition, service clearance, responsible trade and after-service proof.',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    defaultBallInCourt: 'vendor',
    ownerVerificationRequired: true,
    keywords: ['electrical', 'lighting', 'gate-control', 'access-control', 'cable', 'wiring', 'fixture', 'photocell'],
    scopePrompt: 'Confirm qualified trade, weather-rated closure, operational test and after photo.',
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    defaultBallInCourt: 'vendor',
    ownerVerificationRequired: false,
    keywords: ['plumbing', 'drain', 'drainage', 'outlet', 'discharge', 'irrigation', 'ponding', 'inlet', 'water'],
    scopePrompt: 'Confirm source, flow path, repair limits, test result and closeout photograph.',
  },
  {
    id: 'landscaping',
    label: 'Landscaping',
    defaultBallInCourt: 'property_management',
    ownerVerificationRequired: false,
    keywords: ['landscape', 'landscaping', 'turf', 'sod', 'soil', 'tree', 'root', 'mulch', 'planting', 'lawn'],
    scopePrompt: 'Confirm limits, material, irrigation, establishment care and before-after coverage.',
  },
];

export const OWNER_WALK_PIPELINE: OwnerWalkPipelineStage[] = [
  {
    key: 'capture',
    title: 'Capture walk',
    description: 'Take before photos, preserve EXIF/GPS, and record the owner narrative during the walk.',
    evidenceGate: 'Photo originals and raw owner testimony are kept unchanged.',
  },
  {
    key: 'transcript',
    title: 'Attach conversation',
    description: 'Paste or import the Otter segment and link it to the matching photo or group.',
    evidenceGate: 'Raw owner quote stays separate from the APAS scope draft.',
  },
  {
    key: 'triage',
    title: 'Triage category',
    description: 'Classify the condition as structural, mechanical, electrical, plumbing, or landscaping.',
    evidenceGate: 'AI can suggest a category, but a project user confirms it.',
  },
  {
    key: 'scope',
    title: 'Create scope item',
    description: 'Convert the photo and owner note into a location-specific accountable item.',
    evidenceGate: 'The scope item owns status, ball-in-court, due date, and visibility.',
  },
  {
    key: 'after',
    title: 'Collect after proof',
    description: 'Crew uploads one to three after photographs and a completion note from the same condition.',
    evidenceGate: 'Ready for review is blocked until at least one after photo exists.',
  },
  {
    key: 'acceptance',
    title: 'Verify and share',
    description: 'APAS verifies, then owner-visible items can be emailed or published in a portal packet.',
    evidenceGate: 'The check mark appears only after review, never because a photo was uploaded.',
  },
];

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function classifyOwnerWalkCategory(value: unknown): OwnerWalkCategoryId {
  const text = normalize(value).replace(/[_-]+/g, ' ');
  const exact = OWNER_WALK_CATEGORIES.find((category) => category.id === text || category.label.toLowerCase() === text);
  if (exact) return exact.id;
  const keyword = OWNER_WALK_CATEGORIES.find((category) =>
    category.keywords.some((entry) => text.includes(entry)),
  );
  return keyword?.id ?? CATEGORY_FALLBACK;
}

export function categoryForOwnerWalkItem(item: Pick<FieldItem, 'category' | 'title' | 'description'>): OwnerWalkCategoryId {
  return classifyOwnerWalkCategory(`${item.category} ${item.title} ${item.description ?? ''}`);
}

export function itemEvidenceCount(item: Pick<FieldItem, 'photos'>, evidenceType: FieldEvidenceType) {
  return item.photos.filter((photo) => photo.evidence_type === evidenceType).length;
}

export function itemHasBeforeEvidence(item: Pick<FieldItem, 'photos'>) {
  return item.photos.some((photo) => photo.evidence_type === 'before' || photo.evidence_type === 'observation');
}

export function itemHasAfterEvidence(item: Pick<FieldItem, 'photos'>) {
  return itemEvidenceCount(item, 'after') > 0;
}

export function isOwnerWalkVisit(visit: Pick<FieldVisit, 'visit_type'>) {
  return normalize(visit.visit_type).includes('owner');
}

export function isOwnerWalkCloseoutBlocked(item: FieldItem) {
  const activeStatus = ['assigned', 'in_progress', 'ready_for_review', 'reopened'].includes(item.status);
  return activeStatus && itemHasBeforeEvidence(item) && !itemHasAfterEvidence(item);
}

export function isReadyForOwnerAcceptance(item: FieldItem) {
  return item.owner_visible
    && item.owner_verification_required
    && item.status === 'ready_for_review'
    && itemHasAfterEvidence(item);
}

export function buildOwnerWalkPunchCaptureSummary(input: {
  photos: FieldPhoto[];
  items: FieldItem[];
  visits: FieldVisit[];
}): OwnerWalkPunchCaptureSummary {
  const { photos, items, visits } = input;
  const categoryCounts = OWNER_WALK_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = 0;
    return acc;
  }, {} as Record<OwnerWalkCategoryId, number>);

  items.forEach((item) => {
    categoryCounts[categoryForOwnerWalkItem(item)] += 1;
  });

  return {
    totalPhotos: photos.length,
    walkPhotos: photos.filter((photo) => Boolean(photo.visit_id)).length,
    untriagedPhotos: photos.filter((photo) => !photo.item_id).length,
    beforeEvidence: photos.filter((photo) => photo.evidence_type === 'before' || photo.evidence_type === 'observation').length,
    afterEvidence: photos.filter((photo) => photo.evidence_type === 'after').length,
    ownerWalks: visits.filter(isOwnerWalkVisit).length,
    draftScopeItems: items.filter((item) => !['verified', 'rejected', 'deferred'].includes(item.status)).length,
    ownerVisibleItems: items.filter((item) => item.owner_visible).length,
    readyForOwnerAcceptance: items.filter(isReadyForOwnerAcceptance).length,
    acceptedOrVerified: items.filter((item) => item.status === 'verified').length,
    blockedCloseout: items.filter(isOwnerWalkCloseoutBlocked).length,
    categoryCounts,
  };
}

