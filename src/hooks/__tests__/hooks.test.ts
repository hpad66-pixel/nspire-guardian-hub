/**
 * Bulk hook smoke tests.
 *
 * For each hook we assert:
 *   - default export/named exports exist
 *   - the hook module imports without side-effect errors
 *
 * Full happy/validation/permission-path coverage per hook would require a
 * running TanStack Query provider + mocked supabase chainable. That's covered
 * for the core service layers (tenant, rbac, billing, workflow, distribution,
 * pdf) in their dedicated test files. This file makes sure the remaining
 * hooks at least compile + export what they claim to.
 */
import { describe, it, expect } from "vitest";

const modules = [
  () => import("@/hooks/useTenantContext"),
  () => import("@/hooks/useTenantSettings"),
  () => import("@/hooks/usePermissionTemplates"),
  () => import("@/hooks/useDistributionLists"),
  () => import("@/hooks/useWorkflow"),
  () => import("@/hooks/useCostCodes"),
  () => import("@/hooks/useSubscription"),
  () => import("@/hooks/useSSO"),
  () => import("@/hooks/useProjectDirectory"),
  () => import("@/hooks/useDrawings"),
  () => import("@/hooks/useSpecs"),
  () => import("@/hooks/usePhotos"),
  () => import("@/hooks/useProjectDocuments"),
  () => import("@/hooks/useProcoreRfis"),
  () => import("@/hooks/useProcoreSubmittals"),
  () => import("@/hooks/usePunchList"),
  () => import("@/hooks/useDailyLog"),
  () => import("@/hooks/useMeetings"),
  () => import("@/hooks/useSchedule"),
  () => import("@/hooks/useIncidents"),
  () => import("@/hooks/usePrimeContract"),
  () => import("@/hooks/useCommitments"),
  () => import("@/hooks/useChangeEvents"),
  () => import("@/hooks/useProcoreChangeOrders"),
  () => import("@/hooks/useDirectCosts"),
  () => import("@/hooks/useBudget"),
  () => import("@/hooks/useProcoreReports"),
  () => import("@/hooks/usePortals"),
  () => import("@/hooks/useApiClients"),
];

describe("Procore Lite hook modules", () => {
  it.each(modules)("module %# loads and exposes named hooks", async (load) => {
    const mod = await load();
    const names = Object.keys(mod);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const value = (mod as any)[name];
      // Hooks export functions; types/interfaces vanish at runtime; some
      // modules also export primitive constants (e.g. DOCS_BUCKET in
      // useProjectDocuments). Just assert the export is defined.
      expect(value).toBeDefined();
    }
  });
});
