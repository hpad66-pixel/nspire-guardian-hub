# Copy-ready implementation prompt: Proj OS to APAS CRM integration

Use this entire document as the implementation prompt for the `nspire-guardian-hub` repository.

## Objective

Convert the existing Proj OS card-scan foundation into a production-safe orchestration layer for the APAS CRM master-contact system at `apascrm.com`, using the versioned `crm-integration.v1` contract.

Proj OS must authenticate the employee, enforce project permissions, gather project context, issue and consume exact one-time approvals, submit an intake to APAS CRM, and link the resulting canonical APAS CRM contact to the current project. Proj OS must not operate a second master CRM.

## Read before changing code

Read these files completely:

- `docs/proj-os-agent-gateway.md`.
- `docs/crm-card-intake.md`.
- The Hermes repository `docs/PRD.md`, especially sections 9.5 and 10.7.
- The Hermes repository `docs/architecture.md`.
- The APAS CRM repository `docs/ARCHITECTURE.md`.
- The APAS CRM repository `docs/API.md`.
- The APAS CRM repository `docs/IMPLEMENTATION_PLAN_SECURE_CARD_INTAKE.md`.
- The APAS CRM repository `docs/implementation-prompt-proj-os-integration.md`.

Inspect the dirty worktree before editing. Preserve unrelated work. Use forward migrations rather than rewriting an applied migration. Do not deploy, create production secrets, or push to GitHub.

## Fixed ownership boundary

- APAS CRM owns master people, companies, contact methods, categories, card OCR, duplicate scoring, curator decisions, merges, source provenance, and master-CRM audit.
- Proj OS owns its login/session, tenant/workspace/project permission checks, project-private context, write approval, project-directory link, pending/retry state, and Proj OS audit.
- Hermes calls Proj OS allowlisted tools; it never calls APAS CRM directly.
- No direct database connection, Supabase service-role key, or cross-product table write is permitted.

## Refactor the current foundation

1. Keep the existing responsive scan/review interface, validation, feature flag, user/project entitlement, approval preview, correlation, and local test fixtures.
2. Replace the production execution path that writes a canonical local `crm_contacts` record. The production path must call the APAS CRM integration API after Proj OS consumes a valid action-bound approval.
3. Retain only Proj OS-owned intake metadata. Add a forward migration if needed for:
   - APAS CRM external intake ID.
   - canonical APAS CRM contact ID.
   - source contract version.
   - current remote status.
   - last processed APAS CRM event ID.
   - retry count and safe failure reason.
   - project-directory link.
4. Mark the existing local master-contact executor as a synthetic/local adapter. It must fail closed in production mode.
5. Never silently fall back to a local master contact when APAS CRM is unavailable.

## Proj OS integration adapter

Create a typed server-side adapter for the APAS CRM `crm-integration.v1` contract:

```text
POST /v1/integrations/proj-os/upload-grants
POST /v1/integrations/proj-os/contact-intakes
GET  /v1/integrations/proj-os/contact-intakes/:externalId
POST /v1/integrations/proj-os/contact-intakes/:externalId/proposals
GET  /v1/integrations/proj-os/categories
GET  /v1/integrations/proj-os/contacts/:apasContactId
```

Requirements:

- Use server-to-server authentication with short-lived, audience-bound credentials and a deployment secret reference.
- Do not expose the credential to the browser or Hermes.
- Treat every APAS CRM response as untrusted input and validate it against the pinned shared contract.
- Apply request timeouts, payload limits, retry classification, correlation IDs, and idempotency keys.
- Pin the accepted contract major version and reject incompatible responses.

## Source attribution envelope

Proj OS must derive and sign, not accept from form fields:

- Source system: `proj_os`.
- Proj OS workspace/tenant ID.
- Project ID.
- Stable Proj OS user ID.
- Display-name snapshot for review only.
- Proj OS intake/action ID.
- Correlation ID.
- Idempotency key.
- Submission timestamp.

User-entered source context may include where/when met, event/location, introducer, notes, website/source, requested category IDs, owner, project role, and follow-up. Project-private notes must not be promoted into APAS CRM unless separately shown in the exact approval preview.

## Two-stage review

1. **Proj OS submitter review:** the employee corrects OCR fields, sees duplicates, and approves the exact proposal leaving Proj OS.
2. **APAS CRM curator review:** an authorized CRM administrator creates, updates, links, keeps separate, rejects, or merges the master record.

The Proj OS UI must distinguish `Waiting for your approval` from `Waiting for CRM review`. Do not display success until APAS CRM returns a resolved canonical contact ID.

## APAS CRM event receiver

Implement a server-side receiver for:

```text
contact_intake.review_required
contact_intake.resolved
contact.created
contact.updated
contact.canonicalized
contact.merged
```

The receiver must:

- Verify signature, issuer, audience, timestamp, and allowed clock skew.
- Enforce event ID replay protection.
- Validate the versioned schema.
- Match the stored external intake/correlation identifiers.
- Update only the matching tenant/project record.
- Link the canonical APAS CRM ID to `project_directory_entries` idempotently.
- On `contact.merged`, replace a retired APAS CRM ID with the surviving ID without duplicating project entries.
- Append a correlated Proj OS audit event.

## Categories

- Load the controlled APAS CRM category catalog through the integration API.
- Submit APAS CRM category IDs and catalog version, not arbitrary master taxonomy strings.
- Keep project role and project-private labels in Proj OS.
- Permit the APAS CRM curator to correct proposed company-wide categories.

## UI states

Support accessible, plain-language states for:

- Uploading securely.
- Reading the card.
- Review uncertain fields.
- Possible matches found.
- Waiting for Proj OS approval.
- Sent to APAS CRM.
- Waiting for CRM administrator review.
- Linked to master contact.
- APAS CRM temporarily unavailable; retry queued.
- Rejected or returned for correction.

Provide authorized deep links to the APAS CRM contact and local project-directory entry after resolution.

## Security and data-minimization tests

Prove that:

1. Caller-supplied identity/project fields cannot override the authenticated Proj OS scope.
2. The browser and Hermes never receive APAS CRM service credentials.
3. Production mode cannot use the local master-contact mock.
4. An invalid/replayed approval cannot submit or resubmit a changed proposal.
5. An invalid/replayed APAS CRM event cannot change a project link.
6. Cross-tenant/project intake IDs do not leak.
7. APAS CRM downtime creates a visible retry state, not a divergent local contact.
8. Project-private notes remain local unless explicitly approved for promotion.
9. A merge event repairs links idempotently.
10. Logs and errors do not contain image bytes, secrets, or unrestricted card text.

## Shared end-to-end acceptance scenario

Use the same fictional fixture in all three repositories. The scenario passes only when:

1. An authorized Proj OS user scans a card from a permitted project.
2. APAS CRM receives exactly one attributed intake.
3. OCR uncertainty and duplicate candidates return to Proj OS.
4. The user corrects and approves the exact proposal.
5. APAS CRM places it in the curator queue.
6. The CRM administrator resolves it to exactly one canonical contact.
7. Proj OS receives a signed event and links that contact to the project.
8. Replayed requests, approvals, and events cause no duplicate side effects.
9. Both audit trails share correlation and external identifiers.
10. Hermes can report status but cannot mutate either database directly.

## Completion report

Run database reset/migrations, RLS tests, Edge Function checks/tests, frontend tests, TypeScript checks, lint for all changed files, the feature-enabled build, and the cross-repository contract suite. Clearly separate operational behavior, mocks, required production configuration, and unrelated existing failures.

