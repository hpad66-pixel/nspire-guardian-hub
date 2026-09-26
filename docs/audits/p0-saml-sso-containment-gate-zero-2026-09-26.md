# P0 SAML/SSO Containment - Gate Zero Packet

Date: 2026-09-26

Status: Gate Zero evidence packet. This does not approve implementation and does
not change live behavior.

Source inputs:

- `docs/audits/projos-readiness-remediation-plan-2026-09-26.md`
- `docs/governance/projos-enterprise-implementation-control-plan-2026-09-26.md`
- `/Users/apas/Downloads/ProjOS End-to-End Readiness Audit.pdf`
- Current repository branch: `docs/enterprise-sdlc-governance`
- Live baseline branch: `main`

## Decision

I agree with the audit direction and the implementation-control plan for this
item.

The SAML/SSO finding is valid enough to treat as P0 because the current source
contains a SAML ACS function that:

- advertises a required XMLDSig verifier but has only a placeholder parser;
- can create or link users through the service role path;
- can issue a Supabase magic-link action URL after parsing an assertion;
- is configured as a public Supabase function because it is an IdP callback;
- stores tenant SSO and SCIM configuration behind broad tenant-scoped policies
  that require a tighter admin-only review before enterprise use.

This is not approval to deploy a fix. It is approval to move this item from
audit intake into Gate 1 design review.

## Current-Code Evidence

### SAML ACS Function

File: `supabase/functions/saml-acs/index.ts`

Evidence:

- Lines 13-18 state that full XMLDSig verification must be wired before
  enterprise enforcement.
- Lines 64-68 call `verifyAssertion()` and return failure only if that helper
  throws.
- Lines 93-109 issue a Supabase magic-link action URL and redirect to it after
  assertion parsing.
- Lines 120-150 show `verifyAssertion()` currently parses XML with regular
  expressions and includes a TODO for real XMLDSig verification.

Decision state: confirmed.

### Supabase Function Gateway

File: `supabase/config.toml`

Evidence:

- Lines 124-127 configure `saml-acs` with `verify_jwt = false`.
- This is expected for an IdP callback, but it makes inside-the-function
  validation mandatory.

Decision state: confirmed.

### Tenant SSO And SCIM Policies

File: `supabase/migrations/20260421170315_a7_sso_saml_scim.sql`

Evidence:

- Lines 7-28 define `tenant_sso_configs`, including SAML certificate,
  enforcement flag, and default permission template.
- Lines 32-34 create a `FOR ALL` authenticated policy for
  `tenant_sso_configs`.
- Lines 37-56 define SCIM bearer tokens and a `FOR ALL` authenticated policy.
- Lines 103-139 use additional `FOR ALL` authenticated policies on SCIM mirror
  tables and group membership tables.

Decision state: partially confirmed. The broad policy shape is present in
source. Runtime Supabase policy state still needs staging/live verification
before implementation or promotion.

## Enterprise Litmus Result

- Source currentness: pass for source review. The uploaded zip was previously
  verified to match `origin/main`; this packet still needs a fresh `origin/main`
  rebase/check before implementation.
- Tenant isolation: needs investigation. SSO configuration is tenant-owned, but
  policy operations are broad and must be split by operation and role.
- Identity/SSO/account control: fail for implementation readiness. XMLDSig,
  RelayState allow-listing, domain binding, replay/idempotency, and account
  linking behavior need explicit design before code changes.
- Supabase RLS/policies/functions/storage/secrets: needs investigation. Runtime
  function config and deployed policies must be checked in staging before
  promotion.
- Least privilege: fail for implementation readiness. Existing tenant users may
  have broader write paths than enterprise SSO should allow.
- Public-sector readiness: needs investigation. Audit events exist, but the
  login path must prove attribution, rejection, and no unsafe error disclosure.
- Observability: partial. `sso_login_events` exists, but test evidence must prove
  failed attempts are logged without issuing sessions.
- Rollback: pass at plan level. SAML can fail closed without affecting ordinary
  email/password login if scoped carefully.
- Testability: pass at plan level. Negative SAML, policy, and RelayState tests
  can be written before enabling SAML.

Overall result: Gate Zero pass, Gate 1 required, implementation not yet approved.

## Recommended Work Packet

Packet title: P0 SAML/SSO Containment

Branch:

- `codex/p0-saml-containment`

Source branch:

- Start from current `codex/workbench` after rebasing or fast-forwarding it from
  `main`.

Target branch:

- PR to `staging`, not `main`.

Recommended first implementation posture:

- Fail closed unless SAML is explicitly proven safe.
- Do not enable SAML enforcement for any production tenant until XMLDSig,
  tenant binding, RelayState validation, and admin-only SSO configuration are
  implemented and tested.

## In Scope

- SAML ACS assertion verification and failure behavior.
- RelayState allow-listing and redirect safety.
- Tenant-domain or tenant-slug binding.
- Replay/idempotency check using assertion IDs.
- Account linking and provisioning rules.
- SSO configuration write permissions.
- SCIM token write permissions where they directly affect SSO account control.
- SSO login audit evidence.

## Out Of Scope

- Full Auth0 migration or replacement.
- General login UX redesign.
- Broad RBAC rewrite beyond the SSO/SCIM surfaces touched by this packet.
- Production Supabase edits.
- Enabling SAML for a live tenant.

## Acceptance Criteria

Functional:

- Missing, malformed, unsigned, or unverifiable SAML assertions are rejected.
- Unknown tenants are rejected.
- RelayState outside approved app origins and paths is rejected.
- A valid SAML path does not create, link, or activate an account unless all
  validation gates pass.

Security:

- XMLDSig verification is real and tested against the tenant IdP certificate, or
  SAML ACS returns a closed response for all login attempts.
- Browser input cannot choose arbitrary redirect destinations.
- Account linking cannot take over an existing unrelated email account.
- SSO configuration writes require an approved admin/server path.
- SCIM token creation cannot be performed directly from normal browser access.

Tenant isolation:

- Tenant A cannot read or modify Tenant B SSO configuration.
- Tenant A cannot infer Tenant B SSO status through errors or redirects.
- Tenant A cannot mint or revoke Tenant B SCIM tokens.

Observability:

- Failed SAML attempts are logged with tenant, provider, success flag, reason,
  timestamp, user agent, and safe request context.
- Logs do not expose raw assertions, full tokens, certificates, or secrets.

Documentation:

- PR explains the before/after behavior in plain English.
- Notion evidence log records packet status, scores, tests, reviewer decision,
  and rollback plan before promotion.

## Required Tests Before Staging

- Edge-function test: missing `SAMLResponse` rejected.
- Edge-function test: unsigned assertion rejected.
- Edge-function test: unknown tenant rejected.
- Edge-function test: bad RelayState rejected.
- Edge-function test: no magic-link action URL is issued on failed validation.
- SQL/RLS test: non-admin cannot insert/update/delete `tenant_sso_configs`.
- SQL/RLS test: non-admin cannot insert/update/delete `tenant_scim_tokens`.
- SQL/RLS test: tenant A cannot read tenant B SSO/SCIM rows.
- Audit test: failed attempt creates safe `sso_login_events` row when tenant is
  known.
- Typecheck or equivalent focused build check.

## Supabase Verification Required

Before promotion beyond staging, verify:

- Deployed `saml-acs` function config.
- Deployed policies for `tenant_sso_configs`.
- Deployed policies for `tenant_scim_tokens`.
- Deployed policies for `sso_login_events`.
- Staging secrets or certificate handling.
- Staging callback URL and allowed redirect behavior.

Any live Supabase check must be read-only unless Hardeep explicitly approves a
production change.

## Initial Scores

- Security score: 72 current, target 95 before staging.
- Tenant isolation score: 80 current, target 100 before staging.
- Test coverage score: 35 current, target 90 before staging.
- Operational readiness score: 60 current, target 90 before release candidate.
- Documentation score: 90 current, target 95 after PR packet and Notion log.
- Overall readiness score: 67 current.

Promotion recommendation: not ready for implementation merge yet. Ready for Gate
1 design review.

## Rollback Plan

Preferred rollback posture:

- Keep or return SAML ACS to fail-closed behavior.
- Leave normal email/password login untouched.
- If a migration is required, use a forward migration that restores restrictive
  policies rather than editing old migrations.
- If a deployed function behaves incorrectly, roll back the function deployment
  or disable SAML enforcement before broader release.

## Approval Checkpoint

Required before implementation:

- Hardeep approves this P0 packet priority.
- Reviewer approves the SAML fail-closed/design approach.
- DevOps confirms staging Supabase verification path.
- Tester confirms the required negative tests and RLS tests are feasible.

Required before production:

- Staging tests pass.
- Runtime Supabase verification is complete.
- Notion evidence log is updated.
- Release owner recommends promotion.
- Hardeep explicitly approves production promotion.
