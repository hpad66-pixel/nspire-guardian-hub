<!--
Title format:
- Prompt work: `<prompt-id> <title>`
- Normal work: `<type>(<scope>): <title>`
Examples: `D4 Change orders (G701)` | `fix(pay-apps): prevent duplicate billing`
-->

## What

<!-- One or two sentences. Link the prompt, issue, audit finding, or Notion decision. -->

## Promotion Lane

- Source branch:
- Target branch:
- Promotion level:
  - [ ] Level 1 work branch -> `staging`
  - [ ] `staging` -> `release/*`
  - [ ] `release/*` -> `main`
  - [ ] Approved emergency `hotfix/*` -> `main`
- Review purpose:
  - [ ] Individual change review
  - [ ] Integration review
  - [ ] QA release-candidate review
  - [ ] Production release review

## Risk Level

- [ ] Low - docs, copy, isolated UI, no production data impact.
- [ ] Medium - user-facing workflow, edge function, integration, or shared component.
- [ ] High - auth, RLS, migrations, payments, invoices, pay apps, tenant boundaries,
      deployment config, or production data.

## Live Freeze

- [ ] This PR does not deploy to production by itself.
- [ ] This PR is not targeting `main`.
- [ ] If this targets `main`, it is an approved hotfix or approved release.
- [ ] Rollback notes are included below.

## Tests And Evidence

- [ ] `npm run typecheck` green or CI equivalent green.
- [ ] `npm run test` / `npm run test:coverage` green or CI equivalent green.
- [ ] `npm run build` green or CI equivalent green.
- [ ] `npm run test:e2e` green or exception documented.
- [ ] Supabase migration dry-run attached if migrations changed.
- [ ] Browser/screenshot evidence attached for user-facing changes.
- [ ] Authenticated route checked if the change affects signed-in workflows.

Evidence links / notes:

-

Plain-English reviewer summary:

-

## Data, Security, And Tenant Boundary

- [ ] No database changes.
- [ ] New migration only; no direct edits to a merged migration.
- [ ] RLS policy + tenant/workspace boundary reviewed for every new user-data table.
- [ ] Auth, portal, payment, invoice, pay app, or financial changes received extra review.
- [ ] Secrets, environment variables, and production configuration are unchanged or
      explicitly documented.

## Release And Rollback

Target:

- [ ] `staging`
- [ ] `release/*`
- [ ] `main`
- [ ] Not applicable yet

Rollback plan:

-

Post-deploy smoke test:

-

## Out Of Spec

<!--
List every file changed outside the prompt's COMPONENTS block. If this PR
introduces a new convention, update CLAUDE.md or docs/governance in the same PR.
-->

## Approvals

- [ ] Product owner / scope owner
- [ ] Reviewer
- [ ] Tester, when behavior changes
- [ ] DevOps owner, when deployment or environment behavior changes
- [ ] Release owner, when targeting `main`
