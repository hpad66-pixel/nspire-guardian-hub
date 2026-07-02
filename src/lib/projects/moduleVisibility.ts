// Per-project module visibility.
//
// Every module in a project's sidebar can be turned on or off per project from
// the admin "Modules" panel. Resolution order for a given module slug:
//   1. explicit override in project.module_config[slug]  (admin toggled it)
//   2. otherwise the default for the project's project_type
//
// project_type 'consulting' hides the construction machinery by default;
// every other type keeps the current behaviour (everything visible), so
// existing property/client projects are completely unaffected.

export type ProjectModuleSlug =
  | 'overview'
  | 'scope'
  | 'action-items'
  | 'schedule'
  | 'daily-logs'
  | 'gallery'
  | 'financials'
  | 'contracts'
  | 'rfis'
  | 'submittals'
  | 'punch-list'
  | 'project-log'
  | 'progress'
  | 'procurement'
  | 'safety'
  | 'meetings'
  | 'closeout'
  | 'proposals'
  | 'repository'
  | 'invoicing'
  | 'client-portal';

export type ModuleGroup = 'core' | 'compliance' | 'reports';

export interface ProjectModuleDef {
  slug: ProjectModuleSlug;
  label: string;
  description: string;
  group: ModuleGroup;
}

// The admin panel renders from this catalog. Order + grouping drive the panel
// layout; the sidebar itself keeps its own tab ordering.
export const PROJECT_MODULE_CATALOG: ProjectModuleDef[] = [
  { slug: 'overview',      label: 'Overview',            description: 'Engagement summary and health',        group: 'core' },
  { slug: 'scope',         label: 'Scope',               description: 'Workstreams, owners, % complete',       group: 'core' },
  { slug: 'action-items',  label: 'Action items',        description: 'Tasks grouped by date, owners, updates', group: 'compliance' },
  { slug: 'schedule',      label: 'Schedule & timelines', description: 'Milestones, deadlines, timeline',     group: 'core' },
  { slug: 'financials',    label: 'Financials',          description: 'Prime contract, budget, pay apps',     group: 'core' },
  { slug: 'contracts',     label: 'Contracts',           description: 'Prime contract and change orders',     group: 'core' },
  { slug: 'daily-logs',    label: 'Daily logs',          description: 'Field daily logs and inspections',     group: 'core' },
  { slug: 'gallery',       label: 'Gallery',             description: 'Photos and site imagery',              group: 'core' },
  { slug: 'repository',    label: 'Documents',           description: 'Deliverables, files, knowledge base',  group: 'core' },
  { slug: 'project-log',   label: 'Project log',         description: 'Timestamped update history',           group: 'compliance' },
  { slug: 'rfis',          label: 'RFIs',                description: 'Requests for information',             group: 'compliance' },
  { slug: 'submittals',    label: 'Submittals',          description: 'Submittal register and reviews',       group: 'compliance' },
  { slug: 'punch-list',    label: 'Punch list',          description: 'Punch items and closeout tracking',    group: 'compliance' },
  { slug: 'meetings',      label: 'Meetings & minutes',  description: 'Minutes, transcript, action items',    group: 'reports' },
  { slug: 'progress',      label: 'Progress',            description: 'Quantities and progress dashboard',    group: 'reports' },
  { slug: 'procurement',   label: 'Procurement',         description: 'Procurement and buyout tracking',      group: 'reports' },
  { slug: 'safety',        label: 'Safety',              description: 'Safety observations and incidents',    group: 'reports' },
  { slug: 'closeout',      label: 'Closeout',            description: 'Project closeout package',             group: 'reports' },
  { slug: 'invoicing',     label: 'Invoicing',           description: 'Bill against scope completion',        group: 'reports' },
  { slug: 'proposals',     label: 'Proposals',           description: 'AI proposal generator',                group: 'reports' },
  { slug: 'client-portal', label: 'Client portal',       description: 'External client access',               group: 'core' },
];

// Modules shown by default on a consulting engagement. Everything not listed
// here defaults to hidden for project_type === 'consulting'.
export const CONSULTING_DEFAULT_MODULES: ReadonlySet<ProjectModuleSlug> = new Set<ProjectModuleSlug>([
  'overview',
  'scope',
  'action-items',
  'schedule',
  'gallery',
  'repository',
  'project-log',
  'meetings',
  'invoicing',
  'proposals',
  'client-portal',
]);

// Minimal shape we need off a project — accepts the full Project row too.
export interface ModuleVisibilityProject {
  project_type?: string | null;
  module_config?: Record<string, boolean> | null;
}

// Consulting-native modules — hidden by default on construction/property/client
// projects (but still turn-on-able per project from the admin Modules panel).
export const CONSULTING_ONLY_MODULES: ReadonlySet<ProjectModuleSlug> = new Set<ProjectModuleSlug>([
  'scope',
  'action-items',
  'invoicing',
]);

/** Default visibility for a module before any admin override is applied. */
export function defaultModuleVisible(
  slug: ProjectModuleSlug,
  projectType: string | null | undefined,
): boolean {
  if (projectType === 'consulting') return CONSULTING_DEFAULT_MODULES.has(slug);
  // Everything visible by default on other project types, except the
  // consulting-native modules (which an admin can still switch on per project).
  return !CONSULTING_ONLY_MODULES.has(slug);
}

/** Effective visibility: explicit override wins, else the type default. */
export function isModuleVisible(
  project: ModuleVisibilityProject | null | undefined,
  slug: string,
): boolean {
  const cfg = project?.module_config;
  if (cfg && typeof cfg[slug] === 'boolean') return cfg[slug];
  return defaultModuleVisible(slug as ProjectModuleSlug, project?.project_type);
}

/**
 * Build the full explicit override map the admin panel saves. Writing every
 * catalog slug (rather than only changed ones) keeps the stored config
 * deterministic and immune to future default changes.
 */
export function buildModuleConfig(
  values: Record<string, boolean>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const def of PROJECT_MODULE_CATALOG) {
    out[def.slug] = values[def.slug] ?? true;
  }
  return out;
}
