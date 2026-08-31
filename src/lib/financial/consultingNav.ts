import { projectKind, type ProjectKind } from "@/lib/projectKind";

/** Paths that belong on consulting financial nav (no pay apps / vendor A/P). */
export const CONSULTING_FINANCIAL_PATHS = new Set([
  "overview",
  "proposals",
  "client-invoices",
  "change-orders",
  "payments",
  "ledger",
  "reports",
  "client-updates",
  // Engagement agreement / prime contract record (routed from Contracts nav).
  "prime-contract",
]);

export function financialKindFor(
  project: { project_type?: string | null } | null | undefined,
): ProjectKind {
  return projectKind(project ?? {});
}

export function isConsultingFinancialPath(path: string): boolean {
  return CONSULTING_FINANCIAL_PATHS.has(path);
}
