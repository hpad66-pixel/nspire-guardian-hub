# Proj OS Enterprise Implementation Control Plan

Date: 2026-09-26

Status: governance control plan. This document controls how audit findings become
implementation work. It does not approve any fix by itself.

Source evidence:

- `docs/audits/projos-readiness-remediation-plan-2026-09-26.md`
- `/Users/apas/Downloads/ProjOS End-to-End Readiness Audit.pdf`
- `/Users/apas/Downloads/nspire-guardian-hub-main.zip`
- Current GitHub repository: `hpad66-pixel/nspire-guardian-hub`

## Purpose

Proj OS is expected to become an enterprise-grade, government-ready,
multi-tenant platform. It may serve governments, private-sector customers,
public-sector customers, APAS operations, consultants, contractors, owners, and
client portals from one controlled software platform.

That standard requires a disciplined translation layer between an audit finding
and an implementation PR. Audit notes are evidence inputs. They are not
authority. Every claim must be re-verified against current source, scored, scoped
into a small work packet, tested, logged, reviewed, and promoted through the
branch gates.

## Non-Negotiable Principles

1. `main` is live production. It is not a workbench.
2. No audit item is implemented blindly.
3. No deleted branch is treated as implementation authority.
4. Every change must begin from a current controlled branch.
5. Tenant isolation is the first safety principle.
6. Supabase policies, functions, storage, secrets, and service-role boundaries
   must be reviewed as part of every backend change.
7. SSO and identity changes require explicit security review.
8. Public routes must never leak tenant data, internal stack traces, raw database
   detail, or APAS-only information to the wrong audience.
9. Client-visible financial behavior must be server-enforced, auditable, and
   rollback-aware.
10. Every promotion gate must produce evidence, a score, and a Notion log entry.
11. A passing build is not a release approval.
12. A successful local test is not a production verification.
13. Human approval remains required before production promotion.

## Controlled Branch Lanes

Standing lanes:

- `codex/workbench` - Hardeep + Codex first work lane.
- `devops/workbench` - DevOps first work lane.
- `staging` - integration and shared test lane.
- `release/candidate` - frozen release candidate lane.
- `main` - live production branch.

Temporary work branches:

- `codex/<scope>` - scoped Codex work packet.
- `feature/<scope>` - scoped developer work packet.
- `fix/<scope>` - scoped bug fix.
- `devops/<scope>` - scoped DevOps/infrastructure work packet.
- `docs/<scope>` - scoped documentation/governance work packet.
- `hotfix/<scope>` - emergency production fix with release-owner approval.

Default movement:

```text
codex/*, feature/*, fix/*, devops/*
  -> staging
  -> release/candidate
  -> main
```

## Enterprise Litmus Test

Every audit item must answer every question below before implementation starts.
If any answer is unknown, the packet status is `needs investigation`.

### 1. Source Currentness

- Is the claim verified against current `origin/main` or the approved source
  branch?
- Is the exact file/function/table/route still present?
- Is the finding already fixed, partially fixed, or stale?
- Is live Supabase verification needed to confirm runtime state?

Pass condition: current-code evidence exists and is cited in the packet.

### 2. Tenant Isolation

- Could this change let tenant A read, write, infer, or affect tenant B data?
- Are all tenant-owned records scoped by `workspace_id`, `tenant_id`, project, or
  an equivalent enforced boundary?
- Are RLS policies present and restrictive for every affected table?
- Are cross-tenant admin paths limited to explicit super-admin logic?
- Does the test prove a tenant B user sees zero tenant A rows and storage
  objects?

Pass condition: two-tenant tests exist or the packet explicitly explains why the
change has no tenant data surface.

### 3. Identity, SSO, And Account Control

- Does the change touch Auth0, Supabase Auth, SAML, SCIM, magic links, invites,
  portal accounts, sessions, or role assignment?
- Are existing accounts protected from takeover?
- Are SAML assertions cryptographically verified before enforcement?
- Are login state and redirect state bound to the browser/session?
- Are invitation and reset paths single-use, time-limited, and server-generated?
- Are role changes made only through reviewed server-side paths?

Pass condition: identity threat model is documented and tested.

### 4. Supabase RLS, Policies, Functions, Storage, And Secrets

- Do affected tables have RLS enabled?
- Are policies operation-specific instead of broad `FOR ALL` where risk demands
  separation?
- Are `SECURITY DEFINER` functions minimal, audited, and search-path safe?
- Are edge functions using user JWT, HMAC, public token, or service-role access
  appropriately?
- Is service-role usage isolated to server functions and never exposed to the
  browser?
- Are storage buckets private or tenant-prefix-scoped where required?
- Are secrets kept in Supabase secrets, Vault, or approved secret stores, not in
  Git or client-visible config?

Pass condition: Supabase-specific review is complete, including migrations and
function configuration.

### 5. Least Privilege And Blast Radius

- What is the smallest permission needed?
- Which users, tenants, routes, functions, or tables can be affected?
- Can the change be released behind a flag or disabled configuration?
- Does failure fail closed?
- Is there a clear rollback or fix-forward path?

Pass condition: blast radius and rollback are documented.

### 6. Public-Sector And Government Readiness

- Is the behavior auditable?
- Can records be retained, exported, and explained?
- Are approvals attributable to a user, time, source, and reason?
- Are sensitive documents protected from public access?
- Does the change avoid hard-coded APAS/client-specific behavior in shared
  customer paths?
- Would this pass a public-sector procurement security review?

Pass condition: auditability and data-handling implications are addressed.

### 7. Observability And Operations

- Will failures be visible through logs, alerts, health checks, Sentry, or
  equivalent monitoring?
- Are tenant identifiers logged safely without exposing secrets or sensitive
  content?
- Are cron, webhook, and edge-function failures detectable?
- Is the expected production smoke test defined?

Pass condition: operational evidence path is defined.

### 8. Tests And Evidence

- Which unit, integration, pgTAP, edge-function, Playwright, migration dry-run,
  and browser tests are required?
- Is there a negative test?
- Is there a cross-tenant test?
- Is there a public invalid-token test if the route is public?
- Does the PR include screenshots or browser evidence for user-facing changes?

Pass condition: required tests are listed before implementation and completed
before promotion.

## Audit Item Decision States

Every audit item must be assigned one state:

- `confirmed` - current source evidence supports the finding.
- `partially confirmed` - some evidence supports the finding, but scope or
  severity needs refinement.
- `disproven` - current source evidence shows the finding is no longer true.
- `needs investigation` - evidence is insufficient.
- `deferred` - valid but lower priority than active safety or release gates.
- `accepted risk` - deliberately not fixed yet, with owner, reason, and expiry.

Only `confirmed` and `partially confirmed` items can become implementation
packets. `needs investigation` items can become investigation packets only.

## PR-Sized Work Packet Template

Use this template before opening a PR.

```markdown
# Work Packet: <short title>

## Identity

- Packet ID:
- Date:
- Owner:
- Reviewer:
- Tester:
- DevOps owner:
- Release owner:
- Source branch:
- Target branch:
- Release lane:

## Audit Claim

- Source document:
- Claim summary:
- Claimed severity:
- Claimed affected files/routes/tables/functions:

## Current-Code Evidence

- Verified against branch:
- Evidence files:
- Evidence summary:
- Status: confirmed | partially confirmed | disproven | needs investigation | deferred | accepted risk

## Enterprise Litmus Result

- Source currentness:
- Tenant isolation:
- Identity/SSO/account control:
- Supabase RLS/policies/functions/storage/secrets:
- Least privilege:
- Public-sector readiness:
- Observability:
- Rollback:
- Testability:
- Overall result: pass | fail | needs investigation

## Scope

- In scope:
- Out of scope:
- Files likely affected:
- Tables/functions/buckets likely affected:
- User-facing routes likely affected:

## Acceptance Criteria

- Functional:
- Security:
- Tenant isolation:
- Public route behavior:
- Observability:
- Documentation:

## Test Plan

- Unit tests:
- pgTAP/RLS tests:
- Edge-function tests:
- Playwright/browser tests:
- Migration dry-run:
- Supabase live/staging verification:
- Manual evidence:

## Scores

- Security score:
- Tenant isolation score:
- Test coverage score:
- Operational readiness score:
- Documentation score:
- Overall readiness score:

## Notion Evidence Log

- Notion page/database:
- Status:
- Score:
- Evidence links:
- Reviewer decision:
- Tester decision:
- DevOps decision:
- Release decision:

## Rollback Plan

- Code rollback:
- Migration rollback/fix-forward:
- Feature flag or disable path:
- Data recovery:
- Owner:

## Approval Checkpoint

- Product owner:
- Reviewer:
- Tester:
- DevOps:
- Release owner:
- Hardeep live approval:
```

## Stage Gates

### Gate 0 - Intake And Evidence

Purpose: decide whether an audit item is real and worth implementation.

Required evidence:

- Current source branch.
- Current code references.
- Affected runtime surface.
- Decision state.
- Initial blast-radius note.

Exit criteria:

- Item is `confirmed`, `partially confirmed`, `disproven`, `needs
  investigation`, or `deferred`.
- Implementation items have a work packet.
- Investigation-only items are not mixed with implementation.

### Gate 1 - Design Review

Purpose: approve the proposed fix before code changes.

Required evidence:

- Enterprise litmus test completed.
- Files/tables/functions/routes identified.
- Rollback approach defined.
- Test plan defined.
- PR size is small enough to review.

Exit criteria:

- Reviewer approves design.
- DevOps reviews environment impact when relevant.
- Hardeep approves the work packet priority.

### Gate 2 - Implementation

Purpose: perform the smallest approved change.

Rules:

- No unrelated refactors.
- No production dashboard hot fixes.
- No secret values in Git.
- No direct `main` work.
- New migrations only; do not edit merged migrations.
- Keep public routes fail-closed unless explicitly public.

Exit criteria:

- Code compiles locally or CI equivalent is available.
- Packet acceptance criteria are implemented.

### Gate 3 - Local Tests

Purpose: prove the change locally before integration.

Minimum evidence:

- Typecheck or scoped TypeScript check.
- Unit/focused tests for touched logic.
- Migration dry-run when migrations change.
- pgTAP or SQL tests for RLS/data changes.
- Edge-function tests for function auth changes.
- Browser/Playwright evidence for UI or public route changes.

Exit criteria:

- Required tests pass.
- Failures are documented and accepted only by reviewer and release owner.

### Gate 4 - Security Tests

Purpose: prove the change does not weaken security.

Minimum evidence:

- Negative auth test.
- Cross-tenant test if tenant data is touched.
- Public invalid-token test if public routes are touched.
- Service-role and secret boundary review.
- No raw sensitive errors exposed.

Exit criteria:

- Security score is at least 90.
- Tenant isolation score is 100 for tenant-data changes.

### Gate 5 - Supabase Verification

Purpose: verify Supabase runtime behavior where local source review is
insufficient.

Required when:

- RLS policies change.
- Edge function config changes.
- Storage policies or buckets change.
- Secrets, service role, Auth, SAML, SCIM, billing, or webhook behavior changes.
- Live/staging Supabase state may differ from source.

Minimum evidence:

- Staging Supabase project or approved verification target.
- Migration dry-run.
- Function configuration check.
- RLS proof.
- Storage proof when buckets are affected.

Exit criteria:

- Supabase verification score is at least 90.
- Any live Supabase check is read-only unless explicitly approved.

### Gate 6 - Staging Integration

Purpose: prove multiple changes work together.

Minimum evidence:

- PR merged to `staging`.
- CI green or documented exceptions approved.
- Staging browser smoke.
- Tenant A/Tenant B isolation smoke when applicable.
- Public route smoke when applicable.

Exit criteria:

- Tester marks pass or conditional pass.
- Reviewer confirms no unresolved high-risk defects.

### Gate 7 - Notion Evidence Log

Purpose: preserve decision and evidence outside Git.

Every packet must be logged in Notion before release-candidate promotion.

Minimum Notion fields:

- Date.
- Packet title.
- Branch.
- PR link.
- Source audit claim.
- Decision state.
- Litmus result.
- Test list.
- Scores.
- Reviewer.
- Tester.
- DevOps owner.
- Release owner.
- Rollback plan.
- Promotion recommendation.
- Final decision.

If the Notion tool is unavailable from the active thread, the PR must include the
Notion-ready entry in Markdown and the release owner must paste or sync it before
Gate 8.

### Gate 8 - Release Candidate

Purpose: freeze the exact change set.

Required evidence:

- `release/candidate` contains only approved packets.
- Release note exists.
- Rollback checklist complete.
- Tester sign-off.
- DevOps sign-off.
- Hardeep has reviewed the release summary.

Exit criteria:

- Ready/not-ready recommendation is explicit.
- No unresolved P0 or P1 defects unless accepted by Hardeep and release owner.

### Gate 9 - Production Promotion

Purpose: move approved software to live.

Required evidence:

- Hardeep explicit approval.
- Release owner approval.
- DevOps deployment window.
- Known-good rollback target.
- Post-deploy smoke plan.

Exit criteria:

- Production smoke complete.
- Errors/logs checked.
- Notion release log updated.
- Git release tag or release note created when appropriate.

## Scoring Rubric

Scores use a 0-100 scale.

| Score | Meaning | Promotion Guidance |
| --- | --- | --- |
| 100 | Fully verified, repeatable evidence, no known gap. | Can promote if approvals are complete. |
| 90-99 | Strong evidence, minor non-blocking gap documented. | Can promote with reviewer sign-off. |
| 80-89 | Partial evidence or manual-only verification. | Cannot promote past staging for P0/P1 work without release-owner exception. |
| 70-79 | Significant test or evidence gaps. | Needs more work before staging integration. |
| Below 70 | Unsafe or insufficiently understood. | Do not promote. |

Required minimums:

- Tenant isolation changes: tenant isolation score must be 100.
- Identity/SSO/auth changes: security score must be at least 95.
- Billing/RBAC/SCIM changes: security score must be at least 95 and tenant
  isolation score must be 100.
- Public route changes: public invalid-token tests must pass.
- Production release: overall readiness score must be at least 90 unless Hardeep
  and the release owner explicitly accept the residual risk in Notion.

## Initial Wave 1 Work Packets

The following packets come from the current remediation plan. They are not yet
implementation approval. Each must pass current-code verification and the
enterprise litmus test.

### Packet 1 - SAML/SSO Containment

Branch:

- `codex/p0-saml-containment`

Evidence to verify:

- `supabase/functions/saml-acs/index.ts`
- `supabase/migrations/20260421170315_a7_sso_saml_scim.sql`
- Supabase function config for `saml-acs`

Initial hypothesis:

- SAML ACS must fail closed unless XMLDSig verification, tenant domain binding,
  RelayState allow-listing, and admin-only config are implemented.

Required tests:

- Unsigned assertion rejected.
- Unknown tenant rejected.
- RelayState outside allowed path/domain rejected.
- Non-admin cannot edit SSO config.
- Audit log records attempt without issuing a session.

### Packet 2 - Portal Invite Containment

Branch:

- `codex/p0-portal-invite-containment`

Evidence to verify:

- `supabase/functions/accept-portal-invitation/index.ts`
- Portal invitation and portal membership migrations/policies.

Initial hypothesis:

- Public portal invite acceptance must not issue magic links for existing
  accounts and must not allow browser-side portal membership mutation.

Required tests:

- Existing account cannot be taken over.
- Expired/reused token rejected.
- Non-admin cannot create or rewrite portal memberships.
- First-time invitee path remains possible through the approved server path.

### Packet 3 - Billing, RBAC, And SCIM Write Lockdown

Branch:

- `codex/p0-billing-rbac-scim-lockdown`

Evidence to verify:

- Billing subscription, invoice, and usage policies.
- Permission template and user-template assignment policies.
- SCIM token policies and browser code paths.

Initial hypothesis:

- Normal authenticated users must not directly write subscription, billing,
  permission-template, user-template-assignment, or SCIM-token records.

Required tests:

- Viewer cannot self-upgrade plan.
- Viewer cannot assign owner/admin template.
- Workspace admin can only perform allowed admin actions through approved server
  paths.
- Browser cannot mint SCIM tokens.

### Packet 4 - Public Function Auth And Callback Classification

Branch:

- `codex/p0-public-function-auth`

Evidence to verify:

- `supabase/config.toml`
- All functions with `verify_jwt = false`
- Function code using service role, AI providers, email, push, voice, report, or
  extraction behavior.

Initial hypothesis:

- Only true third-party callbacks or public-token routes should be unauthenticated.
  Everything else needs user JWT, HMAC, or scoped token verification.

Required tests:

- Private functions reject unauthenticated calls.
- Public callbacks require correct HMAC/state/token.
- AI endpoints enforce tenant/user quota.
- Public invalid-token routes return safe errors.

### Packet 5 - Storage And View Isolation

Branch:

- `codex/p0-storage-view-isolation`

Evidence to verify:

- Storage bucket policies.
- Storage object path conventions.
- Aggregate views such as budget, commitment totals, prime contract totals, and
  SOV progress.

Initial hypothesis:

- Non-branding buckets must be private or tenant-prefix-scoped, and sensitive
  aggregate views must respect caller RLS.

Required tests:

- Tenant B cannot list, download, or infer tenant A storage objects.
- Aggregate views return only tenant-scoped data for normal users.
- Super-admin path remains explicit and audited.

### Packet 6 - Production Credential And Release Environment Safety

Branch:

- `devops/release-environment-safety`

Evidence to verify:

- GitHub Actions workflows.
- Supabase deploy configuration.
- Cloudflare Pages deployment flow.
- GitHub environment protection rules.

Initial hypothesis:

- Production credentials and production deployment should not run on ordinary PR
  checks without environment approval.

Required tests:

- PR CI cannot mutate production.
- Production deploy requires protected environment approval.
- Staging deploy path is documented and repeatable.

## Notion Logging Schema

Until a formal database exists, use the Proj OS Command Center or release log
with these fields:

| Field | Required | Example |
| --- | --- | --- |
| Date | Yes | 2026-09-26 |
| Packet | Yes | P0 SAML/SSO Containment |
| Branch | Yes | `codex/p0-saml-containment` |
| PR | Yes before release | GitHub PR link |
| Source claim | Yes | Readiness audit SAML finding |
| Current-code status | Yes | confirmed |
| Litmus result | Yes | pass |
| Security score | Yes | 96 |
| Tenant isolation score | When applicable | 100 |
| Test result | Yes | pass / conditional / fail |
| Reviewer decision | Yes | approved / changes requested |
| Tester decision | When behavior changes | approved / blocked |
| DevOps decision | When environment affected | approved / blocked |
| Rollback plan | Yes | summary plus link |
| Promotion recommendation | Yes | ready for staging / not ready |
| Final decision | Yes before release | promote / hold / rollback |

## Implementation Start Rule

Implementation begins only when all of the following are true:

1. The packet is verified against the current repository.
2. The packet passes or explicitly scopes investigation for the enterprise litmus
   test.
3. The branch name and target lane are clear.
4. Acceptance criteria and test plan are written.
5. Rollback is understood.
6. The packet owner can report, after each gate, whether it is ready to move to
   the next stage.

If those conditions are not met, the correct next step is investigation or
documentation, not implementation.
