# APAS CRM business-card intake

Status: implemented in code, feature-flagged, not deployed. Contract version: `2026-09-01`.

## What this feature is

“Scan a business card” is a guided intake into the existing **APAS CRM**. It is not a second CRM and it is not a Hostinger contact sync. A staff member photographs or selects a card, adds where they met the person, checks the extracted details and possible existing matches, previews one exact action, and explicitly approves it. Only then can Proj OS create, update, or link the APAS CRM contact.

Proj OS owns the authenticated user, workspace and project permissions, pilot enrollment, source images, approvals, CRM mutation, project-directory link, and audit. Hermes may help converse about the workflow later, but it receives no Supabase credential and is never allowed to assert user, workspace, project, profile, or session identity.

## Implemented surface

The accepted 15-item vertical slice is represented as follows:

1. `crm_card_intakes` and `crm_contact_actions` store scoped intake and approval state.
2. `crm-card-intake` is a private, 10 MB-limited Supabase Storage bucket.
3. RLS limits readable rows to the current workspace, user/project access, or workspace administration. Browsers cannot directly insert/update/delete workflow or audit rows.
4. `crm-card-intake` is the single authenticated Edge Function boundary.
5. The server-side OCR adapter supports Anthropic vision with an explicitly configured model. The API key never reaches the browser. A synthetic adapter requires two explicit local-only guards.
6. Email, E.164-like phone, website, and name match keys are normalized server-side.
7. Duplicate candidates are scored from exact normalized email/phone/website and name/company matches against `crm_contacts`.
8. Low-confidence, missing-name, and possible-duplicate results enter `review_required` with plain-language guidance.
9. Approval tokens are HMAC-signed, actor/scope/action-bound, expire in five minutes, and store only a SHA-256 digest in the database. The database caps all approvals at ten minutes.
10. One locked database transaction performs create, update, or link-existing and consumes the approval. A replay returns the prior result without repeating side effects.
11. Every successful action upserts the `project_directory_entries` link.
12. `crm_card_audit_events` records correlation, actor, project, approval/action, contact, decision, safe hashes, and outcome. It stores no images or bearer tokens and is append-only.
13. The responsive scan/review/approval interface appears in Contacts and the current-project Agent panel when enabled. It uses the production Proj OS application, not the replaceable Hermes runtime UI.
14. Synthetic field mapping, identity-override rejection, normalization, approval signature/tamper/expiry, UI explanation, Edge type-checking, and pgTAP schema controls have automated tests.
15. Rollout requires both the build flag and a per-user/project database entitlement. `set_crm_card_scan_entitlement` enforces one enabled `admin` cohort assignment and four enabled `pilot` cohort assignments per workspace. Project Admin contains the enrollment interface.

## Request flow and security boundary

1. The browser calls the Edge Function with its real Supabase access token and a project ID.
2. The function validates that token with Supabase Auth, derives the user’s workspace from `profiles`, rechecks `can_access_project`, checks `effective_project_permission('people', action)`, and checks the pilot entitlement.
3. The function creates a tenant/user/project-prefixed object path and returns short-lived signed upload tokens. The browser cannot choose the object path.
4. Processing downloads the private object server-side and compares it with the browser-declared SHA-256 digest before OCR.
5. OCR output and duplicate candidates are saved as review data. OCR never writes APAS CRM.
6. The reviewed action and source context are canonicalized and hashed. A signed five-minute approval binds that exact digest to the verified actor, workspace, project, and intake.
7. Execute verifies the signature and database digest, rechecks current access and permission, then calls the service-role-only `execute_crm_card_action` transaction.
8. On completion, source images are deleted. A cleanup warning is emitted if object deletion needs operational retry.

Caller-supplied identity headers are rejected. Identity-looking keys nested in source context or reviewed fields are rejected. Stable external IDs are the APAS platform workspace/contact/project-directory UUIDs returned by the completed result.

## Local synthetic demonstration

Use synthetic images containing no real personal information.

1. Start local Supabase and apply migrations:

   ```sh
   npx supabase start
   npx supabase db reset
   ```

2. Create `supabase/.env.functions` from the example and set:

   ```dotenv
   CRM_CARD_APPROVAL_SECRET=<random value of at least 32 characters>
   CRM_CARD_ALLOWED_ORIGINS=http://localhost:5173
   CRM_CARD_OCR_MODE=synthetic
   DEPLOYMENT_ENV=local
   CRM_CARD_ALLOW_SYNTHETIC=true
   ```

3. Run the function:

   ```sh
   npx supabase functions serve crm-card-intake --env-file supabase/.env.functions
   ```

4. Add `VITE_CRM_CARD_SCAN_ENABLED=true` to `.env.local`, start the Vite app, sign in as a workspace administrator, open Project Admin, and enroll the first member as **Admin pilot**. Then enroll no more than four members as **Team pilot**.

The synthetic adapter always returns a fictional `example.test` contact. It is rejected unless both the explicit allow flag and a local/development/test environment are present.

## Production configuration and release gate

Before enabling the public build flag:

- apply `20260903120000_crm_card_intake.sql` to the intended Supabase project;
- set a unique 32+ character `CRM_CARD_APPROVAL_SECRET` in Supabase Edge Function secrets;
- set the exact Proj OS origins in `CRM_CARD_ALLOWED_ORIGINS`;
- set `CRM_CARD_OCR_MODE=anthropic`, the existing server-side `ANTHROPIC_API_KEY`, and an organization-approved vision-capable model in `CRM_CARD_OCR_MODEL`;
- deploy only the `crm-card-intake` function, then run an authenticated staging smoke test with a synthetic card;
- confirm audit entries, duplicate review, project-directory linking, image deletion, and denial after approval expiry;
- build the Proj OS UI with `VITE_CRM_CARD_SCAN_ENABLED=true`;
- enroll one administrator, observe the first use, then enroll four pilot users through Project Admin;
- review Edge logs and `crm_card_audit_events` before broadening the cohort.

Do not set `CRM_CARD_ALLOW_SYNTHETIC` in production. Do not place OCR or service-role credentials in `VITE_*` variables. Do not grant Hermes a Supabase credential. Hostinger accounts remain infrastructure access only; team members sign into Proj OS with their own accounts.

## Tests and current operational status

Run:

```sh
npm run typecheck
npm test -- --run src/lib/crm/cardIntake.test.ts src/components/crm/BusinessCardScanDialog.test.tsx
npx -y deno check supabase/functions/crm-card-intake/index.ts
npx -y deno test --allow-env supabase/functions/_shared/crm-card-contract.test.ts supabase/functions/_shared/crm-card-security.test.ts supabase/functions/_shared/crm-card-ocr.test.ts
npm run build
```

After local Supabase is running, also run `npx supabase test db supabase/tests/crm_card_intake.test.sql`.

Operational in the repository: typed contracts, authorization path, private upload design, OCR adapter, normalization/duplicate logic, review states, signed approvals, atomic create/update/link, directory link, audit, UI, rollout controls, and code-level tests.

Configuration-dependent: a real OCR call, database migration execution, Edge deployment, production feature flag, real pilot enrollments, and an end-to-end test against the linked Supabase project. Those require approved secrets and deployment authority; this implementation does not invent credentials or deploy itself.
