import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    // The Supabase client (src/integrations/supabase/client.ts) throws on import
    // when these are missing. Tests mock the client, so dummy values are correct —
    // they just satisfy the import-time guard so a bare `npm run test` works
    // locally without a .env.local. CI injects the real values as secrets.
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      VITE_SUPABASE_PROJECT_ID: "test",
    },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      // Only measure the source we gate on, so the report isn't drowned out
      // by the (large) untested long tail. Broaden `include` as coverage grows.
      include: [
        "src/lib/workflow/**/*.ts",
        "src/lib/financial/lien.ts",
        "src/lib/financial/intake.ts",
        "src/lib/financial/ledger.ts",
        "src/lib/financial/payAppContinuation.ts",
        "src/lib/reports/financialReports.ts",
        "src/lib/financial/paymentAllocation.ts",
        "src/hooks/usePayAppContinuation.ts",
        "src/hooks/useLienWaivers.ts",
        "src/hooks/useLienReleases.ts",
        "src/hooks/useCoWorkflow.ts",
        "src/hooks/usePrimeContract.ts",
        "src/hooks/useCoSettings.ts",
        "src/hooks/useCommitmentPayments.ts",
        "src/hooks/usePrimeContractPayments.ts",
        "src/hooks/useFinancialProposals.ts",
        "src/hooks/useRFIs.ts",
        "src/hooks/useProcoreRfis.ts",
        "src/hooks/useProjectProgress.ts",
        "src/hooks/useSovProgress.ts",
        "src/hooks/useProgressReports.ts",
        "src/hooks/useWorkOrders.ts",
        "src/hooks/useProjects.ts",
        "src/hooks/useProjectMeetings.ts",
        "src/hooks/usePermits.ts",
        "src/hooks/useProjectDocuments.ts",
        "src/hooks/useReports.ts",
        "src/hooks/useProcoreChangeOrders.ts",
        "src/hooks/useProposals.ts",
        "src/hooks/useProjectFinancials.ts",
        "src/hooks/useProjectIntake.ts",
        "src/hooks/useProjectProcurement.ts",
      ],
      // Per-glob gates. Floors are set just below current measured coverage so
      // they lock in progress and ratchet UP over time — never down. Branches
      // are intentionally looser on option-heavy hooks (noisy) and omitted where
      // not meaningful. usePrimeContract.ts and useFinancialProposals.ts are
      // measured (in `include`) but not yet gated: each bundles extra exports
      // (usePrimeContractSov/Totals/PayApps, useFinancialProposalLines) that
      // still need tests before a fair file-level floor can be set.
      thresholds: {
        // Shared Ball-in-Court engine + financial services (CLAUDE.md: ≥80%).
        "src/lib/workflow/**": { statements: 80, branches: 80, functions: 80, lines: 80 },
        "src/lib/financial/lien.ts": { statements: 95, branches: 95, functions: 95, lines: 95 },
        "src/lib/financial/intake.ts": { statements: 90, branches: 80, functions: 95, lines: 90 },
        "src/lib/financial/ledger.ts": { statements: 95, branches: 90, functions: 95, lines: 95 },
        "src/lib/financial/payAppContinuation.ts": { statements: 95, branches: 90, functions: 95, lines: 95 },
        "src/lib/reports/financialReports.ts": { statements: 85, branches: 70, functions: 90, lines: 85 },
        "src/lib/financial/paymentAllocation.ts": { statements: 90, branches: 85, functions: 90, lines: 90 },
        // Financial money-path hooks.
        "src/hooks/useLienWaivers.ts": { lines: 75, functions: 70 },
        "src/hooks/useLienReleases.ts": { lines: 95, functions: 90 },
        "src/hooks/useCoSettings.ts": { lines: 95, functions: 90 },
        "src/hooks/useCoWorkflow.ts": { lines: 80, functions: 55 },
        "src/hooks/useCommitmentPayments.ts": { lines: 85, functions: 70 },
        "src/hooks/usePrimeContractPayments.ts": { lines: 85, functions: 65 },
        // Field / progress / procurement hooks (well-covered subset).
        "src/hooks/useProcoreChangeOrders.ts": { lines: 85, functions: 90 },
        "src/hooks/useProcoreRfis.ts": { lines: 90, functions: 90 },
        "src/hooks/useProjectFinancials.ts": { lines: 95, functions: 90 },
        "src/hooks/useProjectIntake.ts": { lines: 90, functions: 80 },
        "src/hooks/useProjectMeetings.ts": { lines: 75, functions: 45 },
        "src/hooks/useSovProgress.ts": { lines: 95, functions: 90 },
        "src/hooks/useWorkOrders.ts": { lines: 65, functions: 75 },
        "src/hooks/useProjectProgress.ts": { lines: 65, functions: 75 },
        // Former laggards — sibling exports now covered, so gated.
        "src/hooks/usePrimeContract.ts": { lines: 95, functions: 95 },
        "src/hooks/useFinancialProposals.ts": { lines: 95, functions: 95 },
        "src/hooks/useProjectDocuments.ts": { lines: 95, functions: 95 },
        "src/hooks/useReports.ts": { lines: 90, functions: 95 },
        "src/hooks/useProposals.ts": { lines: 95, functions: 95 },
        "src/hooks/usePermits.ts": { lines: 90, functions: 90 },
        "src/hooks/useRFIs.ts": { lines: 95, functions: 95 },
        "src/hooks/useProjectProcurement.ts": { lines: 95, functions: 95 },
        "src/hooks/useProjects.ts": { lines: 85, functions: 80 },
        // useProgressReports — SSE generate hook now covered via makeSseResponse.
        "src/hooks/useProgressReports.ts": { lines: 95, functions: 95 },
        // Prime pay-app continuation (generate from SOV + approved COs).
        "src/hooks/usePayAppContinuation.ts": { lines: 70, functions: 60 },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
