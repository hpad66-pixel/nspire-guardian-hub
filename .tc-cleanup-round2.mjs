export const meta = {
  name: 'typecheck-cleanup-r2',
  description: 'Fix remaining 233 type-only Supabase typecheck errors across 69 files (round 2)',
  phases: [{ title: 'Fix', detail: 'one agent per file' }],
};

const FILES = ["src/hooks/__tests__/useFinancialProposals.test.ts","src/hooks/__tests__/usePayAppContinuation.test.ts","src/hooks/__tests__/useProjectDocuments.test.ts","src/hooks/__tests__/usePunchItems.test.ts","src/hooks/__tests__/useReports.test.ts","src/hooks/__tests__/useSetPayAppStatus.test.ts","src/hooks/useApiClients.ts","src/hooks/useBudget.ts","src/hooks/useChangeEvents.ts","src/hooks/useClients.ts","src/hooks/useCoSettings.ts","src/hooks/useCommitments.ts","src/hooks/useCostCodes.ts","src/hooks/useCredentials.ts","src/hooks/useDailyLog.ts","src/hooks/useDirectCosts.ts","src/hooks/useDirectory.ts","src/hooks/useDistributionLists.ts","src/hooks/useDocumentFolders.ts","src/hooks/useDocuments.ts","src/hooks/useDrawings.ts","src/hooks/useEquipment.ts","src/hooks/useFinancialProposals.ts","src/hooks/useIncidents.ts","src/hooks/useInspectionAddendums.ts","src/hooks/useInspectionReview.ts","src/hooks/useInventory.ts","src/hooks/useInvoices.ts","src/hooks/useMaintenanceRequests.ts","src/hooks/useMessageThreads.ts","src/hooks/usePayApp.ts","src/hooks/usePayAppContinuation.ts","src/hooks/usePermissionTemplates.ts","src/hooks/usePhotos.ts","src/hooks/usePortals.ts","src/hooks/usePrimeContract.ts","src/hooks/useProcoreChangeOrders.ts","src/hooks/useProcoreReports.ts","src/hooks/useProcoreSubmittals.ts","src/hooks/useProjectCloseout.ts","src/hooks/useProjectDirectory.ts","src/hooks/useProjectDocuments.ts","src/hooks/useProjectIssues.ts","src/hooks/useProjectProcurement.ts","src/hooks/useProjectProgress.ts","src/hooks/useProjectSafety.ts","src/hooks/usePropertyArchives.ts","src/hooks/useSSO.ts","src/hooks/useSchedule.ts","src/hooks/useSpecs.ts","src/hooks/useTenantSettings.ts","src/hooks/useTenants.ts","src/hooks/useUtilityBills.ts","src/hooks/useVoiceAgentConfig.ts","src/hooks/useWorkflow.ts","src/hooks/useWorkflowDefinitions.ts","src/hooks/useWorkspaceBranding.ts","src/lib/billing/index.ts","src/lib/flushOfflineQueue.ts","src/pages/admin/CostCodeLibraryEditor.tsx","src/pages/auth/AcceptInvitePage.tsx","src/pages/portal/owner/OwnerSchedulePage.tsx","src/pages/portal/schedule/GlorietaSchedule.tsx","src/pages/projects/DailyLogPage.tsx","src/pages/projects/MeetingTemplatesPage.tsx","src/pages/projects/ProjectCostCodesPage.tsx","src/pages/projects/financial/ChangeOrderDetailPage.tsx","src/pages/projects/financial/InvoicesPage.tsx","src/pages/projects/financial/LienReleasesPage.tsx"];

const RULES = `You are fixing TypeScript-only errors in ONE file of a Vite+React+Supabase repo. The production build is esbuild (ignores types); these are type-only and must be fixed WITHOUT changing any runtime behavior.

STEP 1 — get your errors: run \`cat /tmp/errmap.json\` (Bash) — it is a JSON object mapping file path -> array of error strings. Find the entry whose key EXACTLY equals this file's path and fix every listed error. If there is no entry, return "no errors".

STEP 2 — fix, using the SMALLEST type-only edits. Patterns:
- TS2352 ("Conversion of type ... may be a mistake ... convert the expression to 'unknown' first"): the code casts a Supabase result like \`data as T\` or \`(data ?? []) as T[]\`. Change it to \`... as unknown as T\` / \`as unknown as T[]\`.
- TS2339 ("Property 'x' does not exist on type ...SelectQueryError..." / never): the supabase \`data\` is mis-inferred as an error type, so \`.map\`, \`.length\`, \`row.foo\` fail. Fix by casting the data ONCE to the right shape before use, e.g. \`const rows = (data ?? []) as unknown as RowType[];\` then use \`rows\`. If the row type isn't obvious, use \`any[]\` (e.g. \`(data ?? []) as any[]\`). Do not change the query or logic.
- TS2769 / TS2345 on \`.insert(...)\` / \`.update(...)\` / \`.upsert(...)\`: cast the PAYLOAD object \`as any\`, e.g. \`.insert(row as any)\`, \`.update({ ... } as any)\`.
- TS2589 ("Type instantiation is excessively deep"): break the chain by typing the builder loosely — e.g. \`const q: any = supabase.from(...)...\` then await \`q\`, or cast the result \`as unknown as T\`.
- TS2698 (spread types) / TS2493 (tuple) / other: apply the minimal cast or guard to satisfy the compiler without changing behavior.

HARD RULES:
- DO NOT add \`as any\` to \`.from('table')\` — it makes the result an error type and creates MORE errors.
- DO NOT change query strings, column names, values, control flow, or any runtime behavior. Type annotations/casts ONLY.
- DO NOT run \`tsc\`, \`npm run typecheck\`, or \`npm run build\` — the orchestrator verifies once at the end (and concurrent tsc runs would be wrong anyway).
- Only edit THIS file. Read it first, then make targeted edits at the cited line numbers.

Return one line: the filename + how many errors you addressed.`;

phase('Fix');
const results = await parallel(
  FILES.map((f) => () => agent(`File to fix: ${f}\n\n${RULES}`, { label: f.replace('src/', '') }))
);
const done = results.filter(Boolean).length;
log(`Completed ${done}/${FILES.length} file agents`);
return { completed: done, total: FILES.length };
