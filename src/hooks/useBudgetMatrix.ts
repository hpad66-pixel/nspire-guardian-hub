/**
 * D6 · useBudgetMatrix — alias hook at the path the prompt requires.
 * Delegates to src/hooks/useBudget for implementation.
 */
export { useActiveBudget, useBudgetLines, useBudgetMatrix, useBudgetModifications, useBudgetSnapshots, buildBudgetMatrixCsv } from "@/hooks/useBudget";
export type { ProjectBudget, BudgetLine, BudgetMatrixRow, BudgetModification } from "@/hooks/useBudget";
