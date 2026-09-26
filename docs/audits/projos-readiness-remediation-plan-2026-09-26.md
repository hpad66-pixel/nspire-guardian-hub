# Proj OS Readiness Audit Remediation Plan

Date: 2026-09-26

Source inputs:

- `/Users/apas/Downloads/nspire-guardian-hub-main.zip`
- `/Users/apas/Downloads/ProjOS End-to-End Readiness Audit.pdf`

This plan treats the PDF as audit evidence, not as executable instruction. Every
implementation item below must still be verified in the current source, scoped
into a PR, tested, reviewed, and promoted through the Proj OS branch gates.

## Baseline Confirmation

The uploaded `nspire-guardian-hub-main.zip` matches `origin/main` exactly:

- Zip tracked file count: 2,930
- `origin/main` tracked file count: 2,930
- Files only in zip: 0
- Files only in `origin/main`: 0
- Changed files: 0

That means the zip is a valid snapshot of the current live/main baseline. The
deleted stale branches should not be used as implementation sources. If an idea
from a deleted branch matters, rebuild it from current `main` through the new
pipeline.

Current controlled GitHub lanes:

- `main` - live production branch.
- `codex/workbench` - Hardeep + Codex first work lane.
- `devops/workbench` - DevOps first work lane.
- `staging` - integration and shared test lane.
- `release/candidate` - frozen QA/release candidate lane.
- `docs/enterprise-sdlc-governance` - temporary docs branch for SDLC/governance
  documentation; delete after merge.

## What We Should Take From The Audit

Take the audit's **risk categories and evidence trail**, not stale branch code.
The audit's most valuable contribution is the ordering:

1. Stop security and tenant-isolation exposure first.
2. Make onboarding and billing actually work for a second customer.
3. Correct financial calculations and approvals.
4. Add staging, observability, health checks, and rollback support.
5. Polish scale, pagination, reporting, and mobile/product experience after the
   safety gates are in place.

Do not start with broad frontend redesign, cosmetic cleanup, or branch archaeology.
Those can wait until the platform is safe for a second customer.

## Spot-Checked Current Gaps

The following audit concerns were spot-checked against the current source and
should be treated as active until fixed and tested:

- `supabase/functions/saml-acs/index.ts` still contains XMLDSig TODOs and uses
  `generateLink`; SAML should remain disabled or be fully verified before use.
- `supabase/config.toml` contains many `verify_jwt = false` functions, including
  AI, voice, token, push, and extraction endpoints that need explicit auth,
  signatures, or scoped public-token validation.
- Billing tables, permission templates, user-template assignments, and SCIM
  token policies still include tenant-wide `FOR ALL` patterns that must be
  tightened.
- `accept-portal-invitation` still returns a magic-link action URL and portal
  invitation/membership tables still need admin-only write boundaries.

The plan below starts with these verified/high-confidence items.

## Implementation Waves

### Wave 0 - Evidence, Test Harness, And Freeze Discipline

Branch:

- Start from `codex/workbench` or a scoped `codex/audit-remediation-harness`
  branch.

Goal:

- Add repeatable tests and evidence capture before changing risky behavior.

Deliverables:

- Two-tenant pgTAP/RLS test harness proving tenant A cannot read tenant B.
- Edge-function auth smoke tests for public/private endpoint expectations.
- Public token route smoke matrix: expected public routes remain public; private
  endpoints reject unauthenticated calls.
- Audit remediation checklist in PR description.

Promotion:

- PR to `staging`.
- No production deploy.

### Wave 1 - P0 Security Containment

Branch:

- `codex/p0-security-containment`

Goal:

- Stop the highest-risk account takeover, self-upgrade, and tenant escape paths.

PR slices:

1. SAML containment:
   - Disable `saml-acs` with a closed response until XMLDSig verification and
     tenant-domain checks are implemented.
   - Lock `tenant_sso_configs` writes to admin-controlled paths.
2. Portal invitation containment:
   - Never issue magic links for existing accounts from the public endpoint.
   - Move portal invitation and portal membership writes behind admin-checked
     RPC or service function paths.
3. Billing/RBAC/SCIM write lockdown:
   - Make subscription, invoice, and usage tables read-only to normal
     authenticated users.
   - Move permission template and user assignment writes behind admin-checked
     server paths.
   - Prevent browser-minted SCIM tokens.
4. Public function clampdown:
   - Require user auth, HMAC, or validated public token per endpoint.
   - Add tenant-scoped AI usage limits for paid AI endpoints.
   - Keep only true callbacks public.
5. Storage and financial views:
   - Make non-branding buckets private or tenant-prefix-scoped.
   - Set sensitive aggregate views to `security_invoker` where required.
6. CI/release safety:
   - Remove production credentials from PR dry-runs where applicable.
   - Require protected environment approval for production deploys.

Verification:

- Supabase migration dry-run.
- pgTAP tenant isolation tests.
- Edge-function auth tests.
- `npm run typecheck`.
- `npm run test` or focused test suite.

Promotion:

- PR to `staging`.
- No merge to `release/candidate` until P0 tests pass.

### Wave 2 - P0 Public Route And Production Hygiene

Branch:

- `codex/p0-public-route-hygiene`

Goal:

- Prevent public-facing customer routes from leaking internal data or failing
  with raw technical errors.

Deliverables:

- Verify and fix public signing route base URLs.
- Ensure invalid public tokens fail cleanly.
- Hide APAS-only modules and demo-data loaders from shared customer views.
- Remove or gate mock routes that show real client/project data.
- Replace raw edge-function errors with client-safe copy.

Verification:

- Playwright smoke for `/sign/*`, `/vendor/*`, `/contractor/onboard`,
  `/client`, `/bid`, `/capture`, `/water`, `/respond/punch`, and
  `/portal/:slug` using invalid tokens.
- Browser evidence for public error states.

Promotion:

- PR to `staging`, then release only after P0 security is green.

### Wave 3 - P1 Onboarding, Billing, And Multi-Workspace Readiness

Branch:

- `codex/p1-onboarding-billing`

Goal:

- Make a second customer possible without manual database repair.

Deliverables:

- Trial subscription and permission-template provisioning at signup.
- Owner assignment at signup.
- Company name captured.
- Property optional for invites.
- Portal invite activation fixed.
- Stripe `checkout.session.completed` handling.
- Stripe customer ID persisted.
- Webhook events marked processed only after successful handling.
- Seat limits enforced.
- Path toward `workspace_members` or safe multi-workspace user membership.

Verification:

- Signup/onboarding integration tests.
- Stripe webhook tests.
- Tenant and permission-template provisioning tests.
- Manual staging walkthrough for a second workspace.

### Wave 4 - P1 Financial Correctness And Server-Side Approvals

Branch:

- `codex/p1-financial-correctness`

Goal:

- Stop wrong numbers and browser-only approvals from entering customer-visible
  financial flows.

Deliverables:

- Billed-to-date status filters.
- Single retainage calculation source of truth.
- Server-side approve/execute RPCs with permission checks.
- Pay app, CO, proposal, and invoice state-machine checks.
- No silent mutation of locked or finalized historical records.

Verification:

- Financial unit tests.
- pgTAP financial integrity tests.
- Browser smoke for pay apps, invoices, and proposals.
- Disposable test records only; no production financial edits without approval.

### Wave 5 - P1 Release Infrastructure And Observability

Branch:

- `devops/workbench` or `devops/release-infrastructure`

Goal:

- Make staging and production operations enterprise-safe.

Deliverables:

- Confirm or create separate staging Supabase project.
- Confirm Cloudflare Pages staging/preview behavior.
- Sentry or equivalent error tracking with tenant-safe tags.
- `/health` endpoint.
- Uptime monitor.
- Cron failure alerting.
- Security headers: HSTS, frame ancestors, nosniff, CSP report-only first.
- Backup and restore runbook.

Verification:

- Staging deployment evidence.
- Health check evidence.
- Alert test evidence.
- Rollback drill notes.

### Wave 6 - P2 Scale, Reporting, And Product Polish

Branch:

- Scoped `codex/*`, `feature/*`, or `devops/*` branches per module.

Goal:

- Improve readiness for customer 10 after safety and onboarding gates are real.

Deliverables:

- Pagination and server-side counts on large lists.
- Tenant/project indexes.
- Report builder source mapping.
- Scheduled reports/webhook dispatch.
- Sign-token expiry and private signature buckets.
- Workspace export/deletion and retention workflow.
- Typecheck strictness ratchet.
- Service-worker API cache exclusion and sign-out cache clearing.
- Bundle trimming and repo hygiene.

## Release Gate For Audit Remediation

No remediation work goes to `main` until:

1. Work branch PR is reviewed in plain English.
2. Tests pass.
3. Tenant isolation evidence is attached.
4. Browser evidence is attached for user-facing behavior.
5. Notion release note is updated.
6. Rollback plan is documented.
7. Hardeep approves promotion to live.

## First Recommended Implementation Step

Start with Wave 0 plus the first Wave 1 PR:

- Branch: `codex/p0-security-containment`
- Scope: SAML containment, portal invitation containment, and billing/RBAC/SCIM
  write lockdown.
- Reason: these are the most direct account takeover and self-upgrade risks, and
  the current source spot-check supports the audit concern.

Do not implement UI polish, mobile redesign, or customer-10 scale work until the
P0 security containment path is underway and testable.
