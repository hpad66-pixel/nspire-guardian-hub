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
    // Keep the stored `shipped` value for backwards/database compatibility,
    // but use the client's operational language throughout the interface.
    label: 'Executed',
    shortLabel: 'Executed',
    tone: 'border-slate-300 bg-slate-100 text-slate-700',
    dot: 'bg-slate-500',
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
  { key: 'planned', label: 'Planned' },
  { key: 'in_progress', label: 'Building' },
  { key: 'shipped', label: 'Executed' },
] as const;

export function productIdeaProgressIndex(status: ProductIdeaStatus): number {
  if (status === 'rejected') return 1;
  return PRODUCT_IDEA_PROGRESS.findIndex((stage) => stage.key === status);
}

export function productIdeaScore(upvotes: number, downvotes: number): number {
  return upvotes - downvotes;
}

/** Keep completed improvements celebratory and immediately visible on the board. */
export function compareProductIdeaCompletion(
  first: ProductIdeaStatus,
  second: ProductIdeaStatus,
): number {
  const firstExecuted = first === 'shipped';
  const secondExecuted = second === 'shipped';

  if (firstExecuted === secondExecuted) return 0;
  return firstExecuted ? -1 : 1;
}

export function isProductIdeaRoadmapStatus(status: ProductIdeaStatus): boolean {
  return ['escalated', 'planned', 'in_progress'].includes(status);
}

export type ProductIdeaDeliveryPhase = 'evaluation' | 'design' | 'production' | 'live';

export interface ProductIdeaEvaluation {
  phase: ProductIdeaDeliveryPhase;
  phaseLabel: string;
  targetLiveDate: string | null;
  targetLiveLabel: string;
  confidence: 'Live' | 'Strong foundation' | 'Partial foundation' | 'New epic';
  implementationRead: string;
  nextMilestone: string;
  recommendation: string;
  repoEvidence: string[];
}

function normalizeIdeaTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const PRODUCT_IDEA_EVALUATIONS: Record<string, ProductIdeaEvaluation> = {
  [normalizeIdeaTitle('UI design for proposals versus Change Orders')]: {
    phase: 'live',
    phaseLabel: 'Live',
    targetLiveDate: null,
    targetLiveLabel: 'Live now',
    confidence: 'Live',
    implementationRead: 'Proposal, invoice, and change-order flows are already wired into the financial workflow.',
    nextMilestone: 'Continue polish through real project usage and keep any exceptions attached to the invoice or change-order record.',
    recommendation: 'Keep this marked executed. Future work should be incremental polish, not a new epic.',
    repoEvidence: [
      'Proposal builder and preview workflow',
      'Proposal-linked consulting invoice guard',
      'Invoice lifecycle, signature, and deletion controls',
    ],
  },
  [normalizeIdeaTitle('ProjOS Agent Skills and Workflow Studio')]: {
    phase: 'design',
    phaseLabel: 'Design approved',
    targetLiveDate: '2026-10-30',
    targetLiveLabel: 'Target live Oct 30, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'The agent panel and runtime foundation exist, but the workflow-studio builder is not yet a complete admin product.',
    nextMilestone: 'Define the first three approved skills, their permissions, and the human approval boundary.',
    recommendation: 'Move forward as a controlled admin module. Do not expose open-ended agent building to ordinary users yet.',
    repoEvidence: [
      'Agent panel and launcher components',
      'Agent runtime environment flags',
      'Agent pilot admin controls',
    ],
  },
  [normalizeIdeaTitle('AI Action Approval and Audit Center')]: {
    phase: 'design',
    phaseLabel: 'Design approved',
    targetLiveDate: '2026-10-23',
    targetLiveLabel: 'Target live Oct 23, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'Approval patterns exist across financial and document workflows, but there is no single AI action ledger yet.',
    nextMilestone: 'Create one approval center that records proposed action, source evidence, approver, timestamp, and final outcome.',
    recommendation: 'Build this before broadening AI actions. It is the control layer that makes the rest of the AI roadmap safe.',
    repoEvidence: [
      'Admin role and RLS-controlled update flows',
      'Invoice signature and lifecycle audit fields',
      'Human approval language in agent workflows',
    ],
  },
  [normalizeIdeaTitle('Automated Client Status Narratives')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-09',
    targetLiveLabel: 'Target live Oct 9, 2026',
    confidence: 'Strong foundation',
    implementationRead: 'Client update generation exists in several places, but it needs one clean narrative workflow tied to project facts.',
    nextMilestone: 'Standardize the narrative composer, preview, approval, and send path for project updates.',
    recommendation: 'Finish as a reusable project communications module so construction and consulting projects use the same pattern.',
    repoEvidence: [
      'Consulting update dialog',
      'Generate client update function',
      'Digest send dialog and communication history',
    ],
  },
  [normalizeIdeaTitle('Sewer, Stormwater and Water Asset History')]: {
    phase: 'design',
    phaseLabel: 'Design approved',
    targetLiveDate: '2026-11-06',
    targetLiveLabel: 'Target live Nov 6, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'Asset, permit, water, and map surfaces exist, but the historical asset ledger is not yet unified.',
    nextMilestone: 'Create an asset profile that links permits, inspections, photos, reports, work orders, and billing evidence.',
    recommendation: 'Ship as an asset-history module, then connect it to Water Intelligence and field operations.',
    repoEvidence: [
      'Project permits and compliance records',
      'Water intelligence surfaces',
      'Work order and map foundations',
    ],
  },
  [normalizeIdeaTitle('Emergency Command Center and Escalation')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-16',
    targetLiveLabel: 'Target live Oct 16, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'Voice complaint intake and emergency metrics exist, but the escalation tree and dispatch cockpit need completion.',
    nextMilestone: 'Make every intake metric clickable and connect emergencies to assignment, work order, and follow-up status.',
    recommendation: 'Prioritize this because it is operationally visible and the user has already flagged the current dashboard as too flat.',
    repoEvidence: [
      'Voice complaints dashboard',
      'Emergency intake categories',
      'Work-order creation plumbing',
    ],
  },
  [normalizeIdeaTitle('Subcontractor and Vendor Portal Assistant')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-16',
    targetLiveLabel: 'Target live Oct 16, 2026',
    confidence: 'Strong foundation',
    implementationRead: 'Vendor portals, contractor readiness, payment profile, and NTP workflows are already in place.',
    nextMilestone: 'Add assistant prompts around missing requirements, waived requirements, payment profile, and notice-to-proceed readiness.',
    recommendation: 'Finish as a guided vendor onboarding and payment readiness module.',
    repoEvidence: [
      'Subcontractor portal pages',
      'Contractor readiness workflow',
      'Payment profile and NTP waiver controls',
    ],
  },
  [normalizeIdeaTitle('Commission and Board Packet Generator')]: {
    phase: 'design',
    phaseLabel: 'Design approved',
    targetLiveDate: '2026-11-13',
    targetLiveLabel: 'Target live Nov 13, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'Report generation exists, but board-packet assembly, agenda structure, and packet approvals are not complete.',
    nextMilestone: 'Define packet sections, attachments, approval sequence, and export format.',
    recommendation: 'Build after the report studio and document export conventions are stabilized.',
    repoEvidence: [
      'Report studio and financial reports',
      'PDF export libraries',
      'Project document records',
    ],
  },
  [normalizeIdeaTitle('Inspection Closeout Evidence Pack')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-23',
    targetLiveLabel: 'Target live Oct 23, 2026',
    confidence: 'Strong foundation',
    implementationRead: 'Photo capture, accountability, and reporting pieces exist, but the final closeout pack needs a single guided route.',
    nextMilestone: 'Bundle before/after photos, field notes, approvals, punch status, and final PDF export.',
    recommendation: 'Use this as the model for field-to-client proof packages.',
    repoEvidence: [
      'Field walk and camera capture dialogs',
      'Site accountability workflow',
      'Inspection and report PDF utilities',
    ],
  },
  [normalizeIdeaTitle('Voice and Photo Field Capture Copilot')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-09',
    targetLiveLabel: 'Target live Oct 9, 2026',
    confidence: 'Strong foundation',
    implementationRead: 'Mobile capture components exist, and the remaining gap is turning captured voice/photo evidence into consistent work products.',
    nextMilestone: 'Complete voice note, photo set, work order, and client-ready summary handoff.',
    recommendation: 'Make this mobile-first and keep the desktop path as review and administration.',
    repoEvidence: [
      'Field camera dialog',
      'Field walk capture dialog',
      'Work order generation hooks',
    ],
  },
  [normalizeIdeaTitle('Change Order Evidence Package Builder')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-30',
    targetLiveLabel: 'Target live Oct 30, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'Change-order financial logic exists, but the evidence package builder needs a guided checklist and export.',
    nextMilestone: 'Attach scope, photos, cost basis, approval trail, and owner-facing explanation to each change order.',
    recommendation: 'Use the same evidence-pack pattern as invoice and inspection closeout packages.',
    repoEvidence: [
      'Change orders page and PDF utilities',
      'Financial ledger and project financial tabs',
      'Contract credit and retention logic',
    ],
  },
  [normalizeIdeaTitle('Invoice–Contract–Payment Matching Control')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-02',
    targetLiveLabel: 'Target live Oct 2, 2026',
    confidence: 'Strong foundation',
    implementationRead: 'Proposal-linked invoice guards, lifecycle controls, signatures, and contractor payment records are already wired.',
    nextMilestone: 'Finish the matching dashboard across owner invoice, subcontractor bill, payment, retention, and remaining contract value.',
    recommendation: 'Treat this as a high-priority financial control because it directly prevents overbilling and overpayment.',
    repoEvidence: [
      'Proposal-linked client invoice guard',
      'Invoice lifecycle and signature controls',
      'Consulting cashflow and vendor payment modules',
    ],
  },
  [normalizeIdeaTitle('Permit and Compliance Deadline Autopilot')]: {
    phase: 'design',
    phaseLabel: 'Design approved',
    targetLiveDate: '2026-11-06',
    targetLiveLabel: 'Target live Nov 6, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'Permit and compliance records exist, but automated deadline monitoring and reminders are not finished.',
    nextMilestone: 'Define alert rules, responsible person, due-date logic, and escalation policy.',
    recommendation: 'Build after navigation and project lockdown rules are stable so alerts respect completed projects.',
    repoEvidence: [
      'Project permits migration and UI',
      'Compliance and readiness surfaces',
      'Project lockdown controls',
    ],
  },
  [normalizeIdeaTitle('Convert Calls and Emails into Work Orders')]: {
    phase: 'production',
    phaseLabel: 'In production',
    targetLiveDate: '2026-10-09',
    targetLiveLabel: 'Target live Oct 9, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'The capture and work-order concepts exist, but the automatic work-order creation path needs hardening.',
    nextMilestone: 'Fix auto-create errors, make every dashboard number navigable, and add review before dispatch.',
    recommendation: 'Keep this in active production because it is a daily-use workflow and has already surfaced user-facing errors.',
    repoEvidence: [
      'Voice complaints intake page',
      'Work-order modules',
      'Hermes and communication integration direction',
    ],
  },
  [normalizeIdeaTitle('Daily Portfolio Risk Briefing')]: {
    phase: 'design',
    phaseLabel: 'Design approved',
    targetLiveDate: '2026-11-13',
    targetLiveLabel: 'Target live Nov 13, 2026',
    confidence: 'Partial foundation',
    implementationRead: 'Portfolio and cockpit views exist, but daily risk briefing is not yet a scheduled, sourced briefing product.',
    nextMilestone: 'Define risk signals, summary sections, audience, and email or dashboard delivery rules.',
    recommendation: 'Make this an enterprise-tier feature once project status and module entitlements are clean.',
    repoEvidence: [
      'Dashboard and cockpit views',
      'Portfolio metrics',
      'Client update and digest patterns',
    ],
  },
  [normalizeIdeaTitle('Ask ProjOS Across Every Project Record')]: {
    phase: 'design',
    phaseLabel: 'Design approved',
    targetLiveDate: '2026-11-20',
    targetLiveLabel: 'Target live Nov 20, 2026',
    confidence: 'New epic',
    implementationRead: 'Project records and assistant surfaces exist, but source-cited cross-project retrieval is a larger platform feature.',
    nextMilestone: 'Define indexing boundaries, tenant isolation, citations, permissions, and which records are searchable.',
    recommendation: 'Keep this strategic and gated. It should not ship until tenant and source-citation controls are proven.',
    repoEvidence: [
      'Project records across financials, field, and communication modules',
      'Agent panel foundations',
      'Tenant and role based access controls',
    ],
  },
};

export function getProductIdeaEvaluation(ideaOrTitle: { title: string; status?: ProductIdeaStatus } | string): ProductIdeaEvaluation {
  const title = typeof ideaOrTitle === 'string' ? ideaOrTitle : ideaOrTitle.title;
  const status = typeof ideaOrTitle === 'string' ? undefined : ideaOrTitle.status;
  const evaluation = PRODUCT_IDEA_EVALUATIONS[normalizeIdeaTitle(title)];

  if (evaluation) return evaluation;

  if (status === 'shipped') {
    return {
      phase: 'live',
      phaseLabel: 'Live',
      targetLiveDate: null,
      targetLiveLabel: 'Live now',
      confidence: 'Live',
      implementationRead: 'This improvement is marked executed in the product board.',
      nextMilestone: 'Monitor usage and attach any follow-up requests as new ideas.',
      recommendation: 'Keep the completion record visible so clients can see progress.',
      repoEvidence: ['Executed product-board milestone'],
    };
  }

  if (status === 'in_progress') {
    return {
      phase: 'production',
      phaseLabel: 'In production',
      targetLiveDate: null,
      targetLiveLabel: 'Target date to be confirmed',
      confidence: 'Partial foundation',
      implementationRead: 'The product team has this in active build.',
      nextMilestone: 'Publish the next implementation checkpoint.',
      recommendation: 'Keep this visible on the roadmap until verified live.',
      repoEvidence: ['Active product-board milestone'],
    };
  }

  return {
    phase: status === 'planned' || status === 'escalated' ? 'design' : 'evaluation',
    phaseLabel: status === 'planned' || status === 'escalated' ? 'Design approved' : 'Evaluation',
    targetLiveDate: null,
    targetLiveLabel: 'Target date to be confirmed',
    confidence: 'New epic',
    implementationRead: 'This idea needs product review against the current repository before a delivery date is committed.',
    nextMilestone: 'Evaluate repo fit, owner value, dependencies, and release path.',
    recommendation: 'Keep the idea in review until the product team publishes a grounded update.',
    repoEvidence: ['Awaiting repo evaluation'],
  };
}
