# Project Conditions Register Native Plan

## Purpose

Bring the APAS Project Conditions Register into Proj OS as a native Site Accountability workflow rather than a separate spreadsheet or AppSheet app.

The Glorieta Gardens use case is the first implementation target:

- Buildings 3, 4, 5, and 6.
- Site/common areas.
- Structural and non-structural project conditions.
- APAS internal review and AI completeness review.
- Engineer of Record classification.
- Owner-visible summaries and comments.
- Branded reporting and Resend delivery.
- Proj OS-owned authorization, approvals, and audit.

## Native landing zone

Use the existing Proj OS Site Accountability / Field Accountability module:

- Staff route: `/projects/:projectId/accountability`
- Owner route: `/owner-portal/projects/:projectId/accountability`
- Existing page: `src/pages/projects/FieldAccountabilityPage.tsx`
- Existing owner page: `src/pages/portal/owner/OwnerAccountabilityPage.tsx`
- Existing hook: `src/hooks/useFieldAccountability.ts`
- Existing evidence library: private `project-photos` storage through field accountability photo links.

Do not create a parallel app surface unless a future product decision requires it. The Project Conditions Register should become a named workflow/view inside Site Accountability.

## Boundary

Authentication can come from Google, Microsoft/Entra ID, Auth0, or magic-link routes.

Authorization belongs to Proj OS:

- Project membership.
- Owner/staff/engineer/contractor role.
- Client-visible slices.
- Internal comments and AI notes.
- Append-only audit events.

External identity providers prove identity only. They do not decide project access or record visibility.

## Data mapping

The Project Conditions Register maps to Field Accountability as follows:

| Register concept | Proj OS native target |
|---|---|
| Field walk | `field_visits` |
| Condition record | `field_accountability_items` |
| Photos | `field_accountability_photos` + private `photos` rows |
| Notations | item comments or future typed notation table |
| Internal comments | `field_accountability_comments.visibility = internal` |
| Owner comments | `field_accountability_comments.visibility = owner` or client-visible equivalent |
| AI review notes | photo/item advisory metadata, internal by default |
| Published client summary | owner-visible item summary / report packet field |
| Report event | existing/future report/email event table |
| API ingest | `api-v1` or dedicated edge route that creates native rows and audit events |

## First code seam

The pure TypeScript contract lives at:

`src/lib/accountability/projectConditionsRegister.ts`

It provides:

- Canonical Project Conditions Register types.
- Client-visible filtering.
- Summary rollups.
- Proj OS ingest payload builder.

Tests:

`src/lib/accountability/__tests__/projectConditionsRegister.test.ts`

This lets the app, edge functions, and report generation share the same privacy rules before database migrations are introduced.

## Build phases

### Phase 1 - Contract and documentation

Status: started.

- Add typed project-condition contract.
- Add client-visible filtering tests.
- Add Proj OS ingest payload tests.
- Keep Glorieta prototype repo as source evidence and visual inspiration.

### Phase 2 - Native UI adaptation

- Rename staff-facing workflow label from generic Field Accountability to Project Conditions Register where project/program metadata calls for it.
- Add a Conditions Register tab to `FieldAccountabilityPage`.
- Add building/common-area filters.
- Add structural/non-structural/needs-engineer classification fields.
- Keep Owner Punch Capture and Photo Intelligence available as supporting workflows.

### Phase 3 - Database and RLS

- Confirm whether existing `field_accountability_items` columns are sufficient for classification, permit status, owner signoff, and published summary.
- Add additive migration only for missing fields.
- Preserve tenant isolation and owner-visible filters in RLS.
- Store AI review notes internally by default.
- Store owner comments separately from APAS internal comments.

### Phase 4 - Reporting and email

- Generate branded APAS Consulting LLC / APAS.ai client-safe HTML/PDF packets from client-visible records only.
- Use server-side Resend delivery through an edge function.
- Never expose `RESEND_API_KEY` in browser code.
- Write report generation and email delivery events to the project audit history.

### Phase 5 - API ingest

- Add an authenticated Proj OS endpoint for external capture sources.
- Accept approved register records only through project-scoped authorization.
- Derive tenant and actor context from authenticated token/session, not caller-supplied identity headers.
- Store source system and source record IDs for traceability.
- Return accepted/rejected row-level results.

### Phase 6 - Glorieta rollout

- Create or identify the Glorieta project record in Proj OS.
- Enable Site Accountability / Project Conditions Register for that project.
- Import initial Glorieta templates/categories.
- Smoke-test staff and owner portal routes.
- Generate one branded client-safe report packet.

## Non-negotiables

- A photo upload does not mean work is complete.
- AI suggestions do not publish to the client.
- Engineer of Record governs unclear structural classification.
- Owner sees only published summaries, client-visible notes, and owner-visible comments.
- Proj OS owns runtime authorization, access-decision audit, and final project history.

