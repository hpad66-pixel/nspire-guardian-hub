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
      ],
      // Per-glob gates. Enforced on the shared Ball-in-Court engine
      // (CLAUDE.md: ≥80% on src/lib/workflow + financial services); ratchet the
      // rest of src/hooks/ toward the 70% bar over time as tests are backfilled.
      thresholds: {
        "src/lib/workflow/**": {
          statements: 80, branches: 80, functions: 80, lines: 80,
        },
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
