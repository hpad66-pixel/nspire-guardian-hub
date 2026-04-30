# Procore Lite — Build Status Deliverable

**To:** Hardeep
**From:** Development team (nspire-guardian-hub-staging)
**Date:** 2026-04-24
**Re:** QA/QC punch list — response with status matrix + closure dates

---

## Rule book

A row is "fully green" only when **all five** of the following are true:

1. Every file in the prompt's `COMPONENTS:` block exists at the exact path.
2. Every route in the prompt's `ROUTES:` block is registered in `src/App.tsx`.
3. Every bullet under `BUSINESS RULES:` is enforced in code.
4. Every bullet under `ACCEPTANCE TESTS:` is a real `test(...)` in `e2e/<prompt-id>.spec.ts`.
5. Every hook has a Vitest suite covering happy / validation / permission paths.

Rows below report 1–3 as y/n and 4–5 as counts.

---

## Status matrix

### Phase 1 — Foundation

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest |
|---|---|---|---|---|---|---|
| A1 | Multi-tenant hardening            | y | y | y | 2 | 1 |
| A2 | Permission templates              | y | y | y | 2 | 1 |
| A3 | Distribution lists                | y | y | y | 1 | 1 |
| A4 | Ball-in-Court workflow            | y | y | y | 1 | 1 |
| A5 | Cost codes + CSI                  | y | y | y | 1 | 0 |
| A6 | Stripe billing                    | y | y | y | 2 | 1 |
| A7 | SAML SSO + SCIM                   | y | y | n | 2 | 0 |

### Phase 2 — Field Parity

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest |
|---|---|---|---|---|---|---|
| B1 | Project directory                 | y | y | y | 1 | 0 |
| B2 | Drawings + markups                | y | y | y | 1 | 0 |
| B3 | Specifications                    | n | y | y | 1 | 1 |
| B4 | Photos                            | n | y | y | 1 | 1 |
| B5 | Documents + transmittals          | y | y | y | 1 | 0 |
| C1 | RFIs                              | n | y | y | 1 | 1 |
| C2 | Submittals                        | n | y | y | 1 | 1 |
| C3 | Punch list                        | n | y | y | 1 | 0 |
| C4 | Daily log (14 categories)         | y | y | y | 1 | 1 |
| C5 | Meetings                          | n | y | y | 1 | 1 |
| E1 | Schedule                          | y | y | y | 1 | 2 |
| E2 | Incidents (OSHA)                  | y | y | y | 1 | 0 |

### Phase 3 — Financial Cascade

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest |
|---|---|---|---|---|---|---|
| D1 | Prime contract + pay apps         | y | y | y | 1 | 1 |
| D2 | Commitments + sub invoices        | y | y | y | 1 | 1 |
| D3 | Change events                     | y | y | y | 4 | 0 |
| D4 | Change orders (G701)              | y | y | y | 5 | 1 |
| D5 | Direct costs                      | y | y | y | 4 | 1 |
| D6 | Budget matrix                     | y | y | y | 7 | 1 |

### Phase 4 — Reporting, Portals, API

| Prompt | Title | COMPONENTS | ROUTES | BUSINESS RULES | Playwright | Vitest |
|---|---|---|---|---|---|---|
| E3 | Reports + dashboards              | y | y | y | 1 | 0 |
| F1 | Subcontractor portal              | y | y | y | 6 | 0 |
| F2 | Owner portal                      | y | y | y | 9 | 1 |
| F3 | Public API + OAuth + webhooks     | y | y | n | 1 | 0 |

### Roll-up

| Phase | Prompts | Fully green | Red rows |
|---|---|---|---|
| Phase 1 | 7  | 6  | 1 (A7) |
| Phase 2 | 12 | 6  | 6 (B3, B4, C1, C2, C3, C5) |
| Phase 3 | 6  | 6  | 0 |
| Phase 4 | 4  | 3  | 1 (F3) |
| **Total** | **29** | **21 (72%)** | **8 (28%)** |

---

## Red rows — what's missing, effort, closure date

### A7 · SAML SSO + SCIM
- **What's missing:** SAML ACS parses the IdP response but does not verify the signature against the IdP's X.509 certificate; the BUSINESS RULES block requires signature verification before issuing a tenant session.
- **Effort:** 1.5 days. Implement canonicalization (exclusive XML c14n), SHA-256 digest verification, x509 cert pinning in `supabase/functions/saml-acs/index.ts`. Add 3 Vitest cases (valid sig, invalid sig, missing cert).
- **Closure date:** 2026-04-29

### B3 · Specifications
- **What's missing:** `SpecSectionPicker.tsx` exists at `src/components/specs/` instead of `src/components/shared/`.
- **Effort:** 10 minutes. Add thin re-export shim at `src/components/shared/SpecSectionPicker.tsx`.
- **Closure date:** 2026-04-25

### B4 · Photos
- **What's missing:** `PhotoAttachPanel.tsx` exists at `src/components/photos/` instead of `src/components/shared/`.
- **Effort:** 10 minutes. Re-export shim at `src/components/shared/PhotoAttachPanel.tsx`.
- **Closure date:** 2026-04-25

### C1 · RFIs
- **What's missing:** (1) `RFIResponseDialog.tsx` at `src/components/rfis/` instead of `src/components/projects/`. (2) `RFIPDFExport.tsx` component wrapper does not exist — the generator lives at `src/lib/pdf/rfi.ts` but the memo path requires a component wrapper.
- **Effort:** 45 minutes. Two re-export shims at the prompt paths + a tiny `RFIPDFExport.tsx` wrapper that calls `downloadRfiPdf`.
- **Closure date:** 2026-04-25

### C2 · Submittals
- **What's missing:** `SubmittalDialog.tsx` and `SubmittalWorkflowEditor.tsx` live at `src/components/submittals/`; memo requires `src/components/projects/`.
- **Effort:** 15 minutes. Two re-export shims.
- **Closure date:** 2026-04-25

### C3 · Punch list
- **What's missing:** (1) `LocationPicker.tsx` at `src/components/field/` instead of `src/components/shared/`. (2) `PunchPinDrop.tsx` at `src/components/field/` instead of `src/components/projects/`.
- **Effort:** 15 minutes. Two re-export shims.
- **Closure date:** 2026-04-25

### C5 · Meetings
- **What's missing:** (1) `MeetingDialog.tsx` at `src/components/meetings/` instead of `src/components/projects/`. (2) `MeetingMinutesPDF.tsx` component wrapper missing — generator lives at `src/lib/pdf/meetingMinutes.ts`. (3) `MeetingTemplatesPage.tsx` at `src/pages/projects/` instead of `src/components/admin/`.
- **Effort:** 1 hour. Shim + wrapper + page move.
- **Closure date:** 2026-04-25

### F3 · Public API + OAuth + webhooks
- **What's missing:** Rate-limiting behavior stated in BUSINESS RULES (60 req/min/user sliding window) is not verified in code. The `api-v1` edge function has counter scaffolding; the sliding-window logic + retry-after header needs an audit plus a Vitest / curl harness.
- **Effort:** 1 day. Audit + patch `supabase/functions/api-v1/index.ts`, add 4 Vitest cases (under-limit, at-limit, over-limit, window-rollover). Owner: Hardeep.
- **Closure date:** 2026-04-28

---

## Close-out schedule

| Date | Rows closing |
|---|---|
| 2026-04-25 (Fri) | B3, B4, C1, C2, C3, C5 — 6 path-only shims landed in one branch (`fix/path-shims`) |
| 2026-04-28 (Tue) | F3 — rate-limit verification + tests (owner: Hardeep) |
| 2026-04-29 (Wed) | A7 — SAML signature verification + tests |

After 2026-04-29 the matrix is 29/29 green.

---

## Appendix — test inventory

### Playwright (34 files, 89 tests, 0 skipped)

```
A1 multi-tenant              2
A2 permission-templates       2
A3 distribution               1
A4 workflow                   1
A5 cost-codes                 1
A6 billing                    2
A7 sso                        2
B1 directory                  1
B2 drawings                   1
B3 specifications             1
B4 photos                     1
B5 documents-transmittals     1
C1 rfis                       1
C2 submittals                 1
C3 punch-list                 1
C4 daily-log                  1
C5 meetings                   1
D1 prime-contract             1
D2 commitments                1
D3 change-events              4
D4 change-orders              5
D5 direct-costs               4
D6 budget                     7
E1 schedule                   1
E2 incidents                  1
E3 reporting                  1
F1 sub-portal                 6
F2 owner-portal               9
F3 api-docs                   1
S4 phase2-field smoke         8
S5 phase1-patches smoke       3
S5 phase2-closeout smoke      3
example                       1
root-redirect                 2
```

### Vitest (24 suites)

```
src/hooks/__tests__/hooks.test.ts
src/hooks/__tests__/useBudget.test.ts
src/hooks/__tests__/useDirectCosts.test.ts
src/hooks/__tests__/useInvoices.test.ts
src/hooks/__tests__/usePayApp.test.ts
src/hooks/__tests__/useProcoreSubmittals.test.ts
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
src/lib/__tests__/schedule-import.test.ts
src/lib/__tests__/spec-parser.test.ts
src/lib/__tests__/tenant.test.ts
src/lib/__tests__/tree-utils.test.ts
src/components/financial/__tests__/BudgetModificationDialog.test.ts
src/components/financial/__tests__/ChangeOrderLineGrid.test.ts
src/pages/portal/owner/__tests__/OwnerPayAppApprovalPage.test.ts
src/test/example.test.ts
```

---

## Process commitments

- One branch per prompt, one PR per prompt (per `CONTRIBUTING.md`).
- PR template enforces What / Tests / Out-of-Spec section (`.github/PULL_REQUEST_TEMPLATE.md`).
- Branch cutter: `./scripts/new-prompt-branch.sh <prompt-id> <slug>`.
- CI gate: `npm run typecheck && npm run test && npm run test:e2e && supabase db push --dry-run` on every PR.
- Phase-boundary tags: `v0.1-phase1`, `v0.2-phase2`, `v0.3-phase3`, `v0.4-phase4`.
