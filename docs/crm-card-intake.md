# APAS CRM business-card intake from Proj OS

## Product outcome

An employee can take a card photo from a phone or choose a file, attach it to a permitted project, review APAS CRM's OCR and possible matches, approve the exact outgoing proposal, and watch an APAS CRM curator resolve it to one canonical contact. Proj OS then links that canonical ID to the project directory.

Proj OS does not operate a second master CRM in this workflow. Existing `crm_contacts` records remain legacy Proj OS contacts; the card-intake production path never inserts one.

## User flow

1. Open **Contacts → Scan into APAS CRM**, or **Project → Directory → Scan card**.
2. Select a permitted project when starting from Contacts.
3. Take or upload the front and optional back. JPEG, PNG, WebP, and PDF are accepted up to 12 MB per side.
4. Add meeting context. Project-private notes stay local by default.
5. Proj OS derives and signs the user, workspace, project, intake, correlation, idempotency, and timestamp envelope.
6. The browser uploads directly through short-lived, side-bound APAS CRM grants. It never sees the server credential.
7. APAS CRM performs card OCR, uncertainty scoring, duplicate matching, and returns the review payload.
8. Correct every field and choose an explicit duplicate decision.
9. Choose controlled APAS CRM category IDs from the current catalog. Project role stays in Proj OS.
10. Optionally promote a copy of a project note. The note appears in the exact preview when selected.
11. Review and consume the one-time approval.
12. APAS CRM places the proposal in its curator queue.
13. A signed resolution event links the canonical APAS contact to the project. Until that event is processed, the UI says **Waiting for CRM administrator review**, not success.

## Plain-language states

The interface supports:

- Uploading securely
- Reading the card
- Review uncertain fields
- Possible matches found
- Waiting for your approval
- Approved for submission
- Sent to APAS CRM
- Waiting for CRM administrator review
- Linked to master contact
- APAS CRM temporarily unavailable
- Rejected
- Returned for correction

`src/lib/crm-integration/contract.ts` is the browser display contract. The server pins and validates `crm-integration.v1` independently before persisting any remote response.

## Data ownership

Proj OS stores only what it needs to enforce project controls:

- authenticated workspace, project, and submitter IDs;
- signed source envelope, correlation, and idempotency keys;
- external APAS intake ID and canonical contact ID;
- current remote state and safe failure reason;
- exact approved proposal and its hash;
- project-private context;
- retry counter and next retry;
- last APAS event ID and project-directory link;
- append-only correlated audit history.

Card image bytes, master contact methods, company-wide taxonomy, OCR provenance, duplicate scores, curator decisions, and merge history remain APAS CRM-owned.

## API contract expected from APAS CRM

```text
POST /v1/integrations/proj-os/upload-grants
POST /v1/integrations/proj-os/contact-intakes
GET  /v1/integrations/proj-os/contact-intakes/:externalId
POST /v1/integrations/proj-os/contact-intakes/:externalId/proposals
GET  /v1/integrations/proj-os/categories
GET  /v1/integrations/proj-os/contacts/:apasContactId
```

Every response must contain `contractVersion: "crm-integration.v1"`. The adapter rejects another major version, malformed identifiers, unsafe upload headers, oversized responses, invalid dates, and invalid review shapes. Requests have a ten-second timeout, one-megabyte JSON limit, correlation ID, stable idempotency key, and short-lived audience-bound credential.

## Failure behavior

- APAS CRM downtime produces visible `retry_queued` state.
- A retry uses the original stored idempotency key and, after approval, the exact approved payload.
- Production cannot select the synthetic/local adapter.
- There is no silent fallback to `crm_contacts`.
- Logs contain only correlation/receipt IDs and safe error codes—not secrets, image bytes, unrestricted card text, or private notes.
- Cross-project IDs are resolved as not found after current access is checked.
- Invalid and stale events fail before database mutation.
- Replayed approvals and events have no duplicate side effects.

## Current cross-repository readiness

The Proj OS side of the contract is implemented in this repository. At the time of implementation, the current APAS CRM `main` branch contains the secure local card-intake foundation but does not yet expose the six `/v1/integrations/proj-os/*` routes or the shared `crm-integration.v1` contract package. The current Hermes `main` branch contains `docs/architecture.md` but not the referenced `docs/PRD.md`. Those external gaps must be completed and their contract suite passed before production secrets are configured or the integration is enabled outside the APAS workspace.

## Verification targets

- Frontend contract tests cover explicit OCR values, malformed duplicates, state-language separation, and file limits.
- pgTAP covers schema presence, one-time approval consumption, approval replay, canonical linking, event replay, merge repair/deduplication, cross-target rejection, and immutable audit history.
- Edge checks must type-check both functions without printing environment values.
- Full integration acceptance requires the same fictional Maya Patel fixture in APAS CRM and Hermes and is blocked until those repositories publish the versioned endpoints/tool contract.
