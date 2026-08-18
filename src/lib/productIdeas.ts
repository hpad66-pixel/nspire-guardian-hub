export const PRODUCT_IDEA_STATUSES = [
  'submitted',
  'under_review',
  'escalated',
  'planned',
  'in_progress',
  'shipped',
  'rejected',
] as const;

export type ProductIdeaStatus = (typeof PRODUCT_IDEA_STATUSES)[number];

export const PRODUCT_IDEA_CATEGORIES = [
  'project_controls',
  'financials',
  'field_operations',
  'reporting',
  'mobile',
  'integrations',
  'other',
] as const;

export type ProductIdeaCategory = (typeof PRODUCT_IDEA_CATEGORIES)[number];

export const PRODUCT_IDEA_STATUS_META: Record<
  ProductIdeaStatus,
  { label: string; shortLabel: string; tone: string; dot: string }
> = {
  submitted: {
    label: 'Submitted',
    shortLabel: 'Submitted',
    tone: 'border-slate-300 bg-slate-50 text-slate-700',
    dot: 'bg-slate-400',
  },
  under_review: {
    label: 'Under review',
    shortLabel: 'Review',
    tone: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
  escalated: {
    label: 'Escalated to developers',
    shortLabel: 'Escalated',
    tone: 'border-violet-200 bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
  },
  planned: {
    label: 'Planned',
    shortLabel: 'Planned',
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  in_progress: {
    label: 'In development',
    shortLabel: 'Building',
    tone: 'border-orange-200 bg-orange-50 text-orange-700',
    dot: 'bg-orange-500',
  },
  shipped: {
    label: 'Released',
    shortLabel: 'Released',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Not moving forward',
    shortLabel: 'Declined',
    tone: 'border-rose-200 bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
  },
};

export const PRODUCT_IDEA_CATEGORY_LABELS: Record<ProductIdeaCategory, string> = {
  project_controls: 'Project controls',
  financials: 'Financials',
  field_operations: 'Field operations',
  reporting: 'Reporting',
  mobile: 'Mobile',
  integrations: 'Integrations',
  other: 'Other',
};

/** The positive delivery path shown in the visual progress tickler. */
export const PRODUCT_IDEA_PROGRESS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Review' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'in_progress', label: 'Building' },
  { key: 'shipped', label: 'Released' },
] as const;

export function productIdeaProgressIndex(status: ProductIdeaStatus): number {
  if (status === 'rejected') return 1;
  if (status === 'planned') return 2;
  return PRODUCT_IDEA_PROGRESS.findIndex((stage) => stage.key === status);
}

export function productIdeaScore(upvotes: number, downvotes: number): number {
  return upvotes - downvotes;
}

export function isProductIdeaRoadmapStatus(status: ProductIdeaStatus): boolean {
  return ['escalated', 'planned', 'in_progress'].includes(status);
}
