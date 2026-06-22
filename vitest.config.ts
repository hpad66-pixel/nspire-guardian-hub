import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
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
        "src/hooks/useLienWaivers.ts",
        "src/hooks/useLienReleases.ts",
        "src/hooks/useCoWorkflow.ts",
        "src/hooks/usePrimeContract.ts",
        "src/hooks/useCoSettings.ts",
        "src/hooks/useCommitmentPayments.ts",
        "src/hooks/usePrimeContractPayments.ts",
        "src/hooks/useFinancialProposals.ts",
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
        // Financial money-path hooks.
        "src/hooks/useLienWaivers.ts": { lines: 75, functions: 70 },
        "src/hooks/useLienReleases.ts": { lines: 95, functions: 90 },
        "src/hooks/useCoSettings.ts": { lines: 95, functions: 90 },
        "src/hooks/useCoWorkflow.ts": { lines: 80, functions: 55 },
        "src/hooks/useCommitmentPayments.ts": { lines: 85, functions: 70 },
        "src/hooks/usePrimeContractPayments.ts": { lines: 85, functions: 65 },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
