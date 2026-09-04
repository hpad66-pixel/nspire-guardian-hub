# Proj OS Agent Gateway foundation

This foundation implements the first read-only vertical slice for the Proj OS Agent. Proj OS remains the authority for the signed-in user, workspace, project access, module permission, pilot entitlement, profile metadata, project records, and audit. Hermes receives a short-lived signed session and calls the gateway over HTTPS; it never receives a Supabase credential or selects its own identity scope.

## Operational path

1. The signed-in Proj OS browser calls `agent-session` with a project ID, contract version, correlation ID, and idempotency key.
2. `agent-session` derives the user from the Supabase bearer token. It rejects identity headers and unknown body fields.
3. Proj OS checks the active workspace profile, `can_access_project`, the effective `workflows:view` permission, and an explicit enabled `agent_entitlements` row.
4. Proj OS selects or creates the server-owned project profile and issues an ES256 token valid for no more than ten minutes.
5. Hermes verifies the public-key token and may request `project.tasks.list`. Tool arguments can include only status and limit; project, user, workspace, profile, and session identifiers are forbidden recursively.
6. `agent-tools` verifies the token and rechecks the session, active profile, user, entitlement, project access, and module permission before reading minimal action-item fields.
7. Proj OS returns source links and records an arguments digest, result status, record IDs, timing, and correlation ID. Raw tool arguments and bearer tokens are not stored.

The shared-secret `/mcp` endpoint is now deny-by-default behind `PROJ_OS_LEGACY_MCP_ENABLED=true`. It remains only for a controlled migration and must not be used as the Hermes identity boundary.

## Pilot provisioning

The migration intentionally grants nobody access. A workspace administrator must enable each named user/project pair through a reviewed administrative path. Until that UI exists, operators may provision a pilot row through an authenticated, audited administrative procedure using these fields:

- authoritative workspace, user, and project UUIDs;
- `runtime_kind = 'hermes'`;
- `status = 'enabled'`;
- `allowed_scopes = ARRAY['project:read']`;
- `allowed_tools = ARRAY['project.tasks.list']`.

Never accept those identifiers from Hermes. The database trigger independently verifies that the user and project belong to the supplied workspace.

## Required configuration

Generate a P-256 key pair outside the repository. Keep `AGENT_SESSION_PRIVATE_JWK` only in the Proj OS Edge Function secret store. Configure the runtime and `agent-tools` with a bounded `AGENT_SESSION_PUBLIC_JWKS` and the active key ID. Do not reuse Supabase JWT keys, API-client secrets, or the legacy MCP shared secret.

See `supabase/.env.functions.example` for the complete placeholder names. `agent-session` must have an explicit `AGENT_GATEWAY_ALLOWED_ORIGINS`; `agent-tools` is server-to-server and rejects browser `Origin` headers.

## Local connected demonstration

`scripts/agent-local-gateway.mjs` is a development-only, loopback-bound substitute for the two deployed Edge Functions. It uses short-lived signed synthetic sessions and non-authoritative task records so the native panel can exercise the complete runtime boundary before staging exists. It is deliberately not imported by production application code; `VITE_AGENT_LOCAL_SESSION_URL` is honored only when Vite is running in development mode.

Run `npm run test:agent-local` for its identity-override, server-to-server, idempotency, and sanitized-audit checks. See the Hermes repository's `docs/local-development.md` for the three-process connected demo. This harness must never be deployed or supplied with production data or credentials.

## Pilot enrollment and staging keys

Generate staging session keys with `npm run agent:keys -- --output-dir <absolute-secure-directory> --key-id <reviewed-key-id>`. The command refuses to write inside this repository, does not overwrite keys, writes the private JWK with mode `0600`, emits a public JWKS, and prints only the public fingerprint and file locations. Run `npm run agent:preflight-edge` with proposed staging values before setting any Edge Function secrets.

For zero-downtime rotation, deploy a JWKS containing the current and next public keys to verification consumers before switching the active key ID/private signer. Keep the previous public key only through the ten-minute session lifetime plus clock-skew allowance, then remove it. Suspected compromise uses global disable and session revocation instead of a normal overlap.

Workspace administrators enroll or disable a single user/project through `set_agent_pilot_entitlement(user_id, project_id, enabled)`. When the Agent foundation flag is enabled, the Project Admin page exposes this operation only for existing project team members. The function fixes the entitlement to the first read-only scope/tool, derives tenant context from the authenticated administrator, refuses cross-tenant enrollment, and revokes active sessions when disabled. No runtime or service operator should insert entitlement rows directly.

## Feature-flagged application panel

The native panel is mounted on authenticated project routes only when both the workspace AI module and `VITE_AGENT_FOUNDATION_ENABLED=true` are present. `VITE_AGENT_RUNTIME_URL` must point to the reviewed TLS runtime origin. When the new flag is off, the existing financial assistant remains unchanged.

The panel requests its session from Proj OS, sends only the message contract to the runtime, validates every NDJSON event, displays plain-language progress and source links, supports cancellation, and labels memory as off for the read-only pilot. It does not render business-card scanning or write controls.

## Still mocked or deliberately absent

- No production Hermes image, model provider, prompt, or credential is selected.
- The Agent panel is disabled by default and has not been enabled in a deployed environment.
- No write tool or approval consumption path exists.
- No card image upload, OCR provider, or APAS master-CRM mutation is implemented here.
- No remotely managed JWKS endpoint exists yet; the bounded environment-supplied JWKS is implemented and deliberately limited to four public keys.

The next application change is staging configuration for named pilot users. Writes and business-card scanning must remain unavailable until their approval and master-CRM integrations are separately implemented.
