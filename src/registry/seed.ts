/**
 * Phase 1 scaffold for the feature registry seed.
 *
 * Phase 2 (deterministic pass) will scan src/App.tsx and populate this array
 * with one entry per route + edge function. For now it holds just the
 * registry's own self-entry so the /admin/registry page renders against
 * something on a fresh database.
 *
 * Keep this file pure data — no imports from the app — so the Phase 2
 * scanner can regenerate it without pulling in the component tree.
 */

export type Lifecycle =
  | 'LIVE'
  | 'PREVIEW'
  | 'LAB'
  | 'ARCHIVED'
  | 'DEPRECATED';

export type Visibility = 'public' | 'tenant' | 'admin';

export type FeatureKind =
  | 'module'
  | 'route'
  | 'page'
  | 'edge_function'
  | 'integration'
  | 'experiment';

export interface FeatureRegistryEntry {
  slug: string;
  kind: FeatureKind;
  display_name: string;
  module: string;
  path?: string;
  lifecycle: Lifecycle;
  visibility?: Visibility;
  owner?: string;
  description?: string;
  rationale?: string;
  depends_on?: string[];
  opa_locka_in_use?: boolean;
  analytics_event?: string;
}

export const FEATURE_SEED: FeatureRegistryEntry[] = [
  {
    slug: 'admin.feature-registry',
    kind: 'page',
    display_name: 'Feature Registry',
    module: 'Admin',
    path: '/admin/registry',
    lifecycle: 'LIVE',
    visibility: 'admin',
    owner: 'apas',
    description:
      'Single source of truth for every route, page, and edge function in the app.',
    rationale:
      'Phase 1 of the module consolidation plan. The registry is the flag — it must ship as LIVE from day one.',
    opa_locka_in_use: false,
  },
];
