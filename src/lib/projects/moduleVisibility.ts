// Per-project module visibility.
//
// Every module in a project's sidebar can be turned on or off per project from
// the Project Admin panel. Resolution order for a given module slug:
//   1. explicit override in project.module_config[slug]  (admin toggled it)
//   2. if module_inherit_from_parent and parent exists → parent resolution
//   3. otherwise the default for the project's billing kind (consulting vs construction)
//
// Consulting / client engagements hide construction field machinery by default;
// construction / property projects hide consulting-only modules by default.
// Admins can turn any module on or off at the project (or sub-project) level.

import { projectKind } from '@/lib/projectKind';

export type ProjectModuleSlug =
  | 'overview'
  | 'subprojects'
  | 'directory'
  | 'env-compliance'
  | 'permits'
  | 'site-map'
  | 'stores'
  | 'voice-agent'
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
  | 'correspondence'
  | 'client-updates'
  | 'client-portal'
  | 'admin';

/** Admin-panel / sidebar category keys (kind-agnostic storage groups). */
export type ModuleGroup =
  | 'engagement'
  | 'field'
  | 'commercial'
  | 'documents'
  | 'client'
  | 'admin';

export interface ProjectModuleDef {
  slug: ProjectModuleSlug;
  label: string;
  description: string;
  group: ModuleGroup;
  /** Cannot be turned off — always in the sidebar when the user can see the project. */
  locked?: boolean;
  /** Only workspace/project admins see this nav item. */
  adminOnly?: boolean;
  /** Surfaces on the authenticated owner portal when enabled. */
  portalSlug?: 'updates' | 'schedule' | 'documents' | 'contract' | 'reports' | 'permits' | 'site-map' | 'operations' | null;
}

// The admin panel renders from this catalog. Order + grouping drive the panel
// layout; the sidebar itself keeps its own tab ordering via projectNav.
export const PROJECT_MODULE_CATALOG: ProjectModuleDef[] = [
  { slug: 'overview', label: 'Overview', description: 'Project health, KPIs, and quick actions', group: 'engagement', locked: true },
  { slug: 'subprojects', label: 'Subprojects', description: 'Child projects rolled up under this one', group: 'engagement' },
  { slug: 'directory', label: 'People & Team', description: 'CRM contacts and project directory — feeds email & invoices', group: 'engagement' },
  { slug: 'scope', label: 'Scope', description: 'Workstreams, owners, % complete (consulting)', group: 'engagement' },
  { slug: 'schedule', label: 'Schedule', description: 'Milestones, deadlines, and timeline', group: 'engagement', portalSlug: 'schedule' },
  { slug: 'action-items', label: 'Action items', description: 'Tasks by date, owners, and updates', group: 'engagement' },

  { slug: 'daily-logs', label: 'Daily logs', description: 'Field daily logs and inspections', group: 'field' },
  { slug: 'rfis', label: 'RFIs', description: 'Requests for information', group: 'field' },
  { slug: 'submittals', label: 'Submittals', description: 'Submittal register and reviews', group: 'field' },
  { slug: 'punch-list', label: 'Punch list', description: 'Punch items and closeout tracking', group: 'field' },
  { slug: 'progress', label: 'Progress', description: 'Quantities and progress dashboard', group: 'field' },
  { slug: 'procurement', label: 'Procurement', description: 'Procurement and buyout tracking', group: 'field' },
  { slug: 'safety', label: 'Safety', description: 'Safety observations and incidents', group: 'field' },
  { slug: 'env-compliance', label: 'Environmental compliance', description: 'Sampling, exceedances, regulatory correspondence', group: 'field' },
  {
    slug: 'permits',
    label: 'Permits & compliance',
    description: 'Construction / closeout permit register, city confirmations, owner readiness score',
    group: 'field',
    portalSlug: 'permits',
  },
  {
    slug: 'site-map',
    label: 'Site map',
    description: 'Interactive property map — as-built manholes, cleanouts, pond; inspectable assets',
    group: 'field',
    portalSlug: 'site-map',
  },
  {
    slug: 'stores',
    label: 'Stores & materials',
    description: 'Optional stock room — receipts, work-order-gated issue, unit deployment, owner ops analytics',
    group: 'field',
    portalSlug: 'operations',
  },
  {
    slug: 'voice-agent',
    label: 'Voice complaints',
    description: 'ElevenLabs tenant maintenance hotline — call intake → tickets → work orders',
    group: 'field',
  },
  { slug: 'closeout', label: 'Closeout', description: 'Project closeout package', group: 'field' },

  { slug: 'financials', label: 'Financials', description: 'Pay apps (construction) or client invoices (consulting)', group: 'commercial' },
  { slug: 'contracts', label: 'Contracts', description: 'Prime contract and change orders / amendments', group: 'commercial', portalSlug: 'contract' },
  { slug: 'proposals', label: 'Proposals', description: 'Proposal builder and approvals', group: 'commercial' },
  { slug: 'invoicing', label: 'Client invoices', description: 'Bill against approved proposals / scope', group: 'commercial' },

  { slug: 'repository', label: 'Documents', description: 'Deliverables, files, knowledge base', group: 'documents', portalSlug: 'documents' },
  { slug: 'gallery', label: 'Gallery', description: 'Photos and site imagery', group: 'documents' },
  { slug: 'meetings', label: 'Meetings & agenda', description: 'Agendas, minutes, transcript → actions', group: 'documents' },
  { slug: 'correspondence', label: 'Correspondence', description: 'Email trail, branded letters — uses project CRM', group: 'documents' },
  { slug: 'project-log', label: 'Project log', description: 'Timestamped update history', group: 'documents' },

  { slug: 'client-updates', label: 'Client updates', description: 'Draft, review, and publish client briefings', group: 'client', portalSlug: 'updates' },
  { slug: 'client-portal', label: 'Client portal', description: 'External client access and invites', group: 'client' },

  { slug: 'admin', label: 'Project admin', description: 'Turn modules on/off, project type, inheritance', group: 'admin', locked: true, adminOnly: true },
];

export const MODULE_GROUP_LABELS: Record<ModuleGroup, string> = {
  engagement: 'Engagement',
  field: 'Field & delivery',
  commercial: 'Money & commercial',
  documents: 'Documents & communications',
  client: 'Client-facing',
  admin: 'Administration',
};

export const MODULE_GROUP_ORDER: ModuleGroup[] = [
  'engagement',
  'field',
  'commercial',
  'documents',
  'client',
  'admin',
];

/** Modules that cannot be disabled. */
export const LOCKED_MODULES: ReadonlySet<ProjectModuleSlug> = new Set(
  PROJECT_MODULE_CATALOG.filter((m) => m.locked).map((m) => m.slug),
);

// Modules shown by default on consulting / client engagements.
export const CONSULTING_DEFAULT_MODULES: ReadonlySet<ProjectModuleSlug> = new Set<ProjectModuleSlug>([
  'overview',
  'subprojects',
  'directory',
  'env-compliance',
  'scope',
  'action-items',
  'schedule',
  'gallery',
  'repository',
  'project-log',
  'meetings',
  'correspondence',
  'invoicing',
  'proposals',
  'financials',
  'contracts',
  'client-updates',
  'client-portal',
  'admin',
]);

// Consulting-native modules — hidden by default on construction/property.
export const CONSULTING_ONLY_MODULES: ReadonlySet<ProjectModuleSlug> = new Set<ProjectModuleSlug>([
  'scope',
  'action-items',
  'invoicing',
  'env-compliance',
]);

// Construction field modules — hidden by default on consulting/client.
export const CONSTRUCTION_FIELD_MODULES: ReadonlySet<ProjectModuleSlug> = new Set<ProjectModuleSlug>([
  'daily-logs',
  'rfis',
  'submittals',
  'punch-list',
  'progress',
  'procurement',
  'safety',
  'permits',
  'site-map',
  'closeout',
]);

/** Opt-in modules — off for every project type until an admin enables them. */
export const OPT_IN_MODULES: ReadonlySet<ProjectModuleSlug> = new Set<ProjectModuleSlug>([
  'stores',
  'voice-agent',
]);

/** Preset packs for one-click module configuration. */
export type ModulePresetId = 'consulting-lean' | 'construction-full' | 'communications' | 'reset-defaults';

export interface ModulePreset {
  id: ModulePresetId;
  label: string;
  description: string;
  /** If set, apply these on/off values (merged over current type defaults). */
  apply: (projectType: string | null | undefined) => Record<string, boolean>;
}

export const MODULE_PRESETS: ModulePreset[] = [
  {
    id: 'consulting-lean',
    label: 'Consulting (lean)',
    description: 'Proposals, invoices, documents, meetings, CRM — no field construction modules.',
    apply: () => {
      const out: Record<string, boolean> = {};
      for (const def of PROJECT_MODULE_CATALOG) {
        out[def.slug] = CONSULTING_DEFAULT_MODULES.has(def.slug);
      }
      return out;
    },
  },
  {
    id: 'construction-full',
    label: 'Construction (full)',
    description: 'Pay apps, RFIs, submittals, safety, procurement, punch — full jobsite suite.',
    apply: () => {
      const out: Record<string, boolean> = {};
      for (const def of PROJECT_MODULE_CATALOG) {
        out[def.slug] = !CONSULTING_ONLY_MODULES.has(def.slug) && !OPT_IN_MODULES.has(def.slug);
      }
      // Directory is always useful on construction too.
      out.directory = true;
      out.admin = true;
      return out;
    },
  },
  {
    id: 'communications',
    label: 'Communications focus',
    description: 'Keep overview + CRM + correspondence + portal + client updates; hide field noise.',
    apply: (projectType) => {
      const lean = MODULE_PRESETS[0].apply(projectType);
      for (const slug of CONSTRUCTION_FIELD_MODULES) lean[slug] = false;
      lean.procurement = false;
      lean.progress = false;
      lean.safety = false;
      lean.directory = true;
      lean.correspondence = true;
      lean['client-updates'] = true;
      lean['client-portal'] = true;
      lean.meetings = true;
      lean.repository = true;
      lean.financials = true;
      lean.proposals = projectKind({ project_type: projectType }) === 'consulting';
      lean.invoicing = projectKind({ project_type: projectType }) === 'consulting';
      return lean;
    },
  },
  {
    id: 'reset-defaults',
    label: 'Reset to type defaults',
    description: 'Clear custom overrides and use the consulting / construction defaults for this project type.',
    apply: (projectType) => {
      const out: Record<string, boolean> = {};
      for (const def of PROJECT_MODULE_CATALOG) {
        out[def.slug] = defaultModuleVisible(def.slug, projectType);
      }
      return out;
    },
  },
];

export interface ModuleVisibilityProject {
  id?: string;
  project_type?: string | null;
  module_config?: Record<string, boolean> | null;
  module_inherit_from_parent?: boolean | null;
  parent_project_id?: string | null;
}

/** Default visibility for a module before any admin override is applied. */
export function defaultModuleVisible(
  slug: ProjectModuleSlug,
  projectType: string | null | undefined,
): boolean {
  if (LOCKED_MODULES.has(slug)) return true;
  // Optional suites (e.g. Stores) stay off until Project Admin turns them on.
  if (OPT_IN_MODULES.has(slug)) return false;
  const kind = projectKind({ project_type: projectType });
  if (kind === 'consulting') return CONSULTING_DEFAULT_MODULES.has(slug);
  // Construction: everything except consulting-native modules.
  return !CONSULTING_ONLY_MODULES.has(slug) || slug === 'directory' || slug === 'admin';
}

/**
 * Effective visibility for a single project row (no parent walk).
 * Explicit override wins; else type default.
 */
export function isModuleVisible(
  project: ModuleVisibilityProject | null | undefined,
  slug: string,
): boolean {
  if (LOCKED_MODULES.has(slug as ProjectModuleSlug)) return true;
  const cfg = project?.module_config;
  if (cfg && typeof cfg[slug] === 'boolean') return cfg[slug];
  return defaultModuleVisible(slug as ProjectModuleSlug, project?.project_type);
}

/**
 * Resolve visibility with optional parent inheritance for sub-projects.
 * Pass `parent` when the child has `module_inherit_from_parent === true`.
 */
export function resolveModuleVisible(
  project: ModuleVisibilityProject | null | undefined,
  slug: string,
  parent?: ModuleVisibilityProject | null,
): boolean {
  if (LOCKED_MODULES.has(slug as ProjectModuleSlug)) return true;

  const cfg = project?.module_config;
  // Explicit local override always wins — even when inheriting.
  if (cfg && typeof cfg[slug] === 'boolean') return cfg[slug];

  if (project?.module_inherit_from_parent && parent) {
    return isModuleVisible(parent, slug);
  }

  return defaultModuleVisible(slug as ProjectModuleSlug, project?.project_type);
}

/** Map internal module slugs → owner-portal nav segments. */
export function portalModulesForProject(
  project: ModuleVisibilityProject | null | undefined,
  parent?: ModuleVisibilityProject | null,
): Set<string> {
  const enabled = new Set<string>(['overview']); // overview always
  for (const def of PROJECT_MODULE_CATALOG) {
    if (!def.portalSlug) continue;
    if (resolveModuleVisible(project, def.slug, parent)) {
      enabled.add(def.portalSlug);
    }
  }
  // Contract / reports also need financials or contracts on.
  if (resolveModuleVisible(project, 'financials', parent) || resolveModuleVisible(project, 'contracts', parent)) {
    enabled.add('contract');
    enabled.add('reports');
  }
  return enabled;
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
    if (def.locked) {
      out[def.slug] = true;
      continue;
    }
    out[def.slug] = values[def.slug] ?? true;
  }
  return out;
}

/** Empty config object meaning "use type defaults" (reset). */
export function emptyModuleConfig(): Record<string, boolean> {
  return {};
}
