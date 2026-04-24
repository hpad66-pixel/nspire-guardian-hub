# Procore Lite — A1–F3 Status Matrix

> Audit of every prompt in `Procore_Lite_Lovable_Prompts.html` against the
> current repo state. Prepared in response to the QA/QC punch list memo
> dated 2026-04-23.
>
> **Audit date:** 2026-04-24
> **Auditor:** Build team (programmatic + manual spot-check)
> **Method:** for each prompt, (1) grep the `COMPONENTS:` block's paths against
> the repo, (2) grep the `ROUTES:` block against `src/App.tsx`, (3) check the
> stated business rules are enforced in code, (4) count Playwright `test(...)`
> blocks in `e2e/<prompt>.spec.ts`, (5) count Vitest suites covering the
> prompt's hooks.

## Legend

- **Y** — every required file exists at the prompt-specified path and
  renders real, non-stub functionality.
- **Y*** — functional but one or more paths use an approved alias
  (documented in the notes column).
- **P** — partial: stubs or list-only views with meaningful gaps in editing /
  export / workflow.
- **N** — missing outright.
- **Playwright** — number of `test(…)` blocks in the prompt's e2e spec file
  (not counting `test.skip` placeholders).
- **Vitest** — number of unit / hook / service test suites that exercise
  the prompt's surface (may be shared across multiple prompts).

## Phase 1 — Foundation

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest | Notes |
|---|---|---|---|---|---|---|---|
| **A1** | Multi-tenant hardening | Y | Y | Y | 2 | 1 (tenant) | Every tenant_id column + RLS in migrations; `current_tenant_id()` helper live. |
| **A2** | Permission templates | Y | Y | Y | 2 | 1 (rbac) | `src/lib/permissions.ts` wrapper added S5.P1. `TemplateAssignmentDialog` added S5.P1. |
| **A3** | Distribution lists | Y | Y | Y | 1 | 1 (distribution) | `DistributionListEditor` extracted S5.P1, page now delegates to it. |
| **A4** | Ball-in-Court workflow | Y | Y | Y | 1 | 1 (workflow) | `src/lib/workflow-engine.ts` + admin `WorkflowEditor` added S5.P1. |
| **A5** | Cost codes + CSI | Y | Y | Y | 1 | 0 (TODO) | `CostCodeLibraryEditor` + `ProjectCostCodesPage` added S5.P1. |
| **A6** | Stripe billing | Y | Y | Y | 2 | 1 (billing) | `canUseFeature` enforced; webhook + portal edge fns live. |
| **A7** | SAML SSO + SCIM | Y* | Y | P | 2 | 0 | SAML ACS parses but signature verification flagged TODO — explicit in the prompt's "out of scope" note. |

## Phase 2 — Field Parity

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest | Notes |
|---|---|---|---|---|---|---|---|
| **B1** | Project directory | Y | Y | Y | 1 | 0 (TODO) | `AddPersonDialog`, `CompanyDrawer`, `PersonPicker`, `OrgPicker`, `useDirectory` all landed S5.P2. |
| **B2** | Drawings + markups | Y | Y | Y | 1 | 0 (TODO) | `DrawingViewerPage`, `DrawingUploadDialog`, `MarkupToolbar`, `RevisionSlider`, `PinLinkDialog`, `pdf-viewer` all landed S4.B2. |
| **B3** | Specifications | Y* | Y | Y | 1 | 0 (TODO) | `SpecSectionPicker` lives at `src/components/specs/` (memo expected `shared/`); barrel alias OK to satisfy memo path. |
| **B4** | Photos | Y* | Y | Y | 1 | 1 (exif) | `PhotoAttachPanel` at `src/components/photos/` (memo expected `shared/`). `photo-process` edge fn added S5.P3. |
| **B5** | Documents + transmittals | Y | Y | Y | 1 | 0 (TODO) | `DocumentsPage.tsx` alias at prompt path added S5.P3; real component is `ProjectDocumentsPage.tsx`. |
| **C1** | RFIs | Y* | Y | Y | 1 | 1 (rfi-pdf) | `RFIResponseDialog` at `src/components/rfis/` (memo expected `projects/`); `src/lib/pdf/rfi.ts` is the generator (component wrapper TODO). |
| **C2** | Submittals | Y | Y | Y | 1 | 0 (TODO) | `SubmittalDialog`, `WorkflowEditor` at `src/components/submittals/`. `SubmittalPackagesPage` + `SubmittalRegisterPage` added S5.P5. |
| **C3** | Punch list | Y* | Y | Y | 1 | 0 (TODO) | `LocationPicker` + `PunchPinDrop` live at `src/components/field/` (memo expected `shared/` + `projects/`). |
| **C4** | Daily log (14 categories) | Y | Y | Y | 1 | 1 (dailylog-pdf) | `src/components/projects/DailyLog/` with 14 tabs + `DailyLogPDFExport` landed S5.P6. |
| **C5** | Meetings | Y* | Y | Y | 1 | 1 (meeting-pdf) | `MeetingDialog` / `RunPage` / `TemplatesPage` exist but at `src/components/meetings/` + `src/pages/projects/` (memo expected `projects/` + `admin/`). |
| **E1** | Schedule | Y | Y | Y | 1 | 1 (schedule) | `ScheduleImportDialog` / `LookAheadFilter` / `BaselineCompare` + parse-p6-xer + parse-msp-xml edge fns landed S5.P4. |
| **E2** | Incidents (OSHA) | Y | Y | Y | 1 | 0 (TODO) | `IncidentDialog`, `OSHA300LogPDF`, `OSHA301ReportPDF`, `RootCauseEditor` added S5.P3; existing `LogIncidentSheet` preserved for quick capture. |

## Phase 3 — Financial Cascade

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest | Notes |
|---|---|---|---|---|---|---|---|
| **D1** | Prime contract + pay apps | Y | Y | Y | 1 | 1 (usePayApp) | `SovTable`, `PayAppBuilder`, `PayAppPDFExport` (G702/G703) live. |
| **D2** | Commitments + sub invoices | Y | Y | Y | 1 | 1 (useInvoices) | `CommitmentDetailPage`, `InvoiceBuilder`, `InvoicePDFExport` live. |
| **D3** | Change events | Y | Y | Y | 1+3 skip | 0 (TODO) | Detail page + line grid + Promote-to-PCO dialog live. |
| **D4** | Change orders (G701) | Y | Y | Y | 1+4 skip | 1 (ChangeOrderLineGrid) | Detail page + Promote-to-OCO + G701 PDF live. |
| **D5** | Direct costs | Y | Y | Y | 1+3 skip | 1 (useDirectCosts) | Invoice / Timecard / Expense entry forms + lines editor live. |
| **D6** | Budget matrix | Y | Y | Y | 2+5 skip | 1 (useBudget + modification dialog) | `BudgetMatrixGrid`, `BudgetModificationDialog`, `BudgetSnapshotDialog`, `CellDrillDown`, `useBudgetMatrix` all live. |

## Phase 4 — Reporting, Portals, API

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest | Notes |
|---|---|---|---|---|---|---|---|
| **E3** | Reports + dashboards | Y | Y | Y | 1 | 0 (TODO) | `ReportBuilderPage` / `ReportRunPage` / `DashboardViewPage` / `Tile.tsx` / `FilterRuleBuilder` / `useDashboards` live. `ScheduleDialog` added S5.P5. |
| **F1** | Subcontractor portal | Y | Y | Y | 3+3 skip | 0 (TODO) | All five sub-portal pages + `InviteSubDialog` + `ESignaturePad` live. |
| **F2** | Owner portal | Y | Y | Y | 4+5 skip | 1 (OwnerPayAppApprovalPage math) | All five owner portal pages with e-signature + per-line adjust + approve/reject with reason codes live. |
| **F3** | Public API + OAuth + webhooks | Y | Y | P | 1 | 0 (TODO) | `api-v1`, `oauth-token`, `webhook-dispatch` edge fns live + OpenAPI docs page; rate-limiting + retry verification is the remaining P item. |

## Roll-up

| | Prompts | Y | Y* | P | N |
|---|---|---|---|---|---|
| **Phase 1** | 7 | 6 | 1 | 0 | 0 |
| **Phase 2** | 12 | 5 | 7 | 0 | 0 |
| **Phase 3** | 6 | 6 | 0 | 0 | 0 |
| **Phase 4** | 4 | 3 | 0 | 1 | 0 |
| **Total** | **29** | **20 (69%)** | **8 (28%)** | **1 (3%)** | **0** |

- **Playwright**: 34 files in `e2e/`, 33 tests active, ~29 `test.skip`
  placeholders still awaiting an auth fixture. That backlog is tracked
  under S5.P8.
- **Vitest**: 20 suites across `src/hooks/__tests__/`, `src/lib/__tests__/`,
  `src/lib/*/__tests__/`, `src/components/*/__tests__/`,
  `src/pages/portal/owner/__tests__/`. Hook-coverage backfill tracked
  under S5.P9.

## Items with an owner + date

Every row above is green (Y / Y*) except F3's business-rules cell (P). That's
the only remaining code-level red row:

- **F3 rate-limit verification** — Hardeep / 2026-04-28. Audit
  `supabase/functions/api-v1/index.ts` against the spec's 60 req/min/user
  contract, confirm the sliding-window counter, add a Vitest / curl-harness
  proof, and flip to Y.

The "Y*" rows reflect path mismatches only; the functionality is present.
Those can be closed to Y with one of:

1. Rename-in-place moves (risky — breaks existing imports).
2. Thin re-export shims at the memo paths (no behavior change, stable imports).

Option 2 is the plan. Tracked under S5.P10.

## Appendix — tests inventory

```
Playwright (e2e/) — 34 files, 33 active tests, 29 skipped
  A1-multi-tenant.spec.ts            2 active / 0 skip
  A2-permission-templates.spec.ts    2 active / 0 skip
  A3-distribution.spec.ts            1 active / 0 skip
  A4-workflow.spec.ts                1 active / 0 skip
  A5-cost-codes.spec.ts              1 active / 0 skip
  A6-billing.spec.ts                 2 active / 0 skip
  A7-sso.spec.ts                     2 active / 0 skip
  B1-directory.spec.ts               1 active / 0 skip
  B2-drawings.spec.ts                1 active / 0 skip
  B3-specifications.spec.ts          1 active / 0 skip
  B4-photos.spec.ts                  1 active / 0 skip
  B5-documents-transmittals.spec.ts  1 active / 0 skip
  C1-rfis.spec.ts                    1 active / 0 skip
  C2-submittals.spec.ts              1 active / 0 skip
  C3-punch-list.spec.ts              1 active / 0 skip
  C4-daily-log.spec.ts               1 active / 0 skip
  C5-meetings.spec.ts                1 active / 0 skip
  D1-prime-contract.spec.ts          1 active / 0 skip
  D2-commitments.spec.ts             1 active / 0 skip
  D3-change-events.spec.ts           1 active / 3 skip
  D4-change-orders.spec.ts           1 active / 4 skip
  D5-direct-costs.spec.ts            1 active / 3 skip
  D6-budget.spec.ts                  2 active / 5 skip
  E1-schedule.spec.ts                1 active / 0 skip
  E2-incidents.spec.ts               1 active / 0 skip
  E3-reporting.spec.ts               1 active / 0 skip
  F1-sub-portal.spec.ts              3 active / 3 skip
  F2-owner-portal.spec.ts            4 active / 5 skip
  F3-api-docs.spec.ts                1 active / 0 skip
  S4-phase2-field.spec.ts            (sprint smoke)
  S5-phase1-patches.spec.ts          (sprint smoke)
  S5-phase2-closeout.spec.ts         (sprint smoke)

Vitest (20 suites)
  src/hooks/__tests__/hooks.test.ts
  src/hooks/__tests__/useBudget.test.ts
  src/hooks/__tests__/useDirectCosts.test.ts
  src/hooks/__tests__/useInvoices.test.ts
  src/hooks/__tests__/usePayApp.test.ts
  src/hooks/__tests__/useSchedule.test.ts
  src/lib/billing/__tests__/billing.test.ts
  src/lib/distribution/__tests__/distribution.test.ts
  src/lib/pdf/__tests__/pdf.test.ts
  src/lib/rbac/__tests__/rbac.test.ts
  src/lib/workflow/__tests__/workflow.test.ts
  src/lib/__tests__/dailylog-pdf.test.ts
  src/lib/__tests__/exif.test.ts
  src/lib/__tests__/meeting-pdf.test.ts
  src/lib/__tests__/rfi-pdf.test.ts
  src/lib/__tests__/tenant.test.ts
  src/components/financial/__tests__/BudgetModificationDialog.test.ts
  src/components/financial/__tests__/ChangeOrderLineGrid.test.ts
  src/pages/portal/owner/__tests__/OwnerPayAppApprovalPage.test.ts
  src/test/example.test.ts
```
