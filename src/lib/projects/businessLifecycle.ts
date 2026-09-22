import { projectKind, type ProjectKind } from '@/lib/projectKind';

type LifecycleProject = {
  id?: string | null;
  name?: string | null;
  status?: string | null;
  project_type?: string | null;
  client_id?: string | null;
  closed_at?: string | null;
  close_reason?: string | null;
  phase?: string | null;
  start_date?: string | null;
  target_end_date?: string | null;
  budget?: number | string | null;
  client?: { name?: string | null } | null;
};

export type LifecycleStageKey =
  | 'setup'
  | 'baseline'
  | 'execution'
  | 'billing'
  | 'closeout'
  | 'locked';

export type LifecyclePackageKey =
  | 'construction-management'
  | 'consulting-management'
  | 'enterprise'
  | 'field-accountability'
  | 'owner-portal'
  | 'water-intelligence'
  | 'ai-add-on';

export interface LifecycleAssessment {
  kind: ProjectKind;
  stage: LifecycleStageKey;
  stageLabel: string;
  nextAction: string;
  nextActionHref: string;
  moneyLabel: string;
  teamLabel: string;
  scheduleLabel: string;
  lockLabel: string;
  lockTone: 'protected' | 'locked' | 'open';
  packageKey: LifecyclePackageKey;
  packageLabel: string;
  protectedHistorical: boolean;
  warnings: string[];
}

const TERMINAL_STATUSES = new Set(['closed', 'completed']);

export function isProjectLocked(project: LifecycleProject | null | undefined): boolean {
  if (!project) return false;
  return Boolean(project.closed_at) || TERMINAL_STATUSES.has((project.status ?? '').toLowerCase());
}

export function isProtectedHistoricalProject(project: LifecycleProject | null | undefined): boolean {
  if (!project) return false;
  const name = `${project.name ?? ''} ${project.client?.name ?? ''}`.toLowerCase();
  return name.includes('glorieta') || (name.includes('r4') && name.includes('sewer'));
}

export function lifecyclePackageForProject(project: LifecycleProject | null | undefined): {
  key: LifecyclePackageKey;
  label: string;
} {
  const kind = projectKind(project ?? {});
  if (kind === 'consulting') return { key: 'consulting-management', label: 'Consulting Management' };
  return { key: 'construction-management', label: 'Construction Management' };
}

export function assessProjectLifecycle(project: LifecycleProject): LifecycleAssessment {
  const kind = projectKind(project);
  const locked = isProjectLocked(project);
  const protectedHistorical = isProtectedHistoricalProject(project);
  const status = (project.status ?? 'planning').toLowerCase();
  const phase = (project.phase ?? '').toLowerCase();
  const hasBudget = Number(project.budget ?? 0) > 0;
  const pkg = lifecyclePackageForProject(project);
  const warnings: string[] = [];

  if (!project.project_type) warnings.push('Project type is missing. Set construction or consulting before billing.');
  if (!hasBudget && kind === 'construction' && !locked) warnings.push('Approved contract value is not visible yet.');
  if (!project.target_end_date && !locked) warnings.push('Target end date is missing, so schedule variance cannot be explained.');
  if (protectedHistorical) warnings.push('Historical R4 / Glorieta record. Future templates must not recalculate it.');

  if (locked) {
    return {
      kind,
      stage: 'locked',
      stageLabel: protectedHistorical ? 'Finalized historical record' : 'Closed and locked',
      nextAction: protectedHistorical
        ? 'Use read-only reporting or create an admin correction record'
        : 'Review closeout and audit trail',
      nextActionHref: project.id ? `/projects/${project.id}/financials/reports` : '/projects',
      moneyLabel: 'Issued records stay unchanged',
      teamLabel: 'Admin unlock requires reason',
      scheduleLabel: 'Baseline history is preserved',
      lockLabel: protectedHistorical ? 'Protected: no silent recalculation' : 'Locked: audit trail required',
      lockTone: protectedHistorical ? 'protected' : 'locked',
      packageKey: pkg.key,
      packageLabel: pkg.label,
      protectedHistorical,
      warnings,
    };
  }

  if (status === 'planning' || phase === 'planning') {
    return {
      kind,
      stage: 'setup',
      stageLabel: 'Setup and project hygiene',
      nextAction: 'Confirm project type, team, approved money, and target dates',
      nextActionHref: project.id ? `/projects/${project.id}/admin` : '/projects',
      moneyLabel: kind === 'consulting' ? 'Proposal or approved values required' : 'Prime contract and SOV required',
      teamLabel: 'Project team must be complete before billing',
      scheduleLabel: 'Capture baseline after approval',
      lockLabel: 'Open: future lifecycle rules apply',
      lockTone: 'open',
      packageKey: pkg.key,
      packageLabel: pkg.label,
      protectedHistorical,
      warnings,
    };
  }

  if (kind === 'consulting') {
    return {
      kind,
      stage: 'billing',
      stageLabel: 'Consulting billing lifecycle',
      nextAction: 'Bill client against approved values and track consultant bills',
      nextActionHref: project.id ? `/projects/${project.id}/financials/client-invoices` : '/projects',
      moneyLabel: 'Approved value schedule controls invoicing',
      teamLabel: 'Contractors and consultants come from project team',
      scheduleLabel: 'Track deliverables and report dates',
      lockLabel: 'Open: records lock when issued or approved',
      lockTone: 'open',
      packageKey: pkg.key,
      packageLabel: pkg.label,
      protectedHistorical,
      warnings,
    };
  }

  return {
    kind,
    stage: 'execution',
    stageLabel: 'Construction execution lifecycle',
    nextAction: 'Advance pay apps, change orders, schedule, and field proof',
    nextActionHref: project.id ? `/projects/${project.id}/financials/pay-apps` : '/projects',
    moneyLabel: 'SOV, COs, pay apps, retainage',
    teamLabel: 'Commitments and vendor bills tied to approved work',
    scheduleLabel: 'Current schedule compared with baseline',
    lockLabel: 'Open: records lock when issued or approved',
    lockTone: 'open',
    packageKey: pkg.key,
    packageLabel: pkg.label,
    protectedHistorical,
    warnings,
  };
}

export const SELLABLE_MODULE_PACKAGES: Array<{
  key: LifecyclePackageKey;
  label: string;
  summary: string;
}> = [
  { key: 'construction-management', label: 'Construction Management', summary: 'Contracts, SOV, COs, pay apps, retainage, commitments, field proof.' },
  { key: 'consulting-management', label: 'Consulting Management', summary: 'Proposals, approved values, invoices, consultant bills, reports, margin.' },
  { key: 'field-accountability', label: 'Field Accountability', summary: 'Photos, walkthroughs, punch, before and after evidence.' },
  { key: 'owner-portal', label: 'Owner Portal', summary: 'Client approvals, documents, updates, notes, and project visibility.' },
  { key: 'water-intelligence', label: 'Water Intelligence', summary: 'Meter data, bill analytics, evidence, magic links, and dispute support.' },
  { key: 'ai-add-on', label: 'AI Add On', summary: 'Proposal drafting, voice intake, report assistance, and document automation.' },
  { key: 'enterprise', label: 'Enterprise', summary: 'Everything enabled with SSO, advanced audit, APIs, and administration.' },
];
