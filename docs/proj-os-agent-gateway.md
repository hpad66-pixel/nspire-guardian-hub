# Proj OS Agent and Integration Gateway

## Authority boundary

Proj OS authenticates the employee, resolves the current workspace, verifies project access, creates exact one-time approvals, and owns project-private state. External runtimes such as Hermes use the existing allowlisted `api-v1` capability layer and never receive database credentials. APAS CRM is a separate product and is the sole owner of master people, companies, contact methods, taxonomy, duplicate decisions, merge history, and card OCR provenance.

No integration in this repository may connect directly to another product database or use another product's Supabase service-role key. Cross-product work uses a versioned HTTP contract.

```text
Authenticated Proj OS user
  -> current Supabase user session
  -> crm-integration-gateway
  -> can_access_project(user, project)
  -> short-lived audience-bound APAS CRM credential
  -> crm-integration.v1 HTTP API
  -> signed APAS CRM event
  -> crm-integration-events
  -> idempotent project-directory link
```

## Existing Hermes boundary

`api-v1` authenticates hashed OAuth tokens, derives its tenant from the token record, applies allowlisted scopes, verifies project ownership, rate-limits calls, and writes `agent_api_audit_log`. Hermes can report CRM intake status only through a future allowlisted read tool. It must not call APAS CRM, invoke `crm-integration-events`, consume approvals, or mutate either database directly.

## Signed Agent runtime path

The interactive Proj OS Agent uses a narrower session and tool gateway in front
of a replaceable Hermes runtime:

1. The signed-in browser calls `agent-session` with a project request,
   correlation ID, and idempotency key. The function derives the employee from
   the Supabase token and rejects identity headers and unknown body fields.
2. Proj OS rechecks the active workspace profile, project access,
   `workflows:view` permission, and an explicit user/project pilot entitlement.
3. Proj OS issues an ES256 session valid for at most ten minutes. The claims fix
   the user, workspace, project, profile, scopes, tools, issuer, and runtime
   audience; the browser cannot replace any of them.
4. Hermes verifies the public key and sends only bounded tool requests to
   `agent-tools`. It never receives a database credential or the signing key.
5. `agent-tools` verifies the signed claims and independently rechecks the live
   session, employee, entitlement, project access, and permission before each
   read. Identity-like values are forbidden recursively in tool arguments.
6. Proj OS returns source links and writes the sanitized, correlated tool audit.

The first production slice exposes only `project.tasks.list`. Business-card
entry in the panel opens the existing Proj OS `CrmCardIntakeDialog`, which uses
the approval-bound APAS CRM gateway described below. Hermes does not call APAS
CRM and no master contact data is copied into this runtime repository.

Workspace administrators enroll or disable one existing project team member
through `set_agent_pilot_entitlement(user_id, project_id, enabled)`. Disabling
the row revokes active sessions. The schema grants nobody access by default.

Generate the P-256 key pair outside every repository with
`npm run agent:keys -- --output-dir <secure-directory> --key-id <key-id>`, test
the proposed configuration with `npm run agent:preflight-edge`, and keep
`AGENT_SESSION_PRIVATE_JWK` only in Supabase Edge secrets. Hermes and
`agent-tools` receive the bounded public JWKS. For rotation, distribute the new
public key before changing the signer and retain the old public key for the
ten-minute session lifetime plus clock skew.

The native panel is enabled only when the workspace AI module and
`VITE_AGENT_FOUNDATION_ENABLED=true` are both present. Its runtime origin comes
from `VITE_AGENT_RUNTIME_URL`. The panel shows plain-language progress, source
links, cancellation, current project/profile, memory-off state, errors,
approval previews, and the current APAS CRM scan entry. Production UI remains
owned by this repository; the Hermes repository's panel is only a contract
reference.

## CRM orchestration boundary

`crm-integration-gateway` accepts the current Proj OS user JWT and validates it with Supabase Auth inside the function. It treats a caller-supplied project ID only as a requested target; current access is recomputed through `can_access_project` and the project workspace must match the active profile. The server derives every identity and source-attribution field.

Supported browser operations are deliberately narrow:

| Operation | Effect |
|---|---|
| `start_intake` | Creates Proj OS metadata, signs the source envelope, and obtains short-lived APAS CRM upload grants. |
| `complete_upload` | Submits APAS upload identifiers and begins APAS-owned OCR/duplicate review. |
| `categories` | Reads the controlled APAS CRM category catalog. |
| `prepare_approval` | Validates the edited proposal and creates a ten-minute, action-bound, one-time approval. |
| `execute_approval` | Atomically consumes the approval, then sends the exact stored proposal. |
| `refresh_status` | Reads current remote intake status without creating a contact. |
| `retry` | Replays only stored upload metadata or an already-approved exact proposal with the original idempotency key. |

The APAS CRM service credential is generated server-side as a 60-second HMAC-signed assertion with issuer, audience, client, workspace, contract version, and unique token ID claims. No service credential, signing secret, event secret, or Supabase service-role key is returned to the browser or Hermes.

## One-time approvals

The approval token has 256 bits of random bearer material. Only its SHA-256 hash is stored. It is bound to:

- the authenticated Proj OS user;
- one workspace and project;
- one intake;
- the `submit_contact_proposal` action;
- a canonical SHA-256 hash of the exact proposal;
- a ten-minute expiration.

`consume_crm_integration_approval` locks and consumes the approval once. A changed proposal, expired token, different actor, changed intake state, or replay returns no authorized payload. If APAS CRM is unavailable after consumption, Proj OS stores the approved proposal and original idempotency key for a safe retry. It never creates a local master contact as fallback.

## Event receiver

`crm-integration-events` verifies the HMAC signature over `timestamp.raw_body`, a five-minute clock window, pinned issuer, pinned audience, and the `crm-integration.v1` schema. The database stores the event ID before mutation so replays have no effect. The event must match both the stored external intake ID and correlation ID.

Only normalized, allowlisted event values reach `apply_crm_integration_event`. A resolved contact creates or updates one external `project_directory_entries` record. A merge replaces the retired APAS CRM ID across that tenant and removes same-project duplicates idempotently. Every accepted mutation appends a correlated Proj OS audit record.

## Production configuration

These are deployment secret references, never browser variables and never Git values:

| Variable | Purpose |
|---|---|
| `APAS_CRM_MODE=remote` | Forces the real adapter. Any other mode fails closed in production. |
| `APAS_CRM_BASE_URL` | HTTPS APAS CRM integration origin. |
| `APAS_CRM_CLIENT_ID` | Registered Proj OS integration client. |
| `APAS_CRM_CLIENT_SECRET` | Minimum 256-bit client assertion signing secret. |
| `APAS_CRM_AUDIENCE` | Credential audience, normally `apas-crm`. |
| `APAS_CRM_ISSUER` | Credential issuer, normally `proj-os`. |
| `APAS_CRM_SOURCE_SIGNING_SECRET` | Signs the source-attribution envelope. |
| `APAS_CRM_WEBHOOK_SECRET` | Verifies APAS CRM event bodies. |
| `APAS_CRM_EVENT_ISSUER` | Expected event issuer, normally `apas-crm`. |
| `APAS_CRM_EVENT_AUDIENCE` | Expected event audience, normally `proj-os`. |

The APAS CRM repository must implement and contract-test the six `crm-integration.v1` routes before this adapter can perform live cross-product calls. Until then the Proj OS UI reports configuration/unavailability truthfully and creates no divergent contact.
