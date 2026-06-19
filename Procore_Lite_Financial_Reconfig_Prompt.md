# PROMPT F0 — Unified Project Financials (Consolidation + Full Lifecycle)

> **Single mega-prompt.** Paste this whole thing into Claude Code in this repo. It supersedes the two competing financial stacks and rebuilds the project financial module as ONE connected ledger. Obey `CLAUDE.md` — especially rule 2 (cost-code-keyed cascade), rule 3 (Ball-in-Court engine), rule 4 (distribution lists), rule 5 (permission templates), rule 7 (only touch listed files), rule 8 (polymorphic-FK tenant triggers), rule 10 (secrets once).
>
> **Naming reminder:** SaaS tenant = `public.workspaces(id)`. Never `public.tenants(id)`.
>
> This is a large change. Work it in the order of the **EXECUTION PLAN** at the bottom, committing after each numbered step on the same branch `feature/F0-unified-financials`. Run `npm run typecheck && npm run test` green before each commit. Do NOT do it all in one commit.

---

## GOAL

Today the repo has **two parallel financial systems that don't talk to each other**, which is why the prime contract, change orders, and pay apps each exist twice and there is no single dashboard:

| | **Stack D — cost-code cascade (KEEP as system of record)** | **Stack A — flat AR/AP ledger (ABSORB then RETIRE)** |
|---|---|---|
| Contract | `prime_contracts` + `prime_contract_sov_lines` | `project_contracts` + `contract_sov_items` |
| Pay apps / invoices | `prime_contract_pay_apps` (+`_lines`), `commitment_invoices` (+`_lines`) | `contract_invoices` (`invoice_kind = invoice\|pay_app`) |
| Change orders | `change_orders` (+`change_order_lines`, cost-code-keyed) | `contract_change_orders` |
| Payments | *(none — pay apps only have a `paid` status)* | `contract_payments` (`direction`, partial, `invoice_id`, `artifact_id`) |
| Views | `project_budgets` / `budget_lines` matrix (D6) | `financial_ledger`, `contract_invoice_balances` |
| Pages | `src/pages/projects/financial/*` under `/projects/:id/financials/*` | `src/pages/projects/contracts/*` under `/projects/:id/contracts/*` |
| Hooks | `usePrimeContract`, `useCommitments`, `useChangeOrders`, `usePayApp`, `useInvoices`, `useBudget*` | `useProjectContracts`, `useContractFinancials` |

**Decision (do not re-litigate):** Consolidate **onto Stack D** (the cost-code cascade — it respects `CLAUDE.md` rule 2 and feeds the Budget matrix). **Port** the genuinely good things from Stack A — partial-payment records with received dates, AR/AP direction, source-document attachments, and the unified ledger view — onto Stack D. Then **migrate Stack A's data into Stack D and retire** `project_contracts` / `contract_*` tables, the `projects/contracts/*` pages, and their hooks.

After this prompt, a project has **one financial home** at `/projects/:projectId/financials/overview` — a single mega-dashboard — that models the real lifecycle of a job:

1. **Prime (base) contract** — one per project (e.g. the sewer-extension job at **$523,000** base).
2. **Change orders** (CO-1, CO-2, CO-4 …) roll up under the prime → **Revised Contract Value = base + executed COs**. Same for commitments.
3. **Pay Applications** (AIA G702/G703 style) are generated against the prime contract SOV; an invoice/pay-app is submitted to the owner (e.g. **$93,000**); **partial or full payments** are recorded **against a specific pay app, on the date received**.
4. **Subcontractor / vendor AP** — we pay subs only against **a received invoice**. **No invoice → no payment** (hard rule, DB-enforced). Partial payments allowed against sub invoices.
5. **Lien releases** flow both directions: **received from subs** (conditional/unconditional × progress/final) before we release their payment, and **issued by us** to the prime/owner. Lien-waiver state **gates** payment.
6. **Electronic vendor submittal** — each project gets an **intake email address + drop folder**; vendors submit invoices and lien releases; the system **auto-ingests** them into draft AP records with the source PDF attached, plus a **manual upload-and-process** path. Recording a payment **auto-updates** the invoice balance, SOV billed-to-date, the ledger, and the budget matrix.

Everything is cost-code-keyed so the D6 Budget matrix keeps reconciling, and everything routes through the shared services (workflow engine A4, distribution A3, permissions A2, plan gating A6).

---

## TABLES

> All new tables: `tenant_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE`, RLS via `public.current_tenant_id()` (policy name `<table>_tenant_isolation`), `created_at/updated_at` with the existing `update_updated_at_column()` trigger. One concern per migration file, RLS in the same file as the `CREATE TABLE`.

### New — cash / payment layer on the cascade
`supabase/migrations/<ts>_f0_prime_contract_payments.sql`
- **`prime_contract_payments`** — AR cash receipts (owner → us), recorded against a pay app.
  - `tenant_id`, `prime_contract_id UUID NOT NULL REFERENCES prime_contracts(id) ON DELETE CASCADE`
  - `pay_app_id UUID NOT NULL REFERENCES prime_contract_pay_apps(id) ON DELETE RESTRICT` *(payment must attach to a pay app)*
  - `amount NUMERIC(14,2) NOT NULL CHECK (amount > 0)`, `received_date DATE NOT NULL`
  - `method TEXT` (check/ach/wire/card/other), `reference TEXT` (check #, ACH trace), `notes TEXT`
  - `artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL` (remittance/deposit doc)
  - `created_by`, timestamps.
  - **Over-payment guard trigger** (`SECURITY DEFINER`, `SET search_path = public`): sum of payments for a pay app may not exceed that pay app's `approved_amount` (or `submitted_amount` if not yet approved). Raise otherwise.

`supabase/migrations/<ts>_f0_commitment_payments.sql`
- **`commitment_payments`** — AP disbursements (us → sub/vendor), recorded against a commitment invoice.
  - `tenant_id`, `commitment_id UUID NOT NULL REFERENCES commitments(id) ON DELETE CASCADE`
  - `commitment_invoice_id UUID NOT NULL REFERENCES commitment_invoices(id) ON DELETE RESTRICT` *(no invoice → no payment — enforced by NOT NULL FK)*
  - `amount NUMERIC(14,2) NOT NULL CHECK (amount > 0)`, `paid_date DATE NOT NULL`
  - `method TEXT`, `reference TEXT`, `notes TEXT`
  - `artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL`
  - `created_by`, timestamps.
  - **Over-payment guard trigger** as above against the invoice's `approved_amount`/`submitted_amount`.
  - **Lien-gate trigger** (`SECURITY DEFINER`): block INSERT if the commitment invoice has no **approved** lien release of the required type for the project's policy (see `lien_releases` + BUSINESS RULES). Raise `LIEN_REQUIRED`.

### New — lien releases (both directions)
`supabase/migrations/<ts>_f0_lien_releases.sql`
- **`lien_releases`**
  - `tenant_id`, `project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE`
  - `direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound'))` — `inbound` = received from a sub; `outbound` = issued by us to the owner/prime.
  - `release_type TEXT NOT NULL CHECK (release_type IN ('conditional_progress','unconditional_progress','conditional_final','unconditional_final'))`
  - Polymorphic parent (exactly one non-null; enforce with CHECK **and** the tenant-boundary trigger per rule 8):
    - `commitment_invoice_id UUID REFERENCES commitment_invoices(id) ON DELETE CASCADE` (inbound)
    - `pay_app_id UUID REFERENCES prime_contract_pay_apps(id) ON DELETE CASCADE` (outbound)
  - `through_date DATE`, `amount NUMERIC(14,2)`
  - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','approved','rejected','void'))`
  - `artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL` (signed waiver PDF)
  - `workflow_instance_id UUID REFERENCES workflow_instances(id)` (A4 approval), `created_by`, timestamps.
  - **Tenant-boundary trigger** (rule 8): looks up the parent (`commitment_invoices` or `prime_contract_pay_apps`) tenant, raises on mismatch; also enforces exactly-one-parent.

### New — electronic vendor submittal / auto-ingestion
`supabase/migrations/<ts>_f0_vendor_submissions.sql`
- **`project_intake`** — one row per project; the inbound address + folder.
  - `tenant_id`, `project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE`
  - `intake_email TEXT NOT NULL UNIQUE` (generated, e.g. `proj-<short>@intake.<app-domain>`)
  - `intake_token_hash TEXT NOT NULL` (per rule 10 — only the hash is stored; plaintext upload token revealed once in the UI), `revoked_at TIMESTAMPTZ`
  - `storage_prefix TEXT NOT NULL` (Supabase Storage drop-folder path), timestamps.
- **`vendor_submissions`** — every inbound document, pre-classification.
  - `tenant_id`, `project_id`, `commitment_id UUID REFERENCES commitments(id) ON DELETE SET NULL` (matched vendor, nullable until matched)
  - `source TEXT NOT NULL CHECK (source IN ('email','folder','manual_upload','portal'))`
  - `from_email TEXT`, `subject TEXT`, `received_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `doc_type TEXT NOT NULL DEFAULT 'unknown' CHECK (doc_type IN ('invoice','lien_release','co_request','unknown'))`
  - `status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received','parsed','needs_review','processed','rejected'))`
  - `parsed JSONB` (extracted fields: amount, invoice #, period, through-date…)
  - `artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL` (the stored PDF)
  - `created_commitment_invoice_id UUID REFERENCES commitment_invoices(id) ON DELETE SET NULL`
  - `created_lien_release_id UUID REFERENCES lien_releases(id) ON DELETE SET NULL`
  - `error TEXT`, timestamps. Tenant-boundary trigger on the nullable FKs (rule 8).

### Altered — carry source docs + AR ledger semantics onto the cascade
`supabase/migrations/<ts>_f0_cascade_ledger_columns.sql`
- `prime_contract_pay_apps`: `ADD COLUMN approved_date DATE`, `ADD COLUMN invoice_no TEXT`, `ADD COLUMN artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL`.
- `commitment_invoices`: `ADD COLUMN artifact_id UUID REFERENCES project_artifacts(id) ON DELETE SET NULL`, `ADD COLUMN vendor_submission_id UUID REFERENCES vendor_submissions(id) ON DELETE SET NULL`.
- Add `paid_to_date`/`balance` are **views, not columns** (see below) to avoid drift.

### New — unified views (rebuilt on the cascade; `security_invoker = on`)
`supabase/migrations/<ts>_f0_financial_views.sql`
- **`v_pay_app_balances`** — per prime pay app: `approved_amount` (or submitted), `SUM(prime_contract_payments.amount)` as `received_to_date`, `balance_due`, `payment_count`, retainage held.
- **`v_commitment_invoice_balances`** — per commitment invoice: approved/submitted, `SUM(commitment_payments.amount)` paid_to_date, `balance_due`, lien-release status rollup.
- **`v_project_financial_ledger`** — UNION ALL across the cascade, **cost-code-keyed**, one row per event with columns: `ledger_id`, `tenant_id`, `project_id`, `cost_code_id`, `direction ('receivable'|'payable')`, `entry_type ('prime_contract'|'commitment'|'change_order'|'pay_app'|'invoice'|'payment'|'lien_release')`, `entry_date`, `party_name`, `reference`, `description`, `amount`, `status`, `artifact_id`. Sources: prime contract + executed COs (receivable), prime pay apps + AR payments, commitments + commitment COs (payable), commitment invoices + AP payments, lien releases (informational).
- **`v_project_financial_summary`** — one row per project for the dashboard header: `original_contract`, `approved_co_value`, `revised_contract`, `billed_to_date`, `received_to_date`, `ar_outstanding`, `ar_retainage_held`, `committed_total`, `commitment_invoiced`, `paid_to_subs`, `ap_outstanding`, `ap_retainage_held`, `net_cash_position`.

> Delete the old Stack-A views `public.financial_ledger` and `public.contract_invoice_balances` in the retirement migration (below), after data is migrated.

### Data migration + retirement (last DB step)
`supabase/migrations/<ts>_f0_retire_stack_a.sql`
- Migrate any real rows: `project_contracts(contract_type='prime')` → `prime_contracts`; `…='subcontract'|'owner'` → `commitments`; `contract_invoices` → `prime_contract_pay_apps` or `commitment_invoices` by kind; `contract_change_orders` → `change_orders`; `contract_payments` → `prime_contract_payments`/`commitment_payments` by `direction`. Map `artifact_id` across. (If the dev DB has only seed/demo data, a clean reseed via `supabase/seed/` is acceptable — see ACCEPTANCE TESTS.)
- `DROP VIEW financial_ledger, contract_invoice_balances;`
- `DROP TABLE contract_payments, contract_invoices, contract_change_orders, contract_sov_items, project_contracts CASCADE;`

---

## COMPONENTS

> Per rule 7, these are the **only** files to create/modify. Anything else touched → call it out in the PR "Out of Spec" section.

**Hooks (create)**
- `src/hooks/usePrimeContractPayments.ts` — `{ data, isLoading, create }` keyed `['prime-contract-payments', payAppId]`; AR receipts.
- `src/hooks/useCommitmentPayments.ts` — keyed `['commitment-payments', invoiceId]`; AP disbursements; surfaces `LIEN_REQUIRED` / over-payment errors as typed errors.
- `src/hooks/useLienReleases.ts` — list/create/advance (A4); keyed `['lien-releases', projectId]`.
- `src/hooks/useVendorSubmissions.ts` — inbox list, `process(submissionId)`, `reject(...)`; keyed `['vendor-submissions', projectId]`.
- `src/hooks/useProjectIntake.ts` — fetch/create intake address, reveal-once token.
- `src/hooks/useProjectFinancials.ts` — reads `v_project_financial_summary` + `v_project_financial_ledger`; the dashboard's single source.

**Hooks (modify)**
- `src/hooks/usePayApp.ts` — add `recordPayment`, `payAppBalance`, `approve(setApprovedDate)`.
- `src/hooks/useInvoices.ts` — add commitment-invoice `recordPayment`, balance, lien-gate awareness.

**Lib (create / modify)**
- `src/lib/financial/ledger.ts` (**modify**) — repoint `LedgerEntry`/`summarizeLedger` to the new `v_project_financial_ledger` shape (`entry_type` now includes `lien_release`; AR/AP from `direction`); keep pure + unit-tested.
- `src/lib/financial/lien.ts` (**create**) — pure policy helpers: `requiredReleaseFor(payment, policy)`, `isPaymentGated(invoice, releases)`.
- `src/lib/financial/intake.ts` (**create**) — pure parse/classify helpers used by the edge function and the manual-process UI (doc-type heuristics, field extraction shape).

**Components (create)**
- `src/components/financial/FinancialOverview.tsx` — the mega-dashboard body: summary KPI cards (base, COs, revised, billed, received, AR outstanding, AP outstanding, retainage, net cash), contract-value waterfall (base → +COs → revised), AR aging by pay app, AP aging by sub invoice, and the unified ledger table (filter all/receivable/payable, deep-links to each record).
- `src/components/financial/RecordPrimePaymentDialog.tsx` — record AR receipt against a pay app (amount, received_date, method, reference, attach doc); blocks over-payment.
- `src/components/financial/RecordCommitmentPaymentDialog.tsx` — record AP payment against a sub invoice; **disabled with explainer when invoice missing or lien release not satisfied.**
- `src/components/financial/LienReleasePanel.tsx` — list + create + approve lien releases for a pay app or commitment invoice; shows gate status.
- `src/components/financial/VendorSubmissionInbox.tsx` — inbox of inbound docs with classify/process/reject, side-by-side PDF preview + extracted fields → "Create draft invoice"/"Create lien release".
- `src/components/financial/ProjectIntakeCard.tsx` — shows the project intake email + drop-folder, reveal-once upload token, manual "Upload document" button.

**Components (modify)**
- `src/components/financial/FinancialSubNav.tsx` — set tab order to: **Overview**, Prime Contract, Change Orders, Pay Apps, Commitments, Vendor Invoices, Lien Releases, Vendor Inbox, Budget, Direct Costs, Ledger. Remove dependence on Stack A.
- `src/components/financial/RecordPaymentDialog.tsx` — fold into the two new dialogs or delete; remove `useContractFinancials` import.

**Pages (create)**
- `src/pages/projects/financial/FinancialOverviewPage.tsx` — renders `FinancialOverview`; the default financials landing.
- `src/pages/projects/financial/LienReleasesPage.tsx`
- `src/pages/projects/financial/VendorInboxPage.tsx`

**Pages (modify)**
- `src/pages/projects/financial/LedgerPage.tsx` + `PaymentsPage.tsx` — repoint from `useContractFinancials`/`useProjectContracts` to `useProjectFinancials`.
- `src/pages/projects/financial/PayAppDetailPage.tsx` — add AR payments list + `RecordPrimePaymentDialog` + outbound `LienReleasePanel`.
- `src/pages/projects/financial/CommitmentDetailPage.tsx` + `InvoicesPage.tsx` — add AP payments + `RecordCommitmentPaymentDialog` + inbound `LienReleasePanel`.

**Pages / routes (delete — retirement)**
- `src/pages/projects/contracts/ContractListPage.tsx`, `ContractDashboardPage.tsx`, `ContractFormPage.tsx`
- `src/hooks/useProjectContracts.ts`, `src/hooks/useContractFinancials.ts` (after all consumers repointed)

**Edge function (create)**
- `supabase/functions/intake-ingest/index.ts` — receives inbound email webhook **and** folder-drop events; verifies the project intake token; stores the PDF as a `project_artifacts` row; creates a `vendor_submissions` row; runs `intake.ts` classify/parse; on confident parse auto-creates a **draft** `commitment_invoice` and/or `lien_release` and links them; else sets `needs_review`. Notifies via A3 distribution. Secrets handled per rule 10.

**App wiring (modify)**
- `src/App.tsx` — add routes under `/projects/:projectId/financials/`: `overview` (also make it the index redirect target), `lien-releases`, `vendor-inbox`; remove the three `/projects/:projectId/contracts*` routes and their lazy imports.

---

## ROUTES

```
/projects/:projectId/financials                         → redirect to overview
/projects/:projectId/financials/overview                → FinancialOverviewPage   (mega-dashboard)
/projects/:projectId/financials/prime-contract          → PrimeContractPage        (existing)
/projects/:projectId/financials/prime-contract/pay-apps/:payAppId → PayAppDetailPage (+AR payments +outbound liens)
/projects/:projectId/financials/change-orders           → ChangeOrdersPage         (existing, rolls up)
/projects/:projectId/financials/commitments             → CommitmentsPage          (existing)
/projects/:projectId/financials/commitments/:commitmentId → CommitmentDetailPage   (+AP payments +inbound liens)
/projects/:projectId/financials/invoices                → InvoicesPage             (vendor invoices / AP)
/projects/:projectId/financials/lien-releases           → LienReleasesPage          (NEW)
/projects/:projectId/financials/vendor-inbox            → VendorInboxPage           (NEW, e-submittal)
/projects/:projectId/financials/budget                  → BudgetPage               (existing, still reconciles)
/projects/:projectId/financials/direct-costs            → DirectCostsPage          (existing)
/projects/:projectId/financials/ledger                  → LedgerPage               (repointed)
/projects/:projectId/financials/payments                → PaymentsPage             (repointed)
DELETE: /projects/:projectId/contracts , /contracts/new , /contracts/:id , /contracts/:id/edit
```

---

## BUSINESS RULES

1. **One prime contract per project.** `prime_contracts` is the base contract (the sewer job: `original_value = 523000`). The overview shows **Revised Contract Value = original_value + Σ executed `change_orders`.** COs in `draft/pending/submitted` show as *pending* exposure, not in the revised value.
2. **Pay apps bill against the SOV.** A pay app's billable ceiling is the prime SOV (revised by executed COs allocated to cost codes via `change_order_lines`). Existing D1 line-total validators stay.
3. **AR payments attach to a pay app and a date.** `prime_contract_payments.pay_app_id` is NOT NULL; `received_date` is NOT NULL. Partial payments allowed; `Σ payments ≤ approved_amount` (or `submitted_amount` pre-approval) — enforced by trigger. Recording a payment flips the pay app to `paid` only when `balance_due = 0`; otherwise it stays `approved` and shows a partial badge.
4. **No invoice → no sub payment.** `commitment_payments.commitment_invoice_id` is NOT NULL — a disbursement cannot exist without a received invoice. The AP dialog is disabled (with explainer) until an invoice exists.
5. **Lien gating.** A commitment payment is blocked unless the linked invoice has an **approved** lien release satisfying project policy: progress payments require at least a **conditional progress** waiver through the billing period; final/retainage release requires an **unconditional final** waiver. Enforced both in `lib/financial/lien.ts` (UI) and the `commitment_payments` lien-gate trigger (DB) — UI must never be the only guard.
6. **Outbound liens.** When we get paid on a pay app, we can issue our own (`direction='outbound'`) waiver to the owner/prime, attached to that pay app, routed through A4 for internal approval before release.
7. **Everything is cost-code-keyed.** Payments/liens inherit `cost_code_id` from their parent SOV/invoice lines so `v_project_financial_ledger` and the D6 budget matrix aggregate correctly (rule 2). Do not add a financial row that can't be traced to a cost code.
8. **Electronic submittal.** Each project exposes an intake email + drop folder (`project_intake`). Inbound docs land in `vendor_submissions` as `received`, get classified/parsed, and on confident parse auto-create **draft** AP invoices / lien releases with the source PDF attached — never auto-approved, never auto-paid. Manual upload uses the same pipeline. Recording a payment auto-updates invoice balance, SOV billed-to-date, ledger, and budget (views, so automatic).
9. **Shared services, no exceptions.** Workflow via `createWorkflowInstance`/`advanceWorkflow` (A4); recipients via `resolveDistribution()` (A3); gates via `can(user, 'payment:create'|'lien:approve'|…, project)` (A2); plan features (`vendor_intake`, `lien_management`) via `canUseFeature()` (A6). No `user.role === …`, no hardcoded recipients, no per-module state machines.
10. **Secrets once** (rule 10): the intake upload token is generated in an edge function, returned once, stored only as `intake_token_hash`; revocation sets `revoked_at`.

---

## ACCEPTANCE TESTS

> One Playwright file `e2e/F0-unified-financials.spec.ts` (a `test()` per bullet) + Vitest for each new hook (`src/hooks/__tests__/`) and for `lib/financial/ledger.ts`, `lien.ts`, `intake.ts`. Coverage: ≥70% hooks, ≥80% on `lib/financial/*`.

1. **Single home.** Visiting `/projects/:id/financials` redirects to `/overview`; the old `/projects/:id/contracts*` routes 404 / are gone; FinancialSubNav shows the new tab order with no Stack-A pages.
2. **Rollup math.** A project with base $523,000 and executed CO-1 +$40,000, CO-2 +$15,000 (and a *pending* CO-4 +$10,000) shows **Revised Contract Value $578,000**, pending exposure $10,000.
3. **Pay app + partial AR payment.** Create Pay App #1 invoicing $93,000; approve; record a $50,000 receipt dated today → pay app shows **balance $43,000**, status `approved` + "partial"; record $43,000 → status `paid`, balance $0; a 4th dollar is rejected by the over-payment guard.
4. **No invoice → no payment.** On a commitment with no invoice, the AP "Record Payment" action is disabled with the "invoice required" explainer; direct DB insert into `commitment_payments` without `commitment_invoice_id` fails NOT NULL.
5. **Lien gate.** A commitment invoice without an approved conditional-progress lien release blocks payment (UI disabled + DB raises `LIEN_REQUIRED`); after approving the release, the same payment succeeds.
6. **Both lien directions.** Inbound waiver attaches to a commitment invoice; outbound waiver attaches to a pay app and routes through A4 approval.
7. **E-submittal (manual).** Upload a vendor invoice PDF in Vendor Inbox → a `vendor_submissions` row (`source='manual_upload'`) appears, classifies as `invoice`, "Create draft invoice" produces a **draft** `commitment_invoice` with the PDF attached; it is not approved or paid.
8. **E-submittal (auto-ingest).** Posting a signed payload to `intake-ingest` with a valid token creates the artifact + `vendor_submissions` row and, on confident parse, a draft invoice/lien-release linked back; invalid/missing token is rejected; the token is stored only as a hash.
9. **Ledger + budget reconcile.** `v_project_financial_ledger` lists prime contract, COs, pay apps, AR payments, commitment invoices, AP payments, and lien releases for the project; `summarizeLedger` AR/AP/net-cash matches `v_project_financial_summary`; the D6 Budget matrix still balances by cost code after payments are recorded.
10. **Tenancy.** A second workspace cannot see or write any F0 row; the `prime_contract_payments`/`commitment_payments`/`lien_releases`/`vendor_submissions` tenant-boundary triggers reject cross-tenant parent UUIDs.

---

## EXECUTION PLAN (commit after each step, branch `feature/F0-unified-financials`)

1. **Migrations — additive layer:** payments, lien_releases, vendor_submissions, intake, cascade columns, views. (no UI yet) → typecheck/test.
2. **Hooks + lib:** new hooks, `ledger.ts` repoint, `lien.ts`, `intake.ts`, with Vitest.
3. **Dialogs + panels:** RecordPrime/CommitmentPaymentDialog, LienReleasePanel, ProjectIntakeCard, VendorSubmissionInbox.
4. **Pages + routes + subnav:** FinancialOverviewPage, LienReleasesPage, VendorInboxPage; wire `App.tsx`; repoint Ledger/Payments/PayAppDetail/CommitmentDetail/Invoices.
5. **Edge function:** `intake-ingest` + secrets + A3 notify.
6. **Retirement migration + delete Stack-A pages/hooks/routes** (only after all consumers repointed).
7. **Seed:** update `supabase/seed/` with the sewer-extension demo (base $523k, CO-1/2/4, Pay App #1 $93k + partial payment, one sub commitment + invoice + conditional lien release + partial AP payment) so the dashboard demos end-to-end.
8. **Tests green, coverage gates met, PR** titled `F0 Unified Project Financials`; "Out of Spec" lists anything beyond COMPONENTS.

---

## NOTES FOR THE BUILDER
- If a dev-DB data migration in step 6 is risky, prefer a clean reseed (the demo is the source of truth for acceptance tests) and note it in the PR.
- Do not introduce new libraries; jspdf/SheetJS already cover pay-app/lien PDF export.
- Keep `prime_contract_pay_apps` and `commitment_invoices` as the canonical "billing" objects — do **not** resurrect `contract_invoices`.
- The over-payment and lien gates must exist at the DB level even though the UI also guards them.
